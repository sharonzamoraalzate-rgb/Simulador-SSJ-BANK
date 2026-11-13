const servicioAutenticacion = require('../servicios/autenticacion');
const { usuarioParaRespuesta } = require('./serializadores');

async function iniciarSesion(req, res) {
  const usuario = await servicioAutenticacion.iniciarSesion({
    nombreUsuario: req.body.username,
    contrasena: req.body.password,
    rol: req.body.role,
  });
  await new Promise((resolver, rechazar) => {
    req.session.regenerate((error) => (error ? rechazar(error) : resolver()));
  });
  req.session.idUsuario = usuario.id;
  req.session.rolUsuario = usuario.rol;
  res.json({ user: usuarioParaRespuesta(usuario) });
}

function cerrarSesion(req, res, next) {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('simulador.sid');
    res.json({ message: 'Sesión cerrada.' });
  });
}

function consultarSesion(req, res) {
  res.json({ user: usuarioParaRespuesta(req.usuario) });
}

module.exports = { iniciarSesion, cerrarSesion, consultarSesion };
