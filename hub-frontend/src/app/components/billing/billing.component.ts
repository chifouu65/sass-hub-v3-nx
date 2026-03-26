import { Component, inject, computed, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../services/auth.service';

interface StripePlan {
  key: string;
  name: string;
  amount: number;
  priceId: string;
  features: string[];
}

interface StripeSubscription {
  id: string;
  status: string;
  planName: string;
  priceId: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionResponse {
  subscription: StripeSubscription | null;
  customerId: string;
}

interface StripeInvoice {
  id: string;
  number: string;
  status: string;
  amount: number;
  currency: string;
  created: number;
  hostedUrl: string | null;
  pdfUrl: string | null;
}

interface UrlResponse {
  url: string;
}

@Component({
  standalone: true,
  selector: 'app-billing',
  imports: [
    MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule,
    MatTableModule, MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.css',
})
export class BillingComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  checkoutLoading = signal(false);
  portalLoading = signal(false);
  cancelLoading = signal(false);
  reactivateLoading = signal(false);

  /** HttpHeaders avec Bearer token — toujours un objet valide */
  private get authHeaders(): HttpHeaders {
    const token = this.auth.accessToken();
    return token
      ? new HttpHeaders({ authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  // ── Ressources Stripe ─────────────────────────────────────────────────────

  readonly plansResource = rxResource({
    stream: () => this.http.get<StripePlan[]>('/api/billing/plans'),
  });

  readonly subscriptionResource = rxResource({
    stream: () =>
      this.http.get<SubscriptionResponse>('/api/billing/subscription', {
        headers: this.authHeaders,
        withCredentials: true,
      }),
  });

  readonly invoicesResource = rxResource({
    stream: () =>
      this.http.get<StripeInvoice[]>('/api/billing/invoices', {
        headers: this.authHeaders,
        withCredentials: true,
      }),
  });

  // ── Computed ──────────────────────────────────────────────────────────────

  readonly plans = computed<StripePlan[]>(() =>
    this.plansResource.error() ? [] : (this.plansResource.value() ?? [])
  );

  readonly subscription = computed<StripeSubscription | null>(() =>
    (this.subscriptionResource.value() as SubscriptionResponse | undefined)?.subscription ?? null
  );

  readonly invoices = computed<StripeInvoice[]>(() =>
    this.invoicesResource.error() ? [] : ((this.invoicesResource.value() as StripeInvoice[] | undefined) ?? [])
  );

  readonly activePlanKey = computed<string | null>(() => {
    const sub = this.subscription();
    if (!sub || sub.status !== 'active') return null;
    return this.plans().find(p => p.priceId === sub.priceId)?.key ?? null;
  });

  displayedColumns = ['number', 'date', 'amount', 'status', 'actions'];

  // ── Actions ───────────────────────────────────────────────────────────────

  async subscribe(priceId: string): Promise<void> {
    this.checkoutLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<UrlResponse>(
          '/api/billing/checkout',
          { priceId },
          { headers: this.authHeaders, withCredentials: true }
        )
      );
      window.location.href = res.url;
    } catch {
      this.snack.open('Erreur lors de la création de la session de paiement.', 'OK', { duration: 4000 });
    } finally {
      this.checkoutLoading.set(false);
    }
  }

  async cancelPlan(): Promise<void> {
    this.cancelLoading.set(true);
    try {
      await firstValueFrom(
        this.http.post('/api/billing/cancel', {}, {
          headers: this.authHeaders, withCredentials: true,
        })
      );
      this.subscriptionResource.reload();
      this.snack.open('Abonnement annulé — accès conservé jusqu\'à la fin de la période.', 'OK', { duration: 5000 });
    } catch {
      this.snack.open('Erreur lors de l\'annulation.', 'OK', { duration: 4000 });
    } finally {
      this.cancelLoading.set(false);
    }
  }

  async reactivatePlan(): Promise<void> {
    this.reactivateLoading.set(true);
    try {
      await firstValueFrom(
        this.http.post('/api/billing/reactivate', {}, {
          headers: this.authHeaders, withCredentials: true,
        })
      );
      this.subscriptionResource.reload();
      this.snack.open('Abonnement réactivé avec succès.', 'OK', { duration: 4000 });
    } catch {
      this.snack.open('Erreur lors de la réactivation.', 'OK', { duration: 4000 });
    } finally {
      this.reactivateLoading.set(false);
    }
  }

  async openPortal(): Promise<void> {
    this.portalLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<UrlResponse>(
          '/api/billing/portal',
          {},
          { headers: this.authHeaders, withCredentials: true }
        )
      );
      window.location.href = res.url;
    } catch {
      this.snack.open("Erreur lors de l'ouverture du portail.", 'OK', { duration: 4000 });
    } finally {
      this.portalLoading.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  formatDate(ts: number): string {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(ts * 1000));
  }

  formatPlanAmount(amount: number): string {
    if (amount === 0) return 'Gratuit';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
  }

  planIcon(key: string): string {
    const icons: Record<string, string> = {
      free: 'rocket_launch',
      pro: 'workspace_premium',
      team: 'groups',
    };
    return icons[key] ?? 'star';
  }

  /** Ordre des tiers : plus le chiffre est grand, plus le plan est élevé */
  private readonly PLAN_ORDER: Record<string, number> = {
    free: 0,
    pro: 1,
    team: 2,
  };

  /**
   * Retourne l'état d'un plan par rapport à l'abonnement actif :
   * - 'current'   → c'est le plan actif
   * - 'upgrade'   → tier supérieur au plan actif (ou pas d'abonnement)
   * - 'downgrade' → tier inférieur au plan actif
   * - 'free'      → plan gratuit sans abonnement actif
   */
  planState(key: string): 'current' | 'upgrade' | 'downgrade' | 'free' {
    const active = this.activePlanKey();

    if (active === key) return 'current';

    // Pas d'abonnement actif
    if (!active) {
      const plan = this.plans().find(p => p.key === key);
      return plan?.amount === 0 ? 'free' : 'upgrade';
    }

    const activeOrder = this.PLAN_ORDER[active] ?? 0;
    const targetOrder = this.PLAN_ORDER[key] ?? 0;

    if (targetOrder === 0) return 'downgrade'; // Free quand on a un abonnement payant
    return targetOrder > activeOrder ? 'upgrade' : 'downgrade';
  }
}
