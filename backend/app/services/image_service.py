import base64
import io
import re
from typing import Tuple, Optional
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import ImageAttachment, ImageValidationResponse


class ImageService:
    """Service for validating, processing, and normalizing image attachments."""

    DATA_URL_PATTERN = re.compile(r"^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.*)$")

    @classmethod
    def parse_base64_data(cls, raw_data: str) -> Tuple[str, bytes]:
        """
        Parses raw string data (plain base64 or Data URL) into MIME type and raw bytes.
        """
        raw_data = raw_data.strip()
        match = cls.DATA_URL_PATTERN.match(raw_data)
        if match:
            mime_type = match.group(1).lower()
            b64_str = match.group(2)
        else:
            mime_type = "image/jpeg"
            b64_str = raw_data

        try:
            image_bytes = base64.b64decode(b64_str)
        except Exception as e:
            raise ValueError(f"Invalid base64 image data: {str(e)}")

        return mime_type, image_bytes

    @classmethod
    def validate_image_bytes(
        cls,
        image_bytes: bytes,
        filename: str = "image",
        declared_mime: Optional[str] = None
    ) -> ImageValidationResponse:
        """
        Validates raw image bytes against size, non-empty, and format constraints.
        Extracts width, height, and verified MIME type.
        """
        size_bytes = len(image_bytes)
        
        # 1. Check empty file
        if size_bytes == 0:
            return ImageValidationResponse(
                valid=False,
                filename=filename,
                mime_type=declared_mime or "application/octet-stream",
                size_bytes=0,
                error="The uploaded image file is empty (0 bytes)."
            )

        # 2. Check maximum size
        if size_bytes > settings.max_image_size_bytes:
            mb_size = size_bytes / (1024 * 1024)
            return ImageValidationResponse(
                valid=False,
                filename=filename,
                mime_type=declared_mime or "application/octet-stream",
                size_bytes=size_bytes,
                error=f"Image size ({mb_size:.2f} MB) exceeds maximum allowed size of {settings.MAX_IMAGE_SIZE_MB} MB."
            )

        # 3. Validate image integrity and dimensions using Pillow
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img_format = (img.format or "").upper()
                width, height = img.size
                
                # Map PIL format to MIME type
                format_mime_map = {
                    "JPEG": "image/jpeg",
                    "JPG": "image/jpeg",
                    "PNG": "image/png",
                    "WEBP": "image/webp",
                }
                
                detected_mime = format_mime_map.get(img_format)
                if not detected_mime or detected_mime not in settings.ALLOWED_IMAGE_TYPES:
                    allowed_str = ", ".join(settings.ALLOWED_IMAGE_TYPES)
                    return ImageValidationResponse(
                        valid=False,
                        filename=filename,
                        mime_type=detected_mime or f"image/{img_format.lower()}",
                        size_bytes=size_bytes,
                        error=f"Unsupported format '{img_format}'. Allowed formats: {allowed_str}"
                    )

                return ImageValidationResponse(
                    valid=True,
                    filename=filename,
                    mime_type=detected_mime,
                    size_bytes=size_bytes,
                    width=width,
                    height=height,
                    error=None
                )

        except UnidentifiedImageError:
            return ImageValidationResponse(
                valid=False,
                filename=filename,
                mime_type="application/octet-stream",
                size_bytes=size_bytes,
                error="The file is not a valid or supported image."
            )
        except Exception as e:
            logger.error(f"Image validation exception: {e}")
            return ImageValidationResponse(
                valid=False,
                filename=filename,
                mime_type="application/octet-stream",
                size_bytes=size_bytes,
                error=f"Image processing error: {str(e)}"
            )

    @classmethod
    def validate_attachment(cls, attachment: ImageAttachment) -> Tuple[bool, Optional[str], Optional[ImageAttachment]]:
        """
        Validates an ImageAttachment model, extracts dimensions and ensures cleanliness.
        """
        try:
            detected_mime, img_bytes = cls.parse_base64_data(attachment.data)
            val_result = cls.validate_image_bytes(
                img_bytes,
                filename=attachment.filename or "image",
                declared_mime=attachment.mime_type or detected_mime
            )

            if not val_result.valid:
                return False, val_result.error, None

            # Return updated attachment with exact dimensions and verified MIME
            normalized_attachment = ImageAttachment(
                data=attachment.data,
                mime_type=val_result.mime_type,
                filename=val_result.filename,
                size_bytes=val_result.size_bytes,
                width=val_result.width,
                height=val_result.height
            )
            return True, None, normalized_attachment

        except Exception as e:
            return False, str(e), None


image_service = ImageService()
