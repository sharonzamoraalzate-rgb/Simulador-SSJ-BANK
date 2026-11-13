const main = document.querySelector('#main');
const toast = document.querySelector('#toast');
const state = { user: null, role: null, view: 'dashboard', atm: false, customerSearch: '', toastTimer: null };
const direccionApi = window.CONFIGURACION_API || 'http://localhost:3000/api';
const currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

function escaparHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function formatearMoneda(value) {
  return currency.format(Number(value || 0));
}

function agruparDigitos(valor) {
  return valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatearEntradaMonetaria(valor) {
  const texto = String(valor).replace(/[^\d,]/g, '');
  const partes = texto.split(',');
  const entero = partes[0].replace(/^0+(?=\d)/, '');
  const fraccion = partes.length > 1 ? partes[1].slice(0, 2) : null;
  return `${agruparDigitos(entero)}${fraccion === null ? '' : `,${fraccion}`}`;
}

function normalizarEntradaMonetaria(valor) {
  return String(valor).replace(/\./g, '').replace(',', '.');
}

function formatearFecha(value) {
  return value ? dateFormat.format(new Date(value)) : '—';
}

function mostrarNotificacion(message, isError = false) {
  toast.textContent = message;
  toast.className = `toast show${isError ? ' error' : ''}`;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3600);
}

async function api(url, options = {}) {
  const rutaApi = url.replace(/^\/api/, '');
  let response;
  try {
    response = await fetch(`${direccionApi}${rutaApi}`, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`No se pudo conectar con el backend (${direccionApi}). Verifica que el puerto 3000 esté activo y accesible.`);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'No fue posible completar la solicitud.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function field(label, name, type = 'text', attrs = '') {
  const ayudaMonetaria = attrs.includes('data-formato-monetario')
    ? '<small class="subtle">Usa puntos para miles y coma para centavos.</small>'
    : '';
  return `<div class="field"><label for="${escaparHtml(name)}">${escaparHtml(label)}</label><input id="${escaparHtml(name)}" name="${escaparHtml(name)}" type="${type}" ${attrs}>${ayudaMonetaria}</div>`;
}

function crearEncabezado(kicker, title, description, actions = '') {
  return `<div class="page-heading"><div><span class="eyebrow">${escaparHtml(kicker)}</span><h1>${escaparHtml(title)}</h1><p>${escaparHtml(description)}</p></div>${actions}</div>`;
}

function insigniaEstado(status) {
  const labels = { ACTIVE: 'Activa', BLOCKED: 'Bloqueada', INACTIVE: 'Inactiva' };
  return `<span class="badge ${status === 'ACTIVE' ? '' : status.toLowerCase()}">${labels[status] || escaparHtml(status)}</span>`;
}

function nombreMovimiento(type) {
  return ({ DEPOSIT: 'Consignación', WITHDRAWAL: 'Retiro', TRANSFER_IN: 'Transferencia recibida', TRANSFER_OUT: 'Transferencia enviada' })[type] || type;
}

function tablaMovimientos(rows, showClient = false) {
  if (!rows.length) return '<div class="empty">Todavía no hay movimientos para mostrar.</div>';
  return `<div class="table-wrap"><table><thead><tr>${showClient ? '<th>Cliente</th><th>Cuenta</th>' : '<th>Cuenta</th>'}<th>Movimiento</th><th>Descripción</th><th>Valor</th><th>Saldo resultante</th><th>Fecha</th></tr></thead><tbody>${rows.map((row) => {
    const positive = ['DEPOSIT', 'TRANSFER_IN'].includes(row.movement_type);
    return `<tr>${showClient ? `<td>${escaparHtml(row.full_name)}</td>` : ''}<td>${escaparHtml(row.account_number || '')}</td><td>${escaparHtml(nombreMovimiento(row.movement_type))}</td><td>${escaparHtml(row.description)}</td><td class="${positive ? 'amount-in' : 'amount-out'}">${positive ? '+' : '−'}${formatearMoneda(row.amount)}</td><td>${formatearMoneda(row.balance_after)}</td><td>${formatearFecha(row.created_at)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function mostrarInicio() {
  state.user = null;
  state.role = null;
  state.atm = false;
  main.innerHTML = `<section class="auth-wrap"><div class="auth-grid">
    <div class="welcome-panel"><span class="welcome-orb"><svg class="ssj-emblem" viewBox="0 0 48 48" aria-hidden="true"><path class="emblem-shield" d="M24 3.5 40 9v12.7c0 10.1-6.7 18.1-16 22.8-9.3-4.7-16-12.7-16-22.8V9l16-5.5Z"/><path class="emblem-line" d="M15.5 17.5c2-3.1 5.3-4.7 9.5-4.7 4.7 0 7.7 2 7.7 5.2 0 7.2-15.5 3.1-15.5 10 0 3.1 3.1 5.2 7.5 5.2 4.2 0 7.5-1.6 9.5-4.7"/><path class="emblem-accent" d="M12 38.5 36 9.8"/></svg></span><span class="eyebrow">Confianza en cada movimiento</span><h1>Tu banco, a tu manera.</h1><p>Una experiencia bancaria sencilla y segura. Consulta tus cuentas, administra tus finanzas o realiza operaciones en el cajero.</p><span class="welcome-signature">SSJ Bank <span>·</span> Banca para avanzar</span></div>
    <div class="auth-panel"><div class="auth-heading"><span class="eyebrow">BIENVENIDO A SSJ BANK</span><h2>Inicia sesión</h2><p class="subtle">Ingresa tus credenciales para acceder de forma segura.</p></div>
      <form id="login-form">
        <div class="field"><label for="role">Tipo de usuario</label><select id="role" name="role"><option value="CLIENT">Cliente</option><option value="ADMIN">Administrador</option></select></div>
        ${field('Usuario o correo electrónico', 'username', 'text', 'autocomplete="username" required')}
        ${field('Contraseña', 'password', 'password', 'autocomplete="current-password" required')}
        <button class="button button-primary button-full" type="submit">Ingresar a la banca</button>
      </form>
      <p class="auth-alt">¿Vas a usar el cajero? <button class="link-button" data-action="show-atm">Ingresar con cuenta y PIN</button></p>
    </div>
  </div></section>`;
}

function mostrarAccesoCajero() {
  state.atm = true;
  main.innerHTML = `<section class="atm-wrap"><div class="atm"><div class="atm-screen">
    <span class="eyebrow">SSJ Bank · Cajero</span><h1>Identifícate</h1><p class="subtle">Ingresa el número de cuenta y el PIN asociados.</p>
    <form id="atm-login-form">${field('Número de cuenta', 'account_number', 'text', 'inputmode="numeric" autocomplete="off" required')}${field('PIN', 'pin', 'password', 'inputmode="numeric" maxlength="6" autocomplete="off" required')}<button class="button button-primary button-full" type="submit">Continuar</button></form>
  </div><button class="atm-back" data-action="home">Volver al inicio</button></div></section>`;
}

const navegacionCliente = [
  ['dashboard', 'Resumen'],
  ['movements', 'Movimientos'],
  ['transfer', 'Transferir'],
  ['profile', 'Mi perfil'],
];
const navegacionAdministracion = [
  ['dashboard', 'Dashboard'],
  ['customers', 'Clientes'],
  ['accounts', 'Cuentas y consignaciones'],
  ['movements', 'Movimientos generales'],
];

function mostrarEstructura(content) {
  const nav = state.role === 'ADMIN' ? navegacionAdministracion : navegacionCliente;
  const initials = (state.user?.full_name || 'U').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  main.innerHTML = `<div class="app-layout"><aside class="sidebar">
    <div class="sidebar-user"><div class="avatar">${escaparHtml(initials)}</div><strong>${escaparHtml(state.user?.full_name)}</strong><span>${state.role === 'ADMIN' ? 'Administración' : 'Banca virtual'}</span></div>
    <nav class="nav-list">${nav.map(([key, title]) => `<button class="nav-button ${state.view === key ? 'active' : ''}" data-view="${key}">${escaparHtml(title)}</button>`).join('')}</nav>
    <button class="nav-button logout" data-action="logout">↗ Cerrar sesión</button>
  </aside><section class="content">${content}</section></div>`;
}

async function mostrarResumenCliente() {
  const [dashboard, movementData] = await Promise.all([
    api('/api/customer/dashboard'),
    api('/api/customer/movements'),
  ]);
  state.user = dashboard.user;
  const accounts = dashboard.accounts.length
    ? `<div class="accounts-grid">${dashboard.accounts.map((account) => `<article class="account-card"><div class="debit-card-top"><span class="debit-card-brand">SSJ <small>BANK</small></span><span class="debit-card-label">DÉBITO</span></div><div class="debit-card-chip" aria-hidden="true"><span></span></div><div class="debit-card-meta"><span class="account-type">${account.account_type === 'SAVINGS' ? 'Cuenta de ahorros' : 'Cuenta corriente'}</span>${insigniaEstado(account.status)}</div><div class="account-number">${escaparHtml(account.account_number)}</div><div class="debit-card-bottom"><div><span class="debit-card-caption">TITULAR</span><span class="debit-card-holder">${escaparHtml(state.user.full_name)}</span></div><div class="debit-card-balance"><span class="debit-card-caption">SALDO DISPONIBLE</span><strong>${formatearMoneda(account.balance)}</strong></div></div></article>`).join('')}</div>`
    : '<div class="empty">No tienes cuentas asignadas. Contacta a un administrador.</div>';
  mostrarEstructura(`${crearEncabezado('Banca virtual', `Hola, ${(state.user.full_name || '').split(' ')[0]}`, 'Este es el resumen de tus cuentas y actividad reciente.')}
    <div class="cards"><article class="stat-card highlight"><span>Saldo total disponible</span><strong>${formatearMoneda(dashboard.total_balance)}</strong></article><article class="stat-card"><span>Cuentas registradas</span><strong>${dashboard.accounts.length}</strong></article><article class="stat-card"><span>Movimientos recientes</span><strong>${movementData.movements.length}</strong></article></div>
    <div class="section-title"><h2>Tus cuentas</h2></div>${accounts}
    <section class="panel"><div class="panel-heading"><h2>Actividad reciente</h2><button class="link-button" data-view="movements">Ver todos</button></div>${tablaMovimientos(movementData.movements.slice(0, 5))}</section>`);
}

async function mostrarMovimientosCliente() {
  const { movements } = await api('/api/customer/movements');
  mostrarEstructura(`${crearEncabezado('Tu actividad', 'Historial de movimientos', 'Consulta las operaciones de todas tus cuentas.')}${panelTablaMovimientos(movements)}`);
}

function panelTablaMovimientos(rows, showClient = false) {
  return `<section class="panel">${tablaMovimientos(rows, showClient)}</section>`;
}

async function mostrarTransferencia(accounts) {
  const active = accounts.filter((account) => account.status === 'ACTIVE');
  mostrarEstructura(`${crearEncabezado('Operaciones', 'Transferir dinero', 'Envía dinero a otra cuenta activa de SSJ Bank.')}
    <div class="two-col"><section class="panel"><h2>Nueva transferencia</h2><p class="subtle">La operación se aplica inmediatamente a las dos cuentas.</p>
      <form id="transfer-form">
        <div class="field"><label for="from_account_id">Cuenta de origen</label><select id="from_account_id" name="from_account_id" required>${active.map((account) => `<option value="${account.id}">${escaparHtml(account.account_number)} · ${formatearMoneda(account.balance)}</option>`).join('')}</select></div>
        ${field('Número de cuenta destino', 'destination_account_number', 'text', 'inputmode="numeric" required')}
        ${field('Valor a transferir (COP)', 'amount', 'text', 'inputmode="decimal" autocomplete="off" placeholder="Ej. 50.000" data-formato-monetario required')}
        <button class="button button-primary form-actions" type="submit" ${active.length ? '' : 'disabled'}>Confirmar transferencia</button>
      </form></section>
      <section class="panel"><span class="eyebrow">Antes de enviar</span><h2>Ten en cuenta</h2><p class="subtle">Verifica el número de cuenta destino. Ambas cuentas deben estar activas y debes tener saldo suficiente.</p><p class="subtle">No compartas tus credenciales ni el PIN del cajero.</p></section></div>`);
}

function mostrarPerfil() {
  mostrarEstructura(`${crearEncabezado('Configuración', 'Mi perfil', 'Actualiza tus datos de contacto y mantén tu contraseña segura.')}
    <div class="two-col"><section class="panel"><h2>Información personal</h2><form id="profile-form">
      ${field('Nombre completo', 'full_name', 'text', `value="${escaparHtml(state.user.full_name)}" maxlength="120" required`)}
      ${field('Correo electrónico', 'email', 'email', `value="${escaparHtml(state.user.email)}" required`)}
      ${field('Teléfono', 'phone', 'tel', `value="${escaparHtml(state.user.phone || '')}" maxlength="30"`)}
      <button class="button button-primary form-actions" type="submit">Guardar cambios</button></form></section>
      <section class="panel"><h2>Cambiar contraseña</h2><form id="password-form">
        ${field('Contraseña actual', 'current_password', 'password', 'autocomplete="current-password" required')}
        ${field('Nueva contraseña', 'new_password', 'password', 'minlength="8" maxlength="72" autocomplete="new-password" required')}
        <button class="button button-dark form-actions" type="submit">Actualizar contraseña</button></form></section></div>`);
}

async function mostrarResumenAdministracion() {
  const { summary } = await api('/api/admin/dashboard');
  mostrarEstructura(`${crearEncabezado('Administración', 'Panel general', 'Estado de clientes, cuentas y saldos del banco.')}
    <div class="cards">
      <article class="stat-card"><span>Clientes registrados</span><strong>${summary.total_clients}</strong></article>
      <article class="stat-card"><span>Clientes activos</span><strong>${summary.active_clients}</strong></article>
      <article class="stat-card"><span>Clientes bloqueados</span><strong>${summary.blocked_clients}</strong></article>
      <article class="stat-card"><span>Cuentas activas</span><strong>${summary.active_accounts}</strong></article>
      <article class="stat-card highlight"><span>Saldo total en cuentas</span><strong>${formatearMoneda(summary.total_balance)}</strong></article>
    </div>
    <section class="panel"><h2>Gestión del banco</h2><p class="subtle">Administra clientes, revisa las cuentas y registra consignaciones. Todos los cambios se reflejan en la banca virtual y el cajero.</p></section>`);
}

async function mostrarClientes() {
  const { customers } = await api(`/api/admin/customers?search=${encodeURIComponent(state.customerSearch)}`);
  const rows = customers.length ? customers.map((customer) => `<tr><td>${escaparHtml(customer.full_name)}</td><td>${escaparHtml(customer.username)}</td><td>${escaparHtml(customer.email)}</td><td>${customer.account_count}</td><td>${formatearMoneda(customer.total_balance)}</td><td>${insigniaEstado(customer.status)}</td><td><button class="link-button" data-customer="${customer.id}">Ver detalle</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty">No se encontraron clientes.</td></tr>';
  mostrarEstructura(`${crearEncabezado('Administración', 'Clientes', 'Busca clientes y gestiona su información.')}
    <section class="panel"><div class="panel-heading"><h2>Clientes registrados</h2><button class="button button-primary" data-view="new-customer">＋ Crear cliente</button></div>
      <input class="search-input" id="customer-search" type="search" placeholder="Buscar por nombre, usuario o correo…" value="${escaparHtml(state.customerSearch)}" aria-label="Buscar clientes">
      <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Correo</th><th>Cuentas</th><th>Saldo</th><th>Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`);
}

function mostrarFormularioNuevoCliente() {
  mostrarEstructura(`${crearEncabezado('Administración', 'Crear cliente', 'El cliente se creará con una cuenta bancaria activa.')}
    <section class="panel"><form id="create-customer-form"><div class="form-grid">
      ${field('Nombre completo', 'full_name', 'text', 'maxlength="120" required')}
      ${field('Usuario', 'username', 'text', 'minlength="3" maxlength="40" pattern="[a-zA-Z0-9._-]+" required')}
      ${field('Correo electrónico', 'email', 'email', 'required')}
      ${field('Teléfono', 'phone', 'tel', 'maxlength="30"')}
      ${field('Contraseña inicial', 'password', 'password', 'minlength="8" maxlength="72" required')}
      ${field('PIN del cajero (4 a 6 dígitos)', 'pin', 'password', 'minlength="4" maxlength="6" pattern="[0-9]{4,6}" inputmode="numeric" required')}
      <div class="field"><label for="account_type">Tipo de cuenta</label><select id="account_type" name="account_type"><option value="SAVINGS">Ahorros</option><option value="CHECKING">Corriente</option></select></div>
    </div><button class="button button-primary form-actions" type="submit">Crear cliente</button></form></section>`);
}

async function mostrarDetalleCliente(id) {
  const { customer, accounts } = await api(`/api/admin/customers/${id}`);
  mostrarEstructura(`${crearEncabezado('Administración', 'Detalle del cliente', `${customer.username} · ${customer.email}`, '<button class="button button-ghost" data-view="customers">Volver a clientes</button>')}
    <div class="two-col"><section class="panel"><h2>Información del cliente</h2><form id="admin-profile-form" data-id="${customer.id}">
      ${field('Nombre completo', 'full_name', 'text', `value="${escaparHtml(customer.full_name)}" required`)}
      ${field('Correo electrónico', 'email', 'email', `value="${escaparHtml(customer.email)}" required`)}
      ${field('Teléfono', 'phone', 'tel', `value="${escaparHtml(customer.phone || '')}"`)}
      <button class="button button-primary" type="submit">Guardar información</button></form>
      <div class="section-title" style="margin-top:22px"><h2>Estado: ${insigniaEstado(customer.status)}</h2></div>
      <div class="toolbar">${customer.status === 'ACTIVE'
        ? `<button class="button button-danger" data-customer-status="${customer.id}" data-status="BLOCKED">Bloquear cliente</button>`
        : `<button class="button button-ghost" data-customer-status="${customer.id}" data-status="ACTIVE">Activar cliente</button><button class="button button-ghost" data-customer-status="${customer.id}" data-status="INACTIVE">Inactivar</button>`}</div>
    </section><section class="panel"><h2>Cuentas bancarias</h2>${accounts.length ? accounts.map((account) => `<div class="account-card" style="margin-top:12px"><span class="account-type">${account.account_type === 'SAVINGS' ? 'Ahorros' : 'Corriente'} · ${insigniaEstado(account.status)}</span><div class="account-number">${escaparHtml(account.account_number)}</div><strong>${formatearMoneda(account.balance)}</strong></div>`).join('') : '<div class="empty">Sin cuentas.</div>'}</section></div>`);
}

async function mostrarCuentas() {
  const { accounts } = await api('/api/admin/accounts');
  const options = accounts.filter((account) => account.status === 'ACTIVE').map((account) => `<option value="${account.id}">${escaparHtml(account.account_number)} · ${escaparHtml(account.full_name)} · ${formatearMoneda(account.balance)}</option>`).join('');
  const rows = accounts.map((account) => `<tr><td>${escaparHtml(account.account_number)}</td><td>${escaparHtml(account.full_name)}</td><td>${account.account_type === 'SAVINGS' ? 'Ahorros' : 'Corriente'}</td><td>${formatearMoneda(account.balance)}</td><td>${insigniaEstado(account.status)}</td></tr>`).join('');
  mostrarEstructura(`${crearEncabezado('Administración', 'Cuentas y consignaciones', 'Consulta saldos y registra depósitos en cuentas activas.')}
    <div class="two-col"><section class="panel"><h2>Realizar consignación</h2><form id="deposit-form">
      <div class="field"><label for="account_id">Cuenta</label><select id="account_id" name="account_id" required>${options || '<option value="">No hay cuentas activas</option>'}</select></div>
      ${field('Valor a consignar (COP)', 'amount', 'text', 'inputmode="decimal" autocomplete="off" placeholder="Ej. 50.000" data-formato-monetario required')}
      <button class="button button-primary" type="submit" ${options ? '' : 'disabled'}>Confirmar consignación</button></form></section>
      <section class="panel"><span class="eyebrow">Integración</span><h2>Saldo compartido</h2><p class="subtle">Cada consignación se registra en el historial y actualiza el saldo visible para el cliente y el cajero.</p></section></div>
    <section class="panel"><div class="panel-heading"><h2>Cuentas bancarias</h2><span class="subtle">${accounts.length} cuentas</span></div><div class="table-wrap"><table><thead><tr><th>Número</th><th>Cliente</th><th>Tipo</th><th>Saldo</th><th>Estado</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty">No hay cuentas.</td></tr>'}</tbody></table></div></section>`);
}

async function mostrarMovimientosAdministracion() {
  const { movements } = await api('/api/admin/movements');
  mostrarEstructura(`${crearEncabezado('Administración', 'Movimientos generales', 'Historial financiero de todas las cuentas.')}${panelTablaMovimientos(movements, true)}`);
}

async function mostrarInicioCajero() {
  const { account } = await api('/api/atm/balance');
  main.innerHTML = `<section class="atm-wrap"><div class="atm"><div class="atm-screen">
    <span class="eyebrow">SSJ Bank · Cajero automático</span><h1>Hola, ${escaparHtml(account.full_name)}</h1><p class="subtle">Cuenta ${escaparHtml(account.account_number)} · ${account.account_type === 'SAVINGS' ? 'Ahorros' : 'Corriente'}</p>
    <div class="atm-options"><button class="button button-primary" data-action="atm-balance">Consultar saldo</button><button class="button button-ghost" data-action="atm-withdraw">Realizar retiro</button><button class="button button-ghost" data-action="atm-movements">Últimos movimientos</button><button class="button button-danger" data-action="atm-logout">Cerrar operación</button></div>
    <div id="atm-result"></div></div></div></section>`;
}

async function mostrarVista() {
  try {
    if (state.atm) {
      if (state.view === 'atm-home') await mostrarInicioCajero();
      return;
    }
    if (!state.user) return mostrarInicio();
    if (state.role === 'CLIENT') {
      if (state.view === 'dashboard') return await mostrarResumenCliente();
      if (state.view === 'movements') return await mostrarMovimientosCliente();
      if (state.view === 'transfer') {
        const { accounts } = await api('/api/customer/dashboard');
        return mostrarTransferencia(accounts);
      }
      if (state.view === 'profile') return mostrarPerfil();
    } else {
      if (state.view === 'dashboard') return await mostrarResumenAdministracion();
      if (state.view === 'customers') return await mostrarClientes();
      if (state.view === 'new-customer') return mostrarFormularioNuevoCliente();
      if (state.view.startsWith('customer-')) return await mostrarDetalleCliente(state.view.split('-')[1]);
      if (state.view === 'accounts') return await mostrarCuentas();
      if (state.view === 'movements') return await mostrarMovimientosAdministracion();
    }
    state.view = 'dashboard';
    await mostrarVista();
  } catch (error) {
    if ([401, 403].includes(error.status)) {
      state.user = null;
      state.role = null;
      mostrarInicio();
      return;
    }
    mostrarNotificacion(error.message, true);
  }
}

async function enviarFormulario(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  if (typeof data.amount === 'string') data.amount = normalizarEntradaMonetaria(data.amount);
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    if (form.id === 'login-form') {
      const { user } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
      state.user = user;
      state.role = user.role;
      state.view = 'dashboard';
      return mostrarVista();
    }
    if (form.id === 'atm-login-form') {
      await api('/api/atm/login', { method: 'POST', body: JSON.stringify(data) });
      state.atm = true;
      state.view = 'atm-home';
      return mostrarVista();
    }
    if (form.id === 'transfer-form') {
      const result = await api('/api/customer/transfers', { method: 'POST', body: JSON.stringify(data) });
      mostrarNotificacion(`${result.message} Nuevo saldo: ${formatearMoneda(result.balance)}`);
      state.view = 'dashboard';
      return mostrarVista();
    }
    if (form.id === 'profile-form') {
      await api('/api/customer/profile', { method: 'PATCH', body: JSON.stringify(data) });
      state.user = { ...state.user, ...data };
      mostrarNotificacion('Perfil actualizado.');
      return mostrarVista();
    }
    if (form.id === 'password-form') {
      await api('/api/customer/password', { method: 'POST', body: JSON.stringify(data) });
      mostrarNotificacion('Contraseña actualizada.');
      return mostrarVista();
    }
    if (form.id === 'create-customer-form') {
      const result = await api('/api/admin/customers', { method: 'POST', body: JSON.stringify(data) });
      mostrarNotificacion(`Cliente creado. Número de cuenta: ${result.account_number}`);
      state.view = 'customers';
      return mostrarVista();
    }
    if (form.id === 'admin-profile-form') {
      const result = await api(`/api/admin/customers/${form.dataset.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      mostrarNotificacion(result.message);
      return mostrarVista();
    }
    if (form.id === 'deposit-form') {
      const result = await api('/api/admin/deposits', { method: 'POST', body: JSON.stringify(data) });
      mostrarNotificacion(`${result.message} Nuevo saldo: ${formatearMoneda(result.balance)}`);
      return mostrarVista();
    }
    if (form.id === 'atm-withdraw-form') {
      const result = await api('/api/atm/withdrawals', { method: 'POST', body: JSON.stringify(data) });
      mostrarNotificacion(`${result.message} Nuevo saldo: ${formatearMoneda(result.balance)}`);
      return mostrarInicioCajero();
    }
  } catch (error) {
    mostrarNotificacion(error.message, true);
    if (button) button.disabled = false;
  }
}

document.addEventListener('submit', (event) => {
  if (event.target instanceof HTMLFormElement) {
    event.preventDefault();
    enviarFormulario(event.target);
  }
});

document.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  try {
    if (button.dataset.view) {
      state.view = button.dataset.view;
      await mostrarVista();
    } else if (button.dataset.action === 'show-atm') {
      mostrarAccesoCajero();
    } else if (button.dataset.action === 'home') {
      mostrarInicio();
    } else if (button.dataset.action === 'logout') {
      await api('/api/auth/logout', { method: 'POST' });
      mostrarInicio();
    } else if (button.dataset.action === 'atm-balance') {
      const { account } = await api('/api/atm/balance');
      document.querySelector('#atm-result').innerHTML = `<div class="amount-large">${formatearMoneda(account.balance)}</div><p class="subtle">Saldo disponible</p>`;
    } else if (button.dataset.action === 'atm-withdraw') {
      document.querySelector('#atm-result').innerHTML = `<form id="atm-withdraw-form">${field('Valor del retiro (COP)', 'amount', 'text', 'inputmode="decimal" autocomplete="off" placeholder="Ej. 50.000" data-formato-monetario required')}<button class="button button-primary" type="submit">Retirar</button></form>`;
    } else if (button.dataset.action === 'atm-movements') {
      const { movements } = await api('/api/atm/movements');
      const html = movements.length ? `<div class="table-wrap"><table><thead><tr><th>Movimiento</th><th>Valor</th><th>Fecha</th></tr></thead><tbody>${movements.map((item) => `<tr><td>${escaparHtml(nombreMovimiento(item.movement_type))}</td><td>${formatearMoneda(item.amount)}</td><td>${formatearFecha(item.created_at)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="subtle">No hay movimientos recientes.</p>';
      document.querySelector('#atm-result').innerHTML = html;
    } else if (button.dataset.action === 'atm-logout') {
      await api('/api/atm/logout', { method: 'POST' });
      mostrarInicio();
    } else if (button.dataset.customer) {
      state.view = `customer-${button.dataset.customer}`;
      await mostrarVista();
    } else if (button.dataset.customerStatus) {
      const result = await api(`/api/admin/customers/${button.dataset.customerStatus}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: button.dataset.status }),
      });
      mostrarNotificacion(result.message);
      await mostrarVista();
    }
  } catch (error) {
    mostrarNotificacion(error.message, true);
  }
});

let searchTimer;
document.addEventListener('input', (event) => {
  if (event.target.matches('[data-formato-monetario]')) {
    const entrada = event.target;
    const cursorAlFinal = entrada.selectionStart === entrada.value.length;
    entrada.value = formatearEntradaMonetaria(entrada.value);
    if (cursorAlFinal) entrada.setSelectionRange(entrada.value.length, entrada.value.length);
    return;
  }
  if (event.target.id !== 'customer-search') return;
  state.customerSearch = event.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => mostrarClientes().catch((error) => mostrarNotificacion(error.message, true)), 250);
});

async function inicializarAplicacion() {
  try {
    try {
      const { user } = await api('/api/auth/me');
      state.user = user;
      state.role = 'CLIENT';
    } catch (error) {
      if (![401, 403].includes(error.status)) throw error;
      const { user } = await api('/api/admin/me');
      state.user = user;
      state.role = 'ADMIN';
    }
    state.view = 'dashboard';
    await mostrarVista();
  } catch (error) {
    mostrarInicio();
    if (![401, 403].includes(error.status)) mostrarNotificacion(error.message, true);
  }
}

inicializarAplicacion();
