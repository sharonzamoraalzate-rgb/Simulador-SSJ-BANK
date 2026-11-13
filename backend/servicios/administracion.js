const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { baseDatos, Usuario, Cuenta, Movimiento } = require('../modelos');
const { rechazar } = require('./errores');
const {
  validarValor,
  convertirACentavos,
  convertirDesdeCentavos,
  validarSaldoMaximo,
  validarCorreo,
} = require('./valores');
const { registrarMovimiento } = require('./movimientos');

async function consultarResumenAdministrativo() {
  const [totalClientes, clientesActivos, clientesBloqueados, cuentasActivas, saldoTotal] = await Promise.all([
    Usuario.count({ where: { rol: 'CLIENT' } }),
    Usuario.count({ where: { rol: 'CLIENT', estado: 'ACTIVE' } }),
    Usuario.count({ where: { rol: 'CLIENT', estado: 'BLOCKED' } }),
    Cuenta.count({ where: { estado: 'ACTIVE' } }),
    Cuenta.sum('saldo'),
  ]);
  return {
    totalClientes,
    clientesActivos,
    clientesBloqueados,
    cuentasActivas,
    saldoTotal: saldoTotal || '0.00',
  };
}

async function listarClientes(busqueda) {
  const termino = `%${String(busqueda || '').trim()}%`;
  const usuarios = await Usuario.findAll({
    where: {
      rol: 'CLIENT',
      [Op.or]: [
        { nombreCompleto: { [Op.like]: termino } },
        { nombreUsuario: { [Op.like]: termino } },
        { correo: { [Op.like]: termino } },
      ],
    },
    attributes: ['id', 'nombreUsuario', 'nombreCompleto', 'correo', 'telefono', 'estado', 'created_at'],
    order: [['id', 'DESC']],
    limit: 200,
  });
  return Promise.all(usuarios.map(async (usuario) => {
    const cuentas = await Cuenta.findAll({ where: { usuarioId: usuario.id } });
    const saldoTotal = cuentas.reduce((total, cuenta) => total + convertirACentavos(cuenta.saldo), 0n);
    return { usuario, cuentas, saldoTotal: convertirDesdeCentavos(saldoTotal) };
  }));
}

async function consultarCliente(id) {
  const usuario = await Usuario.findOne({
    where: { id, rol: 'CLIENT' },
    attributes: ['id', 'nombreUsuario', 'nombreCompleto', 'correo', 'telefono', 'estado', 'created_at'],
  });
  if (!usuario) rechazar('El cliente no existe.', 404);
  const cuentas = await Cuenta.findAll({
    where: { usuarioId: id },
    order: [['id', 'ASC']],
  });
  return { usuario, cuentas };
}

function validarDatosCliente(datos) {
  const nombreUsuario = String(datos.nombreUsuario || '').trim();
  const nombreCompleto = String(datos.nombreCompleto || '').trim();
  const correo = String(datos.correo || '').trim().toLowerCase();
  const telefono = String(datos.telefono || '').trim();
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(nombreUsuario)
    || nombreCompleto.length < 3 || nombreCompleto.length > 120
    || !validarCorreo(correo)
    || telefono.length > 30
    || typeof datos.contrasena !== 'string' || datos.contrasena.length < 8 || datos.contrasena.length > 72
    || !/^\d{4,6}$/.test(String(datos.pin || ''))
    || !['SAVINGS', 'CHECKING'].includes(datos.tipoCuenta)) {
    rechazar('Revisa los datos. Usuario, contraseña, PIN y tipo de cuenta son obligatorios.');
  }
  return { nombreUsuario, nombreCompleto, correo, telefono };
}

function generarNumeroCuenta() {
  return String(1000000000 + crypto.randomInt(0, 9000000000));
}

async function crearCliente(datos) {
  const valores = validarDatosCliente(datos);
  const hashContrasena = await bcrypt.hash(datos.contrasena, 12);
  const hashPinCajero = await bcrypt.hash(String(datos.pin), 12);
  try {
    return await baseDatos.transaction(async (transaccion) => {
      const usuario = await Usuario.create({
        ...valores,
        hashContrasena,
        hashPinCajero,
        rol: 'CLIENT',
        estado: 'ACTIVE',
      }, { transaction: transaccion });
      let numeroCuenta = null;
      for (let intento = 0; intento < 5; intento += 1) {
        const candidato = generarNumeroCuenta();
        const existente = await Cuenta.findOne({
          where: { numeroCuenta: candidato },
          attributes: ['id'],
          transaction: transaccion,
        });
        if (!existente) {
          numeroCuenta = candidato;
          break;
        }
      }
      if (!numeroCuenta) throw new Error('No fue posible asignar un número de cuenta único.');
      await Cuenta.create({
        usuarioId: usuario.id,
        numeroCuenta,
        tipoCuenta: datos.tipoCuenta,
        saldo: '0.00',
        estado: 'ACTIVE',
      }, { transaction: transaccion });
      return { id: usuario.id, numeroCuenta };
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      rechazar('El usuario o correo ya está registrado.');
    }
    throw error;
  }
}

async function actualizarCliente(id, datos) {
  if (datos.estado !== undefined) {
    if (!['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(datos.estado)) rechazar('Estado no válido.');
    return baseDatos.transaction(async (transaccion) => {
      const [cantidad] = await Usuario.update(
        { estado: datos.estado },
        { where: { id, rol: 'CLIENT' }, transaction: transaccion },
      );
      if (!cantidad) rechazar('El cliente no existe.', 404);
      await Cuenta.update(
        { estado: datos.estado },
        { where: { usuarioId: id }, transaction: transaccion },
      );
    });
  }

  const nombreCompleto = String(datos.nombreCompleto || '').trim();
  const correo = String(datos.correo || '').trim().toLowerCase();
  const telefono = String(datos.telefono || '').trim();
  if (nombreCompleto.length < 3 || nombreCompleto.length > 120 || !validarCorreo(correo)
    || telefono.length > 30) {
    rechazar('Verifica el nombre, correo electrónico y teléfono.');
  }
  try {
    const [cantidad] = await Usuario.update(
      { nombreCompleto, correo, telefono: telefono || null },
      { where: { id, rol: 'CLIENT' } },
    );
    if (!cantidad) rechazar('El cliente no existe.', 404);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') rechazar('Ese correo ya está registrado.');
    throw error;
  }
}

async function listarCuentas() {
  return Cuenta.findAll({
    include: [{
      model: Usuario,
      as: 'usuario',
      attributes: ['nombreCompleto', 'nombreUsuario'],
      required: true,
    }],
    order: [['id', 'DESC']],
    limit: 500,
  });
}

async function consignar(idCuenta, valorRecibido) {
  const valor = validarValor(valorRecibido);
  return baseDatos.transaction(async (transaccion) => {
    const cuenta = await Cuenta.findByPk(idCuenta, {
      transaction: transaccion,
      lock: transaccion.LOCK.UPDATE,
    });
    if (!cuenta) rechazar('La cuenta no existe.', 404);
    if (cuenta.estado !== 'ACTIVE') {
      rechazar('No se puede consignar en una cuenta inactiva o bloqueada.');
    }
    const saldoNuevo = convertirACentavos(cuenta.saldo) + valor.centavos;
    validarSaldoMaximo(saldoNuevo);
    cuenta.saldo = convertirDesdeCentavos(saldoNuevo);
    await cuenta.save({ transaction: transaccion });
    await registrarMovimiento(transaccion, {
      cuentaId: cuenta.id,
      tipo: 'DEPOSIT',
      valor: valor.texto,
      saldoResultante: cuenta.saldo,
      descripcion: 'Consignación realizada por administración',
      canal: 'ADMIN',
    });
    return { saldo: cuenta.saldo };
  });
}

async function consultarMovimientosGenerales() {
  return Movimiento.findAll({
    include: [
      {
        model: Cuenta,
        as: 'cuenta',
        attributes: ['numeroCuenta'],
        required: true,
        include: [{
          model: Usuario,
          as: 'usuario',
          attributes: ['nombreCompleto'],
          required: true,
        }],
      },
    ],
    order: [['created_at', 'DESC'], ['id', 'DESC']],
    limit: 300,
  });
}

module.exports = {
  consultarResumenAdministrativo,
  listarClientes,
  consultarCliente,
  crearCliente,
  actualizarCliente,
  listarCuentas,
  consignar,
  consultarMovimientosGenerales,
};
