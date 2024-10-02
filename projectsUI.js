// projects-ui.js

const projectElements = {};

function renderProjects() {
  const projectStatuses = getProjectStatuses();
  projectStatuses.forEach(project => {
    if (!projectElements[project.name]) {
      createProjectItem(project);
    }
    updateProjectUI(project.name);
  });
}

function createProjectItem(project) {
    const projectItem = document.createElement('div');
    projectItem.classList.add('special-projects-item');
  
    const projectButton = document.createElement('button');
    projectButton.textContent = `Start ${project.displayName}`;
    projectButton.setAttribute('data-project-name', project.name);
    projectItem.appendChild(projectButton);
  
    const descriptionElement = document.createElement('p');
    descriptionElement.textContent = project.description;
    projectItem.appendChild(descriptionElement);
  
    const costElement = document.createElement('p');
    let costText = 'Cost: ';
    const costParts = [];
    for (const category in project.cost) {
      for (const resource in project.cost[category]) {
        costParts.push(`${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${project.cost[category][resource]}`);
      }
    }
    costText += costParts.join(', ');
    costElement.innerHTML = costText;
    projectItem.appendChild(costElement);
  
    // Add time required
    const durationElement = document.createElement('p');
    durationElement.classList.add('project-duration');
    durationElement.textContent = `Time Required: ${project.duration} seconds`;
    projectItem.appendChild(durationElement);
  
    const progressBarContainer = document.createElement('div');
    progressBarContainer.classList.add('progress-bar-container');
    const progressBar = document.createElement('div');
    progressBar.classList.add('progress-bar');
    progressBar.style.width = '0%';
    progressBarContainer.appendChild(progressBar);
    projectItem.appendChild(progressBarContainer);
  
    projectElements[project.name] = {
      button: projectButton,
      progressBar: progressBar,
      costElement: costElement,
      durationElement: durationElement
    };
  
    document.getElementById('projects-list').appendChild(projectItem);
  
    projectButton.addEventListener('click', function () {
      if (projectCanStart(project.cost)) {
        startProject(project.name);
      }
    });

        // Add <hr> element between building buttons
    const hrElement = document.createElement('hr');
    hrElement.style.border = '1px solid #ccc'; // Set border for the line
    hrElement.style.margin = '10px 0'; // Add margin to separate it from other elements
    projectItem.appendChild(hrElement);
  }

  function updateProjectUI(projectName) {
    const project = projects[projectName];
    const elements = projectElements[projectName];
  
    if (!elements) {
      console.error(`UI elements for project "${projectName}" are undefined.`);
      return;
    }
  
    elements.button.textContent = project.isCompleted
      ? `Completed: ${project.displayName}`
      : project.isActive
        ? `In Progress: ${project.displayName}`
        : `Start ${project.displayName}`;
  
    elements.button.disabled = project.isActive || (project.isCompleted && !project.repeatable);
    elements.progressBar.style.width = `${project.getProgress()}%`;
  
    let costText = 'Cost: ';
    const costParts = [];
    for (const category in project.cost) {
      for (const resource in project.cost[category]) {
        const resourceCost = project.cost[category][resource];
        const resourceText = `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${resourceCost}`;
        const canAfford = resources[category][resource].value >= resourceCost;
        costParts.push(canAfford ? resourceText : `<span style="color: red;">${resourceText}</span>`);
      }
    }
    costText += costParts.join(', ');
    elements.costElement.innerHTML = costText;
  
    // Update the duration display (remaining time if active)
    if (project.isActive) {
      elements.durationElement.textContent = `Time Remaining: ${Math.max(0, (project.remainingTime / 1000).toFixed(2))} seconds`;
    } else {
      elements.durationElement.textContent = `Time Required: ${project.duration / 1000} seconds`;
    }
  }
