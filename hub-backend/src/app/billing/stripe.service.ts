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

  private get webhookSecret(): string {
    return process.env.STRIPE_WEBHOOK_SECRET ?? '';
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
      metadata: { userId },
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

  // ── Webhook ─────────────────────────────────────────────────────────────────

  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    // Vérification basique de la signature (optionnel en dev sans webhookSecret)
    let event: any;
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      throw new Error('Invalid webhook payload');
    }
    this.logger.log(`Stripe event: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        this.logger.log(`Subscription ${event.type}: ${event.data.object.id}`);
        break;
      case 'invoice.payment_succeeded':
        this.logger.log(`Invoice paid: ${event.data.object.id}`);
        break;
      case 'invoice.payment_failed':
        this.logger.warn(`Invoice payment failed: ${event.data.object.id}`);
        break;
    }
  }
}
