/**
 * ============================================================================
 * FILE UPLOAD COMPONENT - CLOUD ARTWORK ASSET STREAMING
 * ============================================================================
 * 
 * ARCHITECTURAL CONTEXT:
 * Reusable standalone widget utilized across Customer and Staff portals for
 * attaching high-resolution prepress artwork and documents (PDF, PNG, JPG,
 * SVG, AI, PSD) up to 20MB.
 * 
 * DESIGN PATTERNS:
 * 1. Direct-to-Cloud Streaming: Delegates transfer directly to Supabase Storage
 *    via `StorageService`, avoiding heavy base64 payload overhead on backend servers.
 * 2. Instant Local Thumbnail: Uses HTML5 `FileReader` API for instant raster
 *    preview prior to asynchronous upload completion.
 * 3. Drag-and-Drop & Progress Signals: Powered by Angular 22 Signals for
 *    reactive drag indicators and animated progress percentages.
 * ============================================================================
 */

import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService, UploadProgress } from '../../../core/services/storage.service';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="file-upload-zone"
      [class.dragging]="isDragging()"
      [class.has-file]="selectedFile()"
      (click)="fileInput.click()"
      (dragover)="onDragOver($event)"
      (dragleave)="isDragging.set(false)"
      (drop)="onDrop($event)">

      <input #fileInput type="file" hidden
        [accept]="acceptAttr"
        (change)="onFileSelected($event)" />

      @if (!selectedFile()) {
        <div class="upload-placeholder">
          <span class="material-icons-outlined upload-icon">upload_file</span>
          <p class="upload-title">Drop file here or <span class="upload-link">browse</span></p>
          <p class="upload-hint">PDF, PNG, JPG, SVG, AI, PSD · Max {{ maxSizeMb }}MB</p>
        </div>
      } @else {
        <div class="upload-preview">
          @if (isImage && previewUrl()) {
            <img [src]="previewUrl()" alt="Preview" class="upload-img-preview" />
          } @else {
            <span class="material-icons-outlined upload-file-icon">description</span>
          }
          <div class="upload-file-info">
            <p class="upload-file-name">{{ selectedFile()!.name }}</p>
            <p class="upload-file-size">{{ fileSizeLabel() }}</p>
          </div>
          <button class="btn btn-ghost btn-icon upload-remove" (click)="removeFile($event)">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
      }

      @if (uploadProgress() > 0 && uploadProgress() < 100) {
        <div class="upload-progress-bar">
          <div class="upload-progress-fill" [style.width.%]="uploadProgress()"></div>
        </div>
        <p class="upload-progress-text">Uploading... {{ uploadProgress() }}%</p>
      }
    </div>

    @if (validationError()) {
      <p class="error-msg"><span class="material-icons-outlined" style="font-size:0.875rem">error</span> {{ validationError() }}</p>
    }
    @if (uploadedUrl()) {
      <p class="upload-success-msg">
        <span class="material-icons-outlined">check_circle</span> File uploaded successfully
      </p>
    }
  `,
  styleUrl: './file-upload.scss',
})
/**
 * Shared file upload widget coordinating drag-and-drop events, client-side
 * image preview generation, and direct cloud storage streaming.
 */
export class FileUpload {
  @Input() folder = 'orders';
  @Input() maxSizeMb = 20;
  @Output() fileUploaded = new EventEmitter<string>(); // emits the public URL

  selectedFile  = signal<File | null>(null);
  previewUrl    = signal<string | null>(null);
  uploadProgress = signal<number>(0);
  validationError = signal<string | null>(null);
  uploadedUrl   = signal<string | null>(null);
  isDragging    = signal<boolean>(false);
  isImage       = false;

  readonly acceptAttr = '.pdf,.png,.jpg,.jpeg,.svg,.ai,.psd';

  constructor(private storageService: StorageService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.processFile(input.files[0]);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.uploadProgress.set(0);
    this.uploadedUrl.set(null);
    this.validationError.set(null);
  }

  fileSizeLabel(): string {
    const bytes = this.selectedFile()?.size ?? 0;
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private processFile(file: File): void {
    const error = this.storageService.validateFile(file);
    if (error) { this.validationError.set(error); return; }
    this.validationError.set(null);
    this.selectedFile.set(file);
    this.isImage = this.storageService.isImage(file.name);

    // Generate preview for images
    if (this.isImage) {
      const reader = new FileReader();
      reader.onload = e => this.previewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    // Auto-upload
    this.storageService.uploadFile(file, this.folder).subscribe({
      next: (progress: UploadProgress) => {
        this.uploadProgress.set(progress.percent);
        if (progress.done && progress.result) {
          this.uploadedUrl.set(progress.result.url);
          this.fileUploaded.emit(progress.result.url);
        }
      },
      error: (err: any) => {
        // Status 0 = network/CORS error (Supabase Storage bucket permissions)
        const isCorsOrNetwork = err?.status === 0 || err?.message?.includes('0 undefined');
        const friendlyMsg = isCorsOrNetwork
          ? 'File upload is temporarily unavailable. You can still submit your request and attach the file later.'
          : (err?.message || 'Upload failed. Please try again.');
        this.validationError.set(friendlyMsg);
        this.uploadProgress.set(0);
      },
    });
  }
}
