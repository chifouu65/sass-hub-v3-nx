import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom, filter } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { TruckService, Truck } from '../../../core/services/truck.service';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-manager-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <mat-sidenav-container class="shell-container">

      <!-- Sidebar -->
      <mat-sidenav
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile() || sidenavOpen()"
        (closedStart)="sidenavOpen.set(false)"
        class="sidenav"
      >
        <!-- Truck identity -->
        <div class="sidenav-header">
          <div class="truck-avatar">
            <mat-icon>lunch_dining</mat-icon>
          </div>
          <div class="truck-info" *ngIf="truck()">
            <span class="truck-name">{{ truck()!.name }}</span>
            <div class="status-pill" [class.open]="truck()!.isOpen" [class.closed]="!truck()!.isOpen">
              <span class="dot"></span>
              {{ truck()!.isOpen ? 'Ouvert' : 'Fermé' }}
            </div>
          </div>
          <div class="truck-info" *ngIf="!truck() && !loadingTruck()">
            <span class="truck-name no-truck">Pas de truck</span>
          </div>
          <mat-spinner *ngIf="loadingTruck()" diameter="20"></mat-spinner>
        </div>

        <!-- Open/Close toggle -->
        <div class="toggle-row" *ngIf="truck()">
          <span class="toggle-label">Statut d'ouverture</span>
          <mat-slide-toggle
            [checked]="truck()!.isOpen"
            (change)="toggleOpen()"
            [disabled]="togglingOpen()"
            color="primary"
          ></mat-slide-toggle>
        </div>

        <mat-divider></mat-divider>

        <!-- Navigation -->
        <nav class="nav-list">
          <a
            *ngFor="let item of navItems"
            [routerLink]="item.route"
            routerLinkActive="active"
            class="nav-item"
            (click)="isMobile() && sidenavOpen.set(false)"
          >
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        </nav>

        <mat-divider></mat-divider>

        <!-- Bottom actions -->
        <div class="sidenav-footer">
          <!-- User identity -->
          <div class="user-row">
            <div class="user-avatar">{{ userInitial() }}</div>
            <div class="user-info">
              <span class="user-email">{{ auth.user()?.['email'] }}</span>
              <span class="user-role">Gérant</span>
            </div>
          </div>
          <mat-divider></mat-divider>
          <a routerLink="/discover" class="nav-item secondary">
            <mat-icon>storefront</mat-icon>
            <span>Vue client</span>
          </a>
          <button class="nav-item secondary" (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Déconnexion</span>
          </button>
        </div>
      </mat-sidenav>

      <!-- Main content -->
      <mat-sidenav-content class="main-content">
        <!-- Mobile top bar -->
        <div class="mobile-topbar" *ngIf="isMobile()">
          <button mat-icon-button (click)="sidenavOpen.set(true)">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="mobile-title">{{ currentPageTitle() }}</span>
        </div>

        <div class="content-area">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>

    </mat-sidenav-container>
  `,
  styles: [`
    :host {
      display: block;
      height: calc(100vh - 56px);
    }

    .shell-container {
      height: 100%;
      background: var(--bg-primary, #0a0a0f);
    }

    /* ───── Sidenav ───── */
    .sidenav {
      width: 240px;
      background: var(--bg-secondary, #111118) !important;
      border-right: 1px solid var(--border, #27273a) !important;
      display: flex;
      flex-direction: column;
      padding: 0;
    }

    .sidenav-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px 16px;
    }

    .truck-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--accent-muted, rgba(249,115,22,0.12));
      border: 1px solid rgba(249,115,22,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: var(--accent, #f97316);
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }

    .truck-info {
      flex: 1;
      min-width: 0;
    }

    .truck-name {
      display: block;
      font-weight: 600;
      font-size: 14px;
      color: var(--text-primary, #ececf0);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.no-truck {
        color: var(--text-muted, #5c5c70);
        font-style: italic;
      }
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 20px;
      margin-top: 4px;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      &.open {
        color: #4ade80;
        background: rgba(34,197,94,0.12);
        .dot { background: #4ade80; box-shadow: 0 0 4px #22c55e; }
      }

      &.closed {
        color: #f87171;
        background: rgba(239,68,68,0.12);
        .dot { background: #f87171; }
      }
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px 14px;

      .toggle-label {
        font-size: 12px;
        color: var(--text-secondary, #8b8ba0);
      }
    }

    mat-divider {
      border-color: var(--border, #27273a) !important;
    }

    /* ───── Nav items ───── */
    .nav-list {
      flex: 1;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary, #8b8ba0);
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      width: 100%;
      transition: all 150ms ease;
      box-sizing: border-box;
      font-family: inherit;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      &:hover {
        background: var(--bg-hover, #1c1c28);
        color: var(--text-primary, #ececf0);
      }

      &.active {
        background: var(--accent-muted, rgba(249,115,22,0.12));
        color: var(--accent, #f97316);
        font-weight: 600;

        mat-icon {
          color: var(--accent, #f97316);
        }
      }

      &.secondary {
        margin-top: 2px;
        color: var(--text-muted, #5c5c70);

        &:hover {
          color: var(--text-secondary, #8b8ba0);
          background: var(--bg-hover, #1c1c28);
        }
      }
    }

    /* ───── Sidenav footer ───── */
    .sidenav-footer {
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 8px 8px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(249,115,22,0.12);
      border: 1px solid rgba(249,115,22,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: var(--accent, #f97316);
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .user-email {
      font-size: 11px;
      color: var(--text-secondary, #8b8ba0);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 10px;
      font-weight: 600;
      color: var(--accent, #f97316);
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* ───── Main content ───── */
    .main-content {
      background: var(--bg-primary, #0a0a0f) !important;
      display: flex;
      flex-direction: column;
    }

    .mobile-topbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 4px;
      background: var(--bg-secondary, #111118);
      border-bottom: 1px solid var(--border, #27273a);
      position: sticky;
      top: 0;
      z-index: 10;

      .mobile-title {
        font-weight: 600;
        font-size: 15px;
        color: var(--text-primary, #ececf0);
      }
    }

    .content-area {
      flex: 1;
      overflow-y: auto;
    }
  `],
})
export class ManagerShellComponent {
  private readonly truckService = inject(TruckService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  readonly loadingTruck = signal(true);
  readonly togglingOpen = signal(false);
  readonly truck = signal<Truck | null>(null);
  readonly sidenavOpen = signal(false);
  readonly isMobile = signal(window.innerWidth < 768);

  readonly navItems: NavItem[] = [
    { label: 'Tableau de bord', icon: 'dashboard',   route: '/manager/dashboard'  },
    { label: 'Mon Truck',       icon: 'settings',    route: '/manager/settings'   },
    { label: 'Menu',            icon: 'restaurant_menu', route: '/manager/menu'   },
    { label: 'Commandes',       icon: 'receipt_long', route: '/manager/orders'    },
    { label: 'Localisation',    icon: 'location_on',  route: '/manager/location'  },
  ];

  readonly pageTitles: Record<string, string> = {
    '/manager/dashboard': 'Tableau de bord',
    '/manager/settings':  'Mon Truck',
    '/manager/menu':      'Menu',
    '/manager/orders':    'Commandes',
    '/manager/location':  'Localisation',
  };

  private readonly routerEvents = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
  );

  readonly currentPageTitle = computed(() => {
    this.routerEvents(); // track changes
    const url = this.router.url.split('?')[0];
    return this.pageTitles[url] ?? 'Admin';
  });

  readonly userInitial = computed(() => {
    const email = this.auth.user()?.['email'] as string | undefined;
    return email ? email[0].toUpperCase() : '?';
  });

  constructor() {
    this.loadTruck();
    window.addEventListener('resize', () => {
      this.isMobile.set(window.innerWidth < 768);
    });
  }

  private async loadTruck(): Promise<void> {
    this.loadingTruck.set(true);
    try {
      const truck = await firstValueFrom(this.truckService.getMyTruck());
      this.truck.set(truck as Truck);
    } catch {
      // no truck yet
    } finally {
      this.loadingTruck.set(false);
    }
  }

  async toggleOpen(): Promise<void> {
    const truck = this.truck();
    if (!truck) return;
    this.togglingOpen.set(true);
    try {
      const updated = await firstValueFrom(this.truckService.toggleOpen(truck.id, !truck.isOpen));
      this.truck.set(updated);
      this.snackBar.open(
        updated.isOpen ? '🟢 Truck ouvert' : '🔴 Truck fermé',
        'OK', { duration: 2500 }
      );
    } catch {
      this.snackBar.open('Erreur lors de la mise à jour du statut', 'Fermer', { duration: 3000 });
    } finally {
      this.togglingOpen.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
