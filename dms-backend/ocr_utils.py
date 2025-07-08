import re
import os
import json
from dateutil.parser import parse
from pdf2image import convert_from_bytes
import pytesseract
from PIL import Image
from werkzeug.utils import secure_filename
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from datetime import datetime

def extract_invoice_data(text):
    """Extract structured data from OCR text - Enhanced for French invoices"""
    data = {
        "invoice_number": None,
        "date": None,
        "total": None,
        "vendor": None,
        "client": None,
        "tva": None,
        "total_ht": None,
        "total_ttc": None,
        "is_invoice": False
    }
    
    # Check if it's an invoice (French terms)
    is_invoice = re.search(r'\b(?:facture|invoice|bill|receipt|devis)\b', text, re.IGNORECASE)
    data["is_invoice"] = bool(is_invoice)
    
    # Extract invoice number (French patterns)
    inv_patterns = [
        r'(?:facture|invoice)\s*(?:no\.?|n°|num[eé]ro)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:num[eé]ro\s*de\s*facture)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:n°\s*facture)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:facture)\s*[:#]?\s*(\d+)'
    ]
    
    for pattern in inv_patterns:
        inv_match = re.search(pattern, text, re.IGNORECASE)
        if inv_match:
            data["invoice_number"] = inv_match.group(1)
            break
    
    # Extract date (French formats)
    date_patterns = [
        r'(?:date\s*de\s*facture|date)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(\d{1,2}\s+\w+\s+\d{4})'
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, text, re.IGNORECASE)
        if date_match:
            try:
                data["date"] = parse(date_match.group(1), dayfirst=True).strftime('%Y-%m-%d')
                break
            except:
                continue
    
    # Extract totals (French currency patterns)
    # Total HT
    total_ht_patterns = [
        r'total\s*ht\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'sous[-\s]*total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?'
    ]
    
    for pattern in total_ht_patterns:
        total_ht_match = re.search(pattern, text, re.IGNORECASE)
        if total_ht_match:
            try:
                amount_str = total_ht_match.group(1).replace(' ', '').replace(',', '.')
                data["total_ht"] = float(amount_str)
                break
            except:
                continue
    
    # Total TTC
    total_ttc_patterns = [
        r'total\s*ttc\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'montant\s*total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?'
    ]
    
    for pattern in total_ttc_patterns:
        total_ttc_match = re.search(pattern, text, re.IGNORECASE)
        if total_ttc_match:
            try:
                amount_str = total_ttc_match.group(1).replace(' ', '').replace(',', '.')
                data["total_ttc"] = float(amount_str)
                data["total"] = data["total_ttc"]  # For backward compatibility
                break
            except:
                continue
    
    # Extract TVA
    tva_patterns = [
        r'tva\s*(?:\d+\s*%\s*)?[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'(?:tva\s*\d+\s*%)\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?'
    ]
    
    for pattern in tva_patterns:
        tva_match = re.search(pattern, text, re.IGNORECASE)
        if tva_match:
            try:
                amount_str = tva_match.group(1).replace(' ', '').replace(',', '.')
                data["tva"] = float(amount_str)
                break
            except:
                continue
    
    # Extract vendor (first few lines usually contain vendor info)
    lines = text.split('\n')[:10]  # Check first 10 lines
    for line in lines:
        line = line.strip()
        if len(line) > 5 and not re.search(r'\d{1,2}[./]\d{1,2}[./]\d{2,4}', line):
            # Skip lines with dates, numbers only, or common headers
            if not re.match(r'^[\d\s\-\.]+$', line) and 'facture' not in line.lower():
                data["vendor"] = line
                break
    
    # Extract client info (look for patterns after "Monsieur", "Madame", "Client", etc.)
    client_patterns = [
        r'(?:monsieur|madame|m\.|mme|client)\s+(.+?)(?:\n|$)',
        r'(?:destinataire|à)\s*[:#]?\s*(.+?)(?:\n|$)'
    ]
    
    for pattern in client_patterns:
        client_match = re.search(pattern, text, re.IGNORECASE)
        if client_match:
            data["client"] = client_match.group(1).strip()
            break
    
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
                image = Image.open(file_path).convert("RGB")
                text = pytesseract.image_to_string(image, lang='fra+eng')  # French + English
            elif filename.lower().endswith('.pdf'):
                with open(file_path, 'rb') as pdf_file:
                    images = convert_from_bytes(pdf_file.read())
                    for img in images:
                        text += pytesseract.image_to_string(img, lang='fra+eng') + "\n"
            
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

def generate_report_pdf(confirmed_data, output_path, original_filename):
    """Generate a PDF report with confirmed invoice data"""
    try:
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        story.append(Paragraph("RAPPORT DE FACTURE", title_style))
        story.append(Spacer(1, 20))
        
        # Document info
        story.append(Paragraph(f"<b>Document original:</b> {original_filename}", styles['Normal']))
        story.append(Paragraph(f"<b>Date de traitement:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Invoice details table
        data = [
            ['Champ', 'Valeur'],
            ['Numéro de facture', confirmed_data.get('invoice_number', 'N/A')],
            ['Date', confirmed_data.get('date', 'N/A')],
            ['Fournisseur', confirmed_data.get('vendor', 'N/A')],
            ['Client', confirmed_data.get('client', 'N/A')],
            ['Total HT', f"{confirmed_data.get('total_ht', 'N/A')} €" if confirmed_data.get('total_ht') else 'N/A'],
            ['TVA', f"{confirmed_data.get('tva', 'N/A')} €" if confirmed_data.get('tva') else 'N/A'],
            ['Total TTC', f"{confirmed_data.get('total_ttc', 'N/A')} €" if confirmed_data.get('total_ttc') else 'N/A'],
            ['Type de document', 'Facture' if confirmed_data.get('is_invoice') else 'Autre document']
        ]
        
        table = Table(data, colWidths=[2*inch, 3*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        story.append(Spacer(1, 30))
        
        # Footer
        footer_text = "Ce rapport a été généré automatiquement par le système DMS."
        story.append(Paragraph(footer_text, styles['Normal']))
        
        doc.build(story)
        return True
        
    except Exception as e:
        print(f"Error generating PDF report: {e}")
        return False
