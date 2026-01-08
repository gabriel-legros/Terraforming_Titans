// structures-ui.js

// Create an object to store the selected build count for each structure
const selectedBuildCounts = {};

function getManualBuildCount(structure, buildCount) {
  if (!gameSettings.roundBuildingConstruction || structure.autoBuildEnabled) {
    return buildCount;
  }
  return getRoundedBuildCount(structure.count, buildCount);
}

function swapResourceRateColor(resource, color) {
  if (resource.reverseColor && color === 'red') return 'green';
  if (resource.reverseColor && color === 'green') return 'red';
  return color;
}

// Helper function to get all unique building categories from buildings-parameters.js
function getBuildingCategories() {
  if (typeof buildingsParameters === 'undefined') {
    return ['resource', 'production', 'energy', 'storage', 'terraforming'];
  }
  const categories = new Set();
  for (const buildingName in buildingsParameters) {
    const category = buildingsParameters[buildingName].category;
    if (category) {
      categories.add(category);
    }
  }
  return Array.from(categories);
}

const structureDisplayState = {
  collapsed: {},
  hidden: {}
};

function biodomeHasActiveLifeDesign() {
  try {
    const design = lifeDesigner.currentDesign;
    return !!(design && design.canSurviveAnywhere && design.canSurviveAnywhere());
  } catch (error) {
    return false;
  }
}

// Cache combined building rows for each container
// This will be populated dynamically based on actual building categories
let buildingContainerIds = [];

function updateBuildingContainerIds() {
  const categories = getBuildingCategories();
  buildingContainerIds = categories.map(cat => `${cat}-buildings-buttons`);
}

const combinedBuildingRowCache = {};
const structureContainerMap = {};
// Cache per-structure frequently accessed elements
const structureUIElements = {};
let structureUICacheInvalidated = true;

function resetStructureDisplayState() {
  structureDisplayState.collapsed = {};
  structureDisplayState.hidden = {};
}

function updateStructureHiddenPreference(name, hidden) {
  if (hidden) {
    structureDisplayState.hidden[name] = true;
    return;
  }
  delete structureDisplayState.hidden[name];
}

function updateStructureCollapsePreference(name, collapsed) {
  if (collapsed) {
    structureDisplayState.collapsed[name] = true;
    return;
  }
  delete structureDisplayState.collapsed[name];
}

function applyStructureDisplayPreferences(structureCollection) {
  for (const name in structureCollection) {
    const structure = structureCollection[name];
    if (!structure) continue;
    if (structure.isHidden || structureDisplayState.hidden[name]) {
      structure.isHidden = true;
      updateStructureHiddenPreference(name, true);
    } else {
      updateStructureHiddenPreference(name, false);
    }
  }
}

const AUTO_BUILD_DEFAULT_STEP = 0.01;
const AUTO_BUILD_MIN_STEP = 0.000001;
const AUTO_BUILD_MAX_STEP = 1000000;

function sanitizeAutoBuildStep(value) {
  if (!Number.isFinite(value) || value <= 0) return AUTO_BUILD_DEFAULT_STEP;
  if (value < AUTO_BUILD_MIN_STEP) return AUTO_BUILD_MIN_STEP;
  if (value > AUTO_BUILD_MAX_STEP) return AUTO_BUILD_MAX_STEP;
  return value;
}

function formatAutoBuildStepValue(step) {
  const normalized = sanitizeAutoBuildStep(step);
  let decimals = 2;
  if (normalized < 1) decimals = 3;
  if (normalized < 0.1) decimals = 4;
  if (normalized < 0.01) decimals = 5;
  if (normalized < 0.001) decimals = 6;
  return Number(normalized.toFixed(decimals)).toString();
}

function isAutoBuildFillMode(structure) {
  return structure.autoBuildFillEnabled && structure.autoBuildBasis === 'fill';
}

function updateAutoBuildStepButtonLabels(structure, incrementBtn, decrementBtn) {
  if (!structure) return;
  structure.autoBuildStep = sanitizeAutoBuildStep(structure.autoBuildStep);
  const label = formatAutoBuildStepValue(structure.autoBuildStep);
  if (incrementBtn) incrementBtn.textContent = `+${label}`;
  if (decrementBtn) decrementBtn.textContent = `-${label}`;
}

function refreshAutoBuildTarget(structure) {
  if (!structure || typeof resources === 'undefined' || !resources.colony) return;
  const els = structureUIElements[structure.name];
  if (!els) return;
  const pop = resources.colony.colonists?.value || 0;
  const workerCap = resources.colony.workers?.cap || 0;
  const collection = typeof buildings !== 'undefined' ? buildings : undefined;
  const autoBuildUsesFill = isAutoBuildFillMode(structure);
  const autoBuildUsesMax = structure.autoBuildBasis === 'max';
  const base = autoBuildUsesMax || autoBuildUsesFill ? 0 : getAutoBuildBaseValue(structure, pop, workerCap, collection);
  const targetCount = autoBuildUsesMax || autoBuildUsesFill
    ? Infinity
    : Math.ceil((structure.autoBuildPercent * base || 0) / 100);

  if (els.autoBuildTarget) {
    const targetText = autoBuildUsesFill
      ? `Max fill : ${formatNumber(structure.autoBuildFillPercent || 0, true)}%`
      : autoBuildUsesMax
        ? 'Target : Max'
        : `Target : ${formatNumber(targetCount, true)}`;
    if (els.autoBuildTarget.textContent !== targetText) {
      els.autoBuildTarget.textContent = targetText;
    }
    const targetColor = structure.autoBuildPartial ? 'orange' : '';
    if (els.autoBuildTarget.style.color !== targetColor) {
      els.autoBuildTarget.style.color = targetColor;
    }
  }

  if (els.autoBuildInput) {
    els.autoBuildInput.disabled = autoBuildUsesMax;
    if (document.activeElement !== els.autoBuildInput) {
      const value = autoBuildUsesFill ? (structure.autoBuildFillPercent || 0) : structure.autoBuildPercent;
      const newValue = `${value}`;
      if (els.autoBuildInput.value !== newValue) {
        els.autoBuildInput.value = newValue;
      }
    }
  }

  if (els.setActiveButton) {
    els.setActiveButton.style.display = 'inline-flex';
  }

  if (els.autoBuildFillContainer) {
    els.autoBuildFillContainer.style.display = autoBuildUsesFill ? 'flex' : 'none';
    if (document.activeElement !== els.autoBuildFillPrimary) {
      els.autoBuildFillPrimary.value = structure.autoBuildFillResourcePrimary || 'any';
    }
    if (document.activeElement !== els.autoBuildFillSecondary) {
      els.autoBuildFillSecondary.value = structure.autoBuildFillResourceSecondary || 'none';
    }
  }

  if (els.autoBuildStepIncrement && els.autoBuildStepDecrement) {
    updateAutoBuildStepButtonLabels(structure, els.autoBuildStepIncrement, els.autoBuildStepDecrement);
  }

  const shouldDisableButtons = autoBuildUsesMax;
  ['autoBuildStepIncrement', 'autoBuildStepDecrement', 'autoBuildStepMultiply', 'autoBuildStepDivide'].forEach(key => {
    const btn = els[key];
    if (btn) {
      btn.disabled = shouldDisableButtons;
    }
  });
}

function refreshAllAutoBuildTargets() {
  Object.values(structures || {}).forEach(refreshAutoBuildTarget);
}

function applyAutoBuildDelta(structure, input, delta) {
  if (!structure || !input || !Number.isFinite(delta)) return;
  structure.autoBuildStep = sanitizeAutoBuildStep(structure.autoBuildStep);
  const parsed = parseFloat(input.value);
  const current = Number.isFinite(parsed) ? parsed : 0;
  const next = Math.max(0, current + delta);
  const normalized = Number(next.toFixed(6));
  if (isAutoBuildFillMode(structure)) {
    const clamped = Math.min(100, normalized);
    structure.autoBuildFillPercent = clamped;
    input.value = `${clamped}`;
  } else {
    structure.autoBuildPercent = normalized;
    input.value = `${normalized}`;
  }
  refreshAutoBuildTarget(structure);
}

function createAutoBuildStepControls(structure, autoBuildInput) {
  structure.autoBuildStep = sanitizeAutoBuildStep(structure.autoBuildStep);

  const grid = document.createElement('div');
  grid.classList.add('auto-build-step-grid');

  const incrementButton = document.createElement('button');
  incrementButton.type = 'button';
  incrementButton.classList.add('auto-build-step-button', 'auto-build-step-increase');
  grid.appendChild(incrementButton);

  const multiplyButton = document.createElement('button');
  multiplyButton.type = 'button';
  multiplyButton.classList.add('auto-build-step-button', 'auto-build-step-multiply');
  multiplyButton.textContent = 'x10';
  grid.appendChild(multiplyButton);

  const decrementButton = document.createElement('button');
  decrementButton.type = 'button';
  decrementButton.classList.add('auto-build-step-button', 'auto-build-step-decrease');
  grid.appendChild(decrementButton);

  const divideButton = document.createElement('button');
  divideButton.type = 'button';
  divideButton.classList.add('auto-build-step-button', 'auto-build-step-divide');
  divideButton.textContent = '/10';
  grid.appendChild(divideButton);

  updateAutoBuildStepButtonLabels(structure, incrementButton, decrementButton);

  incrementButton.addEventListener('click', () => {
    applyAutoBuildDelta(structure, autoBuildInput, structure.autoBuildStep);
  });

  decrementButton.addEventListener('click', () => {
    applyAutoBuildDelta(structure, autoBuildInput, -structure.autoBuildStep);
  });

  multiplyButton.addEventListener('click', () => {
    structure.autoBuildStep = sanitizeAutoBuildStep(structure.autoBuildStep * 10);
    updateAutoBuildStepButtonLabels(structure, incrementButton, decrementButton);
  });

  divideButton.addEventListener('click', () => {
    structure.autoBuildStep = sanitizeAutoBuildStep(structure.autoBuildStep / 10);
    updateAutoBuildStepButtonLabels(structure, incrementButton, decrementButton);
  });

  return {
    grid,
    incrementButton,
    decrementButton,
    multiplyButton,
    divideButton
  };
}

function resolveAutoBuildBasisValue(structure, select) {
  const defaultBasis = structure.autoBuildFillEnabled ? 'fill' : 'population';
  const basis = `${structure.autoBuildBasis || defaultBasis}`;
  for (let i = 0; i < select.options.length; i += 1) {
    if (select.options[i].value === basis) {
      return basis;
    }
  }
  structure.autoBuildBasis = defaultBasis;
  return defaultBasis;
}

function updateAutoBuildInputState(structure, basisSelect, input) {
  if (!basisSelect || !input) return;
  const disableInput = basisSelect.value === 'max';
  input.disabled = disableInput;
  if (disableInput && structure.autoBuildBasis !== 'max') {
    basisSelect.value = resolveAutoBuildBasisValue(structure, basisSelect);
    input.disabled = basisSelect.value === 'max';
  }
}

function getAutoBuildBaseValue(structure, population, workerCap, collection) {
  const baseMethod = structure?.getAutoBuildBase;
  if (baseMethod?.call) {
    return baseMethod.call(structure, population, workerCap, collection);
  }

  const basis = `${structure?.autoBuildBasis || 'population'}`;
  if (basis === 'workers') {
    return workerCap;
  }

  if (basis.startsWith('building:')) {
    const target = collection?.[basis.slice(9)];
    return target?.active || 0;
  }

  return population;
}

function rebuildStructureUICache() {
  buildingContainerIds.forEach(id => {
    const container = document.getElementById(id);
    combinedBuildingRowCache[id] = container
      ? Array.from(container.getElementsByClassName('combined-building-row'))
      : [];
  });
  structureUICacheInvalidated = false;
}

function invalidateStructureUICache() {
  structureUICacheInvalidated = true;
  // Explicitly clear element caches when UI is rebuilt
  for (const k in structureUIElements) delete structureUIElements[k];
}

function applyCollapseState(structureName) {
  const els = structureUIElements[structureName];
  if (!els) return;
  const collapsed = !!els.collapsed;
  updateStructureCollapsePreference(structureName, collapsed);
  els.combinedRow.classList.toggle('collapsed', collapsed);
  if (els.collapseArrow) {
    els.collapseArrow.textContent = collapsed ? '▶' : '▼';
  }
  els.headerActive.style.display = collapsed ? 'inline-flex' : 'none';
}

// Create buttons for the buildings based on their categories
function createBuildingButtons() {
  // Update container IDs based on actual categories
  updateBuildingContainerIds();
  
  // Dynamically create categorized buildings object
  const categories = getBuildingCategories();
  const categorizedBuildings = {};
  categories.forEach(cat => {
    categorizedBuildings[cat] = [];
  });

  // Categorize buildings
  for (const buildingName in buildings) {
    const building = buildings[buildingName];
    if (building.category && categorizedBuildings[building.category]) {
      categorizedBuildings[building.category].push(building);
    }
  }

  // Create buttons for each category dynamically
  categories.forEach(category => {
    const containerId = `${category}-buildings-buttons`;
    const buildingsInCategory = categorizedBuildings[category] || [];
    createStructureButtons(
      buildingsInCategory,
      containerId,
      (buildingName, buildCount) => buildings[buildingName].buildStructure(buildCount),
      adjustStructureActivation
    );
  });
  
  // Initialize unhide button event listeners
  initializeUnhideButtons();
  
  // Update subtab visibility after creating buttons
  updateBuildingSubtabsVisibility();
}

function createColonyButtons(colonies) {
  const colonyArray = Object.values(colonies); // Convert dictionary to array
  createStructureButtons(colonyArray, 'colony-buildings-buttons', (colonyName, buildCount) => colonies[colonyName].buildStructure(buildCount), adjustStructureActivation, true);
}

// Create buttons for buildings and colonies
function createStructureButtons(structures, containerId, buildCallback, toggleCallback, isColony = false) {
  const buttonsContainer = document.getElementById(containerId);
  while (buttonsContainer.firstChild) {
    buttonsContainer.removeChild(buttonsContainer.firstChild);
  }
  const rows = [];
  structures.forEach((structure) => {
    // Create structure row (shared for buildings and colonies)
    const structureRow = createStructureRow(structure, buildCallback, toggleCallback, isColony);

    // Append the structure row to the container
    buttonsContainer.appendChild(structureRow);
    rows.push(structureRow);

  });
  combinedBuildingRowCache[containerId] = rows;
  structureContainerMap[containerId] = structures;
  structureUICacheInvalidated = false;
}
  
// Create a structure row for both buildings and colonies
function createStructureRow(structure, buildCallback, toggleCallback, isColony) {
  const combinedStructureRow = document.createElement('div');
  combinedStructureRow.classList.add('combined-building-row', 'project-card', 'building-card');

  const structureRow = document.createElement('div');
  structureRow.classList.add('building-row', 'building-card-column', 'building-card-primary');

  // Hide the structure if it's not unlocked or if it's hidden
  if (!structure.unlocked || structure.isHidden) {
    combinedStructureRow.classList.add('hidden'); // Hide the building
  }

  // If the building is obsolete, add a visual indicator
  if (structure.obsolete) {
    structureRow.classList.add('obsolete-building');
  }

  const cardHeader = document.createElement('div');
  cardHeader.classList.add('card-header', 'building-card-header');

  const collapseArrow = document.createElement('span');
  collapseArrow.classList.add('collapse-arrow');

  const headerGrid = document.createElement('div');
  headerGrid.classList.add('building-card-header-grid');

  const headerMain = document.createElement('div');
  headerMain.classList.add('building-header-main');

  const headerSteps = document.createElement('div');
  headerSteps.classList.add('building-header-steps');

  const headerActive = document.createElement('div');
  headerActive.classList.add('building-header-active');

  const headerAuto = document.createElement('div');
  headerAuto.classList.add('building-header-auto');

  headerGrid.appendChild(headerMain);
  headerGrid.appendChild(headerActive);
  headerGrid.appendChild(headerSteps);
  headerGrid.appendChild(headerAuto);

  const cardBody = document.createElement('div');
  cardBody.classList.add('card-body', 'building-card-body');

  const grid = document.createElement('div');
  grid.classList.add('building-card-grid');
  cardBody.appendChild(grid);

  const controlsColumn = document.createElement('div');
  controlsColumn.classList.add('building-card-column', 'building-card-controls');

  const automationColumn = document.createElement('div');
  automationColumn.classList.add('building-card-column', 'building-card-automation');

  grid.appendChild(structureRow);
  grid.appendChild(controlsColumn);
  grid.appendChild(automationColumn);

  // Initialize and seed per-structure UI cache
  structureUIElements[structure.name] = structureUIElements[structure.name] || {};
  const cached = structureUIElements[structure.name];
  cached.combinedRow = combinedStructureRow;
  cached.row = structureRow;
  cached.collapsed = !!structureDisplayState.collapsed[structure.name];
  cached.collapseArrow = collapseArrow;
  cached.headerActive = headerActive;

  collapseArrow.textContent = cached.collapsed ? '▶' : '▼';
  headerActive.style.display = cached.collapsed ? 'inline-flex' : 'none';

  const button = document.createElement('button');
  button.id = `build-${structure.name}`;
  button.classList.add('building-button', 'building-header-button');
  // Initial button text with a dedicated span for the build count to keep width stable
  button.textContent = '';
  button.append('Build ');
  const countSpan = document.createElement('span');
  countSpan.classList.add('build-button-count');
  countSpan.textContent = '1';
  button.appendChild(countSpan);
  button._countSpan = countSpan;
  const nameNode = document.createTextNode(` ${structure.displayName}`);
  button.appendChild(nameNode);
  button.buttonNameNode = nameNode;

  cached.buildButton = button;

  headerMain.appendChild(button);
  headerActive.textContent = structure.canBeToggled
    ? `${formatBuildingCount(structure.active)}/${formatBuildingCount(structure.count)}`
    : `${formatBuildingCount(structure.count)}`;

  cardHeader.appendChild(collapseArrow);
  cardHeader.appendChild(headerGrid);
  combinedStructureRow.appendChild(cardHeader);
  combinedStructureRow.appendChild(cardBody);

  let selectedBuildCount = 1;
  selectedBuildCounts[structure.name] = selectedBuildCount;
  // Set initial button text and color based on affordability
  const manualBuildCount = getManualBuildCount(structure, selectedBuildCount);
  updateStructureButtonText(button, structure, manualBuildCount);

  button.addEventListener('click', function () {
    const manualBuildCount = getManualBuildCount(structure, selectedBuildCounts[structure.name]);
    buildCallback(structure.name, manualBuildCount);
    const refreshedBuildCount = getManualBuildCount(structure, selectedBuildCounts[structure.name]);
    updateStructureButtonText(button, structure, refreshedBuildCount);
    updateStructureCostDisplay(costElement, structure, refreshedBuildCount);
    updateProductionConsumptionDetails(structure, productionConsumptionDetails, refreshedBuildCount);
    if (isColony && upgradeButton) {
      updateUpgradeButton(upgradeButton, structure);
    }
  });

  // Create build count buttons
  const buildCountButtons = document.createElement('div');
  buildCountButtons.classList.add('build-count-buttons', 'building-control-group');
  const divideButton = document.createElement('button');
  divideButton.textContent = '/10';
  divideButton.addEventListener('click', function () {
    selectedBuildCounts[structure.name] = divideByTen(selectedBuildCounts[structure.name]);
    const manualBuildCount = getManualBuildCount(structure, selectedBuildCounts[structure.name]);
    updateStructureButtonText(button, structure, manualBuildCount);
    updateStructureCostDisplay(costElement, structure, manualBuildCount);
    updateProductionConsumptionDetails(structure, productionConsumptionDetails, manualBuildCount);
    if (structure.canBeToggled) {
      updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
      updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
    }
    if (isColony && upgradeButton) {
      updateUpgradeButton(upgradeButton, structure);
    }
  });
  buildCountButtons.appendChild(divideButton);

  const multiplyButton = document.createElement('button');
  multiplyButton.textContent = 'x10';
  multiplyButton.addEventListener('click', function () {
    selectedBuildCounts[structure.name] = multiplyByTen(selectedBuildCounts[structure.name]);
    const manualBuildCount = getManualBuildCount(structure, selectedBuildCounts[structure.name]);
    updateStructureButtonText(button, structure, manualBuildCount);
    updateStructureCostDisplay(costElement, structure, manualBuildCount);
    updateProductionConsumptionDetails(structure, productionConsumptionDetails, manualBuildCount);
    if (structure.canBeToggled) {
      updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
      updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
    }
    if (isColony && upgradeButton) {
      updateUpgradeButton(upgradeButton, structure);
    }
  });
  buildCountButtons.appendChild(multiplyButton);
  headerSteps.appendChild(buildCountButtons);

  const autoBuildHeaderContainer = document.createElement('div');
  autoBuildHeaderContainer.classList.add('auto-build-header-container');

  const autoBuildHeaderLabel = document.createElement('label');
  autoBuildHeaderLabel.classList.add('auto-build-header-label');

  const autoBuildCheckbox = document.createElement('input');
  autoBuildCheckbox.type = 'checkbox';
  autoBuildCheckbox.classList.add('auto-build-checkbox');
  autoBuildCheckbox.checked = structure.autoBuildEnabled;

  autoBuildCheckbox.addEventListener('change', () => {
    structure.autoBuildEnabled = autoBuildCheckbox.checked;
    if (autoBuildCheckbox.checked && typeof gameSettings !== 'undefined' && gameSettings.autobuildAlsoSetsActive) {
      autoActiveCheckbox.checked = true;
      structure.autoActiveEnabled = true;
    }
    // Additional logic for enabling/disabling auto-build can go here
  });

  autoBuildHeaderLabel.appendChild(autoBuildCheckbox);
  autoBuildHeaderLabel.appendChild(document.createTextNode('Auto-build'));
  autoBuildHeaderContainer.appendChild(autoBuildHeaderLabel);

  const autoBuildInput = document.createElement('input');
  autoBuildInput.type = 'number';
  autoBuildInput.value = isAutoBuildFillMode(structure) ? structure.autoBuildFillPercent : structure.autoBuildPercent;
  autoBuildInput.step = 0.01; // Allow 0.01 steps for finer control
  autoBuildInput.classList.add('auto-build-input', 'auto-build-header-input');

  autoBuildInput.addEventListener('input', () => {
    const autoBuildPercent = parseFloat(autoBuildInput.value);
    const nextValue = Math.max(0, autoBuildPercent || 0);
    if (isAutoBuildFillMode(structure)) {
      const normalized = Math.min(100, nextValue);
      structure.autoBuildFillPercent = normalized;
      if (normalized !== autoBuildPercent) {
        autoBuildInput.value = `${normalized}`;
      }
    } else {
      structure.autoBuildPercent = nextValue;
      if (nextValue !== autoBuildPercent) {
        autoBuildInput.value = `${nextValue}`;
      }
    }
    refreshAutoBuildTarget(structure);
  });

  const autoBuildBasisSelect = document.createElement('select');
  autoBuildBasisSelect.classList.add('auto-build-basis');
  if (structure.autoBuildFillEnabled) {
    const fillOption = document.createElement('option');
    fillOption.value = 'fill';
    fillOption.textContent = '% filled';
    autoBuildBasisSelect.appendChild(fillOption);
  }
  const popOption = document.createElement('option');
  popOption.value = 'population';
  popOption.textContent = '% of pop';
  autoBuildBasisSelect.appendChild(popOption);
  const workerOption = document.createElement('option');
  workerOption.value = 'workers';
  workerOption.textContent = '% of workers';
  autoBuildBasisSelect.appendChild(workerOption);
  if (Array.isArray(structure.automationBuildingsDropDown)) {
    structure.automationBuildingsDropDown.forEach(name => {
      const option = document.createElement('option');
      option.value = `building:${name}`;
      const displayName = (buildings[name] && buildings[name].displayName) || name;
      option.textContent = `% of ${displayName}`;
      autoBuildBasisSelect.appendChild(option);
    });
  }
  if (structure.autoBuildMaxOption) {
    const maxOption = document.createElement('option');
    maxOption.value = 'max';
    maxOption.textContent = 'Max';
    autoBuildBasisSelect.appendChild(maxOption);
  }
  autoBuildBasisSelect.value = resolveAutoBuildBasisValue(structure, autoBuildBasisSelect);

  autoBuildHeaderContainer.appendChild(autoBuildInput);
  autoBuildHeaderContainer.appendChild(autoBuildBasisSelect);
  headerAuto.appendChild(autoBuildHeaderContainer);
  autoBuildHeaderContainer.style.display = globalEffects.isBooleanFlagSet('automateConstruction') ? 'flex' : 'none';
  cached.autoBuildHeaderContainer = autoBuildHeaderContainer;
  structureUIElements[structure.name].autoBuildCheckbox = autoBuildCheckbox;
  structureUIElements[structure.name].autoBuildInput = autoBuildInput;

  const controlsLabel = document.createElement('div');
  controlsLabel.classList.add('building-controls-label');
  controlsLabel.textContent = 'Controls';
  controlsColumn.appendChild(controlsLabel);

  const customControlsContainer = document.createElement('div');
  customControlsContainer.classList.add('building-custom-controls');
  controlsColumn.appendChild(customControlsContainer);

  const { structureControls, increaseButton, decreaseButton } = createStructureControls(structure, toggleCallback, isColony);
  cached.increaseButton = increaseButton;
  cached.decreaseButton = decreaseButton;

  if (structure.canBeToggled) {
    const toggleControlsWrapper = document.createElement('div');
    toggleControlsWrapper.classList.add('toggle-controls-wrapper');
    toggleControlsWrapper.appendChild(structureControls);
    controlsColumn.appendChild(toggleControlsWrapper);
  }

  const controlActionRow = document.createElement('div');
  controlActionRow.classList.add('building-control-actions');
  controlsColumn.appendChild(controlActionRow);

  const hideButton = document.createElement('button');
  hideButton.classList.add('hide-button');
  hideButton.textContent = 'Hide';
  hideButton.addEventListener('click', function () {
    structure.isHidden = true;
    disableStructureAutomations(structure, isColony);
    updateStructureHiddenPreference(structure.name, true);
    updateUnhideButtons();
    if (isColony) {
      updateColonyDisplay(colonies);
    } else {
      updateBuildingDisplay(buildings);
    }
  });
  hideButton.disabled = structure.active > 0;
  controlActionRow.appendChild(hideButton);
  cached.hideButton = hideButton;

  let upgradeButton = null;
  if (isColony) {
    upgradeButton = document.createElement('button');
    upgradeButton.id = `${structure.name}-upgrade-button`;
    upgradeButton.classList.add('upgrade-button');
    upgradeButton.addEventListener('click', function () {
      const upgrades = Math.max(1, selectedBuildCounts[structure.name] / 10 || 1);
      if (structure.upgrade && structure.upgrade(upgrades)) {
        updateStructureDisplay(colonies);
      }
    });
    controlActionRow.appendChild(upgradeButton);
    cached.upgradeButton = upgradeButton;
  }

  if (typeof structure.initializeCustomUI === 'function') {
    structure.initializeCustomUI({
      leftContainer: customControlsContainer,
      hideButton,
      cachedElements: cached
    });
  }

  // Reverse button to the right of Hide
  const reverseInlineBtn = document.createElement('button');
  reverseInlineBtn.classList.add('reverse-button');
  reverseInlineBtn.id = `${structure.name}-reverse-button`;
  reverseInlineBtn.textContent = 'Reverse';
  reverseInlineBtn.style.display = structure.reversalAvailable ? 'inline-block' : 'none';
  reverseInlineBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Toggle reversal state only; recipe toggling is handled by automation logic when needed
    if (typeof structure.setReverseEnabled === 'function') {
      structure.setReverseEnabled(!structure.reverseEnabled);
    } else {
      structure.reverseEnabled = !structure.reverseEnabled;
    }
    if (typeof updateBuildingDisplay === 'function') {
      updateBuildingDisplay(buildings);
    }
  });
  controlActionRow.appendChild(reverseInlineBtn);
  cached.reverseButton = reverseInlineBtn;

  const costElement = document.createElement('div');
  costElement.classList.add('structure-cost');
  costElement.classList.add('small-text'); // Add the 'small-text' class
  updateStructureCostDisplay(costElement, structure, getManualBuildCount(structure, selectedBuildCounts[structure.name]));
  structureRow.appendChild(costElement);
  // Cache the cost element for faster updates
  structureUIElements[structure.name] = structureUIElements[structure.name] || {};
  structureUIElements[structure.name].costElement = costElement;
  cached.costElement = costElement;

  const productionConsumptionDetails = document.createElement('div');
  productionConsumptionDetails.classList.add('building-production-consumption');
  productionConsumptionDetails.classList.add('small-text'); // Add the 'small-text' class
  productionConsumptionDetails.id = `${structure.name}-production-consumption`;
  updateProductionConsumptionDetails(structure, productionConsumptionDetails, getManualBuildCount(structure, selectedBuildCounts[structure.name]));
  structureRow.appendChild(productionConsumptionDetails);
  cached.productionDetails = productionConsumptionDetails;

  const constructedCountContainer = document.createElement('div');
  constructedCountContainer.classList.add('constructed-count-container');

  const constructedInfo = document.createElement('div');
  constructedInfo.classList.add('constructed-info');

  // Create a new element for displaying the number of constructed buildings and productivity
  const constructedCountElement = document.createElement('div');
  constructedCountElement.classList.add('constructed-count');
  constructedCountElement.classList.add('small-text'); // Add the 'small-text' class


  if (structure.canBeToggled) {
    constructedCountElement.innerHTML = `
      <strong>Constructed:</strong> <span id="${structure.name}-count-active">${formatBuildingCount(structure.active)}/${formatBuildingCount(structure.count)}</span>
    `;
  } else {
    constructedCountElement.innerHTML = `
      <strong>Constructed:</strong> <span id="${structure.name}-count">${formatBuildingCount(structure.count)}</span>
    `;
  }

  constructedInfo.appendChild(constructedCountElement);

  // Conditionally display productivity if requiresProductivity is true
  if (structure.requiresProductivity) {
    const productivityContainer = document.createElement('div');
    productivityContainer.classList.add('productivity-container');

    const productivityLabel = document.createElement('span');
    productivityLabel.innerHTML = `<strong>Productivity:</strong> `;
    productivityContainer.appendChild(productivityLabel);

    const productivityValue = document.createElement('span');
    productivityValue.id = `${structure.name}-productivity`;
    productivityValue.textContent = `${Math.round(structure.productivity * 100)}%`;
    productivityContainer.appendChild(productivityValue);

    if (structure.name === 'biodome') {
      const warning = document.createElement('span');
      warning.id = `${structure.name}-life-warning`;
      warning.classList.add('biodome-life-warning');
      warning.textContent = '⚠ Requires Active Life Design ⚠';
      warning.style.display = 'none';
      productivityContainer.appendChild(warning);
      structureUIElements[structure.name] = structureUIElements[structure.name] || {};
      structureUIElements[structure.name].lifeWarning = warning;
    }

    if (structure.dayNightActivity && !(typeof gameSettings !== 'undefined' && gameSettings.disableDayNightCycle)) {
      const dayNightIcon = document.createElement('span');
      dayNightIcon.id = `${structure.name}-day-night-icon`;
      dayNightIcon.classList.add('day-night-icon');
      dayNightIcon.textContent = dayNightCycle.isDay() ? '☀️' : '🌙';
      productivityContainer.appendChild(dayNightIcon);
    }

    constructedInfo.appendChild(productivityContainer);
  }

  constructedCountContainer.appendChild(constructedInfo);

  structureRow.appendChild(constructedCountContainer);

  const description = document.createElement('p');
  description.classList.add('building-description');
  description.textContent = structure.description;
  structureRow.appendChild(description);
  cached.descriptionElement = description;

  // Custom colony display (e.g., baseComfort, energy, food, water) if the structure is a colony
  if (isColony) {
    const colonyRow = document.createElement('div');
    colonyRow.classList.add('building-colony-row');
    const colonyDetails = createColonyDetails(structure);
    colonyRow.appendChild(colonyDetails);
    cardBody.appendChild(colonyRow);
    cached.colonyRow = colonyRow;
  }

  //Autobuild feature, unlocked by research
  const autoBuildContainer = document.createElement('div');
  autoBuildContainer.id = `${structure.name}-auto-build-container`;
  autoBuildContainer.classList.add('auto-build-container');

  const autoBuildPriorityLabel = document.createElement('label');
  autoBuildPriorityLabel.classList.add('auto-build-priority-label');
  autoBuildPriorityLabel.textContent = 'Prioritize';
  const autoBuildPriority = document.createElement('input');
  autoBuildPriority.type = 'checkbox';
  autoBuildPriority.classList.add('auto-build-priority');
  autoBuildPriority.id = `${structure.name}-auto-build-priority`;
  autoBuildPriority.checked = structure.autoBuildPriority;
  autoBuildPriority.addEventListener('change', () => {
    structure.autoBuildPriority = autoBuildPriority.checked;
  });
  autoBuildPriorityLabel.prepend(autoBuildPriority);
  structureUIElements[structure.name].autoBuildPriority = autoBuildPriority;

  structureUIElements[structure.name].autoBuildBasisSelect = autoBuildBasisSelect;

  const autoBuildControlsRow = document.createElement('div');
  autoBuildControlsRow.classList.add('auto-build-controls-row');
  autoBuildContainer.appendChild(autoBuildControlsRow);

  const autoBuildInputWrapper = document.createElement('div');
  autoBuildInputWrapper.classList.add('auto-build-input-wrapper');
  autoBuildControlsRow.appendChild(autoBuildInputWrapper);

  updateAutoBuildInputState(structure, autoBuildBasisSelect, autoBuildInput);

  const autoBuildStepControls = createAutoBuildStepControls(structure, autoBuildInput);
  autoBuildInputWrapper.appendChild(autoBuildStepControls.grid);
  autoBuildInputWrapper.appendChild(autoBuildPriorityLabel);
  structureUIElements[structure.name].autoBuildStepIncrement = autoBuildStepControls.incrementButton;
  structureUIElements[structure.name].autoBuildStepDecrement = autoBuildStepControls.decrementButton;
  structureUIElements[structure.name].autoBuildStepMultiply = autoBuildStepControls.multiplyButton;
  structureUIElements[structure.name].autoBuildStepDivide = autoBuildStepControls.divideButton;

  autoBuildBasisSelect.addEventListener('change', () => {
    structure.autoBuildBasis = autoBuildBasisSelect.value;
    updateAutoBuildInputState(structure, autoBuildBasisSelect, autoBuildInput);
    if (document.activeElement !== autoBuildInput) {
      autoBuildInput.value = isAutoBuildFillMode(structure)
        ? `${structure.autoBuildFillPercent || 0}`
        : `${structure.autoBuildPercent || 0}`;
    }
    refreshAutoBuildTarget(structure);
  });

  structureUIElements[structure.name].autoBuildInput = autoBuildInput;

  const autoBuildTarget = document.createElement('span');
  const autoBuildTargetContainer = document.createElement('div');
  autoBuildTargetContainer.classList.add('auto-build-target-container');

  autoBuildTarget.classList.add('auto-build-target');
  autoBuildTarget.id = `${structure.name}-auto-build-target`;
  autoBuildTarget.textContent = 'Target : 0';
  autoBuildTargetContainer.appendChild(autoBuildTarget);
  cached.autoBuildTarget = autoBuildTarget;

  let autoUpgradeContainer = null;
  if (isColony) {
    autoUpgradeContainer = document.createElement('label');
    autoUpgradeContainer.classList.add('auto-upgrade-container');
    autoUpgradeContainer.style.display = 'none';

    const autoUpgradeCheckbox = document.createElement('input');
    autoUpgradeCheckbox.type = 'checkbox';
    autoUpgradeCheckbox.classList.add('auto-upgrade-checkbox');
    autoUpgradeCheckbox.addEventListener('change', () => {
      structure.autoUpgradeEnabled = autoUpgradeCheckbox.checked;
    });

    autoUpgradeContainer.appendChild(autoUpgradeCheckbox);
    autoUpgradeContainer.appendChild(document.createTextNode('Auto-upgrade'));

    structureUIElements[structure.name].autoUpgradeCheckbox = autoUpgradeCheckbox;
    structureUIElements[structure.name].autoUpgradeContainer = autoUpgradeContainer;
  }

  const setActiveButton = document.createElement('button');
  setActiveButton.id = `${structure.name}-set-active-button`;
  setActiveButton.classList.add('auto-build-setactive-button');

  const setActiveLabel = document.createElement('span');
  setActiveLabel.textContent = 'Set active to target';

  const autoActiveCheckbox = document.createElement('input');
  autoActiveCheckbox.type = 'checkbox';
  autoActiveCheckbox.classList.add('auto-active-checkbox');
  autoActiveCheckbox.checked = structure.autoActiveEnabled;
  autoActiveCheckbox.addEventListener('change', (e) => {
    e.stopPropagation();
    structure.autoActiveEnabled = autoActiveCheckbox.checked;
  });
  autoActiveCheckbox.addEventListener('click', e => e.stopPropagation());
  structureUIElements[structure.name].autoActiveCheckbox = autoActiveCheckbox;
  structureUIElements[structure.name].setActiveButton = setActiveButton;

  setActiveButton.appendChild(autoActiveCheckbox);
  setActiveButton.appendChild(setActiveLabel);

  setActiveButton.addEventListener('click', () => {
    const pop = resources.colony.colonists.value;
    const workerCap = resources.colony.workers?.cap || 0;
    const baseCollection = typeof buildings !== 'undefined' ? buildings : undefined;
    const usesFillMode = isAutoBuildFillMode(structure);
    const base = usesFillMode ? 0 : getAutoBuildBaseValue(structure, pop, workerCap, baseCollection);
    const targetCount = usesFillMode
      ? structure.count
      : Math.ceil((structure.autoBuildPercent * base || 0) / 100);
    const desiredActive = Math.min(targetCount, structure.count);
    const change = desiredActive - structure.active;
    adjustStructureActivation(structure, change);
    updateBuildingDisplay(buildings);
  });

  autoBuildTargetContainer.appendChild(setActiveButton);
  autoBuildContainer.appendChild(autoBuildTargetContainer);

  let autoBuildFillContainer = null;
  if (structure.autoBuildFillResourceFilters) {
    autoBuildFillContainer = document.createElement('div');
    autoBuildFillContainer.classList.add('auto-build-fill-container');

    const buildFillSelect = (labelText, defaultValue) => {
      const wrapper = document.createElement('label');
      wrapper.classList.add('auto-build-fill-select');
      const label = document.createElement('span');
      label.textContent = labelText;
      const select = document.createElement('select');
      select.classList.add('auto-build-fill-dropdown');

      const anyOption = document.createElement('option');
      anyOption.value = 'any';
      anyOption.textContent = 'Any';
      select.appendChild(anyOption);

      const noneOption = document.createElement('option');
      noneOption.value = 'none';
      noneOption.textContent = 'None';
      select.appendChild(noneOption);

      for (const category in structure.storage) {
        const storageForCategory = structure.storage[category] || {};
        for (const resourceName in storageForCategory) {
          const option = document.createElement('option');
          option.value = resourceName;
          const displayName = resources[category][resourceName].displayName || resourceName;
          option.textContent = displayName;
          select.appendChild(option);
        }
      }

      select.value = defaultValue;
      wrapper.appendChild(label);
      wrapper.appendChild(select);
      return { wrapper, select };
    };

    const primarySelect = buildFillSelect('Primary', structure.autoBuildFillResourcePrimary || 'any');
    const secondarySelect = buildFillSelect('Secondary', structure.autoBuildFillResourceSecondary || 'none');

    primarySelect.select.addEventListener('change', () => {
      structure.autoBuildFillResourcePrimary = primarySelect.select.value;
      refreshAutoBuildTarget(structure);
    });

    secondarySelect.select.addEventListener('change', () => {
      structure.autoBuildFillResourceSecondary = secondarySelect.select.value;
      refreshAutoBuildTarget(structure);
    });

    autoBuildFillContainer.appendChild(primarySelect.wrapper);
    autoBuildFillContainer.appendChild(secondarySelect.wrapper);
    autoBuildContainer.appendChild(autoBuildFillContainer);

    cached.autoBuildFillContainer = autoBuildFillContainer;
    cached.autoBuildFillPrimary = primarySelect.select;
    cached.autoBuildFillSecondary = secondarySelect.select;
  }

  if (autoUpgradeContainer) {
    autoBuildContainer.appendChild(autoUpgradeContainer);
  }
  cached.autoBuildContainer = autoBuildContainer;

  // Reversal toggle button (for buildings that support it)
  const reverseControl = document.createElement('div');
  reverseControl.classList.add('reverse-control');

  reverseControl.style.display = structure.reversalAvailable ? 'inline-block' : 'none';
  autoBuildContainer.appendChild(reverseControl);
  cached.reverseControl = reverseControl;

  structure.initUI?.(autoBuildContainer, cached);

  automationColumn.appendChild(autoBuildContainer);

  refreshAutoBuildTarget(structure);

  const toggleCollapse = () => {
    cached.collapsed = !cached.collapsed;
    applyCollapseState(structure.name);
  };

  collapseArrow.addEventListener('click', toggleCollapse);

  applyCollapseState(structure.name);

  return combinedStructureRow;
}

function disableAutoActive(structure) {
  const els = structureUIElements[structure.name] || {};
  let checkbox = els.autoActiveCheckbox;
  if (!checkbox) {
    const btn = document.getElementById(`${structure.name}-set-active-button`);
    if (btn && btn.getElementsByClassName) {
      const list = btn.getElementsByClassName('auto-active-checkbox');
      if (list && list.length) checkbox = list[0];
    }
  }
  if (checkbox) {
    checkbox.checked = false;
  }
  structure.autoActiveEnabled = false;
}

function disableStructureAutomations(structure, isColony) {
  const els = structureUIElements[structure.name] || {};
  if (els.autoBuildCheckbox) {
    els.autoBuildCheckbox.checked = false;
  }
  structure.autoBuildEnabled = false;

  if (isColony) {
    if (els.autoUpgradeCheckbox) {
      els.autoUpgradeCheckbox.checked = false;
    }
    structure.autoUpgradeEnabled = false;
  }
}

// Create structure controls for buildings and colonies
function createStructureControls(structure, toggleCallback) {
  const structureControls = document.createElement('div');
  structureControls.classList.add('building-controls');
  structureControls.classList.add('toggle-controls');

  let increaseButton = null;
  let decreaseButton = null;
  let zeroButton = null;
  let maxButton = null;

  if (structure.canBeToggled) {

    zeroButton = document.createElement('button');
    zeroButton.id = `${structure.name}-zero-button`;
    zeroButton.textContent = '0';
    zeroButton.addEventListener('click', function () {
      toggleCallback(structure, -structure.active);
      disableAutoActive(structure);
    });
    structureControls.appendChild(zeroButton);

    decreaseButton = document.createElement('button');
    decreaseButton.id = `${structure.name}-decrease-button`;
    decreaseButton.textContent = '-1';
    decreaseButton.addEventListener('click', function () {
      toggleCallback(structure, -selectedBuildCounts[structure.name]);
      updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
      disableAutoActive(structure);
    });

    increaseButton = document.createElement('button');
    increaseButton.id = `${structure.name}-increase-button`;
    increaseButton.textContent = '+1';
    increaseButton.addEventListener('click', function () {
      toggleCallback(structure, selectedBuildCounts[structure.name]);
      updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
      disableAutoActive(structure);
    });

    structureControls.appendChild(decreaseButton);
    structureControls.appendChild(increaseButton);

    maxButton = document.createElement('button');
    maxButton.textContent = 'Max';
    maxButton.addEventListener('click', function () {
      toggleCallback(structure, structure.count - structure.active);
      disableAutoActive(structure);
    });
    structureControls.appendChild(maxButton);
  }

  return { structureControls, increaseButton, decreaseButton, zeroButton, maxButton };
}

// Update the text of the increase button based on the selected build count
function updateIncreaseButtonText(button, buildCount) {
  button.textContent = `+${formatNumber(buildCount, true)}`;
}

// Update the text of the decrease button based on the selected build count
function updateDecreaseButtonText(button, buildCount) {
  button.textContent = `-${formatNumber(buildCount, true)}`;
}
  
  function updateBuildingDisplay(buildings) {
    updateStructureDisplay(buildings);
    updateEmptyBuildingMessages();
    updateBuildingSubtabsVisibility();
  }
  
  function updateStructureButtonText(button, structure, buildCount = 1) {
    if (!button) return;
    const canAfford = structure.canAfford(buildCount);
    let countSpan = button._countSpan;
    const newCount = formatNumber(buildCount, true);
    // Rebuild the button label structure if expected nodes are missing
    if (!countSpan || !button.buttonNameNode) {
      button.textContent = '';
      button.append('Build ');
      countSpan = document.createElement('span');
      countSpan.classList.add('build-button-count');
      button.appendChild(countSpan);
      const nameNodeNew = document.createTextNode('');
      button.appendChild(nameNodeNew);
      button.buttonNameNode = nameNodeNew;
      button._countSpan = countSpan;
    }
    if (countSpan.textContent !== newCount) {
      countSpan.textContent = newCount;
    }

    const nameNode = button.buttonNameNode;
    const desiredName = ` ${structure.displayName}`;
    if (nameNode.textContent !== desiredName) {
      nameNode.textContent = desiredName;
    }

    const newColor = canAfford ? 'inherit' : 'red';
    if (button.style.color !== newColor) {
      button.style.color = newColor;
    }
  }

  function updateUpgradeButton(button, colony) {
    if (!button || !(colony instanceof Colony)) return;

    const nextName = colony.getNextTierName();
    const next = nextName ? colonies[nextName] : null;

    if (!next || !next.unlocked) {
      button.style.display = 'none';
      return;
    }

    const upgradeCount = Math.max(1, selectedBuildCounts[colony.name] / 10 || 1);
    const amount = Math.min(upgradeCount * 10, colony.count);
    const cost = colony.getUpgradeCost(upgradeCount);
    if (!cost) {
      button.style.display = 'none';
      return;
    }

    const items = [];
    for (const category in cost) {
      for (const resource in cost[category]) {
        let available = resources[category][resource]?.value || 0;
        if (resource === 'land') {
          available -= resources[category][resource].reserved;
        }
        items.push({
          key: `${category}.${resource}`,
          text: `${capitalizeFirstLetter(resource)}: ${formatNumber(cost[category][resource], true)}`,
          hasEnough: available >= cost[category][resource]
        });
      }
    }

    const keyString = items.map(i => i.key).sort().join(',');
    let list = button._list;
    const amountString = `${amount}`;
    if (button.dataset.keys !== keyString || button.dataset.amount !== amountString) {
      button.dataset.keys = keyString;
      button.dataset.amount = amountString;
      button.textContent = '';
      button.append('Upgrade ');
      button.append(`${formatNumber(amount, true)} \u2192 ${formatNumber(upgradeCount, true)} `);
      list = document.createElement('span');
      button.appendChild(list);
      button._list = list;
      button._spans = new Map();
      items.forEach((item, idx) => {
        const span = document.createElement('span');
        list.appendChild(span);
        button._spans.set(item.key, span);
        if (idx < items.length - 1) {
          list.appendChild(document.createTextNode(', '));
        }
      });
    }

    items.forEach(item => {
      const span = button._spans.get(item.key);
      if (!span) return;
      if (span.textContent !== item.text) {
        span.textContent = item.text;
      }
      const color = item.hasEnough ? '' : 'red';
      if (span.style.color !== color) {
        span.style.color = color;
      }
    });

    const canAfford = colony.canAffordUpgrade(upgradeCount);
    button.disabled = !canAfford;
    button.style.display = 'inline-block';
    button.style.color = '';
  }
  
  function formatRwgMultiplierSource(sourceId) {
    const id = String(sourceId || '');
    if (!id.startsWith('rwg-')) return null;
    const type = id.slice(4).replace(/-/g, ' ');
    const name = type.replace(/\b\w/g, char => char.toUpperCase());
    return name ? `Random World: ${name}` : 'Random World';
  }

  function resolveCostMultiplierSourceName(effect) {
    const rwgName = formatRwgMultiplierSource(effect.sourceId);
    const skillName = skillManager?.skills?.[effect.sourceId]?.name;
    const awakeningName = skillName ? `Awakening: ${skillName}` : null;
    return effect.name
      ?? effect.sourceName
      ?? awakeningName
      ?? effect.sourceId?.displayName
      ?? effect.sourceId?.name
      ?? researchManager.getResearchById(effect.sourceId)?.name
      ?? projectManager.projects?.[effect.sourceId]?.displayName
      ?? projectManager.projects?.[effect.sourceId]?.name
      ?? buildings[effect.sourceId]?.displayName
      ?? buildings[effect.sourceId]?.name
      ?? colonies[effect.sourceId]?.displayName
      ?? colonies[effect.sourceId]?.name
      ?? rwgName
      ?? effect.effectId
      ?? 'Unknown effect';
  }

  function buildStructureCostTooltip(structure, category, resource, buildCount) {
    const baseCost = structure.cost?.[category]?.[resource] ?? 0;
    const totalBaseCost = baseCost * buildCount;
    const lines = [`Base cost: ${formatNumber(totalBaseCost, true)}`];
    const multipliers = [];

    structure.activeEffects.forEach(effect => {
      if (effect.type !== 'resourceCostMultiplier') return;
      if (effect.resourceCategory !== category) return;
      const matchesResource = effect.resourceId === resource
        || (Array.isArray(effect.resourceId) && effect.resourceId.includes(resource));
      if (!matchesResource) return;
      if (effect.value === 1) return;
      multipliers.push({
        name: resolveCostMultiplierSourceName(effect),
        value: effect.value
      });
    });

    if (multipliers.length) {
      lines.push('Multipliers:');
      multipliers.forEach(multiplier => {
        lines.push(`- ${multiplier.name}: x${formatNumber(multiplier.value, false, 3)}`);
      });
    } else {
      lines.push('Multipliers: none');
    }

    return lines.join('\n');
  }

  function buildStructureMaintenanceTooltip(structure, resource, buildCount) {
    const effectiveCost = structure.getEffectiveCost(buildCount);
    const totalBaseCost = effectiveCost?.colony?.[resource] ?? 0;
    const baseMaintenanceMultiplier = maintenanceFraction * structure.maintenanceFactor;
    const lines = [
      `Base cost: ${formatNumber(totalBaseCost, true)}`,
      `Innate maintenance multiplier: x${baseMaintenanceMultiplier}`
    ];
    const multipliers = [];

    structure.activeEffects.forEach(effect => {
      if (effect.type === 'maintenanceCostMultiplier') {
        if (effect.resourceCategory !== 'colony') return;
        const matchesResource = effect.resourceId === resource
          || (Array.isArray(effect.resourceId) && effect.resourceId.includes(resource));
        if (!matchesResource) return;
        if (effect.value === 1) return;
        multipliers.push({
          name: resolveCostMultiplierSourceName(effect),
          value: effect.value
        });
        return;
      }
      if (effect.type === 'maintenanceMultiplier') {
        if (effect.value === 1) return;
        multipliers.push({
          name: resolveCostMultiplierSourceName(effect),
          value: effect.value
        });
      }
    });

    const resourceMultiplier = resources.colony[resource].maintenanceMultiplier;
    if (resourceMultiplier !== 1) {
      const resourceLabel = resources.colony[resource].displayName || resource;
      multipliers.push({
        name: `${resourceLabel} modifier`,
        value: resourceMultiplier
      });
    }

    if (multipliers.length) {
      lines.push('Multipliers:');
      multipliers.forEach(multiplier => {
        lines.push(`- ${multiplier.name}: x${formatNumber(multiplier.value, false, 3)}`);
      });
    } else {
      lines.push('Multipliers: none');
    }

    return lines.join('\n');
  }

  function buildStructureWorkerTooltip(structure, buildCount) {
    const baseWorkers = structure.requiresWorker * buildCount;
    const addedWorkers = structure.getAddedWorkerNeed() * buildCount;
    const lines = [`Base workers: ${formatNumber(baseWorkers, true)}`];
    if (addedWorkers > 0) {
      lines.push(`Added workers: ${formatNumber(addedWorkers, true)}`);
    }
    const multipliers = [];

    structure.activeEffects.forEach(effect => {
      if (effect.type !== 'workerMultiplier') return;
      if (effect.value === 1) return;
      multipliers.push({
        name: resolveCostMultiplierSourceName(effect),
        value: effect.value
      });
    });

    if (multipliers.length) {
      lines.push('Multipliers:');
      multipliers.forEach(multiplier => {
        lines.push(`- ${multiplier.name}: x${formatNumber(multiplier.value, false, 3)}`);
      });
    } else {
      lines.push('Multipliers: none');
    }

    return lines.join('\n');
  }

  function updateStructureCostDisplay(costElement, structure, buildCount = 1) {
    if (!costElement) return;
    const items = [];

    const effectiveCost = structure.getEffectiveCost();
    for (const category in effectiveCost) {
      for (const resource in effectiveCost[category]) {
        items.push({
          key: `${category}.${resource}`,
          label: capitalizeFirstLetter(resource),
          required: effectiveCost[category][resource],
          available: resources[category][resource]?.value || 0,
          insufficientColor: 'red',
          category,
          resource,
          isCostResource: true
        });
      }
    }

    if (structure.getTotalWorkerNeed() > 0) {
      items.push({
        key: 'colony.workers',
        label: 'Workers',
        required: structure.getTotalWorkerNeed() * structure.getEffectiveWorkerMultiplier(),
        available: resources.colony.workers?.value || 0,
        insufficientColor: 'orange',
        isWorkerRequirement: true
      });
    }

    if (structure.requiresLand) {
      const requiredLand = structure.requiresLand * buildCount;
      items.push({
        key: 'colony.land',
        label: 'Land',
        required: structure.requiresLand,
        available: structure.canAffordLand(buildCount) ? requiredLand : 0,
        insufficientColor: 'red'
      });
    }

    if (structure.requiresDeposit) {
      const requiredDeposit = buildCount;
      items.push({
        key: 'deposit',
        label: 'Deposit',
        required: 1,
        available: structure.canAffordDeposit(buildCount) ? requiredDeposit : 0,
        insufficientColor: 'red'
      });
    }

    const keyString = items.map(i => i.key).sort().join(',');
    let list = costElement._list;
    if (costElement.dataset.keys !== keyString) {
      costElement.dataset.keys = keyString;
      costElement.textContent = '';
      const label = document.createElement('strong');
      label.textContent = 'Cost:';
      costElement.append(label, ' ');
      list = document.createElement('span');
      costElement.appendChild(list);
      costElement._list = list;
      costElement._spans = new Map();
      items.forEach((item, idx) => {
        const span = document.createElement('span');
        if (item.isCostResource) {
          const textSpan = document.createElement('span');
          span.classList.add('info-tooltip-icon');
          span.style.fontFamily = 'inherit';
          span.appendChild(textSpan);
          span._textSpan = textSpan;

          const tooltip = attachDynamicInfoTooltip(span, '');
          span._costTooltip = tooltip;
          span._costTooltipCache = {};
          span._updateCostTooltip = () => {
            const context = span._costTooltipContext;
            const text = buildStructureCostTooltip(
              context.structure,
              context.category,
              context.resource,
              context.buildCount
            );
            setTooltipText(tooltip, text, span._costTooltipCache, 'text');
          };
          span.addEventListener('mouseenter', span._updateCostTooltip);
          span.addEventListener('focusin', span._updateCostTooltip);
          span.addEventListener('pointerdown', span._updateCostTooltip);
        }
        costElement._spans.set(item.key, span);
        list.appendChild(span);
        if (idx < items.length - 1) {
          list.appendChild(document.createTextNode(', '));
        }
      });
    }

    items.forEach(item => {
      const requiredAmount = item.required * buildCount;
      const span = costElement._spans.get(item.key);
      if (!span) return;
      const text = `${item.label}: ${formatNumber(requiredAmount, true)}`;

      if (item.key === 'colony.workers') {
        let textSpan = span._textSpan;
        if (!textSpan) {
          textSpan = document.createElement('span');
          span._textSpan = textSpan;
          span.textContent = '';
          span.appendChild(textSpan);

          span.classList.add('info-tooltip-icon');
          span.style.fontFamily = 'inherit';
          const labelNode = document.createTextNode('');
          textSpan._labelNode = labelNode;
          textSpan.appendChild(labelNode);

          const tooltip = attachDynamicInfoTooltip(span, '');
          span._workerTooltip = tooltip;
          span._workerTooltipCache = {};
          span._updateWorkerTooltip = () => {
            const context = span._workerTooltipContext;
            const text = buildStructureWorkerTooltip(
              context.structure,
              context.buildCount
            );
            setTooltipText(tooltip, text, span._workerTooltipCache, 'text');
          };
          span.addEventListener('mouseenter', span._updateWorkerTooltip);
          span.addEventListener('focusin', span._updateWorkerTooltip);
          span.addEventListener('pointerdown', span._updateWorkerTooltip);

          const container = document.createElement('span');
          container.classList.add('worker-priority-container');
          const up = document.createElement('span');
          up.textContent = '\u25B2';
          up.classList.add('worker-priority-btn', 'up');
          const down = document.createElement('span');
          down.textContent = '\u25BC';
          down.classList.add('worker-priority-btn', 'down');

          const refresh = () => {
            up.classList.toggle('active', structure.workerPriority > 0);
            down.classList.toggle('active', structure.workerPriority < 0);
          };

          const setPriority = level => {
            structure.workerPriority = level;
            refresh();
            if (typeof populationModule !== 'undefined' && typeof populationModule.updateWorkerRequirements === 'function') {
              populationModule.updateWorkerRequirements();
              if (populationModule.workerResource) {
                populationModule.workerResource.value = populationModule.workerResource.cap - populationModule.totalWorkersRequired;
              }
            }
          };

          up.addEventListener('click', () => setPriority(structure.workerPriority > 0 ? 0 : 1));
          down.addEventListener('click', () => setPriority(structure.workerPriority < 0 ? 0 : -1));

          container.append(' (', up, down, ')');
          span.appendChild(container);
          span._priorityUp = up;
          span._priorityDown = down;
          span._refreshPriorityUI = refresh;
        }
        const labelNode = textSpan._labelNode;
        if (labelNode && labelNode.nodeValue !== text) {
          labelNode.nodeValue = text;
        }
        span._refreshPriorityUI();
        span._workerTooltipContext = {
          structure,
          buildCount
        };
      } else {
        const textSpan = span._textSpan || span;
        if (textSpan.textContent !== text) {
          textSpan.textContent = text;
        }
        span._costTooltipContext = {
          structure,
          category: item.category,
          resource: item.resource,
          buildCount
        };
      }
      const hasEnough = item.available >= requiredAmount;
      const color = hasEnough ? '' : item.insufficientColor;
      if (item.key === 'colony.workers') {
        if (span.style.color) {
          span.style.color = '';
        }
        const textSpan = span._textSpan;
        if (textSpan && textSpan.style.color !== color) {
          textSpan.style.color = color;
        }
      } else {
        const colorTarget = span._textSpan || span;
        if (colorTarget.style.color !== color) {
          colorTarget.style.color = color;
        }
      }
    });
  }
  
  function adjustStructureActivation(structure, change) {
    if (!structure) return;

    let desiredChange = Number.isFinite(change) ? change : 0;
    if (typeof structure.filterActivationChange === 'function') {
      const context = {
        change: desiredChange,
        currentActive: structure.active,
        desiredActive: structure.active + desiredChange,
        structure
      };
      const filtered = structure.filterActivationChange(desiredChange, context);
      if (typeof filtered === 'number' && !Number.isNaN(filtered)) {
        desiredChange = filtered;
      } else if (filtered === false || filtered === null) {
        desiredChange = 0;
      }
    }

    desiredChange = Math.trunc(desiredChange);
    if (desiredChange === 0) {
      return;
    }

    if (structure.requiresLand) {
      if (desiredChange > 0) {
        desiredChange = Math.min(desiredChange, structure.landAffordCount());
      }
      if (desiredChange !== 0) {
        structure.adjustLand(desiredChange);
      }
    }

    if (desiredChange === 0) {
      return;
    }

    const newActive = Math.max(
      0,
      Math.min(structure.active + desiredChange, structure.count)
    );

    if (newActive === structure.active) {
      return;
    }

    structure.active = newActive;
    if (typeof structure.updateResourceStorage === 'function') {
      structure.updateResourceStorage(resources);
    }
  }
  
  function updateStructureDisplay(structures) {
    for (const structureName in structures) {
      const structure = structures[structureName];
      const els = structureUIElements[structureName] || (structureUIElements[structureName] = {});
      const combinedStructureRow = els.combinedRow || (function(){
        const btn = document.getElementById(`build-${structureName}`);
        return btn ? btn.closest('.combined-building-row') : null;
      })();
      const structureRow = els.row || (function(){
        const btn = document.getElementById(`build-${structureName}`);
        return btn ? btn.closest('.building-row') : null;
      })();
      const countElement = document.getElementById(`${structureName}-count`);
      const countActiveElement = document.getElementById(`${structureName}-count-active`);
      const selectedBuildCount = selectedBuildCounts[structureName];
      const manualBuildCount = getManualBuildCount(structure, selectedBuildCount);
  
      // Update visibility based on unlocked state
      const isVisible = typeof structure.isVisible === 'function'
        ? structure.isVisible()
        : structure.unlocked && !structure.isHidden;
      if (isVisible && structureRow) {
        combinedStructureRow.style.display = 'flex'; // Show the building when unlocked
      } else {
        combinedStructureRow.style.display = 'none';
      }
  
      if (countElement) {
        countElement.textContent = formatBuildingCount(structure.count);
      } else if (countActiveElement) {
        countActiveElement.textContent = `${formatBuildingCount(structure.active)}/${formatBuildingCount(structure.count)}`;
      }
      els.headerActive.textContent = structure.canBeToggled
        ? `${formatBuildingCount(structure.active)}/${formatBuildingCount(structure.count)}`
        : `${formatBuildingCount(structure.count)}`;

      const incBtn = els.increaseButton || document.getElementById(`${structureName}-increase-button`);
      if (incBtn) {
        updateIncreaseButtonText(incBtn, selectedBuildCount);
      }
      const decBtn = els.decreaseButton || document.getElementById(`${structureName}-decrease-button`);
      if (decBtn) {
        updateDecreaseButtonText(decBtn, selectedBuildCount);
      }

      // Toggle visibility of the "Hide" button based on conditions
      const hideButton = els.hideButton;

      if (hideButton) {
        hideButton.style.display = 'inline-block';
        hideButton.disabled = structure.active > 0;
      }

      const reverseBtn = els.reverseButton;
      if (reverseBtn) {
        reverseBtn.style.display = structure.reversalAvailable ? 'inline-block' : 'none';
        const disableReverse = structure instanceof GhgFactory
          && getGhgAutomationSettings(structure).autoDisableAboveTemp;
        reverseBtn.disabled = disableReverse;
      }

      const upgradeBtn = els.upgradeButton;
      if (upgradeBtn) {
        updateUpgradeButton(upgradeBtn, structure);
      }

      // Toggle visibility of autoBuildContainer based on globalEffects
      const autoBuildContainer = els.autoBuildContainer || document.getElementById(`${structure.name}-auto-build-container`);
      if (autoBuildContainer) {
        const showAutomation = globalEffects.isBooleanFlagSet('automateConstruction');
        autoBuildContainer.style.display = showAutomation ? 'flex' : 'none';
        const autoBuildHeaderContainer = els.autoBuildHeaderContainer;
        autoBuildHeaderContainer.style.display = showAutomation ? 'flex' : 'none';
        
        // Set auto-build checkbox based on autoBuildEnabled
        if (els.autoBuildCheckbox) {
          els.autoBuildCheckbox.checked = structure.autoBuildEnabled;
        }
        if (els.autoBuildPriority) {
          els.autoBuildPriority.checked = structure.autoBuildPriority;
        }

        refreshAutoBuildTarget(structure);

        if (els.autoBuildBasisSelect) {
          const newValue = resolveAutoBuildBasisValue(structure, els.autoBuildBasisSelect);
          if (els.autoBuildBasisSelect.value !== newValue) {
            els.autoBuildBasisSelect.value = newValue;
          }
        }
        if (els.autoActiveCheckbox) {
          els.autoActiveCheckbox.checked = structure.autoActiveEnabled;
        }

        const autoUpgradeContainer = els.autoUpgradeContainer;
        if (autoUpgradeContainer) {
          const nextName = structure.getNextTierName?.();
          const next = nextName ? colonies[nextName] : null;
          const showAutoUpgrade = !!(next && next.unlocked);
          autoUpgradeContainer.style.display = showAutoUpgrade ? 'flex' : 'none';
          const checkbox = els.autoUpgradeCheckbox;
          if (checkbox) {
            checkbox.checked = showAutoUpgrade && structure.autoUpgradeEnabled;
          }
        }

        structure.updateUI?.(els);
      }
  
      const productivityElement = document.getElementById(`${structureName}-productivity`);
      if (productivityElement) {
        const productivityValue = Math.round((structure.productivity * 100));
        productivityElement.textContent = `${productivityValue}%`;

        if (structure.dayNightActivity && dayNightCycle.isNight() && !(typeof gameSettings !== 'undefined' && gameSettings.disableDayNightCycle)) {
          productivityElement.style.color = 'darkblue';
        } else if (productivityValue < 100) {
          productivityElement.style.color = 'red';
        } else {
          productivityElement.style.color = 'inherit';
        }
      }

      if (structureName === 'biodome') {
        const warning = (structureUIElements[structureName] || {}).lifeWarning || document.getElementById(`${structureName}-life-warning`);
        if (warning) {
          warning.style.display = biodomeHasActiveLifeDesign() ? 'none' : 'inline-flex';
        }
      }

      const iconElement = document.getElementById(`${structureName}-day-night-icon`);
      if (iconElement) {
        if (typeof gameSettings !== 'undefined' && gameSettings.disableDayNightCycle) {
          iconElement.style.display = 'none';
        } else {
          iconElement.style.display = '';
          iconElement.textContent = dayNightCycle.isDay() ? '☀️' : '🌙';
        }
      }
  
      const button = (structureUIElements[structureName] || {}).buildButton || document.getElementById(`build-${structureName}`);
      if (button) {
        updateStructureButtonText(button, structure, manualBuildCount);
      }
  
      // Update the production and consumption details
      const productionConsumptionDetails = document.getElementById(`${structureName}-production-consumption`);
      if (productionConsumptionDetails) {
        updateProductionConsumptionDetails(structure, productionConsumptionDetails, manualBuildCount);
      }

      // Update the cost display
      const costElement = (structureUIElements[structureName] || {}).costElement;
      if (costElement) {
        updateStructureCostDisplay(costElement, structure, manualBuildCount);
      }

      // Update colony-specific needs display (comfort, energy, food, water)
      if (structure instanceof Colony) {
        updateColonyDetailsDisplay(els.colonyRow, structure);
      }
      applyCollapseState(structureName);
    }
    updateUnhideButtons();
  }

  function updateProductionConsumptionDetails(structure, productionConsumptionElement, buildCount = 1) {
    if (!productionConsumptionElement) return;

    const sections = getProdConsSections(structure, buildCount);
    const keyString = sections
      .map(sec => {
        const keys = sec.key === 'provides'
          ? sec.data.map((_, i) => String(i)).join('|')
          : (sec.keys || []).join('|');
        return `${sec.key}:${keys}`;
      })
      .join(';');

    if (productionConsumptionElement.dataset.sectionKeys !== keyString) {
      buildProdConsElement(productionConsumptionElement, sections);
    }
    const combinedCosts = {};
    sections.forEach(sec => {
      if (sec.key === 'consumption') {
        for (const category in sec.data) {
          for (const resource in sec.data[category]) {
            const k = `${category}.${resource}`;
            combinedCosts[k] = (combinedCosts[k] || 0) + sec.data[category][resource];
          }
        }
      } else if (sec.key === 'maintenance') {
        for (const resource in sec.data) {
          const k = `colony.${resource}`;
          combinedCosts[k] = (combinedCosts[k] || 0) + sec.data[resource];
        }
      }
    });

    sections.forEach(sec => {
      const info = productionConsumptionElement._sections[sec.key];
      if (!info) return;
      if (sec.key === 'provides') {
        sec.data.forEach((text, i) => {
          const span = info.spans.get(String(i));
          if (span && span.textContent !== text) {
            span.textContent = text;
          }
        });
      } else {
        sec.keys.forEach(key => {
          const span = info.spans.get(key);
          if (!span) return;
          const [category, resource] = key.split('.');
          let amount;
          if (sec.key === 'maintenance') {
            amount = sec.data[resource];
          } else {
            amount = sec.data[category][resource];
          }
          const resObj = resources?.[category]?.[resource];
          const displayName = resObj?.displayName || resource;
          const text = `${formatNumber(amount, true, 2)} ${displayName}`;
          const textSpan = span._textSpan || span;
          if (textSpan.textContent !== text) {
            textSpan.textContent = text;
          }
          if (sec.key === 'maintenance') {
            span._maintenanceTooltipContext = {
              structure,
              resource,
              buildCount
            };
          }
          if (resObj) {
            const netRate = (resObj.productionRate || 0) - (resObj.consumptionRate || 0);
            if (sec.key === 'production') {
              const color = netRate < 0 ? 'green' : '';
              textSpan.style.color = swapResourceRateColor(resObj, color);
            } else if (sec.key === 'consumption' || sec.key === 'maintenance') {
              const totalCost = combinedCosts[`${category}.${resource}`] || amount;
              const projectedNet = netRate - totalCost;
              textSpan.style.color = projectedNet < 0 ? 'orange' : '';
            } else {
              textSpan.style.color = '';
            }
          } else {
            textSpan.style.color = '';
          }
        });
      }
    });
  }

  function getProdConsSections(structure, buildCount = 1) {
    const sections = [];

    function scaleResourceMap(map, scale) {
      const scaled = {};
      for (const category in map) {
        scaled[category] = {};
        for (const resource in map[category]) {
          scaled[category][resource] = map[category][resource] * scale;
        }
      }
      return scaled;
    }

    function mergeResourceMaps(base, extra) {
      const merged = {};
      [base, extra].forEach(map => {
        for (const category in map) {
          if (!merged[category]) merged[category] = {};
          for (const resource in map[category]) {
            merged[category][resource] = (merged[category][resource] || 0) + map[category][resource];
          }
        }
      });
      return merged;
    }

    const providesParts = [];
    const storageText = formatStorageDetails(
      scaleResourceMap(structure.getModifiedStorage(), buildCount)
    );
    if (storageText) {
      providesParts.push(storageText);
    }
    if (structure.powerPerBuilding) {
      const area = (terraforming && terraforming.celestialParameters)
        ? (terraforming.celestialParameters.crossSectionArea || terraforming.celestialParameters.surfaceArea)
        : 1;
      const flux = (structure.powerPerBuilding * structure.active * structure.productivity) / area;
      providesParts.push(`${formatNumber(flux, true, 2)} W/m² solar flux`);
    }
    if (structure.name === 'spaceMirror' && terraforming && typeof terraforming.calculateMirrorEffect === 'function') {
      const mirrorFluxPerMirror = terraforming.calculateMirrorEffect().powerPerUnitArea;
      const flux = mirrorFluxPerMirror * structure.active;
      providesParts.push(`${formatNumber(flux, true, 2)} W/m² solar flux`);
    }
    if (providesParts.length > 0) {
      sections.push({ key: 'provides', label: 'Provides', data: providesParts });
    }

    const production = scaleResourceMap(structure.getModifiedProduction(), buildCount);
    const consumption = scaleResourceMap(structure.getModifiedConsumption(), buildCount);
    const swapProdCons = structure.reversalAvailable && structure.reverseEnabled;
    const displayProduction = swapProdCons ? {} : production;
    const displayConsumption = swapProdCons ? mergeResourceMaps(consumption, production) : consumption;
    const prodKeys = collectResourceKeys(displayProduction, { forceShow: structure.alwaysShowProduction });
    if (prodKeys.length > 0) {
      sections.push({ key: 'production', label: 'Production', data: displayProduction, keys: prodKeys });
    }

    const consKeys = collectResourceKeys(displayConsumption, { forceShow: structure.alwaysShowConsumption });
    if (consKeys.length > 0) {
      sections.push({ key: 'consumption', label: 'Consumption', data: displayConsumption, keys: consKeys });
    }

    if (structure.requiresMaintenance && Object.keys(structure.maintenanceCost).length > 0) {
      const filteredMaintenance = Object.entries(structure.maintenanceCost)
        .filter(([_, cost]) => cost > 0)
        .reduce((acc, [res, cost]) => {
          acc[res] = cost * buildCount;
          return acc;
        }, {});
      const maintenanceKeys = Object.keys(filteredMaintenance).map(r => `colony.${r}`);
      if (maintenanceKeys.length > 0) {
        sections.push({ key: 'maintenance', label: 'Maintenance', data: filteredMaintenance, keys: maintenanceKeys });
      }
    }

    return sections;
  }

  function collectResourceKeys(resourceObject, { forceShow } = {}) {
    const keys = [];
    for (const category in resourceObject) {
      for (const resource in resourceObject[category]) {
        const val = resourceObject[category][resource];
        const resourceEntry = resources?.[category]?.[resource];
        const isAvailable = resourceEntry && resourceEntry.unlocked;
        if (val > 0 && (forceShow || isAvailable)) {
          keys.push(`${category}.${resource}`);
        }
      }
    }
    return keys;
  }

  function buildProdConsElement(element, sections) {
    element.textContent = '';
    element._sections = {};

    const keyString = sections
      .map(sec => {
        const keys = sec.key === 'provides'
          ? sec.data.map((_, i) => String(i)).join('|')
          : (sec.keys || []).join('|');
        return `${sec.key}:${keys}`;
      })
      .join(';');

    const hasProduction = sections.some(s => s.key === 'production');
    const hasConsumption = sections.some(s => s.key === 'consumption');

    sections.forEach((sec, idx) => {
      const container = document.createElement('span');
      const label = document.createElement('strong');
      label.textContent = `${sec.label}:`;
      container.appendChild(label);
      container.appendChild(document.createTextNode(' '));
      const list = document.createElement('span');
      container.appendChild(list);
      element.appendChild(container);
      if (idx < sections.length - 1) {
        const nextSec = sections[idx + 1];
        if (hasProduction && hasConsumption && nextSec.key === 'maintenance') {
          element.appendChild(document.createElement('br'));
        } else {
          element.appendChild(document.createTextNode(', '));
        }
      }

      const info = { list, spans: new Map() };
      if (sec.key === 'provides') {
        sec.data.forEach((_, i) => {
          const span = document.createElement('span');
          info.spans.set(String(i), span);
          list.appendChild(span);
          if (i < sec.data.length - 1) {
            list.appendChild(document.createTextNode(', '));
          }
        });
        info.keys = sec.data.map((_, i) => String(i));
      } else {
        sec.keys.forEach((key, i) => {
          const span = document.createElement('span');
          if (sec.key === 'maintenance') {
            const textSpan = document.createElement('span');
            span.classList.add('info-tooltip-icon');
            span.style.fontFamily = 'inherit';
            span.appendChild(textSpan);
            span._textSpan = textSpan;

            const tooltip = attachDynamicInfoTooltip(span, '');
            span._maintenanceTooltip = tooltip;
            span._maintenanceTooltipCache = {};
            span._updateMaintenanceTooltip = () => {
              const context = span._maintenanceTooltipContext;
              const text = buildStructureMaintenanceTooltip(
                context.structure,
                context.resource,
                context.buildCount
              );
              setTooltipText(tooltip, text, span._maintenanceTooltipCache, 'text');
            };
            span.addEventListener('mouseenter', span._updateMaintenanceTooltip);
            span.addEventListener('focusin', span._updateMaintenanceTooltip);
            span.addEventListener('pointerdown', span._updateMaintenanceTooltip);
          }
          info.spans.set(key, span);
          list.appendChild(span);
          if (i < sec.keys.length - 1) {
            list.appendChild(document.createTextNode(', '));
          }
        });
        info.keys = sec.keys;
      }

      element._sections[sec.key] = info;
    });

    element.dataset.sectionKeys = keyString;
  }
  
// Helper function to format production and consumption details
function formatResourceDetails(resourceObject) {
  let details = '';
  for (const category in resourceObject) {
    for (const resource in resourceObject[category]) {
      const adjustedValue = resourceObject[category][resource];
      if (adjustedValue > 0) {
        details += `${formatNumber(adjustedValue, true, 2)} ${resources[category][resource].displayName}, `;
      }
    }
  }
  return details.slice(0, -2); // Remove trailing comma and space
}

// Helper function to format maintenance details
function formatMaintenanceDetails(maintenanceCost) {
  let details = '';
  for (const resource in maintenanceCost) {
    if (maintenanceCost[resource] > 0) {
      details += `${formatNumber(maintenanceCost[resource], true, 2)} ${resources['colony'][resource].displayName}, `;
    }
  }
  return details.slice(0, -2); // Remove trailing comma and space
}

// Helper function to format storage details
function formatStorageDetails(storageObject) {
  let storageDetails = '';
  for (const category in storageObject) {
    for (const resource in storageObject[category]) {
      const storageAmount = storageObject[category][resource];
      const resourceEntry = resources?.[category]?.[resource];
      if (storageAmount > 0 && resourceEntry?.unlocked) {
        const displayName = resourceEntry.displayName || resource;
        storageDetails += `${formatNumber(storageAmount, true, 2)} ${displayName}, `;
      }
    }
  }
  return storageDetails.slice(0, -2); // Remove trailing comma and space
}

  function updateEmptyBuildingMessages() {
  if (structureUICacheInvalidated) {
    rebuildStructureUICache();
  }

  buildingContainerIds.forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    const messageId = `${id}-empty-message`;
    let message = document.getElementById(messageId);

    const rows = combinedBuildingRowCache[id] || [];
    const hasVisible = rows.some(row => row.style.display !== 'none');
    const structures = structureContainerMap[id] || [];
    const hasHidden = structures.some(structure => structure.unlocked && structure.isHidden);
    const messageText = hasHidden ? 'Everything hidden' : 'Nothing available for now.';

    if (!hasVisible) {
      if (!message) {
        message = document.createElement('p');
        message.id = messageId;
        message.classList.add('empty-message');
        message.textContent = messageText;
        container.appendChild(message);
      } else if (message.textContent !== messageText) {
        message.textContent = messageText;
      }
    } else if (message) {
      message.remove();
    }
  });
}

function updateBuildingSubtabsVisibility() {
  const categories = getBuildingCategories();
  const visibleSubtabs = [];
  let activeHasVisibleBuilding = false;
  const activeId = buildingSubtabManager ? buildingSubtabManager.getActiveId() : null;
  let anyVisibleBuilding = false;
  
  categories.forEach(category => {
    const subtabId = `${category}-buildings`;
    const hasVisibleBuilding = Object.values(buildings).some(b => {
      const isVisible = b.isVisible ? b.isVisible() : b.unlocked && !b.isHidden;
      return b.category === category && isVisible;
    });
    const hasHiddenBuilding = Object.values(buildings).some(b => b.category === category && b.isHidden);
    const shouldShow = hasVisibleBuilding || hasHiddenBuilding;
    if (hasVisibleBuilding) {
      anyVisibleBuilding = true;
    }
    if (hasVisibleBuilding) {
      visibleSubtabs.push(subtabId);
    }
    if (activeId === subtabId) {
      activeHasVisibleBuilding = hasVisibleBuilding;
    }
    
    if (buildingSubtabManager) {
      if (shouldShow) {
        buildingSubtabManager.show(subtabId);
      } else {
        buildingSubtabManager.hide(subtabId);
      }
    } else {
      const tab = document.getElementById(`${subtabId}-tab`);
      const content = document.getElementById(subtabId);
      if (!tab || !content) return;
      if (shouldShow) {
        tab.classList.remove('hidden');
        content.classList.remove('hidden');
      } else {
        tab.classList.add('hidden');
        content.classList.add('hidden');
      }
    }
  });

  if (!anyVisibleBuilding) {
    categories.forEach(category => {
      const subtabId = `${category}-buildings`;
      const tab = document.getElementById(`${subtabId}-tab`);
      const content = document.getElementById(subtabId);
      if (tab) tab.classList.add('hidden');
      if (content) content.classList.add('hidden');
      if (tab) tab.classList.remove('active');
      if (content) content.classList.remove('active');
    });
    if (buildingSubtabManager) {
      buildingSubtabManager.activeId = null;
    }
    return;
  }

  if (buildingSubtabManager && (!activeHasVisibleBuilding || !activeId) && visibleSubtabs.length) {
    buildingSubtabManager.activate(visibleSubtabs[0]);
  }
}

function updateUnhideButtons() {
  const categories = getBuildingCategories();
  categories.forEach(cat => {
    const container = document.getElementById(`${cat}-unhide-container`);
    if (!container) return;
    const hasHidden = Object.values(buildings).some(b => b.category === cat && b.isHidden);
    container.style.display = hasHidden ? 'block' : 'none';
  });

  const colonyContainer = document.getElementById('unhide-obsolete-container');
  if (colonyContainer) {
    const hasColonyHidden = Object.values(colonies).some(c => c.isHidden);
    colonyContainer.style.display = hasColonyHidden ? 'block' : 'none';
  }
}

function initializeUnhideButtons() {
  const categories = getBuildingCategories();
  categories.forEach(cat => {
    const btn = document.getElementById(`${cat}-unhide-button`);
    if (btn) {
      // Remove any existing listeners by cloning the button
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', () => {
        if (typeof buildings === 'undefined') return;
        Object.values(buildings).forEach(b => {
          if (b.category === cat) {
            b.isHidden = false;
            updateStructureHiddenPreference(b.name, false);
          }
        });
        updateBuildingDisplay(buildings);
      });
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getProdConsSections,
    formatMaintenanceDetails,
    rebuildStructureUICache,
    invalidateStructureUICache,
    initializeUnhideButtons
  };
}
