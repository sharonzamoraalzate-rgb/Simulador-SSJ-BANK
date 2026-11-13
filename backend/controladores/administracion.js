const servicioAdministracion = require('../servicios/administracion');
const {
  cuentaParaRespuesta,
  movimientoParaRespuesta,
  clienteParaRespuesta,
} = require('./serializadores');

async function consultarResumen(req, res) {
  const resumen = await servicioAdministracion.consultarResumenAdministrativo();
  res.json({
    summary: {
      total_clients: resumen.totalClientes,
      active_clients: resumen.clientesActivos,
      blocked_clients: resumen.clientesBloqueados,
      active_accounts: resumen.cuentasActivas,
      total_balance: resumen.saldoTotal,
    },
  });
}

async function listarClientes(req, res) {
  const resultados = await servicioAdministracion.listarClientes(req.query.search);
  res.json({
    customers: resultados.map(({ usuario, cuentas, saldoTotal }) => (
      clienteParaRespuesta(usuario, cuentas, saldoTotal)
    )),
  });
}

async function consultarCliente(req, res) {
  const { usuario, cuentas } = await servicioAdministracion.consultarCliente(req.params.id);
  res.json({
    customer: clienteParaRespuesta(usuario, cuentas),
    accounts: cuentas.map(cuentaParaRespuesta),
  });
}

async function crearCliente(req, res) {
  const resultado = await servicioAdministracion.crearCliente({
    nombreUsuario: req.body.username,
    nombreCompleto: req.body.full_name,
    correo: req.body.email,
    telefono: req.body.phone,
    contrasena: req.body.password,
    pin: req.body.pin,
    tipoCuenta: req.body.account_type,
  });
  res.status(201).json({
    message: 'Cliente creado.',
    id: resultado.id,
    account_number: resultado.numeroCuenta,
  });
}

async function actualizarCliente(req, res) {
  await servicioAdministracion.actualizarCliente(req.params.id, {
    nombreCompleto: req.body.full_name,
    correo: req.body.email,
    telefono: req.body.phone,
    estado: req.body.status,
  });
  res.json({
    message: req.body.status === undefined
      ? 'Información del cliente actualizada.'
      : 'Estado del cliente y sus cuentas actualizado.',
  });
}

async function listarCuentas(req, res) {
  const cuentas = await servicioAdministracion.listarCuentas();
  res.json({ accounts: cuentas.map(cuentaParaRespuesta) });
}

async function consignar(req, res) {
  const resultado = await servicioAdministracion.consignar(req.body.account_id, req.body.amount);
  res.json({ message: 'Consignación realizada.', balance: resultado.saldo });
}

async function consultarMovimientos(req, res) {
  const movimientos = await servicioAdministracion.consultarMovimientosGenerales();
  res.json({
    movements: movimientos.map((movimiento) => movimientoParaRespuesta(movimiento)),
  });
}

module.exports = {
  consultarResumen,
  listarClientes,
  consultarCliente,
  crearCliente,
  actualizarCliente,
  listarCuentas,
  consignar,
  consultarMovimientos,
};
