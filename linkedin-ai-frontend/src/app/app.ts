import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from './services/auth.service';

interface DraftForm {
  recipient: string;
  goal: string;
  tone: string;
}

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    RouterModule,
    FormsModule,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatSnackBarModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);

  email = signal('demo@example.com');
  password = signal('password123');
  loading = signal(false);
  draft = signal('');
  form = signal<DraftForm>({ recipient: '', goal: '', tone: 'professionnel' });
  copied = signal(false);

  tones = [
    { value: 'professionnel', label: 'Professionnel', icon: 'business_center' },
    { value: 'chaleureux', label: 'Chaleureux', icon: 'favorite' },
    { value: 'direct', label: 'Direct', icon: 'bolt' },
  ];

  async ngOnInit() {
    await this.auth.restoreSession();
  }

  async login() {
    await this.auth.loginWithPkce(this.email(), this.password());
  }

  async logout() {
    await this.auth.logout();
    this.draft.set('');
  }

  async generate() {
    if (!this.auth.isAuthenticated()) {
      this.snackBar.open('Connecte-toi d\'abord', 'OK', { duration: 3000 });
      return;
    }
    this.loading.set(true);
    this.auth.error.set(null);
    try {
      const res = await firstValueFrom(
        this.http.post<{ message: string }>(
          '/api/messages/draft',
          this.form(),
          {
            headers: { authorization: `Bearer ${this.auth.accessToken()}` },
            withCredentials: true,
          }
        )
      );
      this.draft.set(res?.message ?? '');
    } catch {
      this.auth.error.set('Erreur lors de la génération du message.');
    } finally {
      this.loading.set(false);
    }
  }

  async copyDraft() {
    if (!this.draft()) return;
    await navigator.clipboard.writeText(this.draft());
    this.copied.set(true);
    this.snackBar.open('Message copié !', undefined, { duration: 2000 });
    setTimeout(() => this.copied.set(false), 2000);
  }

  get userInitials(): string {
    const email = this.auth.user()?.['email'] as string | undefined;
    return email ? email[0].toUpperCase() : '?';
  }
}
