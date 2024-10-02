function createStructureButtons(structures, containerId, buildCallback, toggleCallback) {
    const buttonsContainer = document.getElementById(containerId);
    buttonsContainer.innerHTML = '';
  
    for (const structureName in structures) {
      const structure = structures[structureName];
      
      // Create a container for the structure
      const structureRow = document.createElement('div');
      structureRow.classList.add('building-row');
  
      // Create a flex container for button and controls
      const buttonAndControlsContainer = document.createElement('div');
      buttonAndControlsContainer.classList.add('button-controls-container');
  
      // Create structure button
      const button = document.createElement('button');
      button.id = `build-${structureName}`;
      button.classList.add('building-button');
  
      // Set initial button text (no cost included)
      button.textContent = `Build ${structure.name}`;
  
      // Add event listener for building
      button.addEventListener('click', function() {
        buildCallback(structureName);
        updateStructureButtonText(button, structure);
        updateStructureCostDisplay(costElement, structure);
      });
  
      // Create structure controls section
      const structureControls = document.createElement('div');
      structureControls.classList.add('building-controls');
  
      if (structure.canBeToggled) {
        structureControls.innerHTML = `
          <span class="label">Constructed: </span>
          <span id="${structureName}-count-active">${structure.active}/${structure.count}</span>
          <span class="label">Productivity: </span>
          <span id="${structureName}-productivity">0%</span>
        `;
  
        // Add toggling buttons
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
        // Consolidate active/constructed for buildings that cannot be toggled
        structureControls.innerHTML = `
          <span class="label">Constructed: </span>
          <span id="${structureName}-count">${structure.count}</span>
          <span class="label">Productivity: </span>
          <span id="${structureName}-productivity">0%</span>
        `;
      }
  
      // Append button and controls side by side in button-controls-container
      buttonAndControlsContainer.appendChild(button);
      buttonAndControlsContainer.appendChild(structureControls);
  
      // Create cost display element
      const costElement = document.createElement('div');
      costElement.classList.add('structure-cost');
      updateStructureCostDisplay(costElement, structure);
  
      // Create structure description element
      const description = document.createElement('p');
      description.classList.add('building-description');
      description.textContent = structure.description;
  
      // Append elements to structure row
      structureRow.appendChild(buttonAndControlsContainer);  // Button and controls in one row
      structureRow.appendChild(costElement);                 // Cost display below the button
      structureRow.appendChild(description);                 // Description below cost
  
      // Create structure production and consumption details element
      const productionConsumptionDetails = document.createElement('div');
      productionConsumptionDetails.classList.add('building-production-consumption');
  
      // Add production and consumption details only if they exist
      let detailsText = '';
  
      const productionText = formatResourceDetails(structure.production);
      if (productionText) {
        detailsText += `<strong>Production:</strong> ${productionText}`;
      }
  
      const consumptionText = formatResourceDetails(structure.consumption);
      if (consumptionText) {
        if (detailsText) {
          detailsText += ', '; // Add a separator if production details also exist
        }
        detailsText += `<strong>Consumption:</strong> ${consumptionText}`;
      }
  
      // Only add details if either production or consumption exists
      if (detailsText) {
        productionConsumptionDetails.innerHTML = detailsText;
        productionConsumptionDetails.classList.add('small-text');
        structureRow.appendChild(productionConsumptionDetails);
      }
  
      // Append structure row to container
      buttonsContainer.appendChild(structureRow);
    }
  }


  
  // Function to update button text based on resources available
  function updateStructureButtonText(button, structure) {
    let buttonText = `Build ${structure.name}`;
    let canAfford = true;
  
    // Check if resources are available
    for (const category in structure.cost) {
      for (const resource in structure.cost[category]) {
        const requiredAmount = structure.cost[category][resource];
        if (resources[category][resource].value < requiredAmount) {
          canAfford = false;
        }
      }
    }
  
    // Update button text
    button.textContent = buttonText;
  
    // Set button color based on affordability
    button.style.color = canAfford ? 'inherit' : 'red';
  }
  
  // Function to update cost display under each button
  function updateStructureCostDisplay(costElement, structure) {
    let costDetails = '';
    for (const category in structure.cost) {
      for (const resource in structure.cost[category]) {
        const requiredAmount = structure.cost[category][resource];
        costDetails += `<div><strong>${capitalizeFirstLetter(resource)}:</strong> ${requiredAmount}</div>`;
      }
    }
    costElement.innerHTML = costDetails;
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
  
  // Function to adjust structure activation count (used by both buildings and colonies)
  function adjustStructureActivation(structureName, change, structures) {
    const structure = structures[structureName];
    const newActive = Math.max(0, Math.min(structure.active + change, structure.count));
    structure.active = newActive;
    updateStructureDisplay(structures);
  }
  
  function updateStructureDisplay(structures) {
    for (const structureName in structures) {
      const structure = structures[structureName];
      const countElement = document.getElementById(`${structureName}-count`);
      const activeElement = document.getElementById(`${structureName}-active`);
      const countActiveElement = document.getElementById(`${structureName}-count-active`);
  
      if (countElement) {
        // Update both count and active separately
        countElement.textContent = structure.count;
      } else if (countActiveElement) {
        // Update consolidated display for togglable structures
        countActiveElement.textContent = `${structure.active}/${structure.count}`;
      }
  
      const productivityElement = document.getElementById(`${structureName}-productivity`);
      if (productivityElement) {
        // Round the productivity value to the nearest multiple of 5
        const productivityValue = Math.round((structure.productivity * 100) / 5) * 5;
        productivityElement.textContent = `${productivityValue}%`;
        // Set the text color to red if productivity is less than 100%
        productivityElement.style.color = productivityValue < 100 ? 'red' : 'inherit';
      }
  
      // Update the button text color and cost display based on the current resources
      const button = document.getElementById(`build-${structureName}`);
      if (button) {
        updateStructureButtonText(button, structure);
      }
    }
  }