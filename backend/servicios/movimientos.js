const { Movimiento } = require('../modelos');

async function registrarMovimiento(transaccion, datos) {
  return Movimiento.create({
    cuentaId: datos.cuentaId,
    tipoMovimiento: datos.tipo,
    valor: datos.valor,
    saldoResultante: datos.saldoResultante,
    descripcion: datos.descripcion,
    canal: datos.canal,
    transferenciaId: datos.transferenciaId || null,
  }, { transaction: transaccion });
}

module.exports = { registrarMovimiento };
