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
        if (typeof markProjectSubtabViewed === 'function') {
          markProjectSubtabViewed(category);
        }
    });
  });
  updateStoryProjectsVisibility();
  updateMegaProjectsVisibility();
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
  updateMegaProjectsVisibility();
}

function initializeProjectsUI() {
  document.querySelectorAll('.projects-list').forEach(container => {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  });
  projectElements = {};
}

function createProjectItem(project) {
  const projectCard = document.createElement('div');
  projectCard.classList.add('project-card');
  projectCard.dataset.projectName = project.name;

  // Card Header
  const cardHeader = document.createElement('div');
  cardHeader.classList.add('card-header');

  const nameElement = document.createElement('span');
  nameElement.textContent = project.displayName || project.name;
  nameElement.classList.add('card-title');

  const arrow = document.createElement('span');
  arrow.classList.add('collapse-arrow');
  arrow.innerHTML = '&#9660;';
  cardHeader.appendChild(arrow);
  cardHeader.appendChild(nameElement);

  nameElement.addEventListener('click', () => toggleProjectCollapse(projectCard));
  arrow.addEventListener('click', () => toggleProjectCollapse(projectCard));

  const reorderButtons = document.createElement('div');
  reorderButtons.classList.add('reorder-buttons');

  const upButton = document.createElement('button');
  upButton.innerHTML = '&#9650;';
  upButton.addEventListener('click', (e) => moveProject(project.name, 'up', e.shiftKey));
  reorderButtons.appendChild(upButton);

  const downButton = document.createElement('button');
  downButton.innerHTML = '&#9660;';
  downButton.addEventListener('click', (e) => moveProject(project.name, 'down', e.shiftKey));
  reorderButtons.appendChild(downButton);

  cardHeader.appendChild(reorderButtons);

  projectCard.appendChild(cardHeader);

  // Card Body
  const cardBody = document.createElement('div');
  cardBody.classList.add('card-body');
  
  const descriptionElement = document.createElement('p');
  descriptionElement.textContent = project.description;
  descriptionElement.classList.add('project-description');
  cardBody.appendChild(descriptionElement);

  const projectDetails = document.createElement('div');
  projectDetails.classList.add('project-details');

  // Cost
  if (project.cost && Object.keys(project.cost).length > 0) {
    const costElement = document.createElement('p');
    costElement.classList.add('project-cost');
    projectDetails.appendChild(costElement);
    projectElements[project.name] = { ...projectElements[project.name], costElement: costElement };
  }

  // Sustain Cost
  if (project.sustainCost) {
    const sustainContainer = document.createElement('p');
    sustainContainer.classList.add('project-sustain-cost');
    const sustainText = document.createElement('span');
    const info = document.createElement('span');
    info.classList.add('info-tooltip-icon');
    info.title = 'Project will pause if sustain cost is not met.';
    info.innerHTML = '&#9432;';
    sustainContainer.append(sustainText, info);
    projectDetails.appendChild(sustainContainer);
    projectElements[project.name] = { ...projectElements[project.name], sustainCostElement: sustainText };
  }

  // Repeat Count
  if (project.repeatable && project.maxRepeatCount !== Infinity) {
    const repeatCountElement = document.createElement('p');
    repeatCountElement.id = `${project.name}-repeat-count`;
    projectDetails.appendChild(repeatCountElement);
    projectElements[project.name] = { ...projectElements[project.name], repeatCountElement: repeatCountElement };
  }

  // Resource Gain
  if (project.attributes?.resourceGain) {
    const resourceGainElement = document.createElement('p');
    resourceGainElement.id = `${project.name}-resource-gain`;
    projectDetails.appendChild(resourceGainElement);
    projectElements[project.name] = { ...projectElements[project.name], resourceGainElement: resourceGainElement };
  }
  
  cardBody.appendChild(projectDetails);

  if (typeof project.renderUI === 'function') {
    project.renderUI(cardBody);
  }

  projectCard.appendChild(cardBody);

  // Card Footer
  const cardFooter = document.createElement('div');
  cardFooter.classList.add('card-footer');

  // Progress Button
  const progressButtonContainer = document.createElement('div');
  progressButtonContainer.classList.add('progress-button-container');
  const progressButton = document.createElement('button');
  progressButton.classList.add('progress-button');
  progressButton.style.width = '100%';
  progressButton.addEventListener('click', () => startProjectWithSelectedResources(project));
  progressButtonContainer.appendChild(progressButton);
  cardFooter.appendChild(progressButtonContainer);

  // Checkboxes
  const automationSettingsContainer = document.createElement('div');
  automationSettingsContainer.classList.add('automation-settings-container');

  const autoStartCheckboxContainer = document.createElement('div');
  autoStartCheckboxContainer.classList.add('checkbox-container');
  const autoStartCheckbox = document.createElement('input');
  autoStartCheckbox.type = 'checkbox';
  autoStartCheckbox.id = `${project.name}-auto-start`;
  autoStartCheckbox.addEventListener('change', (event) => { project.autoStart = event.target.checked; });
  const autoStartLabel = document.createElement('label');
  autoStartLabel.htmlFor = `${project.name}-auto-start`;
  autoStartLabel.textContent = 'Auto start';
  autoStartCheckboxContainer.appendChild(autoStartCheckbox);
  autoStartCheckboxContainer.appendChild(autoStartLabel);
  automationSettingsContainer.appendChild(autoStartCheckboxContainer);
  cardFooter.appendChild(automationSettingsContainer);

  projectCard.appendChild(cardFooter);

  // Store elements
  projectElements[project.name] = {
    ...projectElements[project.name],
    projectItem: projectCard,
    cardBody: cardBody,
    progressButton: progressButton,
    autoStartCheckbox: autoStartCheckbox,
    autoStartCheckboxContainer: autoStartCheckboxContainer,
    automationSettingsContainer: automationSettingsContainer,
    cardFooter: cardFooter,
    upButton: upButton,
    downButton: downButton
  };

  const categoryContainer = getOrCreateCategoryContainer(project.category || 'general');
  categoryContainer.appendChild(projectCard);
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

function moveProject(projectName, direction, shiftKey = false) {
    const project = projectManager.projects[projectName];
    const category = project.category || 'general';
    const categoryProjects = projectManager.getProjectStatuses().filter(p => (p.category || 'general') === category);
    const unlockedIndexes = [];
    categoryProjects.forEach((p, idx) => { if (p.unlocked) unlockedIndexes.push(idx); });
    const fromIndexFull = categoryProjects.findIndex(p => p.name === projectName);
    const fromUnlockedPos = unlockedIndexes.indexOf(fromIndexFull);

    if (fromUnlockedPos === -1) return;

    let targetUnlockedPos = fromUnlockedPos;
    if (shiftKey) {
        targetUnlockedPos = direction === 'up' ? 0 : unlockedIndexes.length - 1;
    } else {
        targetUnlockedPos = direction === 'up' ? fromUnlockedPos - 1 : fromUnlockedPos + 1;
    }

    if (targetUnlockedPos < 0 || targetUnlockedPos >= unlockedIndexes.length || targetUnlockedPos === fromUnlockedPos) {
        return;
    }

    const toIndexFull = unlockedIndexes[targetUnlockedPos];
    projectManager.reorderProject(fromIndexFull, toIndexFull, category);

    // Manually reorder the DOM to avoid full re-render
    const container = projectElements[projectName].projectItem.parentElement;
    const projectElement = projectElements[projectName].projectItem;

    if (toIndexFull === 0) {
        container.insertBefore(projectElement, container.querySelector('.project-card'));
    } else if (toIndexFull === categoryProjects.length - 1) {
        container.appendChild(projectElement);
    } else {
        const sibling = projectElements[categoryProjects[toIndexFull].name].projectItem;
        if (direction === 'up') {
            container.insertBefore(projectElement, sibling);
        } else {
            container.insertBefore(projectElement, sibling.nextElementSibling);
        }
    }

    // After reordering, update all project UIs to reflect new arrow states
    const projectsToUpdate = projectManager.getProjectStatuses();
    projectsToUpdate.forEach(p => updateProjectUI(p.name));
}

function getUpdatedResourceGain(project) {
  const updatedResourceGain = project.getEffectiveResourceGain;
  return updatedResourceGain;
}


function updateCostDisplay(project) {
  const elements = projectElements[project.name];
  if (elements && elements.costElement) {
    const cost = project.getScaledCost();
    const costArray = [];

    for (const category in cost) {
      for (const resource in cost[category]) {
        const requiredAmount = cost[category][resource];
        const availableAmount = resources[category]?.[resource]?.value || 0;

        const resourceDisplayName = resources[category]?.[resource]?.displayName ||
          resource.charAt(0).toUpperCase() + resource.slice(1);
        const resourceText = `${resourceDisplayName}: ${formatNumber(requiredAmount, true)}`;
        const highlight = availableAmount < requiredAmount &&
          !(project.ignoreCostForResource && project.ignoreCostForResource(category, resource));
        const formattedResourceText = highlight
          ? `<span style="color: red;">${resourceText}</span>`
          : resourceText;
        
        costArray.push(formattedResourceText);
      }
    }

    if (costArray.length > 0) {
      elements.costElement.innerHTML = `<strong>Cost:</strong> ${costArray.join(', ')}`;
      elements.costElement.style.display = 'block';
    } else {
      elements.costElement.style.display = 'none';
    }
  }
}

function updateSustainCostDisplay(project) {
  const elements = projectElements[project.name];
  if (elements && elements.sustainCostElement && project.sustainCost) {
    const costArray = [];
    for (const category in project.sustainCost) {
      for (const resource in project.sustainCost[category]) {
        const perSecond = project.sustainCost[category][resource];
        const resourceDisplayName = resources[category][resource].displayName || resource;
        costArray.push(`${resourceDisplayName}: ${formatNumber(perSecond, true)}/s`);
      }
    }
    if (costArray.length > 0) {
      elements.sustainCostElement.textContent = `Sustain: ${costArray.join(', ')}`;
      elements.sustainCostElement.parentElement.style.display = 'block';
    } else {
      elements.sustainCostElement.parentElement.style.display = 'none';
    }
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
    totalCostDisplay.innerHTML = formatTotalCostDisplay({colony : {funding : totalCost}}, project);
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
  if (elements.resourceGainElement && project.attributes?.resourceGain) {
    const updatedResourceGain = project.getEffectiveResourceGain();
    const gainArray = [];
    for (const category in updatedResourceGain) {
        for (const resource in updatedResourceGain[category]) {
            gainArray.push(`${resources[category][resource].displayName}: ${formatNumber(updatedResourceGain[category][resource], true)}`);
        }
    }
    if (gainArray.length > 0) {
        elements.resourceGainElement.innerHTML = `<strong>Gain:</strong> ${gainArray.join(', ')}`;
        elements.resourceGainElement.style.display = 'block';
    } else {
        elements.resourceGainElement.style.display = 'none';
    }
  }

  // Update the cost display, highlighting missing resources in red
  if (elements.costElement) {
    updateCostDisplay(project); // Refresh the cost display with scaled cost
  }
  if (elements.sustainCostElement) {
    updateSustainCostDisplay(project);
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
        } else if (project.isPaused) {
          const timeRemaining = Math.max(0, project.remainingTime / 1000).toFixed(2);
          elements.progressButton.textContent = `Resume ${project.displayName} (${timeRemaining}s left)`;
          elements.progressButton.style.background = project.canStart() ? '#4caf50' : '#f44336';
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

  if (elements.automationSettingsContainer) {
    if (project instanceof SpaceMiningProject && !elements.pressureControl) {
      const pressureControl = project.createPressureControl();
      elements.automationSettingsContainer.appendChild(pressureControl);
    }
    if (project instanceof SpaceExportBaseProject && !elements.waitCapacityCheckboxContainer) {
      const waitCapacityCheckboxContainer = project.createWaitForCapacityCheckbox();
      elements.automationSettingsContainer.appendChild(waitCapacityCheckboxContainer);
    }
    if (project instanceof SpaceExportBaseProject && !elements.temperatureControl) {
      const tempControl = project.createTemperatureControl();
      elements.automationSettingsContainer.appendChild(tempControl);
    }
  }

  if (typeof AndroidProject !== 'undefined' &&
      project instanceof AndroidProject &&
      !elements.assignedAndroidsDisplay &&
      elements.cardBody) {
    project.createAndroidAssignmentUI(elements.cardBody);
  }





  // Check if the auto-start checkbox is checked and attempt to start the project automatically
  if (elements.autoStartCheckbox?.checked && !project.isActive && !project.isCompleted && project.canStart()) {
    checkAndStartProjectAutomatically(project);
  }
  // Final visibility check for the footer and its contents
  const footer = elements.cardFooter;
  if (footer) {
    const automationSettingsContainer = elements.automationSettingsContainer;
    let hasVisibleAutomationItems = false;

    if (automationSettingsContainer) {
      for (const child of automationSettingsContainer.children) {
        if (child && (child.nodeType === 1 || child instanceof Element) &&
            typeof getComputedStyle === 'function' &&
            getComputedStyle(child).display !== 'none') {
          hasVisibleAutomationItems = true;
          break;
        }
      }
      if (automationSettingsContainer.style) {
        automationSettingsContainer.style.display = hasVisibleAutomationItems ? 'flex' : 'none';
      }
    }

    let progressButtonVisible = false;
    if (
      elements.progressButton &&
      (elements.progressButton.nodeType === 1 || elements.progressButton instanceof Element) &&
      typeof getComputedStyle === 'function'
    ) {
      progressButtonVisible = getComputedStyle(elements.progressButton).display !== 'none';
    }

    // Hide the footer if both the progress button and all automation items are hidden
    if (progressButtonVisible || hasVisibleAutomationItems) {
      footer.style.display = 'flex';
    } else {
      footer.style.display = 'none';
    }
  }

  // Disable/enable reorder buttons
  const category = project.category || 'general';
  const categoryProjectsAll = projectManager.getProjectStatuses().filter(p => (p.category || 'general') === category);
  const categoryProjects = categoryProjectsAll.filter(p => p.unlocked);
  const currentIndex = categoryProjects.findIndex(p => p.name === projectName);

  if (elements.upButton) {
    elements.upButton.classList.toggle('disabled', currentIndex <= 0);
  }
  if (elements.downButton) {
    elements.downButton.classList.toggle('disabled', currentIndex === -1 || currentIndex === categoryProjects.length - 1);
  }
}


function startProjectWithSelectedResources(project) {
  if (project.isPaused) {
    if (!project.resume()) {
      console.log(`Failed to resume project: ${project.name}`);
    }
  } else if (project.canStart()) {
    projectManager.startProject(project.name);
  } else {
    console.log(`Failed to start project: ${project.name}`);
  }
}

function checkAndStartProjectAutomatically(project) {
  if (project.isPaused) {
    if (project.canStart()) {
      startProjectWithSelectedResources(project);
    }
  } else if (project.canStart()) {
    startProjectWithSelectedResources(project);
  }
}

function formatTotalCostDisplay(totalCost, project) {
  const costArray = [];
  for (const category in totalCost) {
    for (const resource in totalCost[category]) {
      const requiredAmount = totalCost[category][resource];
      const availableAmount = resources[category]?.[resource]?.value || 0;

      const resourceDisplayName = resources[category][resource].displayName ||
        resource.charAt(0).toUpperCase() + resource.slice(1);

      // Check if the player has enough of this resource
      const resourceText = `${resourceDisplayName}: ${formatNumber(requiredAmount, true)}`;
      const highlight = availableAmount < requiredAmount &&
        !(project && project.ignoreCostForResource && project.ignoreCostForResource(category, resource));
      const formattedResourceText = highlight
        ? `<span style="color: red;">${resourceText}</span>`
        : resourceText;

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
  document.querySelectorAll('.projects-subtab-content').forEach(container => {
    const messageId = `${container.id}-empty-message`;
    let message = document.getElementById(messageId);

    const hasVisible = Array.from(container.getElementsByClassName('project-card'))
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

function updateMegaProjectsVisibility() {
  const subtab = document.querySelector('.projects-subtab[data-subtab="mega-projects"]');
  const content = document.getElementById('mega-projects');
  if (!subtab || !content) return;

  let visible = false;
  if (projectManager && projectManager.projects) {
    visible = Object.values(projectManager.projects).some(p => {
      const planetOk = !p.attributes.planet ||
        (typeof spaceManager !== 'undefined' && spaceManager.getCurrentPlanetKey &&
         spaceManager.getCurrentPlanetKey() === p.attributes.planet);
      return p.category === 'mega' && p.unlocked && planetOk;
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

let projectTabAlertNeeded = false;
const projectSubtabAlerts = {
  'resources-projects': false,
  'infrastructure-projects': false,
  'mega-projects': false,
  'story-projects': false,
};

function registerProjectUnlockAlert(subtabId) {
  projectTabAlertNeeded = true;
  projectSubtabAlerts[subtabId] = true;
  updateProjectAlert();
}

function updateProjectAlert() {
  const alertEl = document.getElementById('projects-alert');
  if (alertEl) {
    const display = (!gameSettings.silenceUnlockAlert && projectTabAlertNeeded) ? 'inline' : 'none';
    alertEl.style.display = display;
  }
  for (const key in projectSubtabAlerts) {
    const el = document.getElementById(`${key}-alert`);
    if (el) {
      const display = (!gameSettings.silenceUnlockAlert && projectSubtabAlerts[key]) ? 'inline' : 'none';
      el.style.display = display;
    }
  }
}

function markProjectsViewed() {
  projectTabAlertNeeded = false;
  updateProjectAlert();
}

function markProjectSubtabViewed(subtabId) {
  projectSubtabAlerts[subtabId] = false;
  for (const name in projectManager.projects) {
    const p = projectManager.projects[name];
    const cat = p.category || 'resources';
    const id = `${cat}-projects`;
    if (id === subtabId && p.unlocked) {
      p.alertedWhenUnlocked = true;
    }
  }
  if (Object.values(projectSubtabAlerts).every(v => !v)) {
    projectTabAlertNeeded = false;
  }
  updateProjectAlert();
}

function initializeProjectAlerts() {
  projectTabAlertNeeded = false;
  for (const k in projectSubtabAlerts) projectSubtabAlerts[k] = false;
  for (const name in projectManager.projects) {
    const p = projectManager.projects[name];
    if (p.unlocked && !p.alertedWhenUnlocked) {
      projectTabAlertNeeded = true;
      const cat = p.category || 'resources';
      projectSubtabAlerts[`${cat}-projects`] = true;
    }
  }
  updateProjectAlert();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerProjectUnlockAlert, updateProjectAlert, initializeProjectAlerts, markProjectSubtabViewed, markProjectsViewed };
}


function toggleProjectCollapse(projectCard) {
  projectCard.classList.toggle('collapsed');
  const arrow = projectCard.querySelector('.collapse-arrow');
  if (arrow) {
    arrow.innerHTML = projectCard.classList.contains('collapsed') ? '&#9654;' : '&#9660;';
  }
}
