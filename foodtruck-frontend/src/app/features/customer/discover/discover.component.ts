import { Component, inject, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TruckService, Truck } from '../../../core/services/truck.service';
import { MapService } from '../../../core/services/map.service';

type SortOption = 'name' | 'rating' | 'distance' | 'open_first';
type ViewMode = 'list' | 'map' | 'split';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  template: `
    <!-- ════════════ HERO ════════════ -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-eyebrow">
          <mat-icon>local_fire_department</mat-icon>
          <span>Découvrir</span>
        </div>
        <h1 class="hero-title">
          Les meilleurs <span class="accent">food trucks</span><br/>près de chez vous
        </h1>
        <p class="hero-sub">Recherchez par nom, cuisine ou quartier — commandez directement.</p>

        <!-- ── Search row ── -->
        <div class="search-row">
          <!-- Name / cuisine search -->
          <div class="search-box" [class.focused]="searchFocused">
            <mat-icon class="sb-icon">search</mat-icon>
            <input
              class="sb-input"
              type="text"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              (focus)="searchFocused = true"
              (blur)="searchFocused = false"
              placeholder="Pizza, tacos, burger…"
              autocomplete="off"
            />
            <button *ngIf="searchQuery()" class="sb-clear" (click)="searchQuery.set('')" type="button">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Zone search -->
          <div class="zone-box" [class.focused]="zoneFocused">
            <mat-icon class="sb-icon">place</mat-icon>
            <input
              class="sb-input"
              type="text"
              [ngModel]="zoneQuery()"
              (ngModelChange)="zoneQuery.set($event)"
              (focus)="zoneFocused = true"
              (blur)="zoneFocused = false"
              (keyup.enter)="searchZone()"
              placeholder="Ville, quartier, adresse…"
              autocomplete="off"
            />
            <button *ngIf="zoneQuery()" class="sb-clear" (click)="clearZone()" type="button">
              <mat-icon>close</mat-icon>
            </button>
            <button class="zone-search-btn" (click)="searchZone()" [disabled]="zoneSearching()" type="button">
              <mat-spinner *ngIf="zoneSearching()" diameter="14"></mat-spinner>
              <mat-icon *ngIf="!zoneSearching()">arrow_forward</mat-icon>
            </button>
          </div>

          <!-- GPS -->
          <button
            class="gps-btn"
            (click)="detectLocation()"
            [class.active]="userLat() !== null"
            [disabled]="gpsLoading()"
            matTooltip="{{ userLat() !== null ? 'Position activée — cliquer pour désactiver' : 'Utiliser ma position' }}"
          >
            <mat-spinner *ngIf="gpsLoading()" diameter="16"></mat-spinner>
            <mat-icon *ngIf="!gpsLoading()">{{ userLat() !== null ? 'my_location' : 'location_searching' }}</mat-icon>
          </button>
        </div>

        <!-- Zone info chip -->
        <div *ngIf="zoneLabel()" class="zone-chip">
          <mat-icon>location_on</mat-icon>
          {{ zoneLabel() }}
          <button class="zone-chip-close" (click)="clearZone()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>
    </section>

    <!-- ════════════ MAIN LAYOUT ════════════ -->
    <div class="main-layout">

      <!-- ── Filters sidebar ── -->
      <aside class="filters-sidebar" [class.open]="filtersOpen()">
        <div class="sidebar-header">
          <span class="sidebar-title">
            <mat-icon>tune</mat-icon> Filtres
          </span>
          <button class="sidebar-reset" (click)="resetFilters()" *ngIf="hasActiveFilters()">
            Tout effacer
          </button>
          <button class="sidebar-close" (click)="filtersOpen.set(false)">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Status -->
        <div class="filter-section">
          <h4 class="filter-label">Statut</h4>
          <div class="toggle-group">
            <button
              class="tog-btn"
              [class.active]="statusFilter() === 'all'"
              (click)="statusFilter.set('all')"
            >Tous</button>
            <button
              class="tog-btn"
              [class.active]="statusFilter() === 'open'"
              (click)="statusFilter.set('open')"
            >
              <span class="green-dot"></span> Ouverts
            </button>
          </div>
        </div>

        <!-- Cuisine types -->
        <div class="filter-section">
          <h4 class="filter-label">Cuisine</h4>
          <div class="cuisine-list">
            <button
              *ngFor="let c of allCuisines()"
              class="cuisine-btn"
              [class.active]="selectedCuisines().has(c)"
              (click)="toggleCuisine(c)"
            >
              {{ cuisineEmoji(c) }} {{ c }}
            </button>
          </div>
        </div>

        <!-- Min rating -->
        <div class="filter-section" *ngIf="anyTruckHasRating()">
          <h4 class="filter-label">Note minimale</h4>
          <div class="rating-row">
            <button
              *ngFor="let r of [0, 3, 3.5, 4, 4.5]"
              class="rating-btn"
              [class.active]="minRating() === r"
              (click)="minRating.set(r)"
            >
              <ng-container *ngIf="r === 0">Toutes</ng-container>
              <ng-container *ngIf="r > 0">
                <mat-icon class="star-icon">star</mat-icon>{{ r }}+
              </ng-container>
            </button>
          </div>
        </div>

        <!-- Distance (only when position known) -->
        <div class="filter-section" *ngIf="userLat() !== null">
          <h4 class="filter-label">Rayon : <strong>{{ radiusKm() }} km</strong></h4>
          <div class="radius-row">
            <button
              *ngFor="let r of [2, 5, 10, 20, 50]"
              class="radius-btn"
              [class.active]="radiusKm() === r"
              (click)="radiusKm.set(r)"
            >{{ r }} km</button>
          </div>
        </div>

        <!-- Sort -->
        <div class="filter-section">
          <h4 class="filter-label">Trier par</h4>
          <div class="sort-list">
            <button
              class="sort-btn"
              [class.active]="sortBy() === 'open_first'"
              (click)="sortBy.set('open_first')"
            >
              <mat-icon>radio_button_checked</mat-icon> Ouverts en premier
            </button>
            <button
              class="sort-btn"
              [class.active]="sortBy() === 'name'"
              (click)="sortBy.set('name')"
            >
              <mat-icon>sort_by_alpha</mat-icon> Nom A → Z
            </button>
            <button
              class="sort-btn"
              [class.active]="sortBy() === 'rating'"
              (click)="sortBy.set('rating')"
            >
              <mat-icon>star</mat-icon> Meilleures notes
            </button>
            <button
              *ngIf="userLat() !== null"
              class="sort-btn"
              [class.active]="sortBy() === 'distance'"
              (click)="sortBy.set('distance')"
            >
              <mat-icon>near_me</mat-icon> Distance
            </button>
          </div>
        </div>
      </aside>

      <!-- ── Right panel ── -->
      <div class="results-panel">

        <!-- ── Toolbar ── -->
        <div class="toolbar">
          <div class="toolbar-left">
            <button class="filter-toggle-btn" (click)="filtersOpen.update(v => !v)">
              <mat-icon>tune</mat-icon>
              Filtres
              <span *ngIf="activeFilterCount() > 0" class="filter-count">{{ activeFilterCount() }}</span>
            </button>
            <span class="results-count" *ngIf="!truckService.trucks.isLoading()">
              {{ finalTrucks().length }} résultat{{ finalTrucks().length > 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Active filter chips -->
          <div class="active-chips">
            <span *ngIf="statusFilter() === 'open'" class="chip chip-green">
              <mat-icon>radio_button_checked</mat-icon> Ouverts
              <button (click)="statusFilter.set('all')"><mat-icon>close</mat-icon></button>
            </span>
            <span *ngFor="let c of Array.from(selectedCuisines())" class="chip chip-orange">
              {{ c }}
              <button (click)="toggleCuisine(c)"><mat-icon>close</mat-icon></button>
            </span>
            <span *ngIf="minRating() > 0" class="chip chip-yellow">
              <mat-icon>star</mat-icon> {{ minRating() }}+
              <button (click)="minRating.set(0)"><mat-icon>close</mat-icon></button>
            </span>
          </div>

          <!-- View modes -->
          <div class="view-modes">
            <button class="vm-btn" [class.active]="viewMode() === 'list'" (click)="setView('list')" matTooltip="Vue liste">
              <mat-icon>view_agenda</mat-icon>
            </button>
            <button class="vm-btn" [class.active]="viewMode() === 'split'" (click)="setView('split')" matTooltip="Vue partagée">
              <mat-icon>view_column</mat-icon>
            </button>
            <button class="vm-btn" [class.active]="viewMode() === 'map'" (click)="setView('map')" matTooltip="Vue carte">
              <mat-icon>map</mat-icon>
            </button>
          </div>
        </div>

        <!-- ── Content area ── -->
        <div class="content-area" [class.split-mode]="viewMode() === 'split'">

          <!-- List / cards -->
          <div
            class="list-pane"
            [class.hidden]="viewMode() === 'map'"
          >
            <!-- Loading -->
            <div *ngIf="truckService.trucks.isLoading()" class="state-box">
              <mat-spinner diameter="36"></mat-spinner>
              <p>Chargement des food trucks…</p>
            </div>

            <!-- Error -->
            <div *ngIf="truckService.trucks.error() && !truckService.trucks.isLoading()" class="state-box error">
              <div class="state-icon-box error">
                <mat-icon>wifi_off</mat-icon>
              </div>
              <h3>Connexion impossible</h3>
              <p>Vérifiez votre connexion et réessayez.</p>
            </div>

            <!-- Empty -->
            <div
              *ngIf="!truckService.trucks.isLoading() && !truckService.trucks.error() && finalTrucks().length === 0"
              class="state-box"
            >
              <div class="state-icon-box">
                <mat-icon>lunch_dining</mat-icon>
              </div>
              <h3>Aucun truck trouvé</h3>
              <p *ngIf="hasActiveFilters() || searchQuery() || zoneLabel()">
                Essayez d'élargir vos filtres ou votre zone de recherche.
              </p>
              <p *ngIf="!hasActiveFilters() && !searchQuery() && !zoneLabel()">
                Aucun food truck disponible pour l'instant. Revenez bientôt !
              </p>
              <button *ngIf="hasActiveFilters() || searchQuery()" class="reset-link" (click)="resetAll()">
                Réinitialiser tous les filtres
              </button>
            </div>

            <!-- Cards grid -->
            <div
              class="trucks-grid"
              *ngIf="!truckService.trucks.isLoading() && !truckService.trucks.error() && finalTrucks().length > 0"
            >
              <a
                *ngFor="let truck of finalTrucks()"
                [routerLink]="['/truck', truck.id]"
                class="truck-card"
                [class.closed-card]="!truck.isOpen"
              >
                <!-- Media -->
                <div class="card-media">
                  <img *ngIf="truck.imageUrl" [src]="truck.imageUrl" [alt]="truck.name" loading="lazy" />
                  <div *ngIf="!truck.imageUrl" class="card-placeholder">
                    <span class="placeholder-emoji">{{ cuisineEmoji(truck.cuisineType ?? '') }}</span>
                  </div>
                  <div class="status-badge" [class.open]="truck.isOpen">
                    <span class="dot"></span>
                    {{ truck.isOpen ? 'Ouvert' : 'Fermé' }}
                  </div>
                  <div *ngIf="truck.cuisineType" class="cuisine-tag">{{ truck.cuisineType }}</div>
                </div>

                <!-- Body -->
                <div class="card-body">
                  <div class="card-row-top">
                    <span class="truck-name">{{ truck.name }}</span>
                    <span *ngIf="truck.rating" class="rating-chip">
                      <mat-icon>star</mat-icon>{{ truck.rating }}
                    </span>
                  </div>

                  <p *ngIf="truck.description" class="truck-desc">{{ truck.description }}</p>

                  <div class="card-meta">
                    <span *ngIf="distanceTo(truck) !== null" class="meta-chip distance">
                      <mat-icon>near_me</mat-icon>{{ distanceTo(truck) | number:'1.1-1' }} km
                    </span>
                    <span *ngIf="truck.address && distanceTo(truck) === null" class="meta-chip">
                      <mat-icon>location_on</mat-icon>{{ truck.address }}
                    </span>
                  </div>
                </div>

                <!-- Footer -->
                <div class="card-footer">
                  <span class="cta">Voir le menu</span>
                  <mat-icon class="cta-arrow">arrow_forward</mat-icon>
                </div>
              </a>
            </div>
          </div>

          <!-- Map pane -->
          <div
            class="map-pane"
            [class.hidden]="viewMode() === 'list'"
            [class.full]="viewMode() === 'map'"
          >
            <div id="discover-map" class="map-el"></div>
            <div class="map-info-bar">
              <mat-icon>info_outline</mat-icon>
              {{ trucksOnMap() }} truck{{ trucksOnMap() > 1 ? 's' : '' }} localisé{{ trucksOnMap() > 1 ? 's' : '' }} sur la carte
              <span *ngIf="userLat() !== null" class="map-info-gps">
                · Position GPS activée
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ─── Reset / base ─── */
    :host {
      display: block;
      background: #0a0a0f;
      min-height: 100vh;
    }

    /* ─── Hero ─── */
    .hero {
      background:
        radial-gradient(ellipse 80% 60% at 50% -5%, rgba(249,115,22,0.16) 0%, transparent 70%),
        #0a0a0f;
      padding: 64px 24px 52px;
      border-bottom: 1px solid #1a1a28;
    }

    .hero-inner {
      max-width: 780px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
      text-align: center;
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #fb923c;
      background: rgba(249,115,22,0.1);
      border: 1px solid rgba(249,115,22,0.2);
      padding: 5px 14px;
      border-radius: 100px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .hero-title {
      margin: 0;
      font-size: clamp(26px, 4.5vw, 40px);
      font-weight: 800;
      line-height: 1.15;
      color: #ececf0;
      letter-spacing: -0.5px;
      .accent { color: #fb923c; }
    }

    .hero-sub {
      margin: 0;
      font-size: 15px;
      color: #8b8ba0;
      line-height: 1.6;
    }

    /* ─── Search row ─── */
    .search-row {
      display: flex;
      gap: 10px;
      width: 100%;
      max-width: 720px;
      flex-wrap: wrap;
    }

    .search-box, .zone-box {
      flex: 1;
      min-width: 200px;
      display: flex;
      align-items: center;
      gap: 8px;
      height: 50px;
      background: #141420;
      border: 1px solid #2a2a3c;
      border-radius: 14px;
      padding: 0 12px;
      transition: border-color 200ms, box-shadow 200ms;

      &.focused {
        border-color: rgba(249,115,22,0.45);
        box-shadow: 0 0 0 3px rgba(249,115,22,0.07);
      }
    }

    .sb-icon {
      color: #5c5c70;
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .sb-input {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      font-size: 14px;
      color: #ececf0;
      font-family: inherit;
      min-width: 0;
      &::placeholder { color: #4a4a60; }
    }

    .sb-clear {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      color: #4a4a60;
      flex-shrink: 0;
      transition: color 150ms;
      &:hover { color: #8b8ba0; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .zone-search-btn {
      background: rgba(249,115,22,0.12);
      border: none;
      border-radius: 8px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #fb923c;
      flex-shrink: 0;
      transition: background 150ms;
      &:hover:not(:disabled) { background: rgba(249,115,22,0.22); }
      &:disabled { opacity: 0.5; cursor: default; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    .gps-btn {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      border: 1px solid #2a2a3c;
      background: #141420;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #5c5c70;
      flex-shrink: 0;
      transition: all 150ms;
      &:hover:not(:disabled) {
        border-color: rgba(249,115,22,0.4);
        color: #fb923c;
        background: rgba(249,115,22,0.08);
      }
      &.active {
        border-color: rgba(34,197,94,0.4);
        color: #22c55e;
        background: rgba(34,197,94,0.08);
      }
      &:disabled { opacity: 0.5; cursor: default; }
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }

    /* Zone chip */
    .zone-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(34,197,94,0.1);
      border: 1px solid rgba(34,197,94,0.25);
      border-radius: 100px;
      padding: 5px 12px 5px 10px;
      font-size: 13px;
      color: #4ade80;
      font-weight: 500;
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
    }

    .zone-chip-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      color: inherit;
      opacity: 0.6;
      margin-left: 2px;
      &:hover { opacity: 1; }
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    /* ─── Main layout ─── */
    .main-layout {
      display: flex;
      min-height: calc(100vh - 290px);
    }

    /* ─── Filters sidebar ─── */
    .filters-sidebar {
      width: 240px;
      flex-shrink: 0;
      background: #0e0e18;
      border-right: 1px solid #1a1a28;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 0;
      overflow-y: auto;
      transition: transform 250ms ease;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 20px;
      padding-bottom: 14px;
      border-bottom: 1px solid #1a1a28;
    }

    .sidebar-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 700;
      color: #ececf0;
      flex: 1;
      mat-icon { font-size: 17px; width: 17px; height: 17px; color: #fb923c; }
    }

    .sidebar-reset {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 11px;
      color: #fb923c;
      font-family: inherit;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 150ms;
      &:hover { background: rgba(249,115,22,0.1); }
    }

    .sidebar-close {
      display: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      color: #5c5c70;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    .filter-section {
      margin-bottom: 22px;
    }

    .filter-label {
      margin: 0 0 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #5c5c70;
    }

    /* Toggle group (Tous / Ouverts) */
    .toggle-group {
      display: flex;
      gap: 6px;
    }

    .tog-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 7px 10px;
      border-radius: 8px;
      border: 1px solid #2a2a3c;
      background: rgba(255,255,255,0.03);
      font-size: 12px;
      font-weight: 500;
      color: #8b8ba0;
      cursor: pointer;
      font-family: inherit;
      transition: all 150ms;
      &:hover { border-color: rgba(249,115,22,0.3); color: #ececf0; }
      &.active {
        background: rgba(249,115,22,0.1);
        border-color: rgba(249,115,22,0.4);
        color: #fb923c;
        font-weight: 600;
      }
    }

    .green-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 5px #22c55e;
    }

    /* Cuisines */
    .cuisine-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cuisine-btn {
      text-align: left;
      padding: 7px 10px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: none;
      font-size: 13px;
      color: #8b8ba0;
      cursor: pointer;
      font-family: inherit;
      transition: all 150ms;
      &:hover { background: rgba(255,255,255,0.04); color: #ececf0; border-color: #2a2a3c; }
      &.active {
        background: rgba(249,115,22,0.1);
        border-color: rgba(249,115,22,0.3);
        color: #fb923c;
        font-weight: 600;
      }
    }

    /* Rating buttons */
    .rating-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .rating-btn {
      display: flex;
      align-items: center;
      gap: 3px;
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid #2a2a3c;
      background: rgba(255,255,255,0.03);
      font-size: 12px;
      font-weight: 500;
      color: #8b8ba0;
      cursor: pointer;
      font-family: inherit;
      transition: all 150ms;
      &:hover { border-color: rgba(245,158,11,0.3); color: #f59e0b; }
      &.active { background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.4); color: #f59e0b; font-weight: 600; }
    }

    .star-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      color: #f59e0b;
    }

    /* Radius */
    .radius-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .radius-btn {
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid #2a2a3c;
      background: rgba(255,255,255,0.03);
      font-size: 12px;
      font-weight: 500;
      color: #8b8ba0;
      cursor: pointer;
      font-family: inherit;
      transition: all 150ms;
      &:hover { border-color: rgba(34,197,94,0.3); color: #4ade80; }
      &.active { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); color: #4ade80; font-weight: 600; }
    }

    /* Sort */
    .sort-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .sort-btn {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: none;
      font-size: 13px;
      color: #8b8ba0;
      cursor: pointer;
      font-family: inherit;
      text-align: left;
      transition: all 150ms;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { background: rgba(255,255,255,0.04); color: #ececf0; border-color: #2a2a3c; }
      &.active { background: rgba(249,115,22,0.1); border-color: rgba(249,115,22,0.2); color: #fb923c; font-weight: 600; }
    }

    /* ─── Results panel ─── */
    .results-panel {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    /* ─── Toolbar ─── */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      border-bottom: 1px solid #1a1a28;
      background: #0c0c16;
      flex-wrap: wrap;
      flex-shrink: 0;
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .filter-toggle-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid #2a2a3c;
      background: rgba(255,255,255,0.03);
      font-size: 13px;
      font-weight: 500;
      color: #8b8ba0;
      cursor: pointer;
      font-family: inherit;
      transition: all 150ms;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { border-color: rgba(249,115,22,0.3); color: #ececf0; }
    }

    .filter-count {
      background: #fb923c;
      color: #000;
      font-size: 10px;
      font-weight: 700;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .results-count {
      font-size: 13px;
      color: #5c5c70;
      font-weight: 500;
      white-space: nowrap;
    }

    /* Active chips */
    .active-chips {
      display: flex;
      gap: 6px;
      flex: 1;
      flex-wrap: wrap;
      min-width: 0;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid transparent;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }

      button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        color: inherit;
        opacity: 0.7;
        margin-left: 2px;
        &:hover { opacity: 1; }
        mat-icon { font-size: 13px; width: 13px; height: 13px; }
      }

      &.chip-green {
        background: rgba(34,197,94,0.1);
        border-color: rgba(34,197,94,0.25);
        color: #4ade80;
      }
      &.chip-orange {
        background: rgba(249,115,22,0.1);
        border-color: rgba(249,115,22,0.25);
        color: #fb923c;
      }
      &.chip-yellow {
        background: rgba(245,158,11,0.1);
        border-color: rgba(245,158,11,0.25);
        color: #fbbf24;
      }
    }

    /* View modes */
    .view-modes {
      display: flex;
      gap: 2px;
      background: #0e0e18;
      border: 1px solid #1a1a28;
      border-radius: 10px;
      padding: 3px;
      flex-shrink: 0;
    }

    .vm-btn {
      width: 34px;
      height: 30px;
      border-radius: 7px;
      border: none;
      background: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #5c5c70;
      transition: all 150ms;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      &:hover { color: #ececf0; background: rgba(255,255,255,0.05); }
      &.active { background: rgba(249,115,22,0.15); color: #fb923c; }
    }

    /* ─── Content area ─── */
    .content-area {
      flex: 1;
      display: flex;
      overflow: hidden;
      min-height: 0;

      &.split-mode {
        .list-pane  { width: 50%; flex: none; border-right: 1px solid #1a1a28; }
        .map-pane   { width: 50%; flex: none; }
      }
    }

    /* ─── List pane ─── */
    .list-pane {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px;
      &.hidden { display: none; }

      &::-webkit-scrollbar { width: 5px; }
      &::-webkit-scrollbar-thumb { background: #2a2a3c; border-radius: 3px; }
    }

    /* ─── Map pane ─── */
    .map-pane {
      flex: 1;
      display: flex;
      flex-direction: column;
      &.hidden { display: none; }
    }

    .map-el {
      flex: 1;
      width: 100%;
      min-height: 400px;
    }

    .map-info-bar {
      padding: 8px 16px;
      font-size: 12px;
      color: #5c5c70;
      display: flex;
      align-items: center;
      gap: 5px;
      background: #0c0c16;
      border-top: 1px solid #1a1a28;
      flex-shrink: 0;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    .map-info-gps {
      color: #22c55e;
      font-weight: 500;
    }

    /* ─── State boxes ─── */
    .state-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      gap: 14px;
      text-align: center;
      color: #5c5c70;

      mat-spinner { margin-bottom: 4px; }

      p { margin: 0; font-size: 14px; }
      h3 { margin: 0; font-size: 18px; font-weight: 600; color: #ececf0; }
    }

    .state-icon-box {
      width: 70px;
      height: 70px;
      border-radius: 18px;
      background: rgba(249,115,22,0.07);
      border: 1px solid rgba(249,115,22,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon { font-size: 30px; width: 30px; height: 30px; color: #fb923c; }

      &.error {
        background: rgba(239,68,68,0.07);
        border-color: rgba(239,68,68,0.12);
        mat-icon { color: #f87171; }
      }
    }

    .reset-link {
      background: none;
      border: 1px solid rgba(249,115,22,0.3);
      border-radius: 8px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #fb923c;
      cursor: pointer;
      font-family: inherit;
      transition: all 150ms;
      &:hover { background: rgba(249,115,22,0.1); }
    }

    /* ─── Trucks grid ─── */
    .trucks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 18px;
    }

    /* ─── Truck card ─── */
    .truck-card {
      display: flex;
      flex-direction: column;
      background: #111118;
      border: 1px solid #1e1e2e;
      border-radius: 16px;
      overflow: hidden;
      text-decoration: none;
      cursor: pointer;
      transition: border-color 200ms, box-shadow 200ms, transform 200ms;

      &:hover {
        border-color: rgba(249,115,22,0.35);
        box-shadow: 0 10px 36px rgba(0,0,0,0.45);
        transform: translateY(-3px);
        .cta { color: #fb923c; }
        .cta-arrow { color: #fb923c; transform: translateX(3px); }
      }

      &.closed-card {
        opacity: 0.65;
        &:hover { opacity: 0.85; }
      }
    }

    .card-media {
      position: relative;
      height: 170px;
      background: #16161f;
      overflow: hidden;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .card-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #161622 0%, #1a1a2e 100%);
    }

    .placeholder-emoji {
      font-size: 56px;
      line-height: 1;
      filter: grayscale(0.2);
    }

    .status-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 600;
      backdrop-filter: blur(8px);
      color: #9ca3af;
      background: rgba(14,14,24,0.75);
      border: 1px solid rgba(255,255,255,0.1);

      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #4b5563;
        flex-shrink: 0;
      }

      &.open {
        color: #4ade80;
        border-color: rgba(34,197,94,0.35);
        .dot { background: #22c55e; box-shadow: 0 0 6px #22c55e; animation: blink 2s infinite; }
      }
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .cuisine-tag {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #fb923c;
      background: rgba(14,14,24,0.8);
      border: 1px solid rgba(249,115,22,0.3);
      padding: 3px 8px;
      border-radius: 6px;
      backdrop-filter: blur(6px);
    }

    .card-body {
      flex: 1;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .card-row-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .truck-name {
      font-size: 16px;
      font-weight: 700;
      color: #ececf0;
      line-height: 1.3;
    }

    .rating-chip {
      display: flex;
      align-items: center;
      gap: 3px;
      flex-shrink: 0;
      font-size: 12px;
      font-weight: 700;
      color: #f59e0b;
      background: rgba(245,158,11,0.1);
      border: 1px solid rgba(245,158,11,0.2);
      padding: 3px 8px;
      border-radius: 8px;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }

    .truck-desc {
      margin: 0;
      font-size: 12px;
      color: #5c5c70;
      line-height: 1.5;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .card-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: auto;
    }

    .meta-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #5c5c70;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
      &.distance {
        color: #22c55e;
        mat-icon { color: #22c55e; }
        font-weight: 600;
      }
    }

    .card-footer {
      padding: 10px 16px;
      border-top: 1px solid #1a1a28;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .cta {
      font-size: 13px;
      font-weight: 600;
      color: #5c5c70;
      transition: color 200ms;
    }

    .cta-arrow {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #5c5c70;
      transition: color 200ms, transform 200ms;
    }

    /* ─── Responsive ─── */
    @media (max-width: 900px) {
      /* Sidebar becomes a slide-over drawer */
      .filters-sidebar {
        position: fixed;
        top: 56px;           /* below navbar */
        left: 0;
        bottom: 0;
        z-index: 190;
        width: min(300px, 85vw);
        transform: translateX(-100%);
        box-shadow: 4px 0 32px rgba(0,0,0,0.7);
        overflow-y: auto;

        &.open { transform: translateX(0); }
      }

      /* Overlay behind drawer */
      .filters-sidebar.open::before {
        content: '';
        position: fixed;
        inset: 0;
        z-index: -1;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(2px);
      }

      .sidebar-close {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .content-area.split-mode {
        .list-pane { width: 100%; }
        .map-pane { display: none; }
      }
    }

    /* Extra offset on mobile — account for bottom nav (64px) */
    @media (max-width: 767px) {
      .filters-sidebar {
        bottom: 64px;
      }
    }

    @media (max-width: 640px) {
      .hero {
        padding: 32px 16px 28px;
      }

      .hero-eyebrow { font-size: 10px; padding: 4px 12px; }

      .search-row {
        flex-direction: column;
        gap: 8px;
        .zone-box { min-width: unset; }
        .gps-btn { width: 100%; border-radius: 12px; height: 44px; }
        .search-box, .zone-box { height: 44px; }
      }

      .zone-chip { font-size: 12px; padding: 5px 12px; }

      .trucks-grid {
        grid-template-columns: 1fr;
        padding: 12px;
        gap: 12px;
      }

      .toolbar {
        padding: 8px 12px;
        flex-wrap: wrap;
        gap: 8px;
        .active-chips { order: 3; width: 100%; }
      }

      /* Tighter map on mobile */
      .map-wrapper { height: 320px; }
    }

    @media (min-width: 641px) and (max-width: 900px) {
      .trucks-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `],
})
export class DiscoverComponent implements OnInit, OnDestroy {
  protected readonly truckService = inject(TruckService);
  private readonly mapService = inject(MapService);
  private readonly snackBar = inject(MatSnackBar);

  // Expose Array for template iteration of Set
  readonly Array = Array;

  // ── Search ──
  readonly searchQuery = signal('');
  readonly zoneQuery = signal('');
  readonly zoneLabel = signal('');
  readonly zoneLat = signal<number | null>(null);
  readonly zoneLng = signal<number | null>(null);
  readonly zoneSearching = signal(false);

  // ── GPS ──
  readonly userLat = signal<number | null>(null);
  readonly userLng = signal<number | null>(null);
  readonly gpsLoading = signal(false);

  // ── Filters ──
  readonly statusFilter = signal<'all' | 'open'>('all');
  readonly selectedCuisines = signal<Set<string>>(new Set());
  readonly minRating = signal(0);
  readonly radiusKm = signal(10);
  readonly sortBy = signal<SortOption>('open_first');

  // ── UI State ──
  readonly viewMode = signal<ViewMode>('list');
  readonly filtersOpen = signal(window.innerWidth >= 900);
  searchFocused = false;
  zoneFocused = false;

  // ── Cuisine list ──
  readonly allCuisines = computed(() => {
    const trucks = this.truckService.trucks.value() ?? [];
    const set = new Set<string>();
    for (const t of trucks) {
      if (t.cuisineType) set.add(t.cuisineType);
    }
    return Array.from(set).sort();
  });

  readonly anyTruckHasRating = computed(() =>
    (this.truckService.trucks.value() ?? []).some(t => t.rating != null)
  );

  // ── Effective origin (GPS > zone > null) ──
  private readonly effectiveLat = computed(() => this.userLat() ?? this.zoneLat());
  private readonly effectiveLng = computed(() => this.userLng() ?? this.zoneLng());

  // ── Filtered + sorted trucks ──
  readonly finalTrucks = computed<Truck[]>(() => {
    const trucks = this.truckService.trucks.value() ?? [];
    const query = this.searchQuery().toLowerCase().trim();
    const cuisines = this.selectedCuisines();
    const status = this.statusFilter();
    const rating = this.minRating();
    const radius = this.radiusKm();
    const lat = this.effectiveLat();
    const lng = this.effectiveLng();

    let result = trucks.filter((t) => {
      // Text search
      const matchSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        (t.cuisineType ?? '').toLowerCase().includes(query) ||
        (t.description ?? '').toLowerCase().includes(query) ||
        (t.address ?? '').toLowerCase().includes(query);

      // Status
      const matchStatus = status === 'all' || t.isOpen;

      // Cuisine
      const matchCuisine = cuisines.size === 0 || (t.cuisineType != null && cuisines.has(t.cuisineType));

      // Rating
      const matchRating = rating === 0 || (t.rating != null && t.rating >= rating);

      // Distance (only filter when we have a reference point)
      let matchRadius = true;
      if (lat !== null && lng !== null && t.latitude != null && t.longitude != null) {
        matchRadius = haversineKm(lat, lng, t.latitude, t.longitude) <= radius;
      }

      return matchSearch && matchStatus && matchCuisine && matchRating && matchRadius;
    });

    // Sort
    const sort = this.sortBy();
    result = [...result].sort((a, b) => {
      if (sort === 'open_first') {
        if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      }
      if (sort === 'rating') {
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
      if (sort === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'distance' && lat !== null && lng !== null) {
        const da = a.latitude && a.longitude ? haversineKm(lat, lng, a.latitude, a.longitude) : 9999;
        const db = b.latitude && b.longitude ? haversineKm(lat, lng, b.latitude, b.longitude) : 9999;
        return da - db;
      }
      return 0;
    });

    return result;
  });

  readonly trucksOnMap = computed(() =>
    this.finalTrucks().filter(t => t.latitude != null && t.longitude != null).length
  );

  readonly hasActiveFilters = computed(
    () =>
      this.statusFilter() !== 'all' ||
      this.selectedCuisines().size > 0 ||
      this.minRating() > 0
  );

  readonly activeFilterCount = computed(() => {
    let n = 0;
    if (this.statusFilter() === 'open') n++;
    n += this.selectedCuisines().size;
    if (this.minRating() > 0) n++;
    return n;
  });

  constructor() {
    effect(() => {
      const mode = this.viewMode();
      const trucks = this.finalTrucks();
      if (mode === 'map' || mode === 'split') {
        setTimeout(() => this.renderMap(trucks), 60);
      } else {
        this.mapService.destroyMap('discover-map');
      }
    });
  }

  ngOnInit(): void {
    this.autoGeolocate();
  }

  ngOnDestroy(): void {
    this.mapService.destroyMap('discover-map');
  }

  // ── Auto-geolocation on init ──
  private autoGeolocate(): void {
    if (!navigator.geolocation) return;
    this.gpsLoading.set(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.userLat.set(lat);
        this.userLng.set(lng);
        this.sortBy.set('distance');
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
          const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
          const data = await res.json();
          if (data?.address) {
            const a = data.address;
            const parts = [
              a.road ?? a.pedestrian ?? a.path,
              a.house_number,
              a.city ?? a.town ?? a.village ?? a.municipality,
            ].filter(Boolean);
            const label = parts.length > 0 ? parts.join(' ') : (data.display_name?.split(',').slice(0, 2).join(',') ?? '');
            this.zoneQuery.set(label);
            this.zoneLat.set(lat);
            this.zoneLng.set(lng);
            this.zoneLabel.set(label);
          }
        } catch {
          // Reverse geocoding failed — position is still active, just no label
        } finally {
          this.gpsLoading.set(false);
        }
      },
      () => {
        // Permission denied or error — fail silently
        this.gpsLoading.set(false);
      },
      { timeout: 8000 }
    );
  }

  // ── Helpers ──
  distanceTo(truck: Truck): number | null {
    const lat = this.effectiveLat();
    const lng = this.effectiveLng();
    if (lat === null || lng === null || truck.latitude == null || truck.longitude == null) return null;
    return haversineKm(lat, lng, truck.latitude, truck.longitude);
  }

  cuisineEmoji(cuisine: string): string {
    const map: Record<string, string> = {
      pizza: '🍕', burger: '🍔', tacos: '🌮', sushi: '🍣', thai: '🍜',
      indien: '🍛', mexicain: '🌯', japonais: '🍱', coréen: '🥢',
      méditerranéen: '🥙', grec: '🥙', libanais: '🧆', chinois: '🥡',
      américain: '🍟', végétarien: '🥗', vegan: '🌿', dessert: '🍰',
      glaces: '🍦', crêpes: '🥞', kebab: '🌯', poulet: '🍗',
      fruits_de_mer: '🦞', fish_and_chips: '🐟', brésilien: '🥩',
    };
    const key = cuisine.toLowerCase().replace(/\s+/g, '_');
    return map[key] ?? '🍽️';
  }

  // ── View ──
  setView(mode: ViewMode): void {
    if (mode === 'list') this.mapService.destroyMap('discover-map');
    this.viewMode.set(mode);
  }

  // ── GPS ──
  detectLocation(): void {
    if (this.userLat() !== null) {
      this.userLat.set(null);
      this.userLng.set(null);
      return;
    }
    if (!navigator.geolocation) {
      this.snackBar.open('Géolocalisation non supportée', 'OK', { duration: 3000 });
      return;
    }
    this.gpsLoading.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLat.set(pos.coords.latitude);
        this.userLng.set(pos.coords.longitude);
        this.gpsLoading.set(false);
        this.sortBy.set('distance');
        this.snackBar.open('Position GPS activée', 'OK', { duration: 2000 });
      },
      () => {
        this.gpsLoading.set(false);
        this.snackBar.open('Impossible d\'obtenir la position', 'OK', { duration: 3000 });
      },
      { timeout: 8000 }
    );
  }

  // ── Zone search ──
  async searchZone(): Promise<void> {
    const q = this.zoneQuery().trim();
    if (!q) return;
    this.zoneSearching.set(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'fr' } });
      const data = await res.json();
      if (data && data.length > 0) {
        this.zoneLat.set(parseFloat(data[0].lat));
        this.zoneLng.set(parseFloat(data[0].lon));
        this.zoneLabel.set(data[0].display_name.split(',').slice(0, 2).join(','));
        this.snackBar.open(`Zone : ${this.zoneLabel()}`, 'OK', { duration: 2500 });
      } else {
        this.snackBar.open('Zone introuvable. Essayez un autre terme.', 'OK', { duration: 3000 });
      }
    } catch {
      this.snackBar.open('Erreur lors de la recherche de zone', 'OK', { duration: 3000 });
    } finally {
      this.zoneSearching.set(false);
    }
  }

  clearZone(): void {
    this.zoneQuery.set('');
    this.zoneLabel.set('');
    this.zoneLat.set(null);
    this.zoneLng.set(null);
  }

  // ── Cuisine toggle ──
  toggleCuisine(c: string): void {
    const s = new Set(this.selectedCuisines());
    if (s.has(c)) s.delete(c);
    else s.add(c);
    this.selectedCuisines.set(s);
  }

  // ── Reset ──
  resetFilters(): void {
    this.statusFilter.set('all');
    this.selectedCuisines.set(new Set());
    this.minRating.set(0);
  }

  resetAll(): void {
    this.resetFilters();
    this.searchQuery.set('');
    this.clearZone();
  }

  // ── Map render ──
  private renderMap(trucks: Truck[]): void {
    const located = trucks.filter(t => t.latitude != null && t.longitude != null);
    const uLat = this.effectiveLat();
    const uLng = this.effectiveLng();

    let center: [number, number] = [48.8566, 2.3522];
    if (uLat !== null && uLng !== null) {
      center = [uLat, uLng];
    } else if (located.length > 0) {
      center = [located[0].latitude!, located[0].longitude!];
    }

    const map = this.mapService.initMap('discover-map', center, 12);

    // User position marker
    if (uLat !== null && uLng !== null) {
      this.mapService.createLocationMarker(map, uLat, uLng, false);
    }

    for (const truck of located) {
      const dist = this.distanceTo(truck);
      const popup = `
        <div style="min-width:170px;font-family:sans-serif;padding:2px 0;">
          <strong style="font-size:14px;color:#111827;">${truck.name}</strong><br/>
          <span style="font-size:11px;color:#6b7280;">${truck.cuisineType ?? ''}</span><br/>
          <span style="font-size:11px;color:${truck.isOpen ? '#16a34a' : '#6b7280'};">
            ${truck.isOpen ? '● Ouvert' : '○ Fermé'}
          </span>
          ${dist !== null ? `<span style="font-size:11px;color:#16a34a;margin-left:6px;">· ${dist.toFixed(1)} km</span>` : ''}
          <br/><br/>
          <a href="/truck/${truck.id}" style="color:#ea580c;font-size:12px;font-weight:700;text-decoration:none;">
            Voir le menu →
          </a>
        </div>`;

      this.mapService.createTruckMarker(map, {
        id: truck.id,
        lat: truck.latitude!,
        lng: truck.longitude!,
        label: truck.name,
        isOpen: truck.isOpen,
        popup,
      });
    }
  }
}
