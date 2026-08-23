import io
import asyncio
from typing import List, Optional, Dict, Any
from PIL import Image

from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import ChatMessage, ImageAttachment, ChatResponse, QuickAnalyzeRequest
from app.services.image_service import image_service


class VisionService:
    """
    Service for interacting with Google Gemini Multimodal Vision models.
    Supports multi-turn conversations, single-image analysis, and model fallbacks.
    Uses Google GenAI SDK with graceful fallback.
    """

    SYSTEM_INSTRUCTION = (
        "You are an expert, highly observant, and friendly AI Vision Assistant. "
        "Your task is to analyze images accurately and answer user questions in clear, "
        "well-structured natural language. Use markdown formatting (headings, bullet points, bold text) "
        "where appropriate for readability. If you are uncertain about a specific detail in the image, "
        "honestly state your observation with reasonable nuance rather than hallucinating."
    )

    PRESET_PROMPTS = {
        "describe": "Please describe what is happening in this image in a concise yet thorough overview.",
        "caption": "Generate 3 creative, engaging, and accurate captions for this image (one short, one descriptive, one social-media style with relevant hashtags).",
        "ocr": "Extract and transcribe all readable text, signs, labels, numbers, or logos visible in this image. Format them clearly.",
        "colors_objects": "Identify the key objects, main subjects, dominant colors, and background setting visible in this image.",
        "detailed": "Provide a comprehensive, high-detail analysis of this image, including subject matter, visual composition, lighting, style, colors, mood, and any notable background details."
    }

    def __init__(self):
        pass

    def _get_api_key(self) -> Optional[str]:
        return settings.get_api_key()

    def is_configured(self) -> bool:
        return bool(self._get_api_key())

    def _build_multimodal_contents(
        self,
        messages: List[ChatMessage],
        active_image: Optional[ImageAttachment] = None
    ) -> List[Any]:
        """
        Builds content structures including PIL images and text turns.
        """
        contents = []
        image_injected = False

        for msg in messages:
            parts = []
            if msg.image:
                try:
                    _, img_bytes = image_service.parse_base64_data(msg.image.data)
                    parts.append(Image.open(io.BytesIO(img_bytes)))
                    image_injected = True
                except Exception as e:
                    logger.warning(f"Failed to parse message image: {e}")

            if not image_injected and active_image and msg.role == "user":
                try:
                    _, img_bytes = image_service.parse_base64_data(active_image.data)
                    parts.append(Image.open(io.BytesIO(img_bytes)))
                    image_injected = True
                except Exception as e:
                    logger.warning(f"Failed to parse active image: {e}")

            parts.append(msg.content)
            role = "model" if msg.role == "assistant" else "user"
            contents.append({
                "role": role,
                "parts": parts
            })

        if active_image and not image_injected and contents:
            try:
                _, img_bytes = image_service.parse_base64_data(active_image.data)
                contents[-1]["parts"].insert(0, Image.open(io.BytesIO(img_bytes)))
            except Exception as e:
                logger.warning(f"Failed to inject fallback image: {e}")

        return contents

    async def generate_response(
        self,
        messages: List[ChatMessage],
        active_image: Optional[ImageAttachment] = None,
        model_name: Optional[str] = None,
        temperature: float = 0.4
    ) -> ChatResponse:
        """
        Generates multimodal AI response using Google Gemini models with fallback candidates.
        """
        api_key = self._get_api_key()
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY is not configured in backend environment or .env file. "
                "Please set your GEMINI_API_KEY in backend/.env to enable live AI vision responses."
            )

        # Candidate models to try in order
        primary_model = model_name or settings.GEMINI_MODEL
        model_candidates = [primary_model]
        for fb in settings.FALLBACK_MODELS:
            if fb not in model_candidates:
                model_candidates.append(fb)

        contents = self._build_multimodal_contents(messages, active_image)
        last_error = None

        # 1. Try with google-genai (newest SDK)
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=api_key)

            for candidate in model_candidates:
                try:
                    logger.info(f"Invoking google-genai model: {candidate}")
                    loop = asyncio.get_event_loop()

                    # Convert contents to genai format
                    genai_contents = []
                    for c in contents:
                        for part in c["parts"]:
                            if isinstance(part, Image.Image):
                                buf = io.BytesIO()
                                part.save(buf, format="PNG")
                                genai_contents.append(
                                    types.Part.from_bytes(data=buf.getvalue(), mime_type="image/png")
                                )
                            elif isinstance(part, str):
                                genai_contents.append(part)

                    response = await loop.run_in_executor(
                        None,
                        lambda: client.models.generate_content(
                            model=candidate,
                            contents=genai_contents,
                            config=types.GenerateContentConfig(
                                system_instruction=self.SYSTEM_INSTRUCTION,
                                temperature=temperature,
                            )
                        )
                    )

                    if response and response.text:
                        return ChatResponse(
                            content=response.text,
                            model=candidate,
                            metadata={"provider": "google-genai"}
                        )
                except Exception as e:
                    logger.warning(f"google-genai attempt on {candidate} failed: {e}")
                    last_error = e

        except Exception as sdk_err:
            logger.info(f"google-genai client init note: {sdk_err}. Trying google.generativeai...")

        # 2. Fallback to google.generativeai if google-genai had issues
        try:
            import google.generativeai as legacy_genai
            legacy_genai.configure(api_key=api_key)

            for candidate in model_candidates:
                try:
                    logger.info(f"Invoking legacy generativeai model: {candidate}")
                    model_inst = legacy_genai.GenerativeModel(
                        model_name=candidate,
                        system_instruction=self.SYSTEM_INSTRUCTION,
                        generation_config={"temperature": temperature, "top_p": 0.95}
                    )
                    loop = asyncio.get_event_loop()
                    response = await loop.run_in_executor(
                        None,
                        lambda: model_inst.generate_content(contents)
                    )

                    if response and response.text:
                        return ChatResponse(
                            content=response.text,
                            model=candidate,
                            metadata={"provider": "google.generativeai"}
                        )
                except Exception as e:
                    logger.warning(f"legacy generativeai attempt on {candidate} failed: {e}")
                    last_error = e

        except Exception as leg_err:
            logger.warning(f"Legacy generativeai fallback exception: {leg_err}")

        error_msg = f"Gemini Vision API error: {str(last_error)}" if last_error else "Failed to generate vision response."
        logger.error(f"All vision model attempts failed: {error_msg}")
        raise RuntimeError(error_msg)

    async def quick_analyze(self, req: QuickAnalyzeRequest) -> ChatResponse:
        """
        Processes preset vision prompts (e.g. Describe, Caption, OCR, Objects/Colors).
        """
        prompt_text = req.custom_prompt or self.PRESET_PROMPTS.get(req.prompt_type, self.PRESET_PROMPTS["describe"])
        user_msg = ChatMessage(
            role="user",
            content=prompt_text,
            image=req.image
        )
        return await self.generate_response(
            messages=[user_msg],
            active_image=req.image
        )


vision_service = VisionService()
