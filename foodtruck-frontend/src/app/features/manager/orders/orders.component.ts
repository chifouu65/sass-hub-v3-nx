import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import { OrderService, Order } from '../../../core/services/order.service';
import { TruckService } from '../../../core/services/truck.service';
import { OrderEventsService } from '../../../core/services/order-events.service';
import { orderStatusLabel, orderStatusIcon } from '../../../core/utils/order-status';

@Component({
  selector: 'app-manager-orders',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="orders-page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Commandes</h1>
          <p class="subtitle">Gérez les commandes en temps réel</p>
        </div>
        <div class="header-actions">
          <div class="live-badge" [class.sse-mode]="sseConnected()">
            <span class="live-dot"></span>
            {{ sseConnected() ? 'Temps réel' : 'Actualisation ' + countdown() + 's' }}
          </div>
          <button mat-icon-button (click)="reload()" [disabled]="loading()" matTooltip="Actualiser">
            <mat-icon [class.spinning]="loading()">refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Stats row -->
      <div class="stats-row" *ngIf="!loading() || allOrders().length > 0">
        <div class="stat-pill pending">
          <mat-icon>pending_actions</mat-icon>
          <span>{{ pendingOrders().length }} en attente</span>
        </div>
        <div class="stat-pill confirmed">
          <mat-icon>restaurant</mat-icon>
          <span>{{ confirmedOrders().length }} en préparation</span>
        </div>
        <div class="stat-pill ready">
          <mat-icon>check_circle</mat-icon>
          <span>{{ readyOrders().length }} prêtes</span>
        </div>
        <div class="stat-pill total">
          <mat-icon>euro</mat-icon>
          <span>{{ todayRevenue() | number:'1.2-2' }}€ aujourd'hui</span>
        </div>
      </div>

      <!-- Loading initial -->
      <div *ngIf="loading() && allOrders().length === 0" class="center-state">
        <mat-spinner diameter="36"></mat-spinner>
        <p>Chargement des commandes…</p>
      </div>

      <!-- No truck -->
      <div *ngIf="!loading() && !truckId()" class="center-state">
        <mat-icon class="empty-icon">store</mat-icon>
        <p>Créez d'abord votre food truck pour voir les commandes.</p>
      </div>

      <!-- Columns -->
      <div class="kanban" *ngIf="truckId()">

        <!-- En attente -->
        <div class="column">
          <div class="col-header pending-header">
            <div class="col-title">
              <mat-icon>pending_actions</mat-icon>
              <span>En attente</span>
              <span class="badge">{{ pendingOrders().length }}</span>
            </div>
          </div>
          <div class="col-body">
            <div *ngIf="pendingOrders().length === 0" class="empty-col">
              Aucune commande
            </div>
            <div *ngFor="let order of pendingOrders()" class="order-card pending-card">
              <div class="card-top">
                <span class="order-ref">#{{ order.id.slice(-6).toUpperCase() }}</span>
                <span class="order-time">{{ order.createdAt | date:'HH:mm' }}</span>
              </div>
              <div class="items-list">
                <div *ngFor="let item of order.items" class="item-row">
                  <span class="item-qty">×{{ item.quantity }}</span>
                  <span class="item-name">{{ item.menuItemName || 'Article' }}</span>
                  <span class="item-price">{{ (item.unitPrice * item.quantity) | number:'1.2-2' }}€</span>
                </div>
              </div>
              <div *ngIf="order.note" class="order-note">
                <mat-icon>notes</mat-icon> {{ order.note }}
              </div>
              <div class="card-footer">
                <span class="total">{{ order.totalPrice | number:'1.2-2' }}€</span>
                <div class="card-actions">
                  <button
                    mat-stroked-button
                    class="btn-reject"
                    (click)="updateStatus(order.id, 'cancelled')"
                    [disabled]="updating()[order.id]"
                    matTooltip="Annuler"
                  >
                    <mat-icon>close</mat-icon>
                  </button>
                  <button
                    mat-raised-button
                    class="btn-accept"
                    (click)="updateStatus(order.id, 'confirmed')"
                    [disabled]="updating()[order.id]"
                  >
                    <mat-spinner *ngIf="updating()[order.id]" diameter="16"></mat-spinner>
                    <mat-icon *ngIf="!updating()[order.id]">check</mat-icon>
                    Accepter
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- En préparation -->
        <div class="column">
          <div class="col-header confirmed-header">
            <div class="col-title">
              <mat-icon>restaurant</mat-icon>
              <span>En préparation</span>
              <span class="badge">{{ confirmedOrders().length }}</span>
            </div>
          </div>
          <div class="col-body">
            <div *ngIf="confirmedOrders().length === 0" class="empty-col">
              Aucune commande
            </div>
            <div *ngFor="let order of confirmedOrders()" class="order-card confirmed-card">
              <div class="card-top">
                <span class="order-ref">#{{ order.id.slice(-6).toUpperCase() }}</span>
                <span class="order-time">{{ order.createdAt | date:'HH:mm' }}</span>
              </div>
              <div class="items-list">
                <div *ngFor="let item of order.items" class="item-row">
                  <span class="item-qty">×{{ item.quantity }}</span>
                  <span class="item-name">{{ item.menuItemName || 'Article' }}</span>
                  <span class="item-price">{{ (item.unitPrice * item.quantity) | number:'1.2-2' }}€</span>
                </div>
              </div>
              <div *ngIf="order.note" class="order-note">
                <mat-icon>notes</mat-icon> {{ order.note }}
              </div>
              <div class="card-footer">
                <span class="total">{{ order.totalPrice | number:'1.2-2' }}€</span>
                <button
                  mat-raised-button
                  class="btn-ready"
                  (click)="updateStatus(order.id, 'ready')"
                  [disabled]="updating()[order.id]"
                >
                  <mat-spinner *ngIf="updating()[order.id]" diameter="16"></mat-spinner>
                  <mat-icon *ngIf="!updating()[order.id]">done_all</mat-icon>
                  Prêt
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Prêtes -->
        <div class="column">
          <div class="col-header ready-header">
            <div class="col-title">
              <mat-icon>check_circle</mat-icon>
              <span>Prêtes</span>
              <span class="badge">{{ readyOrders().length }}</span>
            </div>
          </div>
          <div class="col-body">
            <div *ngIf="readyOrders().length === 0" class="empty-col">
              Aucune commande
            </div>
            <div *ngFor="let order of readyOrders()" class="order-card ready-card">
              <div class="card-top">
                <span class="order-ref">#{{ order.id.slice(-6).toUpperCase() }}</span>
                <span class="order-time">{{ order.createdAt | date:'HH:mm' }}</span>
              </div>
              <div class="items-list">
                <div *ngFor="let item of order.items" class="item-row">
                  <span class="item-qty">×{{ item.quantity }}</span>
                  <span class="item-name">{{ item.menuItemName || 'Article' }}</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="total">{{ order.totalPrice | number:'1.2-2' }}€</span>
                <button
                  mat-raised-button
                  class="btn-complete"
                  (click)="updateStatus(order.id, 'completed')"
                  [disabled]="updating()[order.id]"
                >
                  <mat-spinner *ngIf="updating()[order.id]" diameter="16"></mat-spinner>
                  <mat-icon *ngIf="!updating()[order.id]">done</mat-icon>
                  Remis
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Historique (complétées/annulées aujourd'hui) -->
        <div class="column">
          <div class="col-header done-header">
            <div class="col-title">
              <mat-icon>history</mat-icon>
              <span>Historique</span>
              <span class="badge">{{ doneOrders().length }}</span>
            </div>
          </div>
          <div class="col-body">
            <div *ngIf="doneOrders().length === 0" class="empty-col">
              Aucune commande
            </div>
            <div *ngFor="let order of doneOrders()" class="order-card done-card">
              <div class="card-top">
                <span class="order-ref">#{{ order.id.slice(-6).toUpperCase() }}</span>
                <div class="done-status" [class.cancelled]="order.status === 'cancelled'">
                  <mat-icon>{{ statusIcon(order.status) }}</mat-icon>
                  {{ statusLabel(order.status) }}
                </div>
              </div>
              <div class="items-list compact">
                <div *ngFor="let item of order.items" class="item-row">
                  <span class="item-qty">×{{ item.quantity }}</span>
                  <span class="item-name">{{ item.menuItemName || 'Article' }}</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="total muted">{{ order.totalPrice | number:'1.2-2' }}€</span>
                <span class="order-time muted">{{ order.createdAt | date:'HH:mm' }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .orders-page {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      height: calc(100vh - 56px);
      overflow: hidden;
      box-sizing: border-box;
    }

    /* ── Header ── */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-shrink: 0;

      h1 { margin: 0 0 2px; font-size: 22px; font-weight: 700; color: var(--text-primary, #ececf0); }
      .subtitle { margin: 0; font-size: 13px; color: var(--text-secondary, #8b8ba0); }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
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
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--success, #22c55e);
      box-shadow: 0 0 6px #22c55e;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* ── Stats row ── */
    .stats-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .stat-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid transparent;

      mat-icon { font-size: 15px; width: 15px; height: 15px; }

      &.pending  { background: rgba(245,158,11,0.1);  color: var(--warning,  #f59e0b); border-color: rgba(245,158,11,0.2);  }
      &.confirmed{ background: rgba(99,102,241,0.1);  color: #818cf8;                  border-color: rgba(99,102,241,0.2);  }
      &.ready    { background: rgba(34,197,94,0.1);   color: var(--success,  #22c55e); border-color: rgba(34,197,94,0.2);   }
      &.total    { background: rgba(249,115,22,0.1);  color: var(--accent,   #f97316); border-color: rgba(249,115,22,0.2);  }
    }

    /* ── Center state ── */
    .center-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex: 1;
      color: var(--text-muted, #5c5c70);
      p { margin: 0; font-size: 14px; }
    }

    .empty-icon { font-size: 48px; width: 48px; height: 48px; }

    /* ── Kanban ── */
    .kanban {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      flex: 1;
      overflow: hidden;
      min-height: 0;

      @media (max-width: 1100px) { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 600px)  { grid-template-columns: 1fr; }
    }

    .column {
      display: flex;
      flex-direction: column;
      background: var(--bg-card, #16161f);
      border: 1px solid var(--border, #27273a);
      border-radius: 12px;
      overflow: hidden;
      min-height: 0;
    }

    /* ── Column headers ── */
    .col-header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border, #27273a);
      flex-shrink: 0;
    }

    .col-title {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 700;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .badge {
      margin-left: auto;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      padding: 0 6px;
    }

    .pending-header  { .col-title { color: var(--warning,  #f59e0b); } .badge { background: rgba(245,158,11,0.15); color: var(--warning,  #f59e0b); } }
    .confirmed-header{ .col-title { color: #818cf8; }                  .badge { background: rgba(99,102,241,0.15); color: #818cf8; } }
    .ready-header    { .col-title { color: var(--success,  #22c55e); } .badge { background: rgba(34,197,94,0.15);  color: var(--success,  #22c55e); } }
    .done-header     { .col-title { color: var(--text-secondary, #8b8ba0); } .badge { background: rgba(255,255,255,0.06); color: var(--text-secondary); } }

    /* ── Column body ── */
    .col-body {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: var(--border, #27273a); border-radius: 2px; }
    }

    .empty-col {
      text-align: center;
      padding: 32px 12px;
      font-size: 12px;
      color: var(--text-muted, #5c5c70);
    }

    /* ── Order cards ── */
    .order-card {
      background: var(--bg-secondary, #111118);
      border: 1px solid var(--border, #27273a);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 150ms ease;

      &.pending-card  { border-left: 3px solid var(--warning,  #f59e0b); }
      &.confirmed-card{ border-left: 3px solid #818cf8; }
      &.ready-card    { border-left: 3px solid var(--success, #22c55e); }
      &.done-card     { border-left: 3px solid var(--border, #27273a); opacity: 0.7; }

      &:hover { border-color: var(--border-hover, #3a3a50); }
    }

    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .order-ref {
      font-size: 13px;
      font-weight: 700;
      color: var(--text-primary, #ececf0);
      font-family: monospace;
    }

    .order-time {
      font-size: 11px;
      color: var(--text-muted, #5c5c70);
    }

    /* ── Items ── */
    .items-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      background: rgba(255,255,255,0.03);
      border-radius: 6px;
      border: 1px solid var(--border, #27273a);

      &.compact { padding: 6px 8px; gap: 2px; }
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }

    .item-qty {
      font-weight: 700;
      color: var(--accent, #f97316);
      min-width: 24px;
    }

    .item-name {
      flex: 1;
      color: var(--text-primary, #ececf0);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-price {
      color: var(--text-secondary, #8b8ba0);
      font-size: 11px;
      white-space: nowrap;
    }

    /* ── Note ── */
    .order-note {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      font-size: 11px;
      color: var(--warning, #f59e0b);
      background: rgba(245,158,11,0.08);
      border-radius: 6px;
      padding: 6px 8px;

      mat-icon { font-size: 13px; width: 13px; height: 13px; margin-top: 1px; flex-shrink: 0; }
    }

    /* ── Footer ── */
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-top: 4px;
    }

    .total {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary, #ececf0);

      &.muted { color: var(--text-secondary, #8b8ba0); font-size: 12px; }
    }

    .muted { color: var(--text-secondary, #8b8ba0); font-size: 11px; }

    .card-actions { display: flex; gap: 6px; }

    /* ── Buttons ── */
    .btn-accept {
      background: var(--success, #22c55e) !important;
      color: #000 !important;
      font-weight: 700 !important;
      font-size: 12px !important;
      padding: 0 12px !important;
      height: 32px !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .btn-reject {
      color: var(--danger, #ef4444) !important;
      border-color: rgba(239,68,68,0.3) !important;
      height: 32px !important;
      width: 32px !important;
      min-width: 32px !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .btn-ready {
      background: #818cf8 !important;
      color: #fff !important;
      font-weight: 700 !important;
      font-size: 12px !important;
      padding: 0 12px !important;
      height: 32px !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .btn-complete {
      background: var(--accent, #f97316) !important;
      color: #fff !important;
      font-weight: 700 !important;
      font-size: 12px !important;
      padding: 0 12px !important;
      height: 32px !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    /* ── Done status ── */
    .done-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      color: var(--success, #22c55e);
      mat-icon { font-size: 13px; width: 13px; height: 13px; }

      &.cancelled { color: var(--danger, #ef4444); }
    }
  `],
})
export class ManagerOrdersComponent implements OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly truckService = inject(TruckService);
  private readonly orderEvents = inject(OrderEventsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly allOrders = signal<Order[]>([]);
  readonly truckId = signal<string | null>(null);
  readonly updating = signal<Record<string, boolean>>({});
  readonly countdown = signal(30);
  readonly sseConnected = signal(false);

  readonly pendingOrders   = computed(() => this.allOrders().filter(o => o.status === 'pending'));
  readonly confirmedOrders = computed(() => this.allOrders().filter(o => o.status === 'confirmed'));
  readonly readyOrders     = computed(() => this.allOrders().filter(o => o.status === 'ready'));
  readonly doneOrders      = computed(() => this.allOrders().filter(o => o.status === 'completed' || o.status === 'cancelled'));
  readonly todayRevenue    = computed(() =>
    this.allOrders()
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.totalPrice ?? 0), 0)
  );

  private cdSub: Subscription;
  private sseSub: Subscription;

  constructor() {
    this.loadOrders();

    // Fallback polling countdown (used when SSE is not connected)
    this.cdSub = interval(1000).subscribe(() => {
      if (this.sseConnected()) return; // SSE is active — no need to poll
      this.countdown.update(v => {
        if (v <= 1) { this.loadOrders(); return 30; }
        return v - 1;
      });
    });

    this.sseSub = new Subscription();
  }

  ngOnDestroy(): void {
    this.sseSub.unsubscribe();
    this.cdSub.unsubscribe();
    this.orderEvents.disconnect();
  }

  async reload(): Promise<void> {
    this.countdown.set(30);
    await this.loadOrders();
  }

  private async loadOrders(): Promise<void> {
    this.loading.set(true);
    try {
      const truck = await firstValueFrom(this.truckService.getMyTruck());
      if (!truck?.id) { this.loading.set(false); return; }

      const isFirstLoad = !this.truckId();
      this.truckId.set(truck.id);

      const orders = await firstValueFrom(this.orderService.getTruckOrders(truck.id));
      this.allOrders.set(orders ?? []);

      // Connect SSE on first successful load
      if (isFirstLoad) {
        this.connectSse(truck.id);
      }
    } catch {
      // pas de truck ou erreur réseau
    } finally {
      this.loading.set(false);
    }
  }

  private connectSse(truckId: string): void {
    this.orderEvents.connect(truckId);
    this.sseConnected.set(true);

    this.sseSub = this.orderEvents.events().subscribe(event => {
      // Reload orders on any SSE event
      this.loadOrders();
      const label = event.type === 'order_created'
        ? '🛎️ Nouvelle commande !'
        : `Commande mise à jour — ${event.status}`;
      this.snackBar.open(label, 'OK', { duration: 3000 });
    });
  }

  statusLabel(status: string): string {
    return orderStatusLabel(status);
  }

  statusIcon(status: string): string {
    return orderStatusIcon(status);
  }

  async updateStatus(orderId: string, status: Order['status']): Promise<void> {
    this.updating.update(u => ({ ...u, [orderId]: true }));
    try {
      await firstValueFrom(this.orderService.updateOrderStatus(orderId, status));
      await this.loadOrders();
      const labels: Record<string, string> = {
        confirmed: 'Commande acceptée ✓',
        ready:     'Commande prête ✓',
        completed: 'Commande remise ✓',
        cancelled: 'Commande annulée',
      };
      this.snackBar.open(labels[status] ?? 'Statut mis à jour', 'OK', { duration: 2500 });
    } catch {
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3000 });
    } finally {
      this.updating.update(u => { const n = { ...u }; delete n[orderId]; return n; });
    }
  }
}
