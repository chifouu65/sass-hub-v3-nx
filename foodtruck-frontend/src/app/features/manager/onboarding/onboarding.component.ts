import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { TruckService } from '../../../core/services/truck.service';

@Component({
  selector: 'app-manager-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <div class="onboarding-container">
      <div class="onboarding-wrapper">
        <h1>Créez votre Food Truck</h1>
        <p class="subtitle">Complétez les informations de base pour commencer à gérer votre truck</p>

        <mat-card class="onboarding-card">
          <mat-card-content>
            <form [formGroup]="truckForm" (ngSubmit)="onSubmit()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nom du truck</mat-label>
                <input matInput formControlName="name" placeholder="Ex: Tacos de Ouf" />
                <mat-error *ngIf="truckForm.get('name')?.hasError('required')">Le nom est requis</mat-error>
                <mat-error *ngIf="truckForm.get('name')?.hasError('minlength')">Minimum 3 caractères</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Type de cuisine</mat-label>
                <mat-select formControlName="cuisineType">
                  <mat-option value="">Sélectionnez un type</mat-option>
                  <mat-option value="mexican">Mexicain</mat-option>
                  <mat-option value="asian">Asiatique</mat-option>
                  <mat-option value="italian">Italien</mat-option>
                  <mat-option value="burger">Burgers</mat-option>
                  <mat-option value="pizza">Pizza</mat-option>
                  <mat-option value="kebab">Kebab</mat-option>
                  <mat-option value="vegan">Végan</mat-option>
                  <mat-option value="sweet">Desserts</mat-option>
                  <mat-option value="other">Autre</mat-option>
                </mat-select>
                <mat-error *ngIf="truckForm.get('cuisineType')?.hasError('required')">Le type est requis</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea
                  matInput
                  formControlName="description"
                  placeholder="Décrivez votre food truck et sa spécialité..."
                  rows="4"
                ></textarea>
                <mat-error *ngIf="truckForm.get('description')?.hasError('required')">La description est requise</mat-error>
                <mat-error *ngIf="truckForm.get('description')?.hasError('minlength')">Minimum 10 caractères</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Téléphone</mat-label>
                <input matInput formControlName="phone" type="tel" placeholder="Ex: 06 12 34 56 78" />
                <mat-error *ngIf="truckForm.get('phone')?.hasError('required')">Le téléphone est requis</mat-error>
                <mat-error *ngIf="truckForm.get('phone')?.hasError('pattern')">Format invalide</mat-error>
              </mat-form-field>

              <button
                mat-raised-button
                color="primary"
                type="submit"
                class="full-width submit-button"
                [disabled]="truckForm.invalid || submitting()"
              >
                <mat-spinner *ngIf="submitting()" diameter="20" class="spinner"></mat-spinner>
                <span *ngIf="!submitting()">Créer mon truck</span>
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <p class="help-text">
          <mat-icon>info</mat-icon>
          Vous pourrez modifier ces informations et ajouter une localisation après la création.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .onboarding-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .onboarding-wrapper {
      width: 100%;
      max-width: 500px;
    }

    h1 {
      text-align: center;
      color: white;
      font-size: 28px;
      margin-bottom: 8px;
    }

    .subtitle {
      text-align: center;
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin-bottom: 32px;
    }

    .onboarding-card {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      margin-bottom: 24px;
      background: var(--bg-card, #16161f) !important;
    }

    mat-card-content {
      padding: 32px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }

    button {
      height: 44px;
      font-size: 16px;
      font-weight: 500;
      margin-top: 12px;

      .spinner {
        display: inline-block;
        margin-right: 8px;
      }
    }

    .help-text {
      text-align: center;
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 0;

      mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    @media (max-width: 600px) {
      .onboarding-container {
        padding: 16px;
      }

      h1 {
        font-size: 24px;
      }

      mat-card-content {
        padding: 24px;
      }
    }
  `],
})
export class ManagerOnboardingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly truckService = inject(TruckService);
  private readonly snackBar = inject(MatSnackBar);

  readonly submitting = signal(false);

  readonly truckForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    cuisineType: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10)]],
    phone: ['', [Validators.required, Validators.pattern(/^\d[\d\s\-\+\(\)]{7,}$/)]],
  });

  async onSubmit(): Promise<void> {
    if (this.truckForm.invalid) return;

    this.submitting.set(true);
    try {
      const { name, cuisineType, description } = this.truckForm.value;
      await firstValueFrom(
        this.truckService.createTruck({
          name: name!,
          cuisineType: cuisineType!,
          description: description!,
          imageUrl: undefined,
          isOpen: false,
          latitude: 0,
          longitude: 0,
          address: '',
          rating: 0,
        })
      );

      this.snackBar.open('Food truck créé avec succès!', 'Fermer', { duration: 2000 });
      this.router.navigateByUrl('/manager/dashboard');
    } catch (e) {
      console.error('Failed to create truck', e);
      this.snackBar.open('Erreur lors de la création du truck', 'Fermer', { duration: 3000 });
    } finally {
      this.submitting.set(false);
    }
  }
}
