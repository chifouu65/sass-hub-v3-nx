import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SseService } from './sse.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, SseService],
})
export class OrdersModule {}
