const servicioCliente = require('../servicios/cliente');
const servicioAutenticacion = require('../servicios/autenticacion');
const {
  usuarioParaRespuesta,
  cuentaParaRespuesta,
  movimientoParaRespuesta,
} = require('./serializadores');

async function consultarResumen(req, res) {
  const { cuentas, saldoTotal } = await servicioCliente.consultarResumen(req.usuario.id);
  res.json({
    user: usuarioParaRespuesta(req.usuario),
    accounts: cuentas.map(cuentaParaRespuesta),
    total_balance: saldoTotal,
  });
}

async function consultarMovimientos(req, res) {
  const movimientos = await servicioCliente.consultarMovimientos(req.usuario.id);
  res.json({ movements: movimientos.map((movimiento) => movimientoParaRespuesta(movimiento)) });
}

async function actualizarPerfil(req, res) {
  await servicioCliente.actualizarPerfil(req.usuario.id, {
    nombreCompleto: req.body.full_name,
    correo: req.body.email,
    telefono: req.body.phone,
  });
  res.json({ message: 'Perfil actualizado.' });
}

async function cambiarContrasena(req, res) {
  await servicioAutenticacion.cambiarContrasena(
    req.usuario.id,
    req.body.current_password,
    req.body.new_password,
  );
  res.json({ message: 'Contraseña actualizada.' });
}

async function transferir(req, res) {
  const resultado = await servicioCliente.transferir(req.usuario.id, {
    idCuentaOrigen: req.body.from_account_id,
    numeroCuentaDestino: req.body.destination_account_number,
    valor: req.body.amount,
  });
  res.json({ message: 'Transferencia realizada correctamente.', balance: resultado.saldo });
}

module.exports = {
  consultarResumen,
  consultarMovimientos,
  actualizarPerfil,
  cambiarContrasena,
  transferir,
};
