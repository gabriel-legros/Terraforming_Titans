let projectElements = {};

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


  // Unified Progress Button (created here but appended later so it appears at the bottom)
  const progressButtonContainer = document.createElement('div');
  progressButtonContainer.classList.add('progress-button-container');
  const progressButton = document.createElement('button');
  progressButton.classList.add('progress-button');
  progressButton.style.width = '100%';
  progressButton.textContent = `Start ${project.displayName}`; // Default button text
  progressButton.disabled = false; // Enable or disable based on project state
  progressButtonContainer.appendChild(progressButton);

  // Create a container for both checkboxes on the same row (also appended later)
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


  // Store UI elements for updating later
  projectElements[project.name] = {
    ...projectElements[project.name],
    autoStartCheckbox: autoStartCheckbox,
    autoStartCheckboxContainer: autoStartCheckboxContainer,
    checkboxRowContainer: checkboxRowContainer
  };

  if (typeof project.renderUI === 'function') {
    project.renderUI(projectItem);
  }

  // Append the combined container and progress button at the bottom
  projectItem.appendChild(progressButtonContainer);
  projectItem.appendChild(checkboxRowContainer);

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

        const resourceDisplayName = resources[category]?.[resource]?.displayName ||
          resource.charAt(0).toUpperCase() + resource.slice(1);
        const resourceText = `${resourceDisplayName}: ${formatNumber(requiredAmount, true)}`;
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



  // Update Spaceships Assigned display if applicable
  if (elements?.assignedSpaceshipsDisplay && project.assignedSpaceships != null) {
    elements.assignedSpaceshipsDisplay.textContent = `Spaceships Assigned: ${formatBigInteger(project.assignedSpaceships)}`;
  }

  // Update Available Spaceships display if applicable
  if (elements?.availableSpaceshipsDisplay) {
    elements.availableSpaceshipsDisplay.textContent = `Available: ${formatBigInteger(Math.floor(resources.special.spaceships.value))}`;
  }



  // Update Repeat Count if applicable
  if (elements.repeatCountElement) {
    elements.repeatCountElement.textContent = `Completed: ${project.repeatCount} / ${project.maxRepeatCount}`;
  }

  // Set the auto-start checkbox state based on the project data
  if (elements.autoStartCheckbox) {
    elements.autoStartCheckbox.checked = project.autoStart || false;
  }


  if (elements.waitCapacityCheckbox) {
    elements.waitCapacityCheckbox.checked = project.waitForCapacity !== false;
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
      // Wait capacity visibility handled by project subclass
    }
    else {
      elements.autoStartCheckboxContainer.style.display = 'none';
      // Wait capacity visibility handled by project subclass
    }
  }
}

  if (typeof project.updateUI === 'function') {
    project.updateUI();
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
