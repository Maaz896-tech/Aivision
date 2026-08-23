export interface ImageAttachment {
  data: string; // Base64 data URL
  mime_type: string;
  filename?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: ImageAttachment | null;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  renderedHtml?: string;
  model?: string;
}

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    image?: ImageAttachment | null;
    timestamp?: string;
  }>;
  image?: ImageAttachment | null;
  model?: string;
  temperature?: number;
}

export interface ChatResponse {
  role: 'assistant';
  content: string;
  model: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface QuickAnalyzeRequest {
  image: ImageAttachment;
  prompt_type: 'describe' | 'caption' | 'ocr' | 'colors_objects' | 'detailed';
  custom_prompt?: string;
}

export interface ImageValidationResponse {
  valid: boolean;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width?: number;
  height?: number;
  preview_url?: string;
  error?: string;
}

export interface ConfigResponse {
  app_name: string;
  version: string;
  max_image_size_mb: number;
  allowed_image_types: string[];
  gemini_configured: boolean;
  current_model: string;
}

export interface QuickPrompt {
  id: string;
  label: string;
  icon: string;
  promptText: string;
  description: string;
}
