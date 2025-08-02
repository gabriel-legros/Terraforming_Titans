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
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Space Storage</span>
    </div>
    <div class="card-body">
      <div class="stats-grid two-col">
        <div class="stat-item"><span class="stat-label">Used Storage:</span><span id="ss-used"></span></div>
        <div class="stat-item"><span class="stat-label">Max Storage:</span><span id="ss-max"></span></div>
      </div>
      <p id="ss-expansion-cost"><strong>Expansion Cost:</strong> <span class="expansion-cost"></span> <span class="info-tooltip-icon" title="Construction time is reduced for each terraformed planet">&#9432;</span></p>
      <table class="storage-usage-table">
        <thead><tr><th></th><th>Resource</th><th>Used</th></tr></thead>
        <tbody id="ss-usage-body"></tbody>
      </table>
    </div>`;
  const usageBody = card.querySelector('#ss-usage-body');
  const expansionCostDisplay = card.querySelector('#ss-expansion-cost .expansion-cost');

  storageResourceOptions.forEach(opt => {
    const row = document.createElement('tr');

    const checkboxCell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `${project.name}-res-${opt.resource}`;
    input.addEventListener('change', e => {
      project.toggleResourceSelection(opt.category, opt.resource, e.target.checked);
    });
    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = opt.label;
    checkboxCell.append(input);

    const nameCell = document.createElement('td');
    nameCell.appendChild(label);
    const amtCell = document.createElement('td');
    amtCell.id = `${project.name}-usage-${opt.resource}`;
    amtCell.textContent = '0';

    row.append(checkboxCell, nameCell, amtCell);
    usageBody.appendChild(row);

    projectElements[project.name] = {
      ...projectElements[project.name],
      resourceCheckboxes: {
        ...(projectElements[project.name]?.resourceCheckboxes || {}),
        [opt.resource]: input
      },
      usageCells: {
        ...(projectElements[project.name]?.usageCells || {}),
        [opt.resource]: amtCell
      }
    };
  });

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
  modeContainer.classList.add('mode-selection');
  const modeLabel = document.createElement('span');
  modeLabel.textContent = 'Mode:';
  const withdrawButton = document.createElement('button');
  withdrawButton.textContent = 'Withdraw';
  withdrawButton.classList.add('mode-button');
  const storeButton = document.createElement('button');
  storeButton.textContent = 'Store';
  storeButton.classList.add('mode-button');

  const updateModeButtons = () => {
    if (project.shipWithdrawMode) {
      withdrawButton.classList.add('selected');
      storeButton.classList.remove('selected');
    } else {
      storeButton.classList.add('selected');
      withdrawButton.classList.remove('selected');
    }
  };

  withdrawButton.addEventListener('click', () => {
    project.shipWithdrawMode = true;
    updateModeButtons();
  });
  storeButton.addEventListener('click', () => {
    project.shipWithdrawMode = false;
    updateModeButtons();
  });

  modeContainer.append(modeLabel, withdrawButton, storeButton);
  shipFooter.appendChild(modeContainer);

  updateModeButtons();

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

  const prioritizeContainer = document.createElement('div');
  prioritizeContainer.classList.add('checkbox-container');
  const prioritizeCheckbox = document.createElement('input');
  prioritizeCheckbox.type = 'checkbox';
  prioritizeCheckbox.id = `${project.name}-prioritize-space`;
  prioritizeCheckbox.addEventListener('change', e => {
    project.prioritizeMegaProjects = e.target.checked;
  });
  const prioritizeLabel = document.createElement('label');
  prioritizeLabel.htmlFor = prioritizeCheckbox.id;
  prioritizeLabel.textContent = 'Prioritize resources for mega projects';
  prioritizeContainer.append(prioritizeCheckbox, prioritizeLabel);
  shipAutomationContainer.appendChild(prioritizeContainer);

  shipFooter.appendChild(shipAutomationContainer);

  card.appendChild(shipFooter);
  container.appendChild(card);
  projectElements[project.name] = {
    ...projectElements[project.name],
    storageCard: card,
    usedDisplay: card.querySelector('#ss-used'),
    maxDisplay: card.querySelector('#ss-max'),
    usageBody,
    expansionCostDisplay,
    shipProgressButton,
    shipAutoStartCheckbox,
    prioritizeMegaCheckbox: prioritizeCheckbox,
    withdrawButton,
    storeButton,
    updateModeButtons
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
  if (els.expansionCostDisplay) {
    const cost = project.getScaledCost ? project.getScaledCost() : project.cost;
    const parts = [];
    for (const category in cost) {
      for (const resource in cost[category]) {
        const res = resources[category][resource];
        const name = res.displayName || resource.charAt(0).toUpperCase() + resource.slice(1);
        parts.push(`${name}: ${formatNumber(cost[category][resource], true)}`);
      }
    }
    els.expansionCostDisplay.textContent = parts.join(', ');
  }
  if (els.usageCells) {
    storageResourceOptions.forEach(opt => {
      const cell = els.usageCells[opt.resource];
      if (cell) {
        const amount = project.resourceUsage[opt.resource] || 0;
        cell.textContent = formatNumber(amount, false, 0);
      }
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
  if (els.prioritizeMegaCheckbox) {
    els.prioritizeMegaCheckbox.checked = project.prioritizeMegaProjects;
  }
  if (els.updateModeButtons) {
    els.updateModeButtons();
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
