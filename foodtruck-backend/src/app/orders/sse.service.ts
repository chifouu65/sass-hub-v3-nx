import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface OrderSseEvent {
  type: 'order_created' | 'order_updated';
  orderId: string;
  truckId: string;
  status: string;
}

/**
 * In-process pub/sub for SSE streams.
 * Two namespaces:
 *   - "truck:<id>"    → manager page (truck owner)
 *   - "customer:<id>" → customer order-history page
 */
@Injectable()
export class SseService {
  private readonly subjects = new Map<string, Subject<OrderSseEvent>>();

  private getSubject(key: string): Subject<OrderSseEvent> {
    if (!this.subjects.has(key)) {
      this.subjects.set(key, new Subject<OrderSseEvent>());
    }
    return this.subjects.get(key)!;
  }

  // ── Truck owner streams ──────────────────────────────────────────────────

  getTruckStream(truckId: string): Observable<OrderSseEvent> {
    return this.getSubject(`truck:${truckId}`).asObservable();
  }

  emitToTruck(truckId: string, event: OrderSseEvent): void {
    const key = `truck:${truckId}`;
    if (this.subjects.has(key)) {
      this.subjects.get(key)!.next(event);
    }
  }

  // ── Customer streams ─────────────────────────────────────────────────────

  getCustomerStream(customerId: string): Observable<OrderSseEvent> {
    return this.getSubject(`customer:${customerId}`).asObservable();
  }

  emitToCustomer(customerId: string, event: OrderSseEvent): void {
    const key = `customer:${customerId}`;
    if (this.subjects.has(key)) {
      this.subjects.get(key)!.next(event);
    }
  }
}
