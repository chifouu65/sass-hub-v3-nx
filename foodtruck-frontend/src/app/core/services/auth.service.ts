import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = '/hub-api';
  private readonly clientId = 'foodtruck-frontend';
  private readonly redirectUri = `${window.location.origin}/callback`;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly user = signal<Record<string, unknown> | null>(null);
  readonly isAuthenticated = computed(() => !!this.accessToken());
  readonly role = computed(() => this.user()?.['role'] as string | undefined);
  readonly isManager = computed(() => this.role() === 'manager');

  async initSession(): Promise<void> {
    // SSO login: hub passes its JWT as ?sso_token= in the URL
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token');
    if (ssoToken) {
      // Clean the token from the URL immediately (avoid sharing it in history)
      window.history.replaceState({}, '', window.location.pathname);
      this.loading.set(true);
      try {
        this.accessToken.set(ssoToken);
        await this.fetchMe(ssoToken);
        console.log('[AuthService] SSO login OK | user:', this.user(), '| role:', this.role());
      } catch (e) {
        console.warn('[AuthService] SSO login failed:', e);
        this.clearSession();
      } finally {
        this.loading.set(false);
      }
      return; // skip cookie-based restore
    }
    await this.restoreSession();
  }

  async restoreSession(): Promise<void> {
    this.loading.set(true);
    console.log('[AuthService] restoreSession — start');
    try {
      const json = await firstValueFrom(
        this.http.post<{ access_token?: string }>(
          `${this.apiBase}/oauth/token`,
          { grant_type: 'refresh_token', client_id: this.clientId },
          { withCredentials: true }
        )
      );
      if (json.access_token) {
        this.accessToken.set(json.access_token);
        await this.fetchMe(json.access_token);
        console.log('[AuthService] restoreSession — OK | user:', this.user(), '| role:', this.role());
      } else {
        console.warn('[AuthService] restoreSession — no access_token');
        this.clearSession();
      }
    } catch (e) {
      console.warn('[AuthService] restoreSession — failed (pas de cookie ou erreur réseau):', e);
      this.clearSession();
    } finally {
      this.loading.set(false);
    }
  }

  async loginWithPkce(email: string, password: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { verifier, challenge } = await this.createPkcePair();

      const authJson = await firstValueFrom(
        this.http.post<{ code?: string }>(
          `${this.apiBase}/oauth/authorize`,
          {
            email,
            password,
            redirect_uri: this.redirectUri,
            client_id: this.clientId,
            code_challenge: challenge,
          },
          { withCredentials: true }
        )
      );
      if (!authJson.code) throw new Error('missing_code');

      const tokenJson = await firstValueFrom(
        this.http.post<{ access_token?: string }>(
          `${this.apiBase}/oauth/token`,
          {
            grant_type: 'authorization_code',
            code: authJson.code,
            code_verifier: verifier,
            redirect_uri: this.redirectUri,
            client_id: this.clientId,
          },
          { withCredentials: true }
        )
      );
      if (!tokenJson.access_token) throw new Error('missing_access_token');

      this.accessToken.set(tokenJson.access_token);
      await this.fetchMe(tokenJson.access_token);
    } catch (e) {
      this.clearSession();
      this.error.set(this.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async register(
    email: string,
    password: string,
    role: 'manager' | 'customer'
  ): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.http.post<{ access_token?: string }>(
          `${this.apiBase}/auth/register`,
          { email, password, role },
          { withCredentials: true }
        )
      );
      if (!result.access_token) throw new Error('missing_access_token');

      this.accessToken.set(result.access_token);
      await this.fetchMe(result.access_token);
    } catch (e) {
      this.clearSession();
      this.error.set(this.extractError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.apiBase}/auth/logout`, {}, { withCredentials: true })
      );
    } finally {
      this.clearSession();
    }
  }

  private async fetchMe(token: string): Promise<void> {
    const user = await firstValueFrom(
      this.http.get<Record<string, unknown>>(`${this.apiBase}/auth/me`, {
        headers: { authorization: `Bearer ${token}` },
        withCredentials: true,
      })
    );
    console.log('[AuthService] fetchMe response:', user);
    this.user.set(user);
  }

  private clearSession(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }

  private extractError(e: unknown): string {
    if (e instanceof HttpErrorResponse) {
      return (e.error as { message?: string })?.message ?? `Error ${e.status}`;
    }
    return e instanceof Error ? e.message : 'Unknown error';
  }

  private async createPkcePair() {
    const verifier = this.randomString(64);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = this.base64UrlEncode(new Uint8Array(digest));
    return { verifier, challenge };
  }

  private randomString(size: number): string {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return this.base64UrlEncode(bytes);
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
