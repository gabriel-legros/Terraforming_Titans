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

  function populateResourceElements(resources) {
    for (const category in resources) {
      const containerId = `${category}-resources-resources-container`;
      const container = document.getElementById(containerId);
      if (container) {
        for (const resourceName in resources[category]) {
          const resourceObj = resources[category][resourceName];
          const resourceElement = document.createElement('div');
          resourceElement.classList.add('resource-item');
  
          // Different display for deposits
          if (category === 'underground') {
            resourceElement.innerHTML = `
              <strong>${resourceObj.displayName}:</strong>
              <span id="${resourceName}-available-resources-container">${Math.floor(resourceObj.value - resourceObj.reserved)}</span> /
              <span id="${resourceName}-total-resources-container">${Math.floor(resourceObj.value)}</span>
            `;
  
            // Add scanning progress below deposits if there is scanning strength
            const scanningProgressElement = document.createElement('div');
            scanningProgressElement.id = `${resourceName}-scanning-progress-resources-container`;
            scanningProgressElement.classList.add('scanning-progress');
            scanningProgressElement.style.display = 'none'; // Initially hidden
            resourceElement.appendChild(scanningProgressElement);
          } else {
            resourceElement.innerHTML = `
              <strong>${resourceObj.displayName}:</strong>
              <span id="${resourceName}-resources-container">${resourceObj.value.toFixed(2)}</span>
              ${resourceObj.hasCap ? `/ <span id="${resourceName}-cap-resources-container">${resourceObj.cap.toFixed(2)}</span>` : ''}
              <span class="pps" id="${resourceName}-pps-resources-container" style="float: right;">+0/s</span>
            `;
          }
  
          container.appendChild(resourceElement);
        }
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

// Function to update resource display
function updateResourceDisplay(resources) {
    for (const category in resources) {
      for (const resourceName in resources[category]) {
        const resourceObj = resources[category][resourceName];
  
        if (category === 'underground') {
          // Update underground resources
          const availableElement = document.getElementById(`${resourceName}-available-resources-container`);
          const totalElement = document.getElementById(`${resourceName}-total-resources-container`);
          const scanningProgressElement = document.getElementById(`${resourceName}-scanning-progress-resources-container`);
  
          if (availableElement) {
            availableElement.textContent = Math.floor(resourceObj.value - resourceObj.reserved);
          }
  
          if (totalElement) {
            totalElement.textContent = Math.floor(resourceObj.value);
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
            resourceElement.textContent = resourceObj.value.toFixed(2);
          }
  
          const capElement = document.getElementById(`${resourceName}-cap-resources-container`);
          if (capElement) {
            capElement.textContent = resourceObj.cap.toFixed(2);
          }
  
          const ppsElement = document.getElementById(`${resourceName}-pps-resources-container`);
          if (ppsElement) {
            // Use the previous base production rate for display if the current one is reset
            const productionRateToDisplay = resourceObj.baseProductionRate !== 0 ? resourceObj.baseProductionRate : resourceObj.previousBaseProductionRate;
            const baseProductionRate = isNaN(productionRateToDisplay) ? 0 : productionRateToDisplay.toFixed(2);
            ppsElement.textContent = `(${baseProductionRate >= 0 ? '+' : ''}${baseProductionRate}/s)`;
          }
        }
      }
    }
  }

  function createResourceDisplay(resources) {
    createResourceContainers(resources);
    populateResourceElements(resources);
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  function updateResourceUI(resources) {
    for (const resource of resources) {
      const resourceData = resource.getResourceData();
      // Update DOM elements using `resourceData`
    }
  }