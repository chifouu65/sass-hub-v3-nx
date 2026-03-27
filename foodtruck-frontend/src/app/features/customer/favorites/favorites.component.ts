import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { FollowerService } from '../../../core/services/follower.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="favorites-container">
      <h1>My Favorite Food Trucks</h1>

      <div *ngIf="loading()" class="loading">
        <mat-spinner></mat-spinner>
      </div>

      <div class="trucks-grid" *ngIf="trucks() && !loading()">
        <ng-container *ngIf="trucks()!.length > 0; else noFavorites">
          <mat-card *ngFor="let truck of trucks()!" class="truck-card">
            <mat-card-header>
              <mat-card-title>{{ truck.name }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div *ngIf="truck.imageUrl" class="truck-image">
                <img [src]="truck.imageUrl" [alt]="truck.name" />
              </div>
              <p class="cuisine">{{ truck.cuisineType }}</p>
              <p *ngIf="truck.rating" class="rating">★ {{ truck.rating }}</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" [routerLink]="['/truck', truck.id]">
                View Menu
              </button>
              <button
                mat-stroked-button
                color="warn"
                (click)="unfollow(truck.id)"
                [disabled]="unfollowingId() === truck.id"
              >
                Unfollow
              </button>
            </mat-card-actions>
          </mat-card>
        </ng-container>

        <ng-template #noFavorites>
          <div class="no-favorites">
            <p>You haven't followed any trucks yet.</p>
            <p>
              <a routerLink="/discover">Discover food trucks</a>
            </p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .favorites-container {
      padding: 24px;
    }

    h1 {
      margin-bottom: 32px;
      color: var(--text-primary, #ececf0);
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }

    .trucks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .truck-card {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-card, #16161f) !important;
    }

    .truck-image {
      height: 200px;
      margin: 0 -16px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .cuisine {
      margin: 16px 0 0 0;
      color: var(--text-secondary, #8b8ba0);
      font-style: italic;
    }

    .rating {
      margin: 8px 0 0 0;
      color: var(--warning, #f59e0b);
      font-weight: 500;
    }

    mat-card-actions {
      flex: 1;
      display: flex;
      gap: 8px;
      margin: 0;
      padding: 8px 0;
      flex-direction: column;
    }

    .no-favorites {
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted, #5c5c70);

      a {
        color: var(--accent, #f97316);
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  `],
})
export class FavoritesComponent {
  private readonly followerService = inject(FollowerService);
  private readonly snackBar = inject(MatSnackBar);

  readonly trucks = signal<any[] | null>(null);
  readonly loading = signal(false);
  readonly unfollowingId = signal<string | null>(null);

  constructor() {
    this.loadFavorites();
  }

  private async loadFavorites(): Promise<void> {
    this.loading.set(true);
    try {
      const trucks = await firstValueFrom(this.followerService.getFollowedTrucks());
      this.trucks.set(trucks);
    } catch (e) {
      console.error('Failed to load favorites', e);
      this.trucks.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async unfollow(truckId: string): Promise<void> {
    this.unfollowingId.set(truckId);
    try {
      await firstValueFrom(this.followerService.unfollowTruck(truckId));
      this.trucks.update(trucks => trucks?.filter(t => t.id !== truckId) || []);
      this.snackBar.open('Unfollowed truck', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Error unfollowing truck', 'Close', { duration: 2000 });
    } finally {
      this.unfollowingId.set(null);
    }
  }
}
