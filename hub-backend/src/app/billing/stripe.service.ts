import { Injectable, Logger } from '@nestjs/common';

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
  // customer map userId → stripeCustomerId (en mémoire pour le dev)
  private readonly customerMap = new Map<string, string>();

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
    if (this.customerMap.has(userId)) return this.customerMap.get(userId)!;

    // Chercher un client existant par email
    const list = await this.stripeGet<any>(`/customers?email=${encodeURIComponent(email)}&limit=1`);
    if (list.data?.length) {
      const id = list.data[0].id as string;
      this.customerMap.set(userId, id);
      return id;
    }

    // Créer un nouveau client
    const customer = await this.stripePost<any>('/customers', {
      email,
      'metadata[userId]': userId,
    });
    this.customerMap.set(userId, customer.id);
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

  async handleWebhookEvent(rawBody: Buffer, _signature: string): Promise<void> {
    let event: any;
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      throw new Error('Invalid webhook payload');
    }

    const obj = event.data?.object;
    this.logger.log(`Stripe event: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
        this.logger.log(`Subscription créé: ${obj?.id} — status: ${obj?.status}`);
        break;

      case 'customer.subscription.updated':
        this.logger.log(`Subscription mis à jour: ${obj?.id} — status: ${obj?.status} — cancel_at_period_end: ${obj?.cancel_at_period_end}`);
        break;

      case 'customer.subscription.deleted':
        // Le statut passe à 'canceled' — l'accès doit être révoqué
        this.logger.warn(`Subscription annulé: ${obj?.id} — customer: ${obj?.customer}`);
        // TODO prod: marquer l'utilisateur comme sans abonnement en base de données
        break;

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
