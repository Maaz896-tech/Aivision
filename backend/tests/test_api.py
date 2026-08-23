import pytest
import io
import base64
from PIL import Image
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.services.image_service import image_service
from app.models.schemas import ImageAttachment, ChatMessage

client = TestClient(app)


def create_test_image_bytes(format="PNG", width=100, height=100, color="red") -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format=format)
    return buf.getvalue()


def create_test_base64_data_uri(format="PNG", width=100, height=100, color="blue") -> str:
    img_bytes = create_test_image_bytes(format=format, width=width, height=height, color=color)
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    mime = f"image/{format.lower()}"
    return f"data:{mime};base64,{b64}"


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "version" in data


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "gemini_configured" in data
    assert "model" in data


def test_config_endpoint():
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert data["max_image_size_mb"] == 10
    assert "image/jpeg" in data["allowed_image_types"]
    assert "image/png" in data["allowed_image_types"]


def test_image_upload_valid_png():
    img_bytes = create_test_image_bytes("PNG", 200, 150)
    files = {"file": ("test.png", img_bytes, "image/png")}
    response = client.post("/api/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["mime_type"] == "image/png"
    assert data["width"] == 200
    assert data["height"] == 150
    assert data["preview_url"].startswith("data:image/png;base64,")


def test_image_upload_valid_jpeg():
    img_bytes = create_test_image_bytes("JPEG", 300, 200)
    files = {"file": ("sample.jpg", img_bytes, "image/jpeg")}
    response = client.post("/api/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["mime_type"] == "image/jpeg"
    assert data["width"] == 300
    assert data["height"] == 200


def test_image_upload_empty_file():
    files = {"file": ("empty.jpg", b"", "image/jpeg")}
    response = client.post("/api/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_image_upload_invalid_file_type():
    files = {"file": ("script.exe", b"not an image", "application/octet-stream")}
    response = client.post("/api/upload", files=files)
    assert response.status_code == 400


def test_chat_validation_empty_messages():
    payload = {
        "messages": []
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 422  # Pydantic min_length validation


def test_chat_validation_empty_content():
    payload = {
        "messages": [{"role": "user", "content": "   "}]
    }
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@patch("app.services.vision_service.vision_service._get_api_key", return_value="test_api_key")
@patch("google.generativeai.GenerativeModel")
def test_chat_successful_mocked_gemini(mock_model_class, mock_get_key):
    # Setup mock generative model response
    mock_instance = MagicMock()
    mock_candidate = MagicMock()
    mock_candidate.finish_reason = "STOP"
    mock_response = MagicMock()
    mock_response.text = "This image shows a bright red rectangle on a white background."
    mock_response.candidates = [mock_candidate]
    mock_instance.generate_content.return_value = mock_response
    mock_model_class.return_value = mock_instance

    b64_uri = create_test_base64_data_uri("PNG", 50, 50, "red")
    payload = {
        "messages": [
            {"role": "user", "content": "What is in this image?"}
        ],
        "image": {
            "data": b64_uri,
            "mime_type": "image/png",
            "filename": "red_box.png"
        }
    }

    response = client.post("/api/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "assistant"
    assert "red rectangle" in data["content"]
    assert "model" in data
