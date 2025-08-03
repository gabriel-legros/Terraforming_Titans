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

function createTooltipElement(resourceName) {
  const tooltip = document.createElement('div');
  tooltip.classList.add('resource-tooltip');
  tooltip.id = `${resourceName}-tooltip`;

  const valueDiv = document.createElement('div');
  valueDiv.id = `${resourceName}-tooltip-value`;
  tooltip.appendChild(valueDiv);

  const timeDiv = document.createElement('div');
  timeDiv.id = `${resourceName}-tooltip-time`;
  tooltip.appendChild(timeDiv);

  const assignmentsDiv = document.createElement('div');
  assignmentsDiv.id = `${resourceName}-tooltip-assignments`;
  tooltip.appendChild(assignmentsDiv);

  const zonesDiv = document.createElement('div');
  zonesDiv.id = `${resourceName}-tooltip-zones`;
  tooltip.appendChild(zonesDiv);

  const productionDiv = document.createElement('div');
  productionDiv.id = `${resourceName}-tooltip-production`;
  tooltip.appendChild(productionDiv);

  const consumptionDiv = document.createElement('div');
  consumptionDiv.id = `${resourceName}-tooltip-consumption`;
  tooltip.appendChild(consumptionDiv);

  const overflowDiv = document.createElement('div');
  overflowDiv.id = `${resourceName}-tooltip-overflow`;
  tooltip.appendChild(overflowDiv);

  const autobuildDiv = document.createElement('div');
  autobuildDiv.id = `${resourceName}-tooltip-autobuild`;
  tooltip.appendChild(autobuildDiv);

  return tooltip;
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function updateAssignmentTable(container, assignments) {
  if (!container) return;
  const keyString = assignments.map(a => a[0]).join('|');
  let info = container._info;

  if (container.dataset.keys !== keyString) {
    container.textContent = '';
    if (assignments.length === 0) {
      container.dataset.keys = '';
      container._info = { spans: new Map() };
      return;
    }
    const header = document.createElement('div');
    header.innerHTML = '<strong>Assignments:</strong>';
    container.appendChild(header);
    const table = document.createElement('div');
    table.style.display = 'table';
    table.style.width = '100%';
    container.appendChild(table);
    info = { table, spans: new Map() };
    assignments.forEach(([n, count]) => {
      const row = document.createElement('div');
      row.style.display = 'table-row';
      const left = document.createElement('div');
      left.style.display = 'table-cell';
      left.style.textAlign = 'left';
      left.style.paddingRight = '10px';
      left.textContent = n;
      const right = document.createElement('div');
      right.style.display = 'table-cell';
      right.style.textAlign = 'right';
      table.appendChild(row);
      row.appendChild(left);
      row.appendChild(right);
      info.spans.set(n, right);
    });
    container._info = info;
    container.dataset.keys = keyString;
  }

  info = container._info;
  assignments.forEach(([n, count]) => {
    const span = info.spans.get(n);
    if (!span) return;
    const text = formatNumber(count, true);
    if (span.textContent !== text) span.textContent = text;
  });
}

function updateWorkerAssignments(assignmentsDiv) {
  if (!assignmentsDiv || typeof populationModule === 'undefined') return;

  let ratioDiv = assignmentsDiv._ratioDiv;
  if (!ratioDiv) {
    ratioDiv = document.createElement('div');
    assignmentsDiv.appendChild(ratioDiv);
    assignmentsDiv._ratioDiv = ratioDiv;
  }
  const ratioPercent = (populationModule.getEffectiveWorkerRatio() * 100).toFixed(0);
  const ratioText = `${ratioPercent}% of colonists provide workers`;
  if (ratioDiv.textContent !== ratioText) ratioDiv.textContent = ratioText;

  if (typeof resources !== 'undefined') {
    let androidDiv = assignmentsDiv._androidDiv;
    if (!androidDiv) {
      androidDiv = document.createElement('div');
      assignmentsDiv.appendChild(androidDiv);
      assignmentsDiv._androidDiv = androidDiv;
    }
    const androids = resources.colony?.androids?.value || 0;
    const androidText = `${formatNumber(androids, true)} from androids`;
    if (androidDiv.textContent !== androidText) androidDiv.textContent = androidText;
  }

  const assignments = [];
  if (typeof buildings !== 'undefined') {
    for (const name in buildings) {
      const b = buildings[name];
      if (b.active > 0 && b.getTotalWorkerNeed && b.getTotalWorkerNeed() > 0) {
        const assigned = b.active * b.getTotalWorkerNeed() * (b.getEffectiveWorkerMultiplier ? b.getEffectiveWorkerMultiplier() : 1);
        if (assigned > 0) {
          assignments.push([b.displayName || name, assigned]);
        }
      }
    }
  }
  assignments.sort((a, b) => b[1] - a[1]);

  let tableContainer = assignmentsDiv._tableContainer;
  if (!tableContainer) {
    tableContainer = document.createElement('div');
    assignmentsDiv.appendChild(tableContainer);
    assignmentsDiv._tableContainer = tableContainer;
  }
  updateAssignmentTable(tableContainer, assignments);
}

function updateLandAssignments(assignmentsDiv) {
  if (!assignmentsDiv) return;
  const assignments = [];
  if (typeof buildings !== 'undefined') {
    for (const name in buildings) {
      const b = buildings[name];
      if (b.active > 0 && b.requiresLand) {
        const used = b.active * b.requiresLand;
        if (used > 0) assignments.push([b.displayName || name, used]);
      }
    }
  }
  if (typeof colonies !== 'undefined') {
    for (const name in colonies) {
      const c = colonies[name];
      if (c.active > 0 && c.requiresLand) {
        const used = c.active * c.requiresLand;
        if (used > 0) assignments.push([c.displayName || name, used]);
      }
    }
  }
  assignments.sort((a, b) => b[1] - a[1]);

  let tableContainer = assignmentsDiv._tableContainer;
  if (!tableContainer) {
    tableContainer = document.createElement('div');
    assignmentsDiv.appendChild(tableContainer);
    assignmentsDiv._tableContainer = tableContainer;
  }
  updateAssignmentTable(tableContainer, assignments);
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
    `;
    resourceElement.appendChild(createTooltipElement(resourceName));
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
    if (resourceObj.name === 'land') {
      resourceElement.appendChild(createTooltipElement(resourceName));
    }

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
    `;
    resourceElement.appendChild(createTooltipElement(resourceName));
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

        // Update scanning progress if there is scanning strength using ScannerProject instance
        let scanData;
        if (typeof projectManager !== 'undefined') {
          const projName = resourceName === 'geothermal' ? 'geo_satellite' : 'satellite';
          const scanner = projectManager.projects?.[projName];
          if (scanner && scanner.scanData) {
            scanData = scanner.scanData[resourceName];
          }
        } else if (typeof oreScanner !== 'undefined') {
          // Fallback for older saves
          scanData = oreScanner.scanData[resourceName];
        }

        if (
          scanData &&
          scanData.currentScanningStrength > 0 &&
          scanData.D_current < scanData.D_max &&
          scanningProgressElement
        ) {
          scanningProgressElement.style.display = 'block';
          scanningProgressElement.textContent = `Scanning Progress: ${(scanData.currentScanProgress * 100).toFixed(2)}%`;
        } else if (scanningProgressElement) {
          scanningProgressElement.style.display = 'none'; // Hide progress element if scanning inactive
        }
        if (resourceObj.name === 'land') {
          updateResourceRateDisplay(resourceObj);
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
    const valueDiv = document.getElementById(`${resource.name}-tooltip-value`);
    const timeDiv = document.getElementById(`${resource.name}-tooltip-time`);
    const assignmentsDiv = document.getElementById(`${resource.name}-tooltip-assignments`);
    const zonesDiv = document.getElementById(`${resource.name}-tooltip-zones`);
    const productionDiv = document.getElementById(`${resource.name}-tooltip-production`);
    const consumptionDiv = document.getElementById(`${resource.name}-tooltip-consumption`);
    const overflowDiv = document.getElementById(`${resource.name}-tooltip-overflow`);
    const autobuildDiv = document.getElementById(`${resource.name}-tooltip-autobuild`);

    // Only clear containers that rebuild their contents every tick.
    if (timeDiv) clearElement(timeDiv);
    if (zonesDiv) clearElement(zonesDiv);
    if (productionDiv) clearElement(productionDiv);
    if (consumptionDiv) clearElement(consumptionDiv);
    if (overflowDiv) clearElement(overflowDiv);
    if (autobuildDiv) clearElement(autobuildDiv);

    const netRate = resource.productionRate - resource.consumptionRate;

    if (valueDiv) {
      if (resource.name === 'land') {
        let avail = valueDiv._avail;
        let used = valueDiv._used;
        if (!avail || !used) {
          clearElement(valueDiv);
          avail = document.createElement('div');
          valueDiv.appendChild(avail);
          used = document.createElement('div');
          valueDiv.appendChild(used);
          valueDiv._avail = avail;
          valueDiv._used = used;
        }
        const availText = `Available ${formatNumber(resource.value - resource.reserved, false, 3)}`;
        const usedText = `Used ${formatNumber(resource.reserved, false, 3)}`;
        if (avail.textContent !== availText) avail.textContent = availText;
        if (used.textContent !== usedText) used.textContent = usedText;
      } else {
        const text = `Value ${formatNumber(resource.value, false, 3)}${resource.unit ? ' ' + resource.unit : ''}`;
        if (valueDiv.textContent !== text) valueDiv.textContent = text;
      }
    }

    if (timeDiv && resource.name !== 'land') {
      if (netRate > 0 && resource.hasCap) {
        const time = (resource.cap - resource.value) / netRate;
        timeDiv.textContent = `Time to cap: ${formatDuration(Math.max(time, 0))}`;
      } else if (netRate < 0) {
        const time = resource.value / Math.abs(netRate);
        timeDiv.textContent = `Time to empty: ${formatDuration(Math.max(time, 0))}`;
      }
    }

    if (assignmentsDiv) {
      if (resource.name === 'workers') {
        updateWorkerAssignments(assignmentsDiv);
      } else if (resource.name === 'land') {
        updateLandAssignments(assignmentsDiv);
      } else {
        clearElement(assignmentsDiv);
      }
    }

    if (zonesDiv && typeof terraforming !== 'undefined') {
      const zoneValues = {};
      const zoneBuried = {};
      ['tropical', 'temperate', 'polar'].forEach(zone => {
        let val;
        switch (resource.name) {
          case 'liquidWater':
            val = terraforming.zonalWater?.[zone]?.liquid;
            break;
          case 'ice': {
            const iceObj = terraforming.zonalWater?.[zone];
            if (iceObj) {
              val = (iceObj.ice || 0);
              zoneBuried[zone] = iceObj.buriedIce || 0;
            }
            break;
          }
          case 'dryIce':
            val = terraforming.zonalSurface?.[zone]?.dryIce;
            break;
          case 'biomass':
            val = terraforming.zonalSurface?.[zone]?.biomass;
            break;
          case 'liquidMethane':
            val = terraforming.zonalHydrocarbons?.[zone]?.liquid;
            break;
          case 'hydrocarbonIce': {
            const obj = terraforming.zonalHydrocarbons?.[zone];
            if (obj) {
              val = (obj.ice || 0);
              zoneBuried[zone] = obj.buriedIce || 0;
            }
            break;
          }
          default:
            val = undefined;
        }
        if (typeof val === 'number') {
          zoneValues[zone] = val;
        }
      });
      if (Object.keys(zoneValues).length > 0) {
        zonesDiv.appendChild(document.createElement('br'));
        const header = document.createElement('strong');
        header.textContent = 'Zonal Amounts:';
        zonesDiv.appendChild(header);
        zonesDiv.appendChild(document.createElement('br'));
        ['tropical', 'temperate', 'polar'].forEach(zone => {
          if (zoneValues[zone] !== undefined) {
            let entry = `${capitalizeFirstLetter(zone)}: ${formatNumber(zoneValues[zone], false, 3)}`;
            if (resource.name === 'ice' || resource.name === 'hydrocarbonIce') {
              const buried = zoneBuried[zone] || 0;
              entry += ` / ${formatNumber(buried, false, 3)} (buried)`;
            }
            const line = document.createElement('div');
            line.textContent = entry;
            zonesDiv.appendChild(line);
          }
        });
      }
    }

    if (productionDiv) {
      const productionEntries = Object.entries(resource.productionRateBySource).filter(([source, rate]) => rate !== 0);
      if (productionEntries.length > 0) {
        const header = document.createElement('strong');
        header.textContent = 'Production:';
        productionDiv.appendChild(header);
        productionDiv.appendChild(document.createElement('br'));
        const table = document.createElement('div');
        table.style.display = 'table';
        table.style.width = '100%';
        productionEntries.sort((a, b) => b[1] - a[1]);
        productionEntries.forEach(([source, rate]) => {
          const row = document.createElement('div');
          row.style.display = 'table-row';
          const left = document.createElement('div');
          left.style.display = 'table-cell';
          left.style.textAlign = 'left';
          left.style.paddingRight = '10px';
          left.textContent = source;
          const right = document.createElement('div');
          right.style.display = 'table-cell';
          right.style.textAlign = 'right';
          right.textContent = `${formatNumber(rate, false, 2)}/s`;
          row.appendChild(left);
          row.appendChild(right);
          table.appendChild(row);
        });
        productionDiv.appendChild(table);
      }
    }

    if (consumptionDiv) {
      const consumptionEntries = Object.entries(resource.consumptionRateBySource).filter(([source, rate]) => rate !== 0);
      if (consumptionEntries.length > 0) {
        consumptionDiv.appendChild(document.createElement('br'));
        const header = document.createElement('strong');
        header.textContent = 'Consumption and Maintenance:';
        consumptionDiv.appendChild(header);
        consumptionDiv.appendChild(document.createElement('br'));
        const table = document.createElement('div');
        table.style.display = 'table';
        table.style.width = '100%';
        consumptionEntries.sort((a, b) => b[1] - a[1]);
        consumptionEntries.forEach(([source, rate]) => {
          const row = document.createElement('div');
          row.style.display = 'table-row';
          const left = document.createElement('div');
          left.style.display = 'table-cell';
          left.style.textAlign = 'left';
          left.style.paddingRight = '10px';
          left.textContent = source;
          const right = document.createElement('div');
          right.style.display = 'table-cell';
          right.style.textAlign = 'right';
          right.textContent = `${formatNumber(rate, false, 2)}/s`;
          row.appendChild(left);
          row.appendChild(right);
          table.appendChild(row);
        });
        consumptionDiv.appendChild(table);
      }
    }

    if (overflowDiv && resource.overflowRate && Math.abs(resource.overflowRate) > 0) {
      overflowDiv.appendChild(document.createElement('br'));
      const header = document.createElement('strong');
      header.textContent = 'Overflow:';
      overflowDiv.appendChild(header);
      overflowDiv.append(` ${resource.overflowRate >= 0 ? '+' : ''}${formatNumber(resource.overflowRate, false, 2)}${resource.unit ? ' ' + resource.unit : ''}/s`);
    }

    if (autobuildDiv && typeof autobuildCostTracker !== 'undefined') {
      const avgCost = autobuildCostTracker.getAverageCost(resource.category, resource.name);
      if (avgCost > 0) {
        autobuildDiv.appendChild(document.createElement('br'));
        const header = document.createElement('strong');
        header.textContent = 'Autobuild Cost (avg 10s):';
        autobuildDiv.appendChild(header);
        autobuildDiv.append(` ${formatNumber(avgCost, false, 2)}${resource.unit ? ' ' + resource.unit : ''}/s`);
        const breakdown = autobuildCostTracker.getAverageCostBreakdown(resource.category, resource.name);
        if (breakdown.length > 0) {
          const table = document.createElement('div');
          table.style.display = 'table';
          table.style.width = '100%';
          breakdown.forEach(([building, cost]) => {
            const row = document.createElement('div');
            row.style.display = 'table-row';
            const left = document.createElement('div');
            left.style.display = 'table-cell';
            left.style.textAlign = 'left';
            left.style.paddingRight = '10px';
            left.textContent = building;
            const right = document.createElement('div');
            right.style.display = 'table-cell';
            right.style.textAlign = 'right';
            right.textContent = `${formatNumber(cost, false, 2)}/s`;
            row.appendChild(left);
            row.appendChild(right);
            table.appendChild(row);
          });
          autobuildDiv.appendChild(table);
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