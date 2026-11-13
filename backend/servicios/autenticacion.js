const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Usuario, Cuenta } = require('../modelos');
const { rechazar } = require('./errores');

async function validarUsuarioActivo(id, rol) {
  const usuario = await Usuario.findOne({ where: { id, rol, estado: 'ACTIVE' } });
  if (!usuario) rechazar('El usuario no está activo o no tiene permisos.', 403);
  return usuario;
}

async function iniciarSesion(datos) {
  const nombreUsuario = String(datos.nombreUsuario || '').trim();
  const contrasena = datos.contrasena;
  const rol = datos.rol;
  if (!nombreUsuario || !contrasena || !['ADMIN', 'CLIENT'].includes(rol)) {
    rechazar('Completa usuario, contraseña y tipo de acceso.');
  }

  const usuario = await Usuario.findOne({
    where: {
      [Op.or]: [{ nombreUsuario }, { correo: nombreUsuario }],
      rol,
      estado: 'ACTIVE',
    },
  });
  if (!usuario || !(await bcrypt.compare(String(contrasena), usuario.hashContrasena))) {
    rechazar('Credenciales incorrectas o usuario inactivo.', 401);
  }
  return usuario;
}

async function autenticarCuenta(numeroCuenta, pin) {
  if (!numeroCuenta || !/^\d{4,6}$/.test(String(pin || ''))) {
    rechazar('Indica el número de cuenta y un PIN válido.');
  }
  const cuenta = await Cuenta.findOne({
    where: { numeroCuenta, estado: 'ACTIVE' },
    include: [{
      model: Usuario,
      as: 'usuario',
      where: { rol: 'CLIENT', estado: 'ACTIVE' },
      required: true,
    }],
  });
  if (!cuenta || !cuenta.usuario.hashPinCajero
    || !(await bcrypt.compare(String(pin), cuenta.usuario.hashPinCajero))) {
    rechazar('Cuenta, PIN o estado de cuenta no válido.', 401);
  }
  return cuenta;
}

async function cambiarContrasena(idUsuario, contrasenaActual, contrasenaNueva) {
  if (typeof contrasenaNueva !== 'string' || contrasenaNueva.length < 8 || contrasenaNueva.length > 72) {
    rechazar('La nueva contraseña debe tener entre 8 y 72 caracteres.');
  }
  const usuario = await Usuario.findByPk(idUsuario);
  if (!usuario || !(await bcrypt.compare(String(contrasenaActual || ''), usuario.hashContrasena))) {
    rechazar('La contraseña actual es incorrecta.');
  }
  usuario.hashContrasena = await bcrypt.hash(contrasenaNueva, 12);
  await usuario.save();
}

module.exports = { validarUsuarioActivo, iniciarSesion, autenticarCuenta, cambiarContrasena };
