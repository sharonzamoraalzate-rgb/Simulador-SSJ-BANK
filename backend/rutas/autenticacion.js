const express = require('express');
const controlador = require('../controladores/autenticacion');
const manejarAsync = require('../controladores/manejoAsync');
const { protegerRol } = require('./proteccion');

const rutas = express.Router();

rutas.post('/login', manejarAsync(controlador.iniciarSesion));
rutas.post('/logout', controlador.cerrarSesion);
rutas.get('/me', protegerRol('CLIENT'), manejarAsync(controlador.consultarSesion));
rutas.get('/admin/me', protegerRol('ADMIN'), manejarAsync(controlador.consultarSesion));

module.exports = rutas;
