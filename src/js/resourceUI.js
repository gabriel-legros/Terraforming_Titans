function createResourceContainers(resourcesData) {
  const resourcesContainer = document.getElementById('resources-container');
  resourcesContainer.innerHTML = ''; // Clear the main container first

  for (const category in resourcesData) {
    // Create a new container for each category
    const categoryContainer = document.createElement('div');
    categoryContainer.classList.add('resource-display');
    categoryContainer.style.display = 'none'; // Initially hidden

    // Create and append the header for the category
    const header = document.createElement('h3');
    header.textContent = `${capitalizeFirstLetter(category)} Resources`;
    header.id = `${category}-resources-header`;
    header.style.display = 'none'; // Initially hidden
    categoryContainer.appendChild(header);

    // Create and append the resource list container
    const resourceList = document.createElement('div');
    resourceList.id = `${category}-resources-resources-container`;
    categoryContainer.appendChild(resourceList);

    // Append the complete category container to the main container
    resourcesContainer.appendChild(categoryContainer);
  }
}

function createResourceElement(category, resourceObj, resourceName) {
  const resourceElement = document.createElement('div');
  resourceElement.classList.add('resource-item');
  resourceElement.id = `${resourceName}-container`;
  resourceElement.style.display = 'none'; // Initially hidden

  if (resourceName === 'colonists') {
    // Special display for population (colonists) as an integer
    resourceElement.innerHTML = `
      <div class="resource-row ${!resourceObj.hasCap ? 'no-cap' : ''}">
        <div class="resource-name"><strong id="${resourceName}-name">${resourceObj.displayName}</strong></div>
        <div class="resource-value" id="${resourceName}-resources-container">${Math.floor(resourceObj.value)}</div>
        ${resourceObj.hasCap ? `
          <div class="resource-slash">/</div>
          <div class="resource-cap"><span id="${resourceName}-cap-resources-container">${Math.floor(resourceObj.cap)}</span></div>
        ` : ''}
        <div class="resource-pps" id="${resourceName}-pps-resources-container">+0/s</div>
      </div>
      <div class="resource-tooltip" id="${resourceName}-tooltip">Test Tooltip</div>
    `;
  } else if (category === 'underground' || resourceObj.name === 'land') {
    // Display for deposits
    resourceElement.innerHTML = `
      <div class="resource-row ${!resourceObj.hasCap ? 'no-cap' : ''}">
        <div class="resource-name"><strong id="${resourceName}-name">${resourceObj.displayName}</strong></div>
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
        <div class="resource-name"><strong id="${resourceName}-name">${resourceObj.displayName}</strong></div>
        <div class="resource-value" id="${resourceName}-resources-container">${resourceObj.value.toFixed(2)}</div>
        ${resourceObj.hasCap ? `
          <div class="resource-slash">/</div>
          <div class="resource-cap"><span id="${resourceName}-cap-resources-container">${resourceObj.cap.toFixed(2)}</span></div>
        ` : ''}
        <div class="resource-pps" id="${resourceName}-pps-resources-container">+0/s</div>
      </div>
      <div class="resource-tooltip" id="${resourceName}-tooltip">Test Tooltip</div>
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
        if (!document.getElementById(`${resourceName}-container`)) {
          const resourceElement = createResourceElement(category, resourceObj, resourceName);
          container.appendChild(resourceElement);
        }
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

function updateResourceDisplay(resources) {
  for (const category in resources) {
    const containerId = `${category}-resources-resources-container`;
    const container = document.getElementById(containerId);
    const header = document.getElementById(`${category}-resources-header`);

    let hasUnlockedResources = false;

    for (const resourceName in resources[category]) {
      const resourceObj = resources[category][resourceName];
      const resourceElement = document.getElementById(`${resourceName}-container`);
      const resourceNameElement = document.getElementById(`${resourceName}-name`);

      const showResource = resourceObj.unlocked && (!resourceObj.hideWhenSmall || resourceObj.value >= 1e-4);

      if (showResource) {
        hasUnlockedResources = true;
        if (resourceElement) resourceElement.style.display = 'block';
      } else {
        if (resourceElement) resourceElement.style.display = 'none';
      }

      if (resourceObj.isBooleanFlagSet('festival') && resourceNameElement) {
        resourceNameElement.classList.add('resource-festival');
      } else if (resourceNameElement) {
        resourceNameElement.classList.remove('resource-festival');
      }
    
      // Check if the resource has the "golden" flag set
      if (resourceObj.isBooleanFlagSet('golden') && resourceNameElement) {
        resourceNameElement.classList.add('sparkling-gold');
      } else if (resourceNameElement) {
        resourceNameElement.classList.remove('sparkling-gold');
      }

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
      } else if (category === 'underground' || resourceObj.name === 'land') {
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

    // Reveal the category header if any resources in the category are unlocked
    if (hasUnlockedResources) {
      container.parentElement.style.display = 'block'; // Show category container
      if (header) header.style.display = 'block'; // Show header
    } else {
      container.parentElement.style.display = 'none'; // Hide category container
      if (header) header.style.display = 'none'; // Hide header
    }
  }
}

function updateResourceRateDisplay(resource){
  const ppsElement = document.getElementById(`${resource.name}-pps-resources-container`);
  if (ppsElement) {
    const netRate = resource.productionRate - resource.consumptionRate;
    const formattedNumber = formatNumber(netRate);
    // Removed the specific check for surface category to allow displaying rates < 1
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

  // Update the tooltip with production and consumption rates
  const tooltipElement = document.getElementById(`${resource.name}-tooltip`);
  if (tooltipElement) {
    let tooltipContent = '';
    tooltipContent += `<div>Value ${formatNumber(resource.value, false, 3)}${resource.unit ? ' ' + resource.unit : ''}</div>`;

    // Add zonal breakdown for surface resources if available
    if (typeof terraforming !== 'undefined') {
      const zoneValues = {};
      ['tropical', 'temperate', 'polar'].forEach(zone => {
        let val;
        switch (resource.name) {
          case 'liquidWater':
            val = terraforming.zonalWater?.[zone]?.liquid;
            break;
          case 'ice':
            const iceObj = terraforming.zonalWater?.[zone];
            if (iceObj) val = (iceObj.ice || 0) + (iceObj.buriedIce || 0);
            break;
          case 'dryIce':
            val = terraforming.zonalSurface?.[zone]?.dryIce;
            break;
          case 'biomass':
            val = terraforming.zonalSurface?.[zone]?.biomass;
            break;
          case 'liquidMethane':
            val = terraforming.zonalHydrocarbons?.[zone]?.liquid;
            break;
          case 'hydrocarbonIce':
            val = terraforming.zonalHydrocarbons?.[zone]?.ice;
            break;
          default:
            val = undefined;
        }
        if (typeof val === 'number') {
          zoneValues[zone] = val;
        }
      });
      if (Object.keys(zoneValues).length > 0) {
        tooltipContent += '<br><strong>Zonal Amounts:</strong><br>';
        ['tropical', 'temperate', 'polar'].forEach(zone => {
          if (zoneValues[zone] !== undefined) {
            tooltipContent += `${capitalizeFirstLetter(zone)}: ${formatNumber(zoneValues[zone], false, 3)}${resource.unit ? ' ' + resource.unit : ''}<br>`;
          }
        });
      }
    }

    // Generate the production content
    const productionEntries = Object.entries(resource.productionRateBySource).filter(([source, rate]) => rate !== 0);
    if (productionEntries.length > 0) {
      tooltipContent += '<strong>Production:</strong><br><div style="display: table; width: 100%;">';
      productionEntries.sort((a, b) => b[1] - a[1]); // Sort production entries in descending order
      productionEntries.forEach(([source, rate]) => {
        tooltipContent += `
          <div style="display: table-row;">
            <div style="display: table-cell; text-align: left; padding-right: 10px;">${source}</div>
            <div style="display: table-cell; text-align: right;">${formatNumber(rate, false, 2)}${resource.unit ? ' ' + resource.unit : ''}/s</div>
          </div>`;
      });
      tooltipContent += '</div>';
    }

    // Generate the consumption content
    const consumptionEntries = Object.entries(resource.consumptionRateBySource).filter(([source, rate]) => rate !== 0);
    if (consumptionEntries.length > 0) {
      tooltipContent += '<br><strong>Consumption and Maintenance:</strong><br><div style="display: table; width: 100%;">';
      consumptionEntries.sort((a, b) => b[1] - a[1]); // Sort consumption entries in descending order
      consumptionEntries.forEach(([source, rate]) => {
        tooltipContent += `
          <div style="display: table-row;">
            <div style="display: table-cell; text-align: left; padding-right: 10px;">${source}</div>
            <div style="display: table-cell; text-align: right;">${formatNumber(rate, false, 2)}${resource.unit ? ' ' + resource.unit : ''}/s</div>
          </div>`;
      });
      tooltipContent += '</div>';
    }

    tooltipElement.innerHTML = tooltipContent;
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