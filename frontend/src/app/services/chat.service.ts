import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { marked } from 'marked';

import {
  ChatMessage,
  ImageAttachment,
  ChatRequest,
  ChatResponse,
  ImageValidationResponse,
  ConfigResponse,
  QuickPrompt
} from '../models/chat.models';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = isDevMode() ? '' : 'https://aivision-lle2.vercel.app';

  // State Signals
  readonly messages = signal<ChatMessage[]>([]);
  readonly activeImage = signal<ImageAttachment | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly config = signal<ConfigResponse | null>(null);
  readonly modalImage = signal<string | null>(null);

  // Quick Preset Prompts
  readonly quickPrompts: QuickPrompt[] = [
    {
      id: 'describe',
      label: 'Describe Image',
      icon: 'fa-eye',
      promptText: 'What is in this image? Please provide a clear, insightful description.',
      description: 'Overview of key contents'
    },
    {
      id: 'colors',
      label: 'Objects & Colors',
      icon: 'fa-palette',
      promptText: 'Identify the main objects, dominant colors, and background setting in this image.',
      description: 'Objects, palette & layout'
    },
    {
      id: 'caption',
      label: 'Generate Captions',
      icon: 'fa-quote-left',
      promptText: 'Generate 3 creative, engaging, and accurate captions for this image.',
      description: 'Engaging creative captions'
    },
    {
      id: 'ocr',
      label: 'Extract Text (OCR)',
      icon: 'fa-font',
      promptText: 'Extract and transcribe all readable text, signs, logos, or numbers visible in this image.',
      description: 'Read visible text'
    },
    {
      id: 'detailed',
      label: 'Deep Analysis',
      icon: 'fa-magnifying-glass-chart',
      promptText: 'Provide a detailed breakdown of composition, style, lighting, mood, and notable details.',
      description: 'Composition, mood & lighting'
    }
  ];

  constructor() {
    this.configureMarked();
    this.fetchConfig();
  }

  private configureMarked(): void {
    marked.setOptions({
      gfm: true,
      breaks: true
    });
  }

  renderMarkdown(content: string): string {
    try {
      return marked.parse(content) as string;
    } catch {
      return content;
    }
  }

  async fetchConfig(): Promise<void> {
    try {
      const cfg = await firstValueFrom(this.http.get<ConfigResponse>(this.apiUrl + '/api/config'));
      this.config.set(cfg);
    } catch (err) {
      console.warn('Could not fetch backend config:', err);
    }
  }

  setActiveImage(image: ImageAttachment | null): void {
    this.activeImage.set(image);
  }

  removeActiveImage(): void {
    this.activeImage.set(null);
  }

  clearError(): void {
    this.errorMessage.set(null);
  }

  openImageModal(imageUrl: string): void {
    this.modalImage.set(imageUrl);
  }

  closeImageModal(): void {
    this.modalImage.set(null);
  }

  clearConversation(): void {
    this.messages.set([]);
    this.errorMessage.set(null);
  }

  /**
   * Uploads and validates an image file through the backend image validation pipeline.
   */
  async uploadImage(file: File): Promise<ImageValidationResponse> {
    this.clearError();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await firstValueFrom(
        this.http.post<ImageValidationResponse>(this.apiUrl + '/api/upload', formData)
      );

      if (response.valid && response.preview_url) {
        const attachment: ImageAttachment = {
          data: response.preview_url,
          mime_type: response.mime_type,
          filename: response.filename,
          size_bytes: response.size_bytes,
          width: response.width,
          height: response.height
        };
        this.setActiveImage(attachment);
      }

      return response;
    } catch (err: any) {
      const msg = err.error?.detail || err.message || 'Failed to upload and validate image.';
      this.errorMessage.set(msg);
      throw new Error(msg);
    }
  }

  /**
   * Sends a user message and receives AI Vision response.
   */
  async sendMessage(userText: string): Promise<void> {
    const text = userText.trim();
    if (!text && !this.activeImage()) {
      return;
    }

    this.clearError();
    this.isLoading.set(true);

    const currentImg = this.activeImage();

    // 1. Construct User Message
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-u',
      role: 'user',
      content: text || 'Please analyze this image.',
      image: currentImg ? { ...currentImg } : null,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    // 2. Append User Message
    this.messages.update(prev => [...prev, userMsg]);

    // 3. Prepare payload with full conversation history
    const payloadMessages = this.messages().map(m => ({
      role: m.role,
      content: m.content,
      image: m.image ? { data: m.image.data, mime_type: m.image.mime_type, filename: m.image.filename } : null,
      timestamp: m.timestamp
    }));

    const requestPayload: ChatRequest = {
      messages: payloadMessages,
      image: currentImg ? { data: currentImg.data, mime_type: currentImg.mime_type, filename: currentImg.filename } : null
    };

    try {
      const response = await firstValueFrom(
        this.http.post<ChatResponse>(this.apiUrl + '/api/chat', requestPayload)
      );

      // 4. Construct AI Assistant Message
      const aiMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-a',
        role: 'assistant',
        content: response.content,
        renderedHtml: this.renderMarkdown(response.content),
        model: response.model,
        timestamp: response.timestamp || new Date().toISOString(),
        status: 'sent'
      };

      this.messages.update(prev => [...prev, aiMsg]);

    } catch (err: any) {
      console.error('Chat error:', err);
      let errorDetail = 'Failed to generate response.';
      
      if (err instanceof HttpErrorResponse) {
        if (err.status === 503) {
          errorDetail = err.error?.detail || 'GEMINI_API_KEY is not configured on the backend. Please add your key to backend/.env.';
        } else if (err.error?.detail) {
          errorDetail = err.error.detail;
        } else {
          errorDetail = `Server error (${err.status}): ${err.statusText}`;
        }
      } else if (err.message) {
        errorDetail = err.message;
      }

      this.errorMessage.set(errorDetail);

      // Append error message in chat stream so user sees feedback clearly
      const errorMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-e',
        role: 'assistant',
        content: `⚠️ **Error**: ${errorDetail}`,
        renderedHtml: this.renderMarkdown(`⚠️ **Error**: ${errorDetail}`),
        timestamp: new Date().toISOString(),
        status: 'error'
      };
      this.messages.update(prev => [...prev, errorMsg]);

    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Triggers a quick prompt execution.
   */
  async runQuickPrompt(prompt: QuickPrompt): Promise<void> {
    await this.sendMessage(prompt.promptText);
  }
}
