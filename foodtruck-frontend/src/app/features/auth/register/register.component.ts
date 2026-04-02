import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="auth-layout">

      <!-- ── Left panel (desktop only) ── -->
      <aside class="auth-panel">
        <div class="panel-inner">
          <div class="panel-logo">
            <mat-icon>lunch_dining</mat-icon>
          </div>
          <h2 class="panel-title">Rejoignez<br/><span>MyFoodTruck</span></h2>
          <p class="panel-sub">Créez votre compte gratuitement et commandez en quelques secondes.</p>

          <ul class="panel-features">
            <li>
              <div class="feat-icon"><mat-icon>bolt</mat-icon></div>
              <div>
                <strong>Inscription en 30 secondes</strong>
                <span>Juste un email et un mot de passe</span>
              </div>
            </li>
            <li>
              <div class="feat-icon"><mat-icon>favorite</mat-icon></div>
              <div>
                <strong>Sauvegardez vos favoris</strong>
                <span>Retrouvez vos trucks préférés</span>
              </div>
            </li>
            <li>
              <div class="feat-icon"><mat-icon>notifications_active</mat-icon></div>
              <div>
                <strong>Notifications en temps réel</strong>
                <span>Soyez alerté dès que votre commande est prête</span>
              </div>
            </li>
          </ul>
        </div>
      </aside>

      <!-- ── Right panel (form) ── -->
      <main class="auth-form-side">
        <div class="form-wrapper">

          <div class="form-header">
            <div class="form-logo">
              <mat-icon>lunch_dining</mat-icon>
            </div>
            <h1>Créer un compte</h1>
            <p>C'est gratuit et sans abonnement</p>
          </div>

          <form (ngSubmit)="onRegister()" class="auth-form">

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
                name="password" placeholder="Au moins 8 caractères" required minlength="8" />
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button"
                      (click)="hidePassword.set(!hidePassword())">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <!-- Password strength indicator -->
            @if (password().length > 0) {
              <div class="strength-bar-wrap">
                <div class="strength-bar">
                  <div
                    class="strength-fill"
                    [class.weak]="passwordStrength() === 1"
                    [class.fair]="passwordStrength() === 2"
                    [class.good]="passwordStrength() === 3"
                    [class.strong]="passwordStrength() === 4"
                    [style.width.%]="passwordStrength() * 25"
                  ></div>
                </div>
                <span class="strength-label" [class.weak]="passwordStrength() === 1" [class.fair]="passwordStrength() === 2" [class.good]="passwordStrength() === 3" [class.strong]="passwordStrength() === 4">
                  {{ strengthLabel() }}
                </span>
              </div>
            }

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirmer le mot de passe</mat-label>
              <input matInput [type]="hideConfirm() ? 'password' : 'text'"
                [ngModel]="confirmPassword()" (ngModelChange)="confirmPassword.set($event)"
                name="confirmPassword" required />
              <mat-icon matPrefix>lock_reset</mat-icon>
              <button mat-icon-button matSuffix type="button"
                      (click)="hideConfirm.set(!hideConfirm())">
                <mat-icon>{{ hideConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (passwordMismatch) {
                <mat-error>Les mots de passe ne correspondent pas</mat-error>
              }
            </mat-form-field>

            @if (auth.error()) {
              <div class="error-banner">
                <mat-icon>error_outline</mat-icon>
                <span>{{ auth.error() }}</span>
              </div>
            }

            <button mat-flat-button type="submit" class="submit-btn"
              [disabled]="auth.loading() || passwordMismatch || !email() || password().length < 8">
              @if (auth.loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>person_add</mat-icon>
                Créer mon compte
              }
            </button>

          </form>

          <p class="switch-hint">
            Déjà un compte ?
            <a routerLink="/login" class="link-accent">Se connecter</a>
          </p>

        </div>
      </main>

    </div>
  `,
  styles: [`
    /* ════════════════════════════════════════
       ANIMATIONS
    ════════════════════════════════════════ */
    @keyframes authFadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ════════════════════════════════════════
       LAYOUT
    ════════════════════════════════════════ */
    .auth-layout {
      display: flex;
      min-height: calc(100vh - 56px);
      animation: authFadeIn 350ms ease both;
    }

    /* ── Left panel ── */
    .auth-panel {
      flex: 0 0 420px;
      background: linear-gradient(160deg, #16101a 0%, #0f1520 100%);
      border-right: 1px solid #27273a;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 40px;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        width: 400px; height: 400px;
        background: radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%);
        top: -100px; left: -100px;
        pointer-events: none;
      }
      &::after {
        content: '';
        position: absolute;
        width: 300px; height: 300px;
        background: radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%);
        bottom: -80px; right: -60px;
        pointer-events: none;
      }
    }

    .panel-inner { position: relative; z-index: 1; }

    .panel-logo {
      width: 60px; height: 60px;
      background: rgba(249,115,22,0.12);
      border: 1px solid rgba(249,115,22,0.25);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 28px;
      mat-icon { font-size: 30px; width: 30px; height: 30px; color: #fb923c; }
    }

    .panel-title {
      font-size: 26px;
      font-weight: 800;
      color: #ececf0;
      line-height: 1.2;
      margin-bottom: 12px;
      span { color: #fb923c; }
    }

    .panel-sub {
      font-size: 14px;
      color: #8b8ba0;
      line-height: 1.6;
      margin-bottom: 36px;
    }

    .panel-features {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 20px;

      li {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        div:last-child { display: flex; flex-direction: column; gap: 2px; }
        strong { font-size: 14px; font-weight: 600; color: #d4d4e0; display: block; }
        span { font-size: 12px; color: #8b8ba0; }
      }
    }

    .feat-icon {
      width: 36px; height: 36px;
      flex-shrink: 0;
      background: rgba(249,115,22,0.1);
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #fb923c; }
    }

    /* ── Right / form side ── */
    .auth-form-side {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      background: #0a0a0f;
    }

    .form-wrapper {
      width: 100%;
      max-width: 400px;
      animation: authFadeIn 400ms 80ms ease both;
    }

    .form-header {
      text-align: center;
      margin-bottom: 28px;
      animation: authFadeIn 400ms 120ms ease both;
    }

    .form-logo {
      width: 52px; height: 52px;
      background: rgba(249,115,22,0.1);
      border: 1px solid rgba(249,115,22,0.2);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      mat-icon { font-size: 26px; width: 26px; height: 26px; color: #fb923c; }
    }

    .form-header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #ececf0;
      margin-bottom: 6px;
    }

    .form-header p { font-size: 14px; color: #8b8ba0; }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .full-width { width: 100%; }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.25);
      color: #f87171;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    }

    .submit-btn {
      width: 100%;
      height: 46px;
      background: #f97316 !important;
      color: white !important;
      font-weight: 600;
      font-size: 15px;
      border-radius: 10px !important;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background 150ms ease !important;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }

      &:hover:not(:disabled) { background: #fb923c !important; }
      &:disabled { opacity: 0.5; }
    }

    .switch-hint {
      text-align: center;
      font-size: 13px;
      color: #8b8ba0;
      margin-top: 20px;
    }
    .link-accent {
      color: #fb923c;
      font-weight: 600;
      &:hover { color: #fdba74; }
    }

    /* ── Password strength bar ── */
    .strength-bar-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: -2px 0 4px;
      padding: 0 2px;
      animation: authFadeIn 200ms ease both;
    }

    .strength-bar {
      flex: 1;
      height: 4px;
      background: rgba(255,255,255,0.08);
      border-radius: 4px;
      overflow: hidden;
    }

    .strength-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 300ms ease, background 300ms ease;

      &.weak   { background: #ef4444; }
      &.fair   { background: #f59e0b; }
      &.good   { background: #3b82f6; }
      &.strong { background: #22c55e; }
    }

    .strength-label {
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      transition: color 300ms ease;

      &.weak   { color: #ef4444; }
      &.fair   { color: #f59e0b; }
      &.good   { color: #3b82f6; }
      &.strong { color: #22c55e; }
    }

    /* ════════════════════════════════════════
       RESPONSIVE
    ════════════════════════════════════════ */
    @media (max-width: 767px) {
      .auth-panel { display: none; }
      .auth-form-side { padding: 32px 20px; align-items: flex-start; padding-top: 40px; }
      .form-wrapper { max-width: 100%; }
    }

    @media (min-width: 768px) and (max-width: 1023px) {
      .auth-panel { flex: 0 0 320px; padding: 40px 28px; }
      .panel-features { display: none; }
    }
  `],
})
export class RegisterComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly email           = signal('');
  readonly password        = signal('');
  readonly confirmPassword = signal('');
  readonly hidePassword    = signal(true);
  readonly hideConfirm     = signal(true);

  get passwordMismatch(): boolean {
    return this.confirmPassword().length > 0 && this.password() !== this.confirmPassword();
  }

  /** 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong */
  readonly passwordStrength = computed<number>(() => {
    const p = this.password();
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8)  score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.max(1, score) as 1 | 2 | 3 | 4;
  });

  readonly strengthLabel = computed<string>(() => {
    const labels = ['', 'Faible', 'Moyen', 'Bon', 'Fort'];
    return labels[this.passwordStrength()] ?? '';
  });

  async onRegister(): Promise<void> {
    if (this.passwordMismatch) return;
    await this.auth.register(this.email(), this.password());
    if (this.auth.isAuthenticated()) {
      await this.router.navigate(['/discover']);
    }
  }
}
