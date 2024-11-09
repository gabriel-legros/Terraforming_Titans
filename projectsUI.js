document.addEventListener('DOMContentLoaded', () => {
  // Subtab functionality to show/hide project categories
  document.querySelectorAll('.projects-subtabs .projects-subtab').forEach(tab => {
    tab.addEventListener('click', function () {
        // Remove the 'active' class from all project subtabs
        document.querySelectorAll('.projects-subtabs .projects-subtab').forEach(t => t.classList.remove('active'));

        // Add the 'active' class to the clicked subtab
        this.classList.add('active');

        // Get the corresponding content element ID from the data attribute
        const category = this.dataset.subtab;

        // Hide all project subtab contents
        document.querySelectorAll('.projects-subtab-content-wrapper .projects-subtab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Show the content of the selected subtab
        document.getElementById(category).classList.add('active');
    });
  });
});

function renderProjects() {
  const projectsArray = projectManager.getProjectStatuses(); // Get projects through projectManager
  projectsArray.forEach(project => {
    if (!project.unlocked) {
      return; // Skip projects that are not unlocked
    }
    
    if (!projectElements[project.name]) {
      createProjectItem(project);
    }
    updateProjectUI(project.name);
  });
}

function createProjectItem(project) {
  const projectItem = document.createElement('div');
  projectItem.classList.add('special-projects-item');

  // Project Name
  const nameElement = document.createElement('h3'); // Use h3 or other heading tag to display the name
  nameElement.textContent = project.displayName || project.name; // Use displayName or fallback to name
  nameElement.classList.add('project-name');
  projectItem.appendChild(nameElement); // Append project name before description

  // Project Description
  const descriptionElement = document.createElement('p');
  descriptionElement.textContent = project.description;
  descriptionElement.classList.add('project-description');
  projectItem.appendChild(descriptionElement);

  // Spaceship Assignment Section
  if (project.attributes.spaceMining || project.attributes.spaceExport) {
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

  // Cost Per Ship and Total Cost Display
  if (project.attributes.costPerShip) {
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

  // Resource Disposal Dropdown for spaceExport projects
  if (project.attributes.spaceExport) {
    const disposalContainer = document.createElement('div');
    disposalContainer.classList.add('disposal-container');

    // Label for disposal resource selection
    const disposalLabel = document.createElement('label');
    disposalLabel.textContent = "Select Resource to Dispose:";
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
    disposalPerShipElement.textContent = `Disposal per Ship: ${formatNumber(project.attributes.disposalAmount, true)}`;
    disposalContainer.appendChild(disposalPerShipElement);

    // Total Disposal Amount
    const totalDisposalElement = document.createElement('span');
    totalDisposalElement.id = `${project.name}-total-disposal`;
    totalDisposalElement.classList.add('project-total-disposal');
    totalDisposalElement.textContent = `Total Disposal: 0`; // Initialize with 0
    disposalContainer.appendChild(totalDisposalElement);

    // Store UI elements for updating later
    projectElements[project.name] = {
      ...projectElements[project.name],
      disposalSelect,
      disposalPerShipElement,
      totalDisposalElement,
    };
  }

  // Resource Gain Per Ship and Total Gain Display
  if (project.attributes.resourceGainPerShip) {
    const resourceGainPerShipElement = document.createElement('p');
    resourceGainPerShipElement.id = `${project.name}-resource-gain-per-ship`;
    resourceGainPerShipElement.classList.add('project-resource-gain-per-ship');
    resourceGainPerShipElement.textContent = `Gain per Ship: ...`; // Initial text

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

  // Mirror-related calculations and text boxes
  if (project.name === 'spaceMirrorFacility') {
    const mirrorDetails = document.createElement('div');
    mirrorDetails.classList.add('mirror-details');
    mirrorDetails.innerHTML = `
      <p>Mirrors: <span id="num-mirrors">0</span></p>
      <p>Power/Mirror: <span id="power-per-mirror">0</span>W | Per m²: <span id="power-per-mirror-area">0</span>W/m²</p>
      <p>Total Power: <span id="total-power">0</span>W | Per m²: <span id="total-power-area">0</span>W/m²</p>
    `;

    projectItem.appendChild(mirrorDetails);

    // Store the mirror details element for future updates
    projectElements[project.name] = {
      ...projectElements[project.name],
      mirrorDetails: {
        numMirrors: mirrorDetails.querySelector('#num-mirrors'),
        powerPerMirror: mirrorDetails.querySelector('#power-per-mirror'),
        powerPerMirrorArea: mirrorDetails.querySelector('#power-per-mirror-area'),
        totalPower: mirrorDetails.querySelector('#total-power'),
        totalPowerArea: mirrorDetails.querySelector('#total-power-area'),
      },
    };
  }

  if (project.cost && Object.keys(project.cost).length > 0) {
    const costElement = document.createElement('p');
    costElement.classList.add('project-cost');
    projectItem.appendChild(costElement);
    projectElements[project.name] = {
      ...projectElements[project.name],
      costElement: costElement,
    };
    updateCostDisplay(project); // Initial call to display the scaled cost
  }

  // Repeat Count Display (if project is repeatable and not infinitely repeatable)
  if (project.repeatable && project.maxRepeatCount !== Infinity) {
    repeatCountElement = document.createElement('p');
    repeatCountElement.id = `${project.name}-repeat-count`;
    repeatCountElement.textContent = `Completed: ${project.repeatCount} / ${project.maxRepeatCount}`;
    projectItem.appendChild(repeatCountElement);

  
    // Store repeat count element
    projectElements[project.name] = {
      ...projectElements[project.name],
      repeatCountElement: repeatCountElement,
    };
  }

  // Resource Gain Information
  if (project.attributes?.resourceGain) {
    const resourceGainElement = document.createElement('p');
    const updatedResourceGain = project.getEffectiveResourceGain();

    let resourceGainEntries = [];
    for (const [category, resources] of Object.entries(updatedResourceGain)) {
      for (const [resource, value] of Object.entries(resources)) {
        resourceGainEntries.push(`${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${value}`);
      }
    }

    resourceGainElement.textContent = `Resource Gain: ${resourceGainEntries.join(', ')}`;
    resourceGainElement.id = `${project.name}-resource-gain`;
    projectItem.appendChild(resourceGainElement);
  }

  // Create a resource selection UI for projects with resource choice
  if (project.attributes && project.attributes.resourceChoiceGainCost) {
    const resourceSelectionUI = createResourceSelectionUI(project);
    projectItem.appendChild(resourceSelectionUI);
  }

  // Unified Progress Button
  const progressButtonContainer = document.createElement('div');
  progressButtonContainer.classList.add('progress-button-container');
  const progressButton = document.createElement('button');
  progressButton.classList.add('progress-button');
  progressButton.style.width = '100%';
  progressButton.textContent = `Start ${project.displayName}`; // Default button text
  progressButton.disabled = false; // Enable or disable based on project state
  progressButtonContainer.appendChild(progressButton);
  projectItem.appendChild(progressButtonContainer);

  // Create a container for both checkboxes on the same row
  const checkboxRowContainer = document.createElement('div');
  checkboxRowContainer.classList.add('checkbox-row-container');

  // Auto Start Checkbox
  const autoStartCheckboxContainer = document.createElement('div');
  autoStartCheckboxContainer.classList.add('checkbox-container');

  const autoStartCheckbox = document.createElement('input');
  autoStartCheckbox.type = 'checkbox';
  autoStartCheckbox.checked = project.autoStart || false; // Set checkbox based on project state
  autoStartCheckbox.id = `${project.name}-auto-start`;
  autoStartCheckbox.classList.add('auto-start-checkbox');

  autoStartCheckbox.addEventListener('change', (event) => {
    project.autoStart = event.target.checked; // Save the state in the project object
  });

  const autoStartLabel = document.createElement('label');
  autoStartLabel.htmlFor = `${project.name}-auto-start`;
  autoStartLabel.textContent = 'Auto start project';

  autoStartCheckboxContainer.appendChild(autoStartCheckbox);
  autoStartCheckboxContainer.appendChild(autoStartLabel);
  checkboxRowContainer.appendChild(autoStartCheckboxContainer);

  // Auto Assign Spaceships Checkbox (Only for space mining projects)
  if (project.attributes.spaceMining || project.attributes.spaceExport) {
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

  // Append the combined container to the project item
  projectItem.appendChild(checkboxRowContainer);

  // Store UI elements for updating later
  projectElements[project.name] = {
    ...projectElements[project.name],
    autoStartCheckbox: autoStartCheckbox,
    autoStartCheckboxContainer: autoStartCheckboxContainer,
    checkboxRowContainer: checkboxRowContainer
  };


  // Store the progress button for later updates
  projectElements[project.name] = {
    ...projectElements[project.name], // Merge with existing properties
    progressButton: progressButton,
  };

  // Store project item in the category container dynamically
  const categoryContainer = getOrCreateCategoryContainer(project.category || 'general');
  categoryContainer.appendChild(projectItem);

  // Button click event to start project
  progressButton.addEventListener('click', function () {
    startProjectWithSelectedResources(project);
  });

  // Add <hr> element between projects for better separation
  const hrElement = document.createElement('hr');
  hrElement.style.border = '1px solid #ccc'; // Set border for the line
  hrElement.style.margin = '10px 0'; // Add margin to separate it from other elements
  projectItem.appendChild(hrElement);
}

function getOrCreateCategoryContainer(category) {
  let categoryContainer = document.getElementById(`${category}-projects-list`);
  if (!categoryContainer) {
    const categorySection = document.createElement('div');
    categorySection.classList.add('projects-subtab-content');
    categorySection.id = `${category}-projects-list`;

    const categoryHeader = document.createElement('h3');
    categoryHeader.textContent = `${capitalizeFirstLetter(category)} Projects`;
    categorySection.appendChild(categoryHeader);

    document.querySelector('.projects-subtab-content-wrapper').appendChild(categorySection);
    categoryContainer = categorySection;
  }
  return categoryContainer;
}

function getUpdatedResourceGain(project) {
  const updatedResourceGain = project.getEffectiveResourceGain;
  return updatedResourceGain;
}

function createResourceSelectionUI(project) {
  const selectionContainer = document.createElement('div');
  selectionContainer.classList.add('resource-selection-container');

  for (const resource in project.attributes.resourceChoiceGainCost.colony) {
    // Container for each resource row
    const resourceRow = document.createElement('div');
    resourceRow.classList.add('project-resource-row');

    // Label for the resource
    const label = document.createElement('label');
    label.textContent = `${resource.charAt(0).toUpperCase() + resource.slice(1)}: `;
    label.classList.add('resource-label');

    // Input field for quantity
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = 0;
    quantityInput.value = 0;
    quantityInput.classList.add('resource-selection-input', `resource-selection-${project.name}`);
    quantityInput.dataset.resource = resource;

    // Cost per unit display
    const pricePerUnit = project.attributes.resourceChoiceGainCost.colony[resource];
    const pricePerUnitDisplay = document.createElement('span');
    pricePerUnitDisplay.classList.add('price-per-unit');
    pricePerUnitDisplay.textContent = `Price per unit: ${pricePerUnit} Funding`;

    // Create buttons for incrementing/decrementing quantity
    const buttonValues = [-100, -10, -1, +1, +10, +100];
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');

    buttonValues.forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('increment-button');
      button.textContent = value > 0 ? `+${value}` : `${value}`;

      // Add event listener to change the value in the input field
      button.addEventListener('click', () => {
        const currentValue = parseInt(quantityInput.value, 10);
        const newValue = Math.max(0, currentValue + value); // Prevent negative values
        quantityInput.value = newValue;

        // Update the total cost display whenever the value changes
        updateTotalCostDisplay(project);
      });

      buttonsContainer.appendChild(button);
    });

    // Append label, input, cost per unit, and buttons to the resource row
    resourceRow.appendChild(label);
    resourceRow.appendChild(quantityInput);
    resourceRow.appendChild(pricePerUnitDisplay);
    resourceRow.appendChild(buttonsContainer);

    // Append resource row to the main selection container
    selectionContainer.appendChild(resourceRow);
  }

  // Add a container to display the total funding cost
  const totalCostDisplay = document.createElement('p');
  totalCostDisplay.classList.add('total-cost-display');
  totalCostDisplay.id = `${project.name}-total-cost-display`;
  totalCostDisplay.textContent = 'Total Funding Cost: 0 Funding';
  selectionContainer.appendChild(totalCostDisplay);

  return selectionContainer;
}

function updateCostDisplay(project) {
  const elements = projectElements[project.name];
  if (elements && elements.costElement) {
    const cost = project.getScaledCost(); // Use scaled cost for display
    let costText = 'Cost: ';
    const costArray = [];

    for (const category in cost) {
      for (const resource in cost[category]) {
        const requiredAmount = cost[category][resource];
        const availableAmount = resources[category]?.[resource]?.value || 0;

        const resourceText = `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${formatNumber(requiredAmount, true)}`;
        const formattedResourceText = availableAmount >= requiredAmount
          ? resourceText
          : `<span style="color: red;">${resourceText}</span>`;
        
        costArray.push(formattedResourceText);
      }
    }

    costText += costArray.join(', ');
    elements.costElement.innerHTML = costText;
  }
}

function updateTotalCostDisplay(project) {
  let totalCost = 0;

  // Iterate through each resource input to calculate the total funding cost
  const quantityInputs = document.querySelectorAll(`.resource-selection-${project.name}`);
  quantityInputs.forEach((input) => {
    const resource = input.dataset.resource;
    const quantity = parseInt(input.value, 10);
    const pricePerUnit = project.attributes.resourceChoiceGainCost.colony[resource];
    totalCost += quantity * pricePerUnit;
  });

  // Update the total cost display element
  const totalCostDisplay = document.getElementById(`${project.name}-total-cost-display`);
  if (totalCostDisplay) {
    totalCostDisplay.textContent = `Total Funding Cost: ${totalCost} Funding`;
  }
}

function updateProjectUI(projectName) {
  const project = projectManager.projects[projectName]; // Use projectManager to get project
  const elements = projectElements[projectName];

  if (!elements) {
    console.error(`UI elements for project "${projectName}" are undefined.`);
    return;
  }

  // Update Spaceships Assigned display if applicable
  if (elements?.assignedSpaceshipsDisplay && project.assignedSpaceships != null) {
    elements.assignedSpaceshipsDisplay.textContent = `Spaceships Assigned: ${project.assignedSpaceships}`;
  }

  // Update Available Spaceships display if applicable
  if (elements?.availableSpaceshipsDisplay) {
    elements.availableSpaceshipsDisplay.textContent = `Available: ${Math.floor(resources.special.spaceships.value)}`;
  }

  updateSpaceshipProjectCostAndGains(project, elements); // Helper function for cost and gain

  if (project.attributes.spaceExport) {
    const elements = projectElements[project.name];

    // Calculate the total disposal amount with scaling factor
    const scalingFactor = project.assignedSpaceships > 100 ? project.assignedSpaceships / 100 : 1;
    const totalDisposalAmount = project.attributes.disposalAmount * scalingFactor;

    elements.totalDisposalElement.textContent = `Total Disposal: ${formatNumber(totalDisposalAmount, true)}`;
  }

  // Update Repeat Count if applicable
  if (elements.repeatCountElement) {
    elements.repeatCountElement.textContent = `Completed: ${project.repeatCount} / ${project.maxRepeatCount}`;
  }

  // Set the auto-start checkbox state based on the project data
  if (elements.autoStartCheckbox) {
    elements.autoStartCheckbox.checked = project.autoStart || false;
  }

  // Check if the auto-assign spaceships checkbox should be checked
  if (elements.autoAssignCheckbox) {
    elements.autoAssignCheckbox.checked = project.autoAssignSpaceships || false;
  }

    // For spaceExport projects, set the saved disposal resource in the dropdown if it exists
    if (project.attributes.spaceExport && project.selectedDisposalResource) {
      const { category, resource } = project.selectedDisposalResource;
      const disposalSelect = elements.disposalSelect; // Retrieve the stored disposalSelect element
      
      if (disposalSelect) {
          disposalSelect.value = `${category}:${resource}`; // Set the dropdown to saved value
      }
  }

  // Update Resource Gain Information if applicable
  if (project.attributes && project.attributes.resourceGain) {
    const updatedResourceGain = project.getEffectiveResourceGain();
    const resourceGainElement = document.getElementById(`${project.name}-resource-gain`);
    if (resourceGainElement) {
      let resourceGainText = 'Resource Gain: ';
      for (const category in updatedResourceGain) {
        for (const resource in updatedResourceGain[category]) {
          resourceGainText += `${resources[category][resource].displayName + resource.slice(1)}: ${formatNumber(updatedResourceGain[category][resource], true)}, `;
        }
      }
      resourceGainText = resourceGainText.slice(0, -2); // Remove trailing comma and space
      resourceGainElement.innerHTML = resourceGainText;
    }
  }

  // Update the cost display, highlighting missing resources in red
  if (elements.costElement) {
    updateCostDisplay(project); // Refresh the cost display with scaled cost
  }

  // Check if the project has reached its maximum repeat count or is completed and not repeatable
  const isMaxRepeatReached = project.repeatable && project.repeatCount >= project.maxRepeatCount;
  const isCompletedAndNotRepeatable = project.isCompleted && !project.repeatable;

  if (isMaxRepeatReached || isCompletedAndNotRepeatable) {
    // Hide cost and progress button if the project can't be repeated anymore
    if (elements.costElement) {
      elements.costElement.style.display = 'none';
    }
    if (elements.progressButton) {
      elements.progressButton.style.display = 'none';
    }
    // Hide the auto-start checkbox container if the project can't be repeated anymore
    if (elements.autoStartCheckboxContainer) {
      elements.autoStartCheckboxContainer.style.display = 'none';
    }
  } else {
    // If the project can still be repeated or started, show the relevant UI elements
    if (elements.costElement) {
      elements.costElement.style.display = 'block';
    }
    if (elements.progressButton) {
      elements.progressButton.style.display = 'block';

      // Update the duration in the progress bar display
      if (elements.progressButton) {
        if (project.isActive) {
          const timeRemaining = Math.max(0, project.remainingTime / 1000).toFixed(2);
          const progressPercent = project.getProgress();
          elements.progressButton.textContent = `In Progress: ${timeRemaining} seconds remaining (${progressPercent}%)`;
          elements.progressButton.style.background = `linear-gradient(to right, #4caf50 ${progressPercent}%, #ccc ${progressPercent}%)`;
        } else if (project.isCompleted) {
          elements.progressButton.textContent = `Completed: ${project.displayName}`;
          elements.progressButton.style.background = '#4caf50';
        } else {
          // Update dynamic duration for spaceMining projects
          let duration = project.duration;
          if (project.attributes.spaceMining || project.attributes.spaceExport) {
            duration = project.calculateSpaceshipAdjustedDuration();
          }
          elements.progressButton.textContent = `Start ${project.displayName} (Duration: ${(duration / 1000).toFixed(2)} seconds)`;

        // Set background color based on whether the project can start
        if (project.canStart()) {
          elements.progressButton.style.background = '#4caf50'; // Green if it can be started
        } else {
          elements.progressButton.style.background = '#f44336'; // Red if it cannot be started
        }
      }
    }
    // Show the auto-start checkbox if the project can be repeated
    if (elements.autoStartCheckboxContainer && projectManager.isBooleanFlagSet('automateSpecialProjects')) {
      elements.autoStartCheckboxContainer.style.display = 'block';
    }
  }
}

  // Update mirror-related calculations and text boxes
  if (project.name === 'spaceMirrorFacility') {
    const numMirrors = buildings['spaceMirror'].active;

    const mirrorEffect = terraforming.calculateMirrorEffect();
    const powerPerMirror = mirrorEffect.interceptedPower;
    const powerPerMirrorArea = mirrorEffect.powerPerUnitArea;
    const totalPower = powerPerMirror * numMirrors;
    const totalPowerArea = powerPerMirrorArea * numMirrors;

    const mirrorDetails = projectElements[project.name].mirrorDetails;
    if (mirrorDetails) {
      mirrorDetails.numMirrors.textContent = formatNumber(numMirrors, false, 2);
      mirrorDetails.powerPerMirror.textContent = formatNumber(powerPerMirror, false, 2);
      mirrorDetails.powerPerMirrorArea.textContent = formatNumber(powerPerMirrorArea, false, 2);
      mirrorDetails.totalPower.textContent = formatNumber(totalPower, false, 2);
      mirrorDetails.totalPowerArea.textContent = formatNumber(totalPowerArea, false, 2);
    }
  }

  // If the project has resource choice gain cost, calculate total cost and update display
  if (project.attributes.resourceChoiceGainCost && (!project.pendingResourceGains || project.pendingResourceGains.length == 0)) {
    // Update the total cost display for selected resources
    const selectedResources = [];
    document.querySelectorAll(`.resource-selection-${project.name}`).forEach((element) => {
      const resource = element.dataset.resource;
      const quantity = parseInt(element.value, 10);
      if (quantity > 0) {
        selectedResources.push({ resource, quantity });
      }
    });
    project.selectedResources = selectedResources;
  }

  // Show or hide the auto start checkbox based on automation flag in projectManager
  if (projectManager.isBooleanFlagSet('automateSpecialProjects')) {
    elements.autoStartCheckboxContainer.classList.remove('hidden');
  } else {
    elements.autoStartCheckboxContainer.classList.add('hidden');
  }

  // Check if the auto-start checkbox is checked and attempt to start the project automatically
  if (elements.autoStartCheckbox?.checked && !project.isActive && !project.isCompleted && project.canStart()) {
    checkAndStartProjectAutomatically(project);
  }
}

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
    elements.totalCostElement.textContent = formatTotalCostDisplay(totalCost);
  }

  // Update Resource Gain per Ship display
  if (elements.resourceGainPerShipElement && project.attributes.resourceGainPerShip) {
    const gainPerShipText = Object.entries(project.attributes.resourceGainPerShip)
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




function startProjectWithSelectedResources(project) {
  if (project.canStart()) {
    const selectedResources = [];
    document.querySelectorAll(`.resource-selection-${project.name}`).forEach((element) => {
      const resource = element.dataset.resource;
      const quantity = parseInt(element.value, 10);
      if (quantity > 0) {
        selectedResources.push({ resource, quantity });
      }
    });
    project.selectedResources = selectedResources;
    projectManager.startProject(project.name);
  } else {
    console.log(`Failed to start project: ${project.name}`);
  }
}

function checkAndStartProjectAutomatically(project) {
  if (project.canStart()) {
    startProjectWithSelectedResources(project);
  }
}

function formatTotalCostDisplay(totalCost) {
  const costArray = [];
  for (const category in totalCost) {
    for (const resource in totalCost[category]) {
      const resourceDisplayName = resources[category][resource].displayName || 
        resource.charAt(0).toUpperCase() + resource.slice(1);
      costArray.push(`${resourceDisplayName}: ${formatNumber(totalCost[category][resource], true)}`);
    }
  }
  return `Total Cost: ${costArray.join(', ')}`;
}

function formatTotalResourceGainDisplay(totalResourceGain) {
  const gainArray = [];
  for (const category in totalResourceGain) {
    for (const resource in totalResourceGain[category]) {
      const resourceDisplayName = resources[category][resource].displayName || 
        resource.charAt(0).toUpperCase() + resource.slice(1);
      gainArray.push(`${resourceDisplayName}: ${formatNumber(totalResourceGain[category][resource], true)}`);
    }
  }
  return `Total Gain: ${gainArray.join(', ')}`;
}