import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { firstValueFrom, Subscription } from 'rxjs';
import { TruckService, Truck } from '../../../core/services/truck.service';
import { OrderService, Order } from '../../../core/services/order.service';
import { OrderEventsService } from '../../../core/services/order-events.service';
import { orderStatusLabel } from '../../../core/utils/order-status';
// MatSnackBar not needed here — open/close toggle lives in the sidebar shell

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="dashboard-container">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Tableau de bord</h1>
          <p class="subtitle" *ngIf="truck()">
            <strong>{{ truck()!.name }}</strong> —
            Gérez vos commandes, votre menu et votre localisation.
          </p>
          <p class="subtitle" *ngIf="!truck() && !loading()">Commencez par créer votre food truck.</p>
        </div>
        <div class="header-right">
          <div *ngIf="sseConnected()" class="sse-badge">
            <span class="sse-dot"></span> Temps réel
          </div>
          <div *ngIf="truck()" class="status-pill" [class.open]="truck()!.isOpen" [class.closed]="!truck()!.isOpen">
            <span class="dot"></span>
            {{ truck()!.isOpen ? 'Ouvert' : 'Fermé' }}
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- No truck CTA -->
      <mat-card *ngIf="!loading() && !truck()" class="cta-card">
        <div class="cta-inner">
          <mat-icon>add_business</mat-icon>
          <h2>Créez votre food truck</h2>
          <p>Configurez votre profil, votre menu et commencez à recevoir des commandes.</p>
          <a routerLink="/manager/settings" mat-raised-button color="primary">
            <mat-icon>arrow_forward</mat-icon>
            Créer mon truck
          </a>
        </div>
      </mat-card>

      <!-- Stats -->
      <ng-container *ngIf="truck() && !loading()">

        <!-- KPI row -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-icon pending">
              <mat-icon>pending_actions</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ pendingOrders() }}</span>
              <span class="kpi-label">En attente</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon preparing">
              <mat-icon>restaurant</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ preparingOrders() }}</span>
              <span class="kpi-label">En préparation</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon done">
              <mat-icon>check_circle</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ completedOrders() }}</span>
              <span class="kpi-label">Complétées</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-icon revenue">
              <mat-icon>euro</mat-icon>
            </div>
            <div class="kpi-body">
              <span class="kpi-value">{{ totalRevenue() | number:'1.0-0' }}€</span>
              <span class="kpi-label">Chiffre d'affaires</span>
            </div>
          </div>
        </div>

        <!-- Content row -->
        <div class="content-grid">

          <!-- Recent orders -->
          <mat-card class="panel-card orders-panel">
            <div class="panel-header">
              <mat-icon>receipt_long</mat-icon>
              <span>Commandes récentes</span>
              <a routerLink="/manager/orders" mat-button class="see-all">Voir tout</a>
            </div>
            <mat-divider></mat-divider>

            <div *ngIf="recentOrders().length === 0" class="empty-panel">
              <mat-icon>inbox</mat-icon>
              <p>Aucune commande pour l'instant</p>
            </div>

            <ng-container *ngFor="let order of recentOrders(); let last = last">
              <div class="order-row">
                <div class="order-meta">
                  <span class="order-id">#{{ order.id.slice(-6).toUpperCase() }}</span>
                  <span class="order-date">{{ order.createdAt | date:'HH:mm' }}</span>
                </div>
                <div class="order-status" [class]="'status-' + order.status">
                  {{ statusLabel(order.status) }}
                </div>
                <div class="order-total">{{ order.totalPrice | number:'1.2-2' }}€</div>
              </div>
              <mat-divider *ngIf="!last"></mat-divider>
            </ng-container>
          </mat-card>

          <!-- Quick actions -->
          <div class="quick-actions">
            <h3>Actions rapides</h3>

            <a routerLink="/manager/settings" class="action-card">
              <div class="action-icon settings">
                <mat-icon>settings</mat-icon>
              </div>
              <div>
                <strong>Mon Truck</strong>
                <p>Modifier le profil, la description…</p>
              </div>
              <mat-icon class="arrow">chevron_right</mat-icon>
            </a>

            <a routerLink="/manager/menu" class="action-card">
              <div class="action-icon menu">
                <mat-icon>restaurant_menu</mat-icon>
              </div>
              <div>
                <strong>Gérer le menu</strong>
                <p>Ajouter / modifier des articles</p>
              </div>
              <mat-icon class="arrow">chevron_right</mat-icon>
            </a>

            <a routerLink="/manager/location" class="action-card">
              <div class="action-icon location">
                <mat-icon>location_on</mat-icon>
              </div>
              <div>
                <strong>Localisation</strong>
                <p>Mettre à jour votre position GPS</p>
              </div>
              <mat-icon class="arrow">chevron_right</mat-icon>
            </a>

            <a routerLink="/manager/orders" class="action-card">
              <div class="action-icon orders">
                <mat-icon>receipt_long</mat-icon>
              </div>
              <div>
                <strong>Commandes</strong>
                <p>Gérer les commandes en cours</p>
              </div>
              <mat-icon class="arrow">chevron_right</mat-icon>
            </a>
          </div>

        </div>
      </ng-container>

    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 24px;
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* ── Header ── */
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;

      h1 {
        margin: 0 0 4px;
        font-size: 22px;
        font-weight: 700;
        color: var(--text-primary, #ececf0);
      }

      .subtitle {
        margin: 0;
        font-size: 13px;
        color: var(--text-secondary, #8b8ba0);

        strong { color: var(--accent, #f97316); }
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .sse-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #4ade80;
      background: rgba(34,197,94,0.08);
      border: 1px solid rgba(34,197,94,0.2);
      padding: 5px 10px;
      border-radius: 20px;
    }

    .sse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 16px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      flex-shrink: 0;

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      &.open {
        color: #4ade80;
        background: rgba(34,197,94,0.1);
        border: 1px solid rgba(34,197,94,0.25);
        .dot { background: #4ade80; box-shadow: 0 0 6px #22c55e; }
      }

      &.closed {
        color: #9ca3af;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        .dot { background: #4b5563; }
      }
    }

    /* ── Loading ── */
    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }

    /* ── No truck CTA ── */
    .cta-card {
      background: var(--bg-card, #16161f) !important;
      border: 1px solid var(--border, #27273a) !important;
      border-radius: var(--radius-md, 12px) !important;
      box-shadow: none !important;

      .cta-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 48px 24px;
        text-align: center;

        mat-icon { font-size: 56px; width: 56px; height: 56px; color: var(--accent, #f97316); }
        h2 { margin: 0; font-size: 20px; color: var(--text-primary, #ececf0); }
        p  { margin: 0; font-size: 14px; color: var(--text-secondary, #8b8ba0); max-width: 320px; }
        a  { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
      }
    }

    /* ── KPI grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;

      @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
      @media (max-width: 500px) { grid-template-columns: 1fr; }
    }

    .kpi-card {
      background: var(--bg-card, #16161f);
      border: 1px solid var(--border, #27273a);
      border-radius: var(--radius-md, 12px);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .kpi-icon {
      width: 44px; height: 44px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;

      mat-icon { font-size: 22px; width: 22px; height: 22px; }

      &.pending   { background: var(--warning-muted, rgba(245,158,11,0.12)); mat-icon { color: var(--warning,  #f59e0b); } }
      &.preparing { background: rgba(99,102,241,0.12);                        mat-icon { color: #818cf8; } }
      &.done      { background: var(--success-muted, rgba(34,197,94,0.12));  mat-icon { color: var(--success, #22c55e); } }
      &.revenue   { background: var(--accent-muted, rgba(249,115,22,0.12));  mat-icon { color: var(--accent,  #f97316); } }
    }

    .kpi-body { display: flex; flex-direction: column; gap: 2px; }
    .kpi-value { font-size: 26px; font-weight: 700; color: var(--text-primary, #ececf0); line-height: 1; }
    .kpi-label { font-size: 12px; color: var(--text-secondary, #8b8ba0); }

    /* ── Content grid ── */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 20px;
      align-items: start;

      @media (max-width: 900px) { grid-template-columns: 1fr; }
    }

    /* ── Orders panel ── */
    .panel-card {
      background: var(--bg-card, #16161f) !important;
      border: 1px solid var(--border, #27273a) !important;
      border-radius: var(--radius-md, 12px) !important;
      box-shadow: none !important;
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px;
      color: var(--text-primary, #ececf0);
      font-weight: 600;
      font-size: 14px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--accent, #f97316); }

      .see-all {
        margin-left: auto;
        font-size: 12px;
        color: var(--accent, #f97316) !important;
        min-width: auto;
        padding: 4px 8px;
        line-height: 1;
      }
    }

    mat-divider { border-color: var(--border, #27273a) !important; }

    .empty-panel {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 40px;
      color: var(--text-muted, #5c5c70);

      mat-icon { font-size: 36px; width: 36px; height: 36px; }
      p { margin: 0; font-size: 13px; }
    }

    .order-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
    }

    .order-meta {
      display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;

      .order-id  { font-size: 13px; font-weight: 600; color: var(--text-primary, #ececf0); font-family: monospace; }
      .order-date{ font-size: 11px; color: var(--text-muted, #5c5c70); }
    }

    .order-total { font-size: 13px; font-weight: 600; color: var(--text-primary, #ececf0); white-space: nowrap; }

    .order-status {
      font-size: 11px; font-weight: 600;
      padding: 3px 10px; border-radius: 20px;

      &.status-pending   { background: var(--warning-muted); color: var(--warning, #f59e0b); }
      &.status-preparing { background: rgba(99,102,241,0.12); color: #818cf8; }
      &.status-confirmed { background: rgba(99,102,241,0.12); color: #818cf8; }
      &.status-ready     { background: var(--success-muted); color: var(--success, #22c55e); }
      &.status-completed { background: rgba(100,100,120,0.15); color: var(--text-muted, #5c5c70); }
      &.status-cancelled { background: var(--danger-muted); color: var(--danger, #ef4444); }
    }

    /* ── Quick actions ── */
    .quick-actions {
      display: flex; flex-direction: column; gap: 8px;

      h3 {
        margin: 0 0 4px;
        font-size: 12px; font-weight: 600;
        color: var(--text-secondary, #8b8ba0);
        text-transform: uppercase; letter-spacing: 0.5px;
      }
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: var(--bg-card, #16161f);
      border: 1px solid var(--border, #27273a);
      border-radius: var(--radius-md, 12px);
      text-decoration: none;
      color: inherit;
      transition: all 150ms ease;

      &:hover {
        border-color: var(--border-hover, #3a3a50);
        background: var(--bg-hover, #1c1c28);
        transform: translateX(2px);
      }

      > div:nth-child(2) {
        flex: 1; min-width: 0;
        strong { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary, #ececf0); margin-bottom: 2px; }
        p { margin: 0; font-size: 11px; color: var(--text-secondary, #8b8ba0); }
      }

      .arrow { color: var(--text-muted, #5c5c70); font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    }

    .action-icon {
      width: 36px; height: 36px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }

      &.settings { background: rgba(99,102,241,0.12); mat-icon { color: #818cf8; } }
      &.menu     { background: var(--accent-muted);   mat-icon { color: var(--accent, #f97316); } }
      &.location { background: var(--success-muted);  mat-icon { color: var(--success, #22c55e); } }
      &.orders   { background: var(--warning-muted);  mat-icon { color: var(--warning, #f59e0b); } }
    }
  `],
})
export class ManagerDashboardComponent implements OnInit, OnDestroy {
  private readonly truckService = inject(TruckService);
  private readonly orderService = inject(OrderService);
  private readonly orderEvents  = inject(OrderEventsService);

  readonly loading      = signal(true);
  readonly truck        = signal<Truck | null>(null);
  readonly orders       = signal<Order[]>([]);
  readonly sseConnected = signal(false);

  private sseSub: Subscription | null = null;

  readonly pendingOrders   = computed(() => this.orders().filter(o => o.status === 'pending').length);
  readonly preparingOrders = computed(() => this.orders().filter(o => o.status === 'confirmed').length);
  readonly completedOrders = computed(() => this.orders().filter(o => o.status === 'completed').length);
  readonly totalRevenue    = computed(() => this.orders()
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.totalPrice ?? 0), 0));
  readonly recentOrders    = computed(() =>
    [...this.orders()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
  );

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.sseSub?.unsubscribe();
  }

  private async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const truck = await firstValueFrom(this.truckService.getMyTruck());
      this.truck.set(truck as Truck);
      const orders = await firstValueFrom(this.orderService.getTruckOrders(truck.id));
      this.orders.set(orders);
      this.connectSse(truck.id);
    } catch {
      // no truck yet
    } finally {
      this.loading.set(false);
    }
  }

  private connectSse(truckId: string): void {
    this.orderEvents.connect(truckId);
    this.sseConnected.set(true);

    this.sseSub = this.orderEvents.events().subscribe(evt => {
      if (evt.type === 'order_created') {
        // Fetch the full order to get items, total, etc.
        this.orderService.getOrder(evt.orderId).subscribe({
          next: (order) => this.orders.update(list => [order, ...list]),
          error: () => { /* ignore — order may not be accessible */ },
        });
      } else if (evt.type === 'order_updated') {
        this.orders.update(list =>
          list.map(o =>
            o.id === evt.orderId ? { ...o, status: evt.status as Order['status'] } : o
          )
        );
      }
    });
  }

  statusLabel(status: string): string {
    return orderStatusLabel(status);
  }
}
