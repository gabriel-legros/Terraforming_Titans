const projectElements = {};

function renderProjects() {
  const projectsArray = getProjectStatuses(); // Now returns an array of full Project objects
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
    if (projectCanStart(project.cost)) {
      const selectedResource = project.attributes?.resourceChoiceGainCost
        ? document.getElementById(`${project.name}-resource-select`).value
        : null;
      const quantity = project.attributes?.resourceChoiceGainCost
        ? parseInt(document.getElementById(`${project.name}-resource-quantity`).value, 10)
        : null;

      if (project.attributes?.resourceChoiceGainCost) {
        const pricePerUnit = project.attributes.resourceChoiceGainCost.colony[selectedResource];
        const totalCost = quantity * pricePerUnit;

        if (resources.colony.funding.value >= totalCost) {
          project.selectedResource = selectedResource;
          project.selectedQuantity = quantity;
          startProject(project.name);
        } else {
          console.log('Not enough funding to start the project.');
        }
      } else {
        startProject(project.name);
      }
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
  // Container for the selection UI
  const selectionContainer = document.createElement('div');
  selectionContainer.classList.add('resource-selection-container');

  // Dropdown for resource selection
  const resourceSelect = document.createElement('select');
  resourceSelect.id = `${project.name}-resource-select`;

  // Populate dropdown with available resources
  for (const resource in project.attributes.resourceChoiceGainCost.colony) {
    const option = document.createElement('option');
    option.value = resource;
    option.textContent = `${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
    resourceSelect.appendChild(option);
  }
  selectionContainer.appendChild(resourceSelect);

  // Input field for quantity
  const quantityInput = document.createElement('input');
  quantityInput.type = 'number';
  quantityInput.min = 1;
  quantityInput.value = 1;
  quantityInput.id = `${project.name}-resource-quantity`;
  selectionContainer.appendChild(quantityInput);

  // Display price per unit
  let selectedResource = resourceSelect.value;
  let pricePerUnit = project.attributes.resourceChoiceGainCost.colony[selectedResource];
  const priceDisplay = document.createElement('p');
  priceDisplay.classList.add('price-display');
  priceDisplay.id = `${project.name}-price-display`;
  priceDisplay.textContent = `Price per unit: ${pricePerUnit} Funding`;
  selectionContainer.appendChild(priceDisplay);

  // Update price per unit dynamically when the selected resource changes
  resourceSelect.addEventListener('change', function () {
    selectedResource = resourceSelect.value;
    pricePerUnit = project.attributes.resourceChoiceGainCost.colony[selectedResource];
    priceDisplay.textContent = `Price per unit: ${pricePerUnit} Funding`;
  });

  return selectionContainer;
}

function updateProjectUI(projectName) {
  const project = projects[projectName];
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
  let canAfford = projectCanStart(project.cost);
  
  if (project.attributes?.resourceChoiceGainCost) {
    const quantityInput = document.getElementById(`${project.name}-resource-quantity`);
    const resourceSelect = document.getElementById(`${project.name}-resource-select`);
    if (quantityInput && resourceSelect) {
      const selectedResource = resourceSelect.value;
      const quantity = parseInt(quantityInput.value, 10);
      const pricePerUnit = project.attributes.resourceChoiceGainCost.colony[selectedResource];
      const totalCost = quantity * pricePerUnit;

      // Update canAfford to include the funding requirement
      canAfford = canAfford && resources.colony.funding.value >= totalCost;

      // Update the price display
      const priceDisplay = document.getElementById(`${project.name}-price-display`);
      if (priceDisplay) {
        priceDisplay.textContent = `Price per unit: ${pricePerUnit} Funding, Total: ${totalCost} Funding`;
      }
    }
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
  let costText = 'Cost: ';
  for (const category in project.cost) {
    for (const resource in project.cost[category]) {
      const resourceCost = project.cost[category][resource];
      const resourceText = `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${resourceCost}`;
      const enoughResources = resources[category][resource].value >= resourceCost;
      costText += enoughResources ? resourceText : `<span style="color: red;">${resourceText}</span>`;
      costText += ', ';
    }
  }
  costText = costText.slice(0, -2); // Remove trailing comma and space
  costText += `, Duration: ${project.duration / 1000} seconds`;
  elements.costElement.innerHTML = costText;
}
