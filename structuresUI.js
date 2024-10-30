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
    
    // Add <hr> element for separation
    const hrElement = document.createElement('hr');
    hrElement.style.border = '1px solid #ccc';
    hrElement.style.margin = '10px 0';
    structureRow.appendChild(hrElement);
  });
}
  
// Create a structure row for both buildings and colonies
function createStructureRow(structure, buildCallback, toggleCallback, isColony) {
  const structureRow = document.createElement('div');
  structureRow.classList.add('building-row');

  // Hide the structure if it's not unlocked or if it's hidden
  if (!structure.unlocked || structure.isHidden) {
    structureRow.classList.add('hidden'); // Hide the building
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
  button.textContent = `Build ${structure.displayName}`;

  let selectedBuildCount = 1;
  selectedBuildCounts[structure.name] = selectedBuildCount;

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

  const buildCounts = [1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000];
  buildCounts.forEach((count) => {
    const countButton = document.createElement('button');
    countButton.textContent = formatNumber(count, true);
    countButton.addEventListener('click', function () {
      selectedBuildCounts[structure.name] = count;
      updateStructureButtonText(button, structure, selectedBuildCounts[structure.name]);
      updateStructureCostDisplay(costElement, structure, selectedBuildCounts[structure.name]);
      if (structure.canBeToggled) {
        updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
        updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
      }
    });
    buildCountButtons.appendChild(countButton);
  });

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


  //Autobuild feature, unlocked by research
  const autoBuildContainer = document.createElement('div');
  autoBuildContainer.classList.add('auto-build-container');

  // Checkbox for enabling/disabling auto-build
  const autoBuildCheckbox = document.createElement('input');
  autoBuildCheckbox.type = 'checkbox';
  autoBuildCheckbox.classList.add('auto-build-checkbox');

  autoBuildCheckbox.addEventListener('change', () => {
    structure.autoBuildEnabled = autoBuildCheckbox.checked;
    // Additional logic for enabling/disabling auto-build can go here
  }); 
  autoBuildContainer.appendChild(autoBuildCheckbox);

  const autoBuildLabel = document.createElement('span');
  autoBuildLabel.textContent = 'Auto-build % of pop: ';
  autoBuildContainer.appendChild(autoBuildLabel);

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

  autoBuildContainer.appendChild(autoBuildInput);
  buttonContainer.appendChild(autoBuildContainer);

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

  return structureRow;
}

// Create structure controls for buildings and colonies
function createStructureControls(structure, toggleCallback) {
  const structureControls = document.createElement('div');
  structureControls.classList.add('building-controls');

  let increaseButton = null;
  let decreaseButton = null;

  if (structure.canBeToggled) {
    increaseButton = document.createElement('button');
    increaseButton.textContent = '+1';
    increaseButton.addEventListener('click', function () {
      toggleCallback(structure, selectedBuildCounts[structure.name]);
      updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
    });

    decreaseButton = document.createElement('button');
    decreaseButton.textContent = '-1';
    decreaseButton.addEventListener('click', function () {
      toggleCallback(structure, -selectedBuildCounts[structure.name]);
      updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
    });

    structureControls.appendChild(increaseButton);
    structureControls.appendChild(decreaseButton);
  }

  return { structureControls, increaseButton, decreaseButton };
}

// Update the text of the increase button based on the selected build count
function updateIncreaseButtonText(button, buildCount) {
  button.textContent = `+${buildCount}`;
}

// Update the text of the decrease button based on the selected build count
function updateDecreaseButtonText(button, buildCount) {
  button.textContent = `-${buildCount}`;
}
  
  function updateBuildingDisplay(buildings) {
    updateStructureDisplay(buildings);
  }
  
  function updateStructureButtonText(button, structure, buildCount = 1) {
    let buttonText = `Build ${formatNumber(buildCount, true)} ${structure.displayName}`;
    let canAfford = structure.canAfford(buildCount);
  
    button.textContent = buttonText;
    button.style.color = canAfford ? 'inherit' : 'red';
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
    if (structure.requiresWorker > 0) {
      const requiredWorkers = structure.requiresWorker * buildCount * structure.getEffectiveWorkerMultiplier();
      const availableWorkers = resources.colony.workers?.value || 0;
  
      // Check if there are enough workers available
      const workerText = `Workers: ${requiredWorkers}`;
      let formattedWorkerText;
  
      if (availableWorkers >= structure.requiresWorker) {
        formattedWorkerText = workerText;
      } else {
        // Use yellow color if not enough workers are available
        formattedWorkerText = `<span style="color: orange;">${workerText}</span>`;
      }
  
      costArray.push(formattedWorkerText);
    }
  
    costDetails = costArray.join(', ');
    costElement.innerHTML = `<strong>Cost:</strong> ${costDetails}`;
  }
  
  function adjustStructureActivation(structure, change) {
    structure.active = Math.max(0, Math.min(structure.active + change, structure.count));
    structure.updateResourceStorage(resources);
  }
  
  function updateStructureDisplay(structures) {
    for (const structureName in structures) {
      const structure = structures[structureName];
      const structureRow = document.getElementById(`build-${structureName}`).closest('.building-row');
      const countElement = document.getElementById(`${structureName}-count`);
      const countActiveElement = document.getElementById(`${structureName}-count-active`);
  
      // Update visibility based on unlocked state
      if (structure.unlocked && structureRow && !structure.isHidden) {
        structureRow.classList.remove('hidden'); // Show the building when unlocked
      } else {
        structureRow.classList.add('hidden');
      }
  
      if (countElement) {
        countElement.textContent = structure.count;
      } else if (countActiveElement) {
        countActiveElement.textContent = `${structure.active}/${structure.count}`;
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
      const autoBuildContainer = buttonContainer.querySelector('.auto-build-container');
      if (autoBuildContainer) {
        autoBuildContainer.style.display = globalEffects.isBooleanFlagSet('automateConstruction') ? 'flex' : 'none';
        
        // Set auto-build checkbox based on autoBuildEnabled
        const autoBuildCheckbox = autoBuildContainer.querySelector('.auto-build-checkbox');
        if (autoBuildCheckbox) {
          autoBuildCheckbox.checked = structure.autoBuildEnabled;
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