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

  const timeDiv = document.createElement('div');
  timeDiv.id = `${resourceName}-tooltip-time`;

  let noteDiv;
  if (resourceName === 'land') {
    noteDiv = document.createElement('div');
    noteDiv.id = `${resourceName}-tooltip-note`;
    noteDiv.textContent = 'Land can be recovered by turning off the corresponding building';
  }

  const assignmentsDiv = document.createElement('div');
  assignmentsDiv.id = `${resourceName}-tooltip-assignments`;

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

  const netDiv = document.createElement('div');
  netDiv.id = `${resourceName}-tooltip-net`;

  const headerDiv = document.createElement('div');
  headerDiv.appendChild(valueDiv);
  headerDiv.appendChild(timeDiv);
  if (noteDiv) headerDiv.appendChild(noteDiv);
  headerDiv.appendChild(assignmentsDiv);
  headerDiv.appendChild(zonesDiv);
  headerDiv.appendChild(netDiv);

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
  const prodTotalRow = document.createElement('div');
  prodTotalRow.style.display = 'table-row';
  const prodTotalLeft = document.createElement('div');
  prodTotalLeft.style.display = 'table-cell';
  prodTotalLeft.style.textAlign = 'left';
  prodTotalLeft.style.paddingRight = '10px';
  const prodTotalLeftStrong = document.createElement('strong');
  prodTotalLeftStrong.textContent = 'Total :';
  prodTotalLeft.appendChild(prodTotalLeftStrong);
  const prodTotalRight = document.createElement('div');
  prodTotalRight.style.display = 'table-cell';
  prodTotalRight.style.textAlign = 'right';
  prodTotalRight.style.minWidth = '90px';
  prodTotalRight.style.whiteSpace = 'nowrap';
  const prodTotalRightStrong = document.createElement('strong');
  prodTotalRight.appendChild(prodTotalRightStrong);
  prodTotalRow.appendChild(prodTotalLeft);
  prodTotalRow.appendChild(prodTotalRight);
  prodTable.appendChild(prodTotalRow);
  productionDiv._info = { table: prodTable, rows: new Map(), totalRow: prodTotalRow, totalRight: prodTotalRightStrong };

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
  const consTotalRow = document.createElement('div');
  consTotalRow.style.display = 'table-row';
  const consTotalLeft = document.createElement('div');
  consTotalLeft.style.display = 'table-cell';
  consTotalLeft.style.textAlign = 'left';
  consTotalLeft.style.paddingRight = '10px';
  const consTotalLeftStrong = document.createElement('strong');
  consTotalLeftStrong.textContent = 'Total :';
  consTotalLeft.appendChild(consTotalLeftStrong);
  const consTotalRight = document.createElement('div');
  consTotalRight.style.display = 'table-cell';
  consTotalRight.style.textAlign = 'right';
  consTotalRight.style.minWidth = '90px';
  consTotalRight.style.whiteSpace = 'nowrap';
  const consTotalRightStrong = document.createElement('strong');
  consTotalRight.appendChild(consTotalRightStrong);
  consTotalRow.appendChild(consTotalLeft);
  consTotalRow.appendChild(consTotalRight);
  consTable.appendChild(consTotalRow);
  consumptionDiv._info = { table: consTable, rows: new Map(), totalRow: consTotalRow, totalRight: consTotalRightStrong };

  const overflowDiv = document.createElement('div');
  overflowDiv.id = `${resourceName}-tooltip-overflow`;
  overflowDiv.style.display = 'none';
  overflowDiv.appendChild(document.createElement('br'));
  const overflowHeader = document.createElement('strong');
  overflowHeader.textContent = 'Overflow:';
  overflowDiv.appendChild(overflowHeader);
  overflowDiv.appendChild(document.createElement('br'));
  const overflowTable = document.createElement('div');
  overflowTable.style.display = 'table';
  overflowTable.style.width = '100%';
  overflowDiv.appendChild(overflowTable);
  const overflowTotalRow = document.createElement('div');
  overflowTotalRow.style.display = 'table-row';
  const overflowTotalLeft = document.createElement('div');
  overflowTotalLeft.style.display = 'table-cell';
  overflowTotalLeft.style.textAlign = 'left';
  overflowTotalLeft.style.paddingRight = '10px';
  const overflowTotalLeftStrong = document.createElement('strong');
  overflowTotalLeftStrong.textContent = 'Total :';
  overflowTotalLeft.appendChild(overflowTotalLeftStrong);
  const overflowTotalRight = document.createElement('div');
  overflowTotalRight.style.display = 'table-cell';
  overflowTotalRight.style.textAlign = 'right';
  overflowTotalRight.style.minWidth = '90px';
  overflowTotalRight.style.whiteSpace = 'nowrap';
  const overflowTotalRightStrong = document.createElement('strong');
  overflowTotalRight.appendChild(overflowTotalRightStrong);
  overflowTotalRow.appendChild(overflowTotalLeft);
  overflowTotalRow.appendChild(overflowTotalRight);
  overflowTable.appendChild(overflowTotalRow);
  overflowDiv._info = { table: overflowTable, rows: new Map(), totalRow: overflowTotalRow, totalRight: overflowTotalRightStrong };

  const autobuildDiv = document.createElement('div');
  autobuildDiv.id = `${resourceName}-tooltip-autobuild`;
  autobuildDiv.style.display = 'none';
  autobuildDiv.appendChild(document.createElement('br'));
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

  const col1 = document.createElement('div');
  col1.appendChild(headerDiv);
  col1.appendChild(productionDiv);
  col1.appendChild(consumptionDiv);
  col1.appendChild(overflowDiv);
  col1.appendChild(autobuildDiv);
  tooltip.appendChild(col1);

  const col2 = document.createElement('div');
  const col3 = document.createElement('div');
  // Store references needed for dynamic column reflow
  tooltip._columnsInfo = { headerDiv, productionDiv, consumptionDiv, overflowDiv, autobuildDiv, col1, col2, col3, timeDiv, netDiv };

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
  const validEntries = entries.filter(([, val]) => Math.abs(val) >= 1e-12);
  const total = validEntries.reduce((sum, [, val]) => sum + val, 0);
  if (info.totalRight) {
    if (Math.abs(total) >= 1e-12) {
      info.totalRight.textContent = formatter(total);
      info.totalRow.style.display = 'table-row';
    } else {
      info.totalRow.style.display = 'none';
    }
  }
  // Sort descending and then render rows in that order; always re-append
  // existing rows so DOM order matches sorted order.
  validEntries.sort((a, b) => b[1] - a[1]).forEach(([name, val]) => {
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
      right.style.minWidth = '90px';
      right.style.whiteSpace = 'nowrap';
      row.appendChild(left);
      row.appendChild(right);
      info.table.appendChild(row);
      rowInfo = { row, left, right };
      info.rows.set(name, rowInfo);
    }
    const text = formatter(val);
    if (rowInfo.left.textContent !== name) rowInfo.left.textContent = name;
    if (rowInfo.right.textContent !== text) rowInfo.right.textContent = text;
    rowInfo.row.style.display = 'table-row';
    // Always append to enforce the desired order
    info.table.appendChild(rowInfo.row);
    used.add(name);
  });
  info.rows.forEach((rowInfo, name) => {
    if (!used.has(name)) {
      if (rowInfo.row.parentNode) rowInfo.row.parentNode.removeChild(rowInfo.row);
      info.rows.delete(name);
    }
  });
}

function setResourceTooltipColumns(tooltip, cols) {
  if (!tooltip || !tooltip._columnsInfo) return;
  const { headerDiv, productionDiv, consumptionDiv, overflowDiv, autobuildDiv, col1, col2, col3, timeDiv, netDiv } = tooltip._columnsInfo;
  col1.innerHTML = '';
  if (cols === 3) {
    col2.innerHTML = '';
    col3.innerHTML = '';
    // Move time and net panels into their columns
    if (timeDiv.parentNode !== col2) {
      if (timeDiv.parentNode) timeDiv.parentNode.removeChild(timeDiv);
    }
    if (netDiv.parentNode !== col3) {
      if (netDiv.parentNode) netDiv.parentNode.removeChild(netDiv);
    }
    // Ensure header does not duplicate moved elements
    // (if they were inside headerDiv previously, they were removed above)

    col1.appendChild(headerDiv);
    col1.appendChild(productionDiv);
    // Time to full above consumption
    // Remove any leading <br> so the header aligns cleanly at the top of its column
    if (consumptionDiv.firstChild && consumptionDiv.firstChild.tagName === 'BR') {
      consumptionDiv.removeChild(consumptionDiv.firstChild);
    }
    col2.appendChild(timeDiv);
    col2.appendChild(consumptionDiv);
    col2.appendChild(overflowDiv);
    // Net rate above autobuild
    // Remove any leading <br> so the header aligns cleanly at the top of its column
    if (autobuildDiv.firstChild && autobuildDiv.firstChild.tagName === 'BR') {
      autobuildDiv.removeChild(autobuildDiv.firstChild);
    }
    col3.appendChild(netDiv);
    col3.appendChild(autobuildDiv);
    if (!col2.parentNode) tooltip.appendChild(col2);
    if (!col3.parentNode) tooltip.appendChild(col3);

    // Align headers (Production / Consumption / Autobuild) on the same baseline
    // by adding top margins so that each column's pre-header block height matches the max.
    const headerHeight = headerDiv.getBoundingClientRect().height || 0;
    const timeHeight = timeDiv ? (timeDiv.getBoundingClientRect().height || 0) : 0;
    const netHeight = netDiv ? (netDiv.getBoundingClientRect().height || 0) : 0;
    const maxPreHeader = Math.max(headerHeight, timeHeight, netHeight);
    const prodMargin = Math.max(maxPreHeader - headerHeight, 0);
    const consMargin = Math.max(maxPreHeader - timeHeight, 0);
    const autoMargin = Math.max(maxPreHeader - netHeight, 0);
    productionDiv.style.marginTop = prodMargin ? prodMargin + 'px' : '0px';
    consumptionDiv.style.marginTop = consMargin ? consMargin + 'px' : '0px';
    autobuildDiv.style.marginTop = autoMargin ? autoMargin + 'px' : '0px';
  } else {
    // Restore time and net into the header for single-column layout
    if (timeDiv.parentNode && timeDiv.parentNode !== headerDiv) timeDiv.parentNode.removeChild(timeDiv);
    if (netDiv.parentNode && netDiv.parentNode !== headerDiv) netDiv.parentNode.removeChild(netDiv);
    // Rebuild header content order: value, time, note/assignments/zones (already in header), net last
    // Ensure timeDiv appears right after the value line
    if (headerDiv.firstChild) {
      // Insert after first child (valueDiv)
      headerDiv.insertBefore(timeDiv, headerDiv.children[1] || null);
    } else {
      headerDiv.appendChild(timeDiv);
    }
    // Ensure netDiv is at the end
    headerDiv.appendChild(netDiv);

    col1.appendChild(headerDiv);
    col1.appendChild(productionDiv);
    // Ensure the original spacing <br> is restored when returning to one column
    if (!consumptionDiv.firstChild || consumptionDiv.firstChild.tagName !== 'BR') {
      consumptionDiv.insertBefore(document.createElement('br'), consumptionDiv.firstChild || null);
    }
    if (!autobuildDiv.firstChild || autobuildDiv.firstChild.tagName !== 'BR') {
      autobuildDiv.insertBefore(document.createElement('br'), autobuildDiv.firstChild || null);
    }
    // Reset margins that were applied for alignment in 3-column mode
    productionDiv.style.marginTop = '';
    consumptionDiv.style.marginTop = '';
    autobuildDiv.style.marginTop = '';

    col1.appendChild(consumptionDiv);
    col1.appendChild(overflowDiv);
    col1.appendChild(autobuildDiv);
    if (col2.parentNode) tooltip.removeChild(col2);
    if (col3.parentNode) tooltip.removeChild(col3);
  }
  if (!col1.parentNode) tooltip.appendChild(col1);
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
    let colonistDiv = assignmentsDiv._colonistDiv;
    if (!colonistDiv) {
      colonistDiv = document.createElement('div');
      const existingAndroidDiv = assignmentsDiv._androidDiv;
      if (existingAndroidDiv && existingAndroidDiv.parentNode === assignmentsDiv) {
        assignmentsDiv.insertBefore(colonistDiv, existingAndroidDiv);
      } else {
        assignmentsDiv.appendChild(colonistDiv);
      }
      assignmentsDiv._colonistDiv = colonistDiv;
    }
    const colonists = resources.colony?.colonists?.value || 0;
    const colonistWorkers = Math.floor(populationModule.getEffectiveWorkerRatio() * colonists);
    const colonistText = `${formatNumber(colonistWorkers, true)} from colonists`;
    if (colonistDiv.textContent !== colonistText) colonistDiv.textContent = colonistText;

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
    const tooltip = createTooltipElement(resourceName);
    resourceElement.appendChild(tooltip);
    if (typeof addTooltipHover === 'function') {
      addTooltipHover(resourceElement, tooltip);
    }
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
      const tooltip = createTooltipElement(resourceName);
      resourceElement.appendChild(tooltip);
      if (typeof addTooltipHover === 'function') {
        addTooltipHover(resourceElement, tooltip);
      }
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
    const tooltip = createTooltipElement(resourceName);
    resourceElement.appendChild(tooltip);
    if (typeof addTooltipHover === 'function') {
      addTooltipHover(resourceElement, tooltip);
    }
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

      // Update cache for this resource and its category
      resourceUICache.categories[resource.category] = resourceUICache.categories[resource.category] || { container: document.getElementById(containerId), header: document.getElementById(`${resource.category}-resources-header`) };
      cacheSingleResource(resource.category, resource.name);
    }
  }
}

function updateResourceDisplay(resources) {
  for (const category in resources) {
    const cat = resourceUICache.categories[category] || cacheResourceCategory(category);
    const container = cat ? cat.container : null;
    const header = cat ? cat.header : null;

    let hasUnlockedResources = false;

    for (const resourceName in resources[category]) {
      const resourceObj = resources[category][resourceName];
      const entry = resourceUICache.resources[resourceName] || cacheSingleResource(category, resourceName);
      const resourceElement = entry ? entry.container : null;
      const resourceNameElement = entry ? entry.nameEl : null;

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
        const valEl = entry ? entry.valueEl : null;
        if (valEl) {
          valEl.textContent = formatNumber(Math.floor(resourceObj.value), true);
        }

        const capElement = entry ? entry.capEl : null;
        if (capElement) {
          capElement.textContent = formatNumber(Math.floor(resourceObj.cap), true);
        }

        updateResourceRateDisplay(resourceObj);
      } else if (category === 'underground' || resourceObj.name === 'land') {
        // Update underground resources
        const availableElement = entry ? entry.availableEl : null;
        const totalElement = entry ? entry.totalEl : null;
        const scanningProgressElement = entry ? entry.scanEl : null;

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
        const valEl = entry ? entry.valueEl : null;
        if (valEl) {
          valEl.textContent = formatNumber(resourceObj.value);
        }
      
        const capElement = entry ? entry.capEl : null;
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
  const entry = resourceUICache.resources[resource.name] || cacheSingleResource(resource.category, resource.name);
  const ppsElement = entry ? entry.ppsEl : document.getElementById(`${resource.name}-pps-resources-container`);
  if (resource.hideRate) {
    if (ppsElement) {
      ppsElement.remove();
    }
  } else if (ppsElement) {
    const netRate = resource.productionRate - resource.consumptionRate;

    // Record net rate history
    if (typeof resource.recordNetRate === 'function') {
      resource.recordNetRate(netRate);
    } else {
      resource.rateHistory = resource.rateHistory || [];
      resource.rateHistory.push(netRate);
      if (resource.rateHistory.length > 10) {
        resource.rateHistory.shift();
      }
    }

    let showUnstable = false;
    const history = resource.rateHistory || [];
    if (history.length >= 10) {
      // Count sign changes
      let signChanges = 0;
      for (let i = 1; i < history.length; i++) {
        const current = history[i];
        const previous = history[i - 1];
        if ((current > 0 && previous < 0) || (current < 0 && previous > 0)) {
          signChanges++;
        }
      }
      if (signChanges > 1) {
        showUnstable = true;
      }
    }

    if (showUnstable) {
      ppsElement.textContent = 'Unstable';
      ppsElement.style.color = '';
    } else {
      if (Math.abs(netRate) < 1e-3) {
        ppsElement.textContent = `0`;
      } else {
        ppsElement.textContent = `${netRate >= 0 ? '+' : ''}${formatNumber(netRate, false, 2)}`;
      }
      if (netRate < 0 && Math.abs(netRate) > resource.value) {
        ppsElement.style.color = 'red';
      } else if (netRate < 0 && Math.abs(netRate) > resource.value / 120) {
        ppsElement.style.color = 'orange';
      } else {
        ppsElement.style.color = '';
      }
    }
  }

  const tooltipElement = entry?.tooltip?.root || document.getElementById(`${resource.name}-tooltip`);
  if (!tooltipElement || !tooltipElement._isActive) return;

  const valueDiv = entry?.tooltip?.valueDiv || document.getElementById(`${resource.name}-tooltip-value`);
  const timeDiv = entry?.tooltip?.timeDiv || document.getElementById(`${resource.name}-tooltip-time`);
  const assignmentsDiv = entry?.tooltip?.assignmentsDiv || document.getElementById(`${resource.name}-tooltip-assignments`);
  const zonesDiv = entry?.tooltip?.zonesDiv || document.getElementById(`${resource.name}-tooltip-zones`);
  const netDiv = entry?.tooltip?.netDiv || document.getElementById(`${resource.name}-tooltip-net`);
  const productionDiv = entry?.tooltip?.productionDiv || document.getElementById(`${resource.name}-tooltip-production`);
  const consumptionDiv = entry?.tooltip?.consumptionDiv || document.getElementById(`${resource.name}-tooltip-consumption`);
  const overflowDiv = entry?.tooltip?.overflowDiv || document.getElementById(`${resource.name}-tooltip-overflow`);
  const autobuildDiv = entry?.tooltip?.autobuildDiv || document.getElementById(`${resource.name}-tooltip-autobuild`);

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
  const autobuildAvg = (typeof autobuildCostTracker !== 'undefined' && resource.category === 'colony')
    ? autobuildCostTracker.getAverageCost(resource.category, resource.name)
    : 0;
  if (netDiv) {
    let text;
    if (resource.category === 'colony') {
      const netIncAuto = netRate - autobuildAvg;
      text = `Net Change (including autobuild): ${formatNumber(netIncAuto, false, 2)}${resource.unit ? ' ' + resource.unit : ''}/s`;
    } else {
      text = `Net Change: ${formatNumber(netRate, false, 2)}${resource.unit ? ' ' + resource.unit : ''}/s`;
    }
    if (netDiv.textContent !== text) netDiv.textContent = text;
  }

  if (productionDiv) {
    const productionEntries = Object.entries(resource.productionRateBySource)
      .filter(([source, rate]) => rate !== 0 && source !== 'Overflow' && source !== 'Overflow (not summed)');
    updateRateTable(productionDiv, productionEntries, r => `${formatNumber(r, false, 2)}/s`);
    productionDiv.style.display = productionEntries.length > 0 ? 'block' : 'none';
  }

  if (consumptionDiv) {
    const consumptionEntries = Object.entries(resource.consumptionRateBySource)
      .filter(([source, rate]) => rate !== 0 && source !== 'Overflow (not summed)');
    updateRateTable(consumptionDiv, consumptionEntries, r => `${formatNumber(r, false, 2)}/s`);
    consumptionDiv.style.display = consumptionEntries.length > 0 ? 'block' : 'none';
  }

  if (overflowDiv) {
    const overflowEntries = [
      ...Object.entries(resource.consumptionRateByType?.overflow || {}),
      ...Object.entries(resource.productionRateByType?.overflow || {})
    ]
      .filter(([, rate]) => rate !== 0)
      .map(([src, rate]) => [src.replace(' (not summed)', ''), rate]);
    updateRateTable(overflowDiv, overflowEntries, r => `${formatNumber(r, false, 2)}/s`);
    overflowDiv.style.display = overflowEntries.length > 0 ? 'block' : 'none';
  }

  if (autobuildDiv) {
    if (typeof autobuildCostTracker !== 'undefined' && resource.category === 'colony') {
      const avgCost = autobuildAvg;
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
  // Build cache after first render for faster updates
  cacheResourceElements(resources);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// -------------------- DOM cache for Resource UI -------------------- //

const resourceUICache = {
  categories: {}, // { [category]: { container, header } }
  resources: {},  // { [resourceName]: { container, nameEl, valueEl, capEl, ppsEl, availableEl, totalEl, scanEl, tooltip: {...} } }
};

function cacheResourceCategory(category) {
  const containerId = `${category}-resources-resources-container`;
  const container = document.getElementById(containerId);
  const header = document.getElementById(`${category}-resources-header`);
  resourceUICache.categories[category] = { container, header };
  return resourceUICache.categories[category];
}

function cacheSingleResource(category, resourceName) {
  const entry = {
    container: document.getElementById(`${resourceName}-container`),
    nameEl: document.getElementById(`${resourceName}-name`),
    valueEl: document.getElementById(`${resourceName}-resources-container`),
    capEl: document.getElementById(`${resourceName}-cap-resources-container`),
    ppsEl: document.getElementById(`${resourceName}-pps-resources-container`),
    availableEl: document.getElementById(`${resourceName}-available-resources-container`),
    totalEl: document.getElementById(`${resourceName}-total-resources-container`),
    scanEl: document.getElementById(`${resourceName}-scanning-progress-resources-container`),
    tooltip: {
      root: document.getElementById(`${resourceName}-tooltip`),
      valueDiv: document.getElementById(`${resourceName}-tooltip-value`),
      timeDiv: document.getElementById(`${resourceName}-tooltip-time`),
      assignmentsDiv: document.getElementById(`${resourceName}-tooltip-assignments`),
      zonesDiv: document.getElementById(`${resourceName}-tooltip-zones`),
      netDiv: document.getElementById(`${resourceName}-tooltip-net`),
      productionDiv: document.getElementById(`${resourceName}-tooltip-production`),
      consumptionDiv: document.getElementById(`${resourceName}-tooltip-consumption`),
      overflowDiv: document.getElementById(`${resourceName}-tooltip-overflow`),
      autobuildDiv: document.getElementById(`${resourceName}-tooltip-autobuild`),
    }
  };
  resourceUICache.resources[resourceName] = entry;
  return entry;
}

function cacheResourceElements(resources) {
  if (typeof document === 'undefined') return;
  for (const category in resources) {
    cacheResourceCategory(category);
    const items = resources[category];
    for (const resourceName in items) {
      cacheSingleResource(category, resourceName);
    }
  }
}

function invalidateResourceUICache() {
  resourceUICache.categories = {};
  resourceUICache.resources = {};
}
