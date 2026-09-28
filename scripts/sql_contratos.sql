CREATE TABLE IF NOT EXISTS contract_templates (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  content LONGTEXT NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contract_invites (
  id VARCHAR(36) PRIMARY KEY,
  template_id VARCHAR(36) NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  client_name VARCHAR(255) NULL,
  client_user_id INT NULL,
  client_data JSON NULL,
  signed_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  google_drive_file_id VARCHAR(255) NULL,
  google_drive_file_url TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_client_user (client_user_id)
);
