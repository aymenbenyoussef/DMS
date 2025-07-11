
import os
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes

# ====== Logging Configuration ======
LOG_DIR = "../../logs"
ACTIVITY_LOG = os.path.join(LOG_DIR, "activity.log")

def ensure_log_dir():
    """Create logs directory if it doesn't exist"""
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

def log_activity(actor, action, resource_type, resource_data):
    """Log all activities (user/company/document)"""
    ensure_log_dir()
    timestamp = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    if resource_type == "user":
        log_entry = (
            f"{timestamp} - {actor} - {action} User: "
            f"{resource_data["id"]}, {resource_data["username"]}, "
            f"{resource_data["email"]}, {"enabled" if resource_data["is_active"] else "disabled"}"
        )
    elif resource_type == "company":
        log_entry = (
            f"{timestamp} - {actor} - {action} Entity: "
            f"{resource_data["id"]}, {resource_data["name"]}"
        )
    elif resource_type == "document":
        log_entry = (
            f"{timestamp} - {actor} - {action} Document: "
            f"{resource_data["id"]}, {resource_data["filename"]}, "
            f"company_id={resource_data["company_id"]}"
        )
    elif resource_type == "doctype":
        log_entry = (
            f"{timestamp} - {actor} - {action} DocType: "
            f"{resource_data["id"]}, {resource_data["name"]}"
        )
    elif resource_type == "partnertype":
        log_entry = (
            f"{timestamp} - {actor} - {action} PartnerType: "
            f"{resource_data["id"]}, {resource_data["name"]}, "
            f"{"active" if resource_data.get("status", True) else "inactive"}"
        )    
    else:
        return
    
    with open(ACTIVITY_LOG, "a") as f:
        f.write(log_entry + "\n")

def get_activity_logs():
    """Read activity logs from file"""
    ensure_log_dir()
    if not os.path.exists(ACTIVITY_LOG):
        return []
    
    with open(ACTIVITY_LOG, "r") as f:
        return [line.strip() for line in f.readlines() if line.strip()]

def read_activity_logs():
    """Read log file content directly"""
    ensure_log_dir()
    if not os.path.exists(ACTIVITY_LOG):
        return []
    
    try:
        with open(ACTIVITY_LOG, "r") as f:
            return [line.strip() for line in f.readlines() if line.strip()]
    except Exception as e:
        # app.logger.error(f"Error reading log file: {str(e)}")
        return []

# ====== Upload Configuration ======
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "docx", "txt", "doc", "tiff"}

def create_company_doctype_folders(company_name, doctype_name):
    """Create folder structure for company and document type automatically"""
    safe_company_name = secure_filename(company_name)
    safe_doctype_name = secure_filename(doctype_name)
    
    DMS_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../dms-data/upload"))

    company_folder = os.path.join(DMS_UPLOAD_FOLDER, safe_company_name)
    doctype_folder = os.path.join(company_folder, safe_doctype_name)
    summary_folder = os.path.join(doctype_folder, "summary")
    
    os.makedirs(company_folder, exist_ok=True)
    os.makedirs(doctype_folder, exist_ok=True)
    os.makedirs(summary_folder, exist_ok=True)
    
    return company_folder, doctype_folder, summary_folder

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def process_single_file_ocr(file, company_name, doctype_name):
    """Process a single file with OCR and return extracted data"""
    try:
        company_folder, doctype_folder, summary_folder = create_company_doctype_folders(company_name, doctype_name)
        
        filename = secure_filename(file.filename)
        timestamp = int(datetime.now().timestamp())
        unique_filename = f"{timestamp}_{filename}"
        
        TEMP_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
        file_path = os.path.join(doctype_folder, unique_filename)
        
        file.save(file_path)
        
        text = ""
        if filename.lower().endswith((".png", ".jpg", ".jpeg", ".tiff")):
            image = Image.open(file_path).convert("RGB")
            text = pytesseract.image_to_string(image, lang="fra+eng")
        elif filename.lower().endswith(".pdf"):
            with open(file_path, "rb") as pdf_file:
                images = convert_from_bytes(pdf_file.read())
                for img in images:
                    text += pytesseract.image_to_string(img, lang="fra+eng") + "\n"
        
        text_filename = f"{os.path.splitext(unique_filename)[0]}.txt"
        text_path = os.path.join(doctype_folder, text_filename)
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(text)
        
        # Placeholder for extract_invoice_data - this needs to be in ocr_utils.py
        # from ocr_utils import extract_invoice_data
        extracted_data = {}
        # extracted_data = extract_invoice_data(text)
        
        return {
            "filename": unique_filename,
            "original_filename": filename,
            "file_path": file_path,
            "text_path": text_path,
            "ocr_text": text,
            "extracted_data": extracted_data,
            "company_folder": company_folder,
            "doctype_folder": doctype_folder,
            "summary_folder": summary_folder
        }
        
    except Exception as e:
        return {
            "filename": file.filename,
            "error": str(e)
        }


