import {
  Component, inject, input, output, signal, ElementRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="upload-wrapper">

      <!-- Zone de drop / preview -->
      <div
        class="drop-zone"
        [class.has-image]="previewUrl()"
        [class.dragover]="dragging()"
        (click)="fileInput.click()"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
      >
        @if (previewUrl()) {
          <img [src]="previewUrl()" alt="Aperçu" class="preview-img" />
          <div class="overlay">
            <mat-icon>edit</mat-icon>
            <span>Changer</span>
          </div>
        } @else {
          <div class="placeholder">
            <mat-icon>cloud_upload</mat-icon>
            <span>{{ label() }}</span>
            <span class="hint">JPG, PNG, WebP — max 5 Mo</span>
          </div>
        }
      </div>

      <!-- Barre de progression -->
      @if (uploading()) {
        <mat-progress-bar mode="indeterminate" class="progress-bar"></mat-progress-bar>
      }

      <!-- Actions -->
      @if (previewUrl() && !uploading()) {
        <button mat-stroked-button color="warn" class="remove-btn" (click)="removeImage($event)">
          <mat-icon>delete</mat-icon> Supprimer
        </button>
      }

      <input
        #fileInput
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style="display:none"
        (change)="onFileSelected($event)"
      />
    </div>
  `,
  styles: [`
    .upload-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .drop-zone {
      position: relative;
      border: 2px dashed var(--border, #27273a);
      border-radius: 12px;
      min-height: 140px;
      cursor: pointer;
      overflow: hidden;
      transition: border-color .2s, background .2s;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-card, #16161f);

      &:hover, &.dragover {
        border-color: var(--accent, #f97316);
        background: rgba(249,115,22,.06);
      }

      &.has-image { border-style: solid; }
    }

    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary, #8b8ba0);

      mat-icon { font-size: 40px; width: 40px; height: 40px; color: var(--accent, #f97316); }
      span { font-size: 13px; font-weight: 500; }
      .hint { font-size: 11px; opacity: .6; }
    }

    .preview-img {
      width: 100%;
      height: 140px;
      object-fit: cover;
      display: block;
    }

    .overlay {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      opacity: 0;
      color: #fff;
      transition: opacity .2s;
      font-size: 13px;

      mat-icon { font-size: 28px; width: 28px; height: 28px; }
    }

    .drop-zone:hover .overlay { opacity: 1; }

    .progress-bar { border-radius: 4px; }

    .remove-btn {
      align-self: flex-start;
      font-size: 12px;
      height: 30px;
      line-height: 30px;
    }
  `],
})
export class ImageUploadComponent {
  private readonly http = inject(HttpClient);

  readonly label = input<string>('Cliquez ou glissez une image');
  readonly currentUrl = input<string | null | undefined>(null);

  readonly uploaded = output<string>(); // émet l'URL publique
  readonly removed = output<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  readonly uploading = signal(false);
  readonly dragging = signal(false);
  readonly previewUrl = signal<string | null>(null);

  ngOnInit() {
    if (this.currentUrl()) {
      this.previewUrl.set(this.currentUrl()!);
    }
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) await this.upload(file);
    // reset input so re-selecting the same file triggers change
    this.fileInput.nativeElement.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) await this.upload(file);
  }

  removeImage(event: Event) {
    event.stopPropagation();
    this.previewUrl.set(null);
    this.removed.emit();
  }

  private async upload(file: File) {
    // Local preview immédiat
    this.previewUrl.set(URL.createObjectURL(file));
    this.uploading.set(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await firstValueFrom(
        this.http.post<{ url: string }>('/api/upload/image', formData, { withCredentials: true }),
      );
      this.previewUrl.set(res.url);
      this.uploaded.emit(res.url);
    } catch {
      this.previewUrl.set(this.currentUrl() ?? null);
    } finally {
      this.uploading.set(false);
    }
  }
}
