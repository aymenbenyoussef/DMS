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
from dotenv import load_dotenv

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'  # Adjust path as needed

load_dotenv()
CURRENCY = os.getenv('CURRENCY', 'dt')

def extract_invoice_data(text):
    """Extract structured data from OCR text - Enhanced for French invoices with comprehensive patterns"""
    data = {
        "invoice_number": None,
        "date": None,
        "total": None,
        #"partner": None,
        "partner_id": None,
        "tva": None,
        "total_ht": None,
        "total_ttc": None,
        "is_invoice": False
    }
    
    # Check if it's an invoice (French and English terms with variations)
    invoice_indicators = [
        r'\b(?:facture|invoice|bill|receipt|devis|quotation|estimate)\b',
        r'\b(?:FACTURE|INVOICE|BILL|RECEIPT|DEVIS|QUOTATION|ESTIMATE)\b',
        r'\b(?:Facture|Invoice|Bill|Receipt|Devis|Quotation|Estimate)\b',
        r'\b(?:facture\s*d\'avoir|FACTURE\s*D\'AVOIR|Facture\s*d\'avoir)\b',
        r'\b(?:credit\s*note|CREDIT\s*NOTE|Credit\s*Note)\b',
        r'\b(?:avoir|AVOIR|Avoir)\b'
    ]
    
    is_invoice = any(re.search(pattern, text, re.IGNORECASE) for pattern in invoice_indicators)
    data["is_invoice"] = bool(is_invoice)
    
    # Extract invoice number (French and English patterns with variations)
    inv_patterns = [
        # French patterns
        r'(?:facture|FACTURE|Facture)\s*(?:no\.?|n°|num[eé]ro|N°|NUM[EÉ]RO)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:num[eé]ro|NUM[EÉ]RO)\s*(?:de|DE)\s*(?:facture|FACTURE)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:n°|N°)\s*(?:facture|FACTURE)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:facture|FACTURE)\s*[:#]?\s*(\d+)',
        r'(?:r[eé]f[eé]rence|R[EÉ]F[EÉ]RENCE)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:num[eé]ro|NUM[EÉ]RO)\s*(?:facture|FACTURE)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:facture|FACTURE)\s*(?:№|N°|n°)\s*(\w+[-\d]+)',
        r'(?:facture|FACTURE)\s*(?:d\'avoir|d\'AVOIR)\s*(?:№|N°|n°)\s*(\w+[-\d]+)',
        
        # English patterns
        r'(?:invoice|INVOICE|Invoice)\s*(?:no\.?|number|#|num)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:number|NUMBER|Number)\s*(?:of|OF)\s*(?:invoice|INVOICE)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:invoice|INVOICE)\s*[:#]?\s*(\d+)',
        r'(?:reference|REFERENCE|Reference)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:bill|BILL|Bill)\s*(?:no\.?|number|#)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:receipt|RECEIPT|Receipt)\s*(?:no\.?|number|#)\s*[:#]?\s*(\w+[-\d]+)',
        
        # Generic patterns
        r'(?:no\.?|n°|N°|№|#|num|NUM)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:r[eé]f|REF|Ref)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:num[eé]ro|NUM[EÉ]RO)\s*[:#]?\s*(\w+[-\d]+)',
        r'(?:r[eé]f[eé]rence|R[EÉ]F[EÉ]RENCE)\s*(?:de|DE)\s*(?:facture|FACTURE)\s*[:#]?\s*(\w+[-\d]+)'
    ]
    
    for pattern in inv_patterns:
        inv_match = re.search(pattern, text, re.IGNORECASE)
        if inv_match:
            data["invoice_number"] = inv_match.group(1)
            print(f"Found invoice number with pattern: {pattern}")
            break
    
    # Extract date (French and English formats with variations)
    date_patterns = [
        # French date patterns
        r'(?:date|DATE|Date)\s*(?:de|DE)\s*(?:facture|FACTURE|Facture)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(?:date|DATE|Date)\s*(?:de|DE)\s*(?:facturation|FACTURATION)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(?:date|DATE|Date)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(?:du|DU)\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(?:date|DATE|Date)\s*(?:facture|FACTURE)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(?:date|DATE|Date)\s*(?:vente|VENTE|prestation|PRESTATION)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(\d{1,2}\s+(?:janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)\s+\d{4})',
        r'(\d{1,2}\s+(?:JANVIER|F[EÉ]VRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AO[UÛ]T|SEPTEMBRE|OCTOBRE|NOVEMBRE|D[EÉ]CEMBRE)\s+\d{4})',
        
        # English date patterns
        r'(?:date|DATE|Date)\s*(?:of|OF)?\s*(?:invoice|INVOICE|Invoice)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(?:date|DATE|Date)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(?:issued|ISSUED|Issued)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(?:due|DUE|Due)\s*(?:date|DATE|Date)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(?:échéance|ÉCHÉANCE)\s*[:#]?\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})',
        r'(\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4})',
        r'(\d{1,2}\s+(?:JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s+\d{4})',
        
        # ISO format
        r'(\d{4}-\d{2}-\d{2})',
        r'(\d{2}-\d{2}-\d{4})'
    ]
    
    for pattern in date_patterns:
        date_match = re.search(pattern, text, re.IGNORECASE)
        if date_match:
            try:
                data["date"] = parse(date_match.group(1), dayfirst=True).strftime('%Y-%m-%d')
                print(f"Found date with pattern: {pattern}")
                break
            except:
                continue
    
    # Extract totals (French and English currency patterns with variations)
    # Total HT (French)
    total_ht_patterns = [
        r'total\s*ht\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'TOTAL\s*HT\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'Total\s*HT\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'sous[-\s]*total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'SOUS[-\s]*TOTAL\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'Sous[-\s]*Total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'montant\s*ht\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'MONTANT\s*HT\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'Montant\s*HT\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        
        # English patterns
        r'subtotal\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'SUBTOTAL\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'Subtotal\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'amount\s*(?:before|excluding)\s*tax\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'AMOUNT\s*(?:BEFORE|EXCLUDING)\s*TAX\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'Amount\s*(?:before|excluding)\s*tax\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?'
    ]
    
    for pattern in total_ht_patterns:
        total_ht_match = re.search(pattern, text, re.IGNORECASE)
        if total_ht_match:
            try:
                amount_str = total_ht_match.group(1).replace(' ', '').replace(',', '.')
                data["total_ht"] = float(amount_str)
                print(f"Found total HT with pattern: {pattern}")
                break
            except:
                continue
    
    # Total TTC (French)
    total_ttc_patterns = [
        r'total\s*ttc\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'TOTAL\s*TTC\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'Total\s*TTC\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'TOTAL\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'Total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'montant\s*total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'MONTANT\s*TOTAL\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'Montant\s*Total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'à\s*payer\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'À\s*PAYER\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'À\s*Payer\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'Total\s*TTC\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'TOTAL\s*TTC\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        
        # English patterns
        r'total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'TOTAL\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'Total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'amount\s*due\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'AMOUNT\s*DUE\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'Amount\s*due\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'grand\s*total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'GRAND\s*TOTAL\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'Grand\s*Total\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?'
    ]
    
    for pattern in total_ttc_patterns:
        total_ttc_match = re.search(pattern, text, re.IGNORECASE)
        if total_ttc_match:
            try:
                amount_str = total_ttc_match.group(1).replace(' ', '').replace(',', '.')
                data["total_ttc"] = float(amount_str)
                data["total"] = data["total_ttc"]  # For backward compatibility
                print(f"Found total TTC with pattern: {pattern}")
                break
            except:
                continue
    
    # Extract TVA (French) / VAT (English)
    tva_patterns = [
        # French patterns
        r'tva\s*(?:\d+\s*%\s*)?[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'TVA\s*(?:\d+\s*%\s*)?[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'Tva\s*(?:\d+\s*%\s*)?[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'(?:tva|TVA|Tva)\s*\d+\s*%\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'taxe\s*sur\s*la\s*valeur\s*ajout[eé]e\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'TAXE\s*SUR\s*LA\s*VALEUR\s*AJOUT[EÉ]E\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        r'Taxe\s*sur\s*la\s*valeur\s*ajout[eé]e\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*€?',
        
        # English patterns
        r'vat\s*(?:\d+\s*%\s*)?[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'VAT\s*(?:\d+\s*%\s*)?[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'Vat\s*(?:\d+\s*%\s*)?[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'(?:vat|VAT|Vat)\s*\d+\s*%\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'value\s*added\s*tax\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'VALUE\s*ADDED\s*TAX\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'Value\s*Added\s*Tax\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'tax\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'TAX\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?',
        r'Tax\s*[:#]?\s*([\d\s,]+[.,]\d{2})\s*\$?'
    ]
    
    for pattern in tva_patterns:
        tva_match = re.search(pattern, text, re.IGNORECASE)
        if tva_match:
            try:
                amount_str = tva_match.group(1).replace(' ', '').replace(',', '.')
                data["tva"] = float(amount_str)
                print(f"Found TVA with pattern: {pattern}")
                break
            except:
                continue
    
    # Extract partner (first few lines usually contain partner info)
    lines = text.split("\n")[:20]  # Check first 20 lines
    for line in lines:
        line = line.strip()
        if len(line) > 5 and not re.search(r"\d{1,2}[./]\d{1,2}[./]\d{2,4}", line):
            # Skip lines with dates, numbers only, or common headers
            if not re.match(r"^[\d\s\-\.]+", line) and not any(word in line.lower() for word in ['facture', 'invoice', 'bill', 'receipt', 'devis', 'total', 'tva', 'ht', 'ttc', 'logo', 'logiciel', 'software']):
                # Look for company names, addresses, or contact info
                if re.search(r'[A-Z][a-z]+', line) or re.search(r'\d{5}', line) or re.search(r'@', line) or re.search(r'www\.', line):
                    data["partner"] = line
                    print(f"Found partner: {line}")
                    break
    
    # Extract partner_id info (look for patterns after "Monsieur", "Madame", "Client", etc.)
    client_patterns = [
        # French patterns
        r'(?:monsieur|madame|m\.|mme|client|id)\s+(.+?)(?:\n|$)',
        r'(?:MONSIEUR|MADAME|M\.|MME|CLIENT|ID)\s+(.+?)(?:\n|$)',
        r'(?:Monsieur|Madame|M\.|Mme|Client|Id)\s+(.+?)(?:\n|$)',
        r'(?:destinataire|à)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:DESTINATAIRE|À)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:Destinataire|À)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:vendeur|VENDEUR|Vendeur)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:fournisseur|FOURNISSEUR|Fournisseur)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:mon\s*entreprise|MON\s*ENTREPRISE|Mon\s*Entreprise)\s*[:#]?\s*(.+?)(?:\n|$)',
        
        # English patterns
        r'(?:mr\.?|mrs\.?|ms\.?|miss|client|id)\s+(.+?)(?:\n|$)',
        r'(?:MR\.?|MRS\.?|MS\.?|MISS|CLIENT|ID)\s+(.+?)(?:\n|$)',
        r'(?:Mr\.?|Mrs\.?|Ms\.?|Miss|Client|Id)\s+(.+?)(?:\n|$)',
        r'(?:to|for|attn|attention)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:TO|FOR|ATTN|ATTENTION)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:To|For|Attn|Attention)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:bill\s*to|ship\s*to)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:BILL\s*TO|SHIP\s*TO)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:Bill\s*to|Ship\s*to)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:seller|SELLER|Seller)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:supplier|SUPPLIER|Supplier)\s*[:#]?\s*(.+?)(?:\n|$)',
        r'(?:company|COMPANY|Company)\s*[:#]?\s*(.+?)(?:\n|$)'
    ]
    
    for pattern in client_patterns:
        client_match = re.search(pattern, text, re.IGNORECASE)
        if client_match:
            data["partner_id"] = client_match.group(1).strip()
            print(f"Found partner_id with pattern: {pattern}")
            break
    
    # Extract additional business information (SIRET, IBAN, etc.)
    business_info_patterns = [
        r'(?:SIRET|siret|Siret)\s*[:#]?\s*([A-Z0-9\-]+)',
        r'(?:IBAN|iban|Iban)\s*[:#]?\s*([A-Z0-9\s]+)',
        r'(?:BIC|bic|Bic|SWIFT|swift|Swift)\s*[:#]?\s*([A-Z0-9]+)',
        r'(?:TVA|tva|Tva)\s*(?:intra|INTRA|Intra)\s*[:#]?\s*([A-Z0-9\s]+)',
        r'(?:num[eé]ro|NUM[EÉ]RO|Num[eé]ro)\s*(?:de|DE)\s*(?:compte|COMPTE|Compte)\s*[:#]?\s*([A-Z0-9\s]+)',
        r'(?:banque|BANQUE|Banque)\s*[:#]?\s*([A-Za-z\s]+)',
        r'(?:code|CODE|Code)\s*(?:banque|BANQUE|Banque)\s*[:#]?\s*([0-9]+)'
    ]
    
    for pattern in business_info_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            print(f"Found business info with pattern: {pattern} - Value: {match.group(1)}")
            # You can add these to the data structure if needed
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
                    images = convert_from_bytes(pdf_file.read(), poppler_path=r'C:\poppler-24.08.0\Library\bin')
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
            ["Fournisseur", confirmed_data.get("partner", "N/A")],
            ["Client", confirmed_data.get("partner_id", "N/A")],
            ['Total HT', f"{confirmed_data.get('total_ht', 'N/A')} {CURRENCY}" if confirmed_data.get('total_ht') else 'N/A'],
            ['TVA', f"{confirmed_data.get('tva', 'N/A')} {CURRENCY}" if confirmed_data.get('tva') else 'N/A'],
            ['Total TTC', f"{confirmed_data.get('total_ttc', 'N/A')} {CURRENCY}" if confirmed_data.get('total_ttc') else 'N/A'],
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
        footer_text = "Ce rapport a été généré automatiquement par le système RAN ESMERALD DMS."
        story.append(Paragraph(footer_text, styles['Normal']))
        
        doc.build(story)
        return True
        
    except Exception as e:
        print(f"Error generating PDF report: {e}")
        return False
