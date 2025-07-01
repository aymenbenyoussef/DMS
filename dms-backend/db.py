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
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            # Create users table with new fields
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    role ENUM('admin', 'user') DEFAULT 'user',
                    is_active BOOLEAN DEFAULT TRUE,
                    user_limit INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

            # Create folders table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS folders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    parent_id INT NULL,
                    company_id INT NOT NULL,
                    created_by INT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            # Create documents table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    document_type ENUM('invoice', 'non_invoice') NOT NULL,
                    owner_id INT NOT NULL,
                    company_id INT NOT NULL,
                    folder_id INT NULL,
                    file_path VARCHAR(500),
                    file_size INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
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
            # Check if admin user exists
            admin_exists = self.get_user_by_username('admin')
            if not admin_exists:
                self.create_user('admin', 'admin123', 'admin', True, 0)
                print("Default admin user created: admin/admin123")

            # Check if regular user exists
            user_exists = self.get_user_by_username('user')
            if not user_exists:
                self.create_user('user', 'user123', 'user', True, 0)
                print("Default user created: user/user123")

        except Exception as e:
            print(f"Error creating default users: {e}")

    def hash_password(self, password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def verify_password(self, hashed_password, password):
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

    # User management methods
    def create_user(self, username, password, role='user', is_active=True, user_limit=0):
        hashed_password = self.hash_password(password)
        query = """
            INSERT INTO users (username, password_hash, role, is_active, user_limit)
            VALUES (%s, %s, %s, %s, %s)
        """
        return self.execute_query(query, (username, hashed_password, role, is_active, user_limit))

    def get_user_by_username(self, username):
        query = "SELECT * FROM users WHERE username = %s"
        result = self.execute_query(query, (username,), fetch=True)
        return result[0] if result else None

    def get_user_by_id(self, user_id):
        query = "SELECT * FROM users WHERE id = %s"
        result = self.execute_query(query, (user_id,), fetch=True)
        return result[0] if result else None

    def get_all_users(self):
        query = "SELECT id, username, role, is_active, user_limit, created_at FROM users ORDER BY created_at DESC"
        return self.execute_query(query, fetch=True)

    def update_user(self, user_id, username=None, password=None, role=None, is_active=None, user_limit=None):
        updates = []
        params = []
        
        if username is not None:
            updates.append("username = %s")
            params.append(username)
        if password is not None:
            updates.append("password_hash = %s")
            params.append(self.hash_password(password))
        if role is not None:
            updates.append("role = %s")
            params.append(role)
        if is_active is not None:
            updates.append("is_active = %s")
            params.append(is_active)
        if user_limit is not None:
            updates.append("user_limit = %s")
            params.append(user_limit)
        
        if not updates:
            return False
        
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
        
        try:
            self.execute_query(query, params)
            return True
        except:
            return False

    def delete_user(self, user_id):
        query = "DELETE FROM users WHERE id = %s"
        try:
            self.execute_query(query, (user_id,))
            return True
        except:
            return False

    # Company management methods
    def create_company(self, name):
        query = "INSERT INTO companies (name) VALUES (%s)"
        return self.execute_query(query, (name,))

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

    def remove_user_from_company(self, user_id, company_id):
        query = "DELETE FROM user_companies WHERE user_id = %s AND company_id = %s"
        try:
            self.execute_query(query, (user_id, company_id))
            return True
        except:
            return False

    # Document management methods
    def create_document(self, owner_id, company_id, filename, document_type, folder_id=None, file_path=None, file_size=0):
        query = """
            INSERT INTO documents (filename, document_type, owner_id, company_id, folder_id, file_path, file_size)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        return self.execute_query(query, (filename, document_type, owner_id, company_id, folder_id, file_path, file_size))

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

    def get_document_by_id(self, document_id):
        query = """
            SELECT d.*, u.username as owner_name, f.name as folder_name
            FROM documents d
            LEFT JOIN users u ON d.owner_id = u.id
            LEFT JOIN folders f ON d.folder_id = f.id
            WHERE d.id = %s
        """
        result = self.execute_query(query, (document_id,), fetch=True)
        return result[0] if result else None

    def update_document(self, document_id, filename=None, folder_id=None, file_path=None, file_size=None):
        updates = []
        params = []
        
        if filename is not None:
            updates.append("filename = %s")
            params.append(filename)
        if folder_id is not None:
            updates.append("folder_id = %s")
            params.append(folder_id)
        if file_path is not None:
            updates.append("file_path = %s")
            params.append(file_path)
        if file_size is not None:
            updates.append("file_size = %s")
            params.append(file_size)
        
        if not updates:
            return False
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(document_id)
        query = f"UPDATE documents SET {', '.join(updates)} WHERE id = %s"
        
        try:
            self.execute_query(query, params)
            return True
        except:
            return False

    def delete_document(self, document_id):
        query = "DELETE FROM documents WHERE id = %s"
        try:
            self.execute_query(query, (document_id,))
            return True
        except:
            return False

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

    # Folder management methods
    def create_folder(self, name, created_by, company_id, parent_id=None):
        query = """
            INSERT INTO folders (name, parent_id, company_id, created_by)
            VALUES (%s, %s, %s, %s)
        """
        return self.execute_query(query, (name, parent_id, company_id, created_by))

    def get_folders_by_company(self, company_id, parent_id=None):
        if parent_id is None:
            query = """
                SELECT f.*, u.username as created_by_name
                FROM folders f
                LEFT JOIN users u ON f.created_by = u.id
                WHERE f.company_id = %s AND f.parent_id IS NULL
                ORDER BY f.name
            """
            return self.execute_query(query, (company_id,), fetch=True)
        else:
            query = """
                SELECT f.*, u.username as created_by_name
                FROM folders f
                LEFT JOIN users u ON f.created_by = u.id
                WHERE f.company_id = %s AND f.parent_id = %s
                ORDER BY f.name
            """
            return self.execute_query(query, (company_id, parent_id), fetch=True)

    def get_folder_by_id(self, folder_id):
        query = """
            SELECT f.*, u.username as created_by_name
            FROM folders f
            LEFT JOIN users u ON f.created_by = u.id
            WHERE f.id = %s
        """
        result = self.execute_query(query, (folder_id,), fetch=True)
        return result[0] if result else None

    def update_folder(self, folder_id, name=None, parent_id=None):
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = %s")
            params.append(name)
        if parent_id is not None:
            updates.append("parent_id = %s")
            params.append(parent_id)
        
        if not updates:
            return False
        
        params.append(folder_id)
        query = f"UPDATE folders SET {', '.join(updates)} WHERE id = %s"
        
        try:
            self.execute_query(query, params)
            return True
        except:
            return False

    def delete_folder(self, folder_id):
        query = "DELETE FROM folders WHERE id = %s"
        try:
            self.execute_query(query, (folder_id,))
            return True
        except:
            return False

    def get_folder_path(self, folder_id):
        """Get the full path of a folder"""
        path = []
        current_id = folder_id
        
        while current_id:
            folder = self.get_folder_by_id(current_id)
            if not folder:
                break
            path.insert(0, folder['name'])
            current_id = folder['parent_id']
        
        return ' / '.join(path) if path else ''

# Create global database instance
db = DatabaseManager()
db.init_database()

