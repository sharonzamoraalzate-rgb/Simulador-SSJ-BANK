const { rechazar } = require('./errores');

const SALDO_MAXIMO_EN_CENTAVOS = 999999999999999n;

function validarValor(valor) {
  const texto = typeof valor === 'string' ? valor.trim() : String(valor ?? '');
  if (!/^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/.test(texto)) {
    rechazar('El valor debe ser mayor que cero y tener máximo dos decimales.');
  }
  const [parteEntera, parteDecimal = ''] = texto.split('.');
  const centavos = BigInt(parteEntera) * 100n + BigInt(parteDecimal.padEnd(2, '0'));
  if (centavos <= 0n) rechazar('El valor debe ser mayor que cero.');
  return { texto: `${parteEntera}.${parteDecimal.padEnd(2, '0')}`, centavos };
}

function convertirACentavos(valor) {
  const [parteEntera, parteDecimal = ''] = String(valor).split('.');
  return BigInt(parteEntera) * 100n + BigInt(parteDecimal.padEnd(2, '0'));
}

function convertirDesdeCentavos(centavos) {
  return `${centavos / 100n}.${String(centavos % 100n).padStart(2, '0')}`;
}

function validarSaldoMaximo(centavos) {
  if (centavos > SALDO_MAXIMO_EN_CENTAVOS) {
    rechazar('El saldo de la cuenta superaría el máximo permitido.');
  }
}

function validarCorreo(correo) {
  return typeof correo === 'string'
    && correo.length <= 190
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

module.exports = {
  validarValor,
  convertirACentavos,
  convertirDesdeCentavos,
  validarSaldoMaximo,
  validarCorreo,
};
