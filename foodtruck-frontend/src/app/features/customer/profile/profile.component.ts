import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  name: string | null;
  avatarUrl: string | null;
  phone: string | null;
  provider: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="profile-page">

      <div class="page-header">
        <button class="back-btn" routerLink="/discover">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Mon profil</h1>
      </div>

      @if (profileResource.isLoading()) {
        <div class="loading-state"><mat-spinner diameter="36"></mat-spinner></div>
      } @else if (profileResource.value(); as profile) {

        <!-- Avatar + nom -->
        <div class="avatar-section">
          @if (profile.avatarUrl) {
            <img class="avatar-img" [src]="profile.avatarUrl" [alt]="displayName(profile)" />
          } @else {
            <div class="avatar-placeholder">{{ initials(profile) }}</div>
          }
          <div class="avatar-info">
            <p class="avatar-name">{{ displayName(profile) }}</p>
            <p class="avatar-email">{{ profile.email }}</p>
            <span class="role-badge" [class.manager]="profile.role === 'manager'">
              {{ profile.role === 'manager' ? 'Gérant' : 'Client' }}
            </span>
          </div>
        </div>

        <!-- Formulaire -->
        <form class="profile-form" (ngSubmit)="save()" autocomplete="off">
          <div class="field-group">
            <label class="field-label">Nom affiché</label>
            <input
              class="field-input"
              type="text"
              [ngModel]="editName()"
              (ngModelChange)="editName.set($event)"
              name="name"
              placeholder="Jean Dupont"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Téléphone</label>
            <input
              class="field-input"
              type="tel"
              [ngModel]="editPhone()"
              (ngModelChange)="editPhone.set($event)"
              name="phone"
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          <div class="field-group">
            <label class="field-label">URL de l'avatar</label>
            <input
              class="field-input"
              type="url"
              [ngModel]="editAvatarUrl()"
              (ngModelChange)="editAvatarUrl.set($event)"
              name="avatarUrl"
              placeholder="https://..."
            />
          </div>

          @if (saveError()) {
            <div class="feedback error">
              <mat-icon>error_outline</mat-icon>{{ saveError() }}
            </div>
          }
          @if (saveSuccess()) {
            <div class="feedback success">
              <mat-icon>check_circle</mat-icon>Profil mis à jour !
            </div>
          }

          <button class="save-btn" type="submit" [disabled]="saving()">
            @if (saving()) {
              <mat-spinner diameter="18"></mat-spinner>
            } @else {
              <mat-icon>save</mat-icon>
            }
            Enregistrer
          </button>
        </form>

        <!-- Déconnexion -->
        <div class="logout-section">
          <button class="logout-btn" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Se déconnecter
          </button>
        </div>

      } @else {
        <div class="feedback error">
          <mat-icon>error_outline</mat-icon>
          Impossible de charger le profil. Vérifiez votre connexion.
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-page {
      max-width: 520px;
      margin: 0 auto;
      padding: 16px 16px 80px;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
    }

    .page-header h1 {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0;
      color: #ececf0;
    }

    .back-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #9090a8;
      display: flex;
      align-items: center;
      padding: 4px;
      border-radius: 8px;
      transition: background 150ms;
      &:hover { background: rgba(255,255,255,0.06); color: #ececf0; }
    }

    .loading-state {
      display: flex;
      justify-content: center;
      padding: 60px 0;
    }

    /* ── Avatar section ── */
    .avatar-section {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .avatar-img {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid rgba(249,115,22,0.3);
      flex-shrink: 0;
    }

    .avatar-placeholder {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: rgba(249,115,22,0.12);
      border: 2px solid rgba(249,115,22,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
      color: #fb923c;
      flex-shrink: 0;
    }

    .avatar-name {
      font-size: 1rem;
      font-weight: 600;
      color: #ececf0;
      margin: 0 0 3px;
    }

    .avatar-email {
      font-size: 0.82rem;
      color: #6a6a80;
      margin: 0 0 8px;
    }

    .role-badge {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 9px;
      border-radius: 20px;
      background: rgba(139,92,246,0.15);
      color: #a78bfa;
      border: 1px solid rgba(139,92,246,0.25);
      text-transform: uppercase;
      letter-spacing: 0.05em;

      &.manager {
        background: rgba(249,115,22,0.15);
        color: #fb923c;
        border-color: rgba(249,115,22,0.25);
      }
    }

    /* ── Form ── */
    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-size: 0.82rem;
      font-weight: 500;
      color: #8080a0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .field-input {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 0.92rem;
      color: #ececf0;
      outline: none;
      transition: border-color 150ms;
      font-family: inherit;

      &:focus { border-color: rgba(249,115,22,0.5); }
      &::placeholder { color: #3a3a50; }
    }

    .feedback {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.88rem;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }

      &.error {
        background: rgba(239,68,68,0.1);
        color: #f87171;
        border: 1px solid rgba(239,68,68,0.2);
      }
      &.success {
        background: rgba(34,197,94,0.1);
        color: #4ade80;
        border: 1px solid rgba(34,197,94,0.2);
      }
    }

    .save-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #f97316, #ea5f14);
      border: none;
      border-radius: 12px;
      padding: 12px 24px;
      color: white;
      font-size: 0.92rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: opacity 150ms, transform 150ms;
      box-shadow: 0 4px 16px rgba(249,115,22,0.25);
      margin-top: 4px;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    /* ── Logout ── */
    .logout-section {
      padding: 0 4px;
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 12px;
      padding: 10px 18px;
      color: #f87171;
      font-size: 0.88rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      width: 100%;
      transition: background 150ms;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: rgba(239,68,68,0.08); }
    }
  `],
})
export class ProfileComponent {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);

  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);
  editName = signal('');
  editPhone = signal('');
  editAvatarUrl = signal('');

  private get headers(): HttpHeaders {
    const token = this.auth.accessToken();
    return token
      ? new HttpHeaders({ authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  readonly profileResource = rxResource({
    stream: () =>
      this.http.get<UserProfile>('/hub-api/profile', {
        headers: this.headers,
        withCredentials: true,
      }),
  });

  constructor() {
    // Pré-remplir les champs dès que le profil est chargé
    effect(() => {
      const p = this.profileResource.value();
      if (p) {
        this.editName.set(p.name ?? '');
        this.editPhone.set(p.phone ?? '');
        this.editAvatarUrl.set(p.avatarUrl ?? '');
      }
    });
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await firstValueFrom(
        this.http.patch<UserProfile>('/hub-api/profile', {
          name: this.editName() || null,
          phone: this.editPhone() || null,
          avatarUrl: this.editAvatarUrl() || null,
        }, { headers: this.headers, withCredentials: true }),
      );
      this.profileResource.reload();
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch {
      this.saveError.set('Impossible de sauvegarder. Réessayez.');
    } finally {
      this.saving.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  displayName(p: UserProfile): string {
    return p.name || p.email.split('@')[0];
  }

  initials(p: UserProfile): string {
    const name = p.name || p.email;
    return name.slice(0, 2).toUpperCase();
  }
}
