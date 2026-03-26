import { Component, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

interface Invoice {
  id: string;
  date: string;
  app: string;
  plan: string;
  amount: string;
  status: 'paid' | 'pending' | 'overdue';
}

@Component({
  standalone: true,
  selector: 'app-billing',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatChipsModule],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.css',
})
export class BillingComponent {
  currentPlan = signal({
    name: 'Pro',
    price: '29',
    period: '/mois',
    apps: 5,
    renewDate: '15 avril 2026',
  });

  invoices = signal<Invoice[]>([
    { id: 'INV-001', date: '15 mars 2026', app: 'LinkedIn AI', plan: 'Pro', amount: '29,00 €', status: 'paid' },
    { id: 'INV-002', date: '15 fév 2026', app: 'LinkedIn AI', plan: 'Pro', amount: '29,00 €', status: 'paid' },
    { id: 'INV-003', date: '15 jan 2026', app: 'LinkedIn AI', plan: 'Pro', amount: '29,00 €', status: 'paid' },
  ]);

  displayedColumns = ['id', 'date', 'app', 'amount', 'status'];
}
