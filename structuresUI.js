// structures-ui.js

// Create an object to store the selected build count for each structure
const selectedBuildCounts = {};

// Create buttons for the buildings based on their categories
function createBuildingButtons() {
  const categorizedBuildings = {
    resource: [],
    storage: [],
    production: [],
    energy: []
  };

  // Categorize buildings
  for (const buildingName in buildings) {
    const building = buildings[buildingName];
    if (categorizedBuildings[building.category]) {
      categorizedBuildings[building.category].push(building);
    }
  }

  // Create buttons for each category
  createStructureButtons(categorizedBuildings.storage, 'storage-buildings-buttons', (buildingName) => buildings[buildingName].buildStructure(resources), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.production, 'production-buildings-buttons', (buildingName) => buildings[buildingName].buildStructure(resources), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.resource, 'resource-buildings-buttons', (buildingName) => buildings[buildingName].buildStructure(resources), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.energy, 'energy-buildings-buttons', (buildingName) => buildings[buildingName].buildStructure(resources), adjustStructureActivation);
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

  if (!structure.unlocked) {
    structureRow.classList.add('hidden'); // Hide the building initially
  }

  const buttonAndControlsContainer = document.createElement('div');
  buttonAndControlsContainer.classList.add('button-controls-container');

  const button = document.createElement('button');
  button.id = `build-${structure.name}`;
  button.classList.add('building-button');
  button.textContent = `Build ${structure.displayName}`;

  let selectedBuildCount = 1;

  button.addEventListener('click', function () {
    buildCallback(structure.name, selectedBuildCounts[structure.name]);
    updateStructureButtonText(button, structure, selectedBuildCounts[structure.name]);
    updateStructureCostDisplay(costElement, structure, selectedBuildCounts[structure.name]);
  });

  buttonAndControlsContainer.appendChild(button);

  // Create build count input and buttons

  const buildCountButtons = document.createElement('div');
  buildCountButtons.classList.add('build-count-buttons');

  
  const { structureControls, increaseButton, decreaseButton } = createStructureControls(structure, toggleCallback, isColony);

  const buildCounts = [1, 10, 100, 1000, 10000];
  buildCounts.forEach((count) => {
    const countButton = document.createElement('button');
    countButton.textContent = count;
    countButton.addEventListener('click', function () {
      selectedBuildCounts[structure.name] = count;
      updateStructureButtonText(button, structure, selectedBuildCount);
      updateStructureCostDisplay(costElement, structure, selectedBuildCount);
      if (structure.canBeToggled) {
        updateIncreaseButtonText(increaseButton, selectedBuildCounts[structure.name]);
        updateDecreaseButtonText(decreaseButton, selectedBuildCounts[structure.name]);
      }
    });
    buildCountButtons.appendChild(countButton);
  });

  buttonAndControlsContainer.appendChild(buildCountButtons);

  buttonAndControlsContainer.appendChild(structureControls);

  const costElement = document.createElement('div');
  costElement.classList.add('structure-cost');
  updateStructureCostDisplay(costElement, structure);

  structureRow.appendChild(buttonAndControlsContainer);
  structureRow.appendChild(costElement);

  const productionConsumptionDetails = document.createElement('div');
  productionConsumptionDetails.classList.add('building-production-consumption');
  productionConsumptionDetails.id = `${structure.name}-production-consumption`;

  updateProductionConsumptionDetails(structure, productionConsumptionDetails);

  if (productionConsumptionDetails.innerHTML) {
    productionConsumptionDetails.classList.add('small-text');
    structureRow.appendChild(productionConsumptionDetails);
  }

  const description = document.createElement('p');
  description.classList.add('building-description');
  description.textContent = structure.description;
  structureRow.appendChild(description);

  // Custom colony display (e.g., baseComfort, energy, food, water) if the structure is a colony
  if (isColony) {
    const colonyDetails = document.createElement('div');
    colonyDetails.classList.add('colony-details');
    colonyDetails.style.display = 'flex'; // Flexbox to display items side by side
    colonyDetails.style.gap = '10px'; // Add some space between the boxes

    // Add comfort, energy, food, water boxes
    const comfortBox = createNeedBox('Comfort', structure.baseComfort, `${structure.name}-comfort`);
    const energyBox = createNeedBox('Energy', structure.filledNeeds.energy, `${structure.name}-energy`);
    const foodBox = createNeedBox('Food', structure.filledNeeds.food, `${structure.name}-food`);
    const happinessBox = createNeedBox('Happiness', structure.happiness, `${structure.name}-happiness`);

    colonyDetails.appendChild(comfortBox);
    colonyDetails.appendChild(energyBox);
    colonyDetails.appendChild(foodBox);
    colonyDetails.appendChild(happinessBox);

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
    structureControls.innerHTML = `
      <span class="label">Constructed: </span>
      <span id="${structure.name}-count-active">${structure.active}/${structure.count}</span>
      <span class="label">Productivity: </span>
      <span id="${structure.name}-productivity">0%</span>
    `;

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
  } else {
    structureControls.innerHTML = `
      <span class="label">Constructed: </span>
      <span id="${structure.name}-count">${structure.count}</span>
      <span class="label">Productivity: </span>
      <span id="${structure.name}-productivity">0%</span>
    `;
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

// Handle the creation of buttons for buildings and colonies
function createBuildingButtons() {
  const categorizedBuildings = {
    resource: [],
    storage: [],
    production: [],
    energy: []
  };

  for (const buildingName in buildings) {
    const building = buildings[buildingName];
    if (categorizedBuildings[building.category]) {
      categorizedBuildings[building.category].push(building);
    }
  }

  createStructureButtons(categorizedBuildings.storage, 'storage-buildings-buttons', (buildingName, buildCount) => buildings[buildingName].buildStructure(resources, buildCount), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.production, 'production-buildings-buttons', (buildingName, buildCount) => buildings[buildingName].buildStructure(resources, buildCount), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.resource, 'resource-buildings-buttons', (buildingName, buildCount) => buildings[buildingName].buildStructure(resources, buildCount), adjustStructureActivation);
  createStructureButtons(categorizedBuildings.energy, 'energy-buildings-buttons', (buildingName, buildCount) => buildings[buildingName].buildStructure(resources, buildCount), adjustStructureActivation);
}

function createColonyButtons(colonies) {
  const colonyArray = Object.values(colonies); // Convert dictionary to array
  createStructureButtons(colonyArray, 'colony-buildings-buttons', (colonyName) => colonies[colonyName].buildStructure(resources), adjustStructureActivation, true);
}
  
  function updateBuildingDisplay(buildings) {
    updateStructureDisplay(buildings);
  }
  
  function updateStructureButtonText(button, structure, buildCount = 1) {
    let buttonText = `Build ${buildCount} ${structure.displayName}`;
    let canAfford = structure.canAfford(buildCount);
  
    button.textContent = buttonText;
    button.style.color = canAfford ? 'inherit' : 'red';
  }
  
  function updateStructureCostDisplay(costElement, structure, buildCount = 1) {
    let costDetails = 'Cost - ';
    const costArray = [];
  
    // Include resource costs
    for (const category in structure.cost) {
      for (const resource in structure.cost[category]) {
        const requiredAmount = structure.cost[category][resource] * buildCount;
        const availableAmount = resources[category][resource]?.value || 0;
  
        // Check if the player has enough of this resource
        const resourceText = `${capitalizeFirstLetter(resource)}: ${requiredAmount}`;
        const formattedResourceText = availableAmount >= requiredAmount
          ? resourceText
          : `<span style="color: red;">${resourceText}</span>`;
        costArray.push(formattedResourceText);
      }
    }
  
    // Include worker cost if applicable
    if (structure.requiresWorker > 0) {
      const requiredWorkers = structure.requiresWorker * buildCount;
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
  
    costDetails += costArray.join(', ');
    costElement.innerHTML = `<div>${costDetails}</div>`;
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
      if (structure.unlocked && structureRow) {
        structureRow.classList.remove('hidden'); // Show the building when unlocked
      }
  
      if (countElement) {
        countElement.textContent = structure.count;
      } else if (countActiveElement) {
        countActiveElement.textContent = `${structure.active}/${structure.count}`;
      }
  
      const productivityElement = document.getElementById(`${structureName}-productivity`);
      if (productivityElement) {
        const productivityValue = Math.round((structure.productivity * 100));
        productivityElement.textContent = `${productivityValue}%`;
        productivityElement.style.color = productivityValue < 100 ? 'red' : 'inherit';
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
      updateNeedBox(structureRow, `${structure.name}-comfort`, 'Comfort', structure.baseComfort);
      updateNeedBox(structureRow, `${structure.name}-energy`, 'Energy', structure.filledNeeds.energy);
      updateNeedBox(structureRow, `${structure.name}-food`, 'Food', structure.filledNeeds.food);
      updateNeedBox(structureRow, `${structure.name}-happiness`, 'Happiness', structure.happiness);
    }
    }
  }

// Helper function to update need boxes dynamically
function updateNeedBox(structureRow, elementId, needName, value) {
  const needBox = structureRow.querySelector(`#${elementId}`);
  if (needBox) {
    // Update the text inside the box and the fill
    const fillElement = needBox.querySelector('.need-fill');
    const textContainer = needBox.querySelector('span');
    fillElement.style.width = `${value === 0 ? 100 : value * 100}%`;
    fillElement.style.backgroundColor = getNeedColor(value);
    textContainer.innerText = `${needName}: ${(value * 100).toFixed(0)}%`;
  }
}

  function updateProductionConsumptionDetails(structure, productionConsumptionElement) {
    let detailsText = '';
    const effectiveMultiplier = structure.getEffectiveProductionMultiplier();
  
    // Update production details with technology multiplier applied
    const productionText = formatResourceDetails(structure.production, effectiveMultiplier);
    if (productionText) {
      detailsText += `<strong>Production:</strong> ${productionText}`;
    }
  
    // Update consumption details
    const consumptionText = formatResourceDetails(structure.consumption);
    if (consumptionText) {
      if (detailsText) {
        detailsText += ', ';
      }
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
  
// Helper function to format production and consumption details with a multiplier
function formatResourceDetails(resourceObject, multiplier = 1) {
  let details = '';
  for (const category in resourceObject) {
    for (const resource in resourceObject[category]) {
      const adjustedValue = resourceObject[category][resource] * multiplier;
      if (adjustedValue > 0) {
        details += `${adjustedValue.toFixed(2)} ${resource}, `;
      }
    }
  }
  return details.slice(0, -2); // Remove the trailing comma and space
}

// Helper function to format maintenance details
function formatMaintenanceDetails(maintenanceCost) {
    let details = '';
    for (const resource in maintenanceCost) {
      if (maintenanceCost[resource] > 0) {
        details += `${maintenanceCost[resource]} ${resource}, `;
      }
    }
    return details.slice(0, -2); // Remove the trailing comma and space
  }
  