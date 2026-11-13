const { DataTypes } = require('sequelize');
const baseDatos = require('../configuracion/baseDatos');

const Usuario = baseDatos.define('Usuario', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  nombreUsuario: { type: DataTypes.STRING(40), allowNull: false, unique: true, field: 'username' },
  hashContrasena: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  hashPinCajero: { type: DataTypes.STRING(255), allowNull: true, field: 'atm_pin_hash' },
  nombreCompleto: { type: DataTypes.STRING(120), allowNull: false, field: 'full_name' },
  correo: { type: DataTypes.STRING(190), allowNull: false, unique: true, field: 'email' },
  telefono: { type: DataTypes.STRING(30), allowNull: true, field: 'phone' },
  rol: { type: DataTypes.ENUM('ADMIN', 'CLIENT'), allowNull: false, field: 'role' },
  estado: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'BLOCKED'),
    allowNull: false,
    defaultValue: 'ACTIVE',
    field: 'status',
  },
}, {
  tableName: 'users',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

const Cuenta = baseDatos.define('Cuenta', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  usuarioId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'user_id' },
  numeroCuenta: { type: DataTypes.STRING(20), allowNull: false, unique: true, field: 'account_number' },
  tipoCuenta: { type: DataTypes.ENUM('SAVINGS', 'CHECKING'), allowNull: false, field: 'account_type' },
  saldo: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'balance' },
  estado: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'BLOCKED'),
    allowNull: false,
    defaultValue: 'ACTIVE',
    field: 'status',
  },
}, {
  tableName: 'accounts',
  createdAt: 'created_at',
  updatedAt: false,
});

const Transferencia = baseDatos.define('Transferencia', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  cuentaOrigenId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'source_account_id' },
  cuentaDestinoId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'destination_account_id' },
  valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'amount' },
}, {
  tableName: 'transfers',
  timestamps: false,
});

const Movimiento = baseDatos.define('Movimiento', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  cuentaId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'account_id' },
  tipoMovimiento: {
    type: DataTypes.ENUM('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT'),
    allowNull: false,
    field: 'movement_type',
  },
  valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'amount' },
  saldoResultante: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'balance_after' },
  descripcion: { type: DataTypes.STRING(255), allowNull: false, field: 'description' },
  canal: { type: DataTypes.ENUM('WEB', 'ATM', 'ADMIN'), allowNull: false, field: 'channel' },
  transferenciaId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'transfer_id' },
}, {
  tableName: 'movements',
  createdAt: 'created_at',
  updatedAt: false,
});

Usuario.hasMany(Cuenta, { as: 'cuentas', foreignKey: 'usuarioId' });
Cuenta.belongsTo(Usuario, { as: 'usuario', foreignKey: 'usuarioId' });
Cuenta.hasMany(Movimiento, { as: 'movimientos', foreignKey: 'cuentaId' });
Movimiento.belongsTo(Cuenta, { as: 'cuenta', foreignKey: 'cuentaId' });
Transferencia.belongsTo(Cuenta, { as: 'cuentaOrigen', foreignKey: 'cuentaOrigenId' });
Transferencia.belongsTo(Cuenta, { as: 'cuentaDestino', foreignKey: 'cuentaDestinoId' });
Transferencia.hasMany(Movimiento, { as: 'movimientos', foreignKey: 'transferenciaId' });
Movimiento.belongsTo(Transferencia, { as: 'transferencia', foreignKey: 'transferenciaId' });

module.exports = { baseDatos, Usuario, Cuenta, Transferencia, Movimiento };
