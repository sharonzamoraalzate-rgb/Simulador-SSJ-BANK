const { baseDatos, Cuenta, Movimiento, Transferencia } = require('../modelos');
const { rechazar } = require('./errores');
const { registrarMovimiento } = require('./movimientos');
const {
  validarValor,
  convertirACentavos,
  convertirDesdeCentavos,
  validarSaldoMaximo,
  validarCorreo,
} = require('./valores');

async function consultarResumen(idUsuario) {
  const cuentas = await Cuenta.findAll({
    where: { usuarioId: idUsuario },
    order: [['id', 'ASC']],
  });
  const saldoTotal = cuentas.reduce((total, cuenta) => total + convertirACentavos(cuenta.saldo), 0n);
  return { cuentas, saldoTotal: convertirDesdeCentavos(saldoTotal) };
}

async function consultarMovimientos(idUsuario) {
  return Movimiento.findAll({
    include: [{
      model: Cuenta,
      as: 'cuenta',
      where: { usuarioId: idUsuario },
      attributes: ['numeroCuenta'],
      required: true,
    }],
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: 100,
  });
}

async function actualizarPerfil(idUsuario, datos) {
  const nombreCompleto = String(datos.nombreCompleto || '').trim();
  const correo = String(datos.correo || '').trim().toLowerCase();
  const telefono = String(datos.telefono || '').trim();
  if (nombreCompleto.length < 3 || nombreCompleto.length > 120 || !validarCorreo(correo)
    || telefono.length > 30) {
    rechazar('Verifica el nombre, correo electrónico y teléfono.');
  }
  try {
    await Usuario.update(
      { nombreCompleto, correo, telefono: telefono || null },
      { where: { id: idUsuario, rol: 'CLIENT' } },
    );
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') rechazar('Ese correo ya está registrado.');
    throw error;
  }
}

async function obtenerCuentaBloqueada(transaccion, idCuenta) {
  const cuenta = await Cuenta.findByPk(idCuenta, {
    transaction: transaccion,
    lock: transaccion.LOCK.UPDATE,
  });
  if (!cuenta) rechazar('La cuenta no existe.', 404);
  return cuenta;
}

async function transferir(idUsuario, datos) {
  const idCuentaOrigen = Number(datos.idCuentaOrigen);
  const numeroCuentaDestino = String(datos.numeroCuentaDestino || '').trim();
  if (!Number.isInteger(idCuentaOrigen) || !numeroCuentaDestino) {
    rechazar('Indica las cuentas de origen y destino.');
  }
  const valor = validarValor(datos.valor);

  return baseDatos.transaction(async (transaccion) => {
    const origenPropietario = await Cuenta.findOne({
      where: { id: idCuentaOrigen, usuarioId: idUsuario },
      attributes: ['id'],
      transaction: transaccion,
    });
    if (!origenPropietario) rechazar('La cuenta de origen no existe.', 404);
    const destinoReferencia = await Cuenta.findOne({
      where: { numeroCuenta: numeroCuentaDestino },
      attributes: ['id'],
      transaction: transaccion,
    });
    if (!destinoReferencia) rechazar('La cuenta de destino no existe.', 404);
    if (String(destinoReferencia.id) === String(idCuentaOrigen)) {
      rechazar('Elige una cuenta de destino diferente.');
    }

    const idsOrdenados = [idCuentaOrigen, Number(destinoReferencia.id)].sort((a, b) => a - b);
    const cuentas = new Map();
    for (const id of idsOrdenados) {
      cuentas.set(String(id), await obtenerCuentaBloqueada(transaccion, id));
    }
    const origen = cuentas.get(String(idCuentaOrigen));
    const destino = cuentas.get(String(destinoReferencia.id));
    if (origen.estado !== 'ACTIVE' || destino.estado !== 'ACTIVE') {
      rechazar('Ambas cuentas deben estar activas para transferir.');
    }
    const saldoOrigen = convertirACentavos(origen.saldo);
    const saldoDestino = convertirACentavos(destino.saldo);
    if (saldoOrigen < valor.centavos) rechazar('Saldo insuficiente.');
    validarSaldoMaximo(saldoDestino + valor.centavos);

    const saldoOrigenNuevo = convertirDesdeCentavos(saldoOrigen - valor.centavos);
    const saldoDestinoNuevo = convertirDesdeCentavos(saldoDestino + valor.centavos);
    const transferencia = await Transferencia.create({
      cuentaOrigenId: origen.id,
      cuentaDestinoId: destino.id,
      valor: valor.texto,
    }, { transaction: transaccion });
    origen.saldo = saldoOrigenNuevo;
    destino.saldo = saldoDestinoNuevo;
    await Promise.all([
      origen.save({ transaction: transaccion }),
      destino.save({ transaction: transaccion }),
    ]);
    await registrarMovimiento(transaccion, {
      cuentaId: origen.id,
      tipo: 'TRANSFER_OUT',
      valor: valor.texto,
      saldoResultante: saldoOrigenNuevo,
      descripcion: `Transferencia a cuenta ${destino.numeroCuenta}`,
      canal: 'WEB',
      transferenciaId: transferencia.id,
    });
    await registrarMovimiento(transaccion, {
      cuentaId: destino.id,
      tipo: 'TRANSFER_IN',
      valor: valor.texto,
      saldoResultante: saldoDestinoNuevo,
      descripcion: `Transferencia desde cuenta ${origen.numeroCuenta}`,
      canal: 'WEB',
      transferenciaId: transferencia.id,
    });
    return { saldo: saldoOrigenNuevo };
  });
}

async function retirar(idCuenta, valorRecibido) {
  const valor = validarValor(valorRecibido);
  return baseDatos.transaction(async (transaccion) => {
    const cuenta = await obtenerCuentaBloqueada(transaccion, idCuenta);
    if (cuenta.estado !== 'ACTIVE') rechazar('La cuenta no está activa.');
    const saldo = convertirACentavos(cuenta.saldo);
    if (saldo < valor.centavos) rechazar('Saldo insuficiente.');
    const saldoNuevo = convertirDesdeCentavos(saldo - valor.centavos);
    cuenta.saldo = saldoNuevo;
    await cuenta.save({ transaction: transaccion });
    await registrarMovimiento(transaccion, {
      cuentaId: cuenta.id,
      tipo: 'WITHDRAWAL',
      valor: valor.texto,
      saldoResultante: saldoNuevo,
      descripcion: 'Retiro en cajero automático',
      canal: 'ATM',
    });
    return { saldo: saldoNuevo };
  });
}

async function consultarUltimosMovimientos(idCuenta) {
  return Movimiento.findAll({
    where: { cuentaId: idCuenta },
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: 5,
  });
}

module.exports = {
  consultarResumen,
  consultarMovimientos,
  actualizarPerfil,
  cambiarContrasena: require('./autenticacion').cambiarContrasena,
  transferir,
  retirar,
  consultarUltimosMovimientos,
};
