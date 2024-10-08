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
        const table = document.createElement('table');
        table.classList.add('resource-table');
  
        for (const resourceName in resources[category]) {
          const resourceObj = resources[category][resourceName];
  
          const row = document.createElement('tr');
          row.classList.add('resource-row');
  
          // Resource name (with fixed width)
          const nameCell = document.createElement('td');
          nameCell.classList.add('resource-name');
          nameCell.innerHTML = `<strong>${resourceObj.displayName}:</strong>`;
          row.appendChild(nameCell);
  
          // Resource value
          const valueCell = document.createElement('td');
          valueCell.id = `${resourceName}-resources-container`;
          valueCell.textContent = Math.floor(resourceObj.value);
          row.appendChild(valueCell);
  
          // Cap value (only if the resource has a cap)
          if (resourceObj.hasCap) {
            const capCell = document.createElement('td');
            capCell.id = `${resourceName}-cap-resources-container`;
            capCell.textContent = `${Math.floor(resourceObj.cap)}`;
            row.appendChild(capCell);
          } else {
            const emptyCell1 = document.createElement('td');
            emptyCell1.colSpan = 1;
            row.appendChild(emptyCell1);
          }
  
          // PPS (Production per second) value, aligned to the right
          const ppsCell = document.createElement('td');
          ppsCell.classList.add('pps');
          ppsCell.id = `${resourceName}-pps-resources-container`;
          ppsCell.textContent = '+0/s';
          ppsCell.style.textAlign = 'right'; // Force right alignment for PPS
          row.appendChild(ppsCell);
  
          // Special handling for underground (deposit) resources to show scanning progress
          if (category === 'underground') {
            const scanningRow = document.createElement('tr');
            const scanningProgressCell = document.createElement('td');
            scanningProgressCell.colSpan = 5; // Adjust to span all columns for full-width scanning progress
            
            const scanningProgressElement = document.createElement('div');
            scanningProgressElement.id = `${resourceName}-scanning-progress-resources-container`;
            scanningProgressElement.classList.add('scanning-progress');
            scanningProgressElement.style.display = 'none'; // Initially hidden
            scanningProgressElement.innerHTML = `<span>Scanning Progress: <span id="${resourceName}-scanning-progress-text">0%</span></span>`;
  
            scanningProgressCell.appendChild(scanningProgressElement);
            scanningRow.appendChild(scanningProgressCell);
            
            table.appendChild(row);
            table.appendChild(scanningRow);
          } else {
            // Regular resources (non-deposit resources)
            table.appendChild(row);
          }
        }
  
        // Append the table to the container
        container.appendChild(table);
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
            resourceElement.textContent = Math.floor(resourceObj.value);
          }
  
          const capElement = document.getElementById(`${resourceName}-cap-resources-container`);
          if (capElement) {
            capElement.textContent = `/ ${Math.floor(resourceObj.cap)}`;
          }
        } else if (category === 'underground') {
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
            resourceElement.textContent = Math.round(resourceObj.value);
          }
  
          const capElement = document.getElementById(`${resourceName}-cap-resources-container`);
          if (capElement) {
            capElement.textContent = `/ ${Math.floor(resourceObj.cap)}`;
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

