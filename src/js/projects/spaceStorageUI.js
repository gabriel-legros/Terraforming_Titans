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
  { label: 'Silica', category: 'colony', resource: 'silicon' },
  { label: 'Glass', category: 'colony', resource: 'glass' },
  { label: 'Components', category: 'colony', resource: 'components' },
  { label: 'Electronics', category: 'colony', resource: 'electronics' },
  { label: 'Superconductors', category: 'colony', resource: 'superconductors' },
  { label: 'Superalloys', category: 'colony', resource: 'superalloys', requiresFlag: 'superalloyResearchUnlocked' },
  { label: 'Oxygen', category: 'atmospheric', resource: 'oxygen' },
  { label: 'Hydrogen', category: 'atmospheric', resource: 'hydrogen' },
  { label: 'Methane', category: 'atmospheric', resource: 'atmosphericMethane', requiresProjectFlag: 'methaneAmmoniaStorage' },
  { label: 'Ammonia', category: 'atmospheric', resource: 'atmosphericAmmonia', requiresProjectFlag: 'methaneAmmoniaStorage' },
  { label: 'Carbon Dioxide', category: 'atmospheric', resource: 'carbonDioxide' },
  { label: 'Water', category: 'surface', resource: 'liquidWater' },
  { label: 'Nitrogen', category: 'atmospheric', resource: 'inertGas' },
  { label: 'Biomass', category: 'surface', resource: 'biomass', requiresProjectFlag: 'biostorage' }
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

  SpaceStorageProject.prototype.createMegaProjectModeSelect = function () {
    const container = document.createElement('div');
    container.classList.add('checkbox-container');
    const label = document.createElement('label');
    label.htmlFor = `${this.name}-mega-project-mode`;
    label.textContent = 'Mega/giga project resources';
    const select = document.createElement('select');
    select.id = `${this.name}-mega-project-mode`;
    select.classList.add('space-storage-priority-select');
    MEGA_PROJECT_RESOURCE_MODE_OPTIONS.forEach((option) => {
      const entry = document.createElement('option');
      entry.value = option.value;
      entry.textContent = option.label;
      select.appendChild(entry);
    });
    const initialMode = MEGA_PROJECT_RESOURCE_MODE_MAP[this.megaProjectResourceMode]
      ? this.megaProjectResourceMode
      : MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
    select.value = initialMode;
    select.addEventListener('change', (e) => {
      this.megaProjectResourceMode = e.target.value;
    });
    container.append(label, select);
    projectElements[this.name] = {
      ...projectElements[this.name],
      megaProjectModeSelect: select,
      megaProjectModeContainer: container,
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
      'Minimum space storage kept in reserve; transfers ignore this reserve. Accepts scientific notation (e.g., 1e3 for 1000).';
    label.appendChild(info);
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `${this.name}-strategic-reserve`;
    wireStringNumberInput(input, {
      datasetKey: 'strategicReserve',
      parseValue: (value) => Math.max(0, parseFlexibleNumber(value) || 0),
      formatValue: (parsed) => (parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed)),
      onValue: (parsed) => {
        this.strategicReserve = parsed;
      },
    });
    const reserveValue = this.strategicReserve || 0;
    input.dataset.strategicReserve = String(reserveValue);
    input.value = reserveValue >= 1e6 ? formatNumber(reserveValue, true, 3) : String(reserveValue);
    container.append(label, input);
    projectElements[this.name] = {
      ...projectElements[this.name],
      strategicReserveInput: input,
      strategicReserveContainer: container,
    };
    return container;
  };

  SpaceStorageProject.prototype.attachShipAutoStartToAssignment = function (runContainer) {
    if (!runContainer) return false;
    const projectEls = projectElements[this.name];
    if (!projectEls) return false;
    const { autoAssignCheckboxContainer } = projectEls;
    if (autoAssignCheckboxContainer) {
      autoAssignCheckboxContainer.appendChild(runContainer);
      return true;
    }
    return false;
  };

  SpaceStorageProject.prototype.renderAutomationUI = function (container) {
    const els = projectElements[this.name] || {};
    if (!els.shipAutoStartContainer || !els.shipAutoStartContainer.isConnected) {
      delete els.shipAutoStartCheckbox;
      delete els.shipAutoStartLabel;
      delete els.shipAutoStartContainer;
      delete els.megaProjectModeSelect;
      delete els.megaProjectModeContainer;
      delete els.prioritizeRowContainer;
      delete els.strategicReserveInput;
      delete els.strategicReserveContainer;
    }

    if (!els.shipAutoStartContainer) {
      const ship = this.createShipAutoStartCheckbox();
      const prioritizeRow = document.createElement('div');
      prioritizeRow.classList.add('checkbox-row-container');
      const prioritize = this.createMegaProjectModeSelect();
      prioritizeRow.append(prioritize);
      const reserve = this.createStrategicReserveInput();
      projectElements[this.name] = {
        ...projectElements[this.name],
        prioritizeRowContainer: prioritizeRow,
      };
      if (!this.attachShipAutoStartToAssignment(ship)) {
        container.appendChild(ship);
      }
      container.append(prioritizeRow, reserve);
    } else {
      const placed = this.attachShipAutoStartToAssignment(els.shipAutoStartContainer);
      if (!placed && els.shipAutoStartContainer.parentElement !== container) {
        container.appendChild(els.shipAutoStartContainer);
      }
      if (els.prioritizeRowContainer && els.prioritizeRowContainer.parentElement !== container) {
        container.appendChild(els.prioritizeRowContainer);
      }
      if (els.strategicReserveContainer && els.strategicReserveContainer.parentElement !== container) {
        container.appendChild(els.strategicReserveContainer);
      }
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

  const expansionRateRow = document.createElement('div');
  expansionRateRow.id = 'ss-expansion-rate';
  expansionRateRow.innerHTML = '<strong>Expansion/s:</strong> <span class="expansion-rate"></span>';
  expansionGrid.appendChild(expansionRateRow);
  expansionSection.appendChild(expansionGrid);
  topSection.appendChild(expansionSection);

  cardBody.appendChild(topSection);

  const expansionCostDisplay = expansionCostRow.querySelector('.expansion-cost');
  const expansionRateDisplay = expansionRateRow.querySelector('.expansion-rate');
  const resourceGrid = card.querySelector('#ss-resource-grid');

  const getVisibleResourceKeys = () => storageResourceOptions
    .filter(opt => project.isResourceUnlocked(opt.resource, opt.requiresFlag, opt.requiresProjectFlag))
    .map(opt => opt.resource);

  const cachedCaps = projectElements[project.name] || {};
  let capOverlay = cachedCaps.capOverlay;
  let capWindow = cachedCaps.capWindow;
  let capResourceValue = cachedCaps.capResourceValue;
  let capModeSelect = cachedCaps.capModeSelect;
  let capValueInput = cachedCaps.capValueInput;
  let capValueLabel = cachedCaps.capValueLabel;
  let capClose = cachedCaps.capClose;
  let capClampButton = cachedCaps.capClampButton;

  let newOverlay = false;
  if (!capOverlay || !capOverlay.isConnected) {
    newOverlay = true;
    capOverlay = document.createElement('div');
    capOverlay.classList.add('space-storage-settings-overlay');
    capWindow = document.createElement('div');
    capWindow.classList.add('space-storage-settings-window');

    const capHeader = document.createElement('div');
    capHeader.classList.add('space-storage-settings-header');
    const capTitle = document.createElement('div');
    capTitle.classList.add('space-storage-settings-title');
    capTitle.textContent = 'Space Storage Cap';
    capClose = document.createElement('button');
    capClose.type = 'button';
    capClose.classList.add('space-storage-settings-close');
    capClose.textContent = 'X';
    capClose.title = 'Close';
    capHeader.append(capTitle, capClose);

    const capResourceRow = document.createElement('div');
    capResourceRow.classList.add('space-storage-settings-row');
    const capResourceLabel = document.createElement('span');
    capResourceLabel.classList.add('space-storage-settings-label');
    capResourceLabel.textContent = 'Resource:';
    capResourceValue = document.createElement('span');
    capResourceValue.classList.add('space-storage-settings-value');
    capResourceRow.append(capResourceLabel, capResourceValue);

    const capModeRow = document.createElement('div');
    capModeRow.classList.add('space-storage-settings-row');
    const capModeLabel = document.createElement('label');
    capModeLabel.classList.add('space-storage-settings-label');
    capModeLabel.textContent = 'Cap type:';
    capModeSelect = document.createElement('select');
    capModeSelect.classList.add('space-storage-settings-select');
    const capModeNone = document.createElement('option');
    capModeNone.value = 'none';
    capModeNone.textContent = 'No cap';
    const capModeAmount = document.createElement('option');
    capModeAmount.value = 'amount';
    capModeAmount.textContent = 'Amount';
    const capModePercent = document.createElement('option');
    capModePercent.value = 'percent';
    capModePercent.textContent = '% of max storage';
    capModeSelect.append(capModeNone, capModeAmount, capModePercent);
    capModeRow.append(capModeLabel, capModeSelect);

    const capValueRow = document.createElement('div');
    capValueRow.classList.add('space-storage-settings-row');
    capValueLabel = document.createElement('label');
    capValueLabel.classList.add('space-storage-settings-label');
    capValueLabel.textContent = 'Cap value:';
    const capValueInfo = document.createElement('span');
    capValueInfo.classList.add('info-tooltip-icon');
    capValueInfo.innerHTML = '&#9432;';
    capValueInfo.title = 'Accepts scientific notation. Percent caps clamp to 0-100.';
    capValueLabel.appendChild(capValueInfo);
    capValueInput = document.createElement('input');
    capValueInput.type = 'text';
    capValueInput.classList.add('space-storage-settings-input');
    wireStringNumberInput(capValueInput, {
      datasetKey: 'spaceStorageCap',
      parseValue: (value) => {
        const mode = capModeSelect.value;
        const parsed = parseFlexibleNumber(value) || 0;
        if (mode === 'percent') {
          return Math.max(0, Math.min(100, parsed));
        }
        return Math.max(0, parsed);
      },
      formatValue: (parsed) => {
        const mode = capModeSelect.value;
        if (mode === 'percent') {
          return String(parsed);
        }
        return parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed);
      },
      onValue: (parsed) => {
        const mode = capModeSelect.value;
        if (mode === 'none') return;
        projectElements[project.name].capDraft = { mode, value: parsed };
        projectElements[project.name].capDraftDirty = true;
      },
    });
    capValueRow.append(capValueLabel, capValueInput);

    const capClampRow = document.createElement('div');
    capClampRow.classList.add('space-storage-settings-row', 'space-storage-settings-button-row');
    capClampButton = document.createElement('button');
    capClampButton.type = 'button';
    capClampButton.classList.add('space-storage-settings-clamp');
    capClampButton.textContent = 'Delete Current Resources above Cap';
    capClampRow.appendChild(capClampButton);

    const capConfirm = document.createElement('button');
    capConfirm.type = 'button';
    capConfirm.classList.add('space-storage-settings-confirm');
    capConfirm.textContent = 'Confirm';

    capWindow.append(capHeader, capResourceRow, capModeRow, capValueRow, capClampRow, capConfirm);
    capOverlay.appendChild(capWindow);
    document.body.appendChild(capOverlay);

    projectElements[project.name] = {
      ...projectElements[project.name],
      capConfirmButton: capConfirm,
      capClampButton,
    };
  }

  const closeCapWindow = () => {
    capOverlay.classList.remove('is-visible');
  };

  const updateCapInputState = () => {
    const mode = capModeSelect.value;
    capValueInput.disabled = mode === 'none';
    capValueLabel.firstChild.textContent = mode === 'percent' ? 'Cap %:' : 'Cap value:';
    if (mode === 'none') {
      capValueInput.value = '';
      capValueInput.dataset.spaceStorageCap = '0';
    }
  };

  if (!cachedCaps.capHandlersBound || newOverlay) {
    capClose.addEventListener('click', closeCapWindow);
    capOverlay.addEventListener('click', (event) => {
      if (event.target === capOverlay) {
        closeCapWindow();
      }
    });
    projectElements[project.name].capConfirmButton.addEventListener('click', () => {
      const key = projectElements[project.name].capResourceKey;
      const draft = projectElements[project.name].capDraft || { mode: 'none', value: 0 };
      if (draft.mode === 'none') {
        delete project.resourceCaps[key];
      } else {
        project.resourceCaps[key] = { mode: draft.mode, value: draft.value || 0 };
      }
      projectElements[project.name].capDraftDirty = false;
      closeCapWindow();
      if (typeof updateSpaceStorageUI === 'function') {
        updateSpaceStorageUI(project);
      }
    });
    projectElements[project.name].capClampButton.addEventListener('click', () => {
      const key = projectElements[project.name].capResourceKey;
      const mode = capModeSelect.value;
      if (mode === 'none') return;
      const parsed = parseFlexibleNumber(capValueInput.dataset.spaceStorageCap) || 0;
      const normalized = mode === 'percent'
        ? Math.max(0, Math.min(100, parsed))
        : Math.max(0, parsed);
      const capLimit = mode === 'percent'
        ? Math.max(0, (project.maxStorage * normalized) / 100)
        : normalized;
      project.clampStoredResourceToLimit(key, capLimit);
      updateSpaceStorageUI(project);
    });
    capModeSelect.addEventListener('change', () => {
      const mode = capModeSelect.value;
      const parsed = parseFlexibleNumber(capValueInput.dataset.spaceStorageCap) || 0;
      const normalized = mode === 'percent'
        ? Math.max(0, Math.min(100, parsed))
        : Math.max(0, parsed);
      projectElements[project.name].capDraft = mode === 'none'
        ? { mode: 'none', value: 0 }
        : { mode, value: normalized };
      projectElements[project.name].capDraftDirty = true;
      capValueInput.dataset.spaceStorageCap = String(normalized);
      capValueInput.value = mode === 'percent'
        ? String(normalized)
        : (normalized >= 1e6 ? formatNumber(normalized, true, 3) : String(normalized));
      updateCapInputState();
    });
  }

  const openCapWindow = (resourceKey, label) => {
    projectElements[project.name].capResourceKey = resourceKey;
    capResourceValue.textContent = label;
    const capSetting = project.getResourceCapSetting(resourceKey);
    projectElements[project.name].capDraft = { mode: capSetting.mode, value: capSetting.value || 0 };
    projectElements[project.name].capDraftDirty = false;
    capModeSelect.value = capSetting.mode;
    capValueInput.dataset.spaceStorageCap = String(capSetting.value || 0);
    capValueInput.value = capSetting.value >= 1e6
      ? formatNumber(capSetting.value, true, 3)
      : String(capSetting.value || 0);
    updateCapInputState();
    capOverlay.classList.add('is-visible');
  };

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

    let biomassInfo;
    if (opt.resource === 'biomass') {
      biomassInfo = document.createElement('span');
      biomassInfo.classList.add('info-tooltip-icon');
      biomassInfo.innerHTML = '&#9432;';
      biomassInfo.title = 'Storing biomass removes it from all zones proportionally to their current biomass. Withdrawing places biomass into zones that can grow it first, then zones where it can survive, then anywhere, weighted by zone percentage.';
    }

    const fullIcon = document.createElement('span');
    fullIcon.classList.add('storage-full-icon');
    fullIcon.innerHTML = '&#9888;&#xFE0E;';
    fullIcon.title = 'Colony storage full';
    fullIcon.style.display = 'inline-block';
    fullIcon.style.visibility = 'hidden';
    fullIcon.style.fontSize = '14px';

    const usage = document.createElement('span');
    usage.id = `${project.name}-usage-${opt.resource}`;
    usage.textContent = '0';

    const transferButton = document.createElement('button');
    transferButton.type = 'button';
    transferButton.classList.add('storage-transfer-toggle');
    const transferIcon = document.createElement('span');
    transferIcon.classList.add('storage-transfer-icon');
    transferButton.appendChild(transferIcon);
    const transferTooltip = attachDynamicInfoTooltip(transferButton, 'Store in space storage');
    transferButton.addEventListener('click', () => {
      const current = project.getResourceTransferMode(opt.resource);
      const next = current === 'withdraw' ? 'store' : 'withdraw';
      project.setResourceTransferMode(opt.resource, next);
      project.updateShipTransferModeFromResources(getVisibleResourceKeys());
      updateSpaceStorageUI(project);
    });

    const capButton = document.createElement('button');
    capButton.type = 'button';
    capButton.classList.add('storage-cap-button');
    capButton.innerHTML = '&#9881;&#xFE0E;';
    capButton.title = 'Space storage cap settings';
    capButton.addEventListener('click', () => {
      openCapWindow(opt.resource, opt.label);
    });

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

    if (biomassInfo) {
      label.append(textSpan, biomassInfo, fullIcon);
    } else {
      label.append(textSpan, fullIcon);
    }
    resourceItem.append(checkbox, label, usage, transferButton, capButton);
    resourceGrid.appendChild(resourceItem);

    if (opt.requiresFlag || opt.requiresProjectFlag) {
      const hasResearchFlag = !opt.requiresFlag || (typeof researchManager === 'undefined'
        || (typeof researchManager.isBooleanFlagSet === 'function'
          && researchManager.isBooleanFlagSet(opt.requiresFlag)));
      const hasProjectFlag = !opt.requiresProjectFlag || project.isBooleanFlagSet(opt.requiresProjectFlag);
      const visible = project.isResourceUnlocked?.(opt.resource, opt.requiresFlag, opt.requiresProjectFlag)
        ?? (hasResearchFlag && hasProjectFlag);
      resourceItem.style.display = visible ? '' : 'none';
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
      transferButtons: {
        ...(projectElements[project.name]?.transferButtons || {}),
        [opt.resource]: transferButton
      },
      transferIcons: {
        ...(projectElements[project.name]?.transferIcons || {}),
        [opt.resource]: transferIcon
      },
      transferTooltips: {
        ...(projectElements[project.name]?.transferTooltips || {}),
        [opt.resource]: transferTooltip
      },
      capButtons: {
        ...(projectElements[project.name]?.capButtons || {}),
        [opt.resource]: capButton
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
  const mixedButton = document.createElement('button');
  mixedButton.textContent = 'Mixed';
  mixedButton.classList.add('mode-button');
  const storeButton = document.createElement('button');
  storeButton.textContent = 'Store';
  storeButton.classList.add('mode-button');

  const updateModeButtons = () => {
    if (project.shipTransferMode === 'withdraw') {
      withdrawButton.classList.add('selected');
      mixedButton.classList.remove('selected');
      storeButton.classList.remove('selected');
    } else if (project.shipTransferMode === 'mixed') {
      mixedButton.classList.add('selected');
      withdrawButton.classList.remove('selected');
      storeButton.classList.remove('selected');
    } else {
      storeButton.classList.add('selected');
      withdrawButton.classList.remove('selected');
      mixedButton.classList.remove('selected');
    }
  };

  withdrawButton.addEventListener('click', () => {
    project.setShipTransferMode('withdraw');
    updateModeButtons();
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(project);
    }
  });
  mixedButton.addEventListener('click', () => {
    project.setShipTransferMode('mixed');
    project.updateShipTransferModeFromResources(getVisibleResourceKeys());
    updateModeButtons();
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(project);
    }
  });
  storeButton.addEventListener('click', () => {
    project.setShipTransferMode('store');
    updateModeButtons();
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(project);
    }
  });

  modeContainer.append(modeLabel, withdrawButton, mixedButton, storeButton);
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
    expansionRateDisplay,
    capOverlay,
    capWindow,
    capResourceValue,
    capValueLabel,
    capModeSelect,
    capValueInput,
    capClose,
    capClampButton,
    capConfirmButton: projectElements[project.name].capConfirmButton,
    capDraft: projectElements[project.name].capDraft,
    capDraftDirty: projectElements[project.name].capDraftDirty,
    capHandlersBound: true,
    shipProgressButton,
    withdrawButton,
    mixedButton,
    storeButton,
    updateModeButtons
  };
}

function updateSpaceStorageUI(project) {
  project.reconcileUsedStorage();
  const els = projectElements[project.name];
  if (!els) return;
  if (els.autoStartLabel) {
    els.autoStartLabel.textContent = 'Auto Start Expansion';
  }
  if (els.shipAutoStartContainer && els.prioritizeRowContainer) {
    const display = projectManager && typeof projectManager.isBooleanFlagSet === 'function' &&
      projectManager.isBooleanFlagSet('automateSpecialProjects') ? 'flex' : 'none';
    els.shipAutoStartContainer.style.display = display;
    els.prioritizeRowContainer.style.display = display;
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
  if (els.expansionRateDisplay) {
    const rate = project.isActive ? (1000 / project.getEffectiveDuration()) : 0;
    els.expansionRateDisplay.textContent = `${formatNumber(rate, true, 3)} expansions/s`;
  }
  if (els.usageCells) {
    storageResourceOptions.forEach(opt => {
      const cell = els.usageCells[opt.resource];
      if (cell) {
        const amount = project.resourceUsage[opt.resource] || 0;
        const capSetting = project.getResourceCapSetting(opt.resource);
        if (capSetting.mode === 'amount' || capSetting.mode === 'percent') {
          const capValue = capSetting.mode === 'amount'
            ? Math.max(0, capSetting.value || 0)
            : Math.max(0, (project.maxStorage * (capSetting.value || 0)) / 100);
          cell.textContent = `${formatNumber(amount, false, 2)}/${formatNumber(capValue, false, 2)}`;
        } else {
          cell.textContent = formatNumber(amount, false, 2);
        }
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
      if (item && (opt.requiresFlag || opt.requiresProjectFlag)) {
        const hasResearchFlag = !opt.requiresFlag || (typeof researchManager === 'undefined'
          || (typeof researchManager.isBooleanFlagSet === 'function'
            && researchManager.isBooleanFlagSet(opt.requiresFlag)));
        const hasProjectFlag = !opt.requiresProjectFlag || project.isBooleanFlagSet(opt.requiresProjectFlag);
        const visible = project.isResourceUnlocked?.(opt.resource, opt.requiresFlag, opt.requiresProjectFlag)
          ?? (hasResearchFlag && hasProjectFlag);
        item.style.display = visible ? '' : 'none';
      }
    });
  }
  if (els.waterDestinationSelect) {
    els.waterDestinationSelect.value = project.waterWithdrawTarget || 'colony';
    els.waterDestinationSelect.style.display =
      project.getResourceTransferMode('liquidWater') === 'withdraw' ? '' : 'none';
  }
  if (els.transferButtons) {
    storageResourceOptions.forEach(opt => {
      const button = els.transferButtons[opt.resource];
      const icon = els.transferIcons[opt.resource];
      const tooltip = els.transferTooltips[opt.resource];
      const mode = project.getResourceTransferMode(opt.resource);
      if (mode === 'withdraw') {
        icon.innerHTML = '&#8595;&#xFE0E;';
        button.classList.add('withdraw');
        button.classList.remove('store');
        tooltip.textContent = 'Withdraw from space storage';
      } else {
        icon.innerHTML = '&#8593;&#xFE0E;';
        button.classList.add('store');
        button.classList.remove('withdraw');
        tooltip.textContent = 'Store in space storage';
      }
    });
  }
  if (els.fullIcons) {
    storageResourceOptions.forEach(opt => {
      const icon = els.fullIcons[opt.resource];
      let res = resources[opt.category]?.[opt.resource];
      if (icon) {
        const mode = project.getResourceTransferMode(opt.resource);
        if (opt.resource === 'liquidWater' && mode === 'withdraw') {
          res = project.waterWithdrawTarget === 'surface'
            ? resources.surface.liquidWater
            : resources.colony.water;
          icon.title = project.waterWithdrawTarget === 'surface'
            ? 'Surface storage full'
            : 'Colony storage full';
        }
        if (mode === 'withdraw' && res && res.hasCap && res.value >= res.cap) {
          icon.style.visibility = 'visible';
        } else {
          icon.style.visibility = 'hidden';
        }
      }
    });
  }
  if (els.shipAutoStartCheckbox) {
    els.shipAutoStartCheckbox.checked = project.shipOperationAutoStart;
  }
  if (els.megaProjectModeSelect) {
    const mode = MEGA_PROJECT_RESOURCE_MODE_MAP[project.megaProjectResourceMode]
      ? project.megaProjectResourceMode
      : MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
    els.megaProjectModeSelect.value = mode;
  }
  if (els.strategicReserveInput) {
    const activeElement = document.activeElement;
    if (els.strategicReserveInput !== activeElement) {
      const reserveValue = project.strategicReserve || 0;
      els.strategicReserveInput.dataset.strategicReserve = String(reserveValue);
      els.strategicReserveInput.value = reserveValue >= 1e6
        ? formatNumber(reserveValue, true, 3)
        : String(reserveValue);
    }
  }
  if (els.capOverlay.classList.contains('is-visible')) {
    const capSetting = els.capDraft || { mode: 'none', value: 0 };
    if (els.capModeSelect.value !== capSetting.mode) {
      els.capModeSelect.value = capSetting.mode;
    }
    if (els.capValueInput !== document.activeElement) {
      const capValue = capSetting.value || 0;
      els.capValueInput.dataset.spaceStorageCap = String(capValue);
      els.capValueInput.value = capSetting.mode === 'percent'
        ? String(capValue)
        : (capValue >= 1e6 ? formatNumber(capValue, true, 3) : String(capValue));
    }
    els.capValueInput.disabled = els.capModeSelect.value === 'none';
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
