// structures-ui.js

function createBuildingButtons(buildings) {
    createStructureButtons(
      buildings,
      'building-buttons',
      (buildingName) => buildings[buildingName].buildStructure(resources),
      adjustStructureActivation
    );
  }
  
  function createStructureButtons(structures, containerId, buildCallback, toggleCallback) {
    const buttonsContainer = document.getElementById(containerId);
    buttonsContainer.innerHTML = '';
  
    for (const structureName in structures) {
      const structure = structures[structureName];
  
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
      button.id = `build-${structureName}`;
      button.classList.add('building-button');
      button.textContent = `Build ${structure.name}`;
  
      button.addEventListener('click', function () {
        buildCallback(structureName);
        updateStructureButtonText(button, structure);
        updateStructureCostDisplay(costElement, structure);
      });
  
      const structureControls = document.createElement('div');
      structureControls.classList.add('building-controls');
  
      if (structure.canBeToggled) {
        structureControls.innerHTML = `
          <span class="label">Constructed: </span>
          <span id="${structureName}-count-active">${structure.active}/${structure.count}</span>
          <span class="label">Productivity: </span>
          <span id="${structureName}-productivity">0%</span>
        `;
  
        const increaseButton = document.createElement('button');
        increaseButton.id = `${structureName}-increase`;
        increaseButton.textContent = '+';
        const decreaseButton = document.createElement('button');
        decreaseButton.id = `${structureName}-decrease`;
        decreaseButton.textContent = '-';
  
        increaseButton.addEventListener('click', function () {
          toggleCallback(structureName, 1, structures);
        });
        decreaseButton.addEventListener('click', function () {
          toggleCallback(structureName, -1, structures);
        });
  
        structureControls.appendChild(increaseButton);
        structureControls.appendChild(decreaseButton);
      } else {
        structureControls.innerHTML = `
          <span class="label">Constructed: </span>
          <span id="${structureName}-count">${structure.count}</span>
          <span class="label">Productivity: </span>
          <span id="${structureName}-productivity">0%</span>
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
  
      let detailsText = '';
      const productionText = formatResourceDetails(structure.production);
      if (productionText) {
        detailsText += `<strong>Production:</strong> ${productionText}`;
      }
  
      const consumptionText = formatResourceDetails(structure.consumption);
      if (consumptionText) {
        if (detailsText) {
          detailsText += ', ';
        }
        detailsText += `<strong>Consumption:</strong> ${consumptionText}`;
      }
  
      // Calculate maintenance cost per second and add to details only if there is a maintenance cost
      if (structure.requiresMaintenance && Object.keys(structure.maintenanceCost).length > 0) {
        const maintenanceText = formatMaintenanceDetails(structure.maintenanceCost);
        if (maintenanceText) {
          if (detailsText) {
            detailsText += ', ';
          }
          detailsText += `<strong>Maintenance:</strong> ${maintenanceText} per second`;
        }
      }
  
      if (detailsText) {
        productionConsumptionDetails.innerHTML = detailsText;
        productionConsumptionDetails.classList.add('small-text');
        structureRow.appendChild(productionConsumptionDetails);
      }
  
      buttonsContainer.appendChild(structureRow);

      // Add <hr> element between building buttons
      const hrElement = document.createElement('hr');
      hrElement.style.border = '1px solid #ccc'; // Set border for the line
      hrElement.style.margin = '10px 0'; // Add margin to separate it from other elements
      structureRow.appendChild(hrElement);
    }
  }
  
  function updateBuildingDisplay(buildings) {
    updateStructureDisplay(buildings);
  }
  
  function updateStructureButtonText(button, structure) {
    let buttonText = `Build ${structure.name}`;
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
    let costDetails = '';
    for (const category in structure.cost) {
      for (const resource in structure.cost[category]) {
        costDetails += `<div><strong>${capitalizeFirstLetter(resource)}:</strong> ${structure.cost[category][resource]}</div>`;
      }
    }
    costElement.innerHTML = costDetails;
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
    }
  }
  
  // Helper function to format production and consumption details
  function formatResourceDetails(resourceObject) {
    let details = '';
    for (const category in resourceObject) {
      for (const resource in resourceObject[category]) {
        if (resourceObject[category][resource] > 0) {
          details += `${resourceObject[category][resource]} ${resource}, `;
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
  