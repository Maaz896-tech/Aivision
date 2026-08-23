from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class ImageAttachment(BaseModel):
    """Represents an uploaded image attachment."""
    data: str = Field(..., description="Base64 encoded image string (or data URL)")
    mime_type: str = Field(default="image/jpeg", description="MIME type e.g. image/jpeg, image/png, image/webp")
    filename: Optional[str] = Field(default="uploaded_image", description="Original filename")
    size_bytes: Optional[int] = Field(default=None, description="Size in bytes")
    width: Optional[int] = Field(default=None, description="Image pixel width")
    height: Optional[int] = Field(default=None, description="Image pixel height")


class ChatMessage(BaseModel):
    """Represents an individual chat message in a conversation session."""
    id: Optional[str] = Field(default=None, description="Unique message ID")
    role: Literal["user", "assistant", "system"] = Field(..., description="Message author role")
    content: str = Field(..., description="Text content of the message")
    image: Optional[ImageAttachment] = Field(default=None, description="Optional image attached to this turn")
    timestamp: Optional[str] = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="ISO timestamp")


class ChatRequest(BaseModel):
    """Incoming request to the /api/chat endpoint."""
    messages: List[ChatMessage] = Field(..., min_length=1, description="List of previous and current messages")
    image: Optional[ImageAttachment] = Field(default=None, description="Active context image for the conversation")
    model: Optional[str] = Field(default=None, description="Optional Gemini model override")
    temperature: Optional[float] = Field(default=0.4, ge=0.0, le=2.0, description="Sampling temperature")


class ChatResponse(BaseModel):
    """Response returned from the /api/chat endpoint."""
    role: Literal["assistant"] = "assistant"
    content: str = Field(..., description="Generated AI vision response")
    model: str = Field(..., description="Gemini model that produced the response")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class QuickAnalyzeRequest(BaseModel):
    """Request for quick preset vision prompts."""
    image: ImageAttachment
    prompt_type: Literal["describe", "caption", "ocr", "colors_objects", "detailed"] = Field(
        default="describe",
        description="Preset analysis type"
    )
    custom_prompt: Optional[str] = None


class ImageValidationResponse(BaseModel):
    """Result of image upload validation."""
    valid: bool
    filename: str
    mime_type: str
    size_bytes: int
    width: Optional[int] = None
    height: Optional[int] = None
    preview_url: Optional[str] = None
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    app_name: str
    version: str
    gemini_configured: bool
    model: str
    max_image_size_mb: int


class ConfigResponse(BaseModel):
    """Public frontend configuration."""
    app_name: str
    version: str
    max_image_size_mb: int
    allowed_image_types: List[str]
    gemini_configured: bool
    current_model: str
