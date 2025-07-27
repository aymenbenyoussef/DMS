#!/usr/bin/env python3
"""
Script to fix the partner_id foreign key constraint in the documents table
to allow NULL values.
"""

import mysql.connector
from mysql.connector import Error
import os

def fix_partner_constraint():
    """Fix the partner_id foreign key constraint to allow NULL values"""
    
    # Database configuration
    db_config = {
        'host': os.environ.get('SYSTEM_DB_HOST', 'localhost'),
        'database': os.environ.get('SYSTEM_DB_NAME', 'dms_db'),
        'user': os.environ.get('SYSTEM_DB_USERNAME', 'root'),
        'password': os.environ.get('SYSTEM_DB_PASSWORD', ''),
        'charset': 'utf8mb4',
        'collation': 'utf8mb4_unicode_ci'
    }
    
    try:
        # Connect to database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        print("Connected to database successfully")
        
        # Check if the constraint exists
        cursor.execute("""
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'documents' 
            AND COLUMN_NAME = 'partner_id' 
            AND CONSTRAINT_NAME IS NOT NULL
        """)
        constraint_result = cursor.fetchall()
        
        if constraint_result:
            constraint_name = constraint_result[0][0]
            print(f"Found existing constraint: {constraint_name}")
            
            # Drop the existing constraint
            cursor.execute(f"ALTER TABLE documents DROP FOREIGN KEY {constraint_name}")
            print(f"Dropped constraint: {constraint_name}")
        else:
            print("No existing constraint found")
        
        # Add the new constraint that allows NULL values
        cursor.execute("""
            ALTER TABLE documents 
            ADD CONSTRAINT fk_documents_partner_id 
            FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
        """)
        print("Added new foreign key constraint for partner_id that allows NULL values")
        
        # Commit the changes
        conn.commit()
        print("Database constraint fixed successfully!")
        
    except Error as e:
        print(f"Error fixing constraint: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_partner_constraint() 