function createResourceContainers(resourcesData) {
  const resourcesContainer = document.getElementById('resources-container');

  for (const category in resourcesData) {
    // Create a new container for each category
    const categoryContainer = document.createElement('div');
    categoryContainer.classList.add('resource-display');

    // Create and append the header for the category
    const header = document.createElement('h2');
    header.textContent = `${capitalizeFirstLetter(category)} Resources`;
    categoryContainer.appendChild(header);

    // Create and append the resource list container
    const resourceList = document.createElement('div');
    resourceList.id = `${category}-resources-resources-container`;
    categoryContainer.appendChild(resourceList);

    // Append the complete category container to the main container
    resourcesContainer.appendChild(categoryContainer);
  }
}

// Helper function to create the resource DOM element
function createResourceElement(category, resourceObj, resourceName) {
  const resourceElement = document.createElement('div');
  resourceElement.classList.add('resource-item');

  if (resourceName === 'colonists') {
    // Special display for population (colonists) as an integer
    resourceElement.innerHTML = `
      <div class="resource-row ${!resourceObj.hasCap ? 'no-cap' : ''}">
        <div class="resource-name"><strong>${resourceObj.displayName}</strong></div>
        <div class="resource-value" id="${resourceName}-resources-container">${Math.floor(resourceObj.value)}</div>
        ${resourceObj.hasCap ? `
          <div class="resource-slash">/</div>
          <div class="resource-cap"><span id="${resourceName}-cap-resources-container">${Math.floor(resourceObj.cap)}</span></div>
        ` : ''}
        <div class="resource-pps" id="${resourceName}-pps-resources-container">+0/s</div>
      </div>
    `;
  } else if (category === 'underground') {
    // Display for deposits
    resourceElement.innerHTML = `
      <div class="resource-row ${!resourceObj.hasCap ? 'no-cap' : ''}">
        <div class="resource-name"><strong>${resourceObj.displayName}</strong></div>
        <div class="resource-value" id="${resourceName}-available-resources-container">${Math.floor(resourceObj.value - resourceObj.reserved)}</div>
        ${resourceObj.hasCap ? `
          <div class="resource-slash">/</div>
          <div class="resource-cap"><span id="${resourceName}-total-resources-container">${Math.floor(resourceObj.value)}</span></div>
        ` : ''}
        <div class="resource-pps"></div>
      </div>
    `;

    // Add scanning progress below deposits
    const scanningProgressElement = document.createElement('div');
    scanningProgressElement.id = `${resourceName}-scanning-progress-resources-container`;
    scanningProgressElement.classList.add('scanning-progress');
    scanningProgressElement.style.display = 'none'; // Initially hidden
    resourceElement.appendChild(scanningProgressElement);
  } else {
    resourceElement.innerHTML = `
      <div class="resource-row ${!resourceObj.hasCap ? 'no-cap' : ''}">
        <div class="resource-name"><strong>${resourceObj.displayName}</strong></div>
        <div class="resource-value" id="${resourceName}-resources-container">${resourceObj.value.toFixed(2)}</div>
        ${resourceObj.hasCap ? `
          <div class="resource-slash">/</div>
          <div class="resource-cap"><span id="${resourceName}-cap-resources-container">${resourceObj.cap.toFixed(2)}</span></div>
        ` : ''}
        <div class="resource-pps" id="${resourceName}-pps-resources-container">+0/s</div>
      </div>
    `;
  }

  return resourceElement;
}

function populateResourceElements(resources) {
  for (const category in resources) {
    const containerId = `${category}-resources-resources-container`;
    const container = document.getElementById(containerId);
    if (container) {
      for (const resourceName in resources[category]) {
        const resourceObj = resources[category][resourceName];

        // Only render resources that are unlocked
        if (!resourceObj.unlocked) {
          continue; // Skip the resource if it is not unlocked
        }

        // Use helper function to create the resource element
        const resourceElement = createResourceElement(category, resourceObj, resourceName);
        container.appendChild(resourceElement);
      }
    }
  }
}

function unlockResource(resource) {
  // Only proceed if the resource is unlocked and doesn't already exist in the DOM
  if (resource.unlocked && !document.getElementById(`${resource.name}-resources-container`)) {
    const containerId = `${resource.category}-resources-resources-container`;
    const container = document.getElementById(containerId);

    if (container) {
      // Use helper function to create the resource element
      const resourceElement = createResourceElement(resource.category, resource, resource.name);
      container.appendChild(resourceElement);
    }
  }
}

function updateResourceRatesDisplay(resources) {
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resource = resources[category][resourceName];
      const rateElement = document.getElementById(`${resourceName}-pps-resources-container`);

      if (rateElement) {
        const netRate = resource.productionRate - resource.consumptionRate;
        // Format the rate display to indicate positive or negative rate
        rateElement.textContent = `${netRate >= 0 ? '+' : ''}${netRate.toFixed(2)}/s`;
      }
    }
  }
}

function updateResourceDisplay(resources) {
  for (const category in resources) {
    for (const resourceName in resources[category]) {
      const resourceObj = resources[category][resourceName];

      if (resourceName === 'colonists') {
        // Update population as an integer
        const resourceElement = document.getElementById(`${resourceName}-resources-container`);
        if (resourceElement) {
          resourceElement.textContent = formatNumber(Math.floor(resourceObj.value));
        }

        const capElement = document.getElementById(`${resourceName}-cap-resources-container`);
        if (capElement) {
          capElement.textContent = formatNumber(Math.floor(resourceObj.cap));
        }
      } else if (category === 'underground') {
        // Update underground resources
        const availableElement = document.getElementById(`${resourceName}-available-resources-container`);
        const totalElement = document.getElementById(`${resourceName}-total-resources-container`);
        const scanningProgressElement = document.getElementById(`${resourceName}-scanning-progress-resources-container`);

        if (availableElement) {
          availableElement.textContent = formatNumber(Math.floor(resourceObj.value - resourceObj.reserved));
        }

        if (totalElement) {
          totalElement.textContent = formatNumber(Math.floor(resourceObj.value));
        }

        // Update scanning progress if there is scanning strength
        const scanData = oreScanner.scanData[resourceName];
        if (scanData && scanData.currentScanningStrength > 0 && scanningProgressElement) {
          scanningProgressElement.style.display = 'block';
          scanningProgressElement.textContent = `Scanning Progress: ${(scanData.currentScanProgress * 100).toFixed(2)}%`;
        } else if (scanningProgressElement) {
          scanningProgressElement.style.display = 'none'; // Hide progress element if scanning strength is zero
        }
      } else {
        // Update other resources
        const resourceElement = document.getElementById(`${resourceName}-resources-container`);
        if (resourceElement) {
          resourceElement.textContent = formatNumber(resourceObj.value);
        }

        const capElement = document.getElementById(`${resourceName}-cap-resources-container`);
        if (capElement) {
          capElement.textContent = formatNumber(resourceObj.cap);
        }

        const ppsElement = document.getElementById(`${resourceName}-pps-resources-container`);
        if (ppsElement) {
          const netRate = resourceObj.productionRate - resourceObj.consumptionRate;
          ppsElement.textContent = `${netRate >= 0 ? '+' : ''}${netRate.toFixed(2)}/s`;
        }
      }
    }
  }
}

function updateResourceUI(resources) {
  for (const resource of resources) {
    const resourceData = resource.getResourceData();
    // Update DOM elements using `resourceData`
  }
}

function createResourceDisplay(resources) {
  createResourceContainers(resources);
  populateResourceElements(resources);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatNumber(value) {
  if (value >= 1e7) {
    return (value / 1e6).toFixed(1) + 'm'; // For numbers >= 1 million
  } else if (value >= 1e4) {
    return (value / 1e3).toFixed(1) + 'k'; // For numbers >= 1 thousand
  }
  return value.toFixed(0); // For numbers < 1000, return the full number
}