import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';

interface AuthenticatedRequest extends Request {
  user?: { sub?: string; [key: string]: unknown };
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscriptions')
  list(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub ?? '';
    return this.billing.listSubscriptions(userId);
  }
}
