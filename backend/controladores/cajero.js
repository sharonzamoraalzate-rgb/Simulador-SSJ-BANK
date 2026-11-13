const servicioAutenticacion = require('../servicios/autenticacion');
const servicioCliente = require('../servicios/cliente');
const { Cuenta } = require('../modelos');

async function iniciarOperacion(req, res) {
  const cuenta = await servicioAutenticacion.autenticarCuenta(
    String(req.body.account_number || '').trim(),
    req.body.pin,
  );
  req.session.idCuentaCajero = cuenta.id;
  res.json({ message: 'Identificación correcta.' });
}

async function consultarSaldo(req, res) {
  const cuenta = await Cuenta.findOne({
    where: { id: req.session.idCuentaCajero, estado: 'ACTIVE' },
    include: [{ association: 'usuario', attributes: ['nombreCompleto'] }],
  });
  if (!cuenta) {
    req.session.idCuentaCajero = null;
    const error = new Error('La cuenta no está disponible.');
    error.estado = 404;
    throw error;
  }
  res.json({
    account: {
      account_number: cuenta.numeroCuenta,
      account_type: cuenta.tipoCuenta,
      balance: cuenta.saldo,
      full_name: cuenta.usuario.nombreCompleto,
    },
  });
}

async function consultarMovimientos(req, res) {
  const movimientos = await servicioCliente.consultarUltimosMovimientos(req.session.idCuentaCajero);
  res.json({
    movements: movimientos.map((movimiento) => ({
      movement_type: movimiento.tipoMovimiento,
      amount: movimiento.valor,
      balance_after: movimiento.saldoResultante,
      description: movimiento.descripcion,
      created_at: movimiento.created_at,
    })),
  });
}

async function retirar(req, res) {
  const resultado = await servicioCliente.retirar(req.session.idCuentaCajero, req.body.amount);
  res.json({ message: 'Retiro realizado.', balance: resultado.saldo });
}

function cerrarOperacion(req, res) {
  req.session.idCuentaCajero = null;
  res.json({ message: 'Operación finalizada.' });
}

module.exports = { iniciarOperacion, consultarSaldo, consultarMovimientos, retirar, cerrarOperacion };
