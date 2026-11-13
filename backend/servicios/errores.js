class ErrorAplicacion extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.name = 'ErrorAplicacion';
    this.estado = estado;
  }
}

function rechazar(mensaje, estado = 400) {
  throw new ErrorAplicacion(mensaje, estado);
}

module.exports = { ErrorAplicacion, rechazar };
