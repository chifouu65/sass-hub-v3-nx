import { Component, inject, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    RouterModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card" appearance="outlined">
        <mat-card-content>

          <!-- Header -->
          <div class="login-header">
            <div class="logo-icon">
              <mat-icon>lunch_dining</mat-icon>
            </div>
            <h1>MyFoodTruck</h1>
            <p class="login-subtitle">Connexion à ton compte</p>
          </div>

          <!-- Form -->
          <form (ngSubmit)="onLogin()" class="login-form">

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email"
                [ngModel]="email()" (ngModelChange)="email.set($event)"
                name="email" placeholder="ton@email.com" required />
              <mat-icon matPrefix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mot de passe</mat-label>
              <input matInput [type]="hidePassword() ? 'password' : 'text'"
                [ngModel]="password()" (ngModelChange)="password.set($event)"
                name="password" placeholder="Ton mot de passe" required />
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (auth.error()) {
              <div class="error-banner">
                <mat-icon>error_outline</mat-icon>
                <span>{{ auth.error() }}</span>
              </div>
            }

            <button mat-flat-button type="submit" class="submit-btn"
              [disabled]="auth.loading() || !email() || !password()">
              @if (auth.loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Se connecter
              }
            </button>

          </form>

          <p class="switch-hint">
            Pas encore de compte ?
            <a routerLink="/register" class="link-btn">Créer un compte</a>
          </p>

        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 56px);
    }

    .login-card {
      width: 100%;
      max-width: 440px;
      background: var(--bg-card) !important;
      border-color: var(--border) !important;
      border-radius: var(--radius-lg) !important;
    }

    .login-card mat-card-content {
      padding: 40px 32px !important;
    }

    .login-header {
      text-align: center;
      margin-bottom: 28px;
    }

    .logo-icon {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-md);
      background: var(--accent-muted);
      color: var(--accent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;

      mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
    }

    .login-header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .login-subtitle {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-top: 4px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .full-width {
      width: 100%;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--danger-muted);
      color: var(--danger);
      padding: 10px 14px;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      margin-bottom: 8px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .submit-btn {
      width: 100%;
      height: 44px;
      background: var(--accent) !important;
      color: white !important;
      font-weight: 600;
      font-size: 0.95rem;
      border-radius: var(--radius-sm) !important;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .switch-hint {
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-top: 20px;
    }

    .link-btn {
      color: var(--accent) !important;
      font-size: 0.85rem;
    }

    @media (max-width: 480px) {
      .login-card mat-card-content {
        padding: 28px 20px !important;
      }

      .login-container {
        align-items: flex-start;
        padding-top: 24px;
      }
    }
  `],
})
export class LoginComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly email        = signal('');
  readonly password     = signal('');
  readonly hidePassword = signal(true);

  async onLogin(): Promise<void> {
    await this.auth.login(this.email(), this.password());
    if (this.auth.isAuthenticated()) {
      await this.router.navigate(['/discover']);
    }
  }
}
