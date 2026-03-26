import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { JsonPipe } from '@angular/common';

interface DraftForm {
  recipient: string;
  goal: string;
  tone: string;
}

@Component({
  imports: [HttpClientModule, FormsModule, JsonPipe],
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  title = 'LinkedIn AI Messaging';
  private readonly hubApiBase = '/hub-api';
  private readonly clientId = 'linkedin-ai-frontend';

  loading = signal(false);
  draft = signal('');
  authLoading = signal(false);
  error = signal<string | null>(null);
  authError = signal<string | null>(null);
  accessToken = signal<string | null>(null);
  user = signal<Record<string, unknown> | null>(null);
  email = signal('demo@example.com');
  password = signal('password123');
  isAuthenticated = computed(() => !!this.accessToken());
  http = inject(HttpClient);
  form = signal<DraftForm>({ recipient: '', goal: '', tone: 'professionnel' });

  async ngOnInit() {
    await this.restoreSession();
  }

  async generate() {
    if (!this.isAuthenticated()) {
      this.error.set('Connecte-toi d abord pour generer un message.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await this.http
        .post<{ message: string }>('/api/messages/draft', this.form())
        .toPromise();
      this.draft.set(res?.message ?? '');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'generation_error');
    } finally {
      this.loading.set(false);
    }
  }

  async login() {
    this.authLoading.set(true);
    this.authError.set(null);
    try {
      const verifier = this.randomString(64);
      const challenge = await this.sha256Base64Url(verifier);

      const authRes = await fetch(`${this.hubApiBase}/oauth/authorize`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: this.email(),
          password: this.password(),
          redirect_uri: 'http://localhost:4300/callback',
          client_id: this.clientId,
          code_challenge: challenge,
        }),
      });
      if (!authRes.ok) throw new Error(`authorize_failed_${authRes.status}`);
      const authJson = (await authRes.json()) as { code?: string };
      if (!authJson.code) throw new Error('missing_code');

      const tokenRes = await fetch(`${this.hubApiBase}/oauth/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: authJson.code,
          code_verifier: verifier,
          redirect_uri: 'http://localhost:4300/callback',
          client_id: this.clientId,
        }),
      });
      if (!tokenRes.ok) throw new Error(`token_failed_${tokenRes.status}`);
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      this.accessToken.set(tokenJson.access_token ?? null);
      await this.fetchMe();
    } catch (err) {
      this.authError.set(err instanceof Error ? err.message : 'auth_error');
      this.accessToken.set(null);
      this.user.set(null);
    } finally {
      this.authLoading.set(false);
    }
  }

  async restoreSession() {
    this.authLoading.set(true);
    this.authError.set(null);
    try {
      const refreshRes = await fetch(`${this.hubApiBase}/oauth/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: this.clientId,
        }),
      });
      if (!refreshRes.ok) {
        this.accessToken.set(null);
        this.user.set(null);
        return;
      }
      const refreshJson = (await refreshRes.json()) as { access_token?: string };
      this.accessToken.set(refreshJson.access_token ?? null);
      await this.fetchMe();
    } catch {
      this.accessToken.set(null);
      this.user.set(null);
    } finally {
      this.authLoading.set(false);
    }
  }

  async refreshSession() {
    await this.restoreSession();
  }

  async logout() {
    await fetch(`${this.hubApiBase}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    this.accessToken.set(null);
    this.user.set(null);
    this.authError.set(null);
  }

  private async fetchMe() {
    if (!this.accessToken()) {
      this.user.set(null);
      return;
    }
    const meRes = await fetch(`${this.hubApiBase}/auth/me`, {
      headers: { authorization: `Bearer ${this.accessToken()}` },
      credentials: 'include',
    });
    if (!meRes.ok) throw new Error(`me_failed_${meRes.status}`);
    this.user.set((await meRes.json()) as Record<string, unknown>);
  }

  private randomString(size: number) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return this.base64UrlEncode(bytes);
  }

  private async sha256Base64Url(value: string) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  private base64UrlEncode(bytes: Uint8Array) {
    let binary = '';
    for (const b of bytes) {
      binary += String.fromCharCode(b);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
