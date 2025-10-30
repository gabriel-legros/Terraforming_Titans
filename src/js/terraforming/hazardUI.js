const hazardUICache = {
  root: null,
  card: null,
  emptyMessage: null,
  parameterList: null,
  parameterRows: {},
  parameterNameSpans: {},
  parameterValueSpans: {},
  sectionContainers: {},
  sectionHeaders: {},
  sectionLists: {},
  sectionRows: {},
  sectionNameSpans: {},
  sectionValueSpans: {},
  lastRenderedRows: {},
  lastRenderedSections: {},
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
    const hasMin = Object.prototype.hasOwnProperty.call(value, 'min');
    const hasMax = Object.prototype.hasOwnProperty.call(value, 'max');
    const hasUnit = Object.prototype.hasOwnProperty.call(value, 'unit');

    if (hasMin || hasMax) {
      const minText = hasMin ? formatHazardValue(value.min) : '—';
      const maxText = hasMax ? formatHazardValue(value.max) : '—';
      const unitText = hasUnit ? ` ${value.unit}` : '';
      const extraEntries = Object.entries(value)
        .filter(([key]) => key !== 'min' && key !== 'max' && key !== 'unit');

      if (extraEntries.length === 0) {
        return `${minText} – ${maxText}${unitText}`;
      }

      const extraText = extraEntries
        .map(([name, val]) => `${formatHazardLabel(name)}: ${formatHazardValue(val)}`)
        .join('; ');

      return `${minText} – ${maxText}${unitText}${extraText ? ` (${extraText})` : ''}`;
    }

    return Object.entries(value)
      .map(([name, val]) => `${formatHazardLabel(name)}: ${formatHazardValue(val)}`)
      .join('; ');
  }
  return value !== undefined && value !== null ? String(value) : '—';
}

function ensureHazardSection(key) {
  let container = hazardUICache.sectionContainers[key];
  if (!container) {
    container = document.createElement('div');
    container.classList.add('hazard-section');

    const header = document.createElement('h4');
    header.classList.add('hazard-section-title');
    container.appendChild(header);

    const rowsContainer = document.createElement('div');
    rowsContainer.classList.add('hazard-section-rows');
    container.appendChild(rowsContainer);

    hazardUICache.sectionContainers[key] = container;
    hazardUICache.sectionHeaders[key] = header;
    hazardUICache.sectionLists[key] = rowsContainer;
    hazardUICache.sectionRows[key] = {};
    hazardUICache.sectionNameSpans[key] = {};
    hazardUICache.sectionValueSpans[key] = {};
  }

  return container;
}

function updateHazardSectionRows(sectionKey, sectionData) {
  const list = hazardUICache.sectionLists[sectionKey];
  if (!list) {
    return;
  }

  const rowCache = hazardUICache.sectionRows[sectionKey];
  const nameCache = hazardUICache.sectionNameSpans[sectionKey];
  const valueCache = hazardUICache.sectionValueSpans[sectionKey];

  const entries = (sectionData && typeof sectionData === 'object' && !Array.isArray(sectionData))
    ? Object.entries(sectionData)
    : [['value', sectionData]];

  const fragment = document.createDocumentFragment();
  const activeKeys = {};

  entries.forEach(([key, value]) => {
    const label = formatHazardLabel(key);
    const formatted = formatHazardValue(value);

    let row = rowCache[key];
    let nameSpan = nameCache[key];
    let valueSpan = valueCache[key];

    if (!row) {
      row = document.createElement('div');
      row.classList.add('hazard-parameter-row');

      nameSpan = document.createElement('span');
      nameSpan.classList.add('hazard-parameter-name');
      row.appendChild(nameSpan);

      valueSpan = document.createElement('span');
      valueSpan.classList.add('hazard-parameter-value');
      row.appendChild(valueSpan);

      rowCache[key] = row;
      nameCache[key] = nameSpan;
      valueCache[key] = valueSpan;
    }

    if (nameSpan.textContent !== label) {
      nameSpan.textContent = label;
    }

    if (valueSpan.textContent !== formatted) {
      valueSpan.textContent = formatted;
    }

    fragment.appendChild(row);
    activeKeys[key] = true;
  });

  list.replaceChildren(fragment);

  Object.keys(rowCache).forEach((key) => {
    if (!activeKeys[key]) {
      delete rowCache[key];
      delete nameCache[key];
      delete valueCache[key];
    }
  });
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
    hazardUICache.sectionContainers = {};
    hazardUICache.sectionHeaders = {};
    hazardUICache.sectionLists = {};
    hazardUICache.sectionRows = {};
    hazardUICache.sectionNameSpans = {};
    hazardUICache.sectionValueSpans = {};
    hazardUICache.lastRenderedRows = {};
    hazardUICache.lastRenderedSections = {};
    return;
  }

  emptyMessage.classList.add('hidden');
  list.classList.remove('hidden');

  const fragment = document.createDocumentFragment();
  const activeRows = {};
  const activeSections = {};

  keys.forEach((key) => {
    const value = parameters[key];
    const isSection = value && typeof value === 'object' && !Array.isArray(value);

    if (isSection) {
      const sectionContainer = ensureHazardSection(key);
      const header = hazardUICache.sectionHeaders[key];
      if (header) {
        const label = formatHazardLabel(key);
        if (header.textContent !== label) {
          header.textContent = label;
        }
      }

      const serialized = JSON.stringify(value);
      if (hazardUICache.lastRenderedSections[key] !== serialized) {
        updateHazardSectionRows(key, value);
        hazardUICache.lastRenderedSections[key] = serialized;
      }

      fragment.appendChild(sectionContainer);
      activeSections[key] = true;
      return;
    }

    const label = formatHazardLabel(key);
    const formatted = formatHazardValue(value);

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

    if (nameSpan.textContent !== label) {
      nameSpan.textContent = label;
    }

    if (hazardUICache.lastRenderedRows[key] !== formatted) {
      valueSpan.textContent = formatted;
      hazardUICache.lastRenderedRows[key] = formatted;
    }

    fragment.appendChild(row);
    activeRows[key] = true;
  });

  list.replaceChildren(fragment);

  Object.keys(hazardUICache.parameterRows).forEach((key) => {
    if (!activeRows[key]) {
      delete hazardUICache.parameterRows[key];
      delete hazardUICache.parameterNameSpans[key];
      delete hazardUICache.parameterValueSpans[key];
      delete hazardUICache.lastRenderedRows[key];
    }
  });

  Object.keys(hazardUICache.sectionContainers).forEach((key) => {
    if (!activeSections[key]) {
      delete hazardUICache.sectionContainers[key];
      delete hazardUICache.sectionHeaders[key];
      delete hazardUICache.sectionLists[key];
      delete hazardUICache.sectionRows[key];
      delete hazardUICache.sectionNameSpans[key];
      delete hazardUICache.sectionValueSpans[key];
      delete hazardUICache.lastRenderedSections[key];
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
