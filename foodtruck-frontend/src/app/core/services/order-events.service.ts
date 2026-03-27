import { Injectable, inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface OrderSseEvent {
  type: 'order_created' | 'order_updated';
  orderId: string;
  truckId: string;
  status: string;
}

/**
 * SSE client using fetch + ReadableStream so we can send the Authorization header.
 * EventSource does NOT support custom headers, hence this implementation.
 *
 * Two connection modes:
 *  - connect(truckId)  → /api/orders/truck/:id/events  (manager)
 *  - connectCustomer() → /api/orders/my/events          (customer)
 */
@Injectable({ providedIn: 'root' })
export class OrderEventsService {
  private readonly auth = inject(AuthService);

  private abortController: AbortController | null = null;
  private currentUrl: string | null = null;
  private readonly subject = new Subject<OrderSseEvent>();

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Manager: subscribe to events for a specific truck. */
  connect(truckId: string): void {
    this.openStream(`/api/orders/truck/${truckId}/events`);
  }

  /** Customer: subscribe to events on own orders. */
  connectCustomer(): void {
    this.openStream('/api/orders/my/events');
  }

  /** Observable that emits whenever an order event arrives. */
  events(): Observable<OrderSseEvent> {
    return this.subject.asObservable();
  }

  /** Close the active SSE connection. */
  disconnect(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.currentUrl = null;
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private openStream(url: string): void {
    // Already connected to the same endpoint — avoid interrupting an active stream
    if (this.abortController && this.currentUrl === url) return;

    this.disconnect(); // close any previous connection
    this.currentUrl = url;

    const token = this.auth.accessToken();
    if (!token) {
      console.warn('[OrderEventsService] No access token — SSE not connected');
      return;
    }

    const controller = new AbortController();
    this.abortController = controller;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          console.error(`[OrderEventsService] SSE ${url} → ${response.status}`);
          return;
        }
        if (!response.body) {
          console.error('[OrderEventsService] Response body is null');
          return;
        }
        this.pump(response.body.getReader(), new TextDecoder(), '', controller);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('[OrderEventsService] SSE fetch error:', err);
        }
      });
  }

  /** Recursive chunk reader — assembles SSE frames and dispatches events. */
  private pump(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    decoder: TextDecoder,
    buffer: string,
    controller: AbortController,
  ): void {
    reader
      .read()
      .then(({ done, value }) => {
        if (done || controller.signal.aborted) return;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by blank lines (\n\n)
        const frames = buffer.split(/\n\n/);
        buffer = frames.pop() ?? ''; // keep last incomplete frame

        for (const frame of frames) {
          for (const line of frame.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const event: OrderSseEvent = JSON.parse(line.slice(6));
                this.subject.next(event);
              } catch {
                // ignore malformed frames
              }
            }
          }
        }

        this.pump(reader, decoder, buffer, controller);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('[OrderEventsService] SSE read error:', err);
        }
      });
  }
}
