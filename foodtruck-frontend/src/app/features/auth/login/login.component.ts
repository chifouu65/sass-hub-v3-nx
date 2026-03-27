import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Login</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" />
            </mat-form-field>

            <mat-form-field appearance="fill" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" />
            </mat-form-field>

            <div class="error-message" *ngIf="auth.error()">
              {{ auth.error() }}
            </div>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width"
              [disabled]="loginForm.invalid || auth.loading()"
            >
              <mat-spinner *ngIf="auth.loading()" diameter="20"></mat-spinner>
              <span *ngIf="!auth.loading()">Login</span>
            </button>
          </form>
        </mat-card-content>
        <mat-card-footer>
          <p>
            Don't have an account?
            <a routerLink="/register">Register here</a>
          </p>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
      background: var(--bg-primary, #0a0a0f);
    }

    .login-card {
      width: 100%;
      max-width: 400px;
      background: var(--bg-card, #16161f) !important;
      border: 1px solid var(--border, #27273a);
      border-radius: var(--radius-lg, 16px) !important;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .error-message {
      color: var(--danger, #ef4444);
      margin-bottom: 16px;
      font-size: 14px;
    }

    mat-card-footer {
      padding: 16px;
      text-align: center;
      border-top: 1px solid var(--border, #27273a);
      margin-top: 16px;

      a {
        color: var(--accent, #f97316);
        text-decoration: none;

        &:hover {
          color: var(--accent-hover, #fb923c);
          text-decoration: underline;
        }
      }
    }

    button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `],
})
export class LoginComponent {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;
    await this.auth.loginWithPkce(email!, password!);

    if (this.auth.isAuthenticated()) {
      const redirectUrl = this.auth.isManager() ? '/manager/dashboard' : '/discover';
      this.router.navigateByUrl(redirectUrl);
    }
  }
}
