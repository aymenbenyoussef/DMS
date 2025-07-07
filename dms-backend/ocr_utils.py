import re
import os
import json
from dateutil.parser import parse
from pdf2image import convert_from_bytes
import pytesseract
from PIL import Image
from werkzeug.utils import secure_filename

def extract_invoice_data(text):
    """Extract structured data from OCR text"""
    data = {
        "invoice_number": None,
        "date": None,
        "total": None,
        "vendor": None,
        "is_invoice": False
    }
    
    # Check if it's an invoice
    is_invoice = re.search(r'\b(?:invoice|bill|receipt)\b', text, re.IGNORECASE)
    data["is_invoice"] = bool(is_invoice)
    
    # Extract invoice number
    inv_match = re.search(r'(?:invoice\s*no\.?|inv\.?)\s*[:#]?\s*(\w+-\d+)', text, re.IGNORECASE)
    if inv_match:
        data["invoice_number"] = inv_match.group(1)
    
    # Extract date
    date_match = re.search(r'(\d{1,2}[./]\d{1,2}[./]\d{2,4})', text)
    if date_match:
        try:
            data["date"] = parse(date_match.group(1)).strftime('%Y-%m-%d')
        except:
            pass
    
    # Extract total
    total_match = re.search(r'total\s+[\$\u20AC]?\s*([\d,]+\.\d{2})', text, re.IGNORECASE)
    if total_match:
        data["total"] = float(total_match.group(1).replace(',', ''))
    
    # Extract vendor
    vendor_match = re.search(r'from\s*(.+?)\n', text, re.IGNORECASE)
    if vendor_match:
        data["vendor"] = vendor_match.group(1).strip()
    
    return data

def process_uploaded_files(files, base_upload_path, company_name, doctype_name):
    """Process multiple uploaded files with OCR and save structured data"""
    results = []
    base_path = os.path.join(base_upload_path, company_name, doctype_name)
    os.makedirs(base_path, exist_ok=True)
    
    for file in files:
        if file.filename == '':
            continue
            
        try:
            # Save original file
            filename = secure_filename(file.filename)
            file_path = os.path.join(base_path, filename)
            file.save(file_path)
            
            # OCR processing
            text = ""
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff')):
                image = Image.open(file.stream).convert("RGB")
                text = pytesseract.image_to_string(image)
            elif filename.lower().endswith('.pdf'):
                images = convert_from_bytes(file.read())
                for img in images:
                    text += pytesseract.image_to_string(img) + "\n"
                file.stream.seek(0)  # Reset file pointer
            
            # Save OCR text
            text_filename = f"{os.path.splitext(filename)[0]}.txt"
            text_path = os.path.join(base_path, text_filename)
            with open(text_path, 'w', encoding='utf-8') as f:
                f.write(text)
            
            # Extract structured data
            extracted_data = extract_invoice_data(text)
            
            results.append({
                "filename": filename,
                "file_path": file_path,
                "text_path": text_path,
                "ocr_text": text,
                "extracted_data": extracted_data
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e)
            })
    
    return results