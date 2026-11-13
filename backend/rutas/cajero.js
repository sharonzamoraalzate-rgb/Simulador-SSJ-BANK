const express = require('express');
const controlador = require('../controladores/cajero');
const manejarAsync = require('../controladores/manejoAsync');
const { protegerCuentaCajero } = require('./proteccion');

const rutas = express.Router();
rutas.post('/login', manejarAsync(controlador.iniciarOperacion));
rutas.get('/balance', protegerCuentaCajero, manejarAsync(controlador.consultarSaldo));
rutas.get('/movements', protegerCuentaCajero, manejarAsync(controlador.consultarMovimientos));
rutas.post('/withdrawals', protegerCuentaCajero, manejarAsync(controlador.retirar));
rutas.post('/logout', controlador.cerrarOperacion);

module.exports = rutas;
