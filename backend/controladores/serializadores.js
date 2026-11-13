function usuarioParaRespuesta(usuario) {
  return {
    id: usuario.id,
    username: usuario.nombreUsuario,
    full_name: usuario.nombreCompleto,
    email: usuario.correo,
    phone: usuario.telefono,
    role: usuario.rol,
    status: usuario.estado,
    created_at: usuario.created_at,
  };
}

function cuentaParaRespuesta(cuenta) {
  return {
    id: cuenta.id,
    user_id: cuenta.usuarioId,
    account_number: cuenta.numeroCuenta,
    account_type: cuenta.tipoCuenta,
    balance: cuenta.saldo,
    status: cuenta.estado,
    created_at: cuenta.created_at,
    full_name: cuenta.usuario?.nombreCompleto,
    username: cuenta.usuario?.nombreUsuario,
  };
}

function movimientoParaRespuesta(movimiento, cuenta = movimiento.cuenta) {
  return {
    id: movimiento.id,
    account_id: movimiento.cuentaId,
    movement_type: movimiento.tipoMovimiento,
    amount: movimiento.valor,
    balance_after: movimiento.saldoResultante,
    description: movimiento.descripcion,
    channel: movimiento.canal,
    transfer_id: movimiento.transferenciaId,
    created_at: movimiento.created_at,
    account_number: cuenta?.numeroCuenta,
    full_name: cuenta?.usuario?.nombreCompleto,
  };
}

function clienteParaRespuesta(usuario, cuentas, saldoTotal = undefined) {
  return {
    id: usuario.id,
    username: usuario.nombreUsuario,
    full_name: usuario.nombreCompleto,
    email: usuario.correo,
    phone: usuario.telefono,
    status: usuario.estado,
    created_at: usuario.created_at,
    account_count: cuentas.length,
    total_balance: saldoTotal,
  };
}

module.exports = {
  usuarioParaRespuesta,
  cuentaParaRespuesta,
  movimientoParaRespuesta,
  clienteParaRespuesta,
};
