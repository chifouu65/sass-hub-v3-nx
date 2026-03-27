import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): { [key: string]: unknown } | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}

@Component({
  selector: 'app-register',
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
    MatIconModule,
  ],
  template: `
    <div class="register-container">
      <div class="register-wrapper">
        <h1>Rejoignez SaaS Hub</h1>

        <!-- Role selection cards -->
        <div class="role-selection" *ngIf="!roleSelected()">
          <div class="role-card" (click)="selectRole('customer')">
            <div class="role-icon">🛍️</div>
            <h3>Client</h3>
            <p>Découvrez et commandez auprès des meilleurs food trucks</p>
          </div>
          <div class="role-card" (click)="selectRole('manager')">
            <div class="role-icon">👨‍🍳</div>
            <h3>Gérant de Food Truck</h3>
            <p>Gérez votre food truck et vos commandes</p>
          </div>
        </div>

        <!-- Registration form -->
        <mat-card class="register-card" *ngIf="roleSelected()">
          <mat-card-header>
            <button mat-icon-button (click)="goBack()" class="back-btn">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <mat-card-title>{{ selectedRole() === 'manager' ? 'Créer un compte gérant' : 'Créer un compte client' }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" />
                <mat-error *ngIf="registerForm.get('email')?.hasError('required')">Email requis</mat-error>
                <mat-error *ngIf="registerForm.get('email')?.hasError('email')">Email invalide</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Mot de passe</mat-label>
                <input matInput type="password" formControlName="password" />
                <mat-error *ngIf="registerForm.get('password')?.hasError('required')">Mot de passe requis</mat-error>
                <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">Minimum 6 caractères</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirmer le mot de passe</mat-label>
                <input matInput type="password" formControlName="confirmPassword" />
                <mat-error *ngIf="registerForm.get('confirmPassword')?.hasError('required')">Confirmation requise</mat-error>
                <mat-error *ngIf="registerForm.hasError('passwordMismatch')">Les mots de passe ne correspondent pas</mat-error>
              </mat-form-field>

              <div class="error-message" *ngIf="auth.error()">
                <mat-icon>error</mat-icon>
                {{ auth.error() }}
              </div>

              <button
                mat-raised-button
                color="primary"
                type="submit"
                class="full-width"
                [disabled]="registerForm.invalid || auth.loading()"
              >
                <mat-spinner *ngIf="auth.loading()" diameter="20" class="spinner"></mat-spinner>
                <span *ngIf="!auth.loading()">S'inscrire</span>
              </button>
            </form>
          </mat-card-content>
          <mat-card-footer>
            <p>
              Vous avez déjà un compte?
              <a routerLink="/login">Connectez-vous</a>
            </p>
          </mat-card-footer>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .register-wrapper {
      width: 100%;
      max-width: 600px;
    }

    h1 {
      text-align: center;
      color: white;
      font-size: 32px;
      margin-bottom: 32px;
    }

    .role-selection {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }

    .role-card {
      background: var(--bg-card, #16161f);
      border-radius: 12px;
      padding: 32px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.4));

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
      }

      .role-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      h3 {
        margin: 16px 0 8px 0;
        color: var(--text-primary, #ececf0);
        font-size: 18px;
      }

      p {
        margin: 0;
        color: var(--text-secondary, #8b8ba0);
        font-size: 14px;
        line-height: 1.4;
      }
    }

    .register-card {
      width: 100%;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      background: var(--bg-card, #16161f) !important;
    }

    mat-card-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;

      .back-btn {
        margin-top: -8px;
      }

      mat-card-title {
        margin: 0;
        font-size: 20px;
      }
    }

    mat-card-content {
      padding: 24px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }

    .error-message {
      color: var(--danger, #ef4444);
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 4px;
      background: rgba(239, 68, 68, 0.18);
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    button {
      margin-top: 8px;
      height: 44px;
      font-size: 16px;
      font-weight: 500;

      &:disabled {
        opacity: 0.6;
      }
    }

    .spinner {
      display: inline-block;
      margin-right: 8px;
    }

    mat-card-footer {
      padding: 16px 24px;
      text-align: center;
      border-top: 1px solid var(--border, #27273a);
      margin-top: 0;

      p {
        margin: 0;
        color: var(--text-secondary, #8b8ba0);
        font-size: 14px;
      }

      a {
        color: var(--accent, #f97316);
        text-decoration: none;
        font-weight: 500;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    @media (max-width: 600px) {
      .role-selection {
        grid-template-columns: 1fr;
      }

      h1 {
        font-size: 24px;
      }
    }
  `],
})
export class RegisterComponent {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly selectedRole = signal<'customer' | 'manager' | null>(null);
  readonly roleSelected = signal(false);

  readonly registerForm = this.fb.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  selectRole(role: 'customer' | 'manager'): void {
    this.selectedRole.set(role);
    this.roleSelected.set(true);
    this.registerForm.reset();
  }

  goBack(): void {
    this.roleSelected.set(false);
    this.selectedRole.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) return;

    const { email, password } = this.registerForm.value;
    const role = this.selectedRole();
    if (!role) return;

    await this.auth.register(email!, password!, role);

    if (this.auth.isAuthenticated()) {
      const redirectUrl = role === 'manager' ? '/manager/onboarding' : '/discover';
      this.router.navigateByUrl(redirectUrl);
    }
  }
}
