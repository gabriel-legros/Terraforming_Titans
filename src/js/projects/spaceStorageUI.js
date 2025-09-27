if (typeof makeCollapsibleCard === 'undefined') {
  var makeCollapsibleCard = (typeof globalThis !== 'undefined' && globalThis.makeCollapsibleCard)
    ? globalThis.makeCollapsibleCard
    : null;
  try {
    if (!makeCollapsibleCard && typeof require === 'function') {
      ({ makeCollapsibleCard } = require('../ui-utils.js'));
    }
  } catch (e) {}
}

const storageResourceOptions = [
  { label: 'Metal', category: 'colony', resource: 'metal' },
  { label: 'Glass', category: 'colony', resource: 'glass' },
  { label: 'Components', category: 'colony', resource: 'components' },
  { label: 'Electronics', category: 'colony', resource: 'electronics' },
  { label: 'Superconductors', category: 'colony', resource: 'superconductors' },
  { label: 'Superalloys', category: 'colony', resource: 'superalloys', requiresFlag: 'superalloyResearchUnlocked' },
  { label: 'Oxygen', category: 'atmospheric', resource: 'oxygen' },
  { label: 'Carbon Dioxide', category: 'atmospheric', resource: 'carbonDioxide' },
  { label: 'Water', category: 'surface', resource: 'liquidWater' },
  { label: 'Nitrogen', category: 'atmospheric', resource: 'inertGas' }
];

if (typeof SpaceStorageProject !== 'undefined') {
  SpaceStorageProject.prototype.createShipAutoStartCheckbox = function () {
    const els = projectElements[this.name] || {};
    if (els.autoStartLabel) {
      els.autoStartLabel.textContent = 'Auto Start Expansion';
    }
    const container = document.createElement('div');
    container.classList.add('checkbox-container');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.name}-ship-auto-start`;
    checkbox.addEventListener('change', (e) => {
      this.shipOperationAutoStart = e.target.checked;
    });
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = 'Auto Start Ships';
    container.append(checkbox, label);
    projectElements[this.name] = {
      ...projectElements[this.name],
      shipAutoStartCheckbox: checkbox,
      shipAutoStartLabel: label,
      shipAutoStartContainer: container,
    };
    return container;
  };

  SpaceStorageProject.prototype.createPrioritizeMegaCheckbox = function () {
    const container = document.createElement('div');
    container.classList.add('checkbox-container');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.name}-prioritize-space`;
    checkbox.addEventListener('change', (e) => {
      this.prioritizeMegaProjects = e.target.checked;
    });
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = 'Prioritize space resources for mega projects';
    container.append(checkbox, label);
    projectElements[this.name] = {
      ...projectElements[this.name],
      prioritizeMegaCheckbox: checkbox,
      prioritizeMegaContainer: container,
    };
    return container;
  };

  SpaceStorageProject.prototype.createStrategicReserveInput = function () {
    const container = document.createElement('div');
    container.classList.add('checkbox-container');
    const label = document.createElement('label');
    label.htmlFor = `${this.name}-strategic-reserve`;
    label.textContent = 'Strategic reserve ';
    const info = document.createElement('span');
    info.classList.add('info-tooltip-icon');
    info.innerHTML = '&#9432;';
    info.title =
      'Minimum space storage kept in reserve for mega projects; transfers ignore this reserve. Accepts scientific notation (e.g., 1e3 for 1000).';
    label.appendChild(info);
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `${this.name}-strategic-reserve`;
    input.value = this.strategicReserve;
    input.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      this.strategicReserve = isNaN(val) ? 0 : Math.max(0, val);
      e.target.value = isNaN(val) ? '' : this.strategicReserve.toString();
    });
    container.append(label, input);
    projectElements[this.name] = {
      ...projectElements[this.name],
      strategicReserveInput: input,
      strategicReserveContainer: container,
    };
    return container;
  };

  SpaceStorageProject.prototype.renderAutomationUI = function (container) {
    const els = projectElements[this.name] || {};
    if (
      els.shipAutoStartContainer &&
      els.shipAutoStartContainer.parentElement !== container
    ) {
      delete els.shipAutoStartCheckbox;
      delete els.shipAutoStartLabel;
      delete els.shipAutoStartContainer;
      delete els.prioritizeMegaCheckbox;
      delete els.prioritizeMegaContainer;
      delete els.strategicReserveInput;
      delete els.strategicReserveContainer;
    }
    if (!els.shipAutoStartContainer) {
      const ship = this.createShipAutoStartCheckbox();
      const prioritize = this.createPrioritizeMegaCheckbox();
      const reserve = this.createStrategicReserveInput();
      container.append(ship, prioritize, reserve);
    }
    invalidateAutomationSettingsCache(this.name);
  };
}

function renderSpaceStorageUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('space-storage-card');
  card.classList.add('info-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">Space Storage</span>
    </div>
    <div class="card-body">
      <div class="stats-grid two-col">
        <div class="stat-item"><span class="stat-label">Used Storage:</span><span id="ss-used"></span></div>
        <div class="stat-item"><span class="stat-label">Max Storage:</span><span id="ss-max"></span></div>
      </div>
      <div id="ss-resource-grid"></div>
    </div>`;
  if (typeof makeCollapsibleCard === 'function') makeCollapsibleCard(card);
  const cardBody = card.querySelector('.card-body');

  const topSection = document.createElement('div');
  topSection.classList.add('project-top-section');

  if (typeof project.createSpaceshipAssignmentUI === 'function') {
    project.createSpaceshipAssignmentUI(topSection);
  }
  if (typeof project.createProjectDetailsGridUI === 'function') {
    project.createProjectDetailsGridUI(topSection);
  }

  const expansionSection = document.createElement('div');
  expansionSection.classList.add('project-section-container');
  const expansionTitle = document.createElement('h4');
  expansionTitle.classList.add('section-title');
  expansionTitle.textContent = 'Expansion';
  expansionSection.appendChild(expansionTitle);

  const expansionGrid = document.createElement('div');
  expansionGrid.classList.add('project-details-grid');
  const expansionCostRow = document.createElement('div');
  expansionCostRow.id = 'ss-expansion-cost';
  expansionCostRow.innerHTML = `<strong>Cost:</strong> <span class="expansion-cost"></span> <span class="info-tooltip-icon" title="Construction time is reduced for each terraformed planet">&#9432;</span>`;
  expansionGrid.appendChild(expansionCostRow);
  expansionSection.appendChild(expansionGrid);
  topSection.appendChild(expansionSection);

  cardBody.appendChild(topSection);

  const expansionCostDisplay = expansionCostRow.querySelector('.expansion-cost');
  const resourceGrid = card.querySelector('#ss-resource-grid');

  storageResourceOptions.forEach(opt => {
    const resourceItem = document.createElement('div');
    resourceItem.classList.add('storage-resource-item');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${project.name}-res-${opt.resource}`;
    checkbox.addEventListener('change', e => {
      project.toggleResourceSelection(opt.category, opt.resource, e.target.checked);
    });

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;

    const textSpan = document.createElement('span');
    textSpan.textContent = opt.label;

    const fullIcon = document.createElement('span');
    fullIcon.classList.add('storage-full-icon');
    fullIcon.innerHTML = '&#9888;&#xFE0E;';
    fullIcon.title = 'Colony storage full';
    fullIcon.style.display = 'none';
    fullIcon.style.fontSize = '14px';

    const usage = document.createElement('span');
    usage.id = `${project.name}-usage-${opt.resource}`;
    usage.textContent = '0';

    let waterSelect;
    if (opt.resource === 'liquidWater') {
      waterSelect = document.createElement('select');
      waterSelect.id = `${project.name}-water-destination`;
      waterSelect.style.fontSize = '12px';
      const colonyOpt = document.createElement('option');
      colonyOpt.value = 'colony';
      colonyOpt.textContent = 'Colony';
      const surfaceOpt = document.createElement('option');
      surfaceOpt.value = 'surface';
      surfaceOpt.textContent = 'Surface';
      waterSelect.append(colonyOpt, surfaceOpt);
      waterSelect.addEventListener('change', e => {
        project.waterWithdrawTarget = e.target.value;
        if (typeof updateSpaceStorageUI === 'function') {
          updateSpaceStorageUI(project);
        }
      });
      textSpan.append(' ', waterSelect);
    }

    label.append(textSpan, fullIcon);
    resourceItem.append(checkbox, label, usage);
    resourceGrid.appendChild(resourceItem);

    if (opt.requiresFlag) {
      const hasFlag = typeof researchManager === 'undefined'
        || (typeof researchManager.isBooleanFlagSet === 'function'
          && researchManager.isBooleanFlagSet(opt.requiresFlag));
      resourceItem.style.display = hasFlag ? '' : 'none';
    }

    projectElements[project.name] = {
      ...projectElements[project.name],
      resourceCheckboxes: {
        ...(projectElements[project.name]?.resourceCheckboxes || {}),
        [opt.resource]: checkbox
      },
      usageCells: {
        ...(projectElements[project.name]?.usageCells || {}),
        [opt.resource]: usage
      },
      fullIcons: {
        ...(projectElements[project.name]?.fullIcons || {}),
        [opt.resource]: fullIcon
      },
      resourceItems: {
        ...(projectElements[project.name]?.resourceItems || {}),
        [opt.resource]: resourceItem
      },
      ...(opt.resource === 'liquidWater' ? { waterDestinationSelect: waterSelect } : {})
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
    if (project.isShipOperationContinuous()) return;
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
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(project);
    }
  });
  storeButton.addEventListener('click', () => {
    project.shipWithdrawMode = false;
    updateModeButtons();
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(project);
    }
  });

  modeContainer.append(modeLabel, withdrawButton, storeButton);
  shipFooter.appendChild(modeContainer);

  updateModeButtons();

  cardBody.appendChild(shipFooter);
  container.appendChild(card);
  projectElements[project.name] = {
    ...projectElements[project.name],
    storageCard: card,
    usedDisplay: card.querySelector('#ss-used'),
    maxDisplay: card.querySelector('#ss-max'),
    resourceGrid,
    expansionCostDisplay,
    shipProgressButton,
    withdrawButton,
    storeButton,
    updateModeButtons
  };
}

function updateSpaceStorageUI(project) {
  const els = projectElements[project.name];
  if (!els) return;
  if (els.autoStartLabel) {
    els.autoStartLabel.textContent = 'Auto Start Expansion';
  }
  if (els.shipAutoStartContainer && els.prioritizeMegaContainer) {
    const display = projectManager && typeof projectManager.isBooleanFlagSet === 'function' &&
      projectManager.isBooleanFlagSet('automateSpecialProjects') ? 'block' : 'none';
    els.shipAutoStartContainer.style.display = display;
    els.prioritizeMegaContainer.style.display = display;
  }
  if (els.shipAutoStartLabel) {
    els.shipAutoStartLabel.textContent = project.isShipOperationContinuous()
      ? 'Run'
      : 'Auto Start Ships';
  }
  if (els.usedDisplay) {
    els.usedDisplay.textContent = formatNumber(project.usedStorage, false, 2);
  }
  if (els.maxDisplay) {
    els.maxDisplay.textContent = formatNumber(project.maxStorage, false, 2);
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
        cell.textContent = formatNumber(amount, false, 2);
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
  if (els.resourceItems) {
    storageResourceOptions.forEach(opt => {
      const item = els.resourceItems[opt.resource];
      if (item && opt.requiresFlag) {
        const hasFlag = typeof researchManager === 'undefined'
          || (typeof researchManager.isBooleanFlagSet === 'function'
            && researchManager.isBooleanFlagSet(opt.requiresFlag));
        item.style.display = hasFlag ? '' : 'none';
        if (!hasFlag) {
          project.toggleResourceSelection(opt.category, opt.resource, false);
        }
      }
    });
  }
  if (els.waterDestinationSelect) {
    els.waterDestinationSelect.value = project.waterWithdrawTarget || 'colony';
    els.waterDestinationSelect.style.display = project.shipWithdrawMode ? '' : 'none';
  }
  if (els.fullIcons) {
    storageResourceOptions.forEach(opt => {
      const icon = els.fullIcons[opt.resource];
      let res = resources[opt.category]?.[opt.resource];
      if (icon) {
        if (opt.resource === 'liquidWater' && project.shipWithdrawMode) {
          res = project.waterWithdrawTarget === 'surface'
            ? resources.surface.liquidWater
            : resources.colony.water;
          icon.title = project.waterWithdrawTarget === 'surface'
            ? 'Surface storage full'
            : 'Colony storage full';
        }
        if (project.shipWithdrawMode && res && res.hasCap && res.value >= res.cap) {
          icon.style.display = 'inline';
        } else {
          icon.style.display = 'none';
        }
      }
    });
  }
  if (els.shipAutoStartCheckbox) {
    els.shipAutoStartCheckbox.checked = project.shipOperationAutoStart;
  }
  if (els.prioritizeMegaCheckbox) {
    els.prioritizeMegaCheckbox.checked = project.prioritizeMegaProjects;
  }
  if (els.strategicReserveInput) {
    const activeElement = globalThis.document?.activeElement;
    if (els.strategicReserveInput !== activeElement) {
      const reserveValue = project.strategicReserve ?? 0;
      els.strategicReserveInput.value = reserveValue === 0 ? '0' : reserveValue.toString();
    }
  }
  if (els.updateModeButtons) {
    els.updateModeButtons();
  }
  if (els.shipProgressButton) {
    if (project.isShipOperationContinuous()) {
      if (project.shipOperationAutoStart) {
        els.shipProgressButton.textContent = 'Continuous';
        els.shipProgressButton.style.background = '#4caf50';
      } else {
        els.shipProgressButton.textContent = 'Stopped';
        els.shipProgressButton.style.background = '#f44336';
      }
    } else {
      const duration = project.getShipOperationDuration();
      const timeRemaining = Math.ceil(project.shipOperationRemainingTime / 1000);
      if (project.shipOperationIsActive) {
        const progressPercent = ((project.shipOperationStartingDuration - project.shipOperationRemainingTime) / project.shipOperationStartingDuration) * 100;
        els.shipProgressButton.textContent = `In Progress: ${timeRemaining} seconds remaining (${progressPercent.toFixed(2)}%)`;
        els.shipProgressButton.style.background = `linear-gradient(to right, #4caf50 ${progressPercent}%, #ccc ${progressPercent}%)`;
      } else if (project.shipOperationIsPaused) {
        els.shipProgressButton.textContent = `Resume ship transfers (${timeRemaining}s left)`;
        els.shipProgressButton.style.background = project.canStartShipOperation() ? '#4caf50' : '#f44336';
      } else if (project.canStartShipOperation && project.canStartShipOperation()) {
        els.shipProgressButton.textContent = `Start ship transfers (Duration: ${(duration / 1000).toFixed(2)} seconds)`;
        els.shipProgressButton.style.background = '#4caf50';
      } else {
        els.shipProgressButton.textContent = `Start ship transfers (Duration: ${(duration / 1000).toFixed(2)} seconds)`;
        els.shipProgressButton.style.background = '#f44336';
      }
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
