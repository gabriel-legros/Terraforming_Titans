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
  for (const category in project.cost) {
    for (const resource in project.cost[category]) {
      costText += `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${project.cost[category][resource]}, `;
    }
  }
  costText = costText.slice(0, -2); // Remove trailing comma and space
  costText += `, Duration: ${project.duration / 1000} seconds`;
  costElement.innerHTML = costText;
  projectItem.appendChild(costElement);

  // Resource Gain Information
  if (project.attributes && project.attributes.resourceGain) {
    const resourceGainElement = document.createElement('p');
    const updatedResourceGain = project.getEffectiveResourceGain();
    let resourceGainText = 'Resource Gain: ';
    for (const category in updatedResourceGain) {
      for (const resource in updatedResourceGain[category]) {
        resourceGainText += `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${updatedResourceGain[category][resource]}, `;
      }
    }
    resourceGainText = resourceGainText.slice(0, -2); // Remove trailing comma and space
    resourceGainElement.innerHTML = resourceGainText;
    resourceGainElement.id = `${project.name}-resource-gain`;
    projectItem.appendChild(resourceGainElement);
  }

  // Create a resource selection UI for projects with resource choice
  if (project.attributes && project.attributes.resourceChoiceGainCost) {
    const resourceSelectionUI = createResourceSelectionUI(project);
    projectItem.appendChild(resourceSelectionUI);
  }

  // Progress Bar
  const progressBarContainer = document.createElement('div');
  progressBarContainer.classList.add('progress-bar-container');
  const progressBar = document.createElement('div');
  progressBar.classList.add('progress-bar');
  progressBar.style.width = '0%';
  progressBarContainer.appendChild(progressBar);
  projectItem.appendChild(progressBarContainer);

  // Project Button
  const projectButton = document.createElement('button');
  projectButton.textContent = `Start ${project.displayName}`;
  projectButton.setAttribute('data-project-name', project.displayName);
  projectItem.appendChild(projectButton);

  // Store elements for later updates
  projectElements[project.name] = {
    button: projectButton,
    progressBar: progressBar,
    costElement: costElement,
  };

  document.getElementById('projects-list').appendChild(projectItem);

  // Button click event to start project
  projectButton.addEventListener('click', function () {
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
  });

  // Add <hr> element between projects for better separation
  const hrElement = document.createElement('hr');
  hrElement.style.border = '1px solid #ccc'; // Set border for the line
  hrElement.style.margin = '10px 0'; // Add margin to separate it from other elements
  projectItem.appendChild(hrElement);
}

function getUpdatedResourceGain(project) {
  const updatedResourceGain = JSON.parse(JSON.stringify(project.attributes.resourceGain || {}));
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

  // Check if the project can be afforded (including any resource choice costs)
  let canAfford = project.canStart();

  // If the project has resource choice gain cost, calculate total cost and update display
  if (project.attributes?.resourceChoiceGainCost) {
    // Update the total cost display for selected resources
    updateTotalCostDisplay(project);

    // Calculate the total cost for all selected resources
    let totalCost = 0;
    document.querySelectorAll(`.resource-selection-${project.name}`).forEach((input) => {
      const resource = input.dataset.resource;
      const quantity = parseInt(input.value, 10) || 0; // Default to 0 if invalid
      const pricePerUnit = project.attributes.resourceChoiceGainCost.colony[resource];
      totalCost += quantity * pricePerUnit;
    });

    // Check if there is enough funding to afford the selected resources
    canAfford = canAfford && resources.colony.funding.value >= totalCost;
  }

  // Update the button text and state
  elements.button.textContent = project.isCompleted
    ? `Completed: ${project.displayName}`
    : project.isActive
      ? `In Progress: ${project.displayName}`
      : `Start ${project.displayName}`;

  elements.button.disabled = project.isActive || (project.isCompleted && !project.repeatable) || !canAfford;

  // Update the progress bar
  elements.progressBar.style.width = `${project.getProgress()}%`;

  // Update the cost text
  let hasCost = false;
  let costText = 'Cost: ';
  for (const category in project.cost) {
    for (const resource in project.cost[category]) {
      hasCost = true;
      const resourceCost = project.cost[category][resource];
      const resourceText = `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${resourceCost}`;
      const enoughResources = resources[category][resource].value >= resourceCost;
      costText += enoughResources ? resourceText : `<span style="color: red;">${resourceText}</span>`;
      costText += ', ';
    }
  }

  if (hasCost) {
    costText = costText.slice(0, -2); // Remove trailing comma and space
    costText += `, Duration: ${project.duration / 1000} seconds`;
    elements.costElement.innerHTML = costText;
    elements.costElement.style.display = 'block'; // Show cost if there is any
  } else {
    elements.costElement.style.display = 'none'; // Hide cost if there is none
  }
}
