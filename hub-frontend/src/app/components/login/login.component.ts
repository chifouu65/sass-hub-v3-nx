import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

type View = 'login' | 'register' | 'forgot' | 'forgot-sent';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  view = signal<View>('login');

  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  hidePassword = signal(true);
  hideConfirm = signal(true);

  /** URL de reset retournée par le backend en mode dev */
  devResetUrl = signal<string | null>(null);

  // ── Init : lire ?error= depuis l'URL (retour OAuth Google) ─────────────────

  ngOnInit() {
    const error = this.route.snapshot.queryParamMap.get('error');
    if (error === 'google_cancelled') {
      this.auth['error'].set('Connexion Google annulée.');
    } else if (error) {
      this.auth['error'].set('La connexion Google a échoué. Réessaie.');
    }
  }

  // ── Google ─────────────────────────────────────────────────────────────────

  loginWithGoogle() {
    window.location.href = '/api/auth/google';
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async onLogin() {
    await this.auth.loginWithPkce(this.email(), this.password());
    if (this.auth.isAuthenticated()) {
      await this.router.navigate(['/']);
    }
  }

  // ── Register ───────────────────────────────────────────────────────────────

  async onRegister() {
    if (this.password() !== this.confirmPassword()) {
      return;
    }
    await this.auth.register(this.email(), this.password());
    if (this.auth.isAuthenticated()) {
      await this.router.navigate(['/']);
    }
  }

  get passwordMismatch(): boolean {
    return this.confirmPassword().length > 0 && this.password() !== this.confirmPassword();
  }

  // ── Forgot password ────────────────────────────────────────────────────────

  async onForgot() {
    const res = await this.auth.forgotPassword(this.email());
    if (!this.auth.error()) {
      this.devResetUrl.set(res.resetUrl ?? null);
      this.view.set('forgot-sent');
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  goTo(v: View) {
    this.auth['error'].set(null);
    this.password.set('');
    this.confirmPassword.set('');
    this.view.set(v);
  }
}
