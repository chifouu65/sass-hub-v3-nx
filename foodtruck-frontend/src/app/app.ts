import { Component, inject, computed } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
  ],
  template: `
    <mat-toolbar class="app-toolbar">

      <!-- Logo -->
      <a routerLink="/discover" class="logo">
        <mat-icon class="logo-icon">lunch_dining</mat-icon>
        <strong>MyFoodTruck</strong>
      </a>

      <span class="spacer"></span>

      <!-- ── CUSTOMER NAV (hidden inside admin panel) ── -->
      <ng-container *ngIf="!isAdminRoute()">
        <a routerLink="/discover" mat-button class="nav-link" routerLinkActive="nav-active"
           [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>explore</mat-icon> Découvrir
        </a>

        <ng-container *ngIf="auth.isAuthenticated()">
          <a routerLink="/my/favorites" mat-button class="nav-link" routerLinkActive="nav-active">
            <mat-icon>favorite</mat-icon> Favoris
          </a>
          <a routerLink="/my/orders" mat-button class="nav-link" routerLinkActive="nav-active">
            <mat-icon>receipt</mat-icon> Mes commandes
          </a>
        </ng-container>

        <!-- Badge admin pour accéder au panel -->
        <a *ngIf="auth.isManager()" routerLink="/manager/dashboard"
           mat-button class="nav-link admin-pill">
          <mat-icon>admin_panel_settings</mat-icon> Panel admin
        </a>
      </ng-container>

      <!-- ── ADMIN CONTEXT NAV (inside /manager) ── -->
      <ng-container *ngIf="isAdminRoute()">
        <span class="admin-context-label">
          <mat-icon>admin_panel_settings</mat-icon>
          Panel gérant
        </span>
        <a routerLink="/discover" mat-button class="nav-link back-link">
          <mat-icon>arrow_back</mat-icon> Vue client
        </a>
      </ng-container>

      <!-- Notifications -->
      <button *ngIf="auth.isAuthenticated()"
        [matMenuTriggerFor]="notificationMenu"
        mat-icon-button
        [matBadge]="notificationCount() || null"
        matBadgeColor="warn"
        matBadgeSize="small"
        class="icon-btn">
        <mat-icon>notifications</mat-icon>
      </button>
      <mat-menu #notificationMenu="matMenu">
        <button mat-menu-item disabled *ngIf="!hasNotifications()">
          Aucune notification
        </button>
      </mat-menu>

      <!-- Compte -->
      <button [matMenuTriggerFor]="accountMenu" mat-icon-button class="icon-btn avatar-btn">
        <span class="avatar-initials">{{ userInitial() }}</span>
      </button>
      <mat-menu #accountMenu="matMenu">
        <div *ngIf="auth.isAuthenticated()" class="user-info" mat-menu-item disabled>
          <mat-icon>person</mat-icon>
          <span>{{ auth.user()?.['email'] }}</span>
        </div>
        <div *ngIf="auth.isManager()" class="user-role-badge" mat-menu-item disabled>
          <mat-icon>verified</mat-icon>
          <span>Gérant</span>
        </div>
        <mat-divider *ngIf="auth.isAuthenticated()"></mat-divider>
        <button mat-menu-item *ngIf="auth.isManager()" routerLink="/manager/dashboard">
          <mat-icon>dashboard</mat-icon> Mon panel
        </button>
        <button mat-menu-item *ngIf="auth.isAuthenticated()" (click)="logout()">
          <mat-icon>logout</mat-icon> Déconnexion
        </button>
      </mat-menu>
    </mat-toolbar>

    <main class="app-content">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .app-toolbar {
      gap: 4px;
      padding: 0 20px;
      position: sticky;
      top: 0;
      z-index: 100;
      background: #111118 !important;
      border-bottom: 1px solid #27273a;
      box-shadow: 0 1px 0 #27273a;
      height: 56px;
      min-height: 56px;
    }

    /* ── Logo ── */
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: #fb923c;
      font-size: 17px;
      font-weight: 700;
      margin-right: 16px;
      white-space: nowrap;
    }

    .logo-icon {
      font-size: 22px;
      width: 22px;
      height: 22px;
    }

    .spacer { flex: 1; }

    /* ── Nav links ── */
    .nav-link {
      color: rgba(236, 236, 240, 0.65) !important;
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      font-weight: 500;
      border-radius: 8px;
      padding: 0 10px;
      height: 34px;
      line-height: 34px;
      transition: all 150ms ease;

      mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }

      &:hover {
        color: #ececf0 !important;
        background: rgba(255,255,255,0.06) !important;
      }

      &.nav-active {
        color: #ececf0 !important;
        background: rgba(249, 115, 22, 0.1) !important;
      }
    }

    /* Panel admin entry pill */
    .admin-pill {
      color: #fb923c !important;
      background: rgba(249, 115, 22, 0.08) !important;
      border: 1px solid rgba(249, 115, 22, 0.2) !important;
      margin-left: 8px;

      mat-icon { color: #fb923c; }

      &:hover {
        background: rgba(249, 115, 22, 0.15) !important;
      }
    }

    /* Admin context */
    .admin-context-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #fb923c;
      letter-spacing: 0.3px;
      padding: 4px 12px;
      background: rgba(249, 115, 22, 0.08);
      border: 1px solid rgba(249, 115, 22, 0.2);
      border-radius: 8px;

      mat-icon { font-size: 15px; width: 15px; height: 15px; }
    }

    .back-link {
      margin-left: 8px;
      color: rgba(236, 236, 240, 0.5) !important;
      font-size: 12px;
    }

    /* ── Icons ── */
    .icon-btn {
      color: rgba(236, 236, 240, 0.6);
      width: 36px;
      height: 36px;
    }

    .avatar-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(249, 115, 22, 0.15);
      border: 1px solid rgba(249, 115, 22, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      overflow: hidden;
    }

    .avatar-initials {
      font-size: 13px;
      font-weight: 700;
      color: #fb923c;
      line-height: 1;
    }

    /* ── Menu items ── */
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #8b8ba0;
      pointer-events: none;
      opacity: 1 !important;
    }

    .user-role-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #fb923c;
      pointer-events: none;
      opacity: 1 !important;

      mat-icon { font-size: 14px; width: 14px; height: 14px; color: #fb923c; }
    }

    /* ── Content ── */
    .app-content {
      min-height: calc(100vh - 56px);
    }
  `],
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  notificationCount = this.notificationService.unreadCount;
  hasNotifications  = this.notificationService.hasNotifications;

  private readonly navEnd = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
  );

  readonly isAdminRoute = computed(() => {
    this.navEnd(); // track navigation
    return this.router.url.startsWith('/manager');
  });

  readonly userInitial = computed(() => {
    const email = this.auth.user()?.['email'] as string | undefined;
    return email ? email[0].toUpperCase() : '?';
  });

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/welcome']);
  }
}
