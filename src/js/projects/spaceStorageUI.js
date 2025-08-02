const storageResourceOptions = [
  { label: 'Metal', category: 'colony', resource: 'metal' },
  { label: 'Components', category: 'colony', resource: 'components' },
  { label: 'Electronics', category: 'colony', resource: 'electronics' },
  { label: 'Superconductors', category: 'colony', resource: 'superconductors' },
  { label: 'Oxygen', category: 'atmospheric', resource: 'oxygen' },
  { label: 'Carbon Dioxide', category: 'atmospheric', resource: 'carbonDioxide' },
  { label: 'Water', category: 'surface', resource: 'liquidWater' },
  { label: 'Nitrogen', category: 'atmospheric', resource: 'inertGas' }
];

function renderSpaceStorageUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('space-storage-card');
  const checkboxContainer = document.createElement('div');
  checkboxContainer.classList.add('space-storage-resources');

  storageResourceOptions.forEach(opt => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('checkbox-container');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `${project.name}-res-${opt.resource}`;
    input.addEventListener('change', e => {
      project.toggleResourceSelection(opt.category, opt.resource, e.target.checked);
    });
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = opt.label;
    wrapper.append(input, label);
    checkboxContainer.appendChild(wrapper);

    projectElements[project.name] = {
      ...projectElements[project.name],
      resourceCheckboxes: {
        ...(projectElements[project.name]?.resourceCheckboxes || {}),
        [opt.resource]: input
      }
    };
  });

  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Space Storage</span>
    </div>
    <div class="card-body">
      <div class="stats-grid">
        <div class="stat-item"><span class="stat-label">Used Storage:</span><span id="ss-used"></span></div>
        <div class="stat-item"><span class="stat-label">Max Storage:</span><span id="ss-max"></span></div>
        <div class="stat-item"><span class="stat-label">Base Storage:</span><span id="ss-base"></span></div>
      </div>
      <p class="duration-note"><span class="info-tooltip-icon" title="Construction time is reduced for each terraformed planet">&#9432;</span> Duration reduced per terraformed planet.</p>
    </div>`;
  card.querySelector('.card-body').appendChild(checkboxContainer);
  container.appendChild(card);
  projectElements[project.name] = {
    ...projectElements[project.name],
    storageCard: card,
    usedDisplay: card.querySelector('#ss-used'),
    maxDisplay: card.querySelector('#ss-max'),
    baseDisplay: card.querySelector('#ss-base')
  };
}

function updateSpaceStorageUI(project) {
  const els = projectElements[project.name];
  if (!els) return;
  if (els.usedDisplay) {
    els.usedDisplay.textContent = formatNumber(project.usedStorage, false, 0);
  }
  if (els.maxDisplay) {
    els.maxDisplay.textContent = formatNumber(project.maxStorage, false, 0);
  }
  if (els.baseDisplay) {
    els.baseDisplay.textContent = formatNumber(project.capacityPerCompletion, false, 0);
  }
  if (els.resourceCheckboxes) {
    storageResourceOptions.forEach(opt => {
      const cb = els.resourceCheckboxes[opt.resource];
      if (cb) {
        const checked = project.selectedResources.some(
          r => r.category === opt.category && r.resource === opt.resource
        );
        cb.checked = checked;
      }
    });
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderSpaceStorageUI = renderSpaceStorageUI;
  globalThis.updateSpaceStorageUI = updateSpaceStorageUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderSpaceStorageUI, updateSpaceStorageUI };
}
