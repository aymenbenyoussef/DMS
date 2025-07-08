import mysql.connector
from mysql.connector import Error
import bcrypt
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'dms_db',
    'user': 'root',
    'password': '',  # Set your MySQL password
}

class DatabaseManager:
    def __init__(self):
        self.connection = None

    def connect(self):
        try:
            self.connection = mysql.connector.connect(**DB_CONFIG)
            return self.connection
        except Error as e:
            print(f"Error connecting to MySQL: {e}")
            return None

    def disconnect(self):
        if self.connection and self.connection.is_connected():
            self.connection.close()

    def execute_query(self, query, params=None, fetch=False):
        try:
            if not self.connection or not self.connection.is_connected():
                self.connect()
            
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params or ())
            
            if fetch:
                result = cursor.fetchall()
                cursor.close()
                return result
            else:
                self.connection.commit()
                last_id = cursor.lastrowid
                cursor.close()
                return last_id
        except Error as e:
            print(f"Database error: {e}")
            if self.connection:
                self.connection.rollback()
            raise e

    def init_database(self):
        try:
            self.connect()
            cursor = self.connection.cursor()

            # Create database if not exists
            cursor.execute("CREATE DATABASE IF NOT EXISTS dms_db")
            cursor.execute("USE dms_db")

            # Create companies table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS companies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    address VARCHAR(100) NOT NULL ,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    phone int(20) NOT NULL,            
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create users table with new fields
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL ,
                    surname VARCHAR(50) NOT NULL ,
                    email VARCHAR(50) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    role ENUM('admin', 'user') DEFAULT 'user',
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create doctype table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS doctype( 
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(50) NOT NULL UNIQUE,
                    status BOOLEAN DEFAULT TRUE
                )
            """)

            # Create user_companies junction table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_companies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    company_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_company (user_id, company_id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS datatype_companies (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    datatype_id INT,
                    company_id INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (datatype_id) REFERENCES doctype(id) ON DELETE CASCADE,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_user_company (datatype_id, company_id)
                )
            """) 

            # Create documents table with enhanced OCR support
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    owner_id INT NOT NULL,
                    company_name VARCHAR(255) NOT NULL,
                    doctype_name VARCHAR(255) NOT NULL,
                    file_path VARCHAR(500),
                    ocr_text TEXT,
                    extracted_data JSON,
                    is_invoice BOOLEAN DEFAULT FALSE,
                    invoice_number VARCHAR(100),
                    invoice_date DATE,
                    vendor VARCHAR(255),
                    client VARCHAR(255),
                    total_ht DECIMAL(10,2),
                    tva DECIMAL(10,2),
                    total_ttc DECIMAL(10,2),
                    file_size INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            # Create document_history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS document_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    document_id INT NOT NULL,
                    user_id INT NOT NULL,
                    action VARCHAR(255) NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            self.connection.commit()


            # Create default users if they don't exist
            self.create_default_users()

            cursor.close()
            print("Database initialized successfully")

        except Error as e:
            print(f"Error initializing database: {e}")

    def create_default_users(self):
        try:
        # Admin
            if not self.get_user_by_username('admin'):
                self.create_user(
                'admin',             # username
                'Administrator',     # surname
                'admin@dms.local',   # email
                'admin123',          # mot de passe
                'admin',             # rôle
                True,                # is_active
                0                    # user_limit
                )
                print("Default admin user created: admin/admin123")

        # User normal
            if not self.get_user_by_username('user'):
                self.create_user(
                'user',
                'Standard',
                'user@dms.local',
                'user123',
                'user',
                True,
                0
                )
                print("Default user created: user/user123")

        except Exception as e:
            print(f"Error creating default users: {e}")


    def hash_password(self, password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def verify_password(self, hashed_password, password):
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

    # User management methods
    def create_user(self,username,surname,email,password,is_active=True,role='user',companies=None):
        # 1) Hash du mot de passe
        hashed_password = self.hash_password(password)

        # 2) Insertion dans users
        query = """
        INSERT INTO users (username, surname, email, password_hash, role,  is_active)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (username, surname, email, hashed_password,role,  is_active)

        # On exécute et on récupère l'ID du nouvel utilisateur
        new_user_id = self.execute_query(query, params)

        # 3) Si on a une liste de companies, on remplit la table de jointure
        if companies:
            for comp_id in companies:
                # Insertion ligne par ligne
                link_query = """
                    INSERT INTO user_companies (user_id, company_id)
                    VALUES (%s, %s)
                    """
                # On peut capturer d'éventuelles erreurs de duplication
                try:
                    self.execute_query(link_query, (new_user_id, comp_id))
                except Exception as e:
                    # par exemple ignore si (user, company) existe déjà
                    print(f"Warning: cannot link user {new_user_id} to company {comp_id}: {e}")
        
        return new_user_id

    def get_user_by_email(self, email):
        query = "SELECT * FROM users WHERE email = %s"
        result = self.execute_query(query, (email,),fetch=True)
        return result[0] if result else None

    def get_user_by_username(self, username):
        query = "SELECT * FROM users WHERE username = %s"
        result = self.execute_query(query, (username,), fetch=True)
        return result[0] if result else None

    def get_user_by_id(self, user_id):
        query = "SELECT * FROM users WHERE id = %s"
        result = self.execute_query(query, (user_id,), fetch=True)
        return result[0] if result else None

    def get_all_users(self):
    # First get all users
        users_query = "SELECT * FROM users ORDER BY created_at DESC"
        users = self.execute_query(users_query, fetch=True)
    
        if not users:
            return []
    
        # Then get all user-company associations
        user_companies_query = """
        SELECT uc.user_id, c.id, c.name 
        FROM user_companies uc
        JOIN companies c ON uc.company_id = c.id
        """
        user_companies = self.execute_query(user_companies_query, fetch=True)
    
        # Create a mapping of user_id to companies
        companies_map = {}
        for uc in user_companies:
            if uc['user_id'] not in companies_map:
                 companies_map[uc['user_id']] = []
            companies_map[uc['user_id']].append({
                'id': uc['id'],
            'name': uc['name']
            })
    
        # Combine the data
        result = []
        for user in users:
            user_dict = dict(user)
            user_dict['companies'] = companies_map.get(user['id'], [])
            result.append(user_dict)
    
        return result


    def update_user(self, user_id, username=None, surname=None, email=None, password=None, 
               is_active=None, companies=None):
   
        updates = []
        params = []
    
        # Build the user update query
        if username is not None:
            updates.append("username = %s")
            params.append(username)
        if surname is not None:
            updates.append("surname = %s")
            params.append(surname)
        if email is not None:
            updates.append("email = %s")
            params.append(email)
        if password is not None:
            updates.append("password_hash = %s")
            params.append(self.hash_password(password))
        if is_active is not None:
            updates.append("is_active = %s")
            params.append(is_active)
    
        # Update user fields if there are changes
        if updates:
            params.append(user_id)
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
            try:
                self.execute_query(query, params)
            except Exception as e:
                print(f"Error updating user: {e}")
                return False
    
    # Handle company associations if provided
        if companies is not None:
            try:
                # Start transaction
                self.connection.start_transaction()
            
                # First remove all existing company associations
                delete_query = "DELETE FROM user_companies WHERE user_id = %s"
                cursor = self.connection.cursor()
                cursor.execute(delete_query, (user_id,))
            
                # Insert new company associations (each in a separate row)
                if companies:  # Only if companies list is not empty
                    insert_query = "INSERT INTO user_companies (user_id, company_id) VALUES (%s, %s)"
                    # Prepare parameters for each company
                    company_params = [(user_id, company_id) for company_id in companies]
                    # Execute batch insert
                    cursor.executemany(insert_query, company_params)
            
                # Commit transaction
                self.connection.commit()
                cursor.close()
            
            except Exception as e:
                # Rollback on error
                self.connection.rollback()
                print(f"Error updating user companies: {e}")
                return False
    
        return True

    def delete_user(self, user_id):
        try:
            # First delete any user-company associations
            query_user_companies = "DELETE FROM user_companies WHERE user_id = %s"
            self.execute_query(query_user_companies, (user_id,))
        
            # Then delete the user itself
            query_user = "DELETE FROM users WHERE id = %s"
            self.execute_query(query_user, (user_id,))
        
            return True
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False

    # Company management methods
    def create_company(self, company_data):
        query = """
            INSERT INTO companies (name, address, email, phone)
            VALUES (%s, %s, %s, %s)
        """
        params = (
            company_data["name"],
            company_data.get("address", ""),
            company_data.get("email", ""),
            company_data.get("phone", ""),
            
            
        )
        
        return self.execute_query(query, params)
    
    #/////////
    def delete_company(self, company_id):
        
        try:
            # First delete any user-company associations
            query_user_companies = "DELETE FROM user_companies WHERE company_id = %s"
            self.execute_query(query_user_companies, (company_id,))
        
            # Then delete the company itself
            query_company = "DELETE FROM companies WHERE id = %s"
            self.execute_query(query_company, (company_id,))
        
            return True
        except Exception as e:
            print(f"Error deleting company: {e}")
            return False

    def update_company(self, company_id, name, address, email, phone):
        query = """
        UPDATE companies
        SET name = %s,
            address = %s,
            email = %s,
            phone = %s
        WHERE id = %s
        """
        params = (name, address, email, phone, company_id)
        try:
            affected_rows = self.execute_query(query, params)
            # Return True if the query executed successfully, regardless of whether rows were changed
            return True
        except Exception as e:
            print(f"Error updating company: {e}")
            return False

    

    def get_company_by_id(self, company_id):
        query = "SELECT * FROM companies WHERE id = %s"
        result = self.execute_query(query, (company_id,), fetch=True)
        return result[0] if result else None
    def check_company_exist(self, name, email):
        name_query = "SELECT id FROM companies WHERE name = %s LIMIT 1"
        email_query = "SELECT id FROM companies WHERE email = %s LIMIT 1"

        name_result = self.execute_query(name_query, (name,), fetch=True)
        email_result = self.execute_query(email_query, (email,), fetch=True)

        return {
            "name_exists": bool(name_result),
            "email_exists": bool(email_result)
        }
    
    def get_all_companies(self):
        
        query = "SELECT * FROM companies "
        param=()
        
        try:
            result = self.execute_query(query, param, fetch=True)
            # Vérification du résultat
            if not result:
                return []
            return result
        except Exception as e:
            print(f"Database error: {e}")
            raise

    def get_user_companies(self, user_id):
        query = """
            SELECT c.* FROM companies c
            JOIN user_companies uc ON c.id = uc.company_id
            WHERE uc.user_id = %s
            ORDER BY c.name
        """
        return self.execute_query(query, (user_id,), fetch=True)

    def add_user_to_company(self, user_id, company_id):
        query = "INSERT INTO user_companies (user_id, company_id) VALUES (%s, %s)"
        return self.execute_query(query, (user_id, company_id))
    """
    def remove_user_from_company(self, user_id, company_id):
        query = "DELETE FROM user_companies WHERE user_id = %s AND company_id = %s"
        try:
            self.execute_query(query, (user_id, company_id))
            return True
        except:
            return False"""

    #DocType management

    def create_doctype(self, doctype_data):
        # Step 1: Insert into doctype
        insert_doctype_query = """
            INSERT INTO doctype (name, status)
            VALUES (%s, %s)
        """
        params = (
            doctype_data["name"],
            doctype_data.get("status", True)
        )

        # Execute insert without fetch
        doctype_id = self.execute_query(insert_doctype_query, params)

        # Get the newly inserted ID (MariaDB way)
       

        # Step 2: Insert associations into doctype_companies
        company_ids = doctype_data.get("companies", [])
        if company_ids:
            for comp_id in company_ids:
                insert_companies_query = """
                    INSERT INTO datatype_companies (datatype_id, company_id)
                    VALUES (%s, %s)
                """
                try:
                    link_params = (doctype_id, comp_id)
                    self.execute_query(insert_companies_query, link_params)
                except Exception as e:
                    print(f"Warning: could not link doctype {doctype_id} to company {comp_id}: {e}")

        return doctype_id


    def get_doctype_by_name(self, name):
        query= """ select * from doctype where name =%s """
        result = self.execute_query(query, (name,), fetch=True)
        return result[0] if result else None
    
    def get_doctype_by_name_id(self, name,id):
        query= """ select * from doctype where name =%s and id!=%s"""
        result = self.execute_query(query, (name,id,), fetch=True)
        return result[0] if result else None

    def get_all_doctypes(self):
        query = "SELECT * FROM doctype ORDER BY id"
        return self.execute_query(query, fetch=True)

    def get_datatypes_by_company(self, company_id):
        query = """
            SELECT d.*
            FROM datatype_companies dc
            JOIN doctype d ON dc.datatype_id = d.id
            WHERE dc.company_id = %s
            ORDER BY d.name
        """
        return self.execute_query(query, (company_id,), fetch=True)
    
    def get_companies_by_datatype(self, datatype_id):
        """
        Returns companies associated with a specific document type.
        Pulls from datatype_companies and joins with companies.
        """
        query = """
            SELECT c.*
            FROM datatype_companies dc
            JOIN companies c ON dc.company_id = c.id
            WHERE dc.datatype_id = %s
            ORDER BY c.name
        """
        return self.execute_query(query, (datatype_id,), fetch=True)
    
    def get_doctype_by_id(self, doctype_id):
        query = "SELECT * FROM doctype WHERE id = %s"
        result = self.execute_query(query, (doctype_id,), fetch=True)
        return result[0] if result else None
    
    
    def update_doctype(self, doctype_id, name=None, status=None, companies=None):
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if status is not None:
            updates.append("status = %s")
            params.append(status)
        
        # Update doctype fields if there are changes
        if updates:
            params.append(doctype_id)
            query = f"UPDATE doctype SET {', '.join(updates)} WHERE id = %s"
            try:
                self.execute_query(query, params)
            except Exception as e:
                print(f"Error updating doctype: {e}")
                return False
        
        # Handle company associations if provided
        if companies is not None:
            try:
                # Start transaction
                self.connection.start_transaction()
                
                # First remove all existing company associations
                delete_query = "DELETE FROM datatype_companies WHERE datatype_id = %s"
                cursor = self.connection.cursor()
                cursor.execute(delete_query, (doctype_id,))
                
                # Insert new company associations
                if companies:  # Only if companies list is not empty
                    insert_query = "INSERT INTO datatype_companies (datatype_id, company_id) VALUES (%s, %s)"
                    company_params = [(doctype_id, company_id) for company_id in companies]
                    cursor.executemany(insert_query, company_params)
                
                # Commit transaction
                self.connection.commit()
                cursor.close()
                
            except Exception as e:
                # Rollback on error
                self.connection.rollback()
                print(f"Error updating doctype companies: {e}")
                return False
        
        return True

    def delete_doctype(self, doctype_id):
        query = "DELETE FROM doctype WHERE id = %s"
        try:
            self.execute_query(query, (doctype_id,))
            return True
        except Exception as e:
            print(f"Error deleting doctype: {e}")
            return False
        
    # Document management methods



    def create_document(self, owner_id, company_id, doctype_id, filename, file_path, 
                    ocr_text=None, invoice_data=None, file_size=0):
        query = """
        INSERT INTO documents (
            filename, owner_id, company_id, doctype_id, 
            file_path, ocr_text, invoice_data, file_size
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            filename, owner_id, company_id, doctype_id, 
            file_path, ocr_text, invoice_data, file_size
        )
        return self.execute_query(query, params)

    def get_documents_by_company(self, company_id, document_type=None):
        if document_type:
            query = """
                SELECT d.*, u.username as owner_name, f.name as folder_name
                FROM documents d
                LEFT JOIN users u ON d.owner_id = u.id
                LEFT JOIN folders f ON d.folder_id = f.id
                WHERE d.company_id = %s AND d.document_type = %s
                ORDER BY d.created_at DESC
            """
            return self.execute_query(query, (company_id, document_type), fetch=True)
        else:
            query = """
                SELECT d.*, u.username as owner_name, f.name as folder_name
                FROM documents d
                LEFT JOIN users u ON d.owner_id = u.id
                LEFT JOIN folders f ON d.folder_id = f.id
                WHERE d.company_id = %s
                ORDER BY d.created_at DESC
            """
            return self.execute_query(query, (company_id,), fetch=True)
    def update_document(self, document_id, invoice_data=None):
        updates = []
        params = []
        
        if invoice_data is not None:
            updates.append("invoice_data = %s")
            params.append(invoice_data)
        
        if not updates:
            return False
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(document_id)
        
        query = f"UPDATE documents SET {', '.join(updates)} WHERE id = %s"
        try:
            self.execute_query(query, params)
            return True
        except Exception as e:
            print(f"Error updating document: {e}")
            return False

    def delete_document(self, document_id):
        query = "DELETE FROM documents WHERE id = %s"
        try:
            self.execute_query(query, (document_id,))
            return True
        except: 
            return False


    def create_document_with_ocr_data(self, owner_id, company_name, doctype_name, filename, 
                                        is_invoice=False, extracted_data=None):
        """Create a document with OCR extracted data"""
        try:
            # Prepare extracted data
            invoice_number = None
            invoice_date = None
            vendor = None
            client = None
            total_ht = None
            tva = None
            total_ttc = None
            
            if extracted_data:
                invoice_number = extracted_data.get('invoice_number')
                invoice_date = extracted_data.get('date')
                vendor = extracted_data.get('vendor')
                client = extracted_data.get('client')
                total_ht = extracted_data.get('total_ht')
                tva = extracted_data.get('tva')
                total_ttc = extracted_data.get('total_ttc')
            
            query = """
                INSERT INTO documents (
                    filename, owner_id, company_name, doctype_name, 
                    extracted_data, is_invoice, invoice_number, invoice_date,
                    vendor, client, total_ht, tva, total_ttc
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            params = (
                filename, owner_id, company_name, doctype_name,
                json.dumps(extracted_data) if extracted_data else None,
                is_invoice, invoice_number, invoice_date,
                vendor, client, total_ht, tva, total_ttc
            )
            
            return self.execute_query(query, params)
            
        except Exception as e:
            raise Exception(f"Error creating document: {e}")

    def get_documents_by_company_and_type(self, company_name, doctype_name):
        """Get all documents for a specific company and document type"""
        query = """
            SELECT * FROM documents 
            WHERE company_name = %s AND doctype_name = %s
            ORDER BY created_at DESC
        """
        return self.execute_query(query, (company_name, doctype_name), fetch=True)

    def get_document_by_id(self, document_id):
        """Get document by ID"""
        query = "SELECT * FROM documents WHERE id = %s"
        result = self.execute_query(query, (document_id,), fetch=True)
        return result[0] if result else None

    def update_document_ocr_data(self, document_id, ocr_text, extracted_data):
        """Update document with OCR results"""
        try:
            query = """
                UPDATE documents 
                SET ocr_text = %s, extracted_data = %s, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """
            params = (ocr_text, json.dumps(extracted_data), document_id)
            return self.execute_query(query, params)
        except Exception as e:
            raise Exception(f"Error updating document OCR data: {e}")

    def get_invoices_by_company(self, company_name):
        """Get all invoices for a specific company"""
        query = """
            SELECT * FROM documents 
            WHERE company_name = %s AND is_invoice = TRUE
            ORDER BY invoice_date DESC, created_at DESC
        """
        return self.execute_query(query, (company_name,), fetch=True)

    def search_documents(self, search_term, company_name=None, doctype_name=None):
        """Search documents by filename, invoice number, or vendor"""
        query = """
            SELECT * FROM documents 
            WHERE (filename LIKE %s OR invoice_number LIKE %s OR vendor LIKE %s)
        """
        params = [f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"]

        if company_name:
            query += " AND company_name = %s"
            params.append(company_name)
            
        if doctype_name:
            query += " AND doctype_name = %s"
            params.append(doctype_name)
            
        query += " ORDER BY created_at DESC"

        return self.execute_query(query, params, fetch=True)

    # Document history methods
    def add_document_history(self, document_id, user_id, action):
        query = "INSERT INTO document_history (document_id, user_id, action) VALUES (%s, %s, %s)"
        return self.execute_query(query, (document_id, user_id, action))

    def get_document_history(self, document_id):
        query = """
            SELECT dh.*, u.username
            FROM document_history dh
            LEFT JOIN users u ON dh.user_id = u.id
            WHERE dh.document_id = %s
            ORDER BY dh.timestamp DESC
        """
        return self.execute_query(query, (document_id,), fetch=True)


    def get_datatypes_by_company(self, company_id):
        """
        Returns datatypes used by a specific company.
        Pulls from datatype_companies and joins with doctype.
        """
        query = """
            SELECT d.*
            FROM datatype_companies dc
            JOIN doctype d ON dc.datatype_id = d.id
            WHERE dc.company_id = %s
            ORDER BY d.name
        """
        return self.execute_query(query, (company_id,), fetch=True)


# Create global database instance
db = DatabaseManager()
db.init_database()

