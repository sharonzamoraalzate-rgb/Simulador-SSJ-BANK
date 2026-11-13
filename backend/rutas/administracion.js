const express = require('express');
const controlador = require('../controladores/administracion');
const controladorAutenticacion = require('../controladores/autenticacion');
const manejarAsync = require('../controladores/manejoAsync');
const { protegerRol } = require('./proteccion');

const rutas = express.Router();
rutas.use(protegerRol('ADMIN'));
rutas.get('/me', manejarAsync(controladorAutenticacion.consultarSesion));
rutas.get('/dashboard', manejarAsync(controlador.consultarResumen));
rutas.get('/customers', manejarAsync(controlador.listarClientes));
rutas.get('/customers/:id', manejarAsync(controlador.consultarCliente));
rutas.post('/customers', manejarAsync(controlador.crearCliente));
rutas.patch('/customers/:id', manejarAsync(controlador.actualizarCliente));
rutas.get('/accounts', manejarAsync(controlador.listarCuentas));
rutas.post('/deposits', manejarAsync(controlador.consignar));
rutas.get('/movements', manejarAsync(controlador.consultarMovimientos));

module.exports = rutas;
