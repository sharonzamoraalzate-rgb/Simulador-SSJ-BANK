const { Cuenta, Usuario } = require('../modelos');
const manejarAsync = require('../controladores/manejoAsync');
const { validarUsuarioActivo } = require('../servicios/autenticacion');
const { rechazar } = require('../servicios/errores');

function protegerRol(rol) {
  return manejarAsync(async (req, res, siguiente) => {
    if (!req.session.idUsuario || req.session.rolUsuario !== rol) {
      rechazar('Inicia sesión para continuar.', 401);
    }
    try {
      req.usuario = await validarUsuarioActivo(req.session.idUsuario, rol);
    } catch (error) {
      req.session.idUsuario = null;
      req.session.rolUsuario = null;
      throw error;
    }
    siguiente();
  });
}

const protegerCuentaCajero = manejarAsync(async (req, res, siguiente) => {
  if (!req.session.idCuentaCajero) rechazar('Identifícate en el cajero para continuar.', 401);
  const cuenta = await Cuenta.findOne({
    where: { id: req.session.idCuentaCajero, estado: 'ACTIVE' },
    include: [{
      model: Usuario,
      as: 'usuario',
      where: { estado: 'ACTIVE', rol: 'CLIENT' },
      attributes: ['id'],
      required: true,
    }],
    attributes: ['id'],
  });
  if (!cuenta) {
    req.session.idCuentaCajero = null;
    rechazar('La cuenta no está activa.', 403);
  }
  siguiente();
});

module.exports = { protegerRol, protegerCuentaCajero };
