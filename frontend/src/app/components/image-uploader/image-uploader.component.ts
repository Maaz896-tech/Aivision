import { Component, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { QuickPrompt } from '../../models/chat.models';

@Component({
  selector: 'app-image-uploader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="uploader-container glass-panel">
      <!-- Section Title -->
      <div class="section-header">
        <div class="title-with-icon">
          <i class="fa-solid fa-cloud-arrow-up text-primary"></i>
          <h2 class="section-title">Vision Context</h2>
        </div>
        @if (activeImage()) {
          <span class="badge-active">Active</span>
        }
      </div>

      <!-- Drag & Drop Zone (Shown when no image is uploaded) -->
      @if (!activeImage()) {
        <div 
          class="dropzone"
          [class.drag-over]="isDragging()"
          [class.uploading]="isUploading()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()">
          
          <input 
            #fileInput 
            type="file" 
            accept="image/jpeg,image/png,image/webp" 
            (change)="onFileSelected($event)" 
            style="display: none;" />

          @if (isUploading()) {
            <div class="uploading-state">
              <i class="fa-solid fa-circle-notch fa-spin upload-spinner"></i>
              <p class="upload-text">Validating & Processing Image...</p>
            </div>
          } @else {
            <div class="dropzone-content">
              <div class="upload-icon-circle">
                <i class="fa-regular fa-image"></i>
              </div>
              <p class="primary-prompt">
                <strong>Drop your image here</strong> or <span class="highlight-browse">browse</span>
              </p>
              <p class="secondary-info">
                Supported: JPEG, PNG, WEBP (Max {{ maxMb() }}MB)
              </p>
            </div>
          }
        </div>
      }

      <!-- Image Preview Card (Shown when image is uploaded) -->
      @if (activeImage(); as img) {
        <div class="preview-card animate-fade-in">
          <div class="thumbnail-wrapper" (click)="chatService.openImageModal(img.data)" title="Click to zoom in">
            <img [src]="img.data" [alt]="img.filename || 'Uploaded image'" class="thumbnail-img" />
            <div class="zoom-overlay">
              <i class="fa-solid fa-magnifying-glass-plus"></i>
            </div>
          </div>

          <div class="metadata-section">
            <div class="file-name-row">
              <span class="file-name" [title]="img.filename">{{ img.filename || 'image.jpg' }}</span>
              <button 
                type="button" 
                class="btn-remove-image" 
                (click)="onRemoveImage()" 
                title="Remove image"
                aria-label="Remove image">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div class="tags-row">
              @if (img.width && img.height) {
                <span class="meta-tag"><i class="fa-solid fa-expand"></i> {{ img.width }}×{{ img.height }}px</span>
              }
              @if (img.size_bytes) {
                <span class="meta-tag"><i class="fa-solid fa-weight-hanging"></i> {{ formatFileSize(img.size_bytes) }}</span>
              }
              <span class="meta-tag format-tag">{{ getFormatLabel(img.mime_type) }}</span>
            </div>
          </div>
        </div>

        <!-- Quick AI Vision Action Chips -->
        <div class="quick-prompts-section animate-fade-in">
          <div class="quick-prompts-label">
            <i class="fa-solid fa-bolt-lightning text-accent"></i>
            <span>Quick Vision Analysis</span>
          </div>
          <div class="prompts-grid">
            @for (prompt of chatService.quickPrompts; track prompt.id) {
              <button 
                type="button" 
                class="prompt-chip" 
                [disabled]="chatService.isLoading()"
                (click)="onRunQuickPrompt(prompt)"
                [title]="prompt.promptText">
                <i class="fa-solid" [ngClass]="prompt.icon"></i>
                <span class="chip-label">{{ prompt.label }}</span>
              </button>
            }
          </div>
        </div>
      }

      <!-- Upload Error Notice -->
      @if (uploadError()) {
        <div class="upload-alert animate-fade-in">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>{{ uploadError() }}</span>
          <button type="button" class="btn-close-alert" (click)="uploadError.set(null)">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .uploader-container {
      padding: 1.25rem;
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .title-with-icon {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
    }

    .text-primary {
      color: var(--primary);
    }

    .text-accent {
      color: var(--accent-amber);
    }

    .badge-active {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.2rem 0.6rem;
      border-radius: var(--radius-full);
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    /* ---------------- Dropzone ---------------- */
    .dropzone {
      border: 2px dashed var(--border-glass);
      border-radius: var(--radius-md);
      padding: 2rem 1.5rem;
      text-align: center;
      background: var(--bg-surface-elevated);
      cursor: pointer;
      transition: all var(--transition-normal);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dropzone:hover, .dropzone.drag-over {
      border-color: var(--primary);
      background: var(--primary-light);
      box-shadow: 0 0 20px var(--primary-glow);
      transform: translateY(-2px);
    }

    .upload-icon-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary-light);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      margin: 0 auto 0.75rem auto;
      transition: transform var(--transition-spring);
    }

    .dropzone:hover .upload-icon-circle {
      transform: scale(1.1);
    }

    .primary-prompt {
      font-size: 0.92rem;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .highlight-browse {
      color: var(--primary);
      text-decoration: underline;
      cursor: pointer;
    }

    .secondary-info {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .uploading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .upload-spinner {
      font-size: 2rem;
      color: var(--primary);
    }

    .upload-text {
      font-size: 0.88rem;
      color: var(--text-secondary);
    }

    /* ---------------- Preview Card ---------------- */
    .preview-card {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      padding: 0.85rem;
    }

    .thumbnail-wrapper {
      position: relative;
      width: 100%;
      height: 180px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: #000000;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .thumbnail-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: transform var(--transition-normal);
    }

    .zoom-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 1.5rem;
      opacity: 0;
      transition: opacity var(--transition-fast);
    }

    .thumbnail-wrapper:hover .zoom-overlay {
      opacity: 1;
    }

    .thumbnail-wrapper:hover .thumbnail-img {
      transform: scale(1.03);
    }

    .metadata-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .file-name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .file-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-remove-image {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-xs);
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: var(--accent-rose);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }

    .btn-remove-image:hover {
      background: var(--accent-rose);
      color: #ffffff;
      transform: scale(1.05);
    }

    .tags-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .meta-tag {
      font-size: 0.72rem;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-xs);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .format-tag {
      text-transform: uppercase;
      font-weight: 600;
      color: var(--primary);
    }

    /* ---------------- Quick Prompts ---------------- */
    .quick-prompts-section {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-top: 0.25rem;
    }

    .quick-prompts-label {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .prompts-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .prompt-chip {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.85rem;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: all var(--transition-fast);
    }

    .prompt-chip i {
      color: var(--primary);
      width: 16px;
      text-align: center;
    }

    .prompt-chip:hover:not(:disabled) {
      background: var(--primary-light);
      border-color: var(--border-focus);
      color: var(--primary);
      transform: translateX(3px);
    }

    .prompt-chip:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* ---------------- Alert ---------------- */
    .upload-alert {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.85rem;
      border-radius: var(--radius-sm);
      background: rgba(244, 63, 94, 0.12);
      border: 1px solid rgba(244, 63, 94, 0.3);
      color: var(--accent-rose);
      font-size: 0.82rem;
    }

    .btn-close-alert {
      margin-left: auto;
      background: transparent;
      border: none;
      color: var(--accent-rose);
      cursor: pointer;
    }
  `]
})
export class ImageUploaderComponent {
  chatService = inject(ChatService);

  isDragging = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  uploadError = signal<string | null>(null);

  activeImage = this.chatService.activeImage;

  maxMb() {
    return this.chatService.config()?.max_image_size_mb || 10;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleFile(file);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.handleFile(file);
      input.value = ''; // Reset input to allow re-selecting same file
    }
  }

  private async handleFile(file: File) {
    this.uploadError.set(null);
    this.isUploading.set(true);

    // Client-side quick validations
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.uploadError.set(`Unsupported format (${file.type || 'unknown'}). Please upload JPEG, PNG, or WEBP.`);
      this.isUploading.set(false);
      return;
    }

    const maxBytes = this.maxMb() * 1024 * 1024;
    if (file.size > maxBytes) {
      this.uploadError.set(`File size exceeds limit (${this.maxMb()} MB).`);
      this.isUploading.set(false);
      return;
    }

    if (file.size === 0) {
      this.uploadError.set('The selected file is empty (0 bytes).');
      this.isUploading.set(false);
      return;
    }

    try {
      await this.chatService.uploadImage(file);
    } catch (err: any) {
      this.uploadError.set(err.message || 'Image upload failed.');
    } finally {
      this.isUploading.set(false);
    }
  }

  onRemoveImage() {
    this.chatService.removeActiveImage();
  }

  onRunQuickPrompt(prompt: QuickPrompt) {
    this.chatService.runQuickPrompt(prompt);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  getFormatLabel(mime: string): string {
    return mime.replace('image/', '');
  }
}
