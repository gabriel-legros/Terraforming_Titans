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
  updateStoryProjectsVisibility();
});

function renderProjects() {
  const projectsArray = projectManager.getProjectStatuses(); // Get projects through projectManager

  // Create all project items initially
  projectsArray.forEach(project => {
    if (!projectElements[project.name]) {
      createProjectItem(project);
    }
  });

  // Update the UI for each project
  projectsArray.forEach(project => {
    updateProjectUI(project.name);
  });

  updateEmptyProjectMessages();
  updateStoryProjectsVisibility();
}

function initializeProjectsUI() {
  document.querySelectorAll('.projects-list').forEach(container => {
    container.innerHTML = '';
  });
  projectElements = {};
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
    createSpaceshipAssignmentUI(project, projectItem);
  }

  // Cost Per Ship and Total Cost Display
  if (project.attributes.costPerShip) {
    createCostPerShipAndTotalCostUI(project, projectItem);
  }

  // Resource Disposal Dropdown for spaceExport projects
  if (project.attributes.spaceExport) {
    createResourceDisposalUI(project, projectItem);
  }

  // Resource Gain Per Ship and Total Gain Display
  if (project.attributes.resourceGainPerShip) {
    createResourceGainPerShipAndTotalGainUI(project, projectItem);
  }

  if (typeof project.renderUI === 'function') {
    project.renderUI(projectItem);
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

  if (project.attributes.spaceExport) {
    const waitCheckboxContainer = document.createElement('div');
    waitCheckboxContainer.classList.add('checkbox-container');

    const waitCheckbox = document.createElement('input');
    waitCheckbox.type = 'checkbox';
    waitCheckbox.checked = project.waitForCapacity !== false; // default true
    waitCheckbox.id = `${project.name}-wait-capacity`;
    waitCheckbox.classList.add('wait-capacity-checkbox');

    waitCheckbox.addEventListener('change', (event) => {
      project.waitForCapacity = event.target.checked;
    });

    const waitLabel = document.createElement('label');
    waitLabel.htmlFor = `${project.name}-wait-capacity`;
    waitLabel.textContent = 'Wait for full capacity';

    waitCheckboxContainer.appendChild(waitCheckbox);
    waitCheckboxContainer.appendChild(waitLabel);
    checkboxRowContainer.appendChild(waitCheckboxContainer);

    projectElements[project.name] = {
      ...projectElements[project.name],
      waitCapacityCheckbox: waitCheckbox,
      waitCapacityCheckboxContainer: waitCheckboxContainer,
    };
  }

  // Store UI elements for updating later
  projectElements[project.name] = {
    ...projectElements[project.name],
    autoStartCheckbox: autoStartCheckbox,
    autoStartCheckboxContainer: autoStartCheckboxContainer,
    checkboxRowContainer: checkboxRowContainer
  };
  // Append the combined container to the project item
  projectItem.appendChild(checkboxRowContainer);

  // Auto Assign Spaceships Checkbox (Only for space mining projects)
  if (project.attributes.spaceMining || project.attributes.spaceExport) {
    createAutoAssignSpaceshipsCheckbox(project, checkboxRowContainer);
  }


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

  // Store the project item
  projectElements[project.name] = {
    ...projectElements[project.name], // Merge with existing properties
    projectItem : projectItem
  };
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

  for (const category in project.attributes.resourceChoiceGainCost) {
    for (const resourceId in project.attributes.resourceChoiceGainCost[category]) {
      const resource = resources[category][resourceId];
      // Container for each resource row
      const resourceRow = document.createElement('div');
      resourceRow.classList.add('project-resource-row');
      resourceRow.id = `${project.name}-${category}-${resourceId}-row`; // Set the ID of the resource row

      // Check if the resource is unlocked
      if (!resource.unlocked) {
        resourceRow.style.display = 'none'; // Hide the resource row if it's not unlocked
      } else {
        resourceRow.style.display = 'flex';
      }

      // Label for the resource
      const label = document.createElement('label');
      label.textContent = `${resource.displayName}: `;
      label.classList.add('resource-label');

      // Input field for quantity
      const quantityInput = document.createElement('input');
      quantityInput.type = 'number';
      quantityInput.min = 0;
      quantityInput.value = 0;
      quantityInput.classList.add('resource-selection-input', `resource-selection-${project.name}`);
      quantityInput.dataset.category = category;
      quantityInput.dataset.resource = resourceId;

      // Cost per unit display
      const pricePerUnit = project.attributes.resourceChoiceGainCost[category][resourceId];
      const pricePerUnitDisplay = document.createElement('span');
      pricePerUnitDisplay.classList.add('price-per-unit');
      pricePerUnitDisplay.textContent = `Price per unit: ${pricePerUnit} Funding`;

      // Create buttons for incrementing/decrementing quantity
      const buttonValues = [0, 1, 10, 100, 1000, 10000, 100000, 1000000];
      const buttonsContainer = document.createElement('div');
      buttonsContainer.classList.add('buttons-container');

      buttonValues.forEach((value) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.classList.add('increment-button');
        button.textContent = value === 0 ? 'Clear' : `+${formatNumber(value, true)}`;

        // Add event listener to change the value in the input field
        button.addEventListener('click', () => {
          if (value === 0) {
            quantityInput.value = 0; // Set the value to 0 when 'Clear' button is clicked
          } else {
            const currentValue = parseInt(quantityInput.value, 10);
            const newValue = currentValue + value;
            quantityInput.value = newValue;
          }

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
  }

  // Add a container to display the total funding cost
  const totalCostDisplay = document.createElement('p');
  totalCostDisplay.classList.add('total-cost-display');
  totalCostDisplay.id = `${project.name}-total-cost-display`;
  totalCostDisplay.textContent = 'Total Cost: 0 Funding';
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
    const category = input.dataset.category;
    const resource = input.dataset.resource;
    const quantity = parseInt(input.value, 10);
    const pricePerUnit = project.attributes.resourceChoiceGainCost[category][resource];
    totalCost += quantity * pricePerUnit;
  });

  // Update the total cost display element
  const totalCostDisplay = document.getElementById(`${project.name}-total-cost-display`);
  if (totalCostDisplay) {
    totalCostDisplay.innerHTML = formatTotalCostDisplay({colony : {funding : totalCost}});
  }
}

function updateProjectUI(projectName) {
  const project = projectManager.projects[projectName]; // Use projectManager to get project
  const elements = projectElements[projectName];

  if (!elements) {
    console.error(`UI elements for project "${projectName}" are undefined.`);
    return;
  }

  // Update the project item's visibility based on the unlocked state
  const projectItem = elements.projectItem;
  if (projectItem) {
    const planetOk = !project.attributes.planet ||
      (typeof spaceManager !== 'undefined' && spaceManager.getCurrentPlanetKey &&
       spaceManager.getCurrentPlanetKey() === project.attributes.planet);
    if (project.unlocked && planetOk) {
      projectItem.style.display = 'block';
    } else {
      projectItem.style.display = 'none';
    }
  }

  // Update resource rows visibility based on unlocked state
  if (project.attributes.resourceChoiceGainCost) {
    updateTotalCostDisplay(project);
    for (const category in project.attributes.resourceChoiceGainCost) {
      for (const resourceId in project.attributes.resourceChoiceGainCost[category]) {
        const resource = resources[category][resourceId];
        const resourceRowId = `${project.name}-${category}-${resourceId}-row`;
        const resourceRow = document.getElementById(resourceRowId);
        if (resourceRow) {
          if (resource.unlocked) {
            resourceRow.style.display = 'flex'; // Set display to 'flex' if resource is unlocked
          } else {
            resourceRow.style.display = 'none'; // Hide the resource row if it's not unlocked
          }
        }
      }
    }
  }

  // Update Spaceships Assigned display if applicable
  if (elements?.assignedSpaceshipsDisplay && project.assignedSpaceships != null) {
    elements.assignedSpaceshipsDisplay.textContent = `Spaceships Assigned: ${formatBigInteger(project.assignedSpaceships)}`;
  }

  // Update Available Spaceships display if applicable
  if (elements?.availableSpaceshipsDisplay) {
    elements.availableSpaceshipsDisplay.textContent = `Available: ${formatBigInteger(Math.floor(resources.special.spaceships.value))}`;
  }

  if (project.attributes.spaceMining || project.attributes.spaceExport){
    updateSpaceshipProjectCostAndGains(project, elements); // Helper function for cost and gain
  }

  if (project.attributes.spaceExport) {
    const elements = projectElements[project.name];
    const efficiency = typeof shipEfficiency !== 'undefined' ? shipEfficiency : 1;

    if (elements.disposalPerShipElement) {
      const perShip = project.attributes.disposalAmount * efficiency;
      elements.disposalPerShipElement.textContent = `Maximum Export per Ship: ${formatNumber(perShip, true)}`;
    }

    const totalDisposal = project.calculateSpaceshipTotalDisposal();
    let totalAmount = 0;
    for (const category in totalDisposal) {
      for (const resource in totalDisposal[category]) {
        totalAmount += totalDisposal[category][resource];
      }
    }
    elements.totalDisposalElement.textContent = `Total Export: ${formatNumber(totalAmount, true)}`;
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

  if (elements.waitCapacityCheckbox) {
    elements.waitCapacityCheckbox.checked = project.waitForCapacity !== false;
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
          resourceGainText += `${resources[category][resource].displayName}: ${formatNumber(updatedResourceGain[category][resource], true)}, `;
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
          let duration = project.getEffectiveDuration();
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
      if (elements.waitCapacityCheckboxContainer) {
        elements.waitCapacityCheckboxContainer.style.display = 'block';
      }
    }
    else {
      elements.autoStartCheckboxContainer.style.display = 'none';
      if (elements.waitCapacityCheckboxContainer) {
        elements.waitCapacityCheckboxContainer.style.display = 'none';
      }
    }
  }
}

  if (typeof project.updateUI === 'function') {
    project.updateUI();
  }

  if(project.attributes.resourceChoiceGainCost && project.oneTimeResourceGainsDisplay){
    // Update the visible entered amount in the resource selection UI
    project.oneTimeResourceGainsDisplay.forEach(({ resource, quantity }) => {
    const inputElement = document.querySelector(`.resource-selection-${project.name}[data-resource="${resource}"]`);
    if (inputElement) {
      inputElement.value = quantity;
      }
    });
    project.oneTimeResourceGainsDisplay = null;
  }

  // If the project has resource choice gain cost, calculate total cost and update display
  if (project.attributes.resourceChoiceGainCost) {
    // Update the total cost display for selected resources
    const selectedResources = [];
    document.querySelectorAll(`.resource-selection-${project.name}`).forEach((element) => {
      const category = element.dataset.category;
      const resource = element.dataset.resource;
      const quantity = parseInt(element.value, 10);
      if (quantity > 0) {
        selectedResources.push({ category, resource, quantity });
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
      const requiredAmount = totalCost[category][resource];
      const availableAmount = resources[category]?.[resource]?.value || 0;

      const resourceDisplayName = resources[category][resource].displayName ||
        resource.charAt(0).toUpperCase() + resource.slice(1);

      // Check if the player has enough of this resource
      const resourceText = `${resourceDisplayName}: ${formatNumber(requiredAmount, true)}`;
      const formattedResourceText = availableAmount >= requiredAmount
        ? resourceText
        : `<span style="color: red;">${resourceText}</span>`;

      costArray.push(formattedResourceText);
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

function updateEmptyProjectMessages() {
  document.querySelectorAll('.projects-list').forEach(container => {
    const messageId = `${container.id}-empty-message`;
    let message = document.getElementById(messageId);

    const hasVisible = Array.from(container.getElementsByClassName('special-projects-item'))
      .some(item => item.style.display !== 'none');

    if (!hasVisible) {
      if (!message) {
        message = document.createElement('p');
        message.id = messageId;
        message.classList.add('empty-message');
        message.textContent = 'Nothing available for now.';
        container.appendChild(message);
      }
    } else if (message) {
      message.remove();
    }
  });
}


function updateStoryProjectsVisibility() {
  const subtab = document.querySelector('.projects-subtab[data-subtab="story-projects"]');
  const content = document.getElementById('story-projects');
  if (!subtab || !content) return;

  let visible = false;
  if (projectManager && projectManager.projects) {
    visible = Object.values(projectManager.projects).some(p => {
      const planetOk = !p.attributes.planet ||
        (typeof spaceManager !== 'undefined' && spaceManager.getCurrentPlanetKey &&
         spaceManager.getCurrentPlanetKey() === p.attributes.planet);
      return p.category === 'story' && p.unlocked && planetOk;
    });
  }

  if (visible) {
    subtab.classList.remove('hidden');
    content.classList.remove('hidden');
  } else {
    subtab.classList.add('hidden');
    content.classList.add('hidden');
  }
}

function activateProjectSubtab(subtabId) {
  activateSubtab('projects-subtab', 'projects-subtab-content', subtabId, true);
}
