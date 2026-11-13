const express = require('express');
const controlador = require('../controladores/clientes');
const manejarAsync = require('../controladores/manejoAsync');
const { protegerRol } = require('./proteccion');

const rutas = express.Router();
rutas.use(protegerRol('CLIENT'));
rutas.get('/dashboard', manejarAsync(controlador.consultarResumen));
rutas.get('/movements', manejarAsync(controlador.consultarMovimientos));
rutas.patch('/profile', manejarAsync(controlador.actualizarPerfil));
rutas.post('/password', manejarAsync(controlador.cambiarContrasena));
rutas.post('/transfers', manejarAsync(controlador.transferir));

module.exports = rutas;
