import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { MenuService, MenuCategory } from '../../../core/services/menu.service';
import { TruckService } from '../../../core/services/truck.service';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';

@Component({
  selector: 'app-manager-menu',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatExpansionModule,
    MatIconModule,
    ImageUploadComponent,
  ],
  template: `
    <div class="menu-container">
      <h1>Menu Management</h1>

      <mat-card class="add-category-card">
        <mat-card-header>
          <mat-card-title>Add Category</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="categoryForm" (ngSubmit)="onAddCategory()" class="form-row">
            <mat-form-field appearance="fill" class="flex-1">
              <mat-label>Category Name</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>
            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="categoryForm.invalid || addingCategory()"
            >
              Add Category
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="categories-section">
        <h2>Categories & Items</h2>
        <mat-accordion>
          <mat-expansion-panel *ngFor="let category of categories()">
            <mat-expansion-panel-header>
              <mat-panel-title>{{ category.name }}</mat-panel-title>
              <mat-panel-description>
                {{ (category.items || []).length }} item(s)
              </mat-panel-description>
            </mat-expansion-panel-header>

            <div class="category-content">
              <div class="items-list">
                <div *ngFor="let item of (category.items || [])" class="item-row">
                  <div class="item-details">
                    <strong>{{ item.name }}</strong>
                    <p *ngIf="item.description">{{ item.description }}</p>
                    <span class="price">{{ item.price | currency }}</span>
                  </div>
                  <button
                    mat-icon-button
                    (click)="deleteItem(item.id)"
                    [disabled]="deletingItemId() === item.id"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>

              <form [formGroup]="itemForm" (ngSubmit)="onAddItem(category.id)" class="add-item-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nom de l'article *</mat-label>
                  <input matInput formControlName="name" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <input matInput formControlName="description" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Prix (€) *</mat-label>
                  <input matInput type="number" formControlName="price" step="0.01" min="0" />
                </mat-form-field>

                <div class="field-label">Image de l'article (optionnel)</div>
                <app-image-upload
                  label="Photo de l'article"
                  (uploaded)="onItemImageUploaded($event)"
                  (removed)="onItemImageRemoved()"
                ></app-image-upload>

                <button
                  mat-raised-button
                  color="accent"
                  type="submit"
                  class="full-width"
                  style="margin-top:12px"
                  [disabled]="itemForm.invalid || addingItemCategoryId() === category.id"
                >
                  <mat-icon>add</mat-icon>
                  {{ addingItemCategoryId() === category.id ? 'Ajout…' : 'Ajouter l\'article' }}
                </button>
              </form>

              <button
                mat-stroked-button
                color="warn"
                (click)="deleteCategory(category.id)"
                class="full-width"
                [disabled]="deletingCategoryId() === category.id"
              >
                Delete Category
              </button>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      </div>
    </div>
  `,
  styles: [`
    .menu-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 32px;
      color: var(--text-primary, #ececf0);
    }

    h2 {
      margin-bottom: 16px;
      color: var(--text-primary, #ececf0);
    }

    .add-category-card {
      margin-bottom: 32px;
      background: var(--bg-card, #16161f) !important;
    }

    .field-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary, #8b8ba0);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-end;

      .flex-1 {
        flex: 1;
      }
    }

    .categories-section {
      margin-bottom: 32px;
    }

    .category-content {
      padding: 16px 0;
    }

    .items-list {
      margin-bottom: 24px;

      &:empty::before {
        content: 'No items yet';
        color: var(--text-muted, #5c5c70);
        display: block;
        padding: 16px;
        text-align: center;
      }
    }

    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid var(--border, #27273a);
      gap: 16px;

      &:last-child {
        border-bottom: none;
      }
    }

    .item-details {
      flex: 1;

      strong {
        display: block;
        margin-bottom: 4px;
        color: var(--text-primary, #ececf0);
      }

      p {
        margin: 4px 0;
        color: var(--text-secondary, #8b8ba0);
        font-size: 12px;
      }

      .price {
        font-weight: 600;
        color: var(--warning, #f59e0b);
      }
    }

    .add-item-form {
      border-top: 1px solid var(--border, #27273a);
      padding-top: 16px;
      margin-top: 16px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    button.full-width {
      margin-top: 8px;
    }
  `],
})
export class ManagerMenuComponent {
  private readonly menuService = inject(MenuService);
  private readonly truckService = inject(TruckService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly categories = signal<MenuCategory[]>([]);
  readonly addingCategory = signal(false);
  readonly addingItemCategoryId = signal<string | null>(null);
  readonly deletingCategoryId = signal<string | null>(null);
  readonly deletingItemId = signal<string | null>(null);
  readonly pendingItemImageUrl = signal<string | null>(null);

  readonly categoryForm = this.fb.group({
    name: ['', Validators.required],
  });

  readonly itemForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.loadMenu();
  }

  private async loadMenu(): Promise<void> {
    try {
      const truck = await firstValueFrom(this.truckService.getMyTruck());
      const menu = await firstValueFrom(this.menuService.getMenu(truck.id));
      this.categories.set(menu.categories);
    } catch (e) {
      console.error('Failed to load menu', e);
    }
  }

  async onAddCategory(): Promise<void> {
    if (this.categoryForm.invalid) return;

    this.addingCategory.set(true);
    try {
      const truck = await firstValueFrom(this.truckService.getMyTruck());
      const newCategory = await firstValueFrom(
        this.menuService.createCategory(truck.id, this.categoryForm.value.name!)
      );
      this.categories.update(cats => [...cats, { ...newCategory, items: [] }]);
      this.categoryForm.reset();
      this.snackBar.open('Category added', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Error adding category', 'Close', { duration: 2000 });
    } finally {
      this.addingCategory.set(false);
    }
  }

  async onAddItem(categoryId: string): Promise<void> {
    if (this.itemForm.invalid) return;

    this.addingItemCategoryId.set(categoryId);
    try {
      const truck = await firstValueFrom(this.truckService.getMyTruck());
      const newItem = await firstValueFrom(
        this.menuService.createItem(truck.id, {
          ...this.itemForm.value,
          categoryId,
          imageUrl: this.pendingItemImageUrl() ?? undefined,
        } as any)
      );
      this.categories.update(cats =>
        cats.map(cat =>
          cat.id === categoryId
            ? { ...cat, items: [...(cat.items || []), newItem] }
            : cat
        )
      );
      this.itemForm.reset();
      this.pendingItemImageUrl.set(null);
      this.snackBar.open('Article ajouté !', 'Fermer', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Error adding item', 'Close', { duration: 2000 });
    } finally {
      this.addingItemCategoryId.set(null);
    }
  }

  onItemImageUploaded(url: string): void {
    this.pendingItemImageUrl.set(url);
  }

  onItemImageRemoved(): void {
    this.pendingItemImageUrl.set(null);
  }

  async deleteCategory(id: string): Promise<void> {
    this.deletingCategoryId.set(id);
    try {
      await firstValueFrom(this.menuService.deleteCategory(id));
      this.categories.update(cats => cats.filter(c => c.id !== id));
      this.snackBar.open('Category deleted', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Error deleting category', 'Close', { duration: 2000 });
    } finally {
      this.deletingCategoryId.set(null);
    }
  }

  async deleteItem(id: string): Promise<void> {
    this.deletingItemId.set(id);
    try {
      await firstValueFrom(this.menuService.deleteItem(id));
      this.categories.update(cats =>
        cats.map(cat => ({
          ...cat,
          items: cat.items.filter(item => item.id !== id),
        }))
      );
      this.snackBar.open('Item deleted', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Error deleting item', 'Close', { duration: 2000 });
    } finally {
      this.deletingItemId.set(null);
    }
  }
}
