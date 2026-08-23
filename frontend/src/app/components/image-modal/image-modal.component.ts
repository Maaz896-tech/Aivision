import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-image-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (chatService.modalImage(); as imageUrl) {
      <div class="modal-backdrop animate-fade-in" (click)="chatService.closeImageModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">Image Fullscreen View</span>
            <button 
              type="button" 
              class="btn-close-modal" 
              (click)="chatService.closeImageModal()"
              title="Close modal (Esc)"
              aria-label="Close modal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="modal-body">
            <img [src]="imageUrl" alt="Full resolution inspection" class="fullscreen-img" />
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-content {
      background: var(--bg-surface);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-lg);
      overflow: hidden;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-lg);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-surface-elevated);
    }

    .modal-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .btn-close-modal {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-xs);
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .btn-close-modal:hover {
      background: var(--bg-surface);
      color: var(--accent-rose);
    }

    .modal-body {
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
    }

    .fullscreen-img {
      max-width: 100%;
      max-height: 78vh;
      object-fit: contain;
      border-radius: var(--radius-sm);
    }
  `]
})
export class ImageModalComponent {
  chatService = inject(ChatService);

  @HostListener('window:keydown.escape')
  onEscape() {
    this.chatService.closeImageModal();
  }
}
