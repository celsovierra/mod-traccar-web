const mysql = require('mysql2/promise');
const fs = require('fs');

function lerTraccarXml() {
  try {
    const xml = fs.readFileSync('/opt/traccar/conf/traccar.xml', 'utf8');
    const u = xml.match(/database\.user[^>]*>\s*([^<\s]+)/);
    const p = xml.match(/database\.password[^>]*>\s*([^<\s]+)/);
    const d = xml.match(/database\.name[^>]*>\s*([^<\s]+)/);
    return { user: u ? u[1] : 'traccar_user', password: p ? p[1] : 'Traccar@2026#Sec', database: d ? d[1] : 'traccar' };
  } catch {
    return { user: 'traccar_user', password: 'Traccar@2026#Sec', database: 'traccar' };
  }
}

const cfg = lerTraccarXml();
const pool = mysql.createPool({ host: '127.0.0.1', user: cfg.user, password: cfg.password, database: cfg.database, waitForConnections: true, connectionLimit: 5, charset: 'utf8mb4', timezone: 'Z' });

async function initTables() {
  await pool.query("CREATE TABLE IF NOT EXISTS telegram_chats (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, chat_id VARCHAR(64) NOT NULL, username VARCHAR(255), first_name VARCHAR(255), linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uniq_user (user_id), KEY idx_chat (chat_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  await pool.query("CREATE TABLE IF NOT EXISTS telegram_link_codes (code VARCHAR(20) PRIMARY KEY, user_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP, KEY idx_user (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

module.exports = { pool, initTables };
