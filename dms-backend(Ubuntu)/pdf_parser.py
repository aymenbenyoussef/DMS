# backend/pdf_parser.py

import pdfplumber
from transformers import pipeline

# Load summarization model once
summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

def extract_data_from_pdf(file_storage):
    """
    Extracts all text from the PDF and summarizes it using a pre-trained transformer model.
    """
    try:
        with pdfplumber.open(file_storage.stream) as pdf:
            full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        if not full_text.strip():
            return {
                "summary": "No text found in PDF.",
                "raw_text": ""
            }

        # Truncate if too long for summarizer (max length for distilbart is 1024 tokens)
        if len(full_text) > 3000:
            full_text = full_text[:3000]

        summary_text = summarizer(full_text, max_length=150, min_length=30, do_sample=False)[0]['summary_text']

        return {
            "summary": summary_text,
            "raw_text": full_text
        }
    except Exception as e:
        return {
            "summary": f"Failed to parse PDF: {str(e)}",
            "raw_text": ""
        }
