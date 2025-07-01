# backend/ocr_utils.py

from PIL import Image
import pytesseract
import io

def extract_text_from_image(file_storage):
    """
    Takes an uploaded image file (via Flask) and returns the OCR text.
    """
    try:
        image = Image.open(file_storage.stream).convert("RGB")
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        return f"OCR failed: {str(e)}"
