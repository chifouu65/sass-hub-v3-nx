import { Injectable } from '@nestjs/common';
import { SupabaseService, DbOrder, DbOrderItem } from '../supabase/supabase.service';
import { SseService } from './sse.service';

export interface CreateOrderDto {
  truckId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    note?: string;
  }>;
  note?: string;
  pickupTime?: string;
}

export interface OrderItemDto {
  id: string;
  menuItemId: string;
  menuItemName: string | null;
  quantity: number;
  unitPrice: number;
  note: string | null;
}

export interface OrderDto {
  id: string;
  truckId: string;
  customerId: string;
  status: string;
  totalPrice: number;
  note: string | null;
  pickupTime: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDto[];
}

function mapOrder(order: DbOrder): OrderDto {
  return {
    id: order.id,
    truckId: order.truck_id,
    customerId: order.customer_id,
    status: order.status,
    totalPrice: order.total_price,
    note: order.note ?? null,
    pickupTime: order.pickup_time ?? null,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    items: (order.items ?? []).map((item: DbOrderItem & { menu_item_name?: string }) => ({
      id: item.id,
      menuItemId: item.menu_item_id,
      menuItemName: item.menu_item_name ?? null,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      note: item.note ?? null,
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly sse: SseService,
  ) {}

  async createOrder(customerId: string, dto: CreateOrderDto): Promise<OrderDto> {
    const totalPrice = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const order = await this.supabase.createOrder(
      {
        truck_id: dto.truckId,
        customer_id: customerId,
        status: 'pending',
        total_price: totalPrice,
        note: dto.note ?? null,
        pickup_time: dto.pickupTime ?? null,
      },
      dto.items,
    );
    const mapped = mapOrder(order);
    const evt = { type: 'order_created' as const, orderId: mapped.id, truckId: dto.truckId, status: 'pending' };
    this.sse.emitToTruck(dto.truckId, evt);
    this.sse.emitToCustomer(customerId, evt);
    return mapped;
  }

  async getOrdersByTruck(truckId: string, status?: string): Promise<OrderDto[]> {
    const orders = await this.supabase.getOrdersByTruck(truckId, status);
    return orders.map(mapOrder);
  }

  async getOrdersByCustomer(customerId: string): Promise<OrderDto[]> {
    const orders = await this.supabase.getOrdersByCustomer(customerId);
    return orders.map(mapOrder);
  }

  async getOrderById(id: string): Promise<OrderDto | null> {
    const order = await this.supabase.getOrderById(id);
    return order ? mapOrder(order) : null;
  }

  async updateOrderStatus(id: string, status: string): Promise<OrderDto | null> {
    await this.supabase.updateOrderStatus(id, status);
    const order = await this.supabase.getOrderById(id);
    if (order) {
      const evt = { type: 'order_updated' as const, orderId: id, truckId: order.truck_id, status };
      this.sse.emitToTruck(order.truck_id, evt);
      this.sse.emitToCustomer(order.customer_id, evt);
      if (status === 'ready') {
        await this.supabase.createNotification(
          order.customer_id,
          order.truck_id,
          'order_ready',
          'Votre commande est prête !',
        );
      }
    }
    return order ? mapOrder(order) : null;
  }
}
