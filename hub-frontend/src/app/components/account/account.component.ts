import { Component, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  imports: [JsonPipe, RouterModule, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule],
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
})
export class AccountComponent {
  auth = inject(AuthService);

  async refresh() {
    await this.auth.restoreSession();
  }

  async logout() {
    await this.auth.logout();
  }
}
