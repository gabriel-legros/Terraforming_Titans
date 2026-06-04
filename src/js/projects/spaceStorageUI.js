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

function getSpaceStorageUIText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

const storageResourceOptions = [
  { labelKey: 'metal', fallbackLabel: 'Metal', category: 'colony', resource: 'metal' },
  { labelKey: 'silica', fallbackLabel: 'Silica', category: 'colony', resource: 'silicon' },
  { labelKey: 'graphite', fallbackLabel: 'Graphite', category: 'surface', resource: 'graphite', requiresProjectFlag: 'graphiteStorage' },
  { labelKey: 'glass', fallbackLabel: 'Glass', category: 'colony', resource: 'glass' },
  { labelKey: 'components', fallbackLabel: 'Components', category: 'colony', resource: 'components' },
  { labelKey: 'electronics', fallbackLabel: 'Electronics', category: 'colony', resource: 'electronics' },
  { labelKey: 'superconductors', fallbackLabel: 'Superconductors', category: 'colony', resource: 'superconductors' },
  { labelKey: 'superalloys', fallbackLabel: 'Superalloys', category: 'colony', resource: 'superalloys', requiresFlag: 'superalloyResearchUnlocked' },
  { labelKey: 'water', fallbackLabel: 'Water', category: 'surface', resource: 'liquidWater' },
  { labelKey: 'biomass', fallbackLabel: 'Biomass', category: 'surface', resource: 'biomass', requiresProjectFlag: 'biostorage' },
  { labelKey: 'carbonDioxide', fallbackLabel: 'Carbon Dioxide', category: 'atmospheric', resource: 'carbonDioxide' },
  { labelKey: 'nitrogen', fallbackLabel: 'Nitrogen', category: 'atmospheric', resource: 'inertGas' },
  { labelKey: 'oxygen', fallbackLabel: 'Oxygen', category: 'atmospheric', resource: 'oxygen' },
  { labelKey: 'methane', fallbackLabel: 'Methane', category: 'atmospheric', resource: 'atmosphericMethane', requiresProjectFlag: 'methaneAmmoniaStorage' },
  { labelKey: 'ammonia', fallbackLabel: 'Ammonia', category: 'atmospheric', resource: 'atmosphericAmmonia', requiresProjectFlag: 'methaneAmmoniaStorage' },
  { labelKey: 'hydrogen', fallbackLabel: 'Hydrogen', category: 'atmospheric', resource: 'hydrogen' }
];
const SPACE_STORAGE_RESOURCE_DIVIDER_TOP = new Set(['components', 'liquidWater', 'carbonDioxide']);
const SPACE_STORAGE_IMPORT_LIMIT_RESPECT_RESOURCES = new Set([
  'liquidWater',
  'carbonDioxide',
  'inertGas',
  'hydrogen'
]);
const SPACE_STORAGE_UI_PRESSURE_LIMIT_RESOURCES = new Set([
  'oxygen',
  'atmosphericMethane',
  'atmosphericAmmonia'
]);

function getSpaceStorageResourceLabel(option) {
  return getSpaceStorageUIText(
    `ui.projects.spaceStorage.resources.${option.labelKey}`,
    option.fallbackLabel
  );
}

function getSpaceStorageCapLimitForDraft(project, resourceKey, mode, value) {
  if (!resourceKey) {
    return Math.max(0, project.maxStorage);
  }
  const override = mode === 'none'
    ? { [resourceKey]: { mode: 'none', value: 0 } }
    : { [resourceKey]: { mode, value } };
  const capLimit = project.getResourceCapLimit(resourceKey, override);
  if (Number.isFinite(capLimit)) {
    return Math.max(0, capLimit);
  }
  return Math.max(0, project.maxStorage);
}

function getSpaceStorageRateBySource(resourceKey, source, type) {
  const resource = resources?.spaceStorage?.[resourceKey];
  if (!resource || !source) {
    return 0;
  }
  if (type === 'production') {
    return resource.productionRateBySource?.[source] || 0;
  }
  return resource.consumptionRateBySource?.[source] || 0;
}

function formatArtificialEcosystemsRateLine(entries) {
  const parts = entries
    .filter(entry => entry.rate > 0)
    .map(entry => `${entry.label}: ${formatNumber(entry.rate, true, 3)}/s`);
  if (parts.length === 0) {
    return getSpaceStorageUIText('ui.projects.spaceStorage.none', 'None');
  }
  return parts.join(', ');
}

if (typeof SpaceStorageProject !== 'undefined') {
  SpaceStorageProject.prototype.createShipAutoStartCheckbox = function () {
    const els = projectElements[this.name] || {};
    if (els.autoStartLabel) {
      els.autoStartLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.autoStartExpansion', 'Auto Start Expansion');
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
    label.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.autoStartShips', 'Auto Start Ships');
    container.append(checkbox, label);
    const highAgility = this.createHighAgilityFreightersCheckbox();
    container.appendChild(highAgility);
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
    label.textContent = '';
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

  SpaceStorageProject.prototype.createMegaProjectTravelModeCheckbox = function () {
    const container = document.createElement('div');
    container.classList.add('checkbox-container');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.name}-mega-project-mode-travel-space-only`;
    checkbox.checked = this.megaProjectSpaceOnlyOnTravel === true;
    checkbox.addEventListener('change', (e) => {
      this.megaProjectSpaceOnlyOnTravel = e.target.checked;
    });
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.setSpaceOnlyOnTravel', 'Set to Space Only on travel');
    container.append(checkbox, label);
    projectElements[this.name] = {
      ...projectElements[this.name],
      megaProjectTravelModeCheckbox: checkbox,
      megaProjectTravelModeContainer: container,
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
      delete els.megaProjectTravelModeCheckbox;
      delete els.megaProjectTravelModeContainer;
      delete els.prioritizeRowContainer;
    }

    if (!els.shipAutoStartContainer) {
      const ship = this.createShipAutoStartCheckbox();
      const prioritizeRow = document.createElement('div');
      prioritizeRow.classList.add('checkbox-row-container');
      const prioritize = this.createMegaProjectModeSelect();
      const travelMode = this.createMegaProjectTravelModeCheckbox();
      prioritizeRow.append(prioritize, travelMode);
      projectElements[this.name] = {
        ...projectElements[this.name],
        prioritizeRowContainer: prioritizeRow,
      };
      if (!this.attachShipAutoStartToAssignment(ship)) {
        container.appendChild(ship);
      }
      container.appendChild(prioritizeRow);
    } else {
      if (els.highAgilityFreightersContainer && els.highAgilityFreightersContainer.parentElement !== els.shipAutoStartContainer) {
        els.shipAutoStartContainer.appendChild(els.highAgilityFreightersContainer);
      }
      const placed = this.attachShipAutoStartToAssignment(els.shipAutoStartContainer);
      if (!placed && els.shipAutoStartContainer.parentElement !== container) {
        container.appendChild(els.shipAutoStartContainer);
      }
      if (els.prioritizeRowContainer && els.prioritizeRowContainer.parentElement !== container) {
        container.appendChild(els.prioritizeRowContainer);
      }
    }

    this.updateHighAgilityFreightersCheckbox();
    invalidateAutomationSettingsCache(this.name);
  };
}

function renderSpaceStorageUI(project, container) {
  const card = document.createElement('div');
  card.classList.add('space-storage-card');
  card.classList.add('info-card');
  card.innerHTML = `
    <div class="card-header">
      <span class="card-title">${getSpaceStorageUIText('ui.projects.spaceStorage.title', 'Space Storage')}</span>
    </div>
    <div class="card-body">
      <div id="ss-kessler-warning" class="project-kessler-warning" style="display: none;">
        <span class="project-kessler-warning__icon">⚠</span>
        <span id="ss-kessler-warning-text"></span>
        <span class="project-kessler-warning__icon">⚠</span>
      </div>
      <div class="stats-grid two-col project-summary-grid">
        <div class="stat-item project-summary-box"><span class="stat-label">${getSpaceStorageUIText('ui.projects.spaceStorage.usedStorage', 'Used Storage:')}</span><span id="ss-used" class="stat-value"></span></div>
        <div class="stat-item project-summary-box"><span class="stat-label">${getSpaceStorageUIText('ui.projects.spaceStorage.maxStorage', 'Max Storage:')}</span><span id="ss-max" class="stat-value"></span></div>
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
  expansionTitle.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.expansion', 'Expansion');
  expansionSection.appendChild(expansionTitle);

  const expansionGrid = document.createElement('div');
  expansionGrid.classList.add('project-details-grid');
  const expansionCostRow = document.createElement('div');
  expansionCostRow.id = 'ss-expansion-cost';
  expansionCostRow.innerHTML = `<strong>${getSpaceStorageUIText('ui.projects.cost', 'Cost:')}</strong> <span class="expansion-cost stat-value"></span> <span class="info-tooltip-icon">&#9432;</span>`;
  const expansionCostInfo = expansionCostRow.querySelector('.info-tooltip-icon');
  attachDynamicInfoTooltip(expansionCostInfo, getSpaceStorageUIText('ui.projects.spaceStorage.expansionCostTooltip', 'Construction time is reduced for each terraformed planet.'));
  expansionGrid.appendChild(expansionCostRow);

  const expansionRateRow = document.createElement('div');
  expansionRateRow.id = 'ss-expansion-rate';
  expansionRateRow.innerHTML = `<strong>${getSpaceStorageUIText('ui.projects.spaceStorage.expansionPerSecondLabel', 'Expansion/s:')}</strong> <span class="expansion-rate stat-value"></span>`;
  expansionGrid.appendChild(expansionRateRow);

  const expansionRecipeRow = document.createElement('div');
  expansionRecipeRow.id = 'ss-expansion-recipe';
  const expansionRecipeLabel = document.createElement('strong');
  expansionRecipeLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.mode', 'Mode:');
  const expansionRecipeSelect = document.createElement('select');
  expansionRecipeSelect.classList.add('space-storage-priority-select');
  expansionRecipeSelect.addEventListener('change', (event) => {
    project.setExpansionRecipe(event.target.value);
    invalidateAutomationSettingsCache(project.name);
    if (typeof updateSpaceStorageUI === 'function') {
      updateSpaceStorageUI(project);
    }
  });
  expansionRecipeRow.append(expansionRecipeLabel, expansionRecipeSelect);
  expansionGrid.appendChild(expansionRecipeRow);

  expansionSection.appendChild(expansionGrid);
  topSection.appendChild(expansionSection);

  cardBody.appendChild(topSection);

  const artificialEcosystemsCard = document.createElement('div');
  artificialEcosystemsCard.classList.add('info-card');
  artificialEcosystemsCard.style.marginTop = '2px';
  artificialEcosystemsCard.innerHTML = `
    <div class="card-header">
      <span class="card-title">${getSpaceStorageUIText('ui.projects.spaceStorage.artificialEcosystems', 'Artificial Ecosystems')}</span>
    </div>
    <div class="card-body">
      <div class="project-details-grid">
        <div class="checkbox-container" id="ss-artificial-ecosystems-toggle-row"></div>
        <div class="stats-grid two-col project-summary-grid">
          <div class="stat-item project-summary-box">
            <span class="stat-label">${getSpaceStorageUIText('ui.projects.spaceStorage.currentConsumption', 'Current Consumption:')}</span>
            <span class="stat-value" id="ss-artificial-ecosystems-consumption"></span>
          </div>
          <div class="stat-item project-summary-box">
            <span class="stat-label">${getSpaceStorageUIText('ui.projects.spaceStorage.currentProduction', 'Current Production:')}</span>
            <span class="stat-value" id="ss-artificial-ecosystems-production"></span>
          </div>
        </div>
      </div>
    </div>`;
  if (typeof makeCollapsibleCard === 'function') {
    makeCollapsibleCard(artificialEcosystemsCard);
  }
  const expansionCostDisplay = expansionCostRow.querySelector('.expansion-cost');
  const expansionRateDisplay = expansionRateRow.querySelector('.expansion-rate');
  const resourceGrid = card.querySelector('#ss-resource-grid');
  const artificialEcosystemsToggleRow = artificialEcosystemsCard.querySelector('#ss-artificial-ecosystems-toggle-row');
  const artificialEcosystemsConsumptionDisplay = artificialEcosystemsCard.querySelector('#ss-artificial-ecosystems-consumption');
  const artificialEcosystemsProductionDisplay = artificialEcosystemsCard.querySelector('#ss-artificial-ecosystems-production');

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
  let reserveModeSelect = cachedCaps.reserveModeSelect;
  let reserveValueInput = cachedCaps.reserveValueInput;
  let reserveValueLabel = cachedCaps.reserveValueLabel;
  let transferWeightInput = cachedCaps.transferWeightInput;
  let transferWeightLabel = cachedCaps.transferWeightLabel;
  let limitBiomassDensityWithdrawalsRow = cachedCaps.limitBiomassDensityWithdrawalsRow;
  let limitBiomassDensityWithdrawalsCheckbox = cachedCaps.limitBiomassDensityWithdrawalsCheckbox;
  let respectImportLimitsRow = cachedCaps.respectImportLimitsRow;
  let respectImportLimitsCheckbox = cachedCaps.respectImportLimitsCheckbox;
  let respectImportLimitsLabel = cachedCaps.respectImportLimitsLabel;
  let pressureWithdrawLimitRow = cachedCaps.pressureWithdrawLimitRow;
  let pressureWithdrawLimitInput = cachedCaps.pressureWithdrawLimitInput;
  let pressureWithdrawLimitLabel = cachedCaps.pressureWithdrawLimitLabel;
  let scopeExpansionsCheckbox = cachedCaps.scopeExpansionsCheckbox;
  let scopeTransfersCheckbox = cachedCaps.scopeTransfersCheckbox;
  let scopeConsumptionCheckbox = cachedCaps.scopeConsumptionCheckbox;
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
    capTitle.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.capTitle', 'Space Storage Cap');
    capClose = document.createElement('button');
    capClose.type = 'button';
    capClose.classList.add('space-storage-settings-close');
    capClose.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.close', 'X');
    capHeader.append(capTitle, capClose);

    const capResourceRow = document.createElement('div');
    capResourceRow.classList.add('space-storage-settings-row');
    const capResourceLabel = document.createElement('span');
    capResourceLabel.classList.add('space-storage-settings-label');
    capResourceLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.resource', 'Resource:');
    capResourceValue = document.createElement('span');
    capResourceValue.classList.add('space-storage-settings-value');
    capResourceRow.append(capResourceLabel, capResourceValue);

    const capModeRow = document.createElement('div');
    capModeRow.classList.add('space-storage-settings-row');
    const capModeLabel = document.createElement('label');
    capModeLabel.classList.add('space-storage-settings-label');
    capModeLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.capType', 'Cap type:');
    const capModeInfo = document.createElement('span');
    capModeInfo.classList.add('info-tooltip-icon');
    capModeInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      capModeInfo,
      getSpaceStorageUIText('ui.projects.spaceStorage.capTypeTooltip', 'Amount and % caps apply first. All Remaining splits leftover storage evenly across all resources using that mode. If no All Remaining is set, By Weight splits leftover storage proportionally across weighted resources. Weight 0 or no cap setting gets 0 cap while any weighted split exists.')
    );
    capModeLabel.appendChild(capModeInfo);
    capModeSelect = document.createElement('select');
    capModeSelect.classList.add('space-storage-settings-select');
    const capModeNone = document.createElement('option');
    capModeNone.value = 'none';
    capModeNone.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.noCap', 'No cap');
    const capModeAmount = document.createElement('option');
    capModeAmount.value = 'amount';
    capModeAmount.textContent = getSpaceStorageUIText('ui.projects.common.amount', 'Amount');
    const capModePercent = document.createElement('option');
    capModePercent.value = 'percent';
    capModePercent.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.percentOfMaxStorage', '% of max storage');
    const capModeWeight = document.createElement('option');
    capModeWeight.value = 'weight';
    capModeWeight.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.byWeight', 'By Weight');
    const capModeRemaining = document.createElement('option');
    capModeRemaining.value = 'remaining';
    capModeRemaining.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.allRemaining', 'All Remaining');
    capModeSelect.append(capModeNone, capModeAmount, capModePercent, capModeWeight, capModeRemaining);
    capModeRow.append(capModeLabel, capModeSelect);

    const capValueRow = document.createElement('div');
    capValueRow.classList.add('space-storage-settings-row');
    capValueLabel = document.createElement('label');
    capValueLabel.classList.add('space-storage-settings-label');
    capValueLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.capValue', 'Cap value:');
    const capValueInfo = document.createElement('span');
    capValueInfo.classList.add('info-tooltip-icon');
    capValueInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(capValueInfo, getSpaceStorageUIText('ui.projects.spaceStorage.capValueTooltip', 'Accepts scientific notation. Percent caps clamp to 0-100. By Weight uses whole numbers.'));
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
        if (mode === 'weight') {
          return Math.max(0, Math.floor(parsed));
        }
        if (mode === 'remaining') {
          return 0;
        }
        return Math.max(0, parsed);
      },
      formatValue: (parsed) => {
        const mode = capModeSelect.value;
        if (mode === 'percent' || mode === 'weight') {
          return String(parsed);
        }
        return parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed);
      },
      onValue: (parsed) => {
        const mode = capModeSelect.value;
        if (mode === 'none') {
          updateCapResourceValue();
          return;
        }
        projectElements[project.name].capDraft = { mode, value: parsed };
        projectElements[project.name].capDraftDirty = true;
        updateCapResourceValue();
      },
    });
    capValueRow.append(capValueLabel, capValueInput);

    const reserveModeRow = document.createElement('div');
    reserveModeRow.classList.add('space-storage-settings-row');
    const reserveModeLabel = document.createElement('label');
    reserveModeLabel.classList.add('space-storage-settings-label');
    reserveModeLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.strategicReserve', 'Strategic reserve:');
    const reserveModeInfo = document.createElement('span');
    reserveModeInfo.classList.add('info-tooltip-icon');
    reserveModeInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      reserveModeInfo,
      getSpaceStorageUIText('ui.projects.spaceStorage.strategicReserveTooltip', 'Projects will avoid spending the specified strategic reserve amount. Withdrawals ignore this setting.')
    );
    reserveModeLabel.appendChild(reserveModeInfo);
    reserveModeSelect = document.createElement('select');
    reserveModeSelect.classList.add('space-storage-settings-select');
    const reserveModeNone = document.createElement('option');
    reserveModeNone.value = 'none';
    reserveModeNone.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.noReserve', 'No reserve');
    const reserveModeAmount = document.createElement('option');
    reserveModeAmount.value = 'amount';
    reserveModeAmount.textContent = getSpaceStorageUIText('ui.projects.common.amount', 'Amount');
    const reserveModePercentCap = document.createElement('option');
    reserveModePercentCap.value = 'percentCap';
    reserveModePercentCap.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.percentOfResourceCap', '% of resource cap');
    const reserveModePercentTotal = document.createElement('option');
    reserveModePercentTotal.value = 'percentTotal';
    reserveModePercentTotal.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.percentOfMaxStorage', '% of max storage');
    reserveModeSelect.append(
      reserveModeNone,
      reserveModeAmount,
      reserveModePercentCap,
      reserveModePercentTotal
    );
    reserveModeRow.append(reserveModeLabel, reserveModeSelect);

    const reserveValueRow = document.createElement('div');
    reserveValueRow.classList.add('space-storage-settings-row');
    reserveValueLabel = document.createElement('label');
    reserveValueLabel.classList.add('space-storage-settings-label');
    reserveValueLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.reserveValue', 'Reserve value:');
    const reserveValueInfo = document.createElement('span');
    reserveValueInfo.classList.add('info-tooltip-icon');
    reserveValueInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(reserveValueInfo, getSpaceStorageUIText('ui.projects.spaceStorage.reserveValueTooltip', 'Accepts scientific notation. Percent reserves clamp to 0-100.'));
    reserveValueLabel.appendChild(reserveValueInfo);
    reserveValueInput = document.createElement('input');
    reserveValueInput.type = 'text';
    reserveValueInput.classList.add('space-storage-settings-input');
    wireStringNumberInput(reserveValueInput, {
      datasetKey: 'spaceStorageReserve',
      parseValue: (value) => {
        const mode = reserveModeSelect.value;
        const parsed = parseFlexibleNumber(value) || 0;
        if (mode === 'percentCap' || mode === 'percentTotal') {
          return Math.max(0, Math.min(100, parsed));
        }
        return Math.max(0, parsed);
      },
      formatValue: (parsed) => {
        const mode = reserveModeSelect.value;
        if (mode === 'percentCap' || mode === 'percentTotal') {
          return String(parsed);
        }
        return parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed);
      },
      onValue: (parsed) => {
        const mode = reserveModeSelect.value;
        if (mode === 'none') {
          updateCapResourceValue();
          return;
        }
        projectElements[project.name].reserveDraft = { mode, value: parsed, scope: getScopeDraft() };
        projectElements[project.name].reserveDraftDirty = true;
        updateCapResourceValue();
      },
    });
    reserveValueRow.append(reserveValueLabel, reserveValueInput);

    const transferWeightRow = document.createElement('div');
    transferWeightRow.classList.add('space-storage-settings-row');
    transferWeightLabel = document.createElement('label');
    transferWeightLabel.classList.add('space-storage-settings-label');
    transferWeightLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.transferWeight', 'Transfer weight:');
    const transferWeightInfo = document.createElement('span');
    transferWeightInfo.classList.add('info-tooltip-icon');
    transferWeightInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      transferWeightInfo,
      getSpaceStorageUIText('ui.projects.spaceStorage.transferWeightTooltip', 'Used for ship transfer capacity split. Capacity is divided proportionally by selected resources weight. Weight 0 excludes that resource from ship transfer capacity allocation.')
    );
    transferWeightLabel.appendChild(transferWeightInfo);
    transferWeightInput = document.createElement('input');
    transferWeightInput.type = 'text';
    transferWeightInput.classList.add('space-storage-settings-input');
    wireStringNumberInput(transferWeightInput, {
      datasetKey: 'spaceStorageTransferWeight',
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value) || 0;
        return Math.max(0, parsed);
      },
      formatValue: (parsed) => {
        return parsed >= 1e6 ? formatNumber(parsed, true, 3) : String(parsed);
      },
      onValue: (parsed) => {
        const projectEntry = projectElements[project.name];
        if (!projectEntry) {
          return;
        }
        projectEntry.transferWeightDraft = parsed;
      },
    });
    transferWeightRow.append(transferWeightLabel, transferWeightInput);

    limitBiomassDensityWithdrawalsRow = document.createElement('div');
    limitBiomassDensityWithdrawalsRow.classList.add('space-storage-settings-row');
    const limitBiomassDensityWithdrawalsLabel = document.createElement('label');
    limitBiomassDensityWithdrawalsLabel.classList.add('space-storage-settings-label');
    limitBiomassDensityWithdrawalsLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.limitWithdrawalsToMaxBiomassDensity', 'Limit withdrawals to maximum biomass density');
    const limitBiomassDensityInfo = document.createElement('span');
    limitBiomassDensityInfo.classList.add('info-tooltip-icon');
    limitBiomassDensityInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      limitBiomassDensityInfo,
      getSpaceStorageUIText('ui.projects.spaceStorage.limitWithdrawalsToMaxBiomassDensityTooltip', 'When withdrawing biomass from space storage into surface biomass, stop at the current life design maximum biomass density. Uses 0.1 t/m² if no design density is available.')
    );
    limitBiomassDensityWithdrawalsLabel.appendChild(limitBiomassDensityInfo);
    limitBiomassDensityWithdrawalsCheckbox = document.createElement('input');
    limitBiomassDensityWithdrawalsCheckbox.type = 'checkbox';
    limitBiomassDensityWithdrawalsCheckbox.id = 'limit-biomass-density-withdrawals';
    limitBiomassDensityWithdrawalsRow.append(limitBiomassDensityWithdrawalsLabel, limitBiomassDensityWithdrawalsCheckbox);

    respectImportLimitsRow = document.createElement('div');
    respectImportLimitsRow.classList.add('space-storage-settings-row');
    respectImportLimitsLabel = document.createElement('label');
    respectImportLimitsLabel.classList.add('space-storage-settings-label');
    respectImportLimitsLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.respectImportProjectLimits', 'Respect Import Project limits');
    const respectImportLimitsInfo = document.createElement('span');
    respectImportLimitsInfo.classList.add('info-tooltip-icon');
    respectImportLimitsInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      respectImportLimitsInfo,
      getSpaceStorageUIText('ui.projects.spaceStorage.respectImportProjectLimitsTooltip', 'When withdrawing this resource from space storage, use the matching import project limits such as pressure or coverage caps.')
    );
    respectImportLimitsLabel.appendChild(respectImportLimitsInfo);
    respectImportLimitsCheckbox = document.createElement('input');
    respectImportLimitsCheckbox.type = 'checkbox';
    respectImportLimitsCheckbox.id = 'respect-import-project-limits';
    respectImportLimitsRow.append(respectImportLimitsLabel, respectImportLimitsCheckbox);

    pressureWithdrawLimitRow = document.createElement('div');
    pressureWithdrawLimitRow.classList.add('space-storage-settings-row');
    pressureWithdrawLimitLabel = document.createElement('label');
    pressureWithdrawLimitLabel.classList.add('space-storage-settings-label');
    pressureWithdrawLimitLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.maxWithdrawalPressure', 'Max withdrawal pressure:');
    const pressureWithdrawLimitInfo = document.createElement('span');
    pressureWithdrawLimitInfo.classList.add('info-tooltip-icon');
    pressureWithdrawLimitInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      pressureWithdrawLimitInfo,
      getSpaceStorageUIText('ui.projects.spaceStorage.maxWithdrawalPressureTooltip', 'When withdrawing this gas from space storage, stop once its atmospheric pressure reaches this value. Set to 0 for no pressure limit.')
    );
    pressureWithdrawLimitLabel.appendChild(pressureWithdrawLimitInfo);
    pressureWithdrawLimitInput = document.createElement('input');
    pressureWithdrawLimitInput.type = 'text';
    pressureWithdrawLimitInput.inputMode = 'decimal';
    pressureWithdrawLimitInput.classList.add('space-storage-settings-input');
    wireStringNumberInput(pressureWithdrawLimitInput, {
      datasetKey: 'spaceStoragePressureWithdrawLimit',
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      },
      formatValue: (parsed) => formatNumber(Math.max(0, parsed), true, 2),
      onValue: (parsed) => {
        projectElements[project.name].pressureWithdrawLimitDraft = parsed;
      },
    });
    const pressureWithdrawLimitUnit = document.createElement('span');
    pressureWithdrawLimitUnit.classList.add('space-storage-pressure-unit');
    pressureWithdrawLimitUnit.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.pa', 'Pa');
    const pressureWithdrawLimitInputGroup = document.createElement('div');
    pressureWithdrawLimitInputGroup.classList.add('space-storage-pressure-input-group');
    pressureWithdrawLimitInputGroup.append(pressureWithdrawLimitInput, pressureWithdrawLimitUnit);
    pressureWithdrawLimitRow.append(pressureWithdrawLimitLabel, pressureWithdrawLimitInputGroup);

    const reserveScopeRow = document.createElement('div');
    reserveScopeRow.classList.add('space-storage-settings-row');
    reserveScopeRow.style.alignItems = 'flex-start';
    const reserveScopeLabel = document.createElement('label');
    reserveScopeLabel.classList.add('space-storage-settings-label');
    reserveScopeLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.reserveAppliesTo', 'Applies to:');
    const reserveScopeInfo = document.createElement('span');
    reserveScopeInfo.classList.add('info-tooltip-icon');
    reserveScopeInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      reserveScopeInfo,
      getSpaceStorageUIText('ui.projects.spaceStorage.reserveAppliesToTooltip', 'Choose which systems respect this reserve. Unchecked systems ignore it.')
    );
    reserveScopeLabel.appendChild(reserveScopeInfo);
    const reserveScopeControls = document.createElement('div');
    reserveScopeControls.style.display = 'flex';
    reserveScopeControls.style.flexDirection = 'column';
    reserveScopeControls.style.gap = '4px';
    scopeExpansionsCheckbox = document.createElement('input');
    scopeExpansionsCheckbox.type = 'checkbox';
    scopeExpansionsCheckbox.id = 'scope-expansions';
    const scopeExpansionsLabel = document.createElement('label');
    scopeExpansionsLabel.htmlFor = 'scope-expansions';
    scopeExpansionsLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.reserveScopeExpansions', 'Expansions');
    scopeExpansionsLabel.style.cursor = 'pointer';
    scopeTransfersCheckbox = document.createElement('input');
    scopeTransfersCheckbox.type = 'checkbox';
    scopeTransfersCheckbox.id = 'scope-transfers';
    const scopeTransfersLabel = document.createElement('label');
    scopeTransfersLabel.htmlFor = 'scope-transfers';
    scopeTransfersLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.reserveScopeTransfers', 'Transfers');
    scopeTransfersLabel.style.cursor = 'pointer';
    scopeConsumptionCheckbox = document.createElement('input');
    scopeConsumptionCheckbox.type = 'checkbox';
    scopeConsumptionCheckbox.id = 'scope-consumption';
    const scopeConsumptionLabel = document.createElement('label');
    scopeConsumptionLabel.htmlFor = 'scope-consumption';
    scopeConsumptionLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.reserveScopeConsumption', 'Consumption');
    scopeConsumptionLabel.style.cursor = 'pointer';
    const makeRow = (cb, lbl) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '4px';
      row.append(cb, lbl);
      return row;
    };
    reserveScopeControls.append(
      makeRow(scopeExpansionsCheckbox, scopeExpansionsLabel),
      makeRow(scopeTransfersCheckbox, scopeTransfersLabel),
      makeRow(scopeConsumptionCheckbox, scopeConsumptionLabel)
    );
    reserveScopeRow.append(reserveScopeLabel, reserveScopeControls);

    const capClampRow = document.createElement('div');
    capClampRow.classList.add('space-storage-settings-row', 'space-storage-settings-button-row');
    capClampButton = document.createElement('button');
    capClampButton.type = 'button';
    capClampButton.classList.add('space-storage-settings-clamp');
    capClampButton.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.deleteAboveCap', 'Delete Current Resources above Cap');
    capClampRow.appendChild(capClampButton);

    const capConfirm = document.createElement('button');
    capConfirm.type = 'button';
    capConfirm.classList.add('space-storage-settings-confirm');
    capConfirm.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.confirm', 'Confirm');

    capWindow.append(
      capHeader,
      capResourceRow,
      capModeRow,
      capValueRow,
      transferWeightRow,
      limitBiomassDensityWithdrawalsRow,
      respectImportLimitsRow,
      pressureWithdrawLimitRow,
      reserveModeRow,
      reserveValueRow,
      reserveScopeRow,
      capClampRow,
      capConfirm
    );
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

  const updateCapResourceValue = () => {
    const key = projectElements[project.name].capResourceKey;
    if (!key) return;
    const label = projectElements[project.name].capResourceLabelText || '';
    const mode = capModeSelect.value;
    const parsed = parseFlexibleNumber(capValueInput.dataset.spaceStorageCap) || 0;
    let normalized = Math.max(0, parsed);
    if (mode === 'percent') {
      normalized = Math.max(0, Math.min(100, parsed));
    } else if (mode === 'weight') {
      normalized = Math.max(0, Math.floor(parsed));
    }
    const amount = Math.max(0, project.getStoredResourceValue ? project.getStoredResourceValue(key) : 0);
    const capLimit = getSpaceStorageCapLimitForDraft(project, key, mode, normalized);
    capResourceValue.textContent = `${label} ${formatNumber(amount, false, 2)}/${formatNumber(capLimit, false, 2)}`;
  };

  const updateCapInputState = () => {
    const mode = capModeSelect.value;
    capValueInput.disabled = mode === 'none' || mode === 'remaining';
    capValueLabel.firstChild.textContent = mode === 'percent'
      ? getSpaceStorageUIText('ui.projects.spaceStorage.capPercent', 'Cap %:')
      : (mode === 'weight'
        ? getSpaceStorageUIText('ui.projects.spaceStorage.weight', 'Weight:')
        : (mode === 'remaining'
          ? getSpaceStorageUIText('ui.projects.spaceStorage.allRemaining', 'All Remaining')
          : getSpaceStorageUIText('ui.projects.spaceStorage.capValue', 'Cap value:')));
    if (mode === 'none' || mode === 'remaining') {
      capValueInput.value = '';
      capValueInput.dataset.spaceStorageCap = '0';
    }
    updateCapResourceValue();
  };

  const updateReserveInputState = () => {
    const mode = reserveModeSelect.value;
    const isNone = mode === 'none';
    reserveValueInput.disabled = isNone;
    scopeExpansionsCheckbox.disabled = isNone;
    scopeTransfersCheckbox.disabled = isNone;
    scopeConsumptionCheckbox.disabled = isNone;
    reserveValueLabel.firstChild.textContent = mode === 'percentCap' || mode === 'percentTotal'
      ? getSpaceStorageUIText('ui.projects.spaceStorage.reservePercent', 'Reserve %:')
      : getSpaceStorageUIText('ui.projects.spaceStorage.reserveValue', 'Reserve value:');
    if (isNone) {
      reserveValueInput.value = '';
      reserveValueInput.dataset.spaceStorageReserve = '0';
    }
    updateCapResourceValue();
  };

  const getScopeDraft = () => {
    return {
      expansions: scopeExpansionsCheckbox.checked,
      transfers: scopeTransfersCheckbox.checked,
      consumption: scopeConsumptionCheckbox.checked,
    };
  };

  const updateScopeOnDraft = () => {
    const draft = projectElements[project.name].reserveDraft;
    if (draft) {
      draft.scope = getScopeDraft();
    }
    projectElements[project.name].reserveDraftDirty = true;
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
      const reserveDraft = projectElements[project.name].reserveDraft || { mode: 'none', value: 0 };
      if (draft.mode === 'none') {
        delete project.resourceCaps[key];
      } else {
        project.resourceCaps[key] = { mode: draft.mode, value: draft.value || 0 };
      }
      if (reserveDraft.mode === 'none') {
        delete project.resourceStrategicReserves[key];
      } else {
        const scope = reserveDraft.scope || { expansions: true, transfers: false, consumption: false };
        project.resourceStrategicReserves[key] = { mode: reserveDraft.mode, value: reserveDraft.value || 0, scope };
      }
      project.setResourceTransferWeight(key, projectElements[project.name].transferWeightDraft);
      project.setRespectImportProjectLimits(key, projectElements[project.name].respectImportLimitsDraft === true);
      project.setLimitWithdrawalsToMaxBiomassDensity(key, projectElements[project.name].limitBiomassDensityWithdrawalsDraft === true);
      project.setPressureWithdrawLimitPa(key, projectElements[project.name].pressureWithdrawLimitDraft);
      projectElements[project.name].capDraftDirty = false;
      projectElements[project.name].reserveDraftDirty = false;
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
      let normalized = Math.max(0, parsed);
      if (mode === 'percent') {
        normalized = Math.max(0, Math.min(100, parsed));
      } else if (mode === 'weight') {
        normalized = Math.max(0, Math.floor(parsed));
      } else if (mode === 'remaining') {
        normalized = 0;
      }
      const capLimit = getSpaceStorageCapLimitForDraft(project, key, mode, normalized);
      project.clampStoredResourceToLimit(key, capLimit);
      updateSpaceStorageUI(project);
    });
    capModeSelect.addEventListener('change', () => {
      const mode = capModeSelect.value;
      const parsed = parseFlexibleNumber(capValueInput.dataset.spaceStorageCap) || 0;
      let normalized = Math.max(0, parsed);
      if (mode === 'percent') {
        normalized = Math.max(0, Math.min(100, parsed));
      } else if (mode === 'weight') {
        normalized = Math.max(0, Math.floor(parsed));
      } else if (mode === 'remaining') {
        normalized = 0;
      }
      projectElements[project.name].capDraft = mode === 'none'
        ? { mode: 'none', value: 0 }
        : { mode, value: normalized };
      projectElements[project.name].capDraftDirty = true;
      capValueInput.dataset.spaceStorageCap = String(normalized);
      capValueInput.value = mode === 'percent' || mode === 'weight'
        ? String(normalized)
        : (normalized >= 1e6 ? formatNumber(normalized, true, 3) : String(normalized));
      updateCapInputState();
    });
    reserveModeSelect.addEventListener('change', () => {
      const mode = reserveModeSelect.value;
      const parsed = parseFlexibleNumber(reserveValueInput.dataset.spaceStorageReserve) || 0;
      const normalized = mode === 'percentCap' || mode === 'percentTotal'
        ? Math.max(0, Math.min(100, parsed))
        : Math.max(0, parsed);
      projectElements[project.name].reserveDraft = mode === 'none'
        ? { mode: 'none', value: 0 }
        : { mode, value: normalized, scope: getScopeDraft() };
      projectElements[project.name].reserveDraftDirty = true;
      reserveValueInput.dataset.spaceStorageReserve = String(normalized);
      reserveValueInput.value = mode === 'percentCap' || mode === 'percentTotal'
        ? String(normalized)
        : (normalized >= 1e6 ? formatNumber(normalized, true, 3) : String(normalized));
      updateReserveInputState();
    });
    scopeExpansionsCheckbox.addEventListener('change', updateScopeOnDraft);
    scopeTransfersCheckbox.addEventListener('change', updateScopeOnDraft);
    scopeConsumptionCheckbox.addEventListener('change', updateScopeOnDraft);
    respectImportLimitsCheckbox.addEventListener('change', () => {
      projectElements[project.name].respectImportLimitsDraft = respectImportLimitsCheckbox.checked;
    });
    limitBiomassDensityWithdrawalsCheckbox.addEventListener('change', () => {
      projectElements[project.name].limitBiomassDensityWithdrawalsDraft = limitBiomassDensityWithdrawalsCheckbox.checked;
    });
  }

  const openCapWindow = (resourceKey, label) => {
    projectElements[project.name].capResourceKey = resourceKey;
    projectElements[project.name].capResourceLabelText = label;
    capResourceValue.textContent = label;
    const capSetting = project.getResourceCapSetting(resourceKey);
    const reserveSetting = project.getResourceStrategicReserveSetting(resourceKey);
    projectElements[project.name].capDraft = { mode: capSetting.mode, value: capSetting.value || 0 };
    projectElements[project.name].capDraftDirty = false;
    const scope = reserveSetting.scope || { expansions: true, transfers: false, consumption: false };
    projectElements[project.name].reserveDraft = { mode: reserveSetting.mode, value: reserveSetting.value || 0, scope };
    projectElements[project.name].reserveDraftDirty = false;
    projectElements[project.name].transferWeightDraft = project.getResourceTransferWeight(resourceKey);
    projectElements[project.name].respectImportLimitsDraft = project.shouldRespectImportProjectLimits(resourceKey);
    projectElements[project.name].limitBiomassDensityWithdrawalsDraft = project.shouldLimitWithdrawalsToMaxBiomassDensity(resourceKey);
    projectElements[project.name].pressureWithdrawLimitDraft = project.getPressureWithdrawLimitPa(resourceKey);
    capModeSelect.value = capSetting.mode;
    capValueInput.dataset.spaceStorageCap = String(capSetting.value || 0);
    capValueInput.value = capSetting.mode === 'percent' || capSetting.mode === 'weight'
      ? String(capSetting.value || 0)
      : (capSetting.value >= 1e6
        ? formatNumber(capSetting.value, true, 3)
        : String(capSetting.value || 0));
    reserveModeSelect.value = reserveSetting.mode;
    reserveValueInput.dataset.spaceStorageReserve = String(reserveSetting.value || 0);
    reserveValueInput.value = (reserveSetting.mode === 'percentCap' || reserveSetting.mode === 'percentTotal')
      ? String(reserveSetting.value || 0)
      : ((reserveSetting.value || 0) >= 1e6
        ? formatNumber(reserveSetting.value || 0, true, 3)
        : String(reserveSetting.value || 0));
    const transferWeight = projectElements[project.name].transferWeightDraft;
    transferWeightInput.dataset.spaceStorageTransferWeight = String(transferWeight);
    transferWeightInput.value = transferWeight >= 1e6
      ? formatNumber(transferWeight, true, 3)
      : String(transferWeight);
    scopeExpansionsCheckbox.checked = scope.expansions !== false;
    scopeTransfersCheckbox.checked = scope.transfers === true;
    scopeConsumptionCheckbox.checked = scope.consumption === true;
    respectImportLimitsCheckbox.checked = projectElements[project.name].respectImportLimitsDraft === true;
    limitBiomassDensityWithdrawalsCheckbox.checked = projectElements[project.name].limitBiomassDensityWithdrawalsDraft === true;
    const pressureWithdrawLimit = projectElements[project.name].pressureWithdrawLimitDraft;
    pressureWithdrawLimitInput.dataset.spaceStoragePressureWithdrawLimit = String(pressureWithdrawLimit);
    pressureWithdrawLimitInput.value = formatNumber(Math.max(0, pressureWithdrawLimit), true, 2);
    limitBiomassDensityWithdrawalsRow.style.display = resourceKey === 'biomass' ? '' : 'none';
    respectImportLimitsRow.style.display = SPACE_STORAGE_IMPORT_LIMIT_RESPECT_RESOURCES.has(resourceKey) ? '' : 'none';
    pressureWithdrawLimitRow.style.display = SPACE_STORAGE_UI_PRESSURE_LIMIT_RESOURCES.has(resourceKey) ? '' : 'none';
    updateCapInputState();
    updateReserveInputState();
    updateCapResourceValue();
    capOverlay.classList.add('is-visible');
  };

  storageResourceOptions.forEach(opt => {
    let separator = null;
    if (SPACE_STORAGE_RESOURCE_DIVIDER_TOP.has(opt.resource)) {
      separator = document.createElement('div');
      separator.classList.add('storage-resource-separator');
      resourceGrid.appendChild(separator);
    }

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
    textSpan.textContent = getSpaceStorageResourceLabel(opt);

    let biomassInfo;
    if (opt.resource === 'biomass') {
      biomassInfo = document.createElement('span');
      biomassInfo.classList.add('info-tooltip-icon');
      biomassInfo.innerHTML = '&#9432;';
      attachDynamicInfoTooltip(
        biomassInfo,
        getSpaceStorageUIText('ui.projects.spaceStorage.biomassTooltip', 'Storing biomass removes it from all zones proportionally to their current biomass. Withdrawing places biomass into zones that can grow it first, then zones where it can survive, then anywhere, weighted by zone percentage.')
      );
    }

    const fullIcon = document.createElement('span');
    fullIcon.classList.add('storage-full-icon');
    fullIcon.innerHTML = '&#9888;&#xFE0E;';
    const fullIconTooltip = attachDynamicInfoTooltip(fullIcon, getSpaceStorageUIText('ui.projects.spaceStorage.colonyStorageFull', 'Colony storage full'), false);
    fullIcon.style.display = 'inline-block';
    fullIcon.style.visibility = 'hidden';
    fullIcon.style.fontSize = '14px';

    const usage = document.createElement('span');
    usage.id = `${project.name}-usage-${opt.resource}`;
    usage.textContent = getSpaceStorageUIText('ui.projects.common.zero', '0');

    const transferButton = document.createElement('button');
    transferButton.type = 'button';
    transferButton.classList.add('storage-transfer-toggle');
    const transferIcon = document.createElement('span');
    transferIcon.classList.add('storage-transfer-icon');
    transferButton.appendChild(transferIcon);
    const transferTooltip = attachDynamicInfoTooltip(
      transferButton,
      getSpaceStorageUIText('ui.projects.spaceStorage.storeInSpaceStorage', 'Store in space storage'),
      false
    );
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
    capButton.addEventListener('click', () => {
      openCapWindow(opt.resource, getSpaceStorageResourceLabel(opt));
    });

    let waterSelect;
    let hydrogenSelect;
    if (opt.resource === 'liquidWater') {
      waterSelect = document.createElement('select');
      waterSelect.id = `${project.name}-water-destination`;
      waterSelect.style.fontSize = '12px';
      const colonyOpt = document.createElement('option');
      colonyOpt.value = 'colony';
      colonyOpt.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.colony', 'Colony');
      const surfaceOpt = document.createElement('option');
      surfaceOpt.value = 'surface';
      surfaceOpt.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.surface', 'Surface');
      waterSelect.append(colonyOpt, surfaceOpt);
      waterSelect.addEventListener('change', e => {
        project.waterWithdrawTarget = e.target.value;
        if (typeof updateSpaceStorageUI === 'function') {
          updateSpaceStorageUI(project);
        }
      });
      textSpan.append(' ', waterSelect);
    }
    if (opt.resource === 'hydrogen') {
      hydrogenSelect = document.createElement('select');
      hydrogenSelect.id = `${project.name}-hydrogen-destination`;
      hydrogenSelect.style.fontSize = '12px';
      const atmosphereOpt = document.createElement('option');
      atmosphereOpt.value = 'atmospheric';
      atmosphereOpt.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.atmosphere', 'Atmosphere');
      const colonyOpt = document.createElement('option');
      colonyOpt.value = 'colony';
      colonyOpt.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.colony', 'Colony');
      hydrogenSelect.append(atmosphereOpt, colonyOpt);
      hydrogenSelect.addEventListener('change', e => {
        project.hydrogenTransferTarget = e.target.value === 'colony' ? 'colony' : 'atmospheric';
        updateSpaceStorageUI(project);
      });
      textSpan.append(' ', hydrogenSelect);
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
      resourceSeparators: {
        ...(projectElements[project.name]?.resourceSeparators || {}),
        [opt.resource]: separator
      },
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
      fullIconTooltips: {
        ...(projectElements[project.name]?.fullIconTooltips || {}),
        [opt.resource]: fullIconTooltip
      },
      resourceItems: {
        ...(projectElements[project.name]?.resourceItems || {}),
        [opt.resource]: resourceItem
      },
      ...(opt.resource === 'liquidWater' ? { waterDestinationSelect: waterSelect } : {}),
      ...(opt.resource === 'hydrogen' ? { hydrogenDestinationSelect: hydrogenSelect } : {})
    };
  });

  const artificialEcosystemsContainer = document.createElement('div');
  artificialEcosystemsContainer.classList.add('checkbox-container');
  const artificialEcosystemsCheckbox = document.createElement('input');
  artificialEcosystemsCheckbox.type = 'checkbox';
  artificialEcosystemsCheckbox.id = `${project.name}-artificial-ecosystems`;
  artificialEcosystemsCheckbox.addEventListener('change', (event) => {
    project.artificialEcosystemsEnabled = event.target.checked;
  });
  const artificialEcosystemsLabel = document.createElement('label');
  artificialEcosystemsLabel.htmlFor = artificialEcosystemsCheckbox.id;
  artificialEcosystemsLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.artificialEcosystems', 'Artificial Ecosystems');
  const artificialEcosystemsInfo = document.createElement('span');
  artificialEcosystemsInfo.classList.add('info-tooltip-icon');
  artificialEcosystemsInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(
    artificialEcosystemsInfo,
    getSpaceStorageUIText(
      'ui.projects.spaceStorage.artificialEcosystemsTooltip',
      'When enabled, biomass already stored in space storage grows at 0.5%/s with a logistic ceiling based on the biomass cap set here. Growth only runs when biomass has a cap, consumes stored carbon dioxide and water using the normal photosynthesis stoichiometry, and still grows even if oxygen is already capped.'
    )
  );
  artificialEcosystemsContainer.append(
    artificialEcosystemsCheckbox,
    artificialEcosystemsLabel,
    artificialEcosystemsInfo
  );
  artificialEcosystemsToggleRow.appendChild(artificialEcosystemsContainer);

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
  modeLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.mode', 'Mode:');
  const withdrawButton = document.createElement('button');
  withdrawButton.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.withdraw', 'Withdraw');
  withdrawButton.classList.add('mode-button');
  const mixedButton = document.createElement('button');
  mixedButton.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.mixed', 'Mixed');
  mixedButton.classList.add('mode-button');
  const storeButton = document.createElement('button');
  storeButton.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.store', 'Store');
  storeButton.classList.add('mode-button');

  const updateModeButtons = () => {
    const withdrawalDisabled = project.isWithdrawalDisabled && project.isWithdrawalDisabled();
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
    withdrawButton.disabled = withdrawalDisabled;
    mixedButton.disabled = withdrawalDisabled;
    withdrawButton.title = withdrawalDisabled ? getSpaceStorageUIText('ui.projects.spaceStorage.withdrawalDisabled', 'Withdrawal disabled on this world') : '';
    mixedButton.title = withdrawalDisabled ? getSpaceStorageUIText('ui.projects.spaceStorage.withdrawalDisabled', 'Withdrawal disabled on this world') : '';
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
  container.appendChild(artificialEcosystemsCard);
  projectElements[project.name] = {
    ...projectElements[project.name],
    storageCard: card,
    usedDisplay: card.querySelector('#ss-used'),
    maxDisplay: card.querySelector('#ss-max'),
    resourceGrid,
    expansionCostDisplay,
    expansionRateDisplay,
    expansionRecipeRow,
    expansionRecipeSelect,
    capOverlay,
    capWindow,
    capResourceValue,
    capValueLabel,
    capModeSelect,
    capValueInput,
    reserveModeSelect,
    reserveValueInput,
    reserveValueLabel,
    transferWeightInput,
    transferWeightLabel,
    limitBiomassDensityWithdrawalsRow,
    limitBiomassDensityWithdrawalsCheckbox,
    respectImportLimitsRow,
    respectImportLimitsCheckbox,
    respectImportLimitsLabel,
    pressureWithdrawLimitRow,
    pressureWithdrawLimitInput,
    pressureWithdrawLimitLabel,
    scopeExpansionsCheckbox,
    scopeTransfersCheckbox,
    scopeConsumptionCheckbox,
    capClose,
    capClampButton,
    capConfirmButton: projectElements[project.name].capConfirmButton,
    capDraft: projectElements[project.name].capDraft,
    capDraftDirty: projectElements[project.name].capDraftDirty,
    reserveDraft: projectElements[project.name].reserveDraft,
    reserveDraftDirty: projectElements[project.name].reserveDraftDirty,
    capHandlersBound: true,
    kesslerWarning: card.querySelector('#ss-kessler-warning'),
    kesslerWarningText: card.querySelector('#ss-kessler-warning-text'),
    artificialEcosystemsCard,
    artificialEcosystemsContainer,
    artificialEcosystemsCheckbox,
    artificialEcosystemsLabel,
    artificialEcosystemsConsumptionDisplay,
    artificialEcosystemsProductionDisplay,
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
    els.autoStartLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.autoStartExpansion', 'Auto Start Expansion');
  }
  if (els.shipAutoStartContainer && els.prioritizeRowContainer) {
    const display = projectManager && typeof projectManager.isBooleanFlagSet === 'function' &&
      projectManager.isBooleanFlagSet('automateSpecialProjects') ? 'flex' : 'none';
    els.shipAutoStartContainer.style.display = display;
    els.prioritizeRowContainer.style.display = display;
  }
  if (els.shipAutoStartLabel) {
    els.shipAutoStartLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.autoStartShips', 'Auto Start Ships');
  }
  if (els.transferMethodContainer && els.transferMethodSelect) {
    const unlocked = project.isTeleporterTransferUnlocked();
    els.transferMethodContainer.style.display = unlocked ? 'flex' : 'none';
    if (unlocked) {
      const method = project.isTeleporterTransferActive() ? 'teleporters' : 'spaceships';
      if (els.transferMethodSelect.value !== method) {
        els.transferMethodSelect.value = method;
      }
      const showTeleporters = method === 'teleporters';
      if (els.shipAssignmentContainer) {
        els.shipAssignmentContainer.style.display = showTeleporters ? 'none' : '';
      }
      if (els.teleporterControls) {
        els.teleporterControls.style.display = showTeleporters ? 'flex' : 'none';
      }
      if (els.teleporterRateInput) {
        els.teleporterRateInput.dataset.teleporterTransferRate = String(project.teleporterTransferRate || 0);
        if (document.activeElement !== els.teleporterRateInput) {
          const rate = project.teleporterTransferRate || 0;
          els.teleporterRateInput.value = rate >= 1e6 ? formatNumber(rate, true, 3) : String(rate);
        }
      }
      if (els.teleporterRateBasisSelect) {
        if (els.teleporterRateBasisSelect.value !== project.teleporterTransferRateBasis) {
          els.teleporterRateBasisSelect.value = project.teleporterTransferRateBasis;
        }
      }
    } else {
      if (els.shipAssignmentContainer) {
        els.shipAssignmentContainer.style.display = '';
      }
      if (els.teleporterControls) {
        els.teleporterControls.style.display = 'none';
      }
    }
  }
  if (els.artificialEcosystemsLabel) {
    els.artificialEcosystemsLabel.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.artificialEcosystems', 'Artificial Ecosystems');
  }
  if (els.usedDisplay) {
    els.usedDisplay.textContent = formatNumber(project.usedStorage, false, 2);
  }
  if (els.maxDisplay) {
    els.maxDisplay.textContent = formatNumber(project.maxStorage, false, 2);
  }
  if (els.kesslerWarning && els.kesslerWarningText) {
    const hazardActive = hazardManager.parameters.kessler && !hazardManager.kesslerHazard.isCleared();
    const isCollapsed = els.storageCard?.classList?.contains('collapsed');
    if (hazardActive && !isCollapsed && !project.isTeleporterTransferActive()) {
      const failureChance = project.getKesslerFailureChance();
      const percent = Math.max(0, Math.min(1, failureChance)) * 100;
      if (percent <= 0) {
        els.kesslerWarning.style.display = 'none';
        return;
      }
      els.kesslerWarningText.textContent = getSpaceStorageUIText(
        'ui.projects.spaceStorage.kesslerWarning',
        'Kessler Skies: {value}% chance of project failure.',
        { value: formatNumber(percent, false, 2) }
      );
      els.kesslerWarning.style.display = 'flex';
    } else {
      els.kesslerWarning.style.display = 'none';
    }
  }
  if (els.expansionRecipeRow && els.expansionRecipeSelect) {
    const activeRecipeKey = project.getExpansionRecipeKey();
    const showExpansionRecipe = project.isBooleanFlagSet('warpStorageUpgrade');
    els.expansionRecipeRow.style.display = showExpansionRecipe ? '' : 'none';
    if (showExpansionRecipe) {
      const options = project.getExpansionRecipeOptions();
      const optionKey = options.map(opt => `${opt.value}:${opt.label}`).join('|');
      if (els.expansionRecipeSelect.dataset.optionKey !== optionKey) {
        els.expansionRecipeSelect.textContent = '';
        options.forEach((opt) => {
          const optionEl = document.createElement('option');
          optionEl.value = opt.value;
          optionEl.textContent = opt.label;
          els.expansionRecipeSelect.appendChild(optionEl);
        });
        els.expansionRecipeSelect.dataset.optionKey = optionKey;
      }
    }
    if (els.expansionRecipeSelect.value !== activeRecipeKey) {
      els.expansionRecipeSelect.value = activeRecipeKey;
    }
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
    els.expansionRateDisplay.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.expansionsPerSecond', '{value} expansions/s', {
      value: formatNumber(rate, true, 3)
    });
  }
  if (els.usageCells) {
    storageResourceOptions.forEach(opt => {
      const cell = els.usageCells[opt.resource];
      if (cell) {
        const amount = project.getStoredResourceValue ? project.getStoredResourceValue(opt.resource) : 0;
        const capLimit = project.getResourceCapLimit(opt.resource);
        if (Number.isFinite(capLimit)) {
          cell.textContent = `${formatNumber(amount, false, 2)}/${formatNumber(Math.max(0, capLimit), false, 2)}`;
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
  if (els.resourceSeparators && els.resourceItems) {
    const visibleLookup = {};
    storageResourceOptions.forEach(opt => {
      const item = els.resourceItems[opt.resource];
      visibleLookup[opt.resource] = !!item && item.style.display !== 'none';
    });
    storageResourceOptions.forEach((opt, index) => {
      const separator = els.resourceSeparators[opt.resource];
      if (!separator) return;
      let hasVisiblePrevious = false;
      for (let i = index - 1; i >= 0; i -= 1) {
        if (visibleLookup[storageResourceOptions[i].resource]) {
          hasVisiblePrevious = true;
          break;
        }
      }
      separator.style.display = visibleLookup[opt.resource] && hasVisiblePrevious ? '' : 'none';
    });
  }
  if (els.waterDestinationSelect) {
    els.waterDestinationSelect.value = project.waterWithdrawTarget || 'colony';
    const hasWaterSelected = Array.isArray(project.selectedResources)
      && project.selectedResources.some(entry => entry?.resource === 'liquidWater');
    els.waterDestinationSelect.style.display = hasWaterSelected ? '' : 'none';
  }
  if (els.hydrogenDestinationSelect) {
    els.hydrogenDestinationSelect.value = project.hydrogenTransferTarget === 'colony' ? 'colony' : 'atmospheric';
    const hasHydrogenSelected = Array.isArray(project.selectedResources)
      && project.selectedResources.some(entry => entry?.resource === 'hydrogen');
    els.hydrogenDestinationSelect.style.display = hasHydrogenSelected ? '' : 'none';
  }
  if (els.transferButtons) {
    const withdrawalDisabled = project.isWithdrawalDisabled && project.isWithdrawalDisabled();
    storageResourceOptions.forEach(opt => {
      const button = els.transferButtons[opt.resource];
      const icon = els.transferIcons[opt.resource];
      const tooltip = els.transferTooltips[opt.resource];
      const mode = project.getResourceTransferMode(opt.resource);
      if (button) {
        button.disabled = withdrawalDisabled;
      }
      if (mode === 'withdraw') {
        icon.innerHTML = '&#8595;&#xFE0E;';
        button.classList.add('withdraw');
        button.classList.remove('store');
        tooltip.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.withdrawFromSpaceStorage', 'Withdraw from space storage');
      } else {
        icon.innerHTML = '&#8593;&#xFE0E;';
        button.classList.add('store');
        button.classList.remove('withdraw');
        tooltip.textContent = withdrawalDisabled
          ? getSpaceStorageUIText('ui.projects.spaceStorage.withdrawalDisabled', 'Withdrawal disabled on this world')
          : getSpaceStorageUIText('ui.projects.spaceStorage.storeInSpaceStorage', 'Store in space storage');
      }
    });
  }
  if (els.fullIcons) {
    storageResourceOptions.forEach(opt => {
      const icon = els.fullIcons[opt.resource];
      const tooltip = els.fullIconTooltips ? els.fullIconTooltips[opt.resource] : null;
      let res = resources[opt.category]?.[opt.resource];
      if (icon) {
        const mode = project.getResourceTransferMode(opt.resource);
        let tooltipText = getSpaceStorageUIText('ui.projects.spaceStorage.colonyStorageFull', 'Colony storage full');
        if (opt.resource === 'liquidWater' && mode === 'withdraw') {
          res = project.waterWithdrawTarget === 'surface'
            ? resources.surface.liquidWater
            : resources.colony.water;
          tooltipText = project.waterWithdrawTarget === 'surface'
            ? getSpaceStorageUIText('ui.projects.spaceStorage.surfaceStorageFull', 'Surface storage full')
            : getSpaceStorageUIText('ui.projects.spaceStorage.colonyStorageFull', 'Colony storage full');
        }
        if (opt.resource === 'hydrogen' && mode === 'withdraw') {
          res = project.hydrogenTransferTarget === 'colony'
            ? resources.colony.colonyHydrogen
            : resources.atmospheric.hydrogen;
          tooltipText = project.hydrogenTransferTarget === 'colony'
            ? getSpaceStorageUIText('ui.projects.spaceStorage.colonyStorageFull', 'Colony storage full')
            : getSpaceStorageUIText('ui.projects.spaceStorage.atmosphereStorageFull', 'Atmosphere storage full');
        }
        if (tooltip) {
          tooltip.textContent = tooltipText;
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
	  project.updateHighAgilityFreightersCheckbox();
	  if (els.artificialEcosystemsContainer && els.artificialEcosystemsCheckbox) {
    const enabled = project.isBooleanFlagSet('artificialEcosystems');
    if (els.artificialEcosystemsCard) {
      els.artificialEcosystemsCard.style.display = enabled ? '' : 'none';
    }
    els.artificialEcosystemsContainer.style.display = enabled ? 'flex' : 'none';
    els.artificialEcosystemsCheckbox.checked = project.artificialEcosystemsEnabled === true;
  }
  if (els.artificialEcosystemsConsumptionDisplay && els.artificialEcosystemsProductionDisplay) {
    const source = getSpaceStorageUIText('ui.projects.spaceStorage.artificialEcosystemsSource', 'Artificial Ecosystems');
    const waterLabel = getSpaceStorageUIText('ui.projects.spaceStorage.resources.water', 'Water');
    const carbonDioxideLabel = getSpaceStorageUIText('ui.projects.spaceStorage.resources.carbonDioxide', 'Carbon Dioxide');
    const biomassLabel = getSpaceStorageUIText('ui.projects.spaceStorage.resources.biomass', 'Biomass');
    const oxygenLabel = getSpaceStorageUIText('ui.projects.spaceStorage.resources.oxygen', 'Oxygen');
    const consumptionText = formatArtificialEcosystemsRateLine([
      { label: waterLabel, rate: getSpaceStorageRateBySource('liquidWater', source, 'consumption') },
      { label: carbonDioxideLabel, rate: getSpaceStorageRateBySource('carbonDioxide', source, 'consumption') },
    ]);
    const productionText = formatArtificialEcosystemsRateLine([
      { label: biomassLabel, rate: getSpaceStorageRateBySource('biomass', source, 'production') },
      { label: oxygenLabel, rate: getSpaceStorageRateBySource('oxygen', source, 'production') },
    ]);
    els.artificialEcosystemsConsumptionDisplay.textContent = consumptionText;
    els.artificialEcosystemsProductionDisplay.textContent = productionText;
  }
  if (els.megaProjectModeSelect) {
    const mode = MEGA_PROJECT_RESOURCE_MODE_MAP[project.megaProjectResourceMode]
      ? project.megaProjectResourceMode
      : MEGA_PROJECT_RESOURCE_MODES.SPACE_FIRST;
    els.megaProjectModeSelect.value = mode;
    els.megaProjectTravelModeCheckbox.checked = project.megaProjectSpaceOnlyOnTravel === true;
  }
  if (els.capOverlay && els.capOverlay.classList.contains('is-visible')) {
    const capSetting = els.capDraft || { mode: 'none', value: 0 };
    const reserveSetting = els.reserveDraft || { mode: 'none', value: 0 };
    if (els.capModeSelect.value !== capSetting.mode) {
      els.capModeSelect.value = capSetting.mode;
    }
    if (els.reserveModeSelect.value !== reserveSetting.mode) {
      els.reserveModeSelect.value = reserveSetting.mode;
    }
    if (els.capValueInput !== document.activeElement) {
      const capValue = capSetting.value || 0;
      els.capValueInput.dataset.spaceStorageCap = String(capValue);
      els.capValueInput.value = capSetting.mode === 'percent' || capSetting.mode === 'weight'
        ? String(capValue)
        : (capValue >= 1e6 ? formatNumber(capValue, true, 3) : String(capValue));
    }
    if (els.reserveValueInput !== document.activeElement) {
      const reserveValue = reserveSetting.value || 0;
      els.reserveValueInput.dataset.spaceStorageReserve = String(reserveValue);
      els.reserveValueInput.value = reserveSetting.mode === 'percentCap' || reserveSetting.mode === 'percentTotal'
        ? String(reserveValue)
        : (reserveValue >= 1e6 ? formatNumber(reserveValue, true, 3) : String(reserveValue));
    }
    if (els.transferWeightInput !== document.activeElement) {
      const transferWeight = els.transferWeightDraft != null ? els.transferWeightDraft : 1;
      els.transferWeightInput.dataset.spaceStorageTransferWeight = String(transferWeight);
      els.transferWeightInput.value = transferWeight >= 1e6 ? formatNumber(transferWeight, true, 3) : String(transferWeight);
    }
    if (els.respectImportLimitsCheckbox) {
      els.respectImportLimitsCheckbox.checked = els.respectImportLimitsDraft === true;
      els.respectImportLimitsRow.style.display = SPACE_STORAGE_IMPORT_LIMIT_RESPECT_RESOURCES.has(els.capResourceKey) ? '' : 'none';
    }
    if (els.pressureWithdrawLimitInput) {
      const pressureWithdrawLimit = els.pressureWithdrawLimitDraft || 0;
      if (els.pressureWithdrawLimitInput !== document.activeElement) {
        els.pressureWithdrawLimitInput.dataset.spaceStoragePressureWithdrawLimit = String(pressureWithdrawLimit);
        els.pressureWithdrawLimitInput.value = formatNumber(Math.max(0, pressureWithdrawLimit), true, 2);
      }
      els.pressureWithdrawLimitRow.style.display = SPACE_STORAGE_UI_PRESSURE_LIMIT_RESOURCES.has(els.capResourceKey) ? '' : 'none';
    }
    if (els.limitBiomassDensityWithdrawalsCheckbox) {
      els.limitBiomassDensityWithdrawalsCheckbox.checked = els.limitBiomassDensityWithdrawalsDraft === true;
      els.limitBiomassDensityWithdrawalsRow.style.display = els.capResourceKey === 'biomass' ? '' : 'none';
    }
    els.capValueInput.disabled = els.capModeSelect.value === 'none' || els.capModeSelect.value === 'remaining';
    const reserveIsNone = els.reserveModeSelect.value === 'none';
    els.reserveValueInput.disabled = reserveIsNone;
    if (els.scopeExpansionsCheckbox) {
      els.scopeExpansionsCheckbox.disabled = reserveIsNone;
      els.scopeTransfersCheckbox.disabled = reserveIsNone;
      els.scopeConsumptionCheckbox.disabled = reserveIsNone;
    }
    if (els.reserveValueLabel) {
      els.reserveValueLabel.firstChild.textContent = els.reserveModeSelect.value === 'percentCap' || els.reserveModeSelect.value === 'percentTotal'
        ? getSpaceStorageUIText('ui.projects.spaceStorage.reservePercent', 'Reserve %:')
        : getSpaceStorageUIText('ui.projects.spaceStorage.reserveValue', 'Reserve value:');
    }
    if (els.capResourceValue) {
      const key = els.capResourceKey;
      const label = els.capResourceLabelText || '';
      const capMode = els.capModeSelect.value;
      const capParsed = parseFlexibleNumber(els.capValueInput.dataset.spaceStorageCap) || 0;
      let capNormalized = Math.max(0, capParsed);
      if (capMode === 'percent') {
        capNormalized = Math.max(0, Math.min(100, capParsed));
      } else if (capMode === 'weight') {
        capNormalized = Math.max(0, Math.floor(capParsed));
      } else if (capMode === 'remaining') {
        capNormalized = 0;
      }
      const amount = key ? Math.max(0, (project.getStoredResourceValue ? project.getStoredResourceValue(key) : 0)) : 0;
      const capLimit = key
        ? getSpaceStorageCapLimitForDraft(project, key, capMode, capNormalized)
        : project.maxStorage;
      els.capResourceValue.textContent = `${label} ${formatNumber(amount, false, 2)}/${formatNumber(Math.max(0, capLimit), false, 2)}`;
    }
    if (els.capValueLabel) {
      els.capValueLabel.firstChild.textContent = els.capModeSelect.value === 'percent'
        ? getSpaceStorageUIText('ui.projects.spaceStorage.capPercent', 'Cap %:')
        : (els.capModeSelect.value === 'weight'
          ? getSpaceStorageUIText('ui.projects.spaceStorage.weight', 'Weight:')
          : (els.capModeSelect.value === 'remaining'
            ? getSpaceStorageUIText('ui.projects.spaceStorage.allRemaining', 'All Remaining')
            : getSpaceStorageUIText('ui.projects.spaceStorage.capValue', 'Cap value:')));
    }
    const capParsed = parseFlexibleNumber(els.capValueInput.dataset.spaceStorageCap) || 0;
    let capNormalized = Math.max(0, capParsed);
    if (els.capModeSelect.value === 'percent') {
      capNormalized = Math.max(0, Math.min(100, capParsed));
    } else if (els.capModeSelect.value === 'weight') {
      capNormalized = Math.max(0, Math.floor(capParsed));
    } else if (els.capModeSelect.value === 'remaining') {
      capNormalized = 0;
    }
    els.capValueInput.dataset.spaceStorageCap = String(capNormalized);
    if (els.reserveModeSelect.value === 'none') {
      const parsed = parseFlexibleNumber(els.reserveValueInput.dataset.spaceStorageReserve) || 0;
      const normalized = els.reserveModeSelect.value === 'percentCap' || els.reserveModeSelect.value === 'percentTotal'
        ? Math.max(0, Math.min(100, parsed))
        : Math.max(0, parsed);
      els.reserveValueInput.dataset.spaceStorageReserve = String(normalized);
    }
  }
  if (els.updateModeButtons) {
    els.updateModeButtons();
  }
  if (els.shipProgressButton) {
    if (project.isShipOperationContinuous()) {
      if (project.shipOperationAutoStart) {
        const productivity = project.continuousProductivity ?? 1;
        const activeMethod = project.isTeleporterTransferActive()
          ? getSpaceStorageUIText('ui.projects.spaceStorage.teleportersActive', 'Teleporters')
          : getSpaceStorageUIText('ui.projects.status.continuous', 'Continuous');
        const withdrawalProductivityLabel = getSpaceStorageUIText(
          'ui.projects.status.withdrawalProductivitySuffix',
          ' (Withdrawal Productivity: {value}%)',
          { value: Math.round(productivity * 100) }
        );
        els.shipProgressButton.textContent = `${activeMethod}${withdrawalProductivityLabel}`;
        els.shipProgressButton.style.background = getStatusColor('success');
      } else {
        els.shipProgressButton.textContent = getSpaceStorageUIText('ui.projects.status.stopped', 'Stopped');
        els.shipProgressButton.style.background = getStatusColor('failure');
      }
    } else {
      const duration = project.getShipOperationDuration();
      const timeRemaining = Math.ceil(project.shipOperationRemainingTime / 1000);
      if (project.assignedSpaceships <= 0) {
        els.shipProgressButton.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.noShipsAssigned', 'No ships assigned');
        els.shipProgressButton.style.background = getStatusColor('failure');
      } else if (project.shipOperationIsActive) {
        const rawProgressPercent = ((project.shipOperationStartingDuration - project.shipOperationRemainingTime) / project.shipOperationStartingDuration) * 100;
        const progressPercent = Number.isFinite(rawProgressPercent)
          ? Math.max(0, Math.min(100, rawProgressPercent))
          : 0;
        let statusText = getSpaceStorageUIText('ui.projects.status.inProgressPercent', 'In Progress: {time} seconds remaining ({percent}%)', {
          time: timeRemaining,
          percent: progressPercent.toFixed(2)
        });
        const workerRatio = project.getHazardousMachineryWorkerAvailabilityRatio();
        if (workerRatio < 0.999) {
          statusText += getSpaceStorageUIText('ui.projects.status.productivitySuffix', ' ({value}% productivity)', {
            value: (workerRatio * 100).toFixed(2)
          });
        }
        els.shipProgressButton.textContent = statusText;
        els.shipProgressButton.style.background = getStatusProgressBackground(progressPercent);
      } else if (project.shipOperationIsPaused) {
        els.shipProgressButton.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.resumeShipTransfers', 'Resume ship transfers ({time}s left)', { time: timeRemaining });
        els.shipProgressButton.style.background = project.canStartShipOperation() ? getStatusColor('success') : getStatusColor('failure');
      } else if (project.canStartShipOperation && project.canStartShipOperation()) {
        els.shipProgressButton.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.startShipTransfers', 'Start ship transfers (Duration: {duration} seconds)', { duration: (duration / 1000).toFixed(2) });
        els.shipProgressButton.style.background = getStatusColor('success');
      } else {
        els.shipProgressButton.textContent = getSpaceStorageUIText('ui.projects.spaceStorage.startShipTransfers', 'Start ship transfers (Duration: {duration} seconds)', { duration: (duration / 1000).toFixed(2) });
        els.shipProgressButton.style.background = getStatusColor('failure');
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
