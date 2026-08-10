import io
import PyPDF2
from PIL import Image

try:
    import pytesseract
except ImportError:
    pytesseract = None

try:
    from pdf2image import convert_from_bytes
except ImportError:
    convert_from_bytes = None

try:
    import docx
except ImportError:
    docx = None


def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """Extracts text from PDF, DOCX, TXT, or Image files using PyPDF2, python-docx, and PyTesseract OCR."""
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    text = ""

    if ext in ['txt', 'md', 'csv']:
        try:
            return file_bytes.decode('utf-8', errors='ignore')
        except Exception as e:
            print(f"[TextExtractor] Error decoding text file: {e}")

    if ext == 'docx' and docx:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            return "\n".join([p.text for p in doc.paragraphs if p.text])
        except Exception as e:
            print(f"[TextExtractor] Error reading docx: {e}")

    if ext == 'pdf':
        try:
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            print(f"[TextExtractor] PyPDF2 error: {e}")

        if not text.strip() and pytesseract and convert_from_bytes:
            print(f"[TextExtractor] No digital text found. Running PyTesseract OCR...")
            try:
                images = convert_from_bytes(file_bytes)
                for img in images:
                    ocr_text = pytesseract.image_to_string(img)
                    if ocr_text:
                        text += ocr_text + "\n"
            except Exception as e:
                print(f"[TextExtractor] PyTesseract PDF OCR error: {e}")
        return text.strip()

    if ext in ['png', 'jpg', 'jpeg']:
        if pytesseract:
            try:
                img = Image.open(io.BytesIO(file_bytes))
                text = pytesseract.image_to_string(img)
                print(f"[TextExtractor] OCR extracted {len(text)} chars from image {filename}")
                return text.strip()
            except Exception as e:
                print(f"[TextExtractor] Image OCR error: {e}")
        return "Image uploaded (OCR unavailable or Tesseract not installed)."

    return text.strip()
