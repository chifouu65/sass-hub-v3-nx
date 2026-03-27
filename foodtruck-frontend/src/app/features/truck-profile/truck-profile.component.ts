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
    <div class="profile-container">
      <button mat-icon-button (click)="goBack()" class="back-button">
        <mat-icon>arrow_back</mat-icon>
      </button>

      <div *ngIf="loading()" class="loading">
        <mat-spinner></mat-spinner>
      </div>

      <ng-container *ngIf="truck() && !loading()">
        <!-- Hero section -->
        <div class="hero-section">
          <div class="hero-image" *ngIf="truck()!.imageUrl">
            <img [src]="truck()!.imageUrl" [alt]="truck()!.name" />
          </div>
          <div class="hero-overlay">
            <h1>{{ truck()!.name }}</h1>
            <div class="hero-badges">
              <span class="cuisine-badge">{{ truck()!.cuisineType }}</span>
              <span class="status-badge" [class.open]="truck()!.isOpen" [class.closed]="!truck()!.isOpen">
                {{ truck()!.isOpen ? '● Ouvert' : '● Fermé' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Truck info and follow button -->
        <div class="truck-info-section">
          <div class="truck-details">
            <p *ngIf="truck()!.description" class="description">{{ truck()!.description }}</p>
            <p *ngIf="truck()!.address" class="address">
              <mat-icon>location_on</mat-icon>
              {{ truck()!.address }}
            </p>
            <p *ngIf="truck()!.rating" class="rating">
              <span class="stars">★★★★★</span> {{ truck()!.rating }}
            </p>
          </div>
          <button
            *ngIf="auth.isAuthenticated() && !auth.isManager()"
            mat-raised-button
            [color]="isFollowing() ? 'warn' : 'primary'"
            (click)="toggleFollow()"
            class="follow-button"
          >
            {{ isFollowing() ? 'Ne plus suivre' : 'Suivre' }}
          </button>
        </div>

        <!-- Menu and order cart -->
        <div class="content-layout">
          <!-- Menu section -->
          <div class="menu-section">
            <h2>Menu</h2>
            <mat-accordion *ngIf="menu()">
              <mat-expansion-panel *ngFor="let category of menu()!.categories">
                <mat-expansion-panel-header>
                  <mat-panel-title>{{ category.name }}</mat-panel-title>
                </mat-expansion-panel-header>

                <div class="menu-items">
                  <div *ngFor="let item of category.items" class="menu-item" [class.unavailable]="!item.available">
                    <div class="item-info">
                      <h4>{{ item.name }} <span *ngIf="!item.available" class="unavailable-badge">Indisponible</span></h4>
                      <p *ngIf="item.description" class="item-description">{{ item.description }}</p>
                      <span class="price">{{ item.price | currency }}</span>
                    </div>
                    <button
                      *ngIf="auth.isAuthenticated() && !auth.isManager()"
                      mat-raised-button
                      color="accent"
                      (click)="addToCart(item)"
                      [disabled]="!item.available"
                      class="order-button"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              </mat-expansion-panel>
            </mat-accordion>
          </div>

          <!-- Order cart panel -->
          <div class="order-panel" *ngIf="auth.isAuthenticated() && !auth.isManager()">
            <mat-card class="cart-card">
              <mat-card-header>
                <mat-card-title>Votre commande</mat-card-title>
              </mat-card-header>

              <mat-card-content *ngIf="cartItems().length > 0; else emptyCart">
                <div class="cart-items">
                  <div *ngFor="let item of cartItems()" class="cart-item">
                    <div class="item-name">{{ item.name }}</div>
                    <div class="item-controls">
                      <button mat-icon-button (click)="decrementQuantity(item.menuItemId)" class="control-btn">
                        <mat-icon>remove</mat-icon>
                      </button>
                      <span class="quantity">{{ item.quantity }}</span>
                      <button mat-icon-button (click)="incrementQuantity(item.menuItemId)" class="control-btn">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                    <div class="item-price">{{ item.unitPrice * item.quantity | currency }}</div>
                    <button mat-icon-button (click)="removeFromCart(item.menuItemId)" class="delete-btn">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>

                <mat-divider style="margin: 16px 0;"></mat-divider>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Note spéciale</mat-label>
                  <textarea matInput [(ngModel)]="orderNote" placeholder="Allergies, préférences..." rows="3"></textarea>
                </mat-form-field>

                <div class="cart-summary">
                  <div class="summary-row">
                    <span class="summary-label">Sous-total:</span>
                    <span class="summary-value">{{ subtotal() | currency }}</span>
                  </div>
                  <div class="summary-row total">
                    <span class="summary-label">Total:</span>
                    <span class="summary-value">{{ subtotal() | currency }}</span>
                  </div>
                </div>

                <button
                  mat-raised-button
                  color="primary"
                  (click)="submitOrder()"
                  class="full-width"
                  [disabled]="submitting()"
                >
                  <mat-spinner *ngIf="submitting()" diameter="20" class="spinner"></mat-spinner>
                  <span *ngIf="!submitting()">Passer la commande</span>
                </button>
              </mat-card-content>

              <ng-template #emptyCart>
                <mat-card-content>
                  <div class="empty-cart">
                    <mat-icon>shopping_cart</mat-icon>
                    <p>Aucun article dans votre panier</p>
                  </div>
                </mat-card-content>
              </ng-template>
            </mat-card>
          </div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 0;
      background: var(--bg-primary, #0a0a0f);
      min-height: 100vh;
    }

    .back-button {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 10;
      background: var(--bg-card, #16161f);
      box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.4));
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }

    .hero-section {
      position: relative;
      height: 300px;
      overflow: hidden;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .hero-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .hero-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
      color: white;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;

      h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 600;
      }
    }

    .hero-badges {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .cuisine-badge {
      background: var(--warning, #f59e0b);
      color: white;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge {
      background: var(--bg-secondary, #111118);
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;

      &.open {
        color: var(--success, #22c55e);
      }

      &.closed {
        color: var(--danger, #ef4444);
      }
    }

    .truck-info-section {
      padding: 24px;
      background: var(--bg-secondary, #111118);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .truck-details {
      flex: 1;

      .description {
        margin: 0 0 12px 0;
        color: var(--text-secondary, #8b8ba0);
        line-height: 1.6;
        font-size: 15px;
      }

      .address {
        margin: 0 0 12px 0;
        color: var(--text-secondary, #8b8ba0);
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 6px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          color: var(--warning, #f59e0b);
        }
      }

      .rating {
        margin: 0;
        color: var(--warning, #f59e0b);
        font-weight: 600;
        font-size: 14px;

        .stars {
          margin-right: 6px;
        }
      }
    }

    .follow-button {
      flex-shrink: 0;
    }

    .content-layout {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 24px;
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .menu-section {
      h2 {
        margin: 0 0 16px 0;
        color: var(--text-primary, #ececf0);
        font-size: 20px;
      }
    }

    .menu-items {
      padding: 16px 0;
    }

    .menu-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: var(--bg-card, #16161f);
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid var(--border, #27273a);
      transition: all 0.2s ease;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      &.unavailable {
        opacity: 0.6;
      }
    }

    .item-info {
      flex: 1;

      h4 {
        margin: 0 0 6px 0;
        color: var(--text-primary, #ececf0);
        font-size: 16px;
        display: flex;
        align-items: center;
        gap: 8px;

        .unavailable-badge {
          background: rgba(239, 68, 68, 0.18);
          color: var(--danger, #ef4444);
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-left: auto;
        }
      }

      .item-description {
        margin: 0 0 8px 0;
        color: var(--text-secondary, #8b8ba0);
        font-size: 13px;
        line-height: 1.4;
      }

      .price {
        font-weight: 600;
        color: var(--warning, #f59e0b);
        font-size: 15px;
      }
    }

    .order-button {
      flex-shrink: 0;
    }

    .order-panel {
      position: sticky;
      top: 24px;
      height: fit-content;
    }

    .cart-card {
      border: 2px solid var(--warning, #f59e0b);
      background: var(--bg-card, #16161f) !important;
    }

    mat-card-header {
      padding: 16px;
    }

    mat-card-content {
      padding: 16px;
    }

    .cart-items {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 300px;
      overflow-y: auto;
    }

    .cart-item {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: var(--bg-secondary, #111118);
      border-radius: 4px;
      border: 1px solid var(--border, #27273a);
      font-size: 13px;

      .item-name {
        font-weight: 500;
        color: var(--text-primary, #ececf0);
        word-break: break-word;
      }

      .item-controls {
        display: flex;
        align-items: center;
        gap: 4px;
        border: 1px solid var(--border, #27273a);
        border-radius: 4px;
        background: var(--bg-input, #1a1a25);

        .control-btn {
          width: 28px;
          height: 28px;
          min-width: 28px;

          mat-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
          }
        }

        .quantity {
          padding: 0 8px;
          font-weight: 600;
          color: var(--text-primary, #ececf0);
          min-width: 28px;
          text-align: center;
        }
      }

      .item-price {
        font-weight: 600;
        color: var(--warning, #f59e0b);
        text-align: right;
        min-width: 60px;
      }

      .delete-btn {
        width: 28px;
        height: 28px;
        min-width: 28px;
        color: var(--danger, #ef4444);

        mat-icon {
          font-size: 16px;
          width: 16px;
          height: 16px;
        }
      }
    }

    .empty-cart {
      text-align: center;
      padding: 24px;
      color: var(--text-muted, #5c5c70);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--border, #27273a);
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .full-width {
      width: 100%;
      margin: 16px 0;
    }

    .cart-summary {
      background: var(--bg-secondary, #111118);
      padding: 12px;
      border-radius: 4px;
      margin: 16px 0;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      margin: 6px 0;

      &.total {
        font-weight: 600;
        color: var(--warning, #f59e0b);
        font-size: 16px;
        margin-top: 12px;
      }

      .summary-label {
        color: var(--text-secondary, #8b8ba0);
      }

      .summary-value {
        color: var(--text-primary, #ececf0);
        font-weight: 500;
      }
    }

    button {
      margin-top: 12px;

      .spinner {
        display: inline-block;
        margin-right: 8px;
      }
    }

    @media (max-width: 900px) {
      .content-layout {
        grid-template-columns: 1fr;
      }

      .order-panel {
        position: static;
      }
    }

    @media (max-width: 600px) {
      .hero-overlay {
        padding: 16px;

        h1 {
          font-size: 24px;
        }
      }

      .truck-info-section {
        flex-direction: column;
      }

      .menu-item {
        flex-direction: column;

        .item-info h4 .unavailable-badge {
          margin-left: 0;
          margin-top: 4px;
        }
      }

      .order-button {
        width: 100%;
      }
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
