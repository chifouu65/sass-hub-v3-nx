import {
  Controller, Get, Post, Body, Req, Res,
  Headers, RawBodyRequest, HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StripeService, STRIPE_PLANS } from './stripe.service';
import { Public } from '../auth/public.decorator';

interface AuthenticatedRequest extends Request {
  user?: { sub?: string; email?: string; [key: string]: unknown };
}

interface CheckoutDto {
  priceId: string;
}

@Controller('billing')
export class BillingController {
  constructor(private readonly stripe: StripeService) {}

  // ── Plans disponibles (public) ────────────────────────────────────────────
  @Public()
  @Get('plans')
  getPlans() {
    return Object.entries(STRIPE_PLANS).map(([key, plan]) => ({
      key,
      ...plan,
    }));
  }

  // ── Abonnement actif ──────────────────────────────────────────────────────
  @Get('subscription')
  async getSubscription(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub ?? '';
    const email = req.user?.['email'] as string ?? '';
    const customerId = await this.stripe.getOrCreateCustomer(userId, email);
    const sub = await this.stripe.getSubscription(customerId);
    return { subscription: sub, customerId };
  }

  // ── Factures ──────────────────────────────────────────────────────────────
  @Get('invoices')
  async getInvoices(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub ?? '';
    const email = req.user?.['email'] as string ?? '';
    const customerId = await this.stripe.getOrCreateCustomer(userId, email);
    return this.stripe.getInvoices(customerId);
  }

  // ── Créer une session Checkout ────────────────────────────────────────────
  @Post('checkout')
  async createCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() body: CheckoutDto,
  ) {
    const userId = req.user?.sub ?? '';
    const email = req.user?.['email'] as string ?? '';
    const customerId = await this.stripe.getOrCreateCustomer(userId, email);
    const origin = 'http://localhost:4200';
    const url = await this.stripe.createCheckoutSession(
      customerId,
      body.priceId,
      `${origin}/billing?success=true`,
      `${origin}/billing?canceled=true`,
    );
    return { url };
  }

  // ── Créer une session Customer Portal ─────────────────────────────────────
  @Post('portal')
  async createPortal(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub ?? '';
    const email = req.user?.['email'] as string ?? '';
    const customerId = await this.stripe.getOrCreateCustomer(userId, email);
    const url = await this.stripe.createPortalSession(
      customerId,
      'http://localhost:4200/billing',
    );
    return { url };
  }

  // ── Webhook Stripe (public, pas de JWT) ───────────────────────────────────
  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body));
    await this.stripe.handleWebhookEvent(raw, sig);
    return { received: true };
  }
}
