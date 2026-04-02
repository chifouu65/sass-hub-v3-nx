import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { firstValueFrom } from 'rxjs';
import { TruckService } from '../../core/services/truck.service';
import { MenuService, MenuItem } from '../../core/services/menu.service';
import { FollowerService } from '../../core/services/follower.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';

interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-truck-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
  ],
  template: `
    <div class="profile-page">

      <!-- ════ LOADING SKELETON ════ -->
      <ng-container *ngIf="loading()">
        <div class="hero-skeleton skeleton"></div>
        <div class="info-skeleton">
          <div class="sk-line sk-title skeleton"></div>
          <div class="sk-line sk-sub skeleton"></div>
          <div class="sk-line sk-sub2 skeleton"></div>
        </div>
      </ng-container>

      <!-- ════ HERO ════ -->
      <div class="hero" *ngIf="!loading()">
        <!-- Background image or gradient placeholder -->
        <div class="hero-bg">
          <img *ngIf="truck()?.imageUrl" [src]="truck()!.imageUrl" [alt]="truck()!.name" />
          <div *ngIf="!truck()?.imageUrl" class="hero-placeholder">
            <span class="hero-emoji">🚚</span>
          </div>
        </div>

        <!-- Gradient overlay -->
        <div class="hero-gradient"></div>

        <!-- Back pill -->
        <button class="back-pill" (click)="goBack()" type="button">
          <mat-icon>arrow_back</mat-icon>
          Retour
        </button>

        <!-- Hero content -->
        <div class="hero-content" *ngIf="truck()">
          <div class="hero-badges-row">
            <span *ngIf="truck()!.cuisineType" class="hbadge cuisine">{{ truck()!.cuisineType }}</span>
            <span class="hbadge status" [class.open]="truck()!.isOpen">
              <span class="dot"></span>
              {{ truck()!.isOpen ? 'Ouvert' : 'Fermé' }}
            </span>
          </div>
          <h1 class="hero-title">{{ truck()!.name }}</h1>
          <div class="hero-meta" *ngIf="truck()!.rating || truck()!.address">
            <span *ngIf="truck()!.rating" class="hero-rating">
              <mat-icon>star</mat-icon>{{ truck()!.rating }}
            </span>
            <span *ngIf="truck()!.address" class="hero-addr">
              <mat-icon>location_on</mat-icon>{{ truck()!.address }}
            </span>
          </div>
        </div>
      </div>

      <!-- ════ MAIN CONTENT ════ -->
      <ng-container *ngIf="truck() && !loading()">

        <!-- Info bar -->
        <div class="info-bar">
          <div class="info-bar-inner">
            <p *ngIf="truck()!.description" class="truck-desc">{{ truck()!.description }}</p>
            <button
              *ngIf="auth.isAuthenticated() && !auth.isManager()"
              class="follow-btn"
              [class.following]="isFollowing()"
              (click)="toggleFollow()"
              type="button"
            >
              <mat-icon>{{ isFollowing() ? 'notifications_off' : 'notifications_active' }}</mat-icon>
              {{ isFollowing() ? 'Ne plus suivre' : 'Suivre' }}
            </button>
          </div>
        </div>

        <!-- Body layout -->
        <div class="body-layout">

          <!-- ── Menu panel ── -->
          <div class="menu-panel">
            <div class="section-head">
              <mat-icon>restaurant_menu</mat-icon>
              <h2>Menu</h2>
            </div>

            <div *ngIf="!menu()" class="menu-empty">
              <div class="menu-empty-icon"><mat-icon>lunch_dining</mat-icon></div>
              <p>Menu non disponible pour l'instant.</p>
            </div>

            <div *ngIf="menu()">
              <div *ngFor="let category of menu()!.categories; let first = first" class="menu-category" [class.first]="first">
                <h3 class="category-name">{{ category.name }}</h3>
                <div class="menu-items-list">
                  <div
                    *ngFor="let item of category.items"
                    class="menu-item"
                    [class.unavailable]="!item.available"
                  >
                    <div class="item-left">
                      <div class="item-header">
                        <span class="item-name">{{ item.name }}</span>
                        <span *ngIf="!item.available" class="unavail-tag">Indisponible</span>
                      </div>
                      <p *ngIf="item.description" class="item-desc">{{ item.description }}</p>
                    </div>
                    <div class="item-right">
                      <span class="item-price">{{ item.price | currency:'EUR':'symbol':'1.2-2' }}</span>
                      <button
                        *ngIf="auth.isAuthenticated() && !auth.isManager()"
                        class="add-btn"
                        [class.in-cart]="cartQty(item.id) > 0"
                        (click)="addToCart(item)"
                        [disabled]="!item.available"
                        type="button"
                      >
                        <mat-icon>{{ cartQty(item.id) > 0 ? 'add' : 'add' }}</mat-icon>
                        <span *ngIf="cartQty(item.id) > 0" class="cart-qty-badge">{{ cartQty(item.id) }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Cart panel ── -->
          <aside class="cart-panel" *ngIf="auth.isAuthenticated() && !auth.isManager()">
            <div class="cart-card">
              <div class="cart-header">
                <mat-icon>shopping_bag</mat-icon>
                <span class="cart-title">Votre commande</span>
                <span *ngIf="cartItems().length > 0" class="cart-count">{{ cartItems().length }}</span>
              </div>

              <!-- Empty cart -->
              <div *ngIf="cartItems().length === 0" class="cart-empty">
                <div class="cart-empty-icon"><mat-icon>shopping_cart</mat-icon></div>
                <p>Votre panier est vide</p>
                <span>Ajoutez des articles depuis le menu</span>
              </div>

              <!-- Cart items -->
              <div *ngIf="cartItems().length > 0" class="cart-body">
                <div class="cart-items-list">
                  <div *ngFor="let item of cartItems()" class="ci">
                    <span class="ci-name">{{ item.name }}</span>
                    <div class="ci-controls">
                      <button class="ci-btn" (click)="decrementQuantity(item.menuItemId)" type="button">
                        <mat-icon>remove</mat-icon>
                      </button>
                      <span class="ci-qty">{{ item.quantity }}</span>
                      <button class="ci-btn" (click)="incrementQuantity(item.menuItemId)" type="button">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                    <span class="ci-price">{{ item.unitPrice * item.quantity | currency:'EUR':'symbol':'1.2-2' }}</span>
                    <button class="ci-del" (click)="removeFromCart(item.menuItemId)" type="button">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- Note -->
                <mat-form-field appearance="outline" class="note-field">
                  <mat-label>Note spéciale</mat-label>
                  <textarea matInput [ngModel]="orderNote()" (ngModelChange)="orderNote.set($event)" placeholder="Allergies, préférences…" rows="2"></textarea>
                  <mat-icon matPrefix>edit_note</mat-icon>
                </mat-form-field>

                <!-- Total row -->
                <div class="total-row">
                  <span class="total-label">Total</span>
                  <span class="total-value">{{ subtotal() | currency:'EUR':'symbol':'1.2-2' }}</span>
                </div>

                <!-- Submit -->
                <button
                  class="order-btn"
                  (click)="submitOrder()"
                  [disabled]="submitting()"
                  type="button"
                >
                  <mat-spinner *ngIf="submitting()" diameter="18"></mat-spinner>
                  <ng-container *ngIf="!submitting()">
                    <mat-icon>bolt</mat-icon>
                    Commander · {{ subtotal() | currency:'EUR':'symbol':'1.2-2' }}
                  </ng-container>
                </button>
              </div>
            </div>
          </aside>

        </div>
      </ng-container>

    </div>
  `,
  styles: [`
    /* ─── Base ─── */
    :host { display: block; background: #080810; }

    .profile-page {
      min-height: 100vh;
      background: #080810;
      animation: pageIn 350ms ease both;
    }

    @keyframes pageIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ─── Skeleton loading ─── */
    @keyframes shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }

    .skeleton {
      background: linear-gradient(90deg, #1a1a28 25%, #24243a 50%, #1a1a28 75%);
      background-size: 600px 100%;
      animation: shimmer 1.6s infinite linear;
    }

    .hero-skeleton {
      height: 340px;
      width: 100%;
    }

    .info-skeleton {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 700px;
    }

    .sk-line {
      border-radius: 6px;
      &.sk-title  { height: 28px; width: 40%; }
      &.sk-sub    { height: 14px; width: 70%; }
      &.sk-sub2   { height: 14px; width: 50%; }
    }

    /* ─── Hero ─── */
    .hero {
      position: relative;
      height: 340px;
      overflow: hidden;
      background: #16161f;
    }

    .hero-bg {
      position: absolute;
      inset: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: scale(1.02);
        transition: transform 6s ease;
      }
    }

    .hero-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(ellipse 70% 60% at 50% 50%, rgba(249,115,22,0.12) 0%, transparent 70%),
                  linear-gradient(180deg, #12121e 0%, #0e0e18 100%);
    }

    .hero-emoji { font-size: 80px; line-height: 1; opacity: 0.5; }

    .hero-gradient {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(8,8,16,0.15) 0%,
        rgba(8,8,16,0.4) 40%,
        rgba(8,8,16,0.85) 100%
      );
      pointer-events: none;
    }

    /* Back pill */
    .back-pill {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px 7px 10px;
      border-radius: 100px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(8,8,16,0.65);
      backdrop-filter: blur(10px);
      color: #ececf0;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      transition: background 150ms, border-color 150ms;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: rgba(8,8,16,0.85); border-color: rgba(255,255,255,0.25); }
    }

    /* Hero content */
    .hero-content {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 24px 28px;
    }

    .hero-badges-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }

    .hbadge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 700;
      backdrop-filter: blur(8px);

      &.cuisine {
        background: rgba(245,158,11,0.18);
        border: 1px solid rgba(245,158,11,0.35);
        color: #fbbf24;
      }

      &.status {
        background: rgba(14,14,24,0.7);
        border: 1px solid rgba(255,255,255,0.12);
        color: #9ca3af;

        .dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #4b5563;
          flex-shrink: 0;
        }

        &.open {
          color: #4ade80;
          border-color: rgba(34,197,94,0.35);
          .dot { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
        }
      }
    }

    .hero-title {
      margin: 0 0 10px;
      font-size: clamp(24px, 4vw, 38px);
      font-weight: 800;
      color: #ececf0;
      letter-spacing: -0.5px;
      line-height: 1.15;
      text-shadow: 0 2px 12px rgba(0,0,0,0.5);
    }

    .hero-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .hero-rating, .hero-addr {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      font-weight: 500;
      color: rgba(236,236,240,0.7);
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
    }

    .hero-rating { color: #fbbf24; mat-icon { color: #fbbf24; } }

    /* ─── Info bar ─── */
    .info-bar {
      background: #0c0c16;
      border-bottom: 1px solid #1a1a28;
      padding: 16px 28px;
    }

    .info-bar-inner {
      max-width: 1160px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .truck-desc {
      margin: 0;
      font-size: 14px;
      color: #8b8ba0;
      line-height: 1.6;
      flex: 1;
      max-width: 680px;
    }

    .follow-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 9px 18px;
      border-radius: 10px;
      border: 1px solid rgba(249,115,22,0.35);
      background: rgba(249,115,22,0.08);
      color: #fb923c;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
      transition: all 150ms;

      mat-icon { font-size: 17px; width: 17px; height: 17px; }

      &:hover {
        background: rgba(249,115,22,0.15);
        border-color: rgba(249,115,22,0.55);
      }

      &.following {
        border-color: rgba(239,68,68,0.3);
        background: rgba(239,68,68,0.08);
        color: #f87171;
        &:hover { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.5); }
      }
    }

    /* ─── Body layout ─── */
    .body-layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 28px;
      max-width: 1160px;
      margin: 0 auto;
      padding: 28px 20px 80px;
      align-items: start;
    }

    /* ─── Menu panel ─── */
    .section-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #1a1a28;

      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #fb923c; }

      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #ececf0;
      }
    }

    .menu-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 48px 24px;
      color: #5c5c70;
      font-size: 14px;
    }

    .menu-empty-icon {
      width: 56px; height: 56px;
      border-radius: 14px;
      background: rgba(249,115,22,0.07);
      border: 1px solid rgba(249,115,22,0.12);
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 26px; width: 26px; height: 26px; color: #fb923c; }
    }

    .menu-category {
      margin-bottom: 28px;
      &:not(.first) { padding-top: 4px; }
    }

    .category-name {
      margin: 0 0 12px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #5c5c70;
    }

    .menu-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
      background: #111118;
      border: 1px solid #1e1e2e;
      border-radius: 12px;
      transition: border-color 180ms, box-shadow 180ms;

      &:hover:not(.unavailable) {
        border-color: rgba(249,115,22,0.25);
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      }

      &.unavailable { opacity: 0.5; }
    }

    .item-left { flex: 1; min-width: 0; }

    .item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 4px;
    }

    .item-name {
      font-size: 15px;
      font-weight: 600;
      color: #ececf0;
    }

    .unavail-tag {
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.2);
      color: #f87171;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
    }

    .item-desc {
      margin: 0;
      font-size: 12px;
      color: #5c5c70;
      line-height: 1.5;
    }

    .item-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .item-price {
      font-size: 15px;
      font-weight: 700;
      color: #f97316;
      white-space: nowrap;
    }

    .add-btn {
      position: relative;
      width: 36px; height: 36px;
      border-radius: 10px;
      border: 1px solid rgba(249,115,22,0.35);
      background: rgba(249,115,22,0.1);
      color: #fb923c;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 150ms;
      flex-shrink: 0;

      mat-icon { font-size: 20px; width: 20px; height: 20px; }

      &:hover:not(:disabled) {
        background: rgba(249,115,22,0.2);
        border-color: rgba(249,115,22,0.6);
        transform: scale(1.08);
      }

      &:disabled { opacity: 0.4; cursor: not-allowed; }

      &.in-cart {
        background: rgba(249,115,22,0.18);
        border-color: rgba(249,115,22,0.5);
      }
    }

    .cart-qty-badge {
      position: absolute;
      top: -6px; right: -6px;
      width: 16px; height: 16px;
      background: #f97316;
      color: white;
      font-size: 10px;
      font-weight: 700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ─── Cart panel ─── */
    .cart-panel {
      position: sticky;
      top: 72px;
      height: fit-content;
    }

    .cart-card {
      background: #0f0f1a;
      border: 1px solid #1e1e2e;
      border-radius: 16px;
      overflow: hidden;
    }

    .cart-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      border-bottom: 1px solid #1a1a28;

      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #fb923c; }
    }

    .cart-title {
      flex: 1;
      font-size: 15px;
      font-weight: 700;
      color: #ececf0;
    }

    .cart-count {
      background: #f97316;
      color: white;
      font-size: 11px;
      font-weight: 700;
      width: 20px; height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cart-empty {
      padding: 36px 24px;
      text-align: center;
      color: #5c5c70;

      p { margin: 10px 0 4px; font-size: 14px; font-weight: 600; color: #8b8ba0; }
      span { font-size: 12px; }
    }

    .cart-empty-icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid #1e1e2e;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 4px;
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
    }

    .cart-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .cart-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 260px;
      overflow-y: auto;

      &::-webkit-scrollbar { width: 4px; }
      &::-webkit-scrollbar-thumb { background: #2a2a3c; border-radius: 2px; }
    }

    .ci {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid #1e1e2e;
      border-radius: 8px;
      font-size: 13px;
    }

    .ci-name {
      font-weight: 500;
      color: #d4d4e0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ci-controls {
      display: flex;
      align-items: center;
      gap: 2px;
      background: rgba(255,255,255,0.04);
      border: 1px solid #27273a;
      border-radius: 6px;
    }

    .ci-btn {
      width: 26px; height: 26px;
      border: none;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8b8ba0;
      border-radius: 5px;
      transition: background 150ms, color 150ms;

      mat-icon { font-size: 15px; width: 15px; height: 15px; }
      &:hover { background: rgba(249,115,22,0.12); color: #fb923c; }
    }

    .ci-qty {
      padding: 0 6px;
      font-weight: 700;
      font-size: 13px;
      color: #ececf0;
      min-width: 20px;
      text-align: center;
    }

    .ci-price {
      font-weight: 700;
      font-size: 13px;
      color: #f97316;
      min-width: 48px;
      text-align: right;
    }

    .ci-del {
      width: 26px; height: 26px;
      border: none;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #3d3d55;
      border-radius: 5px;
      transition: background 150ms, color 150ms;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { background: rgba(239,68,68,0.1); color: #f87171; }
    }

    .note-field {
      width: 100%;
    }

    .total-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-top: 1px solid #1a1a28;
    }

    .total-label {
      font-size: 14px;
      font-weight: 600;
      color: #8b8ba0;
    }

    .total-value {
      font-size: 18px;
      font-weight: 800;
      color: #ececf0;
    }

    .order-btn {
      width: 100%;
      height: 48px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, #f97316 0%, #ea5f14 100%);
      color: white;
      font-size: 14px;
      font-weight: 700;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: opacity 150ms, transform 150ms;
      box-shadow: 0 4px 20px rgba(249,115,22,0.3);

      mat-icon { font-size: 20px; width: 20px; height: 20px; }

      &:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
      &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    }

    /* ─── Responsive ─── */
    @media (max-width: 960px) {
      .body-layout {
        grid-template-columns: 1fr;
        gap: 20px;
      }

      .cart-panel {
        position: static;
        order: -1;
      }
    }

    @media (max-width: 640px) {
      .hero { height: 260px; }

      .hero-content { padding: 16px 20px; }

      .info-bar { padding: 12px 20px; }
      .info-bar-inner { flex-direction: column; align-items: flex-start; gap: 12px; }
      .follow-btn { width: 100%; justify-content: center; }

      .body-layout { padding: 16px 12px 80px; gap: 16px; }
    }
  `],
})
export class TruckProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly truckService = inject(TruckService);
  private readonly menuService = inject(MenuService);
  private readonly followerService = inject(FollowerService);
  private readonly orderService = inject(OrderService);
  protected readonly auth = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly truckId = signal<string | null>(null);
  readonly truck = signal<any>(null);
  readonly menu = signal<any>(null);
  readonly loading = signal(false);
  readonly isFollowing = signal(false);
  readonly cart = signal<Map<string, CartItem>>(new Map());
  readonly orderNote = signal('');
  readonly submitting = signal(false);

  readonly cartItems = computed(() => Array.from(this.cart().values()));
  readonly subtotal = computed(() => {
    return this.cartItems().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  });

  /** Returns how many of a given menu item are currently in the cart */
  cartQty(menuItemId: string): number {
    return this.cart().get(menuItemId)?.quantity ?? 0;
  }

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.truckId.set(id);
        this.loadTruck(id);
        this.loadMenu(id);
        if (this.auth.isAuthenticated() && !this.auth.isManager()) {
          this.checkFollowing(id);
        }
      }
    });
  }

  private async loadTruck(id: string): Promise<void> {
    this.loading.set(true);
    try {
      const truck = await firstValueFrom(this.truckService.getTruck(id));
      this.truck.set(truck);
    } catch (e) {
      console.error('Failed to load truck', e);
      this.snackBar.open('Erreur lors du chargement du truck', 'Fermer', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  private async loadMenu(id: string): Promise<void> {
    try {
      const menu = await firstValueFrom(this.menuService.getMenu(id));
      this.menu.set(menu);
    } catch (e) {
      console.error('Failed to load menu', e);
    }
  }

  private async checkFollowing(id: string): Promise<void> {
    try {
      const result = await firstValueFrom(this.followerService.isFollowing(id));
      this.isFollowing.set(result.following);
    } catch {
      // Not following
    }
  }

  async toggleFollow(): Promise<void> {
    const id = this.truckId();
    if (!id) return;

    try {
      if (this.isFollowing()) {
        await firstValueFrom(this.followerService.unfollowTruck(id));
        this.isFollowing.set(false);
        this.snackBar.open('Ne suivez plus ce truck', 'Fermer', { duration: 2000 });
      } else {
        await firstValueFrom(this.followerService.followTruck(id));
        this.isFollowing.set(true);
        this.snackBar.open('Vous suivez maintenant ce truck', 'Fermer', { duration: 2000 });
      }
    } catch (e) {
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 2000 });
    }
  }

  addToCart(item: MenuItem): void {
    const cart = this.cart();
    const existing = cart.get(item.id);

    if (existing) {
      existing.quantity++;
    } else {
      cart.set(item.id, {
        menuItemId: item.id,
        quantity: 1,
        unitPrice: item.price,
        name: item.name,
      });
    }
    this.cart.set(new Map(cart));
  }

  incrementQuantity(itemId: string): void {
    const cart = this.cart();
    const item = cart.get(itemId);
    if (item) {
      item.quantity++;
      this.cart.set(new Map(cart));
    }
  }

  decrementQuantity(itemId: string): void {
    const cart = this.cart();
    const item = cart.get(itemId);
    if (item) {
      if (item.quantity > 1) {
        item.quantity--;
        this.cart.set(new Map(cart));
      } else {
        this.removeFromCart(itemId);
      }
    }
  }

  removeFromCart(itemId: string): void {
    const cart = this.cart();
    cart.delete(itemId);
    this.cart.set(new Map(cart));
  }

  async submitOrder(): Promise<void> {
    const truckId = this.truckId();
    if (!truckId || this.cartItems().length === 0) return;

    this.submitting.set(true);
    try {
      const order = await firstValueFrom(
        this.orderService.createOrder({
          truckId,
          items: this.cartItems().map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          note: this.orderNote() || undefined,
        })
      );
      this.cart.set(new Map());
      this.orderNote.set('');
      this.router.navigateByUrl(`/my/orders/${order.id}`);
    } catch (e) {
      console.error('Failed to create order', e);
      this.snackBar.open('Erreur lors de la création de la commande', 'Fermer', { duration: 3000 });
    } finally {
      this.submitting.set(false);
    }
  }

  goBack(): void {
    this.router.navigateByUrl('/discover');
  }
}
