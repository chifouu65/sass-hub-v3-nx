import { Component, inject, computed, signal } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
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
    MatSidenavModule,
  ],
  template: `
    <!-- ═══════════════ TOP NAVBAR ═══════════════ -->
    <header class="app-bar" [class.admin-bar]="isAdminRoute()">

      <!-- Hamburger (mobile only, non-admin) -->
      <button *ngIf="!isAdminRoute()" class="hamburger" (click)="mobileMenuOpen.set(!mobileMenuOpen())" aria-label="Menu">
        <mat-icon>{{ mobileMenuOpen() ? 'close' : 'menu' }}</mat-icon>
      </button>

      <!-- Logo -->
      <a routerLink="/discover" class="logo">
        <mat-icon class="logo-icon">lunch_dining</mat-icon>
        <strong class="logo-text">MyFoodTruck</strong>
      </a>

      <!-- Desktop nav — customer -->
      <nav class="desktop-nav" *ngIf="!isAdminRoute()">
        <a routerLink="/discover" class="nav-link" routerLinkActive="nav-active"
           [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>explore</mat-icon><span>Découvrir</span>
        </a>
        <ng-container *ngIf="auth.isAuthenticated()">
          <a routerLink="/my/favorites" class="nav-link" routerLinkActive="nav-active">
            <mat-icon>favorite</mat-icon><span>Favoris</span>
          </a>
          <a routerLink="/my/orders" class="nav-link" routerLinkActive="nav-active">
            <mat-icon>receipt</mat-icon><span>Commandes</span>
          </a>
        </ng-container>
        <a *ngIf="auth.isManager()" routerLink="/manager/dashboard"
           class="nav-link admin-pill">
          <mat-icon>admin_panel_settings</mat-icon><span>Panel</span>
        </a>
      </nav>

      <!-- Admin breadcrumb -->
      <ng-container *ngIf="isAdminRoute()">
        <span class="admin-context-label">
          <mat-icon>admin_panel_settings</mat-icon>
          Panel gérant
        </span>
        <a routerLink="/discover" class="nav-link back-link">
          <mat-icon>arrow_back</mat-icon><span>Vue client</span>
        </a>
      </ng-container>

      <span class="spacer"></span>

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

      <!-- Avatar / account -->
      <button [matMenuTriggerFor]="accountMenu" class="avatar-btn">
        <span class="avatar-initials">{{ userInitial() }}</span>
      </button>
      <mat-menu #accountMenu="matMenu">
        <div *ngIf="auth.isAuthenticated()" class="menu-user-info" mat-menu-item disabled>
          <mat-icon>person</mat-icon>
          <div class="user-info-text">
            <div class="user-name">{{ displayName() }}</div>
            <div class="user-email">{{ auth.user()?.['email'] }}</div>
          </div>
        </div>
        <div *ngIf="auth.isManager()" class="menu-role-badge" mat-menu-item disabled>
          <mat-icon>verified</mat-icon><span>Gérant</span>
        </div>
        <mat-divider *ngIf="auth.isAuthenticated()"></mat-divider>
        <button mat-menu-item *ngIf="auth.isManager()" routerLink="/manager/dashboard">
          <mat-icon>dashboard</mat-icon> Mon panel
        </button>
        <button mat-menu-item *ngIf="auth.isAuthenticated()" (click)="logout()">
          <mat-icon>logout</mat-icon> Déconnexion
        </button>
        <button mat-menu-item *ngIf="!auth.isAuthenticated()" routerLink="/login">
          <mat-icon>login</mat-icon> Se connecter
        </button>
      </mat-menu>
    </header>

    <!-- ═══════════════ MOBILE SIDE DRAWER ═══════════════ -->
    <div class="mobile-overlay" *ngIf="mobileMenuOpen() && !isAdminRoute()"
         (click)="mobileMenuOpen.set(false)"></div>
    <aside class="mobile-drawer" [class.open]="mobileMenuOpen() && !isAdminRoute()">
      <div class="drawer-brand">
        <mat-icon>lunch_dining</mat-icon>
        <strong>MyFoodTruck</strong>
      </div>
      <nav class="drawer-nav">
        <a routerLink="/discover" class="drawer-link" routerLinkActive="drawer-active"
           (click)="mobileMenuOpen.set(false)" [routerLinkActiveOptions]="{ exact: true }">
          <mat-icon>explore</mat-icon><span>Découvrir</span>
        </a>
        <ng-container *ngIf="auth.isAuthenticated()">
          <a routerLink="/my/favorites" class="drawer-link" routerLinkActive="drawer-active"
             (click)="mobileMenuOpen.set(false)">
            <mat-icon>favorite</mat-icon><span>Favoris</span>
          </a>
          <a routerLink="/my/orders" class="drawer-link" routerLinkActive="drawer-active"
             (click)="mobileMenuOpen.set(false)">
            <mat-icon>receipt</mat-icon><span>Mes commandes</span>
          </a>
          <a *ngIf="auth.isManager()" routerLink="/manager/dashboard" class="drawer-link"
             (click)="mobileMenuOpen.set(false)">
            <mat-icon>admin_panel_settings</mat-icon><span>Panel gérant</span>
          </a>
          <div class="drawer-divider"></div>
          <button class="drawer-link drawer-logout" (click)="logout(); mobileMenuOpen.set(false)">
            <mat-icon>logout</mat-icon><span>Déconnexion</span>
          </button>
        </ng-container>
        <ng-container *ngIf="!auth.isAuthenticated()">
          <a routerLink="/login" class="drawer-link" (click)="mobileMenuOpen.set(false)">
            <mat-icon>login</mat-icon><span>Se connecter</span>
          </a>
          <a routerLink="/register" class="drawer-link" (click)="mobileMenuOpen.set(false)">
            <mat-icon>person_add</mat-icon><span>Créer un compte</span>
          </a>
        </ng-container>
      </nav>
    </aside>

    <!-- ═══════════════ PAGE CONTENT ═══════════════ -->
    <main class="app-content" [class.has-bottom-nav]="auth.isAuthenticated() && !isAdminRoute()">
      <router-outlet></router-outlet>
    </main>

    <!-- ═══════════════ MOBILE BOTTOM NAV (authenticated only) ═══════════════ -->
    <nav class="bottom-nav" *ngIf="auth.isAuthenticated() && !isAdminRoute()">
      <a routerLink="/discover" class="bottom-tab" routerLinkActive="bottom-active"
         [routerLinkActiveOptions]="{ exact: true }">
        <mat-icon>explore</mat-icon>
        <span>Découvrir</span>
      </a>
      <a routerLink="/my/favorites" class="bottom-tab" routerLinkActive="bottom-active">
        <mat-icon>favorite</mat-icon>
        <span>Favoris</span>
      </a>
      <a routerLink="/my/orders" class="bottom-tab" routerLinkActive="bottom-active">
        <mat-icon>receipt</mat-icon>
        <span>Commandes</span>
      </a>
      <button class="bottom-tab" [matMenuTriggerFor]="accountMenu2">
        <span class="bottom-avatar">{{ userInitial() }}</span>
        <span>Compte</span>
      </button>
    </nav>
    <mat-menu #accountMenu2="matMenu">
      <div class="menu-user-info" mat-menu-item disabled>
        <mat-icon>person</mat-icon>
        <div class="user-info-text">
          <div class="user-name">{{ displayName() }}</div>
          <div class="user-email">{{ auth.user()?.['email'] }}</div>
        </div>
      </div>
      <mat-divider></mat-divider>
      <button mat-menu-item *ngIf="auth.isManager()" routerLink="/manager/dashboard">
        <mat-icon>dashboard</mat-icon> Mon panel
      </button>
      <button mat-menu-item (click)="logout()">
        <mat-icon>logout</mat-icon> Déconnexion
      </button>
    </mat-menu>
  `,
  styles: [`
    /* ════════════════════════════════════════
       TOP BAR
    ════════════════════════════════════════ */
    .app-bar {
      position: sticky;
      top: 0;
      z-index: 200;
      height: 56px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 20px;
      background: rgba(11,11,18,0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .admin-bar { border-bottom-color: rgba(249,115,22,0.2); }

    /* Hamburger — mobile only */
    .hamburger {
      display: none;
      background: none;
      border: none;
      color: rgba(236,236,240,0.7);
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      margin-right: 4px;
      transition: all 150ms ease;
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
      &:hover { color: #ececf0; background: rgba(255,255,255,0.06); }
    }

    /* Logo */
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
      color: #fb923c;
      font-size: 17px;
      font-weight: 700;
      white-space: nowrap;
    }
    .logo-icon { font-size: 22px; width: 22px; height: 22px; }
    .logo-text { }

    .spacer { flex: 1; }

    /* Desktop nav */
    .desktop-nav {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: 16px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 0 10px;
      height: 34px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(236,236,240,0.65);
      text-decoration: none;
      transition: all 150ms ease;
      cursor: pointer;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { color: #ececf0; background: rgba(255,255,255,0.06); }
      &.nav-active { color: #ececf0; background: rgba(249,115,22,0.1); }
    }

    .admin-pill {
      color: #fb923c !important;
      background: rgba(249,115,22,0.08) !important;
      border: 1px solid rgba(249,115,22,0.2);
      margin-left: 6px;
      &:hover { background: rgba(249,115,22,0.15) !important; }
    }

    .admin-context-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #fb923c;
      padding: 4px 12px;
      background: rgba(249,115,22,0.08);
      border: 1px solid rgba(249,115,22,0.2);
      border-radius: 8px;
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
    }

    .back-link {
      margin-left: 8px;
      color: rgba(236,236,240,0.5) !important;
      font-size: 12px;
    }

    /* Icon buttons */
    .icon-btn {
      color: rgba(236,236,240,0.6);
      width: 36px;
      height: 36px;
      background: none;
      border: none;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;
      &:hover { background: rgba(255,255,255,0.06); }
    }

    .avatar-btn {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(249,115,22,0.15);
      border: 1.5px solid rgba(249,115,22,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 150ms ease;
      padding: 0;
      &:hover { background: rgba(249,115,22,0.22); border-color: rgba(249,115,22,0.5); }
    }
    .avatar-initials {
      font-size: 13px;
      font-weight: 700;
      color: #fb923c;
      line-height: 1;
    }

    /* Menu items */
    .menu-user-info {
      display: flex; align-items: center; gap: 10px;
      pointer-events: none; opacity: 1 !important;
    }
    .user-info-text {
      display: flex; flex-direction: column; gap: 2px;
    }
    .user-name {
      font-size: 13px; font-weight: 600; color: #ececf0;
    }
    .user-email {
      font-size: 11px; color: #8b8ba0;
    }
    .menu-role-badge {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; color: #fb923c;
      pointer-events: none; opacity: 1 !important;
      mat-icon { font-size: 14px; width: 14px; height: 14px; color: #fb923c; }
    }

    /* ════════════════════════════════════════
       MOBILE SIDE DRAWER
    ════════════════════════════════════════ */
    .mobile-overlay {
      position: fixed;
      inset: 0;
      z-index: 299;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(2px);
    }

    .mobile-drawer {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 280px;
      z-index: 300;
      background: #111118;
      border-right: 1px solid #27273a;
      transform: translateX(-100%);
      transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      padding: 0;

      &.open { transform: translateX(0); }
    }

    .drawer-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 20px 16px;
      color: #fb923c;
      font-size: 18px;
      font-weight: 700;
      border-bottom: 1px solid #27273a;
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
    }

    .drawer-nav {
      display: flex;
      flex-direction: column;
      padding: 12px 10px;
      gap: 2px;
      flex: 1;
    }

    .drawer-link {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 500;
      color: rgba(236,236,240,0.7);
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      width: 100%;
      transition: all 150ms ease;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover { color: #ececf0; background: rgba(255,255,255,0.06); }
      &.drawer-active { color: #fb923c; background: rgba(249,115,22,0.1); }
    }
    .drawer-logout { color: rgba(239,68,68,0.8); mat-icon { color: inherit; } }

    .drawer-divider {
      height: 1px;
      background: #27273a;
      margin: 8px 0;
    }

    /* ════════════════════════════════════════
       PAGE CONTENT
    ════════════════════════════════════════ */
    .app-content {
      min-height: calc(100vh - 56px);
    }

    /* ════════════════════════════════════════
       BOTTOM NAV
    ════════════════════════════════════════ */
    .bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 150;
      height: 64px;
      background: rgba(11,11,18,0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid rgba(255,255,255,0.05);
      align-items: stretch;
      justify-content: space-around;
    }

    .bottom-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      flex: 1;
      color: rgba(236,236,240,0.38);
      text-decoration: none;
      font-size: 10px;
      font-weight: 500;
      background: none;
      border: none;
      cursor: pointer;
      transition: color 150ms ease;
      padding: 6px 4px;
      position: relative;

      mat-icon { font-size: 22px; width: 22px; height: 22px; transition: transform 150ms ease; }

      &.bottom-active {
        color: #fb923c;
        mat-icon { transform: translateY(-1px); }
        &::after {
          content: '';
          position: absolute;
          bottom: 6px;
          width: 20px;
          height: 3px;
          background: #fb923c;
          border-radius: 2px;
          box-shadow: 0 0 8px rgba(249,115,22,0.6);
        }
      }

      &:not(.bottom-active):hover {
        color: rgba(236,236,240,0.65);
      }
    }

    .bottom-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(249,115,22,0.15);
      border: 1.5px solid rgba(249,115,22,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: #fb923c;
      line-height: 1;
      font-family: 'Inter', sans-serif;
    }

    /* ════════════════════════════════════════
       RESPONSIVE
    ════════════════════════════════════════ */
    @media (max-width: 767px) {
      .hamburger { display: flex; }
      .desktop-nav { display: none; }
      .logo-text { display: none; }
      .admin-context-label span { display: none; }

      .bottom-nav { display: flex; }
      .app-content.has-bottom-nav { padding-bottom: 64px; }
    }

    @media (min-width: 768px) {
      .mobile-drawer { display: none; }
      .mobile-overlay { display: none; }
    }
  `],
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  notificationCount = this.notificationService.unreadCount;
  hasNotifications  = this.notificationService.hasNotifications;

  readonly mobileMenuOpen = signal(false);

  private readonly navEnd = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
  );

  readonly isAdminRoute = computed(() => {
    this.navEnd();
    return this.router.url.startsWith('/manager');
  });

  readonly userInitial = computed(() => {
    const email = this.auth.user()?.['email'] as string | undefined;
    return email ? email[0].toUpperCase() : '?';
  });

  readonly displayName = computed(() => {
    const email = this.auth.user()?.['email'] as string | undefined;
    if (!email) return 'utilisateur';
    return email.split('@')[0];
  });

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/welcome']);
  }
}
