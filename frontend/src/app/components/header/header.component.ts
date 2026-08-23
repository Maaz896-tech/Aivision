import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="app-header glass-panel">
      <div class="header-left">
        <div class="logo-icon-wrapper">
          <i class="fa-solid fa-eye-low-vision logo-icon"></i>
          <span class="pulse-indicator"></span>
        </div>
        <div class="title-group">
          <div class="title-row">
            <h1 class="brand-title">Vision<span class="gradient-text">AI</span></h1>
            <span class="version-badge">v1.0</span>
          </div>
          <p class="brand-subtitle">Production Multimodal Vision Intelligence</p>
        </div>
      </div>

      <div class="header-right">
        <!-- Backend & Model Status Indicator -->
        <div class="status-pill" [class.ready]="isConfigured()" [class.warning]="!isConfigured()">
          <span class="status-dot"></span>
          <span class="status-text">
            {{ isConfigured() ? (currentModel() || 'Gemini 2.0 Flash') : 'API Key Pending' }}
          </span>
        </div>

        <!-- Clear Chat Button -->
        @if (hasMessages()) {
          <button 
            type="button" 
            class="btn-icon" 
            (click)="onClearChat()" 
            title="Clear Conversation"
            aria-label="Clear Conversation">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        }

        <!-- Theme Switcher -->
        <button 
          type="button" 
          class="btn-icon theme-toggle" 
          (click)="themeService.toggleTheme()" 
          [title]="themeService.currentTheme() === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
          aria-label="Toggle Theme">
          <i class="fa-solid" [class.fa-sun]="themeService.currentTheme() === 'dark'" [class.fa-moon]="themeService.currentTheme() === 'light'"></i>
        </button>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.5rem;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-surface-glass);
      z-index: 50;
      position: relative;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .logo-icon-wrapper {
      position: relative;
      width: 42px;
      height: 42px;
      border-radius: var(--radius-md);
      background: var(--gradient-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 1.25rem;
      box-shadow: 0 0 16px var(--primary-glow);
    }

    .pulse-indicator {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--accent-emerald);
      border: 2px solid var(--bg-surface);
    }

    .title-group {
      display: flex;
      flex-direction: column;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .brand-title {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0;
      line-height: 1.2;
    }

    .version-badge {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
      background: var(--primary-light);
      color: var(--primary);
      border: 1px solid var(--border-glass);
    }

    .brand-subtitle {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 500;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-pill.ready .status-dot {
      background: var(--accent-emerald);
      box-shadow: 0 0 8px var(--accent-emerald);
    }

    .status-pill.warning .status-dot {
      background: var(--accent-amber);
      box-shadow: 0 0 8px var(--accent-amber);
    }

    .status-pill.ready .status-text {
      color: var(--text-primary);
    }

    .status-pill.warning .status-text {
      color: var(--accent-amber);
    }

    .btn-icon {
      width: 38px;
      height: 38px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1rem;
      transition: all var(--transition-fast);
    }

    .btn-icon:hover {
      background: var(--primary-light);
      color: var(--primary);
      border-color: var(--border-focus);
      transform: translateY(-1px);
    }

    .theme-toggle:hover i {
      transform: rotate(15deg);
    }
  `]
})
export class HeaderComponent {
  chatService = inject(ChatService);
  themeService = inject(ThemeService);

  isConfigured() {
    return this.chatService.config()?.gemini_configured ?? true;
  }

  currentModel() {
    return this.chatService.config()?.current_model;
  }

  hasMessages() {
    return this.chatService.messages().length > 0;
  }

  onClearChat() {
    if (confirm('Clear the current conversation and start fresh?')) {
      this.chatService.clearConversation();
    }
  }
}
