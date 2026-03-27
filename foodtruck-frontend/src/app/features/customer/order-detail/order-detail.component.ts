import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { firstValueFrom, Subscription } from 'rxjs';
import { OrderService, Order } from '../../../core/services/order.service';
import { OrderEventsService } from '../../../core/services/order-events.service';
import { orderStatusLabel, orderStatusIcon } from '../../../core/utils/order-status';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="detail-page">

      <!-- Back -->
      <a class="back-link" routerLink="/my/orders">
        <mat-icon>arrow_back</mat-icon>
        Mes commandes
      </a>

      <!-- Loading -->
      <div *ngIf="loading()" class="center-state">
        <mat-spinner diameter="36"></mat-spinner>
        <p>Chargement…</p>
      </div>

      <!-- Error -->
      <div *ngIf="!loading() && !order()" class="center-state">
        <mat-icon class="empty-icon">error_outline</mat-icon>
        <p>Commande introuvable.</p>
        <a routerLink="/my/orders" mat-raised-button color="primary">Retour</a>
      </div>

      <!-- Content -->
      <div *ngIf="!loading() && order() as o" class="order-card">

        <!-- Header -->
        <div class="card-header">
          <div class="order-meta">
            <span class="order-ref">#{{ o.id.slice(-6).toUpperCase() }}</span>
            <span class="order-date">
              <mat-icon>calendar_today</mat-icon>
              {{ o.createdAt | date:'d MMMM yyyy, HH:mm' }}
            </span>
          </div>
          <div class="status-badge" [ngClass]="'status-' + o.status">
            <mat-icon>{{ statusIcon(o.status) }}</mat-icon>
            {{ statusLabel(o.status) }}
          </div>
        </div>

        <mat-divider></mat-divider>

        <!-- Status timeline -->
        <div class="timeline">
          <div class="timeline-step" [class.done]="stepDone('pending', o.status)" [class.active]="o.status === 'pending'">
            <div class="step-dot"><mat-icon>schedule</mat-icon></div>
            <span>En attente</span>
          </div>
          <div class="timeline-line" [class.done]="stepDone('confirmed', o.status)"></div>
          <div class="timeline-step" [class.done]="stepDone('confirmed', o.status)" [class.active]="o.status === 'confirmed'">
            <div class="step-dot"><mat-icon>restaurant</mat-icon></div>
            <span>En préparation</span>
          </div>
          <div class="timeline-line" [class.done]="stepDone('ready', o.status)"></div>
          <div class="timeline-step" [class.done]="stepDone('ready', o.status)" [class.active]="o.status === 'ready'">
            <div class="step-dot"><mat-icon>check_circle</mat-icon></div>
            <span>Prête</span>
          </div>
          <div class="timeline-line" [class.done]="o.status === 'completed'"></div>
          <div class="timeline-step" [class.done]="o.status === 'completed'" [class.active]="o.status === 'completed'">
            <div class="step-dot"><mat-icon>done_all</mat-icon></div>
            <span>Remise</span>
          </div>
        </div>

        <div *ngIf="o.status === 'cancelled'" class="cancelled-banner">
          <mat-icon>cancel</mat-icon>
          Cette commande a été annulée.
        </div>

        <mat-divider></mat-divider>

        <!-- Items -->
        <div class="section-title">Articles commandés</div>
        <div class="items-list">
          <div *ngFor="let item of o.items" class="item-row">
            <span class="item-qty">×{{ item.quantity }}</span>
            <span class="item-name">{{ item.menuItemName || 'Article' }}</span>
            <span class="item-price">{{ (item.unitPrice * item.quantity) | number:'1.2-2' }}€</span>
          </div>
        </div>

        <!-- Note -->
        <div *ngIf="o.note" class="note-block">
          <mat-icon>notes</mat-icon>
          <span>{{ o.note }}</span>
        </div>

        <!-- Pickup time -->
        <div *ngIf="o.pickupTime" class="pickup-block">
          <mat-icon>access_time</mat-icon>
          <span>Retrait prévu : {{ o.pickupTime | date:'HH:mm' }}</span>
        </div>

        <mat-divider></mat-divider>

        <!-- Total -->
        <div class="total-row">
          <span class="total-label">Total</span>
          <span class="total-value">{{ o.totalPrice | number:'1.2-2' }}€</span>
        </div>

        <!-- Actions -->
        <div class="actions-row">
          <a routerLink="/my/orders" mat-stroked-button>
            <mat-icon>arrow_back</mat-icon>
            Toutes mes commandes
          </a>
          <a [routerLink]="['/truck', o.truckId]" mat-raised-button color="primary">
            <mat-icon>storefront</mat-icon>
            Revoir le menu
          </a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .detail-page {
      padding: 24px;
      max-width: 640px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary, #8b8ba0);
      text-decoration: none;
      font-size: 13px;
      transition: color 150ms;
      width: fit-content;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: var(--text-primary, #ececf0); }
    }

    .center-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 60px 0;
      color: var(--text-muted, #5c5c70);
      p { margin: 0; font-size: 14px; }
    }

    .empty-icon { font-size: 48px; width: 48px; height: 48px; }

    .order-card {
      background: var(--bg-card, #16161f);
      border: 1px solid var(--border, #27273a);
      border-radius: 14px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 20px;
      flex-wrap: wrap;
    }

    .order-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .order-ref {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary, #ececf0);
      font-family: monospace;
    }

    .order-date {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-muted, #5c5c70);
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 20px;
      mat-icon { font-size: 15px; width: 15px; height: 15px; }

      &.status-pending   { background: rgba(245,158,11,0.12); color: var(--warning, #f59e0b); }
      &.status-confirmed { background: rgba(99,102,241,0.12); color: #818cf8; }
      &.status-ready     { background: rgba(34,197,94,0.12);  color: var(--success, #22c55e); }
      &.status-completed { background: rgba(249,115,22,0.1);  color: var(--accent, #f97316); }
      &.status-cancelled { background: rgba(239,68,68,0.1);   color: var(--danger, #ef4444); }
    }

    mat-divider { border-color: var(--border, #27273a) !important; }

    /* ── Timeline ── */
    .timeline {
      display: flex;
      align-items: center;
      padding: 20px 24px;
      gap: 0;
      overflow-x: auto;
    }

    .timeline-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;

      span {
        font-size: 10px;
        color: var(--text-muted, #5c5c70);
        white-space: nowrap;
        text-align: center;
      }

      .step-dot {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-surface, #1c1c2a);
        border: 2px solid var(--border, #27273a);
        mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--text-muted, #5c5c70); }
      }

      &.done {
        .step-dot {
          background: rgba(249,115,22,0.1);
          border-color: rgba(249,115,22,0.4);
          mat-icon { color: var(--accent, #f97316); }
        }
        span { color: var(--accent, #f97316); font-weight: 600; }
      }

      &.active {
        .step-dot {
          background: rgba(249,115,22,0.15);
          border-color: var(--accent, #f97316);
          box-shadow: 0 0 10px rgba(249,115,22,0.3);
          mat-icon { color: var(--accent, #f97316); }
        }
        span { color: var(--text-primary, #ececf0); font-weight: 700; }
      }
    }

    .timeline-line {
      flex: 1;
      height: 2px;
      background: var(--border, #27273a);
      margin-bottom: 22px;
      min-width: 20px;
      transition: background 250ms;

      &.done { background: rgba(249,115,22,0.4); }
    }

    /* ── Cancelled banner ── */
    .cancelled-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      color: var(--danger, #ef4444);
      background: rgba(239,68,68,0.08);
      font-size: 13px;
      font-weight: 600;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* ── Items ── */
    .section-title {
      padding: 16px 20px 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted, #5c5c70);
    }

    .items-list {
      padding: 4px 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
    }

    .item-qty {
      font-weight: 700;
      color: var(--accent, #f97316);
      min-width: 28px;
    }

    .item-name {
      flex: 1;
      color: var(--text-primary, #ececf0);
    }

    .item-price {
      color: var(--text-secondary, #8b8ba0);
      font-size: 13px;
      white-space: nowrap;
    }

    /* ── Note / Pickup ── */
    .note-block,
    .pickup-block {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0 20px 12px;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 13px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
    }

    .note-block {
      background: rgba(245,158,11,0.08);
      color: var(--warning, #f59e0b);
    }

    .pickup-block {
      background: rgba(99,102,241,0.08);
      color: #818cf8;
    }

    /* ── Total ── */
    .total-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
    }

    .total-label {
      font-size: 13px;
      color: var(--text-secondary, #8b8ba0);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }

    .total-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary, #ececf0);
    }

    /* ── Actions ── */
    .actions-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 20px;
      border-top: 1px solid var(--border, #27273a);
      flex-wrap: wrap;
    }
  `],
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly orderEvents = inject(OrderEventsService);

  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);

  private sseSub: Subscription | null = null;
  private orderId: string | null = null;

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id');
    if (this.orderId) this.loadOrder(this.orderId);
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
  }

  private async loadOrder(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const order = await firstValueFrom(this.orderService.getOrder(id));
      this.order.set(order);
      this.connectSse(id);
    } catch {
      this.order.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private connectSse(id: string): void {
    this.orderEvents.connectCustomer();

    this.sseSub = this.orderEvents.events().subscribe(evt => {
      if (evt.type === 'order_updated' && evt.orderId === id) {
        this.order.update(o => o ? { ...o, status: evt.status as Order['status'] } : null);
      }
    });
  }

  statusLabel(status: string): string {
    return orderStatusLabel(status);
  }

  statusIcon(status: string): string {
    return orderStatusIcon(status);
  }

  /** Returns true if the given step has been reached or passed (for non-cancelled orders). */
  stepDone(step: string, currentStatus: string): boolean {
    const order = ['pending', 'confirmed', 'ready', 'completed'];
    return order.indexOf(currentStatus) >= order.indexOf(step);
  }
}
