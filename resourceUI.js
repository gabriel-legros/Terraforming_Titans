function createResourceContainers(resourcesData) {
  const resourcesContainer = document.getElementById('resources-container');

  for (const category in resourcesData) {
    // Create a new container for each category
    const categoryContainer = document.createElement('div');
    categoryContainer.classList.add('resource-display');

    // Create and append the header for the category
    const header = document.createElement('h3');
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
    const categoryContainer = document.getElementById(containerId).parentElement; // Get the full container, not just the list
    const container = document.getElementById(containerId);

    if (container) {
      let hasUnlockedResources = false;

      for (const resourceName in resources[category]) {
        const resourceObj = resources[category][resourceName];

        // Only render resources that are unlocked
        if (resourceObj.unlocked) {
          hasUnlockedResources = true;

          // Use helper function to create the resource element if it doesn't already exist
          if (!document.getElementById(`${resourceName}-resources-container`)) {
            const resourceElement = createResourceElement(category, resourceObj, resourceName);
            container.appendChild(resourceElement);
          }
        }
      }

      // Hide the entire category container if no resources are unlocked
      if (!hasUnlockedResources) {
        categoryContainer.style.display = 'none';
      } else {
        categoryContainer.style.display = 'block'; // Show the category if resources are unlocked
      }
    }
  }
}

function unlockResource(resource) {
  if (resource.unlocked && !document.getElementById(`${resource.name}-resources-container`) && !document.getElementById(`${resource.name}-available-resources-container`)) {
    const containerId = `${resource.category}-resources-resources-container`;
    const categoryContainer = document.getElementById(containerId).parentElement;
    const container = document.getElementById(containerId);

    if (container) {
      // Use helper function to create the resource element
      const resourceElement = createResourceElement(resource.category, resource, resource.name);
      container.appendChild(resourceElement);

      // Ensure the category container is visible
      categoryContainer.style.display = 'block';
    }
  }
}

function updateResourceRateDisplay(resource){
  const ppsElement = document.getElementById(`${resource.name}-pps-resources-container`);
  if (ppsElement) {
    const netRate = resource.productionRate - resource.consumptionRate;
    const formattedNumber = formatNumber(netRate);
    if(Math.abs(netRate) < 1e-3)
    {
      ppsElement.textContent = `0/s`;
    } else {
      ppsElement.textContent = `${netRate >= 0 ? '+' : ''}${formatNumber(netRate, false, 2)}/s`;
    }
    // Apply red color if netRate is negative and the absolute value is greater than the resource value
    if (netRate < 0 && Math.abs(netRate) > resource.value) {
      ppsElement.style.color = 'red';
    } 
    // Apply orange if netRate is negative but less than or equal to the resource value
    else if (netRate < 0 && Math.abs(netRate) > resource.value / 120) { //If running out in 2 minutes
      ppsElement.style.color = 'orange';
    } 
    // Reset to default color if the condition is not met
    else {
      ppsElement.style.color = '';
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
          resourceElement.textContent = formatNumber(Math.floor(resourceObj.value), true);
        }

        const capElement = document.getElementById(`${resourceName}-cap-resources-container`);
        if (capElement) {
          capElement.textContent = formatNumber(Math.floor(resourceObj.cap), true);
        }

        updateResourceRateDisplay(resourceObj);
      } else if (category === 'underground') {
        // Update underground resources
        const availableElement = document.getElementById(`${resourceName}-available-resources-container`);
        const totalElement = document.getElementById(`${resourceName}-total-resources-container`);
        const scanningProgressElement = document.getElementById(`${resourceName}-scanning-progress-resources-container`);

        if (availableElement) {
          availableElement.textContent = formatNumber(Math.floor(resourceObj.value - resourceObj.reserved), true);
        }

        if (totalElement) {
          totalElement.textContent = formatNumber(Math.floor(resourceObj.value), true);
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
        updateResourceRateDisplay(resourceObj);
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

function formatNumber(value, integer = false, precision = 1) {
  const absValue = Math.abs(value);
  let formatted;

  if (absValue >= 1e18 - 1e15) {
    formatted = integer && absValue % 1e18 === 0 ? (absValue / 1e18) + 'Qn' : (absValue / 1e18).toFixed(precision) + 'Qn';
  } else if (absValue >= 1e15 - 1e12) {
    formatted = integer && absValue % 1e15 === 0 ? (absValue / 1e15) + 'Q' : (absValue / 1e15).toFixed(precision) + 'Q';
  } else if (absValue >= 1e12 - 1e9) {
    formatted = integer && absValue % 1e12 === 0 ? (absValue / 1e12) + 'T' : (absValue / 1e12).toFixed(precision) + 'T';
  } else if (absValue >= 1e9 - 1e6) {
    formatted = integer && absValue % 1e9 === 0 ? (absValue / 1e9) + 'B' : (absValue / 1e9).toFixed(precision) + 'B';
  } else if (absValue >= 1e6 - 1e3) {
    formatted = integer && absValue % 1e6 === 0 ? (absValue / 1e6) + 'M' : (absValue / 1e6).toFixed(precision) + 'M';
  } else if (absValue >= 1e3 - 1) {
    formatted = integer && absValue % 1e3 === 0 ? (absValue / 1e3) + 'k' : (absValue / 1e3).toFixed(precision) + 'k';
  } else if (absValue >= 1e-2) {
    formatted = integer && absValue % 1 === 0 ? absValue.toFixed(0) : absValue.toFixed(precision);
  } else if (absValue >= 1e-3 - 1e-6) {
    formatted = (absValue / 1e-3).toFixed(precision) + 'm'; // Milli
  } else if (absValue >= 1e-6 - 1e-9) {
    formatted = (absValue / 1e-6).toFixed(precision) + 'µ'; // Micro
  } else if (absValue >= 1e-9 - 1e-12) {
    formatted = (absValue / 1e-9).toFixed(precision) + 'n'; // Nano
  } else if (absValue <= 1e-12) {
    formatted = 0;
    value = 0;
  } else {
    formatted = absValue.toExponential(1); // Scientific notation
  }

  return value < 0 ? '-' + formatted : formatted;
}