import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AppDetailDialogData {
  app: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    features: string[];
    plans: string[];
    category: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    url: string;
    comingSoon?: boolean;
  };
  isSubscribed: boolean;
}

/** Résultat renvoyé à la fermeture : 'subscribe' | 'unsubscribe' | null */
export type AppDetailDialogResult = 'subscribe' | 'unsubscribe' | null;

@Component({
  standalone: true,
  selector: 'app-detail-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-header">
      <div class="dialog-icon" [style.background]="data.app.iconBg" [style.color]="data.app.iconColor">
        <mat-icon>{{ data.app.icon }}</mat-icon>
      </div>
      <div class="dialog-title-block">
        <h2 mat-dialog-title>{{ data.app.name }}</h2>
        <p class="dialog-tagline">{{ data.app.tagline }}</p>
        <span class="dialog-category">{{ data.app.category }}</span>
      </div>
    </div>

    <mat-dialog-content>
      <p class="dialog-desc">{{ data.app.description }}</p>

      @if (data.app.features.length) {
        <h3 class="section-title">Fonctionnalités</h3>
        <ul class="features-list">
          @for (f of data.app.features; track f) {
            <li><mat-icon>check_circle</mat-icon> {{ f }}</li>
          }
        </ul>
      }

      <div class="plans-row">
        <span class="plans-label">Plans compatibles :</span>
        @for (plan of data.app.plans; track plan) {
          <span class="plan-chip">{{ plan }}</span>
        }
      </div>

      @if (data.app.comingSoon) {
        <div class="coming-soon-notice">
          <mat-icon>schedule</mat-icon>
          Cette application est en cours de développement et sera disponible prochainement.
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close(null)">Fermer</button>
      @if (!data.app.comingSoon) {
        @if (data.isSubscribed) {
          <button mat-stroked-button class="action-unsubscribe" (click)="close('unsubscribe')">
            <mat-icon>remove_circle_outline</mat-icon>
            Se désabonner
          </button>
        } @else {
          <button mat-flat-button class="action-subscribe" (click)="close('subscribe')">
            <mat-icon>add_circle_outline</mat-icon>
            S'abonner
          </button>
        }
      }
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; width: 500px; max-width: 100%; }

    .dialog-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 24px 24px 0;
    }

    .dialog-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .dialog-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .dialog-title-block { flex: 1; }

    h2[mat-dialog-title] {
      font-size: 1.2rem;
      font-weight: 700;
      margin: 0;
      padding: 0;
      line-height: 1.3;
    }

    .dialog-tagline {
      font-size: 0.85rem;
      color: #94a3b8;
      margin: 4px 0 8px;
    }

    .dialog-category {
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .dialog-desc {
      font-size: 0.9rem;
      color: #cbd5e1;
      line-height: 1.65;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 0.78rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0 0 10px;
    }

    .features-list {
      list-style: none;
      padding: 0;
      margin: 0 0 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .features-list li {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.88rem;
      color: #e2e8f0;
    }

    .features-list mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #22c55e;
      flex-shrink: 0;
    }

    .plans-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .plans-label {
      font-size: 0.8rem;
      color: #64748b;
    }

    .plan-chip {
      background: rgba(139, 92, 246, 0.12);
      color: #a78bfa;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .coming-soon-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 8px;
      padding: 12px 14px;
      margin-top: 16px;
      font-size: 0.85rem;
      color: #f59e0b;
    }

    .coming-soon-notice mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .action-subscribe {
      background: #7c3aed !important;
      color: #fff !important;
    }

    .action-unsubscribe {
      color: #ef4444 !important;
      border-color: rgba(239, 68, 68, 0.4) !important;
    }
  `],
})
export class AppDetailDialogComponent {
  readonly data = inject<AppDetailDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<AppDetailDialogComponent>);

  close(result: AppDetailDialogResult): void {
    this.dialogRef.close(result);
  }
}
