import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';

// ── IDs Stripe créés via MCP ─────────────────────────────────────────────────
export const STRIPE_PLANS = {
  free: {
    productId: 'prod_UDcLYMFb9LkwEO',
    priceId: 'price_1TFB7TGte6rr9BdiUT2H38am',
    name: 'Free',
    amount: 0,
    features: ['1 application', '100 requêtes/mois', 'Support communauté'],
  },
  pro: {
    productId: 'prod_UDcLLzJnM2y5UO',
    priceId: 'price_1TFB7VGte6rr9Bdi6n3TVWGU',
    name: 'Pro',
    amount: 2900,
    features: ['Toutes les apps', '10 000 requêtes/mois', 'Support prioritaire'],
  },
  team: {
    productId: 'prod_UDcLV8tihiYrtd',
    priceId: 'price_1TFB7WGte6rr9BdiNirCUsyA',
    name: 'Team',
    amount: 7900,
    features: ['Tout Pro', '5 sièges', 'Analytics avancés', 'SLA 99.9%'],
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;

export interface StripeSubscription {
  id: string;
  status: string;
  planName: string;
  priceId: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

export interface StripeInvoice {
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  created: number;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly baseUrl = 'https://api.stripe.com/v1';

  constructor(private readonly supabase: SupabaseService) {}

  private get secretKey(): string {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY env variable is not set');
    return key;
  }

  // ── Helpers HTTP ────────────────────────────────────────────────────────────

  private async stripeGet<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });
    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err?.error?.message ?? `Stripe GET ${path} → ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private async stripePost<T>(path: string, body: Record<string, string>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body).toString(),
    });
    if (!res.ok) {
      const err = await res.json() as any;
      throw new Error(err?.error?.message ?? `Stripe POST ${path} → ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  // ── Customer ────────────────────────────────────────────────────────────────

  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    // 1. Vérifier en base Supabase
    const existing = await this.supabase.getStripeCustomerId(userId);
    if (existing) return existing;

    // 2. Chercher un client existant dans Stripe par email
    const list = await this.stripeGet<any>(`/customers?email=${encodeURIComponent(email)}&limit=1`);
    if (list.data?.length) {
      const id = list.data[0].id as string;
      await this.supabase.saveStripeCustomer(userId, id);
      return id;
    }

    // 3. Créer un nouveau client Stripe
    const customer = await this.stripePost<any>('/customers', {
      email,
      'metadata[userId]': userId,
    });
    await this.supabase.saveStripeCustomer(userId, customer.id);
    return customer.id;
  }

  // ── Abonnement ──────────────────────────────────────────────────────────────

  async getSubscription(customerId: string): Promise<StripeSubscription | null> {
    const list = await this.stripeGet<any>(
      `/subscriptions?customer=${customerId}&status=all&limit=1`,
    );
    if (!list.data?.length) return null;
    const sub = list.data[0];
    const priceId = sub.items?.data?.[0]?.price?.id ?? '';
    const plan = Object.values(STRIPE_PLANS).find(p => p.priceId === priceId);
    return {
      id: sub.id,
      status: sub.status,
      planName: plan?.name ?? 'Inconnu',
      priceId,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }

  // ── Factures ────────────────────────────────────────────────────────────────

  async getInvoices(customerId: string): Promise<StripeInvoice[]> {
    const list = await this.stripeGet<any>(
      `/invoices?customer=${customerId}&limit=10`,
    );
    return (list.data ?? []).map((inv: any) => ({
      id: inv.id,
      number: inv.number ?? inv.id,
      status: inv.status,
      amount: inv.amount_paid ?? inv.total,
      currency: inv.currency,
      created: inv.created,
      hostedUrl: inv.hosted_invoice_url ?? null,
      pdfUrl: inv.invoice_pdf ?? null,
    }));
  }

  // ── Checkout Session ────────────────────────────────────────────────────────

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    const session = await this.stripePost<any>('/checkout/sessions', {
      customer: customerId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return session.url;
  }

  // ── Customer Portal ─────────────────────────────────────────────────────────

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await this.stripePost<any>('/billing_portal/sessions', {
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  // ── Annulation / Réactivation ────────────────────────────────────────────────

  /**
   * Annule l'abonnement à la fin de la période en cours (accès conservé jusqu'à la date de fin).
   * Pour une annulation immédiate, utiliser le portail Stripe.
   */
  async cancelSubscription(subscriptionId: string): Promise<StripeSubscription | null> {
    const sub = await this.stripePost<any>(`/subscriptions/${subscriptionId}`, {
      cancel_at_period_end: 'true',
    });
    return this.mapSubscription(sub);
  }

  /**
   * Réactive un abonnement dont l'annulation a été programmée (annule le cancel_at_period_end).
   */
  async reactivateSubscription(subscriptionId: string): Promise<StripeSubscription | null> {
    const sub = await this.stripePost<any>(`/subscriptions/${subscriptionId}`, {
      cancel_at_period_end: 'false',
    });
    return this.mapSubscription(sub);
  }

  private mapSubscription(sub: any): StripeSubscription {
    const priceId = sub.items?.data?.[0]?.price?.id ?? '';
    const plan = Object.values(STRIPE_PLANS).find(p => p.priceId === priceId);
    return {
      id: sub.id,
      status: sub.status,
      planName: plan?.name ?? 'Inconnu',
      priceId,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    };
  }

  // ── Webhook ─────────────────────────────────────────────────────────────────

  /**
   * Vérifie la signature Stripe (HMAC-SHA256) et retourne l'événement parsé.
   * La clé STRIPE_WEBHOOK_SECRET doit être définie dans les variables d'env.
   * Tolérance temporelle : 300 secondes (5 min) contre les attaques en rejeu.
   */
  private verifyWebhookSignature(rawBody: Buffer, signature: string): any {
    const secret = process.env['STRIPE_WEBHOOK_SECRET'];
    if (!secret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET non défini — signature non vérifiée en dev');
      try {
        return JSON.parse(rawBody.toString());
      } catch {
        throw new BadRequestException('Invalid webhook payload');
      }
    }

    // Format : "t=<timestamp>,v1=<hmac>,v0=<hmac_old>"
    const parts = Object.fromEntries(
      signature.split(',').map(p => {
        const idx = p.indexOf('=');
        return [p.slice(0, idx), p.slice(idx + 1)];
      }),
    );
    const ts = parts['t'];
    const v1 = parts['v1'];
    if (!ts || !v1) throw new BadRequestException('Missing Stripe-Signature fields');

    // Vérification de la fraîcheur (anti-replay)
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - Number(ts)) > 300) {
      throw new BadRequestException('Webhook timestamp too old');
    }

    // Calcul du HMAC attendu
    const payload = `${ts}.${rawBody.toString()}`;
    const expected = createHmac('sha256', secret).update(payload).digest('hex');

    // Comparaison en temps constant pour éviter les timing attacks
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(v1, 'hex');
    const signaturesMatch =
      expectedBuf.length === receivedBuf.length &&
      timingSafeEqual(expectedBuf, receivedBuf);

    if (!signaturesMatch) throw new BadRequestException('Invalid Stripe webhook signature');

    try {
      return JSON.parse(rawBody.toString());
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const event: any = this.verifyWebhookSignature(rawBody, signature);

    const obj = event.data?.object;
    this.logger.log(`Stripe event: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
        this.logger.log(`Subscription créé: ${obj?.id} — status: ${obj?.status}`);
        break;

      case 'customer.subscription.updated':
        this.logger.log(`Subscription mis à jour: ${obj?.id} — status: ${obj?.status} — cancel_at_period_end: ${obj?.cancel_at_period_end}`);
        break;

      case 'customer.subscription.deleted': {
        // Le statut passe à 'canceled' — on révoque l'accès en base
        const customerId = obj?.customer as string | undefined;
        this.logger.warn(`Subscription annulé: ${obj?.id} — customer: ${customerId}`);
        if (customerId) {
          await this.supabase.revokeSubscriptionByStripeCustomer(customerId);
        }
        break;
      }

      case 'invoice.payment_succeeded':
        this.logger.log(`Paiement réussi — invoice: ${obj?.id} — montant: ${obj?.amount_paid} ${obj?.currency}`);
        break;

      case 'invoice.payment_failed': {
        // Stripe retentera automatiquement (Smart Retries).
        // Après N tentatives, il passera le statut à 'unpaid' ou annulera selon la config Dunning.
        const attempt = obj?.attempt_count ?? 1;
        this.logger.warn(
          `Paiement échoué — invoice: ${obj?.id} — tentative n°${attempt} — customer: ${obj?.customer}`,
        );
        // TODO prod: envoyer un email à l'utilisateur et marquer le compte en past_due
        break;
      }

      case 'invoice.payment_action_required':
        this.logger.warn(`Action requise (3D Secure ?) — invoice: ${obj?.id}`);
        break;

      default:
        this.logger.debug(`Événement non géré: ${event.type}`);
    }
  }
}
