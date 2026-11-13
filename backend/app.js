require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { baseDatos } = require('./modelos');
const rutasAutenticacion = require('./rutas/autenticacion');
const rutasClientes = require('./rutas/clientes');
const rutasAdministracion = require('./rutas/administracion');
const rutasCajero = require('./rutas/cajero');
const { ErrorAplicacion } = require('./servicios/errores');

if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET debe configurarse en producción.');
}

const aplicacion = express();
const puerto = Number(process.env.PORT) || 3000;
const origenesPermitidos = new Set(
  (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean),
);
if (process.env.CODESPACE_NAME) {
  origenesPermitidos.add(`https://${process.env.CODESPACE_NAME}-5173.app.github.dev`);
}

aplicacion.use(helmet({ contentSecurityPolicy: false }));
aplicacion.use((req, res, siguiente) => {
  const origen = req.get('origin');
  if (origenesPermitidos.has(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(origenesPermitidos.has(origen) ? 204 : 403);
  siguiente();
});
aplicacion.use(express.json({ limit: '20kb' }));
aplicacion.use(express.urlencoded({ extended: false, limit: '20kb' }));
aplicacion.use(session({
  name: 'simulador.sid',
  secret: process.env.SESSION_SECRET || 'cambia-este-secreto-de-sesion',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 4,
  },
}));

aplicacion.use('/api/auth', rutasAutenticacion);
aplicacion.use('/api/customer', rutasClientes);
aplicacion.use('/api/admin', rutasAdministracion);
aplicacion.use('/api/atm', rutasCajero);

aplicacion.use((req, res) => res.status(404).json({ error: 'Recurso no encontrado.' }));
aplicacion.use((error, req, res, siguiente) => {
  if (res.headersSent) return siguiente(error);
  const estado = error instanceof ErrorAplicacion ? error.estado : 500;
  if (estado >= 500) console.error(error);
  res.status(estado).json({
    error: estado >= 500 ? 'Ocurrió un error interno. Intenta de nuevo.' : error.message,
  });
});

async function iniciarServidor() {
  await baseDatos.authenticate();
  const servidor = aplicacion.listen(puerto, () => {
    console.log(`Simulador bancario disponible en http://localhost:${puerto}`);
  });
  return servidor;
}

if (require.main === module) {
  iniciarServidor().catch((error) => {
    console.error('No fue posible iniciar la aplicación o conectar con MySQL.', error);
    process.exitCode = 1;
  });
}

module.exports = { aplicacion, iniciarServidor };
