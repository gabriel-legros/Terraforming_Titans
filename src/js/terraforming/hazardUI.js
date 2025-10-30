const hazardUICache = {
  root: null,
  card: null,
  emptyMessage: null,
  parameterList: null,
  parameterRows: {},
  parameterNameSpans: {},
  parameterValueSpans: {},
  initialized: false
};

function getHazardRoot() {
  if (hazardUICache.root || typeof document === 'undefined') {
    return hazardUICache.root;
  }

  const node = document.getElementById('hazard-terraforming');
  hazardUICache.root = node || null;
  return hazardUICache.root;
}

function createHazardCard(root) {
  const card = document.createElement('div');
  card.classList.add('terraforming-card');

  const title = document.createElement('h3');
  title.classList.add('terraforming-section-title');
  title.textContent = 'Planetary Hazards';
  card.appendChild(title);

  const description = document.createElement('p');
  description.classList.add('terraforming-subtext');
  description.textContent = 'Track radiation, dust storms, and other threats that challenge surface operations.';
  card.appendChild(description);

  const emptyMessage = document.createElement('p');
  emptyMessage.id = 'hazard-empty-message';
  emptyMessage.textContent = 'No active hazards detected.';
  card.appendChild(emptyMessage);

  const parameterList = document.createElement('div');
  parameterList.id = 'hazard-parameter-list';
  parameterList.classList.add('hazard-parameter-list', 'hidden');
  card.appendChild(parameterList);

  root.appendChild(card);

  hazardUICache.card = card;
  hazardUICache.emptyMessage = emptyMessage;
  hazardUICache.parameterList = parameterList;
  hazardUICache.initialized = true;
}

function initializeHazardUI() {
  const root = getHazardRoot();
  if (!root || hazardUICache.initialized) {
    return;
  }

  createHazardCard(root);
}

function formatHazardLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function formatHazardValue(value) {
  if (typeof value === 'number') {
    if (typeof formatNumber === 'function') {
      return formatNumber(value, false, 2);
    }
    return value.toFixed(2);
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([name, val]) => `${formatHazardLabel(name)}: ${formatHazardValue(val)}`)
      .join('; ');
  }
  return value !== undefined && value !== null ? String(value) : '—';
}

function updateHazardUI(parameters = {}) {
  initializeHazardUI();

  const list = hazardUICache.parameterList;
  const emptyMessage = hazardUICache.emptyMessage;
  if (!list || !emptyMessage) {
    return;
  }

  const keys = Object.keys(parameters);
  if (keys.length === 0) {
    list.classList.add('hidden');
    list.replaceChildren();
    emptyMessage.classList.remove('hidden');
    hazardUICache.parameterRows = {};
    hazardUICache.parameterNameSpans = {};
    hazardUICache.parameterValueSpans = {};
    return;
  }

  emptyMessage.classList.add('hidden');
  list.classList.remove('hidden');

  const fragment = document.createDocumentFragment();
  const activeKeys = {};

  keys.forEach((key) => {
    const label = formatHazardLabel(key);
    const value = formatHazardValue(parameters[key]);

    let row = hazardUICache.parameterRows[key];
    let nameSpan = hazardUICache.parameterNameSpans[key];
    let valueSpan = hazardUICache.parameterValueSpans[key];

    if (!row) {
      row = document.createElement('div');
      row.classList.add('hazard-parameter-row');

      nameSpan = document.createElement('span');
      nameSpan.classList.add('hazard-parameter-name');
      row.appendChild(nameSpan);

      valueSpan = document.createElement('span');
      valueSpan.classList.add('hazard-parameter-value');
      row.appendChild(valueSpan);

      hazardUICache.parameterRows[key] = row;
      hazardUICache.parameterNameSpans[key] = nameSpan;
      hazardUICache.parameterValueSpans[key] = valueSpan;
    }

    nameSpan.textContent = label;
    valueSpan.textContent = value;

    fragment.appendChild(row);
    activeKeys[key] = true;
  });

  list.replaceChildren(fragment);

  Object.keys(hazardUICache.parameterRows).forEach((key) => {
    if (!activeKeys[key]) {
      delete hazardUICache.parameterRows[key];
      delete hazardUICache.parameterNameSpans[key];
      delete hazardUICache.parameterValueSpans[key];
    }
  });
}

if (typeof window !== 'undefined') {
  window.initializeHazardUI = initializeHazardUI;
  window.updateHazardUI = updateHazardUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeHazardUI,
    updateHazardUI
  };
}
