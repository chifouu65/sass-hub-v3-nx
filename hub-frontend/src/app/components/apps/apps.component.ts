import { Component, inject, computed, signal, effect } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  AppDetailDialogComponent,
  AppDetailDialogResult,
  type AppDetailDialogData,
} from './app-detail-dialog.component';

// ── Interfaces ───────────────────────────────────────────────────────────────

interface AppDescriptor {
  id: string;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  plans: string[];
  category: string;
  url: string;
  comingSoon?: boolean;
}

interface AppEnriched extends AppDescriptor {
  icon: string;
  iconBg: string;
  iconColor: string;
  subscribed: boolean;
}

interface UserAppsResponse {
  subscribedIds: string[];
}

// ── Metadata visuelle par app ID ─────────────────────────────────────────────

const APP_META: Record<string, Pick<AppEnriched, 'icon' | 'iconBg' | 'iconColor'>> = {
  'linkedin-ai': {
    icon: 'smart_toy',
    iconBg: 'rgba(99,102,241,0.12)',
    iconColor: '#818cf8',
  },
  invoicing: {
    icon: 'receipt_long',
    iconBg: 'rgba(34,197,94,0.12)',
    iconColor: '#22c55e',
  },
  analytics: {
    icon: 'insights',
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#f59e0b',
  },
  crm: {
    icon: 'people',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: '#ef4444',
  },
  scheduler: {
    icon: 'calendar_month',
    iconBg: 'rgba(6,182,212,0.12)',
    iconColor: '#22d3ee',
  },
};

// ── Composant ────────────────────────────────────────────────────────────────

@Component({
  standalone: true,
  selector: 'app-apps',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  templateUrl: './apps.component.html',
  styleUrl: './apps.component.css',
})
export class AppsComponent {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  // ── État UI ───────────────────────────────────────────────────────────────

  selectedTab = signal(0);
  searchQuery = signal('');
  loadingAppId = signal<string | null>(null);

  /** IDs abonnés : initialisé depuis le backend, mis à jour localement après chaque action */
  readonly subscribedIds = signal<string[]>([]);

  // ── Ressources HTTP ───────────────────────────────────────────────────────

  private get authHeaders(): HttpHeaders {
    const token = this.auth.accessToken();
    return token
      ? new HttpHeaders({ authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  readonly catalogResource = rxResource({
    stream: () =>
      this.http.get<AppDescriptor[]>('/api/catalog', {
        headers: this.authHeaders,
        withCredentials: true,
      }),
  });

  readonly userAppsResource = rxResource({
    stream: () =>
      this.http.get<UserAppsResponse>('/api/user-apps', {
        headers: this.authHeaders,
        withCredentials: true,
      }),
  });

  constructor() {
    // Sync subscribedIds depuis le backend dès que la ressource est chargée
    effect(() => {
      const data = this.userAppsResource.value();
      if (data?.subscribedIds) {
        this.subscribedIds.set(data.subscribedIds);
      }
    });
  }

  // ── Données enrichies ─────────────────────────────────────────────────────

  readonly apps = computed<AppEnriched[]>(() => {
    const catalog = this.catalogResource.value() ?? [];
    const subIds = this.subscribedIds();
    return catalog.map(app => {
      const meta = APP_META[app.id] ?? {};
      return {
        ...app,
        icon: meta.icon ?? 'widgets',
        iconBg: meta.iconBg ?? 'rgba(139,92,246,0.12)',
        iconColor: meta.iconColor ?? '#a78bfa',
        subscribed: subIds.includes(app.id),
      } as AppEnriched;
    });
  });

  readonly activeApps = computed(() => this.apps().filter(a => a.subscribed));
  readonly availableApps = computed(() => this.apps().filter(a => !a.subscribed));

  readonly filteredActiveApps = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.activeApps();
    return this.activeApps().filter(
      a => a.name.toLowerCase().includes(q) || a.tagline.toLowerCase().includes(q),
    );
  });

  readonly filteredAvailableApps = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.availableApps();
    return this.availableApps().filter(
      a => a.name.toLowerCase().includes(q) || a.tagline.toLowerCase().includes(q),
    );
  });

  readonly isLoading = computed(
    () => this.catalogResource.isLoading() || this.userAppsResource.isLoading(),
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  async subscribe(appId: string): Promise<void> {
    if (this.loadingAppId()) return;
    this.loadingAppId.set(appId);
    try {
      const res = await firstValueFrom(
        this.http.post<UserAppsResponse>(`/api/user-apps/${appId}`, {}, {
          headers: this.authHeaders,
          withCredentials: true,
        }),
      );
      this.subscribedIds.set(res.subscribedIds);
      this.snack.open('Application ajoutée à vos apps.', 'OK', { duration: 3000 });
      // Basculer vers "Mes apps" après abonnement
      this.selectedTab.set(0);
    } catch {
      this.snack.open('Erreur lors de l\'abonnement.', 'OK', { duration: 4000 });
    } finally {
      this.loadingAppId.set(null);
    }
  }

  async unsubscribe(appId: string): Promise<void> {
    if (this.loadingAppId()) return;
    this.loadingAppId.set(appId);
    try {
      const res = await firstValueFrom(
        this.http.delete<UserAppsResponse>(`/api/user-apps/${appId}`, {
          headers: this.authHeaders,
          withCredentials: true,
        }),
      );
      this.subscribedIds.set(res.subscribedIds);
      this.snack.open('Application retirée de vos apps.', 'OK', { duration: 3000 });
    } catch {
      this.snack.open('Erreur lors du désabonnement.', 'OK', { duration: 4000 });
    } finally {
      this.loadingAppId.set(null);
    }
  }

  openDetail(app: AppEnriched): void {
    const data: AppDetailDialogData = {
      app,
      isSubscribed: app.subscribed,
    };
    const ref = this.dialog.open(AppDetailDialogComponent, {
      data,
      panelClass: 'dark-dialog',
      maxWidth: '560px',
      width: '100%',
    });
    ref.afterClosed().subscribe((result: AppDetailDialogResult) => {
      if (result === 'subscribe') this.subscribe(app.id);
      else if (result === 'unsubscribe') this.unsubscribe(app.id);
    });
  }

  /** Ouvre l'app dans un nouvel onglet en passant le token SSO */
  launchApp(app: AppEnriched): void {
    if (app.url === '#' || app.comingSoon) return;
    const token = this.auth.accessToken();
    const url = token ? `${app.url}?sso_token=${token}` : app.url;
    window.open(url, '_blank', 'noopener');
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }
}
