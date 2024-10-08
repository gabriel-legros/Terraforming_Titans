const projectElements = {};

function renderProjects() {
  const projectsArray = projectManager.getProjectStatuses(); // Get projects through projectManager
  projectsArray.forEach(project => {
    if (!projectElements[project.name]) {
      createProjectItem(project);
    }
    updateProjectUI(project.name);
  });
}

function createProjectItem(project) {
  const projectItem = document.createElement('div');
  projectItem.classList.add('special-projects-item');

  // Project Description
  const descriptionElement = document.createElement('p');
  descriptionElement.textContent = project.description;
  projectItem.appendChild(descriptionElement);

  // Project Cost
  const costElement = document.createElement('p');
  let costText = 'Cost: ';
  const costArray = [];

  for (const category in project.cost) {
    for (const resource in project.cost[category]) {
      const requiredAmount = project.cost[category][resource];
      const availableAmount = resources[category]?.[resource]?.value || 0;

      // Format resource text based on availability
      const resourceText = `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${requiredAmount}`;
      const formattedResourceText = availableAmount >= requiredAmount
        ? resourceText
        : `<span style="color: red;">${resourceText}</span>`;
      
      costArray.push(formattedResourceText);
    }
  }

  costText += costArray.join(', ');
  costElement.innerHTML = costText;
  projectItem.appendChild(costElement);

  // Repeat Count Display (if project is repeatable and not infinitely repeatable)
  if (project.repeatable && project.maxRepeatCount !== Infinity) {
    repeatCountElement = document.createElement('p');
    repeatCountElement.id = `${project.name}-repeat-count`;
    repeatCountElement.textContent = `Completed: ${project.repeatCount} / ${project.maxRepeatCount}`;
    projectItem.appendChild(repeatCountElement);
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

  // Auto Start Checkbox (Initially hidden)
  const autoStartCheckboxContainer = document.createElement('div');
  autoStartCheckboxContainer.classList.add('auto-start-container', 'hidden');
  const autoStartCheckbox = document.createElement('input');
  autoStartCheckbox.type = 'checkbox';
  autoStartCheckbox.id = `${project.name}-auto-start`;
  autoStartCheckbox.classList.add('auto-start-checkbox');
  autoStartCheckboxContainer.appendChild(autoStartCheckbox);

  const autoStartLabel = document.createElement('label');
  autoStartLabel.htmlFor = `${project.name}-auto-start`;
  autoStartLabel.textContent = 'Auto start project';
  autoStartCheckboxContainer.appendChild(autoStartLabel);

  projectItem.appendChild(autoStartCheckboxContainer);

  // Store elements for later updates
  projectElements[project.name] = {
    progressButton: progressButton,
    costElement: costElement,
    repeatCountElement: project.repeatable && project.maxRepeatCount !== Infinity ? repeatCountElement : null,
    autoStartCheckboxContainer: autoStartCheckboxContainer,
    autoStartCheckbox: autoStartCheckbox,
  };

  document.getElementById('projects-list').appendChild(projectItem);

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
    resourceRow.classList.add('resource-row');

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

  // Update Repeat Count if applicable
  if (elements.repeatCountElement) {
    elements.repeatCountElement.textContent = `Completed: ${project.repeatCount} / ${project.maxRepeatCount}`;
  }

  // Update Resource Gain Information if applicable
  if (project.attributes && project.attributes.resourceGain) {
    const updatedResourceGain = project.getEffectiveResourceGain();
    const resourceGainElement = document.getElementById(`${project.name}-resource-gain`);
    if (resourceGainElement) {
      let resourceGainText = 'Resource Gain: ';
      for (const category in updatedResourceGain) {
        for (const resource in updatedResourceGain[category]) {
          resourceGainText += `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${updatedResourceGain[category][resource]}, `;
        }
      }
      resourceGainText = resourceGainText.slice(0, -2); // Remove trailing comma and space
      resourceGainElement.innerHTML = resourceGainText;
    }
  }

  // Update the cost display, highlighting missing resources in red
  if (elements.costElement) {
    let costText = 'Cost: ';
    const costArray = [];
    for (const category in project.cost) {
      for (const resource in project.cost[category]) {
        const requiredAmount = project.cost[category][resource];
        const availableAmount = resources[category]?.[resource]?.value || 0;

        const resourceText = `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${requiredAmount}`;
        const formattedResourceText = availableAmount >= requiredAmount
          ? resourceText
          : `<span style="color: red;">${resourceText}</span>`;

        costArray.push(formattedResourceText);
      }
    }
    costText += costArray.join(', ');
    elements.costElement.innerHTML = costText;
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
  } else {
    // If the project can still be repeated or started, show the relevant UI elements
    if (elements.costElement) {
      elements.costElement.style.display = 'block';
    }
    if (elements.progressButton) {
      elements.progressButton.style.display = 'block';

      // Update the button text and state
      if (project.isActive) {
        const timeRemaining = Math.max(0, project.remainingTime / 1000).toFixed(2);
        elements.progressButton.textContent = `In Progress: ${timeRemaining} seconds remaining (${project.getProgress()}%)`;
        elements.progressButton.disabled = true; // Disable while in progress
        elements.progressButton.style.background = `linear-gradient(to right, #4caf50 ${project.getProgress()}%, #ccc ${project.getProgress()}%)`;
      } else if (project.isCompleted) {
        elements.progressButton.textContent = `Completed: ${project.displayName}`;
        elements.progressButton.disabled = true; // Disable when completed
        elements.progressButton.style.background = '#4caf50'; // Completed background color
      } else {
        // Display the start text with the duration
        elements.progressButton.textContent = `Start ${project.displayName} (Duration: ${project.duration / 1000} seconds)`;
        elements.progressButton.disabled = !project.canStart(); // Enable only if the project can be started

        // Set background color based on whether the project can start
        if (project.canStart()) {
          elements.progressButton.style.background = '#4caf50'; // Green if it can be started
        } else {
          elements.progressButton.style.background = '#f44336'; // Red if it cannot be started
        }
      }
    }
  }

  // If the project has resource choice gain cost, calculate total cost and update display
  if (project.attributes?.resourceChoiceGainCost) {
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