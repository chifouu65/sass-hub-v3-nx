import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/** Hub frontend URL — manager login lives here */
const HUB_URL = 'https://sass-hub-v3-nx-production-f0c6.up.railway.app';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterModule, MatIconModule, MatButtonModule],
  template: `
    <div class="welcome-page">

      <!-- Brand -->
      <header class="brand">
        <mat-icon class="brand-icon">lunch_dining</mat-icon>
        <span class="brand-name">MyFoodTruck</span>
      </header>

      <!-- Hero -->
      <div class="hero">
        <h1 class="hero-title">Bienvenue sur <span class="accent">MyFoodTruck</span></h1>
        <p class="hero-sub">
          Découvrez les meilleurs food trucks près de chez vous,
          passez vos commandes et suivez-les en temps réel.
        </p>
      </div>

      <!-- Choice cards -->
      <div class="cards">

        <!-- Manager card -->
        <div class="card">
          <div class="card-icon manager">
            <mat-icon>admin_panel_settings</mat-icon>
          </div>
          <h2>Je suis gérant</h2>
          <p>
            Gérez votre food truck : menu, commandes, localisation
            et statistiques depuis votre espace dédié.
          </p>
          <a [href]="hubUrl" class="btn btn-manager">
            <mat-icon>login</mat-icon>
            Se connecter via le Hub
          </a>
        </div>

        <!-- Customer card -->
        <div class="card">
          <div class="card-icon customer">
            <mat-icon>storefront</mat-icon>
          </div>
          <h2>Je suis client</h2>
          <p>
            Trouvez un food truck, consultez les menus et commandez
            en quelques clics — sans abonnement.
          </p>
          <a routerLink="/register" class="btn btn-customer">
            <mat-icon>person_add</mat-icon>
            Créer mon compte
          </a>
          <a routerLink="/login" class="login-link">
            Déjà un compte ? Se connecter
          </a>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .welcome-page {
      min-height: 100vh;
      background: #0a0a0f;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px 64px;
      gap: 0;
    }

    /* ── Brand ── */
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 56px;
      color: #fb923c;
      font-size: 20px;
      font-weight: 700;
    }

    .brand-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    /* ── Hero ── */
    .hero {
      text-align: center;
      max-width: 560px;
      margin-bottom: 56px;
    }

    .hero-title {
      font-size: clamp(26px, 5vw, 38px);
      font-weight: 800;
      color: #ececf0;
      margin: 0 0 16px;
      line-height: 1.2;
    }

    .accent {
      color: #fb923c;
    }

    .hero-sub {
      font-size: 16px;
      color: #8b8ba0;
      line-height: 1.6;
      margin: 0;
    }

    /* ── Cards ── */
    .cards {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      justify-content: center;
      width: 100%;
      max-width: 860px;
    }

    .card {
      background: #111118;
      border: 1px solid #27273a;
      border-radius: 16px;
      padding: 36px 32px;
      flex: 1;
      min-width: 300px;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
      transition: border-color 200ms ease, box-shadow 200ms ease;

      &:hover {
        border-color: #3d3d55;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      }
    }

    .card-icon {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;

      mat-icon {
        font-size: 30px;
        width: 30px;
        height: 30px;
      }

      &.manager {
        background: rgba(139, 92, 246, 0.12);
        border: 1px solid rgba(139, 92, 246, 0.25);
        mat-icon { color: #a78bfa; }
      }

      &.customer {
        background: rgba(249, 115, 22, 0.12);
        border: 1px solid rgba(249, 115, 22, 0.25);
        mat-icon { color: #fb923c; }
      }
    }

    h2 {
      font-size: 20px;
      font-weight: 700;
      color: #ececf0;
      margin: 0;
    }

    p {
      font-size: 14px;
      color: #8b8ba0;
      line-height: 1.6;
      margin: 0;
      flex: 1;
    }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      margin-top: 8px;
      transition: all 150ms ease;
      cursor: pointer;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .btn-manager {
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.35);
      color: #a78bfa;

      &:hover {
        background: rgba(139, 92, 246, 0.2);
        border-color: rgba(139, 92, 246, 0.6);
        color: #c4b5fd;
      }
    }

    .btn-customer {
      background: rgba(249, 115, 22, 0.12);
      border: 1px solid rgba(249, 115, 22, 0.35);
      color: #fb923c;

      &:hover {
        background: rgba(249, 115, 22, 0.2);
        border-color: rgba(249, 115, 22, 0.6);
        color: #fdba74;
      }
    }

    .login-link {
      font-size: 13px;
      color: rgba(236, 236, 240, 0.5);
      text-decoration: none;
      margin-top: -4px;

      &:hover {
        color: rgba(236, 236, 240, 0.8);
      }
    }
  `],
})
export class WelcomeComponent {
  readonly hubUrl = HUB_URL;
}
