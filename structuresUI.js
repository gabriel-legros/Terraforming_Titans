// structures-ui.js

// Create buttons for the buildings based on their categories
function createBuildingButtons() {
  const categorizedBuildings = {
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
  createStructureButtons(categorizedBuildings.energy, 'energy-buildings-buttons', (buildingName) => buildings[buildingName].buildStructure(resources), adjustStructureActivation);
}
  
function createStructureButtons(structures, containerId, buildCallback, toggleCallback) {
    const buttonsContainer = document.getElementById(containerId);
    buttonsContainer.innerHTML = '';
  
    // Group buildings by category
    const buildingsByCategory = {};
    for (const structureName in structures) {
      const structure = structures[structureName];
      if (!buildingsByCategory[structure.category]) {
        buildingsByCategory[structure.category] = [];
      }
      buildingsByCategory[structure.category].push(structure);
    }
  
    // Create UI for each category and its buildings
    for (const category in buildingsByCategory) {
  
      // Add buildings under this category
      const categoryBuildings = buildingsByCategory[category];
      categoryBuildings.forEach((structure) => {
        // Create a container for the structure
        const structureRow = document.createElement('div');
        structureRow.classList.add('building-row');
  
        // Add the hidden class if the building is not unlocked
        if (!structure.unlocked) {
          structureRow.classList.add('hidden'); // Hide the building initially using the CSS class
        }
  
        const buttonAndControlsContainer = document.createElement('div');
        buttonAndControlsContainer.classList.add('button-controls-container');
  
        // Create the structure button
        const button = document.createElement('button');
        button.id = `build-${structure.name}`;
        button.classList.add('building-button');
        button.textContent = `Build ${structure.displayName}`;
  
        button.addEventListener('click', function () {
          buildCallback(structure.name);
          updateStructureButtonText(button, structure);
          updateStructureCostDisplay(costElement, structure);
        });
  
        const structureControls = document.createElement('div');
        structureControls.classList.add('building-controls');
  
        if (structure.canBeToggled) {
          structureControls.innerHTML = `
            <span class="label">Constructed: </span>
            <span id="${structure.name}-count-active">${structure.active}/${structure.count}</span>
            <span class="label">Productivity: </span>
            <span id="${structure.name}-productivity">0%</span>
          `;
  
          const increaseButton = document.createElement('button');
          increaseButton.id = `${structure.name}-increase`;
          increaseButton.textContent = '+';
          const decreaseButton = document.createElement('button');
          decreaseButton.id = `${structure.name}-decrease`;
          decreaseButton.textContent = '-';
  
          increaseButton.addEventListener('click', function () {
            toggleCallback(structure.name, 1, structures);
          });
          decreaseButton.addEventListener('click', function () {
            toggleCallback(structure.name, -1, structures);
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
  
        buttonAndControlsContainer.appendChild(button);
        buttonAndControlsContainer.appendChild(structureControls);
  
        const costElement = document.createElement('div');
        costElement.classList.add('structure-cost');
        updateStructureCostDisplay(costElement, structure);
  
        const description = document.createElement('p');
        description.classList.add('building-description');
        description.textContent = structure.description;
  
        structureRow.appendChild(buttonAndControlsContainer);
        structureRow.appendChild(costElement);
        structureRow.appendChild(description);
  
        const productionConsumptionDetails = document.createElement('div');
        productionConsumptionDetails.classList.add('building-production-consumption');
        productionConsumptionDetails.id = `${structure.name}-production-consumption`;
  
        updateProductionConsumptionDetails(structure, productionConsumptionDetails);
  
        if (productionConsumptionDetails.innerHTML) {
          productionConsumptionDetails.classList.add('small-text');
          structureRow.appendChild(productionConsumptionDetails);
        }
  
        buttonsContainer.appendChild(structureRow);
  
        // Add <hr> element between building buttons
        const hrElement = document.createElement('hr');
        hrElement.style.border = '1px solid #ccc'; // Set border for the line
        hrElement.style.margin = '10px 0'; // Add margin to separate it from other elements
        structureRow.appendChild(hrElement);
      });
    }
  }
  
  function updateBuildingDisplay(buildings) {
    updateStructureDisplay(buildings);
  }
  
  function updateStructureButtonText(button, structure) {
    let buttonText = `Build ${structure.displayName}`;
    let canAfford = true;
  
    for (const category in structure.cost) {
      for (const resource in structure.cost[category]) {
        if (resources[category][resource].value < structure.cost[category][resource]) {
          canAfford = false;
        }
      }
    }
  
    button.textContent = buttonText;
    button.style.color = canAfford ? 'inherit' : 'red';
  }
  
  function updateStructureCostDisplay(costElement, structure) {
    let costDetails = 'Cost - ';
    const costArray = [];
    
    for (const category in structure.cost) {
      for (const resource in structure.cost[category]) {
        costArray.push(`${capitalizeFirstLetter(resource)}: ${structure.cost[category][resource]}`);
      }
    }
    
    costDetails += costArray.join(', ');
    costElement.innerHTML = `<div>${costDetails}</div>`;
  }
  
  function adjustStructureActivation(structureName, change, structures) {
    const structure = structures[structureName];
    structure.active = Math.max(0, Math.min(structure.active + change, structure.count));
    structure.setStorage(resources);
    updateStructureDisplay(structures);
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
        const productivityValue = Math.round((structure.productivity * 100) / 5) * 5;
        productivityElement.textContent = `${productivityValue}%`;
        productivityElement.style.color = productivityValue < 100 ? 'red' : 'inherit';
      }
  
      const button = document.getElementById(`build-${structureName}`);
      if (button) {
        updateStructureButtonText(button, structure);
      }
  
      // Update the production and consumption details
      const productionConsumptionDetails = document.getElementById(`${structureName}-production-consumption`);
      if (productionConsumptionDetails) {
        updateProductionConsumptionDetails(structure, productionConsumptionDetails);
      }
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
  