import { Component, inject, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-input-wrapper glass-panel">
      <!-- Active Image Banner (shown if an image is attached) -->
      @if (activeImage(); as img) {
        <div class="attachment-pill animate-fade-in">
          <img [src]="img.data" [alt]="img.filename || 'Attached image'" class="pill-thumb" />
          <span class="pill-name">{{ img.filename || 'image.jpg' }}</span>
          <button 
            type="button" 
            class="btn-pill-remove" 
            (click)="chatService.removeActiveImage()" 
            title="Remove image">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      }

      <div class="input-row">
        <!-- Attach Image Trigger Button -->
        <input 
          #fileInput 
          type="file" 
          accept="image/jpeg,image/png,image/webp" 
          (change)="onFileSelected($event)" 
          style="display: none;" />
        
        <button 
          type="button" 
          class="btn-attach" 
          (click)="fileInput.click()"
          [disabled]="isLoading()"
          title="Upload or change image attachment"
          aria-label="Upload Image">
          <i class="fa-solid fa-paperclip"></i>
        </button>

        <!-- Message Textarea -->
        <div class="textarea-container">
          <textarea
            #messageTextarea
            [(ngModel)]="userInput"
            (keydown)="onKeyDown($event)"
            (input)="autoResize()"
            [placeholder]="getPlaceholder()"
            [disabled]="isLoading()"
            rows="1"
            class="chat-textarea"></textarea>
        </div>

        <!-- Send Button -->
        <button 
          type="button" 
          class="btn-send" 
          [disabled]="!canSend()" 
          (click)="handleSend()"
          title="Send message (Enter)"
          aria-label="Send Message">
          @if (isLoading()) {
            <i class="fa-solid fa-circle-notch fa-spin"></i>
          } @else {
            <i class="fa-solid fa-paper-plane"></i>
          }
        </button>
      </div>

      <!-- Quick Hint Footer -->
      <div class="input-hint-row">
        <span class="hint-text">Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      flex-shrink: 0;
    }
    .chat-input-wrapper {
      padding: 0.85rem 1.25rem;
      border-top: 1px solid var(--border-subtle);
      background: var(--bg-surface-glass);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      position: relative;
    }

    /* ---------------- Attachment Pill ---------------- */
    .attachment-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.65rem 0.3rem 0.35rem;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-focus);
      border-radius: var(--radius-full);
      max-width: fit-content;
      font-size: 0.78rem;
    }

    .pill-thumb {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      object-fit: cover;
    }

    .pill-name {
      color: var(--text-primary);
      font-weight: 500;
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-pill-remove {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      transition: color var(--transition-fast);
    }

    .btn-pill-remove:hover {
      color: var(--accent-rose);
    }

    /* ---------------- Input Row ---------------- */
    .input-row {
      display: flex;
      align-items: flex-end;
      gap: 0.65rem;
      background: var(--bg-input);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 0.4rem 0.65rem;
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .input-row:focus-within {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px var(--primary-light);
    }

    .btn-attach {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.05rem;
      transition: all var(--transition-fast);
      flex-shrink: 0;
      margin-bottom: 2px;
    }

    .btn-attach:hover:not(:disabled) {
      background: var(--primary-light);
      color: var(--primary);
    }

    .btn-attach:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .textarea-container {
      flex: 1;
      display: flex;
      align-items: center;
    }

    .chat-textarea {
      width: 100%;
      background: transparent;
      border: none;
      outline: none;
      resize: none;
      color: var(--text-primary);
      font-family: var(--font-body);
      font-size: 0.95rem;
      line-height: 1.45;
      max-height: 140px;
      padding: 0.45rem 0.25rem;
    }

    .chat-textarea::placeholder {
      color: var(--text-muted);
    }

    .btn-send {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-md);
      background: var(--gradient-primary);
      border: none;
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      transition: all var(--transition-fast);
      flex-shrink: 0;
      margin-bottom: 2px;
      box-shadow: 0 0 12px var(--primary-glow);
    }

    .btn-send:hover:not(:disabled) {
      transform: scale(1.06);
      box-shadow: 0 0 18px var(--primary-glow);
    }

    .btn-send:disabled {
      background: var(--bg-surface-elevated);
      color: var(--text-muted);
      cursor: not-allowed;
      box-shadow: none;
      opacity: 0.6;
    }

    /* ---------------- Hint Footer ---------------- */
    .input-hint-row {
      display: flex;
      justify-content: flex-end;
      padding-inline: 0.5rem;
    }

    .hint-text {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .hint-text strong {
      color: var(--text-secondary);
    }
  `]
})
export class ChatInputComponent {
  chatService = inject(ChatService);

  @ViewChild('messageTextarea') private textareaRef!: ElementRef<HTMLTextAreaElement>;

  userInput = '';

  activeImage = this.chatService.activeImage;
  isLoading = this.chatService.isLoading;

  canSend(): boolean {
    if (this.isLoading()) return false;
    const hasText = this.userInput.trim().length > 0;
    const hasImage = !!this.activeImage();
    return hasText || hasImage;
  }

  getPlaceholder(): string {
    if (this.activeImage()) {
      return 'Ask anything about the uploaded image... (e.g. "What is in this image?", "What color is it?")';
    }
    return 'Ask a question or upload an image to start...';
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.canSend()) {
        this.handleSend();
      }
    }
  }

  autoResize() {
    if (this.textareaRef) {
      const el = this.textareaRef.nativeElement;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }
  }

  async handleSend() {
    if (!this.canSend()) return;
    const textToSend = this.userInput;
    this.userInput = '';

    if (this.textareaRef) {
      this.textareaRef.nativeElement.style.height = 'auto';
    }

    await this.chatService.sendMessage(textToSend);
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      try {
        await this.chatService.uploadImage(file);
      } catch {}
      input.value = '';
    }
  }
}
