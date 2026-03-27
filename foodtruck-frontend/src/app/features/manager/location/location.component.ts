import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { TruckService } from '../../../core/services/truck.service';
import { LocationService } from '../../../core/services/location.service';
import { MapService } from '../../../core/services/map.service';

@Component({
  selector: 'app-manager-location',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="location-container">
      <h1>Gestion de la localisation</h1>

      <!-- Current location display -->
      <mat-card class="location-card">
        <mat-card-header>
          <mat-card-title>Localisation actuelle</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="currentLocation()" class="current-location">
            <div class="location-info">
              <mat-icon>location_on</mat-icon>
              <div class="location-details">
                <p class="location-label">Latitude:</p>
                <p class="location-value">{{ currentLocation()?.latitude }}</p>
                <p class="location-label">Longitude:</p>
                <p class="location-value">{{ currentLocation()?.longitude }}</p>
                <ng-container *ngIf="currentLocation()?.address">
                  <p class="location-label">Adresse:</p>
                  <p class="location-value address-value">{{ currentLocation()?.address }}</p>
                </ng-container>
              </div>
            </div>
          </div>
          <div *ngIf="!currentLocation()" class="no-location">
            <mat-icon>location_off</mat-icon>
            <p>Aucune localisation enregistrée</p>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Interactive map -->
      <mat-card class="location-card map-card">
        <mat-card-header>
          <mat-card-title>Choisir sur la carte</mat-card-title>
          <mat-card-subtitle>Cliquez sur la carte pour définir la position du food truck</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div id="location-map" class="map-container"></div>
          <p class="map-hint" *ngIf="!mapLocationSet()">
            <mat-icon>touch_app</mat-icon>
            Cliquez sur la carte pour placer votre food truck
          </p>
          <p class="map-hint success" *ngIf="mapLocationSet()">
            <mat-icon>check_circle</mat-icon>
            Position sélectionnée — faites glisser le marqueur pour ajuster
          </p>
        </mat-card-content>
      </mat-card>

      <!-- Location update form -->
      <mat-card class="location-card">
        <mat-card-header>
          <mat-card-title>Mettre à jour la localisation</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="locationForm" (ngSubmit)="onUpdateLocation()">
            <button
              mat-raised-button
              color="accent"
              type="button"
              class="full-width gps-button"
              (click)="useGPS()"
              [disabled]="gpsLoading()"
            >
              <mat-spinner *ngIf="gpsLoading()" diameter="20" class="spinner"></mat-spinner>
              <mat-icon *ngIf="!gpsLoading()">my_location</mat-icon>
              {{ gpsLoading() ? 'Localisation en cours...' : 'Utiliser ma position GPS' }}
            </button>

            <div class="divider">
              <span>OU</span>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Adresse</mat-label>
              <input matInput formControlName="address" placeholder="Ex: 123 Rue de la Paix" />
              <mat-error *ngIf="locationForm.get('address')?.hasError('required')">L'adresse est requise</mat-error>
            </mat-form-field>

            <div class="coordinates-grid">
              <mat-form-field appearance="outline">
                <mat-label>Latitude</mat-label>
                <input matInput type="number" formControlName="latitude" step="0.000001" />
                <mat-error *ngIf="locationForm.get('latitude')?.hasError('required')">Requise</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Longitude</mat-label>
                <input matInput type="number" formControlName="longitude" step="0.000001" />
                <mat-error *ngIf="locationForm.get('longitude')?.hasError('required')">Requise</mat-error>
              </mat-form-field>
            </div>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="full-width"
              [disabled]="locationForm.invalid || updating()"
            >
              <mat-spinner *ngIf="updating()" diameter="20" class="spinner"></mat-spinner>
              <span *ngIf="!updating()">Mettre à jour la position</span>
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Weekly schedule -->
      <mat-card class="schedule-card">
        <mat-card-header>
          <mat-card-title>Horaires hebdomadaires</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table class="schedule-table">
            <thead>
              <tr>
                <th>Jour</th>
                <th>Ouverture</th>
                <th>Fermeture</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let day of weekDays">
                <td><strong>{{ dayLabels[day] }}</strong></td>
                <td>
                  <input
                    type="time"
                    class="time-input"
                    [value]="scheduleForm[day]?.open || ''"
                    (change)="onScheduleChange(day, 'open', $event)"
                  />
                </td>
                <td>
                  <input
                    type="time"
                    class="time-input"
                    [value]="scheduleForm[day]?.close || ''"
                    (change)="onScheduleChange(day, 'close', $event)"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <button
            mat-raised-button
            color="primary"
            (click)="onUpdateSchedule()"
            class="full-width"
            [disabled]="updatingSchedule()"
          >
            <mat-spinner *ngIf="updatingSchedule()" diameter="20" class="spinner"></mat-spinner>
            <span *ngIf="!updatingSchedule()">Mettre à jour les horaires</span>
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .location-container {
      padding: 24px;
      max-width: 700px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 32px;
      color: var(--text-primary, #ececf0);
      font-size: 28px;
    }

    .location-card,
    .schedule-card {
      margin-bottom: 24px;
      box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.4));
      background: var(--bg-card, #16161f) !important;
    }

    mat-card-header {
      padding: 16px;
    }

    mat-card-content {
      padding: 24px;
    }

    .current-location {
      background: rgba(34, 197, 94, 0.12);
      padding: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 16px;

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: var(--success, #22c55e);
        flex-shrink: 0;
      }
    }

    .location-info {
      display: flex;
      gap: 16px;
      flex: 1;
    }

    .location-details {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 12px;
      flex: 1;

      .location-label {
        margin: 0;
        color: var(--text-secondary, #8b8ba0);
        font-size: 12px;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .location-value {
        margin: 0 0 8px 0;
        color: var(--text-primary, #ececf0);
        font-size: 14px;
        font-weight: 500;
        font-family: monospace;

        &.address-value {
          font-family: inherit;
          font-size: 13px;
        }
      }
    }

    .no-location {
      text-align: center;
      padding: 24px;
      color: var(--text-muted, #5c5c70);

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--border, #27273a);
        margin-bottom: 12px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .map-card mat-card-content {
      padding: 0 0 16px 0;
    }

    .map-container {
      width: 100%;
      height: 380px;
      border-radius: 0;
      z-index: 1;
    }

    .map-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 24px 0;
      font-size: 13px;
      color: var(--text-muted, #5c5c70);

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      &.success {
        color: var(--success, #22c55e);
      }
    }

    .full-width {
      width: 100%;
      margin: 12px 0;
    }

    .gps-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 44px;
      font-size: 15px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .spinner {
        display: inline-block;
        margin-right: 0;
      }
    }

    .divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 20px 0;
      color: var(--text-muted, #5c5c70);
      font-size: 13px;

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--border, #27273a);
      }
    }

    .coordinates-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;

      mat-form-field {
        width: 100%;
      }
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 12px;
    }

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      .spinner {
        display: inline-block;
        margin-right: 0;
      }
    }

    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;

      th,
      td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid var(--border, #27273a);
      }

      th {
        background: var(--bg-secondary, #111118);
        font-weight: 600;
        color: var(--text-primary, #ececf0);
      }

      tr:last-child td {
        border-bottom: none;
      }

      td:first-child {
        min-width: 100px;
        font-weight: 500;
      }
    }

    .time-input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--border, #27273a);
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      box-sizing: border-box;
      background: var(--bg-input, #1a1a25);
      color: var(--text-primary, #ececf0);

      &:focus {
        outline: none;
        border-color: var(--accent, #f97316);
        box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
      }
    }

    @media (max-width: 600px) {
      .location-container {
        padding: 16px;
      }

      .coordinates-grid {
        grid-template-columns: 1fr;
      }

      .location-info {
        flex-direction: column;
      }

      .schedule-table {
        font-size: 13px;

        th,
        td {
          padding: 8px;
        }
      }
    }
  `],
})
export class ManagerLocationComponent implements OnDestroy {
  private readonly truckService = inject(TruckService);
  private readonly locationService = inject(LocationService);
  private readonly mapService = inject(MapService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  private map: any = null;
  private marker: any = null;

  readonly updating = signal(false);
  readonly updatingSchedule = signal(false);
  readonly gpsLoading = signal(false);
  readonly geocoding = signal(false);
  readonly mapLocationSet = signal(false);
  readonly currentLocation = signal<{ latitude: number; longitude: number; address?: string } | null>(null);

  readonly weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  readonly dayLabels: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
  };

  scheduleForm: Record<string, { open?: string; close?: string }> = {};

  readonly locationForm = this.fb.group({
    address: ['', Validators.required],
    latitude: [0, Validators.required],
    longitude: [0, Validators.required],
  });

  constructor() {
    this.initScheduleForm();
    this.loadLocation();
  }

  ngOnDestroy(): void {
    this.mapService.destroyMap('location-map');
  }

  private initScheduleForm(): void {
    for (const day of this.weekDays) {
      this.scheduleForm[day] = { open: '10:00', close: '22:00' };
    }
  }

  private async loadLocation(): Promise<void> {
    try {
      const truck = await firstValueFrom(this.truckService.getMyTruck());
      const loc = await firstValueFrom(this.locationService.getLocation(truck.id));
      if (loc) {
        this.locationForm.patchValue({
          address: loc.address ?? '',
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
        this.currentLocation.set({
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address ?? undefined,
        });
        // Init map centered on saved location
        setTimeout(() => this.initMap(loc.latitude, loc.longitude), 100);
      } else {
        // Init map centered on Paris by default
        setTimeout(() => this.initMap(48.8566, 2.3522), 100);
      }
    } catch (e) {
      setTimeout(() => this.initMap(48.8566, 2.3522), 100);
    }
  }

  private initMap(lat: number, lng: number): void {
    this.map = this.mapService.initMap('location-map', [lat, lng], 14);

    // Place initial marker if we have saved coords
    const savedLat = this.locationForm.value.latitude;
    const savedLng = this.locationForm.value.longitude;
    if (savedLat && savedLng && (savedLat !== 0 || savedLng !== 0)) {
      this.placeMarker(savedLat, savedLng);
      this.mapLocationSet.set(true);
    }

    // Click on map → place/move marker + fill form
    this.map.on('click', (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      this.placeMarker(clickLat, clickLng);
      this.locationForm.patchValue({ latitude: clickLat, longitude: clickLng });
      this.mapLocationSet.set(true);
      this.doReverseGeocode(clickLat, clickLng);
    });
  }

  private placeMarker(lat: number, lng: number): void {
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = this.mapService.createLocationMarker(this.map, lat, lng, true);
      // Draggable marker: update form on drag end
      this.marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this.locationForm.patchValue({ latitude: pos.lat, longitude: pos.lng });
        this.doReverseGeocode(pos.lat, pos.lng);
      });
    }
  }

  private async doReverseGeocode(lat: number, lng: number): Promise<void> {
    this.geocoding.set(true);
    const address = await this.mapService.reverseGeocode(lat, lng);
    this.geocoding.set(false);
    if (address) {
      this.locationForm.patchValue({ address });
    }
  }

  useGPS(): void {
    if (!navigator.geolocation) {
      this.snackBar.open('Geolocation non supportée', 'Fermer', { duration: 3000 });
      return;
    }

    this.gpsLoading.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.locationForm.patchValue({ latitude, longitude });
        this.currentLocation.set({ latitude, longitude });
        this.gpsLoading.set(false);
        this.snackBar.open('Position obtenue', 'Fermer', { duration: 2000 });
        // Center map + place marker
        if (this.map) {
          this.map.setView([latitude, longitude], 16);
          this.placeMarker(latitude, longitude);
          this.mapLocationSet.set(true);
          this.doReverseGeocode(latitude, longitude);
        }
      },
      (error) => {
        this.gpsLoading.set(false);
        console.error('Geolocation error:', error);
        this.snackBar.open('Erreur lors de l\'obtention de la position', 'Fermer', { duration: 3000 });
      }
    );
  }

  async onUpdateLocation(): Promise<void> {
    if (this.locationForm.invalid) return;

    this.updating.set(true);
    try {
      const truck = await firstValueFrom(this.truckService.getMyTruck());
      const formValue = this.locationForm.value;
      await firstValueFrom(
        this.locationService.upsertLocation(truck.id, {
          latitude: formValue.latitude ?? 0,
          longitude: formValue.longitude ?? 0,
          address: formValue.address ?? undefined,
        })
      );
      this.currentLocation.set({
        latitude: formValue.latitude ?? 0,
        longitude: formValue.longitude ?? 0,
        address: formValue.address ?? undefined,
      });
      this.snackBar.open('Localisation mise à jour', 'Fermer', { duration: 2000 });
    } catch (e) {
      console.error('Failed to update location', e);
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 2000 });
    } finally {
      this.updating.set(false);
    }
  }

  onScheduleChange(day: string, field: 'open' | 'close', event: any): void {
    const value = event.target.value;
    if (!this.scheduleForm[day]) {
      this.scheduleForm[day] = {};
    }
    this.scheduleForm[day][field] = value;
  }

  async onUpdateSchedule(): Promise<void> {
    this.updatingSchedule.set(true);
    try {
      this.snackBar.open('Horaires mis à jour', 'Fermer', { duration: 2000 });
    } catch (e) {
      console.error('Failed to update schedule', e);
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 2000 });
    } finally {
      this.updatingSchedule.set(false);
    }
  }
}
