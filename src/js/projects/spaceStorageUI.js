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
      </div>
      <table class="storage-usage-table">
        <thead><tr><th>Resource</th><th>Used</th></tr></thead>
        <tbody id="ss-usage-body"></tbody>
      </table>
      <p class="duration-note"><span class="info-tooltip-icon" title="Construction time is reduced for each terraformed planet">&#9432;</span> Duration reduced per terraformed planet.</p>
    </div>`;

  const body = card.querySelector('.card-body');
  body.appendChild(checkboxContainer);

  const shipFooter = document.createElement('div');
  shipFooter.classList.add('card-footer');

  const shipProgressButtonContainer = document.createElement('div');
  shipProgressButtonContainer.classList.add('progress-button-container');
  const shipProgressButton = document.createElement('button');
  shipProgressButton.classList.add('progress-button');
  shipProgressButton.style.width = '100%';
  shipProgressButton.addEventListener('click', () => {
    if (project.shipOperationIsPaused) {
      project.resumeShipOperation();
    } else if (!project.shipOperationIsActive) {
      project.startShipOperation();
    }
  });
  shipProgressButtonContainer.appendChild(shipProgressButton);
  shipFooter.appendChild(shipProgressButtonContainer);

  const modeContainer = document.createElement('div');
  modeContainer.classList.add('checkbox-container');
  const modeToggle = document.createElement('input');
  modeToggle.type = 'checkbox';
  modeToggle.id = `${project.name}-withdraw-mode`;
  modeToggle.addEventListener('change', e => {
    project.shipWithdrawMode = e.target.checked;
  });
  const modeLabel = document.createElement('label');
  modeLabel.htmlFor = modeToggle.id;
  modeLabel.textContent = 'Withdraw';
  modeContainer.append(modeToggle, modeLabel);
  shipFooter.appendChild(modeContainer);

  const shipAutomationContainer = document.createElement('div');
  shipAutomationContainer.classList.add('automation-settings-container');
  const shipAutoStartContainer = document.createElement('div');
  shipAutoStartContainer.classList.add('checkbox-container');
  const shipAutoStartCheckbox = document.createElement('input');
  shipAutoStartCheckbox.type = 'checkbox';
  shipAutoStartCheckbox.id = `${project.name}-ship-auto-start`;
  shipAutoStartCheckbox.addEventListener('change', e => {
    project.shipOperationAutoStart = e.target.checked;
  });
  const shipAutoStartLabel = document.createElement('label');
  shipAutoStartLabel.htmlFor = shipAutoStartCheckbox.id;
  shipAutoStartLabel.textContent = 'Auto start ships';
  shipAutoStartContainer.append(shipAutoStartCheckbox, shipAutoStartLabel);
  shipAutomationContainer.appendChild(shipAutoStartContainer);
  shipFooter.appendChild(shipAutomationContainer);

  card.appendChild(shipFooter);
  container.appendChild(card);
  projectElements[project.name] = {
    ...projectElements[project.name],
    storageCard: card,
    usedDisplay: card.querySelector('#ss-used'),
    maxDisplay: card.querySelector('#ss-max'),
    usageBody: card.querySelector('#ss-usage-body'),
    shipProgressButton,
    shipAutoStartCheckbox,
    withdrawToggle: modeToggle
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
  if (els.usageBody) {
    els.usageBody.innerHTML = '';
    storageResourceOptions.forEach(opt => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      nameCell.textContent = opt.label;
      const amtCell = document.createElement('td');
      const amount = project.resourceUsage[opt.resource] || 0;
      amtCell.textContent = formatNumber(amount, false, 0);
      row.append(nameCell, amtCell);
      els.usageBody.appendChild(row);
    });
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
  if (els.shipAutoStartCheckbox) {
    els.shipAutoStartCheckbox.checked = project.shipOperationAutoStart;
  }
  if (els.withdrawToggle) {
    els.withdrawToggle.checked = project.shipWithdrawMode;
  }
  if (els.shipProgressButton) {
    const duration = project.getEffectiveDuration();
    const timeRemaining = Math.ceil(project.shipOperationRemainingTime / 1000);
    if (project.shipOperationIsActive) {
      const progressPercent = ((project.shipOperationStartingDuration - project.shipOperationRemainingTime) / project.shipOperationStartingDuration) * 100;
      els.shipProgressButton.textContent = `In Progress: ${timeRemaining} seconds remaining (${progressPercent.toFixed(2)}%)`;
      els.shipProgressButton.style.background = `linear-gradient(to right, #4caf50 ${progressPercent}%, #ccc ${progressPercent}%)`;
    } else if (project.shipOperationIsPaused) {
      els.shipProgressButton.textContent = `Resume Ships (${timeRemaining}s left)`;
      els.shipProgressButton.style.background = project.canStartShipOperation() ? '#4caf50' : '#f44336';
    } else if (project.canStartShipOperation && project.canStartShipOperation()) {
      els.shipProgressButton.textContent = `Start Ships (Duration: ${(duration / 1000).toFixed(2)} seconds)`;
      els.shipProgressButton.style.background = '#4caf50';
    } else {
      els.shipProgressButton.textContent = `Start Ships (Duration: ${(duration / 1000).toFixed(2)} seconds)`;
      els.shipProgressButton.style.background = '#f44336';
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.renderSpaceStorageUI = renderSpaceStorageUI;
  globalThis.updateSpaceStorageUI = updateSpaceStorageUI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderSpaceStorageUI, updateSpaceStorageUI };
}
