import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">

      <div class="card">

        <!-- Header -->
        <div class="card-header">
          <a routerLink="/welcome" class="back-link">
            <mat-icon>arrow_back</mat-icon>
            Retour
          </a>
          <div class="icon-wrap">
            <mat-icon>storefront</mat-icon>
          </div>
          <h1>Créer mon compte client</h1>
          <p>Rejoignez MyFoodTruck pour commander chez vos food trucks préférés.</p>
        </div>

        <!-- Error -->
        <div *ngIf="auth.error()" class="error-banner">
          <mat-icon>error_outline</mat-icon>
          <span>{{ auth.error() }}</span>
        </div>

        <!-- Form -->
        <form (ngSubmit)="submit()" #form="ngForm" class="form" novalidate>

          <div class="field">
            <label for="email">Adresse e-mail</label>
            <input
              id="email"
              type="email"
              name="email"
              [(ngModel)]="email"
              required
              email
              placeholder="vous@exemple.com"
              [disabled]="auth.loading()"
              autocomplete="email"
            />
          </div>

          <div class="field">
            <label for="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              name="password"
              [(ngModel)]="password"
              required
              minlength="8"
              placeholder="8 caractères minimum"
              [disabled]="auth.loading()"
              autocomplete="new-password"
            />
          </div>

          <div class="field">
            <label for="confirm">Confirmer le mot de passe</label>
            <input
              id="confirm"
              type="password"
              name="confirm"
              [(ngModel)]="confirm"
              required
              placeholder="Répétez votre mot de passe"
              [disabled]="auth.loading()"
              autocomplete="new-password"
            />
            <span *ngIf="confirm && password !== confirm" class="field-error">
              Les mots de passe ne correspondent pas.
            </span>
          </div>

          <button
            type="submit"
            class="btn-submit"
            [disabled]="auth.loading() || !form.valid || password !== confirm"
          >
            <mat-spinner *ngIf="auth.loading()" diameter="18"></mat-spinner>
            <mat-icon *ngIf="!auth.loading()">person_add</mat-icon>
            {{ auth.loading() ? 'Création en cours…' : 'Créer mon compte' }}
          </button>

        </form>

      </div>

    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      background: #0a0a0f;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }

    .card {
      background: #111118;
      border: 1px solid #27273a;
      border-radius: 16px;
      padding: 40px 36px;
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #8b8ba0;
      text-decoration: none;
      align-self: flex-start;
      transition: color 150ms;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }

      &:hover { color: #ececf0; }
    }

    .icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: rgba(249, 115, 22, 0.12);
      border: 1px solid rgba(249, 115, 22, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;

      mat-icon { font-size: 26px; width: 26px; height: 26px; color: #fb923c; }
    }

    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #ececf0;
      margin: 0;
    }

    p {
      font-size: 14px;
      color: #8b8ba0;
      margin: 0;
      line-height: 1.5;
    }

    /* Error banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 13px;
      color: #f87171;

      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    }

    /* Form */
    .form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label {
      font-size: 13px;
      font-weight: 500;
      color: #ececf0;
    }

    input {
      background: #0a0a0f;
      border: 1px solid #27273a;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 14px;
      color: #ececf0;
      outline: none;
      transition: border-color 150ms;
      font-family: inherit;

      &::placeholder { color: #5c5c70; }
      &:focus { border-color: #fb923c; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .field-error {
      font-size: 12px;
      color: #f87171;
    }

    .btn-submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      border: none;
      background: #fb923c;
      color: #0a0a0f;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: background 150ms;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }

      &:hover:not(:disabled) { background: #f97316; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  `],
})
export class RegisterComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  confirm = '';

  async submit(): Promise<void> {
    if (this.password !== this.confirm) return;
    await this.auth.register(this.email, this.password);
    if (!this.auth.error()) {
      this.router.navigate(['/discover']);
    }
  }
}
