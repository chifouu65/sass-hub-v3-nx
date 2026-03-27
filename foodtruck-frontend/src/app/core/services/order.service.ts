import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string | null;
  quantity: number;
  unitPrice: number;
  note?: string | null;
}

export interface Order {
  id: string;
  truckId: string;
  customerId: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
  totalPrice: number;
  note?: string | null;
  pickupTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  truckId: string;
  items: Array<{ menuItemId: string; quantity: number; unitPrice: number; note?: string }>;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/api';

  createOrder(payload: CreateOrderPayload) {
    return this.http.post<Order>(`${this.apiBase}/orders`, payload, { withCredentials: true });
  }

  getMyOrders() {
    return this.http.get<Order[]>(`${this.apiBase}/orders/my`, { withCredentials: true });
  }

  getTruckOrders(truckId: string, status?: string) {
    const params: Record<string, string> = {};
    if (status) params['status'] = status;
    return this.http.get<Order[]>(`${this.apiBase}/orders/truck/${truckId}`, {
      params,
      withCredentials: true,
    });
  }

  getOrder(id: string) {
    return this.http.get<Order>(`${this.apiBase}/orders/${id}`, { withCredentials: true });
  }

  updateOrderStatus(id: string, status: Order['status']) {
    return this.http.patch<Order>(`${this.apiBase}/orders/${id}/status`, { status }, { withCredentials: true });
  }
}
