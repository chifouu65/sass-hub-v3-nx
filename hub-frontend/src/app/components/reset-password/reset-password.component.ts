import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

type State = 'form' | 'success' | 'invalid';

@Component({
  standalone: true,
  selector: 'app-reset-password',
  imports: [
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css',
})
export class ResetPasswordComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  state = signal<State>('form');
  token = signal('');

  password = signal('');
  confirmPassword = signal('');
  hidePassword = signal(true);
  hideConfirm = signal(true);

  get passwordMismatch(): boolean {
    return this.confirmPassword().length > 0 && this.password() !== this.confirmPassword();
  }

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token');
    if (!t) {
      this.state.set('invalid');
    } else {
      this.token.set(t);
    }
  }

  async onSubmit() {
    if (this.passwordMismatch) return;
    const ok = await this.auth.resetPassword(this.token(), this.password());
    if (ok) {
      this.state.set('success');
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
