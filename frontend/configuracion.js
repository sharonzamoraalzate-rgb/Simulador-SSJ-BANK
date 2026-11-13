(() => {
  const nombreServidor = window.location.hostname;
  const dominioCodespaces = nombreServidor.replace(/-5173(?=\.app\.github\.dev$)/, '-3000');

  if (dominioCodespaces !== nombreServidor) {
    window.CONFIGURACION_API = `${window.location.protocol}//${dominioCodespaces}/api`;
    return;
  }

  if (nombreServidor === 'localhost' || nombreServidor === '127.0.0.1') {
    window.CONFIGURACION_API = `${window.location.protocol}//${nombreServidor}:3000/api`;
    return;
  }

  window.CONFIGURACION_API = 'http://localhost:3000/api';
})();
