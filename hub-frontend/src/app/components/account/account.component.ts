import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  name: string | null;
  avatarUrl: string | null;
  phone: string | null;
  provider: string;
  createdAt: string;
}

@Component({
  standalone: true,
  imports: [
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
})
export class AccountComponent {
  auth = inject(AuthService);
  private http = inject(HttpClient);

  editing = signal(false);
  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  // Champs du formulaire d'édition
  editName = signal('');
  editPhone = signal('');
  editAvatarUrl = signal('');

  readonly profileResource = rxResource({
    stream: () =>
      this.http.get<UserProfile>('/api/profile', {
        headers: this.auth.accessToken()
          ? { authorization: `Bearer ${this.auth.accessToken()}` }
          : {},
        withCredentials: true,
      }),
  });

  startEditing(): void {
    const p = this.profileResource.value();
    this.editName.set(p?.name ?? '');
    this.editPhone.set(p?.phone ?? '');
    this.editAvatarUrl.set(p?.avatarUrl ?? '');
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
  }

  async saveProfile(): Promise<void> {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);
    try {
      await firstValueFrom(
        this.http.patch<UserProfile>('/api/profile', {
          name: this.editName() || null,
          phone: this.editPhone() || null,
          avatarUrl: this.editAvatarUrl() || null,
        }, {
          headers: this.auth.accessToken()
            ? { authorization: `Bearer ${this.auth.accessToken()}` }
            : {},
          withCredentials: true,
        }),
      );
      this.profileResource.reload();
      this.editing.set(false);
      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde';
      this.saveError.set(msg);
    } finally {
      this.saving.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  displayName(profile: UserProfile): string {
    return profile.name || profile.email.split('@')[0];
  }
}
