import { Component, inject, OnInit, signal, effect } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './services/auth.service';

@Component({
  imports: [
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  title = 'SaaS Hub';
  auth = inject(AuthService);
  private breakpointObserver = inject(BreakpointObserver);
  private router = inject(Router);

  isMobile = toSignal(
    this.breakpointObserver
      .observe('(max-width: 768px)')
      .pipe(map(r => r.matches)),
    { initialValue: false }
  );

  sidenavOpened = signal(true);

  constructor() {
    // Sync sidenav avec la taille d'écran
    effect(() => {
      this.sidenavOpened.set(!this.isMobile());
    });

    // Fermer la sidebar en mobile après navigation
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile()) this.sidenavOpened.set(false);
      });
  }

  async ngOnInit() {
    await this.auth.restoreSession();
  }

  toggleSidenav() {
    this.sidenavOpened.set(!this.sidenavOpened());
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }

  /** Initiales de l'email pour l'avatar */
  get userInitials(): string {
    const email = this.auth.user()?.['email'] as string | undefined;
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  }

  /** Nom d'affichage : partie avant le @ */
  get displayName(): string {
    const email = this.auth.user()?.['email'] as string | undefined;
    if (!email) return 'utilisateur';
    return email.split('@')[0];
  }
}
