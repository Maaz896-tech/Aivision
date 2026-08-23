from typing import List, Optional
import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application Settings loaded from Environment or .env file."""
    
    APP_NAME: str = "AI Vision Chatbot API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Gemini API Settings
    GEMINI_API_KEY: Optional[str] = Field(default=None, validation_alias="GEMINI_API_KEY")
    GEMINI_MODEL: str = Field(default="gemini-3.6-flash", validation_alias="GEMINI_MODEL")
    FALLBACK_MODELS: List[str] = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-lite"]
    
    # Image constraints
    MAX_IMAGE_SIZE_MB: int = Field(default=10, validation_alias="MAX_IMAGE_SIZE_MB")
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # CORS configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    @property
    def max_image_size_bytes(self) -> int:
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024
    
    def get_api_key(self) -> Optional[str]:
        """Returns API key from settings or OS environment."""
        if self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip() and self.GEMINI_API_KEY != "your_gemini_api_key_here":
            return self.GEMINI_API_KEY.strip()
        os_key = os.getenv("GEMINI_API_KEY")
        if os_key and os_key.strip() and os_key != "your_gemini_api_key_here":
            return os_key.strip()
        return None


settings = Settings()
