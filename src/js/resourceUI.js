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
    header.id = `${category}-resources-header`;
    header.style.display = 'none'; // Initially hidden
    header.style.cursor = 'pointer';

    const arrow = document.createElement('span');
    arrow.classList.add('collapse-arrow');
    arrow.innerHTML = '&#9660;';
    header.appendChild(arrow);

    const label = document.createElement('span');
    label.textContent = `${capitalizeFirstLetter(category)} Resources`;
    header.appendChild(label);
    categoryContainer.appendChild(header);

    // Create and append the resource list container
    const resourceList = document.createElement('div');
    resourceList.id = `${category}-resources-resources-container`;
    categoryContainer.appendChild(resourceList);

    header.addEventListener('click', () => {
      const hidden = resourceList.style.display === 'none';
      resourceList.style.display = hidden ? '' : 'none';
      arrow.innerHTML = hidden ? '&#9660;' : '&#9654;';
    });

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

  if (resourceName === 'land') {
    const noteDiv = document.createElement('div');
    noteDiv.id = `${resourceName}-tooltip-note`;
    noteDiv.textContent = 'Land can be recovered by turning off the corresponding building';
    tooltip.appendChild(noteDiv);
  }

  const assignmentsDiv = document.createElement('div');
  assignmentsDiv.id = `${resourceName}-tooltip-assignments`;
  tooltip.appendChild(assignmentsDiv);

  const zonesDiv = document.createElement('div');
  zonesDiv.id = `${resourceName}-tooltip-zones`;
  zonesDiv.style.display = 'none';
  zonesDiv.appendChild(document.createElement('br'));
  const zonesHeader = document.createElement('strong');
  zonesHeader.textContent = 'Zonal Amounts:';
  zonesDiv.appendChild(zonesHeader);
  zonesDiv.appendChild(document.createElement('br'));
  zonesDiv._info = { lines: new Map() };
  ['tropical', 'temperate', 'polar'].forEach(zone => {
    const line = document.createElement('div');
    zonesDiv.appendChild(line);
    zonesDiv._info.lines.set(zone, line);
  });
  tooltip.appendChild(zonesDiv);

  const productionDiv = document.createElement('div');
  productionDiv.id = `${resourceName}-tooltip-production`;
  productionDiv.style.display = 'none';
  const prodHeader = document.createElement('strong');
  prodHeader.textContent = 'Production:';
  productionDiv.appendChild(prodHeader);
  productionDiv.appendChild(document.createElement('br'));
  const prodTable = document.createElement('div');
  prodTable.style.display = 'table';
  prodTable.style.width = '100%';
  productionDiv.appendChild(prodTable);
  productionDiv._info = { table: prodTable, rows: new Map() };
  tooltip.appendChild(productionDiv);

  const consumptionDiv = document.createElement('div');
  consumptionDiv.id = `${resourceName}-tooltip-consumption`;
  consumptionDiv.style.display = 'none';
  consumptionDiv.appendChild(document.createElement('br'));
  const consHeader = document.createElement('strong');
  consHeader.textContent = 'Consumption and Maintenance:';
  consumptionDiv.appendChild(consHeader);
  consumptionDiv.appendChild(document.createElement('br'));
  const consTable = document.createElement('div');
  consTable.style.display = 'table';
  consTable.style.width = '100%';
  consumptionDiv.appendChild(consTable);
  consumptionDiv._info = { table: consTable, rows: new Map() };
  tooltip.appendChild(consumptionDiv);

  const autobuildDiv = document.createElement('div');
  autobuildDiv.id = `${resourceName}-tooltip-autobuild`;
  autobuildDiv.style.display = 'none';
  const autoHeader = document.createElement('strong');
  autoHeader.textContent = 'Autobuild Cost (avg 10s):';
  autobuildDiv.appendChild(autoHeader);
  autobuildDiv.appendChild(document.createTextNode(' '));
  const autoValue = document.createElement('span');
  autobuildDiv.appendChild(autoValue);
  const autoTable = document.createElement('div');
  autoTable.style.display = 'table';
  autoTable.style.width = '100%';
  autobuildDiv.appendChild(autoTable);
  autobuildDiv._info = { value: autoValue, table: autoTable, rows: new Map() };
  tooltip.appendChild(autobuildDiv);

  return tooltip;
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function updateRateTable(container, entries, formatter) {
  if (!container) return;
  const info = container._info;
  const used = new Set();
  entries.sort((a, b) => b[1] - a[1]).forEach(([name, val]) => {
    let rowInfo = info.rows.get(name);
    if (!rowInfo) {
      const row = document.createElement('div');
      row.style.display = 'table-row';
      const left = document.createElement('div');
      left.style.display = 'table-cell';
      left.style.textAlign = 'left';
      left.style.paddingRight = '10px';
      const right = document.createElement('div');
      right.style.display = 'table-cell';
      right.style.textAlign = 'right';
      row.appendChild(left);
      row.appendChild(right);
      info.table.appendChild(row);
      rowInfo = { row, left, right };
      info.rows.set(name, rowInfo);
    }
    rowInfo.left.textContent = name;
    rowInfo.right.textContent = formatter(val);
    rowInfo.row.style.display = 'table-row';
    info.table.appendChild(rowInfo.row);
    used.add(name);
  });
  info.rows.forEach((rowInfo, name) => {
    if (!used.has(name)) {
      rowInfo.row.style.display = 'none';
    }
  });
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
    const stored = resources.colony?.androids?.value || 0;
    const cap = resources.colony?.androids?.cap;
    const effective = cap !== undefined ? Math.min(stored, cap) : stored;
    let assigned = 0;
    if (typeof projectManager !== 'undefined' && typeof projectManager.getAndroidAssignments === 'function') {
      const androidAssignments = projectManager.getAndroidAssignments();
      assigned = androidAssignments.reduce((sum, [, count]) => sum + count, 0);
    }
    const workers = Math.max(effective - assigned, 0);
    const androidText = `${formatNumber(workers, true)} from androids`;
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

function updateAndroidAssignments(assignmentsDiv) {
  if (!assignmentsDiv || typeof resources === 'undefined') return;
  const stored = resources.colony?.androids?.value || 0;
  const cap = resources.colony?.androids?.cap;
  const effective = cap !== undefined ? Math.min(stored, cap) : stored;
  const androidAssignments = (typeof projectManager !== 'undefined' && typeof projectManager.getAndroidAssignments === 'function') ? projectManager.getAndroidAssignments() : [];
  const assigned = androidAssignments.reduce((sum, [, count]) => sum + count, 0);
  const workers = Math.max(effective - assigned, 0);
  const entries = [];
  if (workers > 0) entries.push(['Workers', workers]);
  androidAssignments.forEach(([name, count]) => entries.push([name, count]));
  let tableContainer = assignmentsDiv._tableContainer;
  if (!tableContainer) {
    tableContainer = document.createElement('div');
    assignmentsDiv.appendChild(tableContainer);
    assignmentsDiv._tableContainer = tableContainer;
  }
  updateAssignmentTable(tableContainer, entries);
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
        ${resourceObj.hideRate ? '' : `<div class="resource-pps" id="${resourceName}-pps-resources-container">+0/s</div>`}
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
        ${resourceObj.hideRate ? '' : '<div class="resource-pps"></div>'}
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
        ${resourceObj.hideRate ? '' : `<div class="resource-pps" id="${resourceName}-pps-resources-container">+0/s</div>`}
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
    if (Math.abs(netRate) < 1e-3) {
      ppsElement.textContent = `0/s`;
    } else {
      ppsElement.textContent = `${netRate >= 0 ? '+' : ''}${formatNumber(netRate, false, 2)}/s`;
    }
    if (netRate < 0 && Math.abs(netRate) > resource.value) {
      ppsElement.style.color = 'red';
    } else if (netRate < 0 && Math.abs(netRate) > resource.value / 120) {
      ppsElement.style.color = 'orange';
    } else {
      ppsElement.style.color = '';
    }
  }

  const tooltipElement = document.getElementById(`${resource.name}-tooltip`);
  if (!tooltipElement) return;

  const valueDiv = document.getElementById(`${resource.name}-tooltip-value`);
  const timeDiv = document.getElementById(`${resource.name}-tooltip-time`);
  const assignmentsDiv = document.getElementById(`${resource.name}-tooltip-assignments`);
  const zonesDiv = document.getElementById(`${resource.name}-tooltip-zones`);
  const productionDiv = document.getElementById(`${resource.name}-tooltip-production`);
  const consumptionDiv = document.getElementById(`${resource.name}-tooltip-consumption`);
  const autobuildDiv = document.getElementById(`${resource.name}-tooltip-autobuild`);

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

  if (timeDiv) {
    if (resource.name !== 'land') {
      if (netRate > 0 && resource.hasCap) {
        const time = (resource.cap - resource.value) / netRate;
        timeDiv.textContent = `Time to full: ${formatDuration(Math.max(time, 0))}`;
      } else if (netRate < 0) {
        const time = resource.value / Math.abs(netRate);
        timeDiv.textContent = `Time to empty: ${formatDuration(Math.max(time, 0))}`;
      } else {
        timeDiv.innerHTML = '&nbsp;';
      }
    } else {
      timeDiv.innerHTML = '&nbsp;';
    }
  }

  if (assignmentsDiv) {
    if (resource.name === 'workers') {
      updateWorkerAssignments(assignmentsDiv);
    } else if (resource.name === 'land') {
      updateLandAssignments(assignmentsDiv);
    } else if (resource.name === 'androids') {
      updateAndroidAssignments(assignmentsDiv);
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
    const hasZones = Object.keys(zoneValues).length > 0;
    zonesDiv.style.display = hasZones ? 'block' : 'none';
    if (hasZones) {
      const info = zonesDiv._info;
      ['tropical', 'temperate', 'polar'].forEach(zone => {
        const line = info.lines.get(zone);
        if (zoneValues[zone] !== undefined) {
          let text = `${capitalizeFirstLetter(zone)}: ${formatNumber(zoneValues[zone], false, 3)}`;
          if (resource.name === 'ice' || resource.name === 'hydrocarbonIce') {
            const buried = zoneBuried[zone] || 0;
            text += ` / ${formatNumber(buried, false, 3)} (surface/buried)`;
          }
          line.style.display = 'block';
          if (line.textContent !== text) line.textContent = text;
        } else {
          line.style.display = 'none';
        }
      });
    }
  } else if (zonesDiv) {
    zonesDiv.style.display = 'none';
  }

  if (productionDiv) {
    const productionEntries = Object.entries(resource.productionRateBySource).filter(([source, rate]) => rate !== 0);
    updateRateTable(productionDiv, productionEntries, r => `${formatNumber(r, false, 2)}/s`);
    productionDiv.style.display = productionEntries.length > 0 ? 'block' : 'none';
  }

  if (consumptionDiv) {
    const consumptionEntries = Object.entries(resource.consumptionRateBySource).filter(([source, rate]) => rate !== 0);
    updateRateTable(consumptionDiv, consumptionEntries, r => `${formatNumber(r, false, 2)}/s`);
    consumptionDiv.style.display = consumptionEntries.length > 0 ? 'block' : 'none';
  }

  if (autobuildDiv) {
    if (typeof autobuildCostTracker !== 'undefined') {
      const avgCost = autobuildCostTracker.getAverageCost(resource.category, resource.name);
      if (avgCost > 0) {
        autobuildDiv.style.display = 'block';
        autobuildDiv._info.value.textContent = `${formatNumber(avgCost, false, 2)}${resource.unit ? ' ' + resource.unit : ''}/s`;
        const breakdown = autobuildCostTracker.getAverageCostBreakdown(resource.category, resource.name);
        updateRateTable(autobuildDiv, breakdown, cost => `${formatNumber(cost, false, 2)}/s`);
      } else {
        autobuildDiv.style.display = 'none';
      }
    } else {
      autobuildDiv.style.display = 'none';
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