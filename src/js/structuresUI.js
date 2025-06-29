// structures-ui.js

// Create an object to store the selected build count for each structure
const selectedBuildCounts = {};

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
  buttonsContainer.innerHTML = '';

  structures.forEach((structure) => {
    // Create structure row (shared for buildings and colonies)
    const structureRow = createStructureRow(structure, buildCallback, toggleCallback, isColony);

    // Append the structure row to the container
    buttonsContainer.appendChild(structureRow);
  
  });
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

  const button = document.createElement('button');
  button.id = `build-${structure.name}`;
  button.classList.add('building-button');
  // Initial button text with a span for the build count to keep width stable
  button.innerHTML = `Build <span class="build-button-count">1</span> ${structure.displayName}`;

  let selectedBuildCount = 1;
  selectedBuildCounts[structure.name] = selectedBuildCount;
  // Set initial button text and color based on affordability
  updateStructureButtonText(button, structure, selectedBuildCount);

  button.addEventListener('click', function () {
    buildCallback(structure.name, selectedBuildCounts[structure.name]);
    updateStructureButtonText(button, structure, selectedBuildCounts[structure.name]);
    updateStructureCostDisplay(costElement, structure, selectedBuildCounts[structure.name]);
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

  const multiplyButton = document.createElement('button');
  multiplyButton.textContent = 'x10';
  multiplyButton.addEventListener('click', function () {
    selectedBuildCounts[structure.name] = multiplyByTen(selectedBuildCounts[structure.name]);
    buildCountDisplay.textContent = formatNumber(selectedBuildCounts[structure.name], true);
    updateStructureButtonText(button, structure, selectedBuildCounts[structure.name]);
    updateStructureCostDisplay(costElement, structure, selectedBuildCounts[structure.name]);
    if (structure.canBeToggled) {
      updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
      updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
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
    if (structure.canBeToggled) {
      updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
      updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
    }
  });
  buildCountButtons.appendChild(divideButton);

  leftContainer.appendChild(buildCountButtons);

  const hideButton = document.createElement('button');
  hideButton.classList.add('hide-button');
  hideButton.textContent = 'Hide';
  hideButton.addEventListener('click', function () {
    // Hide this building
    structure.isHidden = true;
  });

  leftContainer.appendChild(hideButton);
  buttonContainer.appendChild(leftContainer);

  //done with first row
  structureRow.appendChild(buttonContainer);

  const costElement = document.createElement('div');
  costElement.classList.add('structure-cost');
  costElement.classList.add('small-text'); // Add the 'small-text' class
  updateStructureCostDisplay(costElement, structure);
  structureRow.appendChild(costElement);

  const productionConsumptionDetails = document.createElement('div');
  productionConsumptionDetails.classList.add('building-production-consumption');
  productionConsumptionDetails.classList.add('small-text'); // Add the 'small-text' class
  productionConsumptionDetails.id = `${structure.name}-production-consumption`;
  updateProductionConsumptionDetails(structure, productionConsumptionDetails);
  structureRow.appendChild(productionConsumptionDetails);

  const constructedCountContainer = document.createElement('div');
  constructedCountContainer.classList.add('constructed-count-container');

  // Create a new element for displaying the number of constructed buildings and productivity
  const constructedCountElement = document.createElement('div');
  constructedCountElement.classList.add('constructed-count');
  constructedCountElement.classList.add('small-text'); // Add the 'small-text' class


  if (structure.canBeToggled) {
    constructedCountElement.innerHTML = `
      <strong>Constructed:</strong> <span id="${structure.name}-count-active">${structure.active}/${structure.count}</span>
    `;
  } else {
    constructedCountElement.innerHTML = `
      <strong>Constructed:</strong> <span id="${structure.name}-count">${structure.count}</span>
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

    constructedCountContainer.appendChild(productivityContainer);
  }

  const { structureControls, increaseButton, decreaseButton } = createStructureControls(structure, toggleCallback, isColony);
  constructedCountContainer.appendChild(structureControls);

  const toggleLabel = document.createElement('span');
  toggleLabel.textContent = 'Toggle: ';
  constructedCountContainer.appendChild(toggleLabel);
  constructedCountContainer.appendChild(structureControls);

  structureRow.appendChild(constructedCountContainer);

  const description = document.createElement('p');
  description.classList.add('building-description');
  description.textContent = structure.description;
  structureRow.appendChild(description);

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
    // Additional logic for enabling/disabling auto-build can go here
  }); 
  autoBuildInputContainer.appendChild(autoBuildCheckbox);

  const autoBuildLabel = document.createElement('span');
  autoBuildLabel.textContent = 'Auto-build % of pop: ';
  autoBuildInputContainer.appendChild(autoBuildLabel);

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

  const autoBuildTarget = document.createElement('span');
  const autoBuildTargetContainer = document.createElement('div');
  autoBuildTargetContainer.classList.add('auto-build-target-container');

  autoBuildTarget.classList.add('auto-build-target');
  autoBuildTarget.id = `${structure.name}-auto-build-target`;
  autoBuildTarget.textContent = 'Target : 0';
  autoBuildTargetContainer.appendChild(autoBuildTarget);

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

  autoBuildContainer.appendChild(autoBuildTargetContainer);

  if(structure.name === 'ghgFactory') {
    const tempControl = document.createElement('div');
    tempControl.id = `${structure.name}-temp-control`;
    tempControl.classList.add('ghg-temp-control');
    tempControl.style.display = structure.isBooleanFlagSet('terraformingBureauFeature') ? 'flex' : 'none';

    const tempCheckbox = document.createElement('input');
    tempCheckbox.type = 'checkbox';
    tempCheckbox.classList.add('ghg-temp-checkbox');
    tempCheckbox.checked = ghgFactorySettings.autoDisableAboveTemp;
    tempCheckbox.addEventListener('change', () => {
      ghgFactorySettings.autoDisableAboveTemp = tempCheckbox.checked;
    });
    tempControl.appendChild(tempCheckbox);

    const tempLabel = document.createElement('span');
    tempLabel.textContent = 'Disable if avg T > ';
    tempControl.appendChild(tempLabel);

    const tempInput = document.createElement('input');
    tempInput.type = 'number';
    tempInput.step = 1;
    tempInput.classList.add('ghg-temp-input');
    tempInput.value = toDisplayTemperature(ghgFactorySettings.disableTempThreshold);
    tempInput.addEventListener('input', () => {
      const val = parseFloat(tempInput.value);
      ghgFactorySettings.disableTempThreshold = gameSettings.useCelsius ? val + 273.15 : val;
    });
    tempControl.appendChild(tempInput);

    const unitSpan = document.createElement('span');
    unitSpan.classList.add('ghg-temp-unit');
    unitSpan.textContent = getTemperatureUnit();
    tempControl.appendChild(unitSpan);

    autoBuildContainer.appendChild(tempControl);
  }

  combinedStructureRow.append(autoBuildContainer);

  return combinedStructureRow;
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
    zeroButton.textContent = '0';
    zeroButton.addEventListener('click', function () {
      toggleCallback(structure, -structure.active);
    });
    structureControls.appendChild(zeroButton);

    decreaseButton = document.createElement('button');
    decreaseButton.textContent = '-1';
    decreaseButton.addEventListener('click', function () {
      toggleCallback(structure, -selectedBuildCounts[structure.name]);
      updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
    });

    increaseButton = document.createElement('button');
    increaseButton.textContent = '+1';
    increaseButton.addEventListener('click', function () {
      toggleCallback(structure, selectedBuildCounts[structure.name]);
      updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
    });

    structureControls.appendChild(decreaseButton);
    structureControls.appendChild(increaseButton);

    maxButton = document.createElement('button');
    maxButton.textContent = 'Max';
    maxButton.addEventListener('click', function () {
      toggleCallback(structure, structure.count - structure.active);
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
    const canAfford = structure.canAfford(buildCount);
    const countSpan = `<span class="build-button-count">${formatNumber(buildCount, true)}</span>`;
    const newHTML = `Build ${countSpan} ${structure.displayName}`;
    if (button.innerHTML !== newHTML) {
      button.innerHTML = newHTML;
    }

    const newColor = canAfford ? 'inherit' : 'red';
    if (button.style.color !== newColor) {
      button.style.color = newColor;
    }
  }
  
  function updateStructureCostDisplay(costElement, structure, buildCount = 1) {
    let costDetails = 'Cost - ';
    const costArray = [];
  
    // Include resource costs
    const effectiveCost = structure.getEffectiveCost();
    for (const category in effectiveCost) {
      for (const resource in effectiveCost[category]) {
        const requiredAmount = effectiveCost[category][resource] * buildCount;
        const availableAmount = resources[category][resource]?.value || 0;
  
        // Check if the player has enough of this resource
        const resourceText = `${capitalizeFirstLetter(resource)}: ${formatNumber(requiredAmount, true)}`;
        const formattedResourceText = availableAmount >= requiredAmount
          ? resourceText
          : `<span style="color: red;">${resourceText}</span>`;
        costArray.push(formattedResourceText);
      }
    }
  
    // Include worker cost if applicable
    if (structure.getTotalWorkerNeed() > 0) {
      const requiredWorkers = structure.getTotalWorkerNeed() * buildCount * structure.getEffectiveWorkerMultiplier();
      const availableWorkers = resources.colony.workers?.value || 0;
  
      // Check if there are enough workers available
      const workerText = `Workers: ${formatNumber(requiredWorkers, true)}`;
      let formattedWorkerText;
  
      if (availableWorkers >= requiredWorkers) {
        formattedWorkerText = workerText;
      } else {
        // Use orange color if not enough workers are available
        formattedWorkerText = `<span style="color: orange;">${workerText}</span>`;
      }
  
      costArray.push(formattedWorkerText);
    }

    //Include land cost if applicable
    if(structure.requiresLand) {
      const requiredLand = structure.requiresLand * buildCount;

      const landText = `Land: ${formatNumber(requiredLand, true)}`;
      let formattedLandText;
      if(structure.canAffordLand(buildCount)){
        formattedLandText = landText;
      } else {
        formattedLandText = `<span style="color: red;">${landText}</span>`;
      }
      costArray.push(formattedLandText);
    }

    //Include deposit cost if applicable
    if(structure.requiresDeposit) {
      const requiredDeposit = buildCount;

      const depositText = `Deposit: ${formatNumber(requiredDeposit, true)}`;
      let formattedDepositText;
      if(structure.canAffordDeposit(buildCount)){
        formattedDepositText = depositText;
      } else {
        formattedDepositText = `<span style="color: red;">${depositText}</span>`;
      }
      costArray.push(formattedDepositText);
    }
  
    costDetails = costArray.join(', ');
    costElement.innerHTML = `<strong>Cost:</strong> ${costDetails}`;
  }
  
  function adjustStructureActivation(structure, change) {
    if(structure.requiresLand){
      if(change > 0){
        change = Math.min(change, structure.landAffordCount());
      }
      structure.adjustLand(change);
    }
    structure.active = Math.max(0, Math.min(structure.active + change, structure.count));
    structure.updateResourceStorage(resources);
  }
  
  function updateStructureDisplay(structures) {
    const population = resources.colony.colonists.value;
    for (const structureName in structures) {
      const structure = structures[structureName];
      const combinedStructureRow = document.getElementById(`build-${structureName}`).closest('.combined-building-row');
      const structureRow = document.getElementById(`build-${structureName}`).closest('.building-row');
      const countElement = document.getElementById(`${structureName}-count`);
      const countActiveElement = document.getElementById(`${structureName}-count-active`);
      const buildDisplay = document.getElementById(`${structureName}-build-count`);
  
      // Update visibility based on unlocked state
      if (structure.unlocked && structureRow && !structure.isHidden) {
        combinedStructureRow.style.display = 'flex'; // Show the building when unlocked
      } else {
        combinedStructureRow.style.display = 'none';
      }
  
      if (countElement) {
        countElement.textContent = structure.count;
      } else if (countActiveElement) {
        countActiveElement.textContent = `${formatBigInteger(structure.active)}/${formatBigInteger(structure.count)}`;
      }

      if (buildDisplay) {
        buildDisplay.textContent = formatNumber(selectedBuildCounts[structureName], true);
      }

      // Toggle visibility of the "Hide" button based on conditions
      const buttonContainer = structureRow.querySelector('.button-container');
      const hideButton = buttonContainer.querySelector('.hide-button');

      if (hideButton) {
        if (structure.obsolete && structure.active === 0 && !structure.isHidden) {
          hideButton.style.display = 'inline-block'; // Show the button
        } else {
          hideButton.style.display = 'none'; // Hide the button
        }
      }

      // Toggle visibility of autoBuildContainer based on globalEffects
      const autoBuildContainer = document.getElementById(`${structure.name}-auto-build-container`);
      if (autoBuildContainer) {
        autoBuildContainer.style.display = globalEffects.isBooleanFlagSet('automateConstruction') ? 'flex' : 'none';
        
        // Set auto-build checkbox based on autoBuildEnabled
        const autoBuildCheckbox = autoBuildContainer.querySelector('.auto-build-checkbox');
        if (autoBuildCheckbox) {
          autoBuildCheckbox.checked = structure.autoBuildEnabled;
        }

        const priorityCheckbox = autoBuildContainer.querySelector('.auto-build-priority');
        if (priorityCheckbox) {
          priorityCheckbox.checked = structure.autoBuildPriority;
        }

        const targetCount = Math.ceil((structure.autoBuildPercent * population) / 100);
        const autoBuildTarget = document.getElementById(`${structure.name}-auto-build-target`);
        autoBuildTarget.textContent = `Target : ${formatBigInteger(targetCount)}`;

        const tempControl = autoBuildContainer.querySelector('.ghg-temp-control');
        if(tempControl){
          const enabled = structure.isBooleanFlagSet('terraformingBureauFeature');
          tempControl.style.display = enabled ? 'flex' : 'none';
          const tempCheckbox = tempControl.querySelector('.ghg-temp-checkbox');
          if(tempCheckbox){
            tempCheckbox.checked = ghgFactorySettings.autoDisableAboveTemp;
          }
          const tempInput = tempControl.querySelector('.ghg-temp-input');
          if(tempInput){
            tempInput.value = toDisplayTemperature(ghgFactorySettings.disableTempThreshold);
          }
          const unitSpan = tempControl.querySelector('.ghg-temp-unit');
          if(unitSpan){
            unitSpan.textContent = getTemperatureUnit();
          }
        }
      }
  
      const productivityElement = document.getElementById(`${structureName}-productivity`);
      if (productivityElement) {
        const productivityValue = Math.round((structure.productivity * 100));
        productivityElement.textContent = `${productivityValue}%`;
      
        if (structure.dayNightActivity && dayNightCycle.isNight()) {
          productivityElement.style.color = 'darkblue';
        } else if (productivityValue < 100) {
          productivityElement.style.color = 'red';
        } else {
          productivityElement.style.color = 'inherit';
        }
      }
  
      const button = document.getElementById(`build-${structureName}`);
      if (button) {
        updateStructureButtonText(button, structure, selectedBuildCounts[structureName]);
      }
  
      // Update the production and consumption details
      const productionConsumptionDetails = document.getElementById(`${structureName}-production-consumption`);
      if (productionConsumptionDetails) {
        updateProductionConsumptionDetails(structure, productionConsumptionDetails);
      }

      // Update the cost display
      const costElement = structureRow.querySelector('.structure-cost');
      if (costElement) {
        updateStructureCostDisplay(costElement, structure, selectedBuildCounts[structureName]);
      }

      // Update colony-specific needs display (comfort, energy, food, water)
      if (structure instanceof Colony) {
        updateColonyDetailsDisplay(structureRow, structure);
      }
    }
  }

  function updateProductionConsumptionDetails(structure, productionConsumptionElement) {
    let detailsText = '';
    const effectiveMultiplier = structure.getEffectiveProductionMultiplier();

    // Update storage details if the building provides any
    const storageText = formatStorageDetails(structure.getModifiedStorage());
    if (storageText) {
      detailsText += `<strong>Provides:</strong> ${storageText}`;
    }
  
    // Update production details with modified values
    const productionText = formatResourceDetails(structure.getModifiedProduction());
    if (productionText) {
      if (detailsText) detailsText += ', ';
      detailsText += `<strong>Production:</strong> ${productionText}`;
    }

    // Update consumption details with modified values
    const consumptionText = formatResourceDetails(structure.getModifiedConsumption());
    if (consumptionText) {
      if (detailsText) detailsText += ', ';
      detailsText += `<strong>Consumption:</strong> ${consumptionText}`;
    }
  
    // Update maintenance details
    if (structure.requiresMaintenance && Object.keys(structure.maintenanceCost).length > 0) {
      const maintenanceText = formatMaintenanceDetails(structure.maintenanceCost);
      if (maintenanceText) {
        if (detailsText) {
          detailsText += ', ';
        }
        detailsText += `<strong>Maintenance:</strong> ${maintenanceText}`;
      }
    }
  
    productionConsumptionElement.innerHTML = detailsText;
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
  const containerIds = [
    'resource-buildings-buttons',
    'production-buildings-buttons',
    'energy-buildings-buttons',
    'storage-buildings-buttons',
    'terraforming-buildings-buttons'
  ];

  containerIds.forEach(id => {
    const container = document.getElementById(id);
    if (!container) return;
    const messageId = `${id}-empty-message`;
    let message = document.getElementById(messageId);

    const hasVisible = Array.from(container.getElementsByClassName('combined-building-row'))
      .some(row => row.style.display !== 'none');

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
