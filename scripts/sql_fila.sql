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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status)
);
