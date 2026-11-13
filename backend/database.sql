CREATE DATABASE IF NOT EXISTS simulador_bancario
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE simulador_bancario;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(40) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  atm_pin_hash VARCHAR(255) NULL,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(30) NULL,
  role ENUM('ADMIN', 'CLIENT') NOT NULL,
  status ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_role_status (role, status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS accounts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_type ENUM('SAVINGS', 'CHECKING') NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_accounts_number (account_number),
  KEY ix_accounts_user (user_id),
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT chk_accounts_balance CHECK (balance >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  source_account_id BIGINT UNSIGNED NOT NULL,
  destination_account_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_transfers_source (source_account_id),
  KEY ix_transfers_destination (destination_account_id),
  CONSTRAINT fk_transfers_source FOREIGN KEY (source_account_id) REFERENCES accounts (id),
  CONSTRAINT fk_transfers_destination FOREIGN KEY (destination_account_id) REFERENCES accounts (id),
  CONSTRAINT chk_transfers_amount CHECK (amount > 0),
  CONSTRAINT chk_transfers_distinct_accounts CHECK (source_account_id <> destination_account_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT') NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  channel ENUM('WEB', 'ATM', 'ADMIN') NOT NULL,
  transfer_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_movements_account_date (account_id, created_at),
  KEY ix_movements_transfer (transfer_id),
  CONSTRAINT fk_movements_account FOREIGN KEY (account_id) REFERENCES accounts (id),
  CONSTRAINT fk_movements_transfer FOREIGN KEY (transfer_id) REFERENCES transfers (id),
  CONSTRAINT chk_movements_amount CHECK (amount > 0),
  CONSTRAINT chk_movements_balance CHECK (balance_after >= 0)
) ENGINE=InnoDB;

-- Usuarios de prueba: admin / Admin123!; cliente1 / Cliente123!; cajero PIN: 1234.
-- Los hashes se generan con bcrypt (coste 12); reemplaza los valores si deseas otras credenciales.
INSERT IGNORE INTO users (id, username, password_hash, atm_pin_hash, full_name, email, phone, role, status) VALUES
(1, 'admin', '$2a$12$vEpYuXcXr78tA6phXYqsCe37xsuMbxtl3RQjAvcgQo98si4nZBrHG', NULL, 'Administrador del Banco', 'admin@banco.test', '3000000000', 'ADMIN', 'ACTIVE'),
(2, 'cliente1', '$2a$12$NhVwDQGdFmiB9NzFyASvqeh5LQul47DiqvkJNTfN2k/h2nTCxdHdO', '$2a$12$y3Z6DkuxmP/NlxxzrrLjiuQA.gMB9vxdlQkWRFkP/INr8Pzaffznu', 'Ana Torres', 'ana@banco.test', '3001111111', 'CLIENT', 'ACTIVE'),
(3, 'cliente2', '$2a$12$NhVwDQGdFmiB9NzFyASvqeh5LQul47DiqvkJNTfN2k/h2nTCxdHdO', '$2a$12$y3Z6DkuxmP/NlxxzrrLjiuQA.gMB9vxdlQkWRFkP/INr8Pzaffznu', 'Luis Gómez', 'luis@banco.test', '3002222222', 'CLIENT', 'ACTIVE'),
(4, 'cliente3', '$2a$12$NhVwDQGdFmiB9NzFyASvqeh5LQul47DiqvkJNTfN2k/h2nTCxdHdO', '$2a$12$y3Z6DkuxmP/NlxxzrrLjiuQA.gMB9vxdlQkWRFkP/INr8Pzaffznu', 'Marta Ruiz', 'marta@banco.test', '3003333333', 'CLIENT', 'ACTIVE');

INSERT IGNORE INTO accounts (id, user_id, account_number, account_type, balance, status) VALUES
(1, 2, '1000000001', 'SAVINGS', 1250000.00, 'ACTIVE'),
(2, 3, '1000000002', 'CHECKING', 850000.00, 'ACTIVE'),
(3, 4, '1000000003', 'SAVINGS', 430000.00, 'ACTIVE');

INSERT IGNORE INTO movements (id, account_id, movement_type, amount, balance_after, description, channel) VALUES
(1, 1, 'DEPOSIT', 1250000.00, 1250000.00, 'Saldo inicial de prueba', 'ADMIN'),
(2, 2, 'DEPOSIT', 850000.00, 850000.00, 'Saldo inicial de prueba', 'ADMIN'),
(3, 3, 'DEPOSIT', 430000.00, 430000.00, 'Saldo inicial de prueba', 'ADMIN');
