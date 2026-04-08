import { Component, inject, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

interface AppDescriptor {
  id: string;
  name: string;
  tagline: string;
  description: string;
  plans: string[];
  url: string;
}

interface AppCard {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  status: 'active' | 'available';
  plan: string;
  url: string;
}

interface SubscriptionResponse {
  subscription: {
    id: string;
    status: string;
    planName: string;
    priceId: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
  } | null;
}

interface UserProfile {
  name: string | null;
  email: string;
}

/** Méta-données locales pour enrichir le catalogue backend */
const APP_META: Record<string, Partial<AppCard>> = {
  'linkedin-ai': {
    icon: 'smart_toy',
    iconBg: 'rgba(99,102,241,0.12)',
    iconColor: '#818cf8',
    status: 'active',
    plan: 'Pro',
    url: 'http://localhost:4300',
  },
};

const DEFAULT_META: Partial<AppCard> = {
  icon: 'widgets',
  iconBg: 'rgba(139,92,246,0.12)',
  iconColor: '#a78bfa',
  status: 'available',
  plan: 'Free',
};

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  auth = inject(AuthService);
  private http = inject(HttpClient);

  private get authHeaders(): HttpHeaders {
    const token = this.auth.accessToken();
    return token
      ? new HttpHeaders({ authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  // ── Catalogue d'apps ───────────────────────────────────────────────────────
  readonly catalogResource = rxResource({
    stream: () =>
      this.http.get<AppDescriptor[]>('/api/catalog', {
        headers: this.authHeaders,
        withCredentials: true,
      }),
  });

  // ── Abonnement Stripe ──────────────────────────────────────────────────────
  readonly subscriptionResource = rxResource({
    stream: () =>
      this.http.get<SubscriptionResponse>('/api/billing/subscription', {
        headers: this.authHeaders,
        withCredentials: true,
      }),
  });

  // ── Profil utilisateur (pour le nom affiché) ───────────────────────────────
  readonly profileResource = rxResource({
    stream: () =>
      this.http.get<UserProfile>('/api/profile', {
        headers: this.authHeaders,
        withCredentials: true,
      }),
  });

  // ── Computed ───────────────────────────────────────────────────────────────

  readonly displayName = computed<string>(() => {
    const profile = this.profileResource.value();
    if (profile?.name) return profile.name;
    const email = (this.auth.user()?.['email'] as string | undefined) ?? '';
    return email.split('@')[0] || 'utilisateur';
  });

  readonly planName = computed<string>(() => {
    const sub = this.subscriptionResource.value()?.subscription;
    if (!sub) return 'Free';
    if (sub.status === 'active' || sub.status === 'trialing') return sub.planName;
    return 'Free';
  });

  readonly apps = computed<AppCard[]>(() => {
    if (this.catalogResource.error()) return [];
    const raw: any = this.catalogResource.value() ?? [];
    return raw.map((app: any) => {
      const meta = APP_META[app.id] ?? DEFAULT_META;
      return {
        id: app.id,
        name: app.name,
        tagline: app.tagline,
        icon: meta.icon ?? DEFAULT_META.icon!,
        iconBg: meta.iconBg ?? DEFAULT_META.iconBg!,
        iconColor: meta.iconColor ?? DEFAULT_META.iconColor!,
        status: meta.status ?? 'available',
        plan: meta.plan ?? app.plans[0] ?? 'Free',
        url: meta.url ?? app.url ?? '#',
      };
    });
  });

  readonly activeApps = computed(() => this.apps().filter(a => a.status === 'active'));

  readonly stats = computed(() => [
    {
      label: 'Apps actives',
      value: String(this.activeApps().length),
      icon: 'view_module',
      color: 'var(--accent)',
    },
    {
      label: 'Abonnement',
      value: this.subscriptionResource.isLoading() ? '…' : this.planName(),
      icon: 'workspace_premium',
      color: 'var(--warning)',
    },
    {
      label: 'Apps disponibles',
      value: this.catalogResource.isLoading() ? '…' : String(this.apps().length),
      icon: 'trending_up',
      color: 'var(--success)',
    },
  ]);
}
