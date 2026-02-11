const orbitalUICache = {
  host: null,
  placeholder: null
};

function cacheOrbitalUIElements() {
  if (!orbitalUICache.host || !orbitalUICache.host.isConnected) {
    orbitalUICache.host = document.getElementById('orbital-colonies-content');
  }
}

function initializeOrbitalUI() {
  cacheOrbitalUIElements();
  if (!orbitalUICache.host) {
    return;
  }

  if (!orbitalUICache.placeholder || !orbitalUICache.placeholder.isConnected) {
    orbitalUICache.placeholder = document.createElement('div');
    orbitalUICache.placeholder.id = 'orbital-placeholder-text';
    orbitalUICache.host.appendChild(orbitalUICache.placeholder);
  }

  updateOrbitalUI();
}

function updateOrbitalUI() {
  cacheOrbitalUIElements();
  if (!orbitalUICache.host) {
    return;
  }

  if (!orbitalUICache.placeholder || !orbitalUICache.placeholder.isConnected) {
    initializeOrbitalUI();
    return;
  }

  orbitalUICache.placeholder.textContent = 'Orbital systems online. Additional controls will be added in a future update.';
}
