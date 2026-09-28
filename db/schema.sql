-- NovaServe MySQL Schema
-- Database: novaserve

SET FOREIGN_KEY_CHECKS = 0;

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  role ENUM('ADMIN', 'CUSTOMER') NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mobile VARCHAR(20) DEFAULT '',
  password VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  address TEXT,
  photo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ CATEGORIES ============
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ SERVICES ============
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id VARCHAR(64),
  price DECIMAL(10,2) DEFAULT 0,
  icon VARCHAR(64) DEFAULT 'FileText',
  color VARCHAR(32) DEFAULT 'emerald',
  active BOOLEAN DEFAULT TRUE,
  requires_documents BOOLEAN DEFAULT FALSE,
  document_hint TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  system_key VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_services_category (category_id),
  INDEX idx_services_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ WALLETS ============
CREATE TABLE IF NOT EXISTS wallets (
  user_id VARCHAR(64) PRIMARY KEY,
  balance DECIMAL(10,2) DEFAULT 0,
  total_added DECIMAL(10,2) DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ WALLET TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  type ENUM('CREDIT', 'DEBIT') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  note TEXT,
  balance_after DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wtxn_user (user_id),
  INDEX idx_wtxn_type (type),
  INDEX idx_wtxn_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ ORDERS ============
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  service_id VARCHAR(64) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'DOCUMENT_REQUIRED', 'COMPLETED', 'REJECTED', 'CANCELLED') DEFAULT 'PENDING',
  form_data JSON,
  admin_note TEXT,
  refunded BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_customer (customer_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ ORDER TIMELINE ============
CREATE TABLE IF NOT EXISTS order_timeline (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timeline_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ ORDER DOCUMENTS ============
CREATE TABLE IF NOT EXISTS order_documents (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  name VARCHAR(255),
  size INT DEFAULT 0,
  type VARCHAR(64),
  data LONGTEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_docs_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  order_id VARCHAR(64),
  `read` BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id),
  INDEX idx_notif_read (`read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ SUPPORT TICKETS ============
CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255),
  subject VARCHAR(255),
  message TEXT,
  order_id VARCHAR(64),
  status ENUM('OPEN', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_support_user (user_id),
  INDEX idx_support_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ TOPUPS ============
CREATE TABLE IF NOT EXISTS topups (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  utr VARCHAR(64) NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  note TEXT,
  reviewed_at DATETIME,
  reviewed_by VARCHAR(64),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_topup_user (user_id),
  INDEX idx_topup_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ PAN FINDS ============
CREATE TABLE IF NOT EXISTS pan_finds (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64),
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255),
  aadhaar VARCHAR(20),
  pan VARCHAR(20),
  name_on_pan VARCHAR(255),
  pan_status VARCHAR(32),
  charge DECIMAL(10,2) DEFAULT 0,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  note TEXT,
  refunded BOOLEAN DEFAULT FALSE,
  api_tried BOOLEAN DEFAULT FALSE,
  api_response JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pan_user (user_id),
  INDEX idx_pan_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ AADHAAR PVC ============
CREATE TABLE IF NOT EXISTS aadhaar_pvc (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64),
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  file_name VARCHAR(255),
  charge DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(32) DEFAULT 'COMPLETED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pvc_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ SETTINGS ============
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(64) PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;