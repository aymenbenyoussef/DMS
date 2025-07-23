import mysql.connector
from mysql.connector import Error, pooling
import bcrypt
from datetime import datetime
import json

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'dms_db',
    'user': 'root',
    'password': '',  # Set your MySQL password
    # 'pool_name' and 'pool_size' removed from here
}

class DatabaseManager:
    def __init__(self):
        self.pool = pooling.MySQLConnectionPool(pool_name='mypool', pool_size=20, **DB_CONFIG)

    def execute_query(self, query, params=None, fetch=False):
        conn = None
        cursor = None
        try:
            conn = self.pool.get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query, params or ())
            if fetch:
                result = cursor.fetchall()
                return result
            else:
                conn.commit()
                return cursor.lastrowid
        except Error as e:
            print(f"Database error: {e}")
            if conn:
                conn.rollback()
            raise e
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def init_database(self):
        try:
            conn = self.pool.get_connection()
            cursor = conn.cursor()

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
                    is_active BOOLEAN DEFAULT TRUE,
                    description TEXT,
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
                Create table if not exists doctype( 
                           id INT AUTO_INCREMENT PRIMARY KEY,
                           name VARCHAR(50) NOT NULL UNIQUE,
                           status BOOLEAN DEFAULT TRUE
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

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS partnertypes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                status BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS partners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                company_name VARCHAR(255) NOT NULL,
                trade_name VARCHAR(255),
                unique_identifier VARCHAR(100) NOT NULL UNIQUE,
                mailing_address TEXT NOT NULL,
                billing_address TEXT,
                phone1 VARCHAR(20) NOT NULL,
                phone2 VARCHAR(20),
                phone3 VARCHAR(20),
                email VARCHAR(100) NOT NULL UNIQUE,
                payment_terms VARCHAR(255),
                billing_terms VARCHAR(255),
                bank_account_number VARCHAR(50) UNIQUE,
                bank_name VARCHAR(100),
                notes TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS partner_entities (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    partner_id INT NOT NULL,
                    company_id INT NOT NULL,
                    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_partner_company (partner_id, company_id)
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS partner_partnertypes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    partner_id INT NOT NULL,
                    partnertype_id INT NOT NULL,
                    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
                    FOREIGN KEY (partnertype_id) REFERENCES partnertypes(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_partner_type (partner_id, partnertype_id)
                )
            """)    
            
            # Create documents table with enhanced OCR support
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    owner_id INT NOT NULL,
                    company_id INT,
                    doctype_id INT,
                    partner_id INT,
                    file_path VARCHAR(500),
                    ocr_text varchar(500),
                    extracted_data JSON,
                    extracted_text varchar(5000),
                    rapport varchar(500),
                    is_invoice BOOLEAN DEFAULT FALSE,   
                    invoice_number VARCHAR(100),
                    invoice_date DATE,
                    total_ht DECIMAL(10,2),
                    tva DECIMAL(10,2),
                    total_ttc DECIMAL(10,2),
                    file_size INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                    FOREIGN KEY (doctype_id) REFERENCES doctype(id) ON DELETE CASCADE,
                    FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
                )""")

            # Create groups table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS groups (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INT,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
                )
            """)

            # Create documents_group table (relation between documents and groups)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents_group (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    document_id INT NOT NULL,
                    group_id INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
                    UNIQUE KEY unique_document_group (document_id, group_id)
                )
            """)
            conn.commit()


            # Create default users if they don\'t exist
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
                True,                # is_active
                'admin',             # rôle
                )
                print("Default admin user created: admin/admin123")

        # User normal
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
    def get_user_by_email_except_id(self, email, user_id):
        query = "SELECT * FROM users WHERE email = %s and id!=%s"
        result = self.execute_query(query, (email,user_id,),fetch=True)
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
            query = f"UPDATE users SET {' , '.join(updates)} WHERE id = %s"
            try:
                self.execute_query(query, params)
            except Exception as e:
                print(f"Error updating user: {e}")
                return False
    
    # Handle company associations if provided
        if companies is not None:
            try:
                # Start transaction
                conn = self.pool.get_connection()
                conn.start_transaction()
            
                # First remove all existing company associations
                delete_query = "DELETE FROM user_companies WHERE user_id = %s"
                cursor = conn.cursor()
                cursor.execute(delete_query, (user_id,))
            
                # Insert new company associations (each in a separate row)
                if companies:  # Only if companies list is not empty
                    insert_query = "INSERT INTO user_companies (user_id, company_id) VALUES (%s, %s)"
                    # Prepare parameters for each company
                    company_params = [(user_id, company_id) for company_id in companies]
                    # Execute batch insert
                    cursor.executemany(insert_query, company_params)
            
                # Commit transaction
                conn.commit()
                cursor.close()
            
            except Exception as e:
                # Rollback on error
                conn.rollback()
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
        try:   
            query = """
                INSERT INTO companies (name, address, email, phone, is_active, description)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            params = (
                company_data["name"],
                company_data.get("address", ""),
                company_data.get("email", ""),
                company_data.get("phone", ""),
                company_data.get("is_active", True),
                company_data.get("description", "")
            )
            
            return self.execute_query(query, params)
        except Error as e:  # Specifically catch mysql.connector.Error
            error_message = str(e)
            # Check for duplicate entry errors
            if "Duplicate entry" in error_message:
                if "name" in error_message.lower():
                    raise Exception("Company name already exists")
                elif "email" in error_message.lower():
                    raise Exception("Company email already exists")
            # Re-raise other database errors
            raise Exception(f"Database error: {error_message}")
        except Exception as e:  # Catch any other unexpected exceptions
            raise Exception(f"Error creating company: {str(e)}")

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

    def update_company(self, company_id, name=None, address=None, email=None, phone=None, is_active=None, description=None):
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if address is not None:
            updates.append("address = %s")
            params.append(address)
        if email is not None:
            updates.append("email = %s")
            params.append(email)
        if phone is not None:
            updates.append("phone = %s")
            params.append(phone)
        if is_active is not None:  # Added is_active
            updates.append("is_active = %s")
            params.append(is_active)
        if description is not None:  # Added description
            updates.append("description = %s")
            params.append(description)
        
        if not updates:
            return False
        
        params.append(company_id)
        query = f"UPDATE companies SET {', '.join(updates)} WHERE id = %s"
        try:
            self.execute_query(query, params)
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
        print(f"Checking company exist - Name: {name}, Email: {email}")
        print(f"Name results: {name_result}")
        print(f"Email results: {email_result}")
        return {
            "name_exists": bool(name_result),
            "email_exists": bool(email_result)
        }
    def check_company_exist_id(self, name, email, company_id):
        name_query = "SELECT id FROM companies WHERE name = %s and id!=%s LIMIT 1"
        email_query = "SELECT id FROM companies WHERE email = %s and id!=%s LIMIT 1"

        name_result = self.execute_query(name_query, (name,company_id,), fetch=True)
        email_result = self.execute_query(email_query, (email,company_id,), fetch=True)

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
            import traceback
            print("Database error in get_all_companies:", traceback.format_exc())
            return []

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

    def check_partner_exists(self, partner_data, exclude_id=None):
        """Check if a partner with similar unique fields already exists"""
        queries = []
        params = []
        
        # Check company_name
        if 'company_name' in partner_data and partner_data['company_name']:
            queries.append("company_name = %s")
            params.append(partner_data['company_name'])

        # Check unique_identifier
        if 'unique_identifier' in partner_data and partner_data['unique_identifier']:
            queries.append("unique_identifier = %s")
            params.append(partner_data['unique_identifier'])
        
        # Check email
        if 'email' in partner_data and partner_data['email']:
            queries.append("email = %s")
            params.append(partner_data['email'])
        
        # Check bank_account_number if provided
        if 'bank_account_number' in partner_data and partner_data['bank_account_number']:
            queries.append("bank_account_number = %s")
            params.append(partner_data['bank_account_number'])
        
        # Check phone1 if provided
        if 'phone1' in partner_data and partner_data['phone1']:
            queries.append("phone1 = %s")
            params.append(partner_data['phone1'])

        # Check mailing_address if provided
        if 'mailing_address' in partner_data and partner_data['mailing_address']:
            queries.append("mailing_address = %s")
            params.append(partner_data['mailing_address'])
        
        if not queries:
            return False
        
        # Combine all checks with OR to find any conflict
        query = "SELECT id FROM partners WHERE (" + " OR ".join(queries) + ")"
        if exclude_id:
            query += " AND id != %s"
            params.append(exclude_id)
        
        query += " LIMIT 1"
        result = self.execute_query(query, params, fetch=True)
        return bool(result)

    def create_partner(self, partner_data):
        """Create a new partner with associated entities and types"""
        try:
            # Check if partner already exists based on unique fields
            if self.check_partner_exists(partner_data):
                # Determine which field caused the conflict for a more specific error message
                if self.check_partner_field_exists('company_name', partner_data.get('company_name')):
                    raise Exception("A partner with this company name already exists")
                if self.check_partner_field_exists('unique_identifier', partner_data.get('unique_identifier')):
                    raise Exception("A partner with this unique identifier already exists")
                if self.check_partner_field_exists('email', partner_data.get('email')):
                    raise Exception("A partner with this email already exists")
                if self.check_partner_field_exists('phone1', partner_data.get('phone1')):
                    raise Exception("A partner with this primary phone number already exists")
                if self.check_partner_field_exists('mailing_address', partner_data.get('mailing_address')):
                    raise Exception("A partner with this mailing address already exists")
                if self.check_partner_field_exists('bank_account_number', partner_data.get('bank_account_number')):
                    raise Exception("A partner with this bank account number already exists")
                # Fallback generic message if no specific conflict is found (should not happen with check_partner_exists)
                raise Exception("A partner with similar unique fields already exists")
            
            # Insert partner
            partner_query = """
                INSERT INTO partners (
                    company_name, trade_name, unique_identifier, mailing_address, billing_address,
                    phone1, phone2, phone3, email, payment_terms, billing_terms,
                    bank_account_number, bank_name, notes, is_active
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            partner_params = (
                partner_data['company_name'],
                partner_data.get('trade_name'),
                partner_data['unique_identifier'],
                partner_data['mailing_address'],
                partner_data.get('billing_address'),
                partner_data['phone1'],
                partner_data.get('phone2'),
                partner_data.get('phone3'),
                partner_data['email'],
                partner_data.get('payment_terms'),
                partner_data.get('billing_terms'),
                partner_data.get('bank_account_number'),
                partner_data.get('bank_name'),
                partner_data.get('notes'),
                partner_data.get('is_active', True)
            )
            
            partner_id = self.execute_query(partner_query, partner_params)
            
            # Insert partner-entity associations
            if 'companies' in partner_data and partner_data['companies']:
                for company_id in partner_data['companies']:
                    entity_query = "INSERT INTO partner_entities (partner_id, company_id) VALUES (%s, %s)"
                    self.execute_query(entity_query, (partner_id, company_id))
            
            # Insert partner-type associations
            if 'partnertypes' in partner_data and partner_data['partnertypes']:
                for type_id in partner_data['partnertypes']:
                    type_query = "INSERT INTO partner_partnertypes (partner_id, partnertype_id) VALUES (%s, %s)"
                    self.execute_query(type_query, (partner_id, type_id))
            
            return partner_id
            
        except Exception as e:
            raise Exception(f"Error creating partner: {str(e)}")

    def update_partner(self, partner_id, partner_data):
        """Update an existing partner and its associations"""
        try:
            # Start transaction
            
            
            # Check if updated values conflict with other partners
            if self.check_partner_exists(partner_data, exclude_id=partner_id):
                # Determine which field caused the conflict for a more specific error message
                if self.check_partner_field_exists('company_name', partner_data.get('company_name'), exclude_id=partner_id):
                    raise Exception("A partner with this company name already exists")
                if self.check_partner_field_exists('unique_identifier', partner_data.get('unique_identifier'), exclude_id=partner_id):
                    raise Exception("A partner with this unique identifier already exists")
                if self.check_partner_field_exists('email', partner_data.get('email'), exclude_id=partner_id):
                    raise Exception("A partner with this email already exists")
                if self.check_partner_field_exists('phone1', partner_data.get('phone1'), exclude_id=partner_id):
                    raise Exception("A partner with this primary phone number already exists")
                if self.check_partner_field_exists('mailing_address', partner_data.get('mailing_address'), exclude_id=partner_id):
                    raise Exception("A partner with this mailing address already exists")
                if self.check_partner_field_exists('bank_account_number', partner_data.get('bank_account_number'), exclude_id=partner_id):
                    raise Exception("A partner with this bank account number already exists")
                # Fallback generic message if no specific conflict is found
                raise Exception("A partner with similar unique fields already exists")
            
            # Build update query
            updates = []
            params = []
            
            fields = [
                'company_name', 'trade_name', 'unique_identifier', 'mailing_address',
                'billing_address', 'phone1', 'phone2', 'phone3', 'email',
                'payment_terms', 'billing_terms', 'bank_account_number',
                'bank_name', 'notes', 'is_active'
            ]
            
            for field in fields:
                if field in partner_data:
                    updates.append(f"{field} = %s")
                    params.append(partner_data[field])
            
            if updates:
                query = f"UPDATE partners SET {' , '.join(updates)} WHERE id = %s"
                params.append(partner_id)
                self.execute_query(query, params)
            
            # Update associations - first delete all existing ones
            self.execute_query("DELETE FROM partner_entities WHERE partner_id = %s", (partner_id,))
            self.execute_query("DELETE FROM partner_partnertypes WHERE partner_id = %s", (partner_id,))
            
            # Then insert the new ones
            if 'companies' in partner_data:
                for company_id in partner_data['companies']:
                    self.execute_query(
                        "INSERT INTO partner_entities (partner_id, company_id) VALUES (%s, %s)",
                        (partner_id, company_id)
                    )
            
            if 'partnertypes' in partner_data:
                for type_id in partner_data['partnertypes']:
                    self.execute_query(
                        "INSERT INTO partner_partnertypes (partner_id, partnertype_id) VALUES (%s, %s)",
                        (partner_id, type_id)
                    )
            
            # Commit transaction
            
            return True
            
        except Exception as e:
            
            raise Exception(f"Error updating partner: {str(e)}")

    def delete_partner(self, partner_id):
        """Delete a partner and all its associations"""
        try:
            # Start transaction to ensure atomicity
            #self.connection.start_transaction()
            
            # First delete from partner_entities
            delete_entities_query = "DELETE FROM partner_entities WHERE partner_id = %s"
            self.execute_query(delete_entities_query, (partner_id,))
            
            # Then delete from partner_partnertypes
            delete_types_query = "DELETE FROM partner_partnertypes WHERE partner_id = %s"
            self.execute_query(delete_types_query, (partner_id,))
            
            # Finally delete the partner
            delete_partner_query = "DELETE FROM partners WHERE id = %s"
            self.execute_query(delete_partner_query, (partner_id,))
            
            # Commit transaction if all operations succeeded
            #self.connection.commit()
            return True
            
        except Exception as e:
            # Rollback if any error occurs
            #self.connection.rollback()
            raise Exception(f"Error deleting partner: {str(e)}")

    def get_partner_by_id(self, partner_id):
        """Get a partner by ID with all associations"""
        try:
            # Get partner
            partner_query = "SELECT * FROM partners WHERE id = %s"
            partner = self.execute_query(partner_query, (partner_id,), fetch=True)
            if not partner:
                return None
            
            partner = partner[0]
            
            # Get associated companies
            companies_query = """
                SELECT c.id, c.name 
                FROM partner_entities pe
                JOIN companies c ON pe.company_id = c.id
                WHERE pe.partner_id = %s
            """
            partner['companies'] = self.execute_query(companies_query, (partner_id,), fetch=True)
            
            # Get associated partner types
            types_query = """
                SELECT pt.id, pt.name 
                FROM partner_partnertypes ppt
                JOIN partnertypes pt ON ppt.partnertype_id = pt.id
                WHERE ppt.partner_id = %s
            """
            partner['partnertypes'] = self.execute_query(types_query, (partner_id,), fetch=True)
            
            return partner
            
        except Exception as e:
            raise Exception(f"Error fetching partner: {str(e)}")

    def get_all_partners(self):
        """Get all partners with basic information including partner types"""
        try:
            query = """
                SELECT 
                    p.id, 
                    p.company_name, 
                    p.unique_identifier, 
                    p.email, 
                    p.phone1, 
                    p.is_active,
                    GROUP_CONCAT(pt.name SEPARATOR ', ') as partner_types
                FROM partners p
                LEFT JOIN partner_partnertypes ppt ON p.id = ppt.partner_id
                LEFT JOIN partnertypes pt ON ppt.partnertype_id = pt.id
                GROUP BY p.id, p.company_name, p.unique_identifier, p.email, p.phone1, p.is_active
                ORDER BY p.company_name
            """
            return self.execute_query(query, fetch=True)
        except Exception as e:
            raise Exception(f"Error fetching partners: {str(e)}")

    def get_partners_by_company(self, company_id):
        """Get partners that have a relationship with a specific company via partner_entities table, including partner types"""
        try:
            query = """
                SELECT DISTINCT 
                    p.id, 
                    p.company_name, 
                    p.unique_identifier, 
                    p.email, 
                    p.phone1, 
                    p.is_active,
                    GROUP_CONCAT(pt.name SEPARATOR ', ') as partner_types
                FROM partners p
                INNER JOIN partner_entities pe ON p.id = pe.partner_id
                LEFT JOIN partner_partnertypes ppt ON p.id = ppt.partner_id
                LEFT JOIN partnertypes pt ON ppt.partnertype_id = pt.id
                WHERE pe.company_id = %s
                GROUP BY p.id, p.company_name, p.unique_identifier, p.email, p.phone1, p.is_active
                ORDER BY p.company_name
            """
            return self.execute_query(query, (company_id,), fetch=True)
        except Exception as e:
            raise Exception(f"Error fetching partners by company: {str(e)}")

    def check_partner_field_exists(self, field_name, field_value, exclude_id=None):
        """Check if a specific field value exists for any partner, excluding a given ID"""
        if not field_value:
            return False
        query = f"SELECT id FROM partners WHERE {field_name} = %s"
        params = [field_value]
        if exclude_id:
            query += " AND id != %s"
            params.append(exclude_id)
        query += " LIMIT 1"
        result = self.execute_query(query, params, fetch=True)
        return bool(result)


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
                    self.execute_query(insert_companies_query, (doctype_id, comp_id))
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
            query = f"UPDATE doctype SET {' , '.join(updates)} WHERE id = %s"
            try:
                self.execute_query(query, params)
            except Exception as e:
                print(f"Error updating doctype: {e}")
                return False
        
        # Handle company associations if provided
        if companies is not None:
            try:
                # Start transaction
                conn = self.pool.get_connection()
                conn.start_transaction()
                
                # First remove all existing company associations
                delete_query = "DELETE FROM datatype_companies WHERE datatype_id = %s"
                cursor = conn.cursor()
                cursor.execute(delete_query, (doctype_id,))
                
                # Insert new company associations
                if companies:  # Only if companies list is not empty
                    insert_query = "INSERT INTO datatype_companies (datatype_id, company_id) VALUES (%s, %s)"
                    company_params = [(doctype_id, company_id) for company_id in companies]
                    cursor.executemany(insert_query, company_params)
                
                # Commit transaction
                conn.commit()
                cursor.close()
                
            except Exception as e:
                # Rollback on error
                conn.rollback()
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
        
        query = f"UPDATE documents SET {' , '.join(updates)} WHERE id = %s"
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


    def create_document_with_ocr_data(self, owner_id, company_id, doctype_id, filename, file_path, file_size,
                                is_invoice=False, extracted_data=None, extracted_text=None, partner_id=None, rapport=None, ocr_text=None):
        """Create a document with OCR extracted data"""
        try:
            # Prepare extracted data
            invoice_number = None
            invoice_date = None
            total_ht = None
            tva = None
            total_ttc = None
            
            if extracted_data:
                invoice_number = extracted_data.get("invoice_number")
                invoice_date = extracted_data.get("date")
                total_ht = extracted_data.get("total_ht")
                tva = extracted_data.get("tva")
                total_ttc = extracted_data.get("total_ttc")
            
            query = """
                INSERT INTO documents (
                    filename, owner_id, company_id, doctype_id, file_path, file_size,
                    extracted_data, extracted_text, rapport ,is_invoice, invoice_number, invoice_date,
                    partner_id, total_ht, tva, total_ttc, ocr_text
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
            """
            params = (
                filename, 
                owner_id, 
                company_id, 
                doctype_id, 
                file_path, 
                file_size,
                json.dumps(extracted_data) if extracted_data else None,
                extracted_text if extracted_text else None,
                rapport,
                is_invoice, 
                invoice_number, 
                invoice_date,
                partner_id,  # This will properly insert into partner_id column
                total_ht, 
                tva, 
                total_ttc,
                ocr_text
            )
            return self.execute_query(query, params)
            
        except Exception as e:
            raise Exception(f"Error creating document: {e}")

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

    def get_invoices_by_company(self, company_id):
        """Get all invoices for a specific company"""
        query = """
            SELECT * FROM documents 
            WHERE company_id = %s AND is_invoice = TRUE
            ORDER BY invoice_date DESC, created_at DESC
        """
        return self.execute_query(query, (company_id,), fetch=True)
    def search_documents(self, search_term, company_id=None, doctype_id=None):
        """Search documents by filename, invoice number, or partner"""
        query = """
            SELECT * FROM documents 
            WHERE (filename LIKE %s OR invoice_number LIKE %s OR partner LIKE %s)
        """
        params = [f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"]

        if company_id:
            query += " AND company_id = %s"
            params.append(company_id)
            
        if doctype_id:
            query += " AND doctype_id = %s"
            params.append(doctype_id)
            
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


    # PartnerType management methods
    def check_partner_type_name_exists(self, name):
        """Check if a partner type name already exists"""
        query = "SELECT id FROM partnertypes WHERE name = %s LIMIT 1"
        result = self.execute_query(query, (name,), fetch=True)
        return bool(result)
    
    def check_partner_type_name_exists_except_id(self, name, partner_type_id):
        """Check if a partner type name exists excluding a specific partner type ID"""
        query = "SELECT id FROM partnertypes WHERE name = %s AND id != %s LIMIT 1"
        result = self.execute_query(query, (name, partner_type_id), fetch=True)
        return bool(result)

    def create_partner_type(self, name, status=True):
        status_int = 1 if status in [True, 'true', 'True', '1', 1] else 0
        query = "INSERT INTO partnertypes (name, status) VALUES (%s, %s)"
        return self.execute_query(query, (name, status_int))

    def get_all_partner_types(self):
        query = "SELECT * FROM partnertypes ORDER BY name"
        return self.execute_query(query, fetch=True)

    def get_partner_type_by_id(self, partner_type_id):
        query = "SELECT * FROM partnertypes WHERE id = %s"
        result = self.execute_query(query, (partner_type_id,), fetch=True)
        return result[0] if result else None

    def update_partner_type(self, partner_type_id, name=None, status=None):
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if status is not None:
            updates.append("status = %s")
            params.append(status)
        
        if not updates:
            return False
        
        params.append(partner_type_id)
        query = f"UPDATE partnertypes SET {' , '.join(updates)} WHERE id = %s"
        try:
            self.execute_query(query, params)
            return True
        except Exception as e:
            print(f"Error updating partner type: {e}")
            return False

    def update_partner_type_status(self, partner_type_id, status):
        """Update only the status of a partner type"""
        query = "UPDATE partnertypes SET status = %s WHERE id = %s"
        try:
            self.execute_query(query, (status, partner_type_id))
            return True
        except Exception as e:
            print(f"Error updating partner type status: {e}")
            return False

    def delete_partner_type(self, partner_type_id):
        query = "DELETE FROM partnertypes WHERE id = %s"
        try:
            self.execute_query(query, (partner_type_id,))
            return True
        except Exception as e:
            print(f"Error deleting partner type: {e}")
            return False

    def get_companies_by_partner_id(self, partner_id):
        """Get all companies associated with a specific partner"""
        query = """
            SELECT c.id, c.name 
            FROM partner_entities pe
            JOIN companies c ON pe.company_id = c.id
            WHERE pe.partner_id = %s
        """
        return self.execute_query(query, (partner_id,), fetch=True)

    def get_partnertypes_by_partner_id(self, partner_id):
        """Get all partner types associated with a specific partner"""
        query = """
            SELECT pt.id, pt.name 
            FROM partner_partnertypes ppt
            JOIN partnertypes pt ON ppt.partnertype_id = pt.id
            WHERE ppt.partner_id = %s
        """
        return self.execute_query(query, (partner_id,), fetch=True)

    def get_documents_by_company_with_filters(self, company_id, doctype_id=None, start_date=None, end_date=None):
        """Get documents for a company with optional filters for document type and date range"""
        query = """
            SELECT d.*, dt.name as doctype_name, p.company_name as partner_name
            FROM documents d
            LEFT JOIN doctype dt ON d.doctype_id = dt.id
            LEFT JOIN partners p ON d.partner_id = p.id
            WHERE d.company_id = %s
        """
        params = [company_id]
        
        # Add document type filter if provided
        if doctype_id:
            query += " AND d.doctype_id = %s"
            params.append(doctype_id)
        
        # Add date range filters if provided
        if start_date:
            query += " AND DATE(d.created_at) >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND DATE(d.created_at) <= %s"
            params.append(end_date)
        
        query += " ORDER BY d.created_at DESC"
        
        return self.execute_query(query, params, fetch=True)

    def get_documents_by_company_all_types(self, company_id, start_date=None, end_date=None):
        """Get all documents for a company regardless of document type, with optional date filtering"""
        query = """
            SELECT d.id, d.filename, d.company_id, d.doctype_id, d.created_at, d.file_size, d.file_path,d.extracted_text, d.is_invoice, d.ocr_text, d.rapport, p.company_name as partner_name
            FROM documents d
            LEFT JOIN partners p ON d.partner_id = p.id
            WHERE d.company_id = %s
            ORDER BY d.created_at DESC
        """
        params = [company_id]
        return self.execute_query(query, params, fetch=True)

    def get_documents_last_month_by_company(self, company_id, doctype_id=None):
        """Get documents from the last month for a company"""
        query = """
            SELECT d.*, dt.name as doctype_name
            FROM documents d
            LEFT JOIN doctype dt ON d.doctype_id = dt.id
            WHERE d.company_id = %s 
            AND d.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
        """
        params = [company_id]
        
        if doctype_id:
            query += " AND d.doctype_id = %s"
            params.append(doctype_id)
        
        query += " ORDER BY d.created_at DESC"
        
        return self.execute_query(query, params, fetch=True)

    def get_documents_by_company_and_type(self, company_id, doctype_id):
        """Get only the columns needed for the document archive table, including company_id and doctype_id for file URL construction"""
        query = """
            SELECT d.id, d.filename, d.company_id, d.doctype_id, d.created_at, d.file_size, d.file_path, d.is_invoice, d.ocr_text, d.extracted_text, d.rapport, p.company_name as partner_name
            FROM documents d
            LEFT JOIN partners p ON d.partner_id = p.id
            WHERE d.company_id = %s AND d.doctype_id = %s
            ORDER BY d.created_at DESC
        """
        return self.execute_query(query, (company_id, doctype_id), fetch=True)
    def get_rapport_pdf(self, document_id):
        query = "SELECT rapport FROM documents WHERE id = %s"
        result = self.execute_query(query, (document_id,), fetch=True)
        return result[0]['rapport'] if result and result[0]['rapport'] else None

    # Group management methods
    def create_group(self, name, created_by):
        """Create a new group"""
        try:
            query = "INSERT INTO groups (name, created_by) VALUES (%s, %s)"
            return self.execute_query(query, (name, created_by))
        except Exception as e:
            raise Exception(f"Error creating group: {str(e)}")

    def get_all_groups(self):
        """Get all groups"""
        try:
            query = "SELECT * FROM groups ORDER BY name"
            return self.execute_query(query, fetch=True)
        except Exception as e:
            raise Exception(f"Error fetching groups: {str(e)}")

    def get_group_by_id(self, group_id):
        """Get group by ID"""
        try:
            query = "SELECT * FROM groups WHERE id = %s"
            result = self.execute_query(query, (group_id,), fetch=True)
            return result[0] if result else None
        except Exception as e:
            raise Exception(f"Error fetching group: {str(e)}")

    def update_group(self, group_id, name):
        """Update group name"""
        try:
            query = "UPDATE groups SET name = %s WHERE id = %s"
            self.execute_query(query, (name, group_id))
            return True
        except Exception as e:
            raise Exception(f"Error updating group: {str(e)}")

    def delete_group(self, group_id):
        """Delete a group and all its document associations"""
        try:
            # First delete all document-group associations
            self.execute_query("DELETE FROM documents_group WHERE group_id = %s", (group_id,))
            # Then delete the group
            self.execute_query("DELETE FROM groups WHERE id = %s", (group_id,))
            return True
        except Exception as e:
            raise Exception(f"Error deleting group: {str(e)}")

    def add_documents_to_group(self, group_id, document_ids):
        """Add multiple documents to a group"""
        try:
            for document_id in document_ids:
                query = """
                    INSERT IGNORE INTO documents_group (document_id, group_id) 
                    VALUES (%s, %s)
                """
                self.execute_query(query, (document_id, group_id))
            return True
        except Exception as e:
            raise Exception(f"Error adding documents to group: {str(e)}")

    def remove_document_from_group(self, document_id, group_id):
        """Remove a document from a group"""
        try:
            query = "DELETE FROM documents_group WHERE document_id = %s AND group_id = %s"
            self.execute_query(query, (document_id, group_id))
            return True
        except Exception as e:
            raise Exception(f"Error removing document from group: {str(e)}")

    def get_documents_by_group(self, group_id):
        """Get all documents in a specific group"""
        try:
            query = """
                SELECT d.*, dg.created_at as added_to_group_at
                FROM documents d
                JOIN documents_group dg ON d.id = dg.document_id
                WHERE dg.group_id = %s
                ORDER BY dg.created_at DESC
            """
            return self.execute_query(query, (group_id,), fetch=True)
        except Exception as e:
            raise Exception(f"Error fetching documents by group: {str(e)}")

    def get_groups_by_document(self, document_id):
        """Get all groups that contain a specific document"""
        try:
            query = """
                SELECT g.*, dg.created_at as added_to_group_at
                FROM groups g
                JOIN documents_group dg ON g.id = dg.group_id
                WHERE dg.document_id = %s
                ORDER BY g.name
            """
            return self.execute_query(query, (document_id,), fetch=True)
        except Exception as e:
            raise Exception(f"Error fetching groups by document: {str(e)}")

    def check_group_name_exists(self, name, exclude_id=None):
        """Check if a group name already exists"""
        try:
            query = "SELECT id FROM groups WHERE name = %s"
            params = [name]
            
            if exclude_id:
                query += " AND id != %s"
                params.append(exclude_id)
            
            query += " LIMIT 1"
            result = self.execute_query(query, params, fetch=True)
            return bool(result)
        except Exception as e:
            raise Exception(f"Error checking group name: {str(e)}")


    # Email management methods
    def get_users_for_email_selection(self):
        """Get all active users for email selection"""
        try:
            query = """
                SELECT id, username, surname, email, role
                FROM users 
                WHERE is_active = TRUE 
                ORDER BY username
            """
            return self.execute_query(query, fetch=True)
        except Exception as e:
            raise Exception(f"Error fetching users for email: {str(e)}")

    def get_users_by_company(self, company_id):
        """Get all active users associated with a specific company"""
        try:
            query = """
                SELECT DISTINCT u.id, u.username, u.surname, u.email, u.role
                FROM users u
                JOIN user_companies uc ON u.id = uc.user_id
                WHERE u.is_active = TRUE AND uc.company_id = %s
                ORDER BY u.username
            """
            return self.execute_query(query, (company_id,), fetch=True)
        except Exception as e:
            raise Exception(f"Error fetching users by company: {str(e)}")

    def get_document_with_details(self, document_id):
        """Get document with company and doctype details for email"""
        try:
            query = """
                SELECT d.*, c.name as company_name, dt.name as doctype_name, 
                       p.company_name as partner_name
                FROM documents d
                LEFT JOIN companies c ON d.company_id = c.id
                LEFT JOIN doctype dt ON d.doctype_id = dt.id
                LEFT JOIN partners p ON d.partner_id = p.id
                WHERE d.id = %s
            """
            result = self.execute_query(query, (document_id,), fetch=True)
            return result[0] if result else None
        except Exception as e:
            raise Exception(f"Error fetching document details: {str(e)}")

    def log_email_activity(self, document_id, sender_id, recipients, email_type, status):
        """Log email sending activity"""
        try:
            query = """
                INSERT INTO email_logs (document_id, sender_id, recipients, email_type, status, sent_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """
            recipients_json = json.dumps(recipients) if isinstance(recipients, list) else recipients
            return self.execute_query(query, (document_id, sender_id, recipients_json, email_type, status))
        except Exception as e:
            # If email_logs table doesn't exist, we'll create it
            self.create_email_logs_table()
            return self.execute_query(query, (document_id, sender_id, recipients_json, email_type, status))

    def create_email_logs_table(self):
        """Create email logs table if it doesn't exist"""
        try:
            conn = self.pool.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS email_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    document_id INT NOT NULL,
                    sender_id INT NOT NULL,
                    recipients JSON,
                    email_type ENUM('document', 'rapport', 'ocr_text') NOT NULL,
                    status ENUM('sent', 'failed') NOT NULL,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Error creating email_logs table: {e}")


# Create global database instance
db = DatabaseManager()
db.init_database()