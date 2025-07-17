import os
from datetime import datetime

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
    
    # Format log entry based on resource type
    if resource_type == "user":
        log_entry = (
            f'{timestamp} - {actor} - {action} User: '
            f'{resource_data["id"]}, {resource_data["username"]}, '
            f'{resource_data["email"]}, {"enabled" if resource_data["is_active"] else "disabled"}'
        )
    elif resource_type == "company":
        log_entry = (
            f'{timestamp} - {actor} - {action} Entity: '
            f'{resource_data["id"]}, {resource_data["name"]}'
        )
    elif resource_type == "document":
        log_entry = (
            f'{timestamp} - {actor} - {action} Document: '
            f'{resource_data["id"]}, {resource_data["filename"]}, '
            f'company_id={resource_data["company_id"]}'
        )
    elif resource_type == "doctype":
        log_entry = (
            f'{timestamp} - {actor} - {action} DocType: '
            f'{resource_data["id"]}, {resource_data["name"]}'
        )
    elif resource_type == "partnertype":
        log_entry = (
            f'{timestamp} - {actor} - {action} PartnerType: '
            f'{resource_data["id"]}, {resource_data["name"]}, '
            f'{"active" if resource_data.get("status", True) else "inactive"}'
        )   
    elif resource_type == "partner":
        log_entry = (
            f'{timestamp} - {actor} - {action} Partner: '
            f'{resource_data["id"]}, {resource_data["company_name"]}, '
            f'type={resource_data.get("partner_type", "N/A")}, '
            f'status={"active" if resource_data.get("status", True) else "inactive"}'
        )     
    else:
        return  # Unsupported resource type
    
    with open(ACTIVITY_LOG, "a") as f:
        f.write(log_entry + "\n")

# ====== Upload Configuration ======
DMS_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../dms-data/upload"))
TEMP_UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "docx", "txt", "doc", "tiff"}

def create_company_doctype_folders(company_id, doctype_id):
    """Create folder structure for company and document type automatically using IDs"""
    company_folder = os.path.join(DMS_UPLOAD_FOLDER, str(company_id))
    doctype_folder = os.path.join(company_folder, str(doctype_id))
    summary_folder = os.path.join(doctype_folder, "summary")
    
    os.makedirs(company_folder, exist_ok=True)
    os.makedirs(doctype_folder, exist_ok=True)
    os.makedirs(summary_folder, exist_ok=True)
    
    return company_folder, doctype_folder, summary_folder