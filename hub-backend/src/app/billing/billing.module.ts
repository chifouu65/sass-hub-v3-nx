import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { BillingController } from './billing.controller';

@Module({
  providers: [StripeService],
  controllers: [BillingController],
  exports: [StripeService],
})
export class BillingModule {}
