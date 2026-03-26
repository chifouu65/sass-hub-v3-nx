import { Component, inject, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface AppDescriptor {
  id: string;
  name: string;
  tagline: string;
  description: string;
  plans: string[];
  url: string;
}

interface AppEnriched extends AppDescriptor {
  icon: string;
  iconBg: string;
  iconColor: string;
  subscribed: boolean;
}

const APP_META: Record<string, Partial<AppEnriched>> = {
  'linkedin-ai': {
    icon: 'smart_toy',
    iconBg: 'rgba(99,102,241,0.12)',
    iconColor: '#818cf8',
    subscribed: true,
    url: 'http://localhost:4300',
  },
};

const EXTRA_APPS: AppEnriched[] = [
  {
    id: 'invoicing',
    name: 'Facturation',
    tagline: 'Factures professionnelles en un clic',
    description: 'Crée, envoie et suis tes factures. Intégration Stripe et export PDF.',
    icon: 'receipt_long',
    iconBg: 'rgba(34,197,94,0.12)',
    iconColor: '#22c55e',
    plans: ['Free', 'Pro'],
    url: '#',
    subscribed: false,
  },
  {
    id: 'analytics',
    name: 'Analytics',
    tagline: 'Métriques et tableaux de bord',
    description: 'Visualise les performances de tes apps avec des dashboards temps réel.',
    icon: 'insights',
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#f59e0b',
    plans: ['Pro', 'Team'],
    url: '#',
    subscribed: false,
  },
  {
    id: 'crm',
    name: 'CRM',
    tagline: 'Gestion de contacts et prospects',
    description: 'Suivi des interactions clients, pipeline de vente et automatisations.',
    icon: 'people',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: '#ef4444',
    plans: ['Free', 'Pro', 'Enterprise'],
    url: '#',
    subscribed: false,
  },
];

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
  ],
  templateUrl: './apps.component.html',
  styleUrl: './apps.component.css',
})
export class AppsComponent {
  private http = inject(HttpClient);

  readonly catalogResource = rxResource({
    stream: () =>
      this.http.get<AppDescriptor[]>('/api/catalog', { withCredentials: true }),
  });

  /** Catalogue enrichi : API backend + apps statiques supplémentaires */
  readonly apps = computed<AppEnriched[]>(() => {
    const apiApps = (this.catalogResource.value() ?? []).map(app => {
      const meta = APP_META[app.id] ?? {};
      return {
        ...app,
        icon: meta.icon ?? 'widgets',
        iconBg: meta.iconBg ?? 'rgba(139,92,246,0.12)',
        iconColor: meta.iconColor ?? '#a78bfa',
        subscribed: meta.subscribed ?? false,
        url: meta.url ?? app.url,
      } as AppEnriched;
    });

    // Merge sans doublons
    const ids = new Set(apiApps.map((a: any) => a.id));
    return [...apiApps, ...EXTRA_APPS.filter(a => !ids.has(a.id))];
  });

  readonly activeApps = computed(() => this.apps().filter(a => a.subscribed));
  readonly availableApps = computed(() => this.apps().filter(a => !a.subscribed));

  selectedTab = signal