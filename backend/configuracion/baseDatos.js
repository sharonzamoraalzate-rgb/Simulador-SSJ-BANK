const { Sequelize } = require('sequelize');

const baseDatos = new Sequelize(
  process.env.DB_NAME || 'simulador_bancario',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    timezone: '+00:00',
    logging: false,
    define: {
      freezeTableName: true,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
);

module.exports = baseDatos;
