import { Injectable } from '@nestjs/common';

export interface Subscription {
  appId: string;
  plan: string;
  status: 'active' | 'canceled' | 'past_due';
}

@Injectable()
export class BillingService {
  listSubscriptions(userId: string): Subscription[] {
    // TODO: integrate provider (Stripe/Paddle)
    return [
      {
        appId: 'linkedin-ai',
        plan: 'pro',
        status: 'active',
      },
    ];
  }
}
