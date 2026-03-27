import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom, Subscription } from 'rxjs';
import { OrderService, Order } from '../../../core/services/order.service';
import { OrderEventsService } from '../../../core/services/order-events.service';
import { orderStatusLabel, orderStatusIcon } from '../../../core/utils/order-status';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="history-page">

      <div class="page-header">
        <div>
          <h1>Mes commandes</h1>
          <p class="subtitle">Suivi de vos commandes en temps réel</p>
        </div>
        <div class="header-actions">
          <div class="live-badge" *ngIf="hasActiveOrders()">
            <span class="live-dot"></span>
            Temps réel
          </div>
          <button
            mat-icon-button
            (click)="reload()"
            [disabled]="loading()"
            matTooltip="Actualiser"
          >
            <mat-icon [class.spinning]="loading()">refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="center-state">
        <mat-spinner diameter="36"></mat-spinner>
        <p>Chargement…</p>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading() && orders().length === 0" class="center-state">
        <mat-icon class="empty-icon">receipt_long</mat-icon>
        <p>Vous n'avez encore passé aucune commande.</p>
        <a routerLink="/discover" mat-raised-button color="primary">
          Découvrir les food trucks
        </a>
      </div>

      <!-- Liste -->
      <div *ngIf="!loading() && orders().length > 0">

        <!-- En cours -->
        <div *ngIf="activeOrders().length > 0" class="category-section">
          <div class="category-header">
            <span class="category-dot active-dot"></span>
            <span class="category-title">En cours</span>
            <span class="category-count">{{ activeOrders().length }}</span>
          </div>
          <div class="orders-list">
            <div *ngFor="let order of activeOrders()" class="order-card" (click)="goToOrder(order.id)">
              <div class="card-top">
                <div class="order-meta">
                  <span class="order-ref">#{{ order.id.slice(-6).toUpperCase() }}</span>
                  <span class="order-date">{{ order.createdAt | date:'d MMM yyyy, HH:mm' }}</span>
                </div>
                <div class="status-badge" [ngClass]="'status-' + order.status">
                  <mat-icon>{{ statusIcon(order.status) }}</mat-icon>
                  {{ statusLabel(order.status) }}
                </div>
              </div>
              <mat-divider></mat-divider>
              <div class="items-section">
                <div *ngFor="let item of order.items" class="item-row">
                  <span class="item-qty">×{{ item.quantity }}</span>
                  <span class="item-name">{{ item.menuItemName || 'Article' }}</span>
                  <span class="item-price">{{ (item.unitPrice * item.quantity) | number:'1.2-2' }}€</span>
                </div>
              </div>
              <div *ngIf="order.note" class="order-note">
                <mat-icon>notes</mat-icon>
                {{ order.note }}
              </div>
              <mat-divider></mat-divider>
              <div class="card-footer">
                <span class="total-label">Total</span>
                <span class="total-value">{{ order.totalPrice | number:'1.2-2' }}€</span>
                <mat-icon class="chevron">chevron_right</mat-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- Terminées -->
        <div *ngIf="doneOrders().length > 0" class="category-section">
          <div class="category-header">
            <span class="category-dot done-dot"></span>
            <span class="category-title">Terminées</span>
            <span class="category-count">{{ doneOrders().length }}</span>
          </div>
          <div class="orders-list">
            <div *ngFor="let order of doneOrders()" class="order-card done" (click)="goToOrder(order.id)">
              <div class="card-top">
                <div class="order-meta">
                  <span class="order-ref">#{{ order.id.slice(-6).toUpperCase() }}</span>
                  <span class="order-date">{{ order.createdAt | date:'d MMM yyyy, HH:mm' }}</span>
                </div>
                <div class="status-badge" [ngClass]="'status-' + order.status">
                  <mat-icon>{{ statusIcon(order.status) }}</mat-icon>
                  {{ statusLabel(order.status) }}
                </div>
              </div>
              <mat-divider></mat-divider>
              <div class="items-section">
                <div *ngFor="let item of order.items" class="item-row">
                  <span class="item-qty">×{{ item.quantity }}</span>
                  <span class="item-name">{{ item.menuItemName || 'Article' }}</span>
                  <span class="item-price">{{ (item.unitPrice * item.quantity) | number:'1.2-2' }}€</span>
                </div>
              </div>
              <div *ngIf="order.note" class="order-note">
                <mat-icon>notes</mat-icon>
                {{ order.note }}
              </div>
              <mat-divider></mat-divider>
              <div class="card-footer">
                <span class="total-label">Total</span>
                <span class="total-value">{{ order.totalPrice | number:'1.2-2' }}€</span>
                <mat-icon class="chevron">chevron_right</mat-icon>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .history-page {
      padding: 24px;
      max-width: 680px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      h1 { margin: 0 0 2px; font-size: 22px; font-weight: 700; color: var(--text-primary, #ececf0); }
      .subtitle { margin: 0; font-size: 13px; color: var(--text-secondary, #8b8ba0); }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: var(--success, #22c55e);
      background: rgba(34,197,94,0.08);
      border: 1px solid rgba(34,197,94,0.2);
      border-radius: 20px;
      padding: 4px 10px;
      white-space: nowrap;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success, #22c55e);
      box-shadow: 0 0 5px #22c55e;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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

    .category-section {
      margin-bottom: 28px;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .category-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .active-dot {
      background: var(--success, #22c55e);
      box-shadow: 0 0 6px #22c55e;
      animation: pulse 2s infinite;
    }

    .done-dot {
      background: var(--text-muted, #5c5c70);
    }

    .category-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-secondary, #8b8ba0);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .category-count {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #5c5c70);
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border, #27273a);
      padding: 1px 7px;
      border-radius: 20px;
    }

    .orders-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .order-card {
      background: var(--bg-card, #16161f);
      border: 1px solid var(--border, #27273a);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: border-color 150ms, box-shadow 150ms;

      &:hover {
        border-color: rgba(249,115,22,0.3);
        box-shadow: 0 2px 12px rgba(249,115,22,0.08);
      }

      &.done {
        opacity: 0.75;
        &:hover { opacity: 1; }
      }
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      gap: 12px;
    }

    .order-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .order-ref {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary, #ececf0);
      font-family: monospace;
    }

    .order-date {
      font-size: 11px;
      color: var(--text-muted, #5c5c70);
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;

      mat-icon { font-size: 13px; width: 13px; height: 13px; }

      &.status-pending   { background: rgba(245,158,11,0.12); color: var(--warning, #f59e0b); }
      &.status-confirmed { background: rgba(99,102,241,0.12); color: #818cf8; }
      &.status-ready     { background: rgba(34,197,94,0.12);  color: var(--success, #22c55e); }
      &.status-completed { background: rgba(249,115,22,0.1);  color: var(--accent, #f97316); }
      &.status-cancelled { background: rgba(239,68,68,0.1);   color: var(--danger, #ef4444); }
    }

    mat-divider { border-color: var(--border, #27273a) !important; }

    .items-section {
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }

    .item-qty {
      font-weight: 700;
      color: var(--accent, #f97316);
      min-width: 24px;
    }

    .item-name {
      flex: 1;
      color: var(--text-primary, #ececf0);
    }

    .item-price {
      color: var(--text-secondary, #8b8ba0);
      font-size: 12px;
      white-space: nowrap;
    }

    .order-note {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin: 0 16px 12px;
      padding: 8px 10px;
      background: rgba(245,158,11,0.08);
      border-radius: 6px;
      font-size: 12px;
      color: var(--warning, #f59e0b);

      mat-icon { font-size: 14px; width: 14px; height: 14px; margin-top: 1px; flex-shrink: 0; }
    }

    .card-footer {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      gap: 8px;
    }

    .chevron {
      margin-left: auto;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--text-muted, #5c5c70);
    }

    .total-label {
      font-size: 12px;
      color: var(--text-secondary, #8b8ba0);
    }

    .total-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary, #ececf0);
    }
  `],
})
export class OrderHistoryComponent implements OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly orderEvents = inject(OrderEventsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);

  readonly activeOrders = computed(() =>
    this.orders().filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'ready')
  );

  readonly doneOrders = computed(() =>
    this.orders().filter(o => o.status === 'completed' || o.status === 'cancelled')
  );

  readonly hasActiveOrders = computed(() => this.activeOrders().length > 0);

  private sseSub: Subscription = new Subscription();
  private sseStarted = false; // flag propre — évite le double-connect

  constructor() {
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.sseSub.unsubscribe();
    this.orderEvents.disconnect();
  }

  async reload(): Promise<void> {
    await this.loadOrders();
  }

  private async loadOrders(): Promise<void> {
    this.loading.set(true);
    try {
      const orders = await firstValueFrom(this.orderService.getMyOrders());
      this.orders.set(orders ?? []);
      // Connecter SSE une seule fois après le premier chargement réussi
      if (!this.sseStarted) {
        this.sseStarted = true;
        this.connectSse();
      }
    } catch {
      this.orders.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private connectSse(): void {
    this.orderEvents.connectCustomer();
    this.sseSub = this.orderEvents.events().subscribe(event => {
      this.loadOrders();
      const STATUS_NOTIFS: Record<string, string> = {
        confirmed: '👨‍🍳 Votre commande est en préparation !',
        ready:     '✅ Votre commande est prête !',
        completed: '🎉 Commande remise. Bon appétit !',
        cancelled: '❌ Commande annulée.',
      };
      const msg = STATUS_NOTIFS[event.status];
      if (msg) this.snackBar.open(msg, 'OK', { duration: 4000 });
    });
  }

  goToOrder(id: string): void {
    this.router.navigateByUrl(`/my/orders/${id}`);
  }

  statusLabel(status: string): string {
    return orderStatusLabel(status);
  }

  statusIcon(status: string): string {
    return orderStatusIcon(status);
  }
}
