import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/** Hub frontend URL — manager login lives here */
const HUB_URL = 'https://sass-hub-v3-nx-production-f0c6.up.railway.app';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  template: `
    <div class="welcome-page">

      <!-- ── Hero ── -->
      <section class="hero">
        <!-- Decorative blobs -->
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>

        <div class="hero-inner">
          <div class="eyebrow">
            <mat-icon>local_fire_department</mat-icon>
            <span>Découvrez les meilleurs food trucks</span>
          </div>
          <h1 class="hero-title">
            La nourriture de rue<br/>
            <span class="accent">réinventée</span> pour vous
          </h1>
          <p class="hero-sub">
            Trouvez les food trucks autour de vous, explorez leurs menus
            et commandez en quelques secondes — où que vous soyez.
          </p>
        </div>
      </section>

      <!-- ── Stats bar ── -->
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">50+</span>
          <span class="stat-label">Food trucks</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-value">1 200+</span>
          <span class="stat-label">Commandes / mois</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <span class="stat-value">4.8 ★</span>
          <span class="stat-label">Note moyenne</span>
        </div>
      </div>

      <!-- ── Cards ── -->
      <section class="cards-section">
        <div class="cards">

          <!-- Manager card -->
          <div class="card card-manager">
            <div class="card-glow manager-glow"></div>
            <div class="card-icon manager-icon">
              <mat-icon>admin_panel_settings</mat-icon>
            </div>
            <div class="card-body">
              <h2>Je suis gérant</h2>
              <p>
                Gérez votre food truck en temps réel : menu, commandes,
                localisation et statistiques depuis votre espace dédié.
              </p>
              <ul class="feature-list">
                <li><mat-icon>check_circle</mat-icon> Tableau de bord en temps réel</li>
                <li><mat-icon>check_circle</mat-icon> Gestion des commandes</li>
                <li><mat-icon>check_circle</mat-icon> Localisation & horaires</li>
              </ul>
            </div>
            <a [href]="hubUrl" class="btn btn-manager">
              <mat-icon>login</mat-icon>
              Se connecter via le Hub
            </a>
          </div>

          <!-- Customer card -->
          <div class="card card-customer">
            <div class="card-glow customer-glow"></div>
            <div class="card-icon customer-icon">
              <mat-icon>storefront</mat-icon>
            </div>
            <div class="card-body">
              <h2>Je suis client</h2>
              <p>
                Explorez les food trucks près de chez vous, consultez les menus
                et commandez en quelques clics — sans abonnement.
              </p>
              <ul class="feature-list">
                <li><mat-icon>check_circle</mat-icon> Recherche géolocalisée</li>
                <li><mat-icon>check_circle</mat-icon> Menus & disponibilités live</li>
                <li><mat-icon>check_circle</mat-icon> Suivi de commande</li>
              </ul>
            </div>
            <div class="card-actions">
              <a routerLink="/register" class="btn btn-customer">
                <mat-icon>person_add</mat-icon>
                Créer mon compte
              </a>
              <a routerLink="/login" class="btn-ghost">
                Déjà un compte ? <strong>Se connecter</strong>
              </a>
            </div>
          </div>

        </div>
      </section>

    </div>
  `,
  styles: [`
    /* ════════════════════════════════════════
       PAGE WRAPPER
    ════════════════════════════════════════ */
    .welcome-page {
      min-height: calc(100vh - 56px);
      background: #080810;
      overflow: hidden;
    }

    /* ════════════════════════════════════════
       HERO
    ════════════════════════════════════════ */
    .hero {
      position: relative;
      text-align: center;
      padding: 80px 24px 56px;
      overflow: hidden;

      /* Dot grid pattern */
      &::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
        background-size: 28px 28px;
        z-index: 0;
        pointer-events: none;
        mask-image: radial-gradient(ellipse 60% 50% at 50% 0%, black 30%, transparent 80%);
      }
    }

    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
    }
    .blob-1 {
      width: 600px; height: 400px;
      background: rgba(249,115,22,0.09);
      top: -120px; left: 50%;
      transform: translateX(-50%);
    }
    .blob-2 {
      width: 300px; height: 300px;
      background: rgba(139,92,246,0.07);
      top: 40px; right: -60px;
    }

    .hero-inner {
      position: relative;
      z-index: 1;
      max-width: 680px;
      margin: 0 auto;
      animation: fadeUp 500ms ease both;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(249,115,22,0.1);
      border: 1px solid rgba(249,115,22,0.2);
      border-radius: 99px;
      padding: 6px 16px;
      font-size: 13px;
      font-weight: 500;
      color: #fb923c;
      margin-bottom: 28px;

      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .hero-title {
      font-size: clamp(32px, 6vw, 52px);
      font-weight: 800;
      color: #ececf0;
      line-height: 1.15;
      letter-spacing: -0.03em;
      margin-bottom: 20px;
    }

    .accent { color: #fb923c; }

    .hero-sub {
      font-size: clamp(15px, 2vw, 17px);
      color: #8b8ba0;
      line-height: 1.7;
      max-width: 540px;
      margin: 0 auto;
    }

    /* ════════════════════════════════════════
       STATS BAR
    ════════════════════════════════════════ */
    .stats-bar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      padding: 16px 24px 48px;
      animation: fadeUp 500ms 200ms ease both;
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 0 28px;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 800;
      color: #f0f0f5;
      letter-spacing: -0.5px;
    }

    .stat-label {
      font-size: 12px;
      color: #55556a;
      font-weight: 500;
    }

    .stat-sep {
      width: 1px;
      height: 32px;
      background: rgba(255,255,255,0.07);
    }

    /* ════════════════════════════════════════
       CARDS SECTION
    ════════════════════════════════════════ */
    .cards-section {
      padding: 0 20px 72px;
      animation: fadeUp 500ms 100ms ease both;
    }

    .cards {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      max-width: 920px;
      margin: 0 auto;
    }

    .card {
      position: relative;
      background: #111118;
      border: 1px solid #27273a;
      border-radius: 20px;
      padding: 32px 28px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow: hidden;
      transition: border-color 200ms ease, transform 200ms ease;

      &:hover {
        transform: translateY(-2px);
        border-color: #3d3d55;
      }
    }

    .card-glow {
      position: absolute;
      width: 200px; height: 200px;
      border-radius: 50%;
      filter: blur(60px);
      top: -60px; right: -40px;
      pointer-events: none;
      opacity: 0.5;
    }
    .manager-glow { background: rgba(139,92,246,0.15); }
    .customer-glow { background: rgba(249,115,22,0.12); }

    .card-icon {
      width: 56px; height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon { font-size: 26px; width: 26px; height: 26px; }
    }
    .manager-icon {
      background: rgba(139,92,246,0.12);
      border: 1px solid rgba(139,92,246,0.25);
      mat-icon { color: #a78bfa; }
    }
    .customer-icon {
      background: rgba(249,115,22,0.12);
      border: 1px solid rgba(249,115,22,0.25);
      mat-icon { color: #fb923c; }
    }

    .card-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;

      h2 {
        font-size: 20px;
        font-weight: 700;
        color: #ececf0;
        margin: 0;
      }

      p {
        font-size: 14px;
        color: #8b8ba0;
        line-height: 1.65;
        margin: 0;
      }
    }

    .feature-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 4px 0 0;
      padding: 0;

      li {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: rgba(236,236,240,0.6);

        mat-icon {
          font-size: 15px;
          width: 15px;
          height: 15px;
          color: #22c55e;
          flex-shrink: 0;
        }
      }
    }

    /* ── Buttons ── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 150ms ease;
      cursor: pointer;
      width: 100%;

      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .btn-manager {
      background: rgba(139,92,246,0.12);
      border: 1px solid rgba(139,92,246,0.35);
      color: #a78bfa;
      &:hover {
        background: rgba(139,92,246,0.2);
        border-color: rgba(139,92,246,0.6);
        color: #c4b5fd;
      }
    }

    .card-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .btn-customer {
      background: #f97316;
      border: 1px solid #f97316;
      color: white;
      &:hover {
        background: #fb923c;
        border-color: #fb923c;
      }
    }

    .btn-ghost {
      text-align: center;
      font-size: 13px;
      color: rgba(236,236,240,0.45);
      text-decoration: none;
      padding: 4px 0;
      transition: color 150ms ease;
      strong { color: rgba(236,236,240,0.75); font-weight: 600; }
      &:hover { color: rgba(236,236,240,0.7); strong { color: #ececf0; } }
    }

    /* ════════════════════════════════════════
       RESPONSIVE
    ════════════════════════════════════════ */
    @media (max-width: 767px) {
      .hero { padding: 48px 20px 40px; }

      .blob-1 { width: 300px; height: 300px; top: -100px; }
      .blob-2 { display: none; }

      .cards { grid-template-columns: 1fr; gap: 16px; }

      .card { padding: 24px 20px; }

      .feature-list { display: none; }
    }

    @media (min-width: 768px) and (max-width: 1023px) {
      .cards { max-width: 700px; gap: 16px; }
    }

    @media (min-width: 1200px) {
      .hero { padding: 100px 24px 72px; }
      .cards { max-width: 1040px; gap: 28px; }
      .card { padding: 40px 36px; }
    }
  `],
})
export class WelcomeComponent {
  readonly hubUrl = HUB_URL;
}
