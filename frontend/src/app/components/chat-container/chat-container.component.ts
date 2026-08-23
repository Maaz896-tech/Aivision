import { Component, inject, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { ChatMessage, QuickPrompt } from '../../models/chat.models';

@Component({
  selector: 'app-chat-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-container" #scrollContainer (scroll)="onScroll()">
      <!-- Empty State / Welcome Screen -->
      @if (chatService.messages().length === 0) {
        <div class="welcome-screen animate-fade-in">
          <div class="welcome-hero-badge">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <h2 class="welcome-title">Ask anything about your images</h2>
          <p class="welcome-desc">
            Upload any image (PNG, JPEG, WEBP) to inspect objects, generate captions, extract visible text, or dive deep into visual composition.
          </p>

          <div class="welcome-suggestions">
            <h3 class="suggestions-heading">Try asking questions like:</h3>
            <div class="suggestions-grid">
              <div class="suggestion-card" (click)="onSelectSampleQuestion('What is happening in this image?')">
                <i class="fa-regular fa-comments"></i>
                <div class="suggestion-text">
                  <div class="suggestion-prompt">"What is happening in this image?"</div>
                  <div class="suggestion-sub">General visual overview & context</div>
                </div>
              </div>

              <div class="suggestion-card" (click)="onSelectSampleQuestion('What are the key objects and colors?')">
                <i class="fa-solid fa-palette"></i>
                <div class="suggestion-text">
                  <div class="suggestion-prompt">"What are the key objects and colors?"</div>
                  <div class="suggestion-sub">Color palette, lighting & items</div>
                </div>
              </div>

              <div class="suggestion-card" (click)="onSelectSampleQuestion('Generate 3 creative captions for social media.')">
                <i class="fa-solid fa-hashtag"></i>
                <div class="suggestion-text">
                  <div class="suggestion-prompt">"Generate 3 creative captions..."</div>
                  <div class="suggestion-sub">Captions with hashtags</div>
                </div>
              </div>

              <div class="suggestion-card" (click)="onSelectSampleQuestion('Read and transcribe all visible text.')">
                <i class="fa-solid fa-barcode"></i>
                <div class="suggestion-text">
                  <div class="suggestion-prompt">"Read and transcribe all visible text"</div>
                  <div class="suggestion-sub">OCR document & sign transcription</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Message History Stream -->
      <div class="messages-stream">
        @for (msg of chatService.messages(); track msg.id) {
          <div 
            class="message-row" 
            [class.user-row]="msg.role === 'user'" 
            [class.ai-row]="msg.role === 'assistant'"
            [class.error-row]="msg.status === 'error'">

            <!-- AI Avatar for assistant messages -->
            @if (msg.role === 'assistant') {
              <div class="ai-avatar-badge" [class.error-avatar]="msg.status === 'error'">
                <i class="fa-solid" [class.fa-robot]="msg.status !== 'error'" [class.fa-triangle-exclamation]="msg.status === 'error'"></i>
              </div>
            }

            <div class="bubble-wrapper">
              <!-- Attached Image Thumbnail inside Message Bubble (if any) -->
              @if (msg.image) {
                <div class="message-attached-image" (click)="chatService.openImageModal(msg.image.data)">
                  <img [src]="msg.image.data" [alt]="msg.image.filename || 'Attached image'" />
                  <div class="image-overlay-info">
                    <i class="fa-solid fa-image"></i>
                    <span>{{ msg.image.filename || 'Uploaded Image' }}</span>
                  </div>
                </div>
              }

              <!-- Text Content -->
              <div class="message-bubble" [class.user-bubble]="msg.role === 'user'" [class.ai-bubble]="msg.role === 'assistant'">
                @if (msg.role === 'assistant') {
                  <div class="markdown-body" [innerHTML]="msg.renderedHtml || msg.content"></div>
                } @else {
                  <div class="user-text">{{ msg.content }}</div>
                }
              </div>

              <!-- Message Footer (Timestamp, Model, Copy button) -->
              <div class="message-footer">
                <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                @if (msg.model) {
                  <span class="model-tag">{{ msg.model }}</span>
                }
                @if (msg.role === 'assistant' && msg.status !== 'error') {
                  <button 
                    type="button" 
                    class="btn-copy" 
                    (click)="copyMessage(msg)"
                    [title]="copiedMessageId() === msg.id ? 'Copied!' : 'Copy to clipboard'">
                    <i class="fa-regular" [class.fa-copy]="copiedMessageId() !== msg.id" [class.fa-check]="copiedMessageId() === msg.id"></i>
                    <span>{{ copiedMessageId() === msg.id ? 'Copied' : 'Copy' }}</span>
                  </button>
                }
              </div>
            </div>

            <!-- User Avatar -->
            @if (msg.role === 'user') {
              <div class="user-avatar-badge">
                <i class="fa-solid fa-user"></i>
              </div>
            }
          </div>
        }

        <!-- AI Typing / Processing State Indicator -->
        @if (chatService.isLoading()) {
          <div class="message-row ai-row loading-row animate-fade-in">
            <div class="ai-avatar-badge loading-avatar">
              <i class="fa-solid fa-eye fa-fade"></i>
            </div>
            <div class="bubble-wrapper">
              <div class="message-bubble ai-bubble loading-bubble">
                <div class="typing-dots">
                  <span class="dot dot-1"></span>
                  <span class="dot dot-2"></span>
                  <span class="dot dot-3"></span>
                </div>
                <span class="loading-label">Analyzing image with Multimodal AI...</span>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    
    .chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* ---------------- Welcome Screen ---------------- */
    .welcome-screen {
      max-width: 680px;
      margin: auto;
      text-align: center;
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .welcome-hero-badge {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-lg);
      background: var(--gradient-primary);
      color: #ffffff;
      font-size: 1.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      box-shadow: 0 0 30px var(--primary-glow);
    }

    .welcome-title {
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 0.75rem;
    }

    .welcome-desc {
      font-size: 0.95rem;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 540px;
      margin-bottom: 2rem;
    }

    .welcome-suggestions {
      width: 100%;
      text-align: left;
    }

    .suggestions-heading {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.85rem;
    }

    .suggestions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 0.75rem;
    }

    .suggestion-card {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      padding: 0.85rem 1rem;
      border-radius: var(--radius-md);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .suggestion-card i {
      color: var(--primary);
      font-size: 1.1rem;
      margin-top: 0.15rem;
    }

    .suggestion-card:hover {
      background: var(--primary-light);
      border-color: var(--border-focus);
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }

    .suggestion-prompt {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .suggestion-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }

    /* ---------------- Message Stream ---------------- */
    .messages-stream {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      max-width: 860px;
      width: 100%;
      margin: 0 auto;
    }

    .message-row {
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      width: 100%;
    }

    .user-row {
      justify-content: flex-end;
    }

    .ai-row {
      justify-content: flex-start;
    }

    .ai-avatar-badge, .user-avatar-badge {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      flex-shrink: 0;
    }

    .ai-avatar-badge {
      background: var(--gradient-primary);
      color: #ffffff;
      box-shadow: 0 0 12px var(--primary-glow);
    }

    .ai-avatar-badge.error-avatar {
      background: var(--accent-rose);
      box-shadow: 0 0 12px rgba(244, 63, 94, 0.4);
    }

    .user-avatar-badge {
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
    }

    .bubble-wrapper {
      display: flex;
      flex-direction: column;
      max-width: 82%;
    }

    .user-row .bubble-wrapper {
      align-items: flex-end;
    }

    .ai-row .bubble-wrapper {
      align-items: flex-start;
    }

    .message-attached-image {
      margin-bottom: 0.5rem;
      border-radius: var(--radius-sm);
      overflow: hidden;
      max-width: 240px;
      max-height: 160px;
      border: 1px solid var(--border-subtle);
      position: relative;
      cursor: pointer;
      background: #000;
    }

    .message-attached-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform var(--transition-fast);
    }

    .message-attached-image:hover img {
      transform: scale(1.05);
    }

    .image-overlay-info {
      position: absolute;
      bottom: 0;
      inset-inline: 0;
      padding: 0.25rem 0.5rem;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      color: #ffffff;
      font-size: 0.72rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .message-bubble {
      padding: 0.9rem 1.15rem;
      border-radius: var(--radius-lg);
      word-break: break-word;
      line-height: 1.55;
    }

    .user-bubble {
      background: var(--gradient-user-bubble);
      color: #ffffff;
      border-bottom-right-radius: var(--radius-xs);
      box-shadow: 0 4px 15px rgba(79, 70, 229, 0.25);
    }

    .user-text {
      white-space: pre-wrap;
      font-size: 0.95rem;
    }

    .ai-bubble {
      background: var(--bg-message-ai);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      border-bottom-left-radius: var(--radius-xs);
      box-shadow: var(--shadow-sm);
    }

    .error-row .ai-bubble {
      border-color: rgba(244, 63, 94, 0.4);
      background: rgba(244, 63, 94, 0.08);
    }

    .message-footer {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-top: 0.35rem;
      padding: 0 0.25rem;
    }

    .message-time {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .model-tag {
      font-size: 0.68rem;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--primary);
    }

    .btn-copy {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.72rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;
      padding: 0.15rem 0.35rem;
      border-radius: var(--radius-xs);
      transition: all var(--transition-fast);
    }

    .btn-copy:hover {
      color: var(--primary);
      background: var(--primary-light);
    }

    /* ---------------- Loading / Typing Bubble ---------------- */
    .loading-bubble {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.85rem 1.15rem;
    }

    .typing-dots {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .typing-dots .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--primary);
      animation: bounceDot 1.4s infinite ease-in-out both;
    }

    .typing-dots .dot-1 { animation-delay: -0.32s; }
    .typing-dots .dot-2 { animation-delay: -0.16s; }

    .loading-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-style: italic;
    }
  `]
})
export class ChatContainerComponent {
  chatService = inject(ChatService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef<HTMLDivElement>;

  copiedMessageId = signal<string | null>(null);

  // Auto-scroll is disabled per user request, user will manually scroll
  onScroll() {
    // Scroll event logic can be added here if needed in the future
  }

  onSelectSampleQuestion(question: string) {
    this.chatService.sendMessage(question);
  }

  copyMessage(msg: ChatMessage) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(msg.content).then(() => {
      this.copiedMessageId.set(msg.id);
      setTimeout(() => this.copiedMessageId.set(null), 2000);
    });
  }

  formatTime(isoString?: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}
