// Helper function to update cost and gain displays
function updateSpaceshipProjectCostAndGains(project, elements) {
    // Update Cost per Ship display
    if (elements.costPerShipElement && project.attributes.costPerShip) {
      const costPerShip = project.calculateSpaceshipCost();
      const costPerShipText = Object.entries(costPerShip)
        .flatMap(([category, resourcesList]) =>
          Object.entries(resourcesList)
            .filter(([, adjustedCost]) => adjustedCost > 0) // Only include non-zero costs
            .map(([resource, adjustedCost]) => {
              const resourceDisplayName = resources[category][resource].displayName || 
                resource.charAt(0).toUpperCase() + resource.slice(1);
              const costText = adjustedCost;
              return `${resourceDisplayName}: ${formatNumber(costText, true)}`;
            })
        )
        .join(', ');
  
      elements.costPerShipElement.textContent = `Cost per Ship: ${costPerShipText}`;
    }
  
    // Update Total Cost display
    if (elements.totalCostElement && project.assignedSpaceships != null) {
      const totalCost = project.calculateSpaceshipTotalCost();
      elements.totalCostElement.innerHTML = formatTotalCostDisplay(totalCost);
    }
  
    // Update Resource Gain per Ship display
    if (elements.resourceGainPerShipElement && project.attributes.resourceGainPerShip) {
      const gainPerShip = project.calculateSpaceshipGainPerShip();
      const gainPerShipText = Object.entries(gainPerShip)
        .flatMap(([category, resourcesList]) =>
          Object.entries(resourcesList)
            .filter(([, amount]) => amount > 0) // Only include non-zero gains
            .map(([resource, amount]) => {
              const resourceDisplayName = resources[category][resource].displayName || 
                resource.charAt(0).toUpperCase() + resource.slice(1);
              return `${resourceDisplayName}: ${formatNumber(amount, true)}`;
            })
        ).join(', ');
      
      elements.resourceGainPerShipElement.textContent = `Gain per Ship: ${gainPerShipText}`;
    }
  
    // Update Total Resource Gain display
    if (elements.totalGainElement && project.assignedSpaceships != null) {
      const totalGain = project.calculateSpaceshipTotalResourceGain();
      elements.totalGainElement.textContent = formatTotalResourceGainDisplay(totalGain);
    }
  }

  function createSpaceshipAssignmentUI(project, projectItem) {
    const spaceshipAssignmentContainer = document.createElement('div');
    spaceshipAssignmentContainer.classList.add('spaceship-assignment-container');
  
    // First row: Assigned and Available displays
    const spaceshipInfoContainer = document.createElement('div');
    spaceshipInfoContainer.classList.add('spaceship-info-container');
  
    // Spaceship Assigned Display
    const assignedSpaceshipsDisplay = document.createElement('p');
    assignedSpaceshipsDisplay.id = `${project.name}-assigned-spaceships`;
    assignedSpaceshipsDisplay.classList.add('assigned-spaceships-display');
    assignedSpaceshipsDisplay.textContent = `Spaceships Assigned: 0`;
    spaceshipInfoContainer.appendChild(assignedSpaceshipsDisplay);
  
    // Available Spaceships Display
    const availableSpaceshipsDisplay = document.createElement('span');
    availableSpaceshipsDisplay.id = `${project.name}-available-spaceships`;
    availableSpaceshipsDisplay.classList.add('available-spaceships-display');
    availableSpaceshipsDisplay.textContent = `Available: ${Math.floor(resources.special.spaceships.value)}`;
    spaceshipInfoContainer.appendChild(availableSpaceshipsDisplay);
  
    // Append the first row (Assigned and Available displays)
    spaceshipAssignmentContainer.appendChild(spaceshipInfoContainer);
  
    // Second row: Control buttons for spaceship assignment
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');
  
    const buildCounts = ["-Max", -1000000, -100000, -10000, -1000, -100, -10, -1, 1, 10, 100, 1000, 10000, 100000, 1000000, "+Max"];
    buildCounts.forEach((count) => {
      const button = document.createElement('button');
      button.textContent = typeof count === "string" ? count : (count > 0 ? `+${formatNumber(count, true)}` : `${formatNumber(count, true)}`);
      
      button.addEventListener('click', () => {
        let spaceshipCount;
    
        if (count === "+Max") {
          // Assign all available spaceships
          spaceshipCount = Math.floor(resources.special.spaceships.value);
        } else if (count === "-Max") {
          // Unassign all assigned spaceships for the project
          spaceshipCount = -project.assignedSpaceships;
        } else {
          // Assign or unassign a specific count
          spaceshipCount = count;
        }
    
        assignSpaceshipsToProject(project, spaceshipCount, assignedSpaceshipsDisplay);
      });
    
      buttonsContainer.appendChild(button);
    });
  
    // Append the second row (Control buttons) below the spaceship info
    spaceshipAssignmentContainer.appendChild(buttonsContainer);
    projectItem.appendChild(spaceshipAssignmentContainer);
  
    // Store the elements for later updates
    projectElements[project.name] = {
      ...projectElements[project.name],
      assignedSpaceshipsDisplay: assignedSpaceshipsDisplay,
      availableSpaceshipsDisplay: availableSpaceshipsDisplay,
    };
  }

  function createCostPerShipAndTotalCostUI(project, projectItem) {
    const costPerShipElement = document.createElement('p');
    costPerShipElement.id = `${project.name}-cost-per-ship`;
    costPerShipElement.classList.add('project-cost-per-ship');
    costPerShipElement.textContent = `Cost per Ship: ...`;
  
    const totalCostElement = document.createElement('span');
    totalCostElement.id = `${project.name}-total-cost`;
    totalCostElement.classList.add('project-total-cost');
    totalCostElement.textContent = `Total Cost: ...`;
  
    // Add both on the same row
    const costContainer = document.createElement('div');
    costContainer.classList.add('cost-container');
    costContainer.appendChild(costPerShipElement);
    costContainer.appendChild(totalCostElement);
  
    projectItem.appendChild(costContainer);
  
    projectElements[project.name] = {
      ...projectElements[project.name],
      costPerShipElement,
      totalCostElement,
    };
  }

  function createResourceGainPerShipAndTotalGainUI(project, projectItem) {
    const resourceGainPerShipElement = document.createElement('p');
    resourceGainPerShipElement.id = `${project.name}-resource-gain-per-ship`;
    resourceGainPerShipElement.classList.add('project-resource-gain-per-ship');
    const initialGain = project.calculateSpaceshipGainPerShip();
    const initialGainText = Object.entries(initialGain)
      .flatMap(([category, resourcesList]) =>
        Object.entries(resourcesList)
          .filter(([, amount]) => amount > 0)
          .map(([resource, amount]) => {
            const resourceDisplayName = resources[category][resource].displayName ||
              resource.charAt(0).toUpperCase() + resource.slice(1);
            return `${resourceDisplayName}: ${formatNumber(amount, true)}`;
          })
      ).join(', ');
    resourceGainPerShipElement.textContent = `Gain per Ship: ${initialGainText}`;
  
    const totalGainElement = document.createElement('span');
    totalGainElement.id = `${project.name}-total-resource-gain`;
    totalGainElement.classList.add('project-total-resource-gain');
    totalGainElement.textContent = formatTotalResourceGainDisplay(project.calculateSpaceshipTotalResourceGain());
  
    // Add both on the same row
    const gainContainer = document.createElement('div');
    gainContainer.classList.add('gain-container');
    gainContainer.appendChild(resourceGainPerShipElement);
    gainContainer.appendChild(totalGainElement);
  
    projectItem.appendChild(gainContainer);
  
    projectElements[project.name] = {
      ...projectElements[project.name],
      resourceGainPerShipElement,
      totalGainElement,
    };
  }

  function createAutoAssignSpaceshipsCheckbox(project, checkboxRowContainer) {
    const autoAssignCheckboxContainer = document.createElement('div');
    autoAssignCheckboxContainer.classList.add('checkbox-container');
  
    const autoAssignCheckbox = document.createElement('input');
    autoAssignCheckbox.type = 'checkbox';
    autoAssignCheckbox.checked = project.autoAssignSpaceships || false; // Set checkbox based on project state
    autoAssignCheckbox.id = `${project.name}-auto-assign-spaceships`;
    autoAssignCheckbox.classList.add('auto-assign-checkbox');
  
    // Attach the listener to handle toggling logic
    autoAssignCheckbox.addEventListener('change', (event) => {
      if (event.target.checked) {
        // Set autoAssignSpaceships flag to true for the current project
        project.autoAssignSpaceships = true;
  
        // Turn off the autoAssignSpaceships flag for all other projects
        Object.keys(projectElements).forEach(otherProjectName => {
          if (otherProjectName !== project.name && projectElements[otherProjectName].autoAssignCheckbox) {
            const otherCheckbox = projectElements[otherProjectName].autoAssignCheckbox;
            if (otherCheckbox.checked) {
              // Trigger change event to uncheck and turn off autoAssignSpaceships flag
              otherCheckbox.checked = false;
              otherCheckbox.dispatchEvent(new Event('change'));
            }
          }
        });
      } else {
        // If unchecked, set autoAssignSpaceships flag to false for this project
        project.autoAssignSpaceships = false;
      }
    });
  
    const autoAssignLabel = document.createElement('label');
    autoAssignLabel.htmlFor = `${project.name}-auto-assign-spaceships`;
    autoAssignLabel.textContent = 'Auto assign spaceships';
  
    autoAssignCheckboxContainer.appendChild(autoAssignCheckbox);
    autoAssignCheckboxContainer.appendChild(autoAssignLabel);
    checkboxRowContainer.appendChild(autoAssignCheckboxContainer);
  
    // Store UI elements for updating later
    projectElements[project.name] = {
      ...projectElements[project.name],
      autoAssignCheckbox: autoAssignCheckbox,
      autoAssignCheckboxContainer: autoAssignCheckboxContainer
    };
  }

  function createResourceDisposalUI(project, projectItem) {
    const disposalContainer = document.createElement('div');
    disposalContainer.classList.add('disposal-container');
  
    // Label for disposal resource selection
    const disposalLabel = document.createElement('label');
    disposalLabel.textContent = "Select Resource to Export:";
    disposalContainer.appendChild(disposalLabel);
  
    // Dropdown for selecting the resource to dispose of
    const disposalSelect = document.createElement('select');
    disposalSelect.classList.add('disposal-select');
    disposalSelect.id = `${project.name}-disposal-select`;
  
    // Populate dropdown with disposable resources from project attributes
    for (const [category, resourceList] of Object.entries(project.attributes.disposable)) {
      resourceList.forEach(resource => {
        const option = document.createElement('option');
        option.value = `${category}:${resource}`;
        option.textContent = resources[category][resource].displayName || resource; // Use global resources for display name
        disposalSelect.appendChild(option);
      });
    }
  
    // Event listener for dropdown selection
    disposalSelect.addEventListener('change', (event) => {
      const [category, resource] = event.target.value.split(':');
      project.selectedDisposalResource = { category, resource }; // Update selected disposal resource
    });
  
    disposalContainer.appendChild(disposalSelect);
    projectItem.appendChild(disposalContainer);
  
    // Disposal Amount per Ship
    const disposalPerShipElement = document.createElement('p');
    disposalPerShipElement.id = `${project.name}-disposal-per-ship`;
    disposalPerShipElement.classList.add('project-disposal-per-ship');
    const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;
    const disposalPerShipAmount = project.attributes.disposalAmount * efficiency;
    disposalPerShipElement.textContent = `Maximum Export per Ship: ${formatNumber(disposalPerShipAmount, true)}`;
    disposalContainer.appendChild(disposalPerShipElement);

    //Gain Amount
    if(project.attributes.fundingGainAmount){
        const gainElement = document.createElement('span');
        gainElement.id = `${project.name}-gain-per-ship`;
        gainElement.classList.add('project-disposal-per-ship');
        gainElement.textContent = `Gain per Resource: ${formatNumber(project.attributes.fundingGainAmount, true)}`;
        disposalContainer.appendChild(gainElement);
    }
  
    // Total Disposal Amount
    const totalDisposalElement = document.createElement('span');
    totalDisposalElement.id = `${project.name}-total-disposal`;
    totalDisposalElement.classList.add('project-total-disposal');
    totalDisposalElement.textContent = `Total Export: 0`; // Initialize with 0
    disposalContainer.appendChild(totalDisposalElement);

  
    // Store UI elements for updating later
    projectElements[project.name] = {
      ...projectElements[project.name],
      disposalSelect,
      disposalPerShipElement,
      totalDisposalElement,
    };
  }