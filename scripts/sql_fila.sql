CREATE TABLE IF NOT EXISTS tc_fila_financeiro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  nome VARCHAR(128),
  telefone VARCHAR(30),
  tipo VARCHAR(20),
  valor VARCHAR(20),
  vencimento DATE NULL,
  dias_atraso INT DEFAULT 0,
  enviado_em DATETIME NULL,
  status VARCHAR(20) DEFAULT 'Pendente',
  erro TEXT NULL,
  pix_id VARCHAR(64) NULL,
  token_pag VARCHAR(64) NULL,
  pago_em DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_token_pag (token_pag),
  INDEX idx_pix_id (pix_id)
);

-- Adiciona colunas em tabelas existentes (caso nao existam)
ALTER TABLE tc_fila_financeiro ADD COLUMN IF NOT EXISTS pix_id VARCHAR(64) NULL;
ALTER TABLE tc_fila_financeiro ADD COLUMN IF NOT EXISTS token_pag VARCHAR(64) NULL;
ALTER TABLE tc_fila_financeiro ADD COLUMN IF NOT EXISTS pago_em DATETIME NULL;
