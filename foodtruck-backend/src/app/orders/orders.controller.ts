import { Controller, Post, Get, Patch, Param, Body, Request, ForbiddenException, Sse, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OrdersService, CreateOrderDto } from './orders.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SseService } from './sse.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly supabase: SupabaseService,
    private readonly sseService: SseService,
  ) {}

  @Post()
  async createOrder(@Request() req: any, @Body() body: CreateOrderDto) {
    if (req.user.role !== 'customer') {
      throw new ForbiddenException('Only customers can create orders');
    }
    return this.ordersService.createOrder(req.user.sub, body);
  }

  // ── Static paths first (before dynamic :id routes) ────────────────────────

  @Get('my')
  async getMyOrders(@Request() req: any) {
    return this.ordersService.getOrdersByCustomer(req.user.sub);
  }

  /** SSE — customer receives real-time updates on their own orders */
  @Sse('my/events')
  customerOrderEvents(@Request() req: any): Observable<MessageEvent> {
    const customerId: string = req.user.sub;
    return this.sseService.getCustomerStream(customerId).pipe(
      map((event) => ({ data: event }) as MessageEvent),
    );
  }

  @Get('truck/:truckId')
  async getTruckOrders(@Request() req: any, @Param('truckId') truckId: string) {
    const truck = await this.supabase.findById(truckId);
    if (!truck) throw new ForbiddenException('Truck not found');
    if (truck.owner_id !== req.user.sub) throw new ForbiddenException('Only owner can view truck orders');
    return this.ordersService.getOrdersByTruck(truckId);
  }

  /** SSE — manager receives real-time events for their truck */
  @Sse('truck/:truckId/events')
  async truckOrderEvents(
    @Request() req: any,
    @Param('truckId') truckId: string,
  ): Promise<Observable<MessageEvent>> {
    const truck = await this.supabase.findById(truckId);
    if (!truck || truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can subscribe to truck events');
    }
    return this.sseService.getTruckStream(truckId).pipe(
      map((event) => ({ data: event }) as MessageEvent),
    );
  }

  // ── Dynamic :id routes last ───────────────────────────────────────────────

  @Get(':id')
  async getOrder(@Request() req: any, @Param('id') id: string) {
    const order = await this.ordersService.getOrderById(id);
    if (!order) throw new ForbiddenException('Order not found');
    if (order.customerId !== req.user.sub) {
      const truck = await this.supabase.findById(order.truckId);
      if (!truck || truck.owner_id !== req.user.sub) throw new ForbiddenException('Unauthorized');
    }
    return order;
  }

  @Patch(':id/status')
  async updateOrderStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const order = await this.ordersService.getOrderById(id);
    if (!order) throw new ForbiddenException('Order not found');
    const truck = await this.supabase.findById(order.truckId);
    if (!truck || truck.owner_id !== req.user.sub) {
      throw new ForbiddenException('Only owner can update order status');
    }
    return this.ordersService.updateOrderStatus(id, body.status);
  }
}
