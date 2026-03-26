import { Component, inject, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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

@Component({
  standalone: true,
  selector: 'app-billing',
  imports: [
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.css',
})
export class BillingComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  checkoutLoading = signal(false);
  portalLoading = signal(false);

  private get headers() {
    return this.auth.accessToken()
      ? { authorization: `Bearer ${this.auth.accessToken()}` }
      : {};
  }

  // ── Ressources Stripe ─────────────────────────────────────────────────────

  readonly plansResource = rxResource({
    stream: () => this.http.get<StripePlan[]>('/api/billing/plans'),
  });

  readonly subscriptionResource = rxResource({
    stream: () =>
      this.http.get<{ subscription: StripeSubscription | null }>('/api/billing/subscription', {
        headers: this.headers,
        withCredentials: true,
      }),
  });

  readonly invoicesResource = rxResource({
    stream: () =>
      this.http.get<StripeInvoice[]>('/api/billing/invoices', {
        headers: this.headers,
        withCredentials: true,
      }),
  });

  // ── Computed ──────────────────────────────────────────────────────────────

  readonly plans = computed<StripePlan[]>(() =>
    this.plansResource.error() ? [] : (this.plansResource.value() ?? [])
  );

  readonly subscription = computed<StripeSubscription | null>(() =>
    this.subscriptionResource.value()?.subscription ?? null
  );

  readonly invoices = computed<StripeInvoice[]>(() =>
    this.invoicesResource.error() ? [] : (this.invoicesResource.value() ?? [])
  );

  readonly activePlanKey = computed(() => {
    const sub = this.subscription();
    if (!sub || sub.status !== 'active') return null;
    const plan = this.plans().find(p => p.priceId === sub.priceId);
    return plan?.key ?? null;
  });

  displayedColumns = ['number', 'date', 'amount', 'status', 'actions'];

  // ── Actions ───────────────────────────────────────────────────────────────

  async subscribe(priceId: string) {
    this.checkoutLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{ url: string }>('/api/billing/checkout',
          { priceId },
          { headers: this.headers, withCredentials: true }
        )
      );
      window.location.href = res.url;
    } catch {
      this.snack.open('Erreur lors de la création de la session de paiement.', 'OK', { duration: 4000 });
    } finally {
      this.checkoutLoading.set(false);
    }
  }

  async openPortal() {
    this.portalLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<{ url: string }>('/api/billing/portal', {},
          { headers: this.headers, withCredentials: true }
        )
      );
      window.location.href = res.url;
    } catch {
      this.snack.open('Erreur lors de l\'ouverture du portail.', 'OK', { duration: 4000 });
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
}
