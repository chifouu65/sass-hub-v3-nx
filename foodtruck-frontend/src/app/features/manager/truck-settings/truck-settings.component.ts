import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { TruckService, Truck } from '../../../core/services/truck.service';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

const CUISINE_TYPES = [
  'Burger', 'Pizza', 'Tacos', 'Sushi', 'Kebab',
  'Crêpes', 'Sandwich', 'Vegan', 'BBQ', 'Asiatique',
  'Mexicain', 'Italien', 'Indien', 'Méditerranéen', 'Autre',
];

@Component({
  selector: 'app-truck-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ImageUploadComponent,
  ],
  template: `
    <div class="settings-container">

      <!-- Header -->
      <div class="page-header">
        <div class="page-header-icon">
          <mat-icon>settings</mat-icon>
        </div>
        <div>
          <h1>Mon Truck</h1>
          <p class="subtitle">Gérez le profil et les informations de votre food truck</p>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="loading-state">
        <mat-spinner diameter="36"></mat-spinner>
        <p>Chargement…</p>
      </div>

      <!-- No truck → create -->
      <ng-container *ngIf="!loading() && !truck()">
        <mat-card class="section-card create-card">
          <div class="empty-state">
            <mat-icon>add_business</mat-icon>
            <h2>Créez votre food truck</h2>
            <p>Renseignez les informations de base pour commencer à recevoir des commandes.</p>
          </div>

          <form [formGroup]="truckForm" (ngSubmit)="onCreate()" class="form-body">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Nom du truck *</mat-label>
                <mat-icon matPrefix>local_shipping</mat-icon>
                <input matInput formControlName="name" placeholder="ex: Le Truck de Léa" />
                <mat-error *ngIf="truckForm.get('name')?.hasError('required')">Nom requis</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Type de cuisine *</mat-label>
                <mat-icon matPrefix>restaurant</mat-icon>
                <mat-select formControlName="cuisineType">
                  <mat-option *ngFor="let c of cuisineTypes" [value]="c">{{ c }}</mat-option>
                </mat-select>
                <mat-error *ngIf="truckForm.get('cuisineType')?.hasError('required')">Requis</mat-error>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="3"
                placeholder="Décrivez votre concept, vos spécialités…"></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Téléphone</mat-label>
              <mat-icon matPrefix>phone</mat-icon>
              <input matInput formControlName="phone" placeholder="+33 6 00 00 00 00" />
            </mat-form-field>

            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit"
                [disabled]="truckForm.invalid || saving()">
                <mat-spinner *ngIf="saving()" diameter="18"></mat-spinner>
                <mat-icon *ngIf="!saving()">add_circle</mat-icon>
                {{ saving() ? 'Création…' : 'Créer mon truck' }}
              </button>
            </div>
          </form>
        </mat-card>
      </ng-container>

      <!-- Truck exists → edit -->
      <ng-container *ngIf="!loading() && truck()">

        <!-- Section: Identité -->
        <mat-card class="section-card">
          <div class="section-header">
            <mat-icon>badge</mat-icon>
            <div>
              <h2>Identité</h2>
              <p>Nom, type de cuisine et description affichés aux clients.</p>
            </div>
          </div>
          <mat-divider></mat-divider>

          <form [formGroup]="truckForm" (ngSubmit)="onSave()" class="form-body">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Nom du truck</mat-label>
                <mat-icon matPrefix>local_shipping</mat-icon>
                <input matInput formControlName="name" />
                <mat-error *ngIf="truckForm.get('name')?.hasError('required')">Nom requis</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Type de cuisine</mat-label>
                <mat-icon matPrefix>restaurant</mat-icon>
                <mat-select formControlName="cuisineType">
                  <mat-option *ngFor="let c of cuisineTypes" [value]="c">{{ c }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput formControlName="description" rows="3"
                placeholder="Décrivez votre concept, vos spécialités…"></textarea>
              <mat-hint align="end">{{ truckForm.get('description')?.value?.length || 0 }}/300</mat-hint>
            </mat-form-field>

            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit"
                [disabled]="truckForm.pristine || truckForm.invalid || saving()">
                <mat-spinner *ngIf="saving()" diameter="18"></mat-spinner>
                <mat-icon *ngIf="!saving()">save</mat-icon>
                {{ saving() ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
              <button mat-button type="button" (click)="resetForm()"
                [disabled]="truckForm.pristine">
                Annuler
              </button>
            </div>
          </form>
        </mat-card>

        <!-- Section: Contact & Infos -->
        <mat-card class="section-card">
          <div class="section-header">
            <mat-icon>contact_phone</mat-icon>
            <div>
              <h2>Contact & Infos</h2>
              <p>Numéro de téléphone et image du truck.</p>
            </div>
          </div>
          <mat-divider></mat-divider>

          <form [formGroup]="contactForm" (ngSubmit)="onSaveContact()" class="form-body">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Téléphone</mat-label>
              <mat-icon matPrefix>phone</mat-icon>
              <input matInput formControlName="phone" placeholder="+33 6 00 00 00 00" />
            </mat-form-field>

            <!-- Upload logo -->
            <div class="field-label">Logo / Photo du truck</div>
            <app-image-upload
              label="Cliquez ou glissez le logo de votre truck"
              [currentUrl]="contactForm.get('imageUrl')?.value"
              (uploaded)="onLogoUploaded($event)"
              (removed)="onLogoRemoved()"
            ></app-image-upload>

            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit"
                [disabled]="contactForm.pristine || savingContact()">
                <mat-spinner *ngIf="savingContact()" diameter="18"></mat-spinner>
                <mat-icon *ngIf="!savingContact()">save</mat-icon>
                {{ savingContact() ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </mat-card>

        <!-- Section: Danger zone -->
        <mat-card class="section-card danger-card">
          <div class="section-header">
            <mat-icon class="danger-icon">warning</mat-icon>
            <div>
              <h2>Zone de danger</h2>
              <p>Actions irréversibles sur votre compte gérant.</p>
            </div>
          </div>
          <mat-divider></mat-divider>
          <div class="form-body">
            <div class="danger-row">
              <div>
                <strong>Réinitialiser le menu</strong>
                <p class="danger-desc">Supprime tous les articles et catégories du menu.</p>
              </div>
              <button mat-stroked-button class="danger-btn" disabled>
                Supprimer le menu
              </button>
            </div>
          </div>
        </mat-card>

      </ng-container>
    </div>
  `,
  styles: [`
    .settings-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* ── Header ── */
    .page-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }

    .page-header-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: var(--accent-muted, rgba(249,115,22,0.12));
      border: 1px solid rgba(249,115,22,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      mat-icon {
        color: var(--accent, #f97316);
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }

    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary, #ececf0);
    }

    .subtitle {
      margin: 4px 0 0;
      color: var(--text-secondary, #8b8ba0);
      font-size: 13px;
    }

    /* ── Loading ── */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      min-height: 200px;
      color: var(--text-secondary, #8b8ba0);
    }

    /* ── Cards ── */
    .section-card {
      background: var(--bg-card, #16161f) !important;
      border: 1px solid var(--border, #27273a) !important;
      border-radius: var(--radius-md, 12px) !important;
      box-shadow: none !important;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 20px;

      > mat-icon {
        margin-top: 2px;
        color: var(--accent, #f97316);
        font-size: 22px;
        width: 22px;
        height: 22px;
        flex-shrink: 0;
      }

      h2 {
        margin: 0 0 2px;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary, #ececf0);
      }

      p {
        margin: 0;
        font-size: 12px;
        color: var(--text-secondary, #8b8ba0);
      }
    }

    mat-divider {
      border-color: var(--border, #27273a) !important;
    }

    /* ── Form body ── */
    .form-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 4px;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;

      button {
        display: flex;
        align-items: center;
        gap: 6px;

        mat-spinner {
          display: inline-block;
        }
      }
    }

    /* ── Image preview ── */
    .image-preview {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;

      img {
        max-height: 160px;
        max-width: 100%;
        object-fit: cover;
        border-radius: 10px;
        border: 1px solid var(--border, #27273a);
      }

      .preview-label {
        font-size: 11px;
        color: var(--text-muted, #5c5c70);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    /* ── Create empty state ── */
    .create-card {
      max-width: 540px;
      margin: 0 auto;
      width: 100%;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 32px 20px 20px;
      text-align: center;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--accent, #f97316);
        margin-bottom: 4px;
      }

      h2 {
        margin: 0;
        font-size: 18px;
        color: var(--text-primary, #ececf0);
      }

      p {
        margin: 0;
        font-size: 13px;
        color: var(--text-secondary, #8b8ba0);
        max-width: 340px;
      }
    }

    /* ── Field label ── */
    .field-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary, #8b8ba0);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    /* ── Danger zone ── */
    .danger-card {
      border-color: rgba(239, 68, 68, 0.25) !important;

      .danger-icon {
        color: var(--danger, #ef4444) !important;
      }
    }

    .danger-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;

      strong {
        display: block;
        color: var(--text-primary, #ececf0);
        font-size: 14px;
        margin-bottom: 2px;
      }

      .danger-desc {
        margin: 0;
        font-size: 12px;
        color: var(--text-secondary, #8b8ba0);
      }
    }

    .danger-btn {
      border-color: var(--danger, #ef4444) !important;
      color: var(--danger, #ef4444) !important;
      flex-shrink: 0;
    }
  `],
})
export class TruckSettingsComponent implements OnInit {
  private readonly truckService = inject(TruckService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingContact = signal(false);
  readonly truck = signal<Truck | null>(null);

  readonly cuisineTypes = CUISINE_TYPES;

  readonly truckForm = this.fb.group({
    name:        ['', Validators.required],
    cuisineType: ['', Validators.required],
    description: ['', Validators.maxLength(300)],
  });

  readonly contactForm = this.fb.group({
    phone:    [''],
    imageUrl: [''],
  });

  ngOnInit(): void {
    this.loadTruck();
  }

  private async loadTruck(): Promise<void> {
    this.loading.set(true);
    try {
      const truck = await firstValueFrom(this.truckService.getMyTruck());
      this.truck.set(truck as Truck);
      this.truckForm.patchValue({
        name:        truck.name,
        cuisineType: truck.cuisineType,
        description: truck.description ?? '',
      });
      this.contactForm.patchValue({
        imageUrl: (truck as any).logo_url ?? (truck as any).imageUrl ?? '',
        phone:    (truck as any).phone ?? '',
      });
      this.truckForm.markAsPristine();
      this.contactForm.markAsPristine();
    } catch {
      // no truck yet
    } finally {
      this.loading.set(false);
    }
  }

  resetForm(): void {
    const t = this.truck();
    if (!t) return;
    this.truckForm.patchValue({
      name:        t.name,
      cuisineType: t.cuisineType,
      description: t.description ?? '',
    });
    this.truckForm.markAsPristine();
  }

  async onCreate(): Promise<void> {
    if (this.truckForm.invalid) return;
    this.saving.set(true);
    try {
      const v = this.truckForm.value;
      const truck = await firstValueFrom(this.truckService.createTruck({
        name:          v.name        ?? undefined,
        cuisine_type:  v.cuisineType ?? undefined,
        description:   v.description ?? undefined,
      } as any));
      this.truck.set(truck);
      this.truckForm.markAsPristine();
      this.snackBar.open('🎉 Truck créé avec succès !', 'OK', { duration: 3000 });
    } catch (err: any) {
      console.error('[onCreate] Error:', err?.error?.message ?? err?.message ?? err);
      this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async onSave(): Promise<void> {
    if (this.truckForm.invalid || this.truckForm.pristine) return;
    this.saving.set(true);
    try {
      const v = this.truckForm.value;
      const updated = await firstValueFrom(this.truckService.updateTruck(this.truck()!.id, {
        name:          v.name        ?? undefined,
        cuisine_type:  v.cuisineType ?? undefined,
        description:   v.description ?? undefined,
      } as any));
      this.truck.set(updated);
      this.truckForm.markAsPristine();
      this.snackBar.open('Modifications enregistrées', 'OK', { duration: 2500 });
    } catch (err: any) {
      console.error('[onSave] Error:', err?.error?.message ?? err?.message ?? err);
      this.snackBar.open('Erreur lors de l\'enregistrement', 'Fermer', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }

  async onSaveContact(): Promise<void> {
    if (this.contactForm.pristine) return;
    this.savingContact.set(true);
    try {
      const v = this.contactForm.value;
      const updated = await firstValueFrom(this.truckService.updateTruck(this.truck()!.id, {
        phone:    v.phone ?? undefined,
        logo_url: v.imageUrl ?? undefined,
      } as any));
      this.truck.set(updated);
      this.contactForm.markAsPristine();
      this.snackBar.open('Informations mises à jour', 'OK', { duration: 2500 });
    } catch (err: any) {
      console.error('[onSaveContact] Error:', err?.error?.message ?? err?.message ?? err);
      this.snackBar.open('Erreur lors de l\'enregistrement', 'Fermer', { duration: 3000 });
    } finally {
      this.savingContact.set(false);
    }
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  onLogoUploaded(url: string): void {
    this.contactForm.patchValue({ imageUrl: url });
    this.contactForm.markAsDirty();
  }

  onLogoRemoved(): void {
    this.contactForm.patchValue({ imageUrl: '' });
    this.contactForm.markAsDirty();
  }
}
