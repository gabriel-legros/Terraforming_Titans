// structures-ui.js

// Create an object to store the selected build count for each structure
const selectedBuildCounts = {};

// Cache combined building rows for each container
const buildingContainerIds = [
  'resource-buildings-buttons',
  'production-buildings-buttons',
  'energy-buildings-buttons',
  'storage-buildings-buttons',
  'terraforming-buildings-buttons'
];

const combinedBuildingRowCache = {};
// Cache per-structure frequently accessed elements
const structureUIElements = {};
let structureUICacheInvalidated = true;

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
  if (els.costElement) els.costElement.style.display = collapsed ? 'none' : '';
  if (els.productionDetails) els.productionDetails.style.display = collapsed ? 'none' : '';
  if (els.descriptionElement) els.descriptionElement.style.display = collapsed ? 'none' : '';
  const autoContainer = els.autoBuildContainer;
  const inputContainer = els.autoBuildInputContainer;
  if (autoContainer) {
    Array.from(autoContainer.children).forEach(child => {
      if (child !== inputContainer) {
        child.style.display = collapsed ? 'none' : '';
      }
    });
  }
  if (els.collapseArrow) {
    els.collapseArrow.textContent = collapsed ? '▶' : '▼';
  }
}

// Create buttons for the buildings based on their categories
function createBuildingButtons() {
  const categorizedBuildings = {
    resource: [],
    storage: [],
    production: [],
    energy: [],
    terraforming: []
  };

  // Categorize buildings
  for (const buildingName in buildings) {
    const building = buildings[buildingName];
    if (categorizedBuildings[building.category]) {
      categorizedBuildings[building.category].push(building);
    }
  }

  // Create buttons for each category
  createStructureButtons(categorizedBuildings.storage, 'storage-buildings-buttons', (buildingName, buildCount) => buildings[buildingName].buildStructure(buildCount), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.production, 'production-buildings-buttons', (buildingName, buildCount) => buildings[buildingName].buildStructure(buildCount), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.resource, 'resource-buildings-buttons', (buildingName, buildCount) => buildings[buildingName].buildStructure(buildCount), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.energy, 'energy-buildings-buttons', (buildingName, buildCount) => buildings[buildingName].buildStructure(buildCount), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.terraforming, 'terraforming-buildings-buttons', (buildingName, buildCount) => buildings[buildingName].buildStructure(buildCount), adjustStructureActivation);
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
  structureUICacheInvalidated = false;
}
  
// Create a structure row for both buildings and colonies
function createStructureRow(structure, buildCallback, toggleCallback, isColony) {
  const combinedStructureRow = document.createElement('div');
  combinedStructureRow.classList.add('combined-building-row');

  const structureRow = document.createElement('div');
  structureRow.classList.add('building-row');

  // Hide the structure if it's not unlocked or if it's hidden
  if (!structure.unlocked || structure.isHidden) {
    combinedStructureRow.classList.add('hidden'); // Hide the building
  }

  // If the building is obsolete, add a visual indicator
  if (structure.obsolete) {
    structureRow.classList.add('obsolete-building');
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('button-container');

  // Left container for build, build amount, and hide buttons
  const leftContainer = document.createElement('div');
  leftContainer.classList.add('left-button-container');

  const collapseArrow = document.createElement('span');
  collapseArrow.classList.add('collapse-arrow');
  collapseArrow.textContent = '▼';
  leftContainer.appendChild(collapseArrow);

  const button = document.createElement('button');
  button.id = `build-${structure.name}`;
  button.classList.add('building-button');
  // Initial button text with a dedicated span for the build count to keep width stable
  button.textContent = '';
  button.append('Build ');
  const countSpan = document.createElement('span');
  countSpan.classList.add('build-button-count');
  countSpan.textContent = '1';
  button.appendChild(countSpan);
  const nameNode = document.createTextNode(` ${structure.displayName}`);
  button.appendChild(nameNode);
  button.buttonNameNode = nameNode;

  // Initialize and seed per-structure UI cache
  structureUIElements[structure.name] = structureUIElements[structure.name] || {};
  const cached = structureUIElements[structure.name];
  cached.combinedRow = combinedStructureRow;
  cached.row = structureRow;
  cached.buildButton = button;
  cached.buttonContainer = buttonContainer;
  cached.collapsed = false;
  cached.collapseArrow = collapseArrow;

  let selectedBuildCount = 1;
  selectedBuildCounts[structure.name] = selectedBuildCount;
  // Set initial button text and color based on affordability
  updateStructureButtonText(button, structure, selectedBuildCount);

  button.addEventListener('click', function () {
    buildCallback(structure.name, selectedBuildCounts[structure.name]);
    updateStructureButtonText(button, structure, selectedBuildCounts[structure.name]);
    updateStructureCostDisplay(costElement, structure, selectedBuildCounts[structure.name]);
    if (isColony && upgradeButton) {
      updateUpgradeButton(upgradeButton, structure);
    }
  });

  leftContainer.appendChild(button);

  // Create build count input and buttons
  const buildCountButtons = document.createElement('div');
  buildCountButtons.classList.add('build-count-buttons');

  const buildCountLabel = document.createElement('span');
  buildCountLabel.textContent = 'Amount: ';
  buildCountButtons.appendChild(buildCountLabel);

  const buildCountDisplay = document.createElement('span');
  buildCountDisplay.classList.add('build-count-display');
  buildCountDisplay.id = `${structure.name}-build-count`;
  buildCountDisplay.textContent = formatNumber(selectedBuildCount, true);
  buildCountButtons.appendChild(buildCountDisplay);
  cached.buildCountDisplay = buildCountDisplay;

  const multiplyButton = document.createElement('button');
  multiplyButton.textContent = 'x10';
  multiplyButton.addEventListener('click', function () {
    selectedBuildCounts[structure.name] = multiplyByTen(selectedBuildCounts[structure.name]);
    buildCountDisplay.textContent = formatNumber(selectedBuildCounts[structure.name], true);
    updateStructureButtonText(button, structure, selectedBuildCounts[structure.name]);
    updateStructureCostDisplay(costElement, structure, selectedBuildCounts[structure.name]);
    updateProductionConsumptionDetails(structure, productionConsumptionDetails, selectedBuildCounts[structure.name]);
    if (structure.canBeToggled) {
      updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
      updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
    }
    if (isColony && upgradeButton) {
      updateUpgradeButton(upgradeButton, structure);
    }
  });
  buildCountButtons.appendChild(multiplyButton);

  const divideButton = document.createElement('button');
  divideButton.textContent = '/10';
  divideButton.addEventListener('click', function () {
    selectedBuildCounts[structure.name] = divideByTen(selectedBuildCounts[structure.name]);
    buildCountDisplay.textContent = formatNumber(selectedBuildCounts[structure.name], true);
    updateStructureButtonText(button, structure, selectedBuildCounts[structure.name]);
    updateStructureCostDisplay(costElement, structure, selectedBuildCounts[structure.name]);
    updateProductionConsumptionDetails(structure, productionConsumptionDetails, selectedBuildCounts[structure.name]);
    if (structure.canBeToggled) {
      updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
      updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
    }
    if (isColony && upgradeButton) {
      updateUpgradeButton(upgradeButton, structure);
    }
  });
  buildCountButtons.appendChild(divideButton);

  leftContainer.appendChild(buildCountButtons);

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
    leftContainer.appendChild(upgradeButton);
    cached.upgradeButton = upgradeButton;
  }

  const hideButton = document.createElement('button');
  hideButton.classList.add('hide-button');
  hideButton.textContent = 'Hide';
  hideButton.addEventListener('click', function () {
    structure.isHidden = true;
    updateUnhideButtons();
  });
  hideButton.disabled = structure.active > 0;
  leftContainer.appendChild(hideButton);
  cached.hideButton = hideButton;

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
  leftContainer.appendChild(reverseInlineBtn);
  cached.reverseButton = reverseInlineBtn;
  buttonContainer.appendChild(leftContainer);

  //done with first row
  structureRow.appendChild(buttonContainer);

  const costElement = document.createElement('div');
  costElement.classList.add('structure-cost');
  costElement.classList.add('small-text'); // Add the 'small-text' class
  updateStructureCostDisplay(costElement, structure);
  structureRow.appendChild(costElement);
  // Cache the cost element for faster updates
  structureUIElements[structure.name] = structureUIElements[structure.name] || {};
  structureUIElements[structure.name].costElement = costElement;
  cached.costElement = costElement;

  const productionConsumptionDetails = document.createElement('div');
  productionConsumptionDetails.classList.add('building-production-consumption');
  productionConsumptionDetails.classList.add('small-text'); // Add the 'small-text' class
  productionConsumptionDetails.id = `${structure.name}-production-consumption`;
  updateProductionConsumptionDetails(structure, productionConsumptionDetails, selectedBuildCounts[structure.name]);
  structureRow.appendChild(productionConsumptionDetails);
  cached.productionDetails = productionConsumptionDetails;

  const constructedCountContainer = document.createElement('div');
  constructedCountContainer.classList.add('constructed-count-container');

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

  constructedCountContainer.appendChild(constructedCountElement);

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

    if (structure.dayNightActivity && !(typeof gameSettings !== 'undefined' && gameSettings.disableDayNightCycle)) {
      const dayNightIcon = document.createElement('span');
      dayNightIcon.id = `${structure.name}-day-night-icon`;
      dayNightIcon.classList.add('day-night-icon');
      dayNightIcon.textContent = dayNightCycle.isDay() ? '☀️' : '🌙';
      productivityContainer.appendChild(dayNightIcon);
    }

    constructedCountContainer.appendChild(productivityContainer);
  }

  const { structureControls, increaseButton, decreaseButton } = createStructureControls(structure, toggleCallback, isColony);
  constructedCountContainer.appendChild(structureControls);
  cached.increaseButton = increaseButton;
  cached.decreaseButton = decreaseButton;

  const toggleLabel = document.createElement('span');
  toggleLabel.textContent = 'Toggle: ';
  constructedCountContainer.appendChild(toggleLabel);
  constructedCountContainer.appendChild(structureControls);

  structureRow.appendChild(constructedCountContainer);

  const description = document.createElement('p');
  description.classList.add('building-description');
  description.textContent = structure.description;
  structureRow.appendChild(description);
  cached.descriptionElement = description;

  // Custom colony display (e.g., baseComfort, energy, food, water) if the structure is a colony
  if (isColony) {
    const colonyDetails = createColonyDetails(structure);
    structureRow.appendChild(colonyDetails);
  }

  combinedStructureRow.appendChild(structureRow);

  const leftStructureRow = document.createElement('div');
  leftStructureRow.classList.add('right-building-row');

  //Autobuild feature, unlocked by research
  const autoBuildContainer = document.createElement('div');
  autoBuildContainer.id = `${structure.name}-auto-build-container`;
  autoBuildContainer.classList.add('auto-build-container');

  const autoBuildInputContainer = document.createElement('div');
  autoBuildInputContainer.classList.add('auto-build-input-container');

  // Checkbox for enabling/disabling auto-build
  const autoBuildCheckbox = document.createElement('input');
  autoBuildCheckbox.type = 'checkbox';
  autoBuildCheckbox.classList.add('auto-build-checkbox');

  autoBuildCheckbox.addEventListener('change', () => {
    structure.autoBuildEnabled = autoBuildCheckbox.checked;
    if (autoBuildCheckbox.checked && typeof gameSettings !== 'undefined' && gameSettings.autobuildAlsoSetsActive) {
      autoActiveCheckbox.checked = true;
      structure.autoActiveEnabled = true;
    }
    // Additional logic for enabling/disabling auto-build can go here
  });
  autoBuildInputContainer.appendChild(autoBuildCheckbox);
  // Cache reference
  structureUIElements[structure.name] = structureUIElements[structure.name] || {};
  structureUIElements[structure.name].autoBuildCheckbox = autoBuildCheckbox;

  const autoBuildLabel = document.createElement('span');
  autoBuildLabel.textContent = 'Auto-build % of ';
  autoBuildInputContainer.appendChild(autoBuildLabel);

  const autoBuildBasisSelect = document.createElement('select');
  autoBuildBasisSelect.classList.add('auto-build-basis');
  const popOption = document.createElement('option');
  popOption.value = 'population';
  popOption.textContent = 'pop';
  autoBuildBasisSelect.appendChild(popOption);
  const workerOption = document.createElement('option');
  workerOption.value = 'workers';
  workerOption.textContent = 'workers';
  autoBuildBasisSelect.appendChild(workerOption);
  autoBuildBasisSelect.value = structure.autoBuildBasis || 'population';
  autoBuildBasisSelect.addEventListener('change', () => {
    structure.autoBuildBasis = autoBuildBasisSelect.value;
  });
  autoBuildInputContainer.appendChild(autoBuildBasisSelect);
  structureUIElements[structure.name].autoBuildBasisSelect = autoBuildBasisSelect;
  autoBuildInputContainer.appendChild(document.createTextNode(': '));

  const autoBuildInput = document.createElement('input');
  autoBuildInput.type = 'number';
  autoBuildInput.value = structure.autoBuildPercent; // Default to 0.1
  autoBuildInput.step = 0.01; // Allow 0.01 steps for finer control
  autoBuildInput.classList.add('auto-build-input');

  autoBuildInput.addEventListener('input', () => {
    const autoBuildPercent = parseFloat(autoBuildInput.value);
    structure.autoBuildPercent = autoBuildPercent;
    // Additional logic to handle the auto-build percentage can go here
  });

  autoBuildInputContainer.appendChild(autoBuildInput);

  autoBuildContainer.appendChild(autoBuildInputContainer);
  structureUIElements[structure.name].autoBuildInputContainer = autoBuildInputContainer;
  cached.autoBuildInputContainer = autoBuildInputContainer;

  const autoBuildTarget = document.createElement('span');
  const autoBuildTargetContainer = document.createElement('div');
  autoBuildTargetContainer.classList.add('auto-build-target-container');

  autoBuildTarget.classList.add('auto-build-target');
  autoBuildTarget.id = `${structure.name}-auto-build-target`;
  autoBuildTarget.textContent = 'Target : 0';
  autoBuildTargetContainer.appendChild(autoBuildTarget);
  cached.autoBuildTarget = autoBuildTarget;

  const autoBuildPriorityLabel = document.createElement('label');
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
  autoBuildTargetContainer.appendChild(autoBuildPriorityLabel);
  structureUIElements[structure.name].autoBuildPriority = autoBuildPriority;

  autoBuildContainer.appendChild(autoBuildTargetContainer);

  const setActiveContainer = document.createElement('div');
  setActiveContainer.classList.add('auto-build-setactive-container');
  const setActiveButton = document.createElement('button');
  setActiveButton.id = `${structure.name}-set-active-button`;

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
    const base = structure.autoBuildBasis === 'workers' ? workerCap : pop;
    const targetCount = Math.ceil((structure.autoBuildPercent * base || 0) / 100);
    const desiredActive = Math.min(targetCount, structure.count);
    const change = desiredActive - structure.active;
    adjustStructureActivation(structure, change);
    updateBuildingDisplay(buildings);
  });
  setActiveContainer.appendChild(setActiveButton);
  autoBuildContainer.appendChild(setActiveContainer);
  cached.autoBuildContainer = autoBuildContainer;

  // Reversal toggle button (for buildings that support it)
  const reverseControl = document.createElement('div');
  reverseControl.classList.add('reverse-control');

  reverseControl.style.display = structure.reversalAvailable ? 'inline-block' : 'none';
  autoBuildContainer.appendChild(reverseControl);

  structure.initUI?.(autoBuildContainer, cached);

  combinedStructureRow.append(autoBuildContainer);

  collapseArrow.addEventListener('click', () => {
    cached.collapsed = !cached.collapsed;
    applyCollapseState(structure.name);
  });

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

// Create structure controls for buildings and colonies
function createStructureControls(structure, toggleCallback) {
  const structureControls = document.createElement('div');
  structureControls.classList.add('building-controls');

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
  }
  
  function updateStructureButtonText(button, structure, buildCount = 1) {
    if (!button) return;
    const canAfford = structure.canAfford(buildCount);
    let countSpan = button.querySelector('.build-button-count');
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
          insufficientColor: 'red'
        });
      }
    }

    if (structure.getTotalWorkerNeed() > 0) {
      items.push({
        key: 'colony.workers',
        label: 'Workers',
        required: structure.getTotalWorkerNeed() * structure.getEffectiveWorkerMultiplier(),
        available: resources.colony.workers?.value || 0,
        insufficientColor: 'orange'
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
        textSpan.textContent = text;
        span._refreshPriorityUI();
      } else {
        if (span.textContent !== text) {
          span.textContent = text;
        }
      }
      const hasEnough = item.available >= requiredAmount;
      const color = hasEnough ? '' : item.insufficientColor;
      if (span.style.color !== color) {
        span.style.color = color;
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
    const pop = resources.colony.colonists.value;
    const workerCap = resources.colony.workers?.cap || 0;
    for (const structureName in structures) {
      const structure = structures[structureName];
      const els = structureUIElements[structureName] || {};
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
      const buildDisplay = els.buildCountDisplay || document.getElementById(`${structureName}-build-count`);
  
      // Update visibility based on unlocked state
      if (structure.unlocked && structureRow && !structure.isHidden) {
        combinedStructureRow.style.display = 'flex'; // Show the building when unlocked
      } else {
        combinedStructureRow.style.display = 'none';
      }
  
      if (countElement) {
        countElement.textContent = formatBuildingCount(structure.count);
      } else if (countActiveElement) {
        countActiveElement.textContent = `${formatBuildingCount(structure.active)}/${formatBuildingCount(structure.count)}`;
      }

      if (buildDisplay) {
        buildDisplay.textContent = formatNumber(selectedBuildCounts[structureName], true);
      }

      const incBtn = els.increaseButton || document.getElementById(`${structureName}-increase-button`);
      if (incBtn) {
        updateIncreaseButtonText(incBtn, selectedBuildCounts[structureName]);
      }
      const decBtn = els.decreaseButton || document.getElementById(`${structureName}-decrease-button`);
      if (decBtn) {
        updateDecreaseButtonText(decBtn, selectedBuildCounts[structureName]);
      }

      // Toggle visibility of the "Hide" button based on conditions
      const buttonContainer = els.buttonContainer || (structureRow ? structureRow.getElementsByClassName('button-container')[0] : null);
      const hideButton = els.hideButton || (buttonContainer ? buttonContainer.getElementsByClassName('hide-button')[0] : null);

      if (hideButton) {
        hideButton.style.display = 'inline-block';
        hideButton.disabled = structure.active > 0;
      }

      const reverseBtn = els.reverseButton || (buttonContainer ? buttonContainer.getElementsByClassName('reverse-button')[0] : null);
      if (reverseBtn) {
        reverseBtn.style.display = structure.reversalAvailable ? 'inline-block' : 'none';
      }

      const upgradeBtn = els.upgradeButton || (buttonContainer ? buttonContainer.querySelector(`#${structureName}-upgrade-button`) : null);
      if (upgradeBtn) {
        updateUpgradeButton(upgradeBtn, structure);
      }

      // Toggle visibility of autoBuildContainer based on globalEffects
      const autoBuildContainer = els.autoBuildContainer || document.getElementById(`${structure.name}-auto-build-container`);
      if (autoBuildContainer) {
        autoBuildContainer.style.display = globalEffects.isBooleanFlagSet('automateConstruction') ? 'flex' : 'none';
        
        // Set auto-build checkbox based on autoBuildEnabled
        const els = structureUIElements[structureName] || {};
        if (els.autoBuildCheckbox) {
          els.autoBuildCheckbox.checked = structure.autoBuildEnabled;
        }
        if (els.autoBuildPriority) {
          els.autoBuildPriority.checked = structure.autoBuildPriority;
        }

        const base = structure.autoBuildBasis === 'workers' ? workerCap : pop;
        const targetCount = Math.ceil((structure.autoBuildPercent * base || 0) / 100);
        const targetEl = els.autoBuildTarget || document.getElementById(`${structure.name}-auto-build-target`);
        if (targetEl) {
          const targetText = `Target : ${formatBigInteger(targetCount)}`;
          if (targetEl.textContent !== targetText) {
            targetEl.textContent = targetText;
          }
          const targetColor = structure.autoBuildPartial ? 'orange' : '';
          if (targetEl.style.color !== targetColor) {
            targetEl.style.color = targetColor;
          }
        }

        if (els.autoBuildBasisSelect) {
          els.autoBuildBasisSelect.value = structure.autoBuildBasis || 'population';
        }
        if (els.autoActiveCheckbox) {
          els.autoActiveCheckbox.checked = structure.autoActiveEnabled;
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
        updateStructureButtonText(button, structure, selectedBuildCounts[structureName]);
      }
  
      // Update the production and consumption details
      const productionConsumptionDetails = document.getElementById(`${structureName}-production-consumption`);
      if (productionConsumptionDetails) {
        updateProductionConsumptionDetails(structure, productionConsumptionDetails, selectedBuildCounts[structureName]);
      }

      // Update the cost display
      const costElement = (structureUIElements[structureName] || {}).costElement;
      if (costElement) {
        updateStructureCostDisplay(costElement, structure, selectedBuildCounts[structureName]);
      }

      // Update colony-specific needs display (comfort, energy, food, water)
      if (structure instanceof Colony) {
        updateColonyDetailsDisplay(structureRow, structure);
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
          if (span.textContent !== text) {
            span.textContent = text;
          }
          if (resObj) {
            const netRate = (resObj.productionRate || 0) - (resObj.consumptionRate || 0);
            if (sec.key === 'production') {
              span.style.color = netRate < 0 ? 'green' : '';
            } else if (sec.key === 'consumption' || sec.key === 'maintenance') {
              const totalCost = combinedCosts[`${category}.${resource}`] || amount;
              const projectedNet = netRate - totalCost;
              span.style.color = projectedNet < 0 ? 'orange' : '';
            } else {
              span.style.color = '';
            }
          } else {
            span.style.color = '';
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
    const prodKeys = collectResourceKeys(production);
    if (prodKeys.length > 0) {
      sections.push({ key: 'production', label: 'Production', data: production, keys: prodKeys });
    }

    const consumption = scaleResourceMap(structure.getModifiedConsumption(), buildCount);
    const consKeys = collectResourceKeys(consumption);
    if (consKeys.length > 0) {
      sections.push({ key: 'consumption', label: 'Consumption', data: consumption, keys: consKeys });
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

  function collectResourceKeys(resourceObject) {
    const keys = [];
    for (const category in resourceObject) {
      for (const resource in resourceObject[category]) {
        const val = resourceObject[category][resource];
        if (val > 0) {
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
      if (storageAmount > 0) {
        storageDetails += `${formatNumber(storageAmount, true, 2)} ${resources[category][resource].displayName}, `;
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

    if (!hasVisible) {
      if (!message) {
        message = document.createElement('p');
        message.id = messageId;
        message.classList.add('empty-message');
        message.textContent = 'Nothing available for now.';
        container.appendChild(message);
      }
    } else if (message) {
      message.remove();
    }
  });
}

function updateUnhideButtons() {
  const categories = ['resource', 'production', 'energy', 'storage', 'terraforming'];
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

document.addEventListener('DOMContentLoaded', () => {
  ['resource','production','energy','storage','terraforming'].forEach(cat => {
    const btn = document.getElementById(`${cat}-unhide-button`);
    if (btn) {
      btn.addEventListener('click', () => {
        Object.values(buildings).forEach(b => {
          if (b.category === cat) b.isHidden = false;
        });
        updateBuildingDisplay(buildings);
      });
    }
  });
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getProdConsSections, formatMaintenanceDetails, rebuildStructureUICache, invalidateStructureUICache };
}
