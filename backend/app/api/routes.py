import base64
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from typing import Optional

from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    QuickAnalyzeRequest,
    ImageValidationResponse,
    HealthResponse,
    ConfigResponse,
    ImageAttachment
)
from app.services.image_service import image_service
from app.services.vision_service import vision_service

router = APIRouter(prefix="/api", tags=["Vision Chatbot"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify backend and AI readiness."""
    return HealthResponse(
        status="ok",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        gemini_configured=vision_service.is_configured(),
        model=settings.GEMINI_MODEL,
        max_image_size_mb=settings.MAX_IMAGE_SIZE_MB
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Returns runtime configuration for the frontend UI."""
    return ConfigResponse(
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        max_image_size_mb=settings.MAX_IMAGE_SIZE_MB,
        allowed_image_types=settings.ALLOWED_IMAGE_TYPES,
        gemini_configured=vision_service.is_configured(),
        current_model=settings.GEMINI_MODEL
    )


@router.post("/upload", response_model=ImageValidationResponse)
async def upload_and_validate_image(file: UploadFile = File(...)):
    """
    Validates uploaded image file, extracts dimensions, and returns base64 data URI.
    Does not save to disk, processing completely in memory.
    """
    try:
        content = await file.read()
        val_result = image_service.validate_image_bytes(
            image_bytes=content,
            filename=file.filename or "uploaded_image",
            declared_mime=file.content_type
        )

        if not val_result.valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=val_result.error or "Invalid image file."
            )

        # Generate base64 data URI for instant frontend display
        b64_encoded = base64.b64encode(content).decode("utf-8")
        preview_url = f"data:{val_result.mime_type};base64,{b64_encoded}"

        return ImageValidationResponse(
            valid=True,
            filename=val_result.filename,
            mime_type=val_result.mime_type,
            size_bytes=val_result.size_bytes,
            width=val_result.width,
            height=val_result.height,
            preview_url=preview_url
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload handling error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process image: {str(e)}"
        )


@router.post("/chat", response_model=ChatResponse)
async def chat_with_vision(req: ChatRequest):
    """
    Main conversational endpoint. Accepts conversation turns and active image context,
    invokes Gemini Multimodal Vision API, and returns assistant response.
    """
    # 1. Validate active image attachment if present
    normalized_image: Optional[ImageAttachment] = None
    if req.image:
        is_valid, err, norm_img = image_service.validate_attachment(req.image)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid attached image: {err}"
            )
        normalized_image = norm_img

    # 2. Check if at least one message has content
    if not req.messages or not req.messages[-1].content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty."
        )

    # 3. Call Gemini Vision service
    try:
        response = await vision_service.generate_response(
            messages=req.messages,
            active_image=normalized_image,
            model_name=req.model,
            temperature=req.temperature or 0.4
        )
        return response

    except ValueError as ve:
        # Configuration error (e.g. missing API key)
        logger.warning(f"Configuration error: {ve}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Chat generation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Vision generation failed: {str(e)}"
        )


@router.post("/analyze", response_model=ChatResponse)
async def quick_analyze_image(req: QuickAnalyzeRequest):
    """
    Executes a preset vision prompt (Describe, Caption, OCR, Objects/Colors) on an image.
    """
    is_valid, err, norm_img = image_service.validate_attachment(req.image)
    if not is_valid or not norm_img:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image for analysis: {err}"
        )

    try:
        req.image = norm_img
        return await vision_service.quick_analyze(req)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Quick analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image analysis failed: {str(e)}"
        )
