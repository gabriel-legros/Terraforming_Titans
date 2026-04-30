const wasteResourceNames = new Set(['scrapMetal', 'garbage', 'trash', 'junk', 'radioactiveWaste']);
const SPACE_STORAGE_UI_ORDER = [
  'energy',
  'metal',
  'silicon',
  'graphite',
  'glass',
  'components',
  'electronics',
  'superconductors',
  'superalloys',
  'liquidWater',
  'biomass',
  'carbonDioxide',
  'inertGas',
  'oxygen',
  'atmosphericMethane',
  'atmosphericAmmonia',
  'hydrogen',
];
const SPACE_STORAGE_DIVIDER_TOP_RESOURCES = new Set(['components', 'liquidWater', 'carbonDioxide']);
const SPACE_STORAGE_DIVIDER_MARGIN = 10;
let resourceViewModeUpdating = false;

function getResourceUIText(path, fallback, vars) {
  try {
    return t(`ui.resourcePanel.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

function getResourceUICommonText(path, fallback, vars) {
  return getResourceUIText(`common.${path}`, fallback, vars);
}

function getResourceUIWarningText(path, fallback, vars) {
  return getResourceUIText(`warnings.${path}`, fallback, vars);
}

function getWasteTooltipNoteText() {
  return getResourceUICommonText(
    'wasteTooltipNote',
    'Waste processing buildings display their consumption based on their available staffing and power, ignoring waste shortages. The numbers here are not their actual consumption.'
  );
}

function formatResourceTimeToEmpty(seconds) {
  if (seconds >= 24 * 3600) {
    return formatDuration(seconds);
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return formatDuration(seconds);
}

function showSpaceStorageInDefaultPanel() {
  return gameSettings.showSpaceStorageInDefaultPanel === true;
}

function isSpaceStorageViewActive() {
  return !showSpaceStorageInDefaultPanel() && gameSettings.showSpaceStorageResources === true;
}

function shouldRenderResourceCategory(category) {
  if (category === 'space') {
    return false;
  }
  if (showSpaceStorageInDefaultPanel()) {
    return category !== 'space';
  }
  if (isSpaceStorageViewActive()) {
    return category === 'spaceStorage';
  }
  return category !== 'spaceStorage';
}

function getResourceCategoriesForDisplay(resourceSet) {
  const categories = Object.keys(resourceSet || {});
  if (!showSpaceStorageInDefaultPanel()) {
    return categories;
  }
  const colonyIndex = categories.indexOf('colony');
  const spaceStorageIndex = categories.indexOf('spaceStorage');
  if (colonyIndex === -1 || spaceStorageIndex === -1 || spaceStorageIndex === colonyIndex + 1) {
    return categories;
  }
  categories.splice(spaceStorageIndex, 1);
  categories.splice(colonyIndex + 1, 0, 'spaceStorage');
  return categories;
}

function getResourceUIKey(category, resourceName) {
  return category === 'spaceStorage' ? `spaceStorage:${resourceName}` : resourceName;
}

function getResourceDomPrefix(category, resourceName) {
  return category === 'spaceStorage' ? `space-storage-${resourceName}` : resourceName;
}

function getResourceDomId(category, resourceName, suffix) {
  const prefix = getResourceDomPrefix(category, resourceName);
  return suffix ? `${prefix}-${suffix}` : prefix;
}

function hasUnlockedSpaceStorageResources(resourceSet) {
  const storageProj = projectManager?.projects?.spaceStorage;
  if (storageProj?.syncSpaceStorageResourceUnlocks) {
    storageProj.syncSpaceStorageResourceUnlocks();
  }
  const storageResources = resourceSet?.spaceStorage;
  if (storageResources) {
    for (const resourceName in storageResources) {
      if (storageResources[resourceName]?.unlocked) {
        return true;
      }
    }
  }
  const spaceResources = resourceSet?.space;
  if (spaceResources) {
    for (const resourceName in spaceResources) {
      if (spaceResources[resourceName]?.unlocked) {
        return true;
      }
    }
  }
  return false;
}

function getSpaceStorageProjectForResourceUI() {
  return projectManager?.projects?.spaceStorage || null;
}

function getSpaceStorageResourceCapDisplay(resourceKey) {
  const storageProj = getSpaceStorageProjectForResourceUI();
  if (!storageProj || !storageProj.getResourceCapSetting || !storageProj.getResourceCapLimit) {
    return null;
  }
  const capLimit = storageProj.getResourceCapLimit(resourceKey);
  if (!Number.isFinite(capLimit)) {
    return null;
  }
  return Math.max(0, capLimit);
}

function updateSpaceStorageCapDisplay(entry, resourceKey) {
  if (!entry || !entry.rowEl || !entry.slashEl || !entry.capWrapperEl || !entry.capEl) {
    return;
  }
  const capLimit = getSpaceStorageResourceCapDisplay(resourceKey);
  const showCap = Number.isFinite(capLimit);
  entry.rowEl.classList.toggle('no-cap', !showCap);
  entry.slashEl.style.display = showCap ? '' : 'none';
  entry.capWrapperEl.style.display = showCap ? '' : 'none';
  entry.capEl.classList.remove('resource-cap-limited');
  if (showCap) {
    entry.capEl.textContent = formatNumber(capLimit);
  }
}

function createSpaceStorageTotalElement() {
  const totalText = getResourceUICommonText('total', 'Total');
  const resourceElement = document.createElement('div');
  resourceElement.classList.add('resource-item');
  resourceElement.classList.add('resource-divider-bottom');
  resourceElement.id = 'space-storage-total-container';
  resourceElement.style.marginBottom = '10px';
  resourceElement.style.setProperty('--divider-margin-bottom', '10px');
  resourceElement.innerHTML = `
      <div class="resource-row">
        <div class="resource-name"><strong id="space-storage-total-name">${totalText}</strong></div>
        <div class="resource-value" id="space-storage-total-value-resources-container">0</div>
        <div class="resource-slash">/</div>
        <div class="resource-cap"><span id="space-storage-total-cap-resources-container">0</span></div>
        <div class="resource-pps"></div>
      </div>
  `;
  return resourceElement;
}

function getDisplayResourceObject(resourceSet, category, resourceName) {
  if (category === 'spaceStorage' && resourceName === 'energy') {
    return resourceSet?.space?.energy || null;
  }
  return resourceSet?.[category]?.[resourceName] || null;
}

function getResourceNamesForDisplay(category, resourceMap, resourceSet = null) {
  const names = Object.keys(resourceMap || {});
  if (category !== 'spaceStorage') {
    return names;
  }
  if (resourceSet?.space?.energy) {
    names.push('energy');
  }
  const dedupedNames = Array.from(new Set(names));
  const orderIndexByName = {};
  for (let i = 0; i < SPACE_STORAGE_UI_ORDER.length; i += 1) {
    orderIndexByName[SPACE_STORAGE_UI_ORDER[i]] = i;
  }
  return dedupedNames.sort((a, b) => {
    const indexA = Object.prototype.hasOwnProperty.call(orderIndexByName, a) ? orderIndexByName[a] : Number.MAX_SAFE_INTEGER;
    const indexB = Object.prototype.hasOwnProperty.call(orderIndexByName, b) ? orderIndexByName[b] : Number.MAX_SAFE_INTEGER;
    if (indexA !== indexB) return indexA - indexB;
    return a.localeCompare(b);
  });
}

function reorderSpaceStorageElements(container) {
  if (!container) return;
  const total = document.getElementById('space-storage-total-container');
  if (total && container.firstChild !== total) {
    container.insertBefore(total, container.firstChild);
  }
  for (let i = 0; i < SPACE_STORAGE_UI_ORDER.length; i += 1) {
    const resourceName = SPACE_STORAGE_UI_ORDER[i];
    const resourceElement = document.getElementById(getResourceDomId('spaceStorage', resourceName, 'container'));
    if (resourceElement && resourceElement.parentElement === container) {
      container.appendChild(resourceElement);
    }
  }
}

function ensureSpaceStorageTotalElement(container) {
  if (!container) return;
  let totalElement = document.getElementById('space-storage-total-container');
  if (!totalElement) {
    totalElement = createSpaceStorageTotalElement();
  }
  if (container.firstChild !== totalElement) {
    container.insertBefore(totalElement, container.firstChild);
  }
}

function cacheSpaceStorageTotalEntry() {
  resourceUICache.spaceStorageTotal = {
    container: document.getElementById('space-storage-total-container'),
    rowEl: document.querySelector('#space-storage-total-container .resource-row'),
    valueEl: document.getElementById('space-storage-total-value-resources-container'),
    capEl: document.getElementById('space-storage-total-cap-resources-container')
  };
  return resourceUICache.spaceStorageTotal;
}

function setResourceCapLimited(entry, isLimited) {
  if (!entry || !entry.capEl) return;
  entry.capEl.classList.toggle('resource-cap-limited', isLimited === true);
}

function shouldShowCapLimitedWithCooldown(timerKey, isLimited, frameDelta) {
  const timers = resourceUICache.capLimitTimers || (resourceUICache.capLimitTimers = {});
  let timer = timers[timerKey] || 0;
  const elapsed = Math.max(0, Math.min(1, Number.isFinite(frameDelta) ? frameDelta : 0));
  if (isLimited) {
    timer = 1;
  } else if (timer > 0) {
    timer = Math.max(0, timer - elapsed);
  }
  timers[timerKey] = timer;
  return isLimited || timer > 0;
}

function getTooltipTimeCapForResource(resource) {
  if (!resource) return null;
  if (resource.category === 'spaceStorage') {
    return getSpaceStorageResourceCapDisplay(resource.name);
  }
  if (resource.hasCap && Number.isFinite(resource.cap)) {
    return Math.max(0, resource.cap);
  }
  return null;
}

function setResourcePanelViewMode(showSpaceStorage) {
  if (!resources) return;
  const canUseSpaceStorageView = hasUnlockedSpaceStorageResources(resources);
  const nextMode = !showSpaceStorageInDefaultPanel() && showSpaceStorage && canUseSpaceStorageView;
  if (gameSettings.showSpaceStorageResources === nextMode) {
    updateResourceViewToggleState(resources);
    return;
  }
  gameSettings.showSpaceStorageResources = nextMode;
  invalidateResourceUICache();
  createResourceDisplay(resources);
}

function updateResourceViewToggleState(resourceSet) {
  if (resourceViewModeUpdating) return;
  const toggles = resourceUICache.viewToggles || {};
  const enabled = hasUnlockedSpaceStorageResources(resourceSet);
  const showToggle = enabled && !showSpaceStorageInDefaultPanel();
  if (!showToggle && isSpaceStorageViewActive()) {
    resourceViewModeUpdating = true;
    gameSettings.showSpaceStorageResources = false;
    invalidateResourceUICache();
    createResourceDisplay(resourceSet);
    resourceViewModeUpdating = false;
    return;
  }
  for (const key in toggles) {
    const toggle = toggles[key];
    if (!toggle) continue;
    toggle.style.display = showToggle ? 'inline-flex' : 'none';
    toggle.disabled = !showToggle;
    setToggleButtonState(toggle, isSpaceStorageViewActive());
  }
}

function isWasteResource(resourceName) {
  return wasteResourceNames.has(resourceName);
}

function swapResourceRateColor(resource, color) {
  if (resource.reverseColor && color === 'red') return 'green';
  if (resource.reverseColor && color === 'green') return 'red';
  return color;
}

function getLiquidCoverageTargetAmount(terraformingState, coverageKey, targetCoverage) {
  if (typeof getCoverageTargetAmount === 'function') {
    return getCoverageTargetAmount(terraformingState, coverageKey, targetCoverage);
  }
  const surfaceArea = terraformingState.celestialParameters.surfaceArea;
  let total = 0;
  for (const zone of getZones()) {
    const zoneArea = surfaceArea * getZonePercentage(zone);
    total += estimateAmountForCoverage(targetCoverage, zoneArea);
  }
  return total;
}

function createResourceContainers(resourcesData) {
  const resourcesContainer = document.getElementById('resources-container');
  resourcesContainer.innerHTML = ''; // Clear the main container first
  resourceUICache.viewToggles = {};

  const categories = getResourceCategoriesForDisplay(resourcesData);
  for (let i = 0; i < categories.length; i += 1) {
    const category = categories[i];
    // Create a new container for each category
    const categoryContainer = document.createElement('div');
    categoryContainer.classList.add('resource-display');
    categoryContainer.style.display = 'none'; // Initially hidden

    // Create and append the header for the category
    const header = document.createElement('h3');
    header.id = `${category}-resources-header`;
    header.classList.add('resource-category-header');
    header.style.display = 'none'; // Initially hidden

    const collapseTarget = document.createElement('span');
    collapseTarget.classList.add('resource-category-toggle-target');

    const arrow = document.createElement('span');
    arrow.classList.add('collapse-arrow');
    arrow.innerHTML = '&#9660;';
    collapseTarget.appendChild(arrow);

    const label = document.createElement('span');
    label.classList.add('resource-category-label');
    if (category === 'spaceStorage') {
      label.textContent = getResourceUICommonText('spaceResources', 'Space Resources');
    } else {
      label.textContent = getResourceUICommonText('categoryResources', '{name} Resources', {
        name: capitalizeFirstLetter(category),
      });
    }
    collapseTarget.appendChild(label);
    header.appendChild(collapseTarget);

    if (category === 'colony' || category === 'spaceStorage') {
      const controls = document.createElement('span');
      controls.classList.add('resource-category-controls');
      const toggle = createToggleButton({
        onLabel: '',
        offLabel: '',
        isOn: isSpaceStorageViewActive()
      });
      toggle.classList.add('resource-view-toggle');
      const toggleLabel = getResourceUICommonText('toggleView', 'Toggle colony/space resource view');
      toggle.title = toggleLabel;
      toggle.setAttribute('aria-label', toggleLabel);
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        setResourcePanelViewMode(!isSpaceStorageViewActive());
      });
      controls.appendChild(toggle);
      header.appendChild(controls);
      resourceUICache.viewToggles[category] = toggle;
    }
    categoryContainer.appendChild(header);

    // Create and append the resource list container
    const resourceList = document.createElement('div');
    resourceList.id = `${category}-resources-resources-container`;
    categoryContainer.appendChild(resourceList);

    collapseTarget.addEventListener('click', () => {
      const hidden = resourceList.style.display === 'none';
      resourceList.style.display = hidden ? '' : 'none';
      arrow.innerHTML = hidden ? '&#9660;' : '&#9654;';
    });

    // Append the complete category container to the main container
    resourcesContainer.appendChild(categoryContainer);
  }
  updateResourceViewToggleState(resourcesData);
}

function createTooltipElement(category, resourceName) {
  const tooltip = document.createElement('div');
  tooltip.classList.add('resource-tooltip');
  tooltip.id = getResourceDomId(category, resourceName, 'tooltip');

  const valueDiv = document.createElement('div');
  valueDiv.id = getResourceDomId(category, resourceName, 'tooltip-value');

  const timeDiv = document.createElement('div');
  timeDiv.id = getResourceDomId(category, resourceName, 'tooltip-time');
  timeDiv.classList.add('resource-tooltip-time');

  let noteDiv;
  let wasteNoteDiv;
  if (resourceName === 'land') {
    noteDiv = document.createElement('div');
    noteDiv.id = getResourceDomId(category, resourceName, 'tooltip-note');
    noteDiv.textContent = getResourceUICommonText('landRecoverNote', 'Land can be recovered by turning off the corresponding building');
  }
  if (isWasteResource(resourceName)) {
    const wasteTooltipNoteText = getWasteTooltipNoteText();
    wasteNoteDiv = document.createElement('div');
    wasteNoteDiv.id = getResourceDomId(category, resourceName, 'tooltip-waste-note');
    wasteNoteDiv.textContent = wasteTooltipNoteText;
  }

  const assignmentsDiv = document.createElement('div');
  assignmentsDiv.id = getResourceDomId(category, resourceName, 'tooltip-assignments');

  const zonesDiv = document.createElement('div');
  zonesDiv.id = getResourceDomId(category, resourceName, 'tooltip-zones');
  zonesDiv.style.display = 'none';
  zonesDiv.appendChild(document.createElement('br'));
  const zonesHeader = document.createElement('strong');
  zonesHeader.textContent = getResourceUICommonText('zonalAmounts', 'Zonal Amounts:');
  zonesDiv.appendChild(zonesHeader);
  zonesDiv.appendChild(document.createElement('br'));
  zonesDiv._info = { lines: new Map() };
  getZones().forEach(zone => {
    const line = document.createElement('div');
    zonesDiv.appendChild(line);
    zonesDiv._info.lines.set(zone, line);
  });

  const netDiv = document.createElement('div');
  netDiv.id = getResourceDomId(category, resourceName, 'tooltip-net');
  const netAutoLine = document.createElement('div');
  netAutoLine.classList.add('resource-tooltip-net-line');
  const netBaseLine = document.createElement('div');
  netBaseLine.classList.add('resource-tooltip-net-line');
  netDiv.appendChild(netAutoLine);
  netDiv.appendChild(netBaseLine);
  netDiv._lineAuto = netAutoLine;
  netDiv._lineBase = netBaseLine;

  const limitDiv = document.createElement('div');
  limitDiv.id = getResourceDomId(category, resourceName, 'tooltip-limit');
  limitDiv.style.display = 'none';

  const warningDiv = document.createElement('div');
  warningDiv.id = getResourceDomId(category, resourceName, 'tooltip-warning');
  warningDiv.classList.add('resource-tooltip-warning');
  warningDiv.style.display = 'none';
  const warningIcon = document.createElement('span');
  warningIcon.classList.add('info-tooltip-icon');
  warningIcon.innerHTML = '&#9432;';
  const warningTooltip = attachDynamicInfoTooltip(warningIcon, '');
  warningDiv.appendChild(warningIcon);
  warningDiv.appendChild(document.createTextNode(' '));
  const warningText = document.createElement('span');
  warningText.classList.add('resource-tooltip-warning-text');
  warningDiv.appendChild(warningText);
  warningDiv._info = { icon: warningIcon, text: warningText, tooltip: warningTooltip, tooltipCache: {} };

  const headerDiv = document.createElement('div');
  headerDiv.appendChild(valueDiv);
  headerDiv.appendChild(timeDiv);
  if (noteDiv) headerDiv.appendChild(noteDiv);
  if (wasteNoteDiv) headerDiv.appendChild(wasteNoteDiv);
  headerDiv.appendChild(assignmentsDiv);
  headerDiv.appendChild(zonesDiv);
  headerDiv.appendChild(netDiv);
  headerDiv.appendChild(limitDiv);
  headerDiv.appendChild(warningDiv);

  const productionDiv = document.createElement('div');
  productionDiv.id = getResourceDomId(category, resourceName, 'tooltip-production');
  productionDiv.style.display = 'none';
  const prodHeader = document.createElement('strong');
  prodHeader.textContent = getResourceUICommonText('production', 'Production:');
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
  prodTotalLeftStrong.textContent = getResourceUICommonText('totalLabel', 'Total :');
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
  consumptionDiv.id = getResourceDomId(category, resourceName, 'tooltip-consumption');
  consumptionDiv.style.display = 'none';
  consumptionDiv.appendChild(document.createElement('br'));
  const consHeader = document.createElement('strong');
  consHeader.textContent = getResourceUICommonText('consumptionAndMaintenance', 'Consumption and Maintenance:');
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
  consTotalLeftStrong.textContent = getResourceUICommonText('totalLabel', 'Total :');
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
  overflowDiv.id = getResourceDomId(category, resourceName, 'tooltip-overflow');
  overflowDiv.style.display = 'none';
  overflowDiv.appendChild(document.createElement('br'));
  const overflowHeader = document.createElement('strong');
  overflowHeader.textContent = getResourceUICommonText('overflow', 'Overflow:');
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
  overflowTotalLeftStrong.textContent = getResourceUICommonText('totalLabel', 'Total :');
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
  autobuildDiv.id = getResourceDomId(category, resourceName, 'tooltip-autobuild');
  autobuildDiv.style.display = 'none';
  autobuildDiv.appendChild(document.createElement('br'));
  const autoHeader = document.createElement('strong');
  autoHeader.textContent = getResourceUICommonText('autobuildCost', 'Autobuild Cost (avg 10s):');
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

function updateAutobuildRateTable(container, breakdownEntries, shortageBuildings, formatter) {
  if (!container) return;
  const info = container._info;
  const used = new Set();
  const breakdownMap = new Map();
  for (let i = 0; i < breakdownEntries.length; i += 1) {
    const entry = breakdownEntries[i];
    if (!entry) continue;
    const name = entry[0];
    const value = entry[1];
    if (!name) continue;
    breakdownMap.set(name, value || 0);
  }

  if (shortageBuildings) {
    for (const buildingName in shortageBuildings) {
      if (!Object.prototype.hasOwnProperty.call(shortageBuildings, buildingName)) continue;
      if (!breakdownMap.has(buildingName)) {
        breakdownMap.set(buildingName, 0);
      }
    }
  }

  const entries = Array.from(breakdownMap.entries());
  entries.sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < entries.length; i += 1) {
    const name = entries[i][0];
    const value = entries[i][1];
    const throttled = !!(shortageBuildings && shortageBuildings[name]);
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

    if (rowInfo.left.textContent !== name) rowInfo.left.textContent = name;

    const rateText = formatter(value);
    if (!rowInfo.valueSpan) {
      rowInfo.right.textContent = '';
      rowInfo.valueSpan = document.createElement('span');
      rowInfo.markerSpan = document.createElement('span');
      rowInfo.right.appendChild(rowInfo.valueSpan);
      rowInfo.right.appendChild(rowInfo.markerSpan);
    }
    if (rowInfo.valueSpan.textContent !== rateText) rowInfo.valueSpan.textContent = rateText;
    const markerText = throttled ? ' !' : '';
    if (rowInfo.markerSpan.textContent !== markerText) rowInfo.markerSpan.textContent = markerText;
    rowInfo.markerSpan.style.color = throttled ? 'orange' : '';
    rowInfo.row.style.display = 'table-row';
    info.table.appendChild(rowInfo.row);
    used.add(name);
  }

  info.rows.forEach((rowInfo, name) => {
    if (!used.has(name)) {
      if (rowInfo.row.parentNode) rowInfo.row.parentNode.removeChild(rowInfo.row);
      info.rows.delete(name);
    }
  });
}

function updateRateTableWithCooldown(container, entries, formatter, frameDelta) {
  if (!container) return false;
  const info = container._info;
  let cooldown = container._cooldown;
  if (!cooldown) {
    cooldown = { timers: {}, lastValues: {}, lastTotal: 0, totalTimer: 0 };
    container._cooldown = cooldown;
  }
  const activeEntries = [];
  const activeSet = new Set();
  entries.forEach(([name, val]) => {
    if (Math.abs(val) >= 1e-12) {
      activeEntries.push([name, val]);
      activeSet.add(name);
      cooldown.timers[name] = 1;
      cooldown.lastValues[name] = val;
    }
  });

  const displayEntries = [];
  activeEntries.forEach(([name, val]) => {
    displayEntries.push([name, val, 0]);
  });

  const timers = cooldown.timers;
  const lastValues = cooldown.lastValues;
  for (const name in timers) {
    if (activeSet.has(name)) continue;
    let timer = timers[name] || 0;
    if (timer > 0) {
      timer = Math.max(0, timer - frameDelta);
    }
    if (timer > 0) {
      timers[name] = timer;
      const last = lastValues[name] || 0;
      displayEntries.push([name, 0, last]);
    } else {
      delete timers[name];
      delete lastValues[name];
    }
  }

  const total = activeEntries.reduce((sum, [, val]) => sum + val, 0);
  let totalTimer = cooldown.totalTimer || 0;
  if (Math.abs(total) >= 1e-12) {
    cooldown.lastTotal = total;
    totalTimer = 1;
  } else if (totalTimer > 0) {
    totalTimer = Math.max(0, totalTimer - frameDelta);
  }
  cooldown.totalTimer = totalTimer;

  if (info.totalRight) {
    if (Math.abs(total) >= 1e-12) {
      info.totalRight.textContent = formatter(total);
      info.totalRow.style.display = 'table-row';
    } else if (totalTimer > 0) {
      info.totalRight.textContent = `${formatter(0)} (${formatter(cooldown.lastTotal)})`;
      info.totalRow.style.display = 'table-row';
    } else {
      info.totalRow.style.display = 'none';
    }
  }

  const used = new Set();
  displayEntries.sort((a, b) => {
    const aVal = a[1] !== 0 ? a[1] : a[2];
    const bVal = b[1] !== 0 ? b[1] : b[2];
    return bVal - aVal;
  }).forEach(([name, val, last]) => {
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
    const text = (last && Math.abs(last) >= 1e-12)
      ? `${formatter(val)} (${formatter(last)})`
      : formatter(val);
    if (rowInfo.left.textContent !== name) rowInfo.left.textContent = name;
    if (rowInfo.right.textContent !== text) rowInfo.right.textContent = text;
    rowInfo.row.style.display = 'table-row';
    info.table.appendChild(rowInfo.row);
    used.add(name);
  });

  info.rows.forEach((rowInfo, name) => {
    if (!used.has(name)) {
      if (rowInfo.row.parentNode) rowInfo.row.parentNode.removeChild(rowInfo.row);
      info.rows.delete(name);
    }
  });

  return displayEntries.length > 0 || totalTimer > 0;
}

function isAutobuildTrackedResource(resource) {
  return resource.category === 'colony'
    || (resource.category === 'special' && resource.name === 'orbitalDebris');
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

function updateAssignmentTable(container, assignments, valueFormatter = null) {
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
    const headerStrong = document.createElement('strong');
    headerStrong.textContent = getResourceUICommonText('assignments', 'Assignments:');
    header.appendChild(headerStrong);
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
    const text = valueFormatter ? valueFormatter(count) : formatNumber(count, true);
    if (span.textContent !== text) span.textContent = text;
  });
}

function updateWorkerAssignments(assignmentsDiv) {
  if (!assignmentsDiv || typeof populationModule === 'undefined') return;
  const workerBreakdown = populationModule.getWorkerCapacityBreakdown(false);

  let ratioDiv = assignmentsDiv._ratioDiv;
  if (!ratioDiv) {
    ratioDiv = document.createElement('div');
    assignmentsDiv.appendChild(ratioDiv);
    assignmentsDiv._ratioDiv = ratioDiv;
  }
  const ratioPercent = (workerBreakdown.ratio * 100).toFixed(0);
  const ratioText = getResourceUIText('workers.ratio', '{value}% of colonists provide workers', {
    value: ratioPercent,
  });
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
    const colonistText = getResourceUIText('workers.colonists', '{value} from colonists', {
      value: formatNumber(workerBreakdown.colonistWorkers, true),
    });
    if (colonistDiv.textContent !== colonistText) colonistDiv.textContent = colonistText;

    let keratiHiveDiv = assignmentsDiv._keratiHiveDiv;
    const keratiHiveWorkers = workerBreakdown.keratiHiveWorkers || 0;
    if (keratiHiveWorkers > 0) {
      if (!keratiHiveDiv) {
        keratiHiveDiv = document.createElement('div');
        assignmentsDiv._keratiHiveDiv = keratiHiveDiv;
      }
      const existingAndroidDiv = assignmentsDiv._androidDiv;
      if (existingAndroidDiv && existingAndroidDiv.parentNode === assignmentsDiv) {
        if (keratiHiveDiv.parentNode !== assignmentsDiv || keratiHiveDiv.nextSibling !== existingAndroidDiv) {
          assignmentsDiv.insertBefore(keratiHiveDiv, existingAndroidDiv);
        }
      } else if (keratiHiveDiv.parentNode !== assignmentsDiv) {
        assignmentsDiv.appendChild(keratiHiveDiv);
      }
      const keratiHiveText = getResourceUIText('workers.keratiHive', '{value} from Kerati Hive', {
        value: formatNumber(keratiHiveWorkers, true),
      });
      if (keratiHiveDiv.textContent !== keratiHiveText) keratiHiveDiv.textContent = keratiHiveText;
    } else if (keratiHiveDiv && keratiHiveDiv.parentNode === assignmentsDiv) {
      assignmentsDiv.removeChild(keratiHiveDiv);
    }

    let androidDiv = assignmentsDiv._androidDiv;
    if (!androidDiv) {
      androidDiv = document.createElement('div');
      assignmentsDiv.appendChild(androidDiv);
      assignmentsDiv._androidDiv = androidDiv;
    }
    const androidText = getResourceUIText('workers.androids', '{value} from androids', {
      value: formatNumber(workerBreakdown.androidWorkers, true),
    });
    if (androidDiv.textContent !== androidText) androidDiv.textContent = androidText;

    let capDiv = assignmentsDiv._capDiv;
    if (workerBreakdown.aerostatWorkerCapEnabled) {
      if (!capDiv) {
        capDiv = document.createElement('div');
        assignmentsDiv._capDiv = capDiv;
      }
      if (capDiv.parentNode !== assignmentsDiv) {
        assignmentsDiv.appendChild(capDiv);
      }
      const capText = getResourceUIText(
        'workers.aerostatCap',
        'Aerostat worker cap: {cap} (from {uncapped} uncapped)',
        {
          cap: formatNumber(workerBreakdown.totalWorkers, true),
          uncapped: formatNumber(workerBreakdown.uncappedTotalWorkers, true),
        }
      );
      if (capDiv.textContent !== capText) capDiv.textContent = capText;
    } else if (capDiv && capDiv.parentNode === assignmentsDiv) {
      assignmentsDiv.removeChild(capDiv);
    }

    const bioworkers = workerBreakdown.bioworkers;
    let bioworkerDiv = assignmentsDiv._bioworkerDiv;
    if (bioworkers > 0) {
      if (!bioworkerDiv) {
        bioworkerDiv = document.createElement('div');
        assignmentsDiv._bioworkerDiv = bioworkerDiv;
      }
      if (bioworkerDiv.parentNode !== assignmentsDiv || bioworkerDiv.nextSibling !== androidDiv) {
        assignmentsDiv.insertBefore(bioworkerDiv, androidDiv);
      }
      const bioworkerText = getResourceUIText('workers.bioworkers', '{value} from bioworkers', {
        value: formatNumber(bioworkers, true),
      });
      if (bioworkerDiv.textContent !== bioworkerText) bioworkerDiv.textContent = bioworkerText;
    } else if (bioworkerDiv && bioworkerDiv.parentNode === assignmentsDiv) {
      assignmentsDiv.removeChild(bioworkerDiv);
    }
  }

  const assignments = [];
  if (typeof buildings !== 'undefined') {
    for (const name in buildings) {
      const b = buildings[name];
      if (b.active > 0n && b.getTotalWorkerNeed && b.getTotalWorkerNeed() > 0) {
        const assigned = b.activeNumber * b.getTotalWorkerNeed() * (b.getEffectiveWorkerMultiplier ? b.getEffectiveWorkerMultiplier() : 1);
        if (assigned > 0) {
          assignments.push([b.displayName || name, assigned]);
        }
      }
    }
  }
  const shipWorkers = Math.max(0, hazardManager?.getAdditionalWorkerRequirements?.()?.normal || 0);
  if (shipWorkers > 0) {
    assignments.push([getResourceUIText('workers.ships', 'Ships'), shipWorkers]);
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
      if (b.active > 0n && b.requiresLand) {
        const used = b.activeNumber * b.requiresLand;
        if (used > 0) assignments.push([b.displayName || name, used]);
      }
    }
  }
  if (typeof colonies !== 'undefined') {
    for (const name in colonies) {
      const c = colonies[name];
      if (c.active > 0n && c.requiresLand) {
        const used = c.activeNumber * c.requiresLand;
        if (used > 0) assignments.push([c.displayName || name, used]);
      }
    }
  }
  const landResource = resources?.surface?.land;
  if (landResource?.getReservedAmountForSource) {
    const hazardReserved = landResource.getReservedAmountForSource('hazards')
      || landResource.getReservedAmountForSource('hazardousBiomass')
      || 0;
    if (hazardReserved > 0) {
      const worldEffectLabel = landResource.worldEffectReservationLabel || getResourceUIText('land.worldEffects', 'World Effects');
      assignments.push([worldEffectLabel, hazardReserved]);
    }

    const keratiReserved = landResource.getReservedAmountForSource('keratiTerritory') || 0;
    if (keratiReserved > 0) {
      assignments.push([getResourceUIText('land.keratiTerritory', 'Kerati Territory'), keratiReserved]);
    }
  }
  assignments.sort((a, b) => b[1] - a[1]);

  let tableContainer = assignmentsDiv._tableContainer;
  if (!tableContainer) {
    tableContainer = document.createElement('div');
    assignmentsDiv.appendChild(tableContainer);
    assignmentsDiv._tableContainer = tableContainer;
  }
  updateAssignmentTable(tableContainer, assignments, (count) => formatNumber(count, false, 2));
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
  if (workers > 0) entries.push([getResourceUICommonText('workers', 'Workers'), workers]);
  androidAssignments.forEach(([name, count]) => entries.push([name, count]));
  let tableContainer = assignmentsDiv._tableContainer;
  if (!tableContainer) {
    tableContainer = document.createElement('div');
    assignmentsDiv.appendChild(tableContainer);
    assignmentsDiv._tableContainer = tableContainer;
  }
  updateAssignmentTable(tableContainer, entries);
}

function updateSpaceshipAssignments(assignmentsDiv) {
  const available = Math.floor(resources.special.spaceships.value || 0);
  const assignments = [];
  let assignedTotal = 0;
  const projects = Object.values(projectManager.projects || {});
  for (let index = 0; index < projects.length; index += 1) {
    const project = projects[index];
    if (!(project instanceof SpaceshipProject)) continue;
    const assigned = Math.floor(project.assignedSpaceships || 0);
    if (assigned <= 0) continue;
    assignments.push([project.displayName || project.name, assigned]);
    assignedTotal += assigned;
  }
  assignments.sort((a, b) => b[1] - a[1]);

  let totalDiv = assignmentsDiv._totalDiv;
  if (!totalDiv) {
    totalDiv = document.createElement('div');
    assignmentsDiv.appendChild(totalDiv);
    assignmentsDiv._totalDiv = totalDiv;
  }
  const totalText = getResourceUICommonText('totalValue', 'Total {value}', {
    value: formatNumber(available + assignedTotal, true),
  });
  if (totalDiv.textContent !== totalText) totalDiv.textContent = totalText;

  let unassignedDiv = assignmentsDiv._unassignedDiv;
  if (!unassignedDiv) {
    unassignedDiv = document.createElement('div');
    assignmentsDiv.appendChild(unassignedDiv);
    assignmentsDiv._unassignedDiv = unassignedDiv;
  }
  const unassignedText = getResourceUICommonText('unassignedValue', 'Unassigned {value}', {
    value: formatNumber(available, true),
  });
  if (unassignedDiv.textContent !== unassignedText) unassignedDiv.textContent = unassignedText;

  let tableContainer = assignmentsDiv._tableContainer;
  if (!tableContainer) {
    tableContainer = document.createElement('div');
    assignmentsDiv.appendChild(tableContainer);
    assignmentsDiv._tableContainer = tableContainer;
  }
  updateAssignmentTable(tableContainer, assignments);
}

function getAerostatLiftAlert() {
  const colonyCollection =
    typeof colonies !== 'undefined' ? colonies : globalThis.colonies;
  const aerostat = colonyCollection?.aerostat_colony;
  if (!aerostat) {
    return { severity: null, message: null, lift: null, active: 0 };
  }

  const active = Number.isFinite(aerostat?.activeNumber)
    ? aerostat.activeNumber
    : (typeof buildingCountToNumber === 'function'
      ? buildingCountToNumber(aerostat?.active)
      : Math.max(0, Math.floor(Number(aerostat?.active) || 0)));
  if (active <= 0) {
    return { severity: null, message: null, lift: null, active };
  }

  const lift =
    typeof aerostat.getCurrentLift === 'function'
      ? aerostat.getCurrentLift()
      : null;
  const pressure =
    typeof aerostat.getCurrentSurfacePressure === 'function'
      ? aerostat.getCurrentSurfacePressure()
      : null;
  const minPressure =
    typeof aerostat.getMinimumOperationalPressure === 'function'
      ? aerostat.getMinimumOperationalPressure()
      : 50;
  const minLift =
    typeof aerostat.getMinimumOperationalLift === 'function'
      ? aerostat.getMinimumOperationalLift()
      : 0.2;
  const poweredFlightActive =
    typeof aerostat.getPoweredFlightEnergyPerAerostat === 'function'
      ? aerostat.getPoweredFlightEnergyPerAerostat(lift, pressure) > 0
      : false;
  const warningLift = minLift + 0.1;

  if (!Number.isFinite(lift) && !Number.isFinite(pressure)) {
    return { severity: null, message: null, lift: null, active };
  }

  let severity = null;
  let message = null;

  if (Number.isFinite(pressure) && pressure < minPressure) {
    severity = 'critical';
    const pressureText = formatNumber(pressure, false, 1);
    message = getResourceUIWarningText(
      'aerostatPressureCritical',
      '▲ Active aerostats only have {pressure} kPa of surface pressure, below the {minimum} kPa minimum needed to stay buoyant. ▲',
      {
        pressure: pressureText,
        minimum: formatNumber(minPressure, false, 0),
      }
    );
  } else if (Number.isFinite(lift) && lift < minLift) {
    if (poweredFlightActive) {
      return { severity: null, message: null, lift, active };
    }
    severity = 'critical';
    const liftText = `${lift >= 0 ? '+' : ''}${formatNumber(lift, false, 3)}`;
    message = getResourceUIWarningText(
      'aerostatLiftCritical',
      '▲ Active aerostats only have {lift} kg/m³ of lift, below the {minimum} kg/m³ minimum needed to stay aloft. ▲',
      {
        lift: liftText,
        minimum: formatNumber(minLift, false, 2),
      }
    );
  } else if (Number.isFinite(lift) && lift < warningLift) {
    severity = 'warning';
    const liftText = `${lift >= 0 ? '+' : ''}${formatNumber(lift, false, 3)}`;
    message = getResourceUIWarningText(
      'aerostatLiftWarning',
      'Active aerostats only have {lift} kg/m³ of lift, below the {minimum} kg/m³ safety margin.',
      {
        lift: liftText,
        minimum: formatNumber(warningLift, false, 2),
      }
    );
  }

  return { severity, message, lift, active };
}

function getBiomassWarningMessage(zones) {
  const dyingZones = getZones().filter(zone => zones[zone]);
  if (dyingZones.length === 0) return '';
  const zoneText = dyingZones.map(zone => capitalizeFirstLetter(zone)).join(', ');
  return getResourceUIWarningText(
    'biomassDying',
    'Biomass is dying in the {zones} zone{s}.',
    { zones: zoneText, s: dyingZones.length > 1 ? 's' : '' }
  );
}

function createResourceElement(category, resourceObj, resourceName) {
  const domPrefix = getResourceDomPrefix(category, resourceName);
  const resourceElement = document.createElement('div');
  resourceElement.classList.add('resource-item');
  resourceElement.id = `${domPrefix}-container`;
  resourceElement.style.display = 'none'; // Initially hidden
  const showRate = !resourceObj.hideRate || resourceName === 'workers';

  if (resourceName === 'colonists') {
    // Special display for population (colonists) as an integer
    resourceElement.innerHTML = `
      <div class="resource-row ${!resourceObj.hasCap ? 'no-cap' : ''}">
        <div class="resource-name"><strong id="${domPrefix}-name">${resourceObj.displayName}</strong><span class="resource-autobuild-warning" id="${domPrefix}-autobuild-warning"></span><span class="resource-warning" id="${domPrefix}-warning"></span></div>
        <div class="resource-value" id="${domPrefix}-resources-container">${Math.floor(resourceObj.value)}</div>
        ${resourceObj.hasCap ? `
          <div class="resource-slash">/</div>
          <div class="resource-cap"><span id="${domPrefix}-cap-resources-container">${Math.floor(resourceObj.cap)}</span></div>
        ` : ''}
        ${showRate ? `<div class="resource-pps" id="${domPrefix}-pps-resources-container">+0/s</div>` : ''}
      </div>
    `;
    const tooltip = createTooltipElement(category, resourceName);
    resourceElement.appendChild(tooltip);
    if (typeof addTooltipHover === 'function') {
      addTooltipHover(resourceElement, tooltip);
    }
  } else if (category === 'underground' || resourceObj.name === 'land') {
    const availableAmount = resourceObj.getAvailableAmount
      ? resourceObj.getAvailableAmount()
      : (resourceObj.value - resourceObj.reserved);
    const undergroundRateMarkup = resourceObj.showUndergroundRate
      ? `<div class="resource-pps" id="${domPrefix}-pps-resources-container">+0/s</div>`
      : (showRate ? '<div class="resource-pps"></div>' : '');
    // Display for deposits
    resourceElement.innerHTML = `
      <div class="resource-row ${!resourceObj.hasCap ? 'no-cap' : ''}">
        <div class="resource-name"><strong id="${domPrefix}-name">${resourceObj.displayName}</strong><span class="resource-autobuild-warning" id="${domPrefix}-autobuild-warning"></span></div>
        <div class="resource-value" id="${domPrefix}-available-resources-container">${Math.floor(availableAmount)}</div>
        ${resourceObj.hasCap ? `
          <div class="resource-slash">/</div>
          <div class="resource-cap"><span id="${domPrefix}-total-resources-container">${Math.floor(resourceObj.value)}</span></div>
        ` : ''}
        ${undergroundRateMarkup}
      </div>
    `;
    if (resourceObj.name === 'land' || resourceObj.showUndergroundRate) {
      const tooltip = createTooltipElement(category, resourceName);
      resourceElement.appendChild(tooltip);
      if (typeof addTooltipHover === 'function') {
        addTooltipHover(resourceElement, tooltip);
      }
    }

    // Add scanning progress below deposits
    const scanningProgressElement = document.createElement('div');
    scanningProgressElement.id = `${domPrefix}-scanning-progress-resources-container`;
    scanningProgressElement.classList.add('scanning-progress');
    scanningProgressElement.style.display = 'none'; // Initially hidden
    resourceElement.appendChild(scanningProgressElement);
  } else {
    const includeCap = resourceObj.hasCap || category === 'spaceStorage';
    const capVisibleByDefault = resourceObj.hasCap;
    const capValueText = resourceObj.hasCap ? resourceObj.cap.toFixed(2) : '0';
    resourceElement.innerHTML = `
      <div class="resource-row ${!capVisibleByDefault ? 'no-cap' : ''}">
        <div class="resource-name"><strong id="${domPrefix}-name">${resourceObj.displayName}</strong><span class="resource-autobuild-warning" id="${domPrefix}-autobuild-warning"></span><span class="resource-warning" id="${domPrefix}-warning"></span></div>
        <div class="resource-value" id="${domPrefix}-resources-container">${resourceObj.value.toFixed(2)}</div>
        ${includeCap ? `
          <div class="resource-slash" id="${domPrefix}-slash-resources-container" style="${capVisibleByDefault ? '' : 'display:none;'}">/</div>
          <div class="resource-cap" id="${domPrefix}-cap-wrapper-resources-container" style="${capVisibleByDefault ? '' : 'display:none;'}"><span id="${domPrefix}-cap-resources-container">${capValueText}</span></div>
        ` : ''}
        ${showRate ? `<div class="resource-pps" id="${domPrefix}-pps-resources-container">+0/s</div>` : ''}
      </div>
    `;
    const tooltip = createTooltipElement(category, resourceName);
    resourceElement.appendChild(tooltip);
    if (typeof addTooltipHover === 'function') {
      addTooltipHover(resourceElement, tooltip);
    }
  }

  const dividerMarginTop = resourceObj.marginTop
    || (category === 'spaceStorage' && SPACE_STORAGE_DIVIDER_TOP_RESOURCES.has(resourceName)
      ? SPACE_STORAGE_DIVIDER_MARGIN
      : 0);
  if (dividerMarginTop) {
    resourceElement.style.marginTop = dividerMarginTop + 'px';
    resourceElement.style.setProperty('--divider-margin-top', dividerMarginTop + 'px');
    resourceElement.classList.add('resource-divider-top');
  }
  if (resourceObj.marginBottom) {
    resourceElement.style.marginBottom = resourceObj.marginBottom + 'px';
    resourceElement.style.setProperty('--divider-margin-bottom', resourceObj.marginBottom + 'px');
    resourceElement.classList.add('resource-divider-bottom');
  }

  return resourceElement;
}

function populateResourceElements(resources) {
  const categories = getResourceCategoriesForDisplay(resources);
  for (let i = 0; i < categories.length; i += 1) {
    const category = categories[i];
    if (!shouldRenderResourceCategory(category)) continue;
    const containerId = `${category}-resources-resources-container`;
    const container = document.getElementById(containerId);

    if (container) {
      if (category === 'spaceStorage') {
        ensureSpaceStorageTotalElement(container);
      }
      const resourceNames = getResourceNamesForDisplay(category, resources[category], resources);
      for (let i = 0; i < resourceNames.length; i += 1) {
        const resourceName = resourceNames[i];
        const resourceObj = getDisplayResourceObject(resources, category, resourceName);
        if (!resourceObj) continue;
        if (!document.getElementById(getResourceDomId(category, resourceName, 'container'))) {
          const resourceElement = createResourceElement(category, resourceObj, resourceName);
          container.appendChild(resourceElement);
        }
      }
      if (category === 'spaceStorage') {
        reorderSpaceStorageElements(container);
      }
    }
  }
}

function unlockResource(resource) {
  if (!shouldRenderResourceCategory(resource.category)) return;
  if (resource.unlocked && !document.getElementById(getResourceDomId(resource.category, resource.name, 'container'))) {
    const containerId = `${resource.category}-resources-resources-container`;
    const categoryContainer = document.getElementById(containerId).parentElement;
    const container = document.getElementById(containerId);

    if (container) {
      if (resource.category === 'spaceStorage') {
        ensureSpaceStorageTotalElement(container);
      }
      // Use helper function to create the resource element
      const resourceElement = createResourceElement(resource.category, resource, resource.name);
      container.appendChild(resourceElement);
      if (resource.category === 'spaceStorage') {
        reorderSpaceStorageElements(container);
      }

      // Ensure the category container is visible
      categoryContainer.style.display = 'block';

      // Update cache for this resource and its category
      resourceUICache.categories[resource.category] = resourceUICache.categories[resource.category] || { container: document.getElementById(containerId), header: document.getElementById(`${resource.category}-resources-header`) };
      cacheSingleResource(resource.category, resource.name);
    }
  }
}

function updateResourceDisplay(resources, deltaSeconds) {
  updateResourceViewToggleState(resources);
  const now = Date.now();
  const last = updateResourceDisplay.lastTimestamp;
  const elapsedSeconds = Number.isFinite(deltaSeconds) ? deltaSeconds : last ? (now - last) / 1000 : 0;
  const frameDelta = Math.max(0, Math.min(1, elapsedSeconds));
  updateResourceDisplay.lastTimestamp = now;
  const smallValueTimers = resourceUICache.smallValueTimers || (resourceUICache.smallValueTimers = {});

  const categories = getResourceCategoriesForDisplay(resources);
  for (let i = 0; i < categories.length; i += 1) {
    const category = categories[i];
    const cat = resourceUICache.categories[category] || cacheResourceCategory(category);
    const container = cat ? cat.container : null;
    const header = cat ? cat.header : null;
    const categoryContainer = container ? container.parentElement : null;
    if (!container || !categoryContainer) {
      continue;
    }
    if (!shouldRenderResourceCategory(category)) {
      categoryContainer.style.display = 'none';
      if (header) header.style.display = 'none';
      continue;
    }
    if (category === 'spaceStorage') {
      reorderSpaceStorageElements(container);
    }

    let hasUnlockedResources = false;
    let spaceStorageTotalEntry = null;
    let spaceStorageTotalCapLimited = false;
    let spaceStorageTotalHeadroom = 0;
    let spaceStorageTotalOpenPositiveRate = 0;
    if (category === 'spaceStorage') {
      spaceStorageTotalEntry = resourceUICache.spaceStorageTotal || cacheSpaceStorageTotalEntry();
      const storageProject = getSpaceStorageProjectForResourceUI();
      let usedStorage = 0;
      if (storageProject) {
        if (storageProject.reconcileUsedStorage) {
          storageProject.reconcileUsedStorage();
        }
        usedStorage = Math.max(0, storageProject.usedStorage || 0);
      } else {
        for (const resourceKey in resources.spaceStorage) {
          const stored = Number(resources.spaceStorage[resourceKey]?.value);
          usedStorage += Number.isFinite(stored) && stored > 0 ? stored : 0;
        }
      }
      const maxStorage = storageProject ? Math.max(0, storageProject.maxStorage || 0) : 0;
      spaceStorageTotalHeadroom = Math.max(0, maxStorage - usedStorage);
      if (spaceStorageTotalEntry?.valueEl) {
        spaceStorageTotalEntry.valueEl.textContent = formatNumber(usedStorage);
      }
      if (spaceStorageTotalEntry?.capEl) {
        spaceStorageTotalEntry.capEl.textContent = formatNumber(maxStorage);
      }
      setResourceCapLimited(spaceStorageTotalEntry, false);
    }

    const resourceNames = getResourceNamesForDisplay(category, resources[category], resources);
    for (let i = 0; i < resourceNames.length; i += 1) {
      const resourceName = resourceNames[i];
      const resourceObj = getDisplayResourceObject(resources, category, resourceName);
      if (!resourceObj) continue;
      const resourceKey = getResourceUIKey(category, resourceName);
      const entry = resourceUICache.resources[resourceKey] || cacheSingleResource(category, resourceName);
      const resourceElement = entry ? entry.container : null;
      const resourceNameElement = entry ? entry.nameEl : null;
      const autobuildWarningEl = entry ? entry.autobuildWarningEl : null;
      const allowRegularWarnings = category !== 'spaceStorage';
      if (category === 'spaceStorage' && resourceName !== 'energy') {
        updateSpaceStorageCapDisplay(entry, resourceName);
      }

      let timer = smallValueTimers[resourceKey] || 0;
      let showResource = resourceObj.unlocked;

      if (showResource) {
        const activityRate = (resourceObj.productionRate || 0) + (resourceObj.consumptionRate || 0);
        const isUndergroundDeposit = category === 'underground' && resourceName !== 'planetaryMass';
        const hideWhenSmall = resourceObj.hideWhenSmall || isUndergroundDeposit;
        const displayedAvailable = Math.floor(Math.max(0, resourceObj.getAvailableAmount ? resourceObj.getAvailableAmount() : (resourceObj.value - resourceObj.reserved)));
        const displayedTotal = Math.floor(Math.max(0, resourceObj.value));
        const isZeroDisplayDeposit = isUndergroundDeposit && displayedAvailable <= 0 && displayedTotal <= 0;
        const isSmall =
          hideWhenSmall &&
          (isZeroDisplayDeposit || (resourceObj.value < 1e-4 && activityRate < 1));
        if (isSmall) {
          if (isZeroDisplayDeposit) {
            timer = 0;
            showResource = false;
          } else {
            if (timer > 0) {
              timer = Math.max(0, timer - frameDelta);
            }
            showResource = timer > 0;
          }
        } else if (hideWhenSmall) {
          timer = 1;
        } else {
          timer = 0;
        }
      } else {
        timer = 0;
      }

      smallValueTimers[resourceKey] = timer;

      if (showResource) {
        hasUnlockedResources = true;
        if (resourceElement) resourceElement.style.display = 'block';
      } else {
        if (resourceElement) resourceElement.style.display = 'none';
      }

      if (category === 'spaceStorage' && resourceName !== 'energy') {
        const consumptionDisplay = getDisplayConsumptionRates(resourceObj);
        const netRate = resourceObj.productionRate - consumptionDisplay.total;
        const positiveRate = netRate > 1e-9;
        const capLimit = getSpaceStorageResourceCapDisplay(resourceName);
        const resourceCapRemaining = Number.isFinite(capLimit) ? (capLimit - resourceObj.value) : Infinity;
        const hasResourceHeadroom = !Number.isFinite(capLimit) || resourceCapRemaining > 0;
        if (resourceObj.unlocked && positiveRate && hasResourceHeadroom) {
          spaceStorageTotalOpenPositiveRate += netRate;
        }
      }

      if (resourceObj.isBooleanFlagSet('festival') && resourceNameElement) {
        resourceNameElement.classList.add('resource-festival');
      } else if (resourceNameElement) {
        resourceNameElement.classList.remove('resource-festival');
      }

      if (resourceNameElement && resourceNameElement.textContent !== resourceObj.displayName) {
        resourceNameElement.textContent = resourceObj.displayName;
      }

      if (autobuildWarningEl) {
        if (resourceObj.autobuildShortage) {
          if (autobuildWarningEl.textContent !== '!') autobuildWarningEl.textContent = '!';
          if (autobuildWarningEl.style.display !== 'inline') autobuildWarningEl.style.display = 'inline';
        } else {
          if (autobuildWarningEl.textContent !== '') autobuildWarningEl.textContent = '';
          if (autobuildWarningEl.style.display !== 'none') autobuildWarningEl.style.display = 'none';
        }
      }

      // Check if the resource has the "golden" flag set
      if (resourceObj.isBooleanFlagSet('golden') && resourceNameElement) {
        resourceNameElement.classList.add('sparkling-gold');
      } else if (resourceNameElement) {
        resourceNameElement.classList.remove('sparkling-gold');
      }

      let stormActive = false;
      try {
        stormActive = hazardManager.parameters.pulsar && hazardManager.pulsarHazard.isStormActive();
      } catch (error) {
        stormActive = false;
      }
      if (resourceNameElement && (resourceName === 'androids' || resourceName === 'electronics') && stormActive) {
        resourceNameElement.classList.add('resource-electromagnetic-storm');
      } else if (resourceNameElement) {
        resourceNameElement.classList.remove('resource-electromagnetic-storm');
      }

      if (allowRegularWarnings && resourceName === 'biomass' && entry.warningEl) {
        const zones = terraforming?.biomassDyingZones || {};
        const warningMessage = getBiomassWarningMessage(zones);
        const icon = warningMessage ? '⚠' : '';
        if (entry.warningEl.textContent !== icon) entry.warningEl.textContent = icon;
        if (entry.warningEl.title !== warningMessage) entry.warningEl.title = warningMessage;
      }

      if (allowRegularWarnings && resourceName === 'androids' && entry.warningEl) {
        const land = resources.surface?.land;
        const warn =
          resourceObj.cap &&
          resourceObj.value >= resourceObj.cap &&
          land &&
          land.value > 0 &&
          land.reserved / land.value < 0.99;
        const warningMessage = warn
          ? getResourceUIWarningText('androidCapReached', 'Android production has reached its current cap.')
          : '';
        const icon = warn ? '⚠' : '';
        if (entry.warningEl.textContent !== icon) entry.warningEl.textContent = icon;
        if (entry.warningEl.title !== warningMessage) entry.warningEl.title = warningMessage;
      }

      if (allowRegularWarnings && entry.warningEl && resourceName !== 'biomass' && resourceName !== 'androids' && resourceName !== 'colonists') {
        const limiter = lifeManager.biomassGrowthLimiters[resourceName];
        const limiterZones = limiter?.zones || [];
        const zoneText = limiterZones.length
          ? getResourceUIWarningText('scopeZones', ' in the {zones} zone{s}', {
            zones: limiterZones.map(capitalizeFirstLetter).join(', '),
            s: limiterZones.length > 1 ? 's' : '',
          })
          : '';
        const scopeSuffix = limiter?.scope === 'atmospheric'
          ? getResourceUIWarningText('scopeAtmosphere', ' across the atmosphere')
          : zoneText;
        const warningMessage = limiter
          ? getResourceUIWarningText('biomassLimited', 'Biomass growth is limited by {resource} availability{scope}.', {
            resource: resourceObj.displayName,
            scope: scopeSuffix,
          })
          : '';
        const icon = warningMessage ? '⚠' : '';
        if (entry.warningEl.textContent !== icon) entry.warningEl.textContent = icon;
        if (entry.warningEl.title !== warningMessage) entry.warningEl.title = warningMessage;
      }
      if (!allowRegularWarnings && entry.warningEl) {
        if (entry.warningEl.textContent !== '') entry.warningEl.textContent = '';
        if (entry.warningEl.title !== '') entry.warningEl.title = '';
        if (entry.warningEl.style.color) entry.warningEl.style.color = '';
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

        if (entry?.warningEl) {
          const { severity } = getAerostatLiftAlert();
          if (severity) {
            if (entry.warningEl.textContent !== '!') entry.warningEl.textContent = '!';
            const desiredColor = severity === 'critical' ? 'red' : 'orange';
            if (entry.warningEl.style.color !== desiredColor) entry.warningEl.style.color = desiredColor;
          } else {
            if (entry.warningEl.textContent !== '') entry.warningEl.textContent = '';
            if (entry.warningEl.style.color) entry.warningEl.style.color = '';
          }
        }

        updateResourceRateDisplay(resourceObj, frameDelta, category, resourceName);
      } else if (category === 'underground' || resourceObj.name === 'land') {
        // Update underground resources
        const availableElement = entry ? entry.availableEl : null;
        const totalElement = entry ? entry.totalEl : null;
        const scanningProgressElement = entry ? entry.scanEl : null;

        if (availableElement) {
          const available = resourceObj.getAvailableAmount ? resourceObj.getAvailableAmount() : (resourceObj.value - resourceObj.reserved);
          availableElement.textContent = formatNumber(Math.floor(available), true);
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
          scanningProgressElement.textContent = getResourceUICommonText('scanningProgress', 'Scanning Progress: {value}%', {
            value: (scanData.currentScanProgress * 100).toFixed(2),
          });
        } else if (scanningProgressElement) {
          scanningProgressElement.style.display = 'none'; // Hide progress element if scanning inactive
        }
        if (resourceObj.name === 'land' || resourceObj.showUndergroundRate) {
          updateResourceRateDisplay(resourceObj, frameDelta, category, resourceName);
        }
      } else {
        // Update other resources
        const valEl = entry ? entry.valueEl : null;
        if (valEl) {
          valEl.textContent = formatNumber(resourceObj.value);
        }
      
        const capElement = entry ? entry.capEl : null;
        if (capElement && (category !== 'spaceStorage' || resourceName === 'energy')) {
          capElement.textContent = formatNumber(resourceObj.cap);
        }
      
        updateResourceRateDisplay(resourceObj, frameDelta, category, resourceName);
      }
    }

    // Reveal the category header if any resources in the category are unlocked
    if (category === 'spaceStorage') {
      const totalCapLimitedNow = spaceStorageTotalOpenPositiveRate > spaceStorageTotalHeadroom;
      spaceStorageTotalCapLimited = shouldShowCapLimitedWithCooldown('spaceStorage:total', totalCapLimitedNow, frameDelta);
    }
    if (category === 'spaceStorage' && spaceStorageTotalEntry?.container) {
      spaceStorageTotalEntry.container.style.display = hasUnlockedResources ? 'block' : 'none';
      setResourceCapLimited(spaceStorageTotalEntry, hasUnlockedResources && spaceStorageTotalCapLimited);
    }
    if (hasUnlockedResources) {
      categoryContainer.style.display = 'block'; // Show category container
      if (header) header.style.display = 'block'; // Show header
    } else {
      categoryContainer.style.display = 'none'; // Hide category container
      if (header) header.style.display = 'none'; // Hide header
    }
  }
}

function getDisplayConsumptionRates(resource) {
  const baseBySource = resource.consumptionRateBySource || {};
  let total = resource.consumptionRate;
  const adjustedBySource = { ...baseBySource };

  for (const name in buildings) {
    const building = buildings[name];
    if (!building.displayConsumptionAtMaxProductivity) {
      continue;
    }
    const { amount, ignoreProductivity } = building.getConsumptionResource(resource.category, resource.name);
    if (amount <= 0 || building.active <= 0n) {
      continue;
    }
    const baseRate = building.activeNumber * amount * building.getEffectiveConsumptionMultiplier() * building.getEffectiveResourceConsumptionMultiplier(resource.category, resource.name);
    const sourceName = building.displayName || name;
    const current = adjustedBySource[sourceName] || 0;
    const displayFactor = building.ignoreResourceForProductivityResourceDisplay
      ? building.displayProductivity
      : 1;
    const displayRate = ignoreProductivity ? current : baseRate * displayFactor;
    if (displayRate !== current) {
      adjustedBySource[sourceName] = displayRate;
      total += displayRate - current;
    }
  }

  return { total, bySource: adjustedBySource };
}

function updateResourceRateDisplay(resource, frameDelta = 0, displayCategory = resource.category, displayName = resource.name){
  const resourceKey = getResourceUIKey(displayCategory, displayName);
  const entry = resourceUICache.resources[resourceKey] || cacheSingleResource(displayCategory, displayName);
  const ppsElement = entry ? entry.ppsEl : document.getElementById(getResourceDomId(displayCategory, displayName, 'pps-resources-container'));
  const showRate = !resource.hideRate || resource.name === 'workers';
  if (!showRate) {
    if (ppsElement) {
      ppsElement.remove();
    }
  } else if (ppsElement) {
    if (resource.name === 'workers') {
      const cap = resource.cap || 0;
      const freePercent = cap > 0 ? (resource.value / cap) * 100 : 0;
      ppsElement.textContent = `${freePercent >= 0 ? '+' : ''}${formatNumber(freePercent, false, 2)}%`;
      ppsElement.style.color = swapResourceRateColor(resource, '');
    } else {
      const elapsed = Math.max(0, Math.min(1, Number.isFinite(frameDelta) ? frameDelta : 0));
      const consumptionDisplay = getDisplayConsumptionRates(resource);
      const netRate = resource.productionRate - consumptionDisplay.total;

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

      let baseUnstable = false;
      const history = resource.rateHistory || [];
      if (history.length >= 10) {
        // Count weighted sign changes: crossing to/from zero is half, direct +/- flip is full.
        let signChanges = 0;
        for (let i = 1; i < history.length; i++) {
          const current = history[i];
          const previous = history[i - 1];
          const currentSign = current > 0 ? 1 : (current < 0 ? -1 : 0);
          const previousSign = previous > 0 ? 1 : (previous < 0 ? -1 : 0);
          if (currentSign === previousSign) continue;
          if (currentSign === 0 || previousSign === 0) {
            signChanges += 0.5;
          } else {
            signChanges += 1;
          }
        }
        if (signChanges > 1) {
          baseUnstable = true;
        }
      }

      const unstableTimers = resourceUICache.unstableTimers || (resourceUICache.unstableTimers = {});
      let timer = unstableTimers[resourceKey] || 0;
      if (baseUnstable) {
        timer = 0.5;
      } else if (timer > 0) {
        timer = Math.max(0, timer - elapsed);
      }
      unstableTimers[resourceKey] = timer;

      if (baseUnstable || timer > 0) {
        ppsElement.textContent = getResourceUICommonText('unstable', 'Unstable');
        ppsElement.style.color = '';
      } else {
        if (Math.abs(netRate) < 1e-3) {
          ppsElement.textContent = `0`;
        } else {
          ppsElement.textContent = `${netRate >= 0 ? '+' : ''}${formatNumber(netRate, false, 2)}`;
        }
        let ppsColor = '';
        if (netRate < 0 && Math.abs(netRate) > resource.value) {
          ppsColor = 'red';
        } else if (netRate < 0 && Math.abs(netRate) > resource.value / 120) {
          ppsColor = 'orange';
        }
        ppsElement.style.color = swapResourceRateColor(resource, ppsColor);
      }
    }
  }

  const tooltipElement = entry?.tooltip?.root || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip'));
  if (!tooltipElement || !tooltipElement._isActive) return;

  const valueDiv = entry?.tooltip?.valueDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-value'));
  const timeDiv = entry?.tooltip?.timeDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-time'));
  const assignmentsDiv = entry?.tooltip?.assignmentsDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-assignments'));
  const zonesDiv = entry?.tooltip?.zonesDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-zones'));
  const netDiv = entry?.tooltip?.netDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-net'));
  const limitDiv = entry?.tooltip?.limitDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-limit'));
  const productionDiv = entry?.tooltip?.productionDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-production'));
  const consumptionDiv = entry?.tooltip?.consumptionDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-consumption'));
  const overflowDiv = entry?.tooltip?.overflowDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-overflow'));
  const autobuildDiv = entry?.tooltip?.autobuildDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-autobuild'));
  const warningDiv = entry?.tooltip?.warningDiv || document.getElementById(getResourceDomId(displayCategory, displayName, 'tooltip-warning'));

  const consumptionDisplay = getDisplayConsumptionRates(resource);
  const netRate = resource.productionRate - consumptionDisplay.total;

  if (valueDiv) {
    if (resource.name === 'land') {
      let avail = valueDiv._avail;
      let used = valueDiv._used;
      let hazard = valueDiv._hazard;
      if (!avail || !used) {
        clearElement(valueDiv);
        avail = document.createElement('div');
        valueDiv.appendChild(avail);
        used = document.createElement('div');
        valueDiv.appendChild(used);
        hazard = document.createElement('div');
        valueDiv.appendChild(hazard);
        valueDiv._avail = avail;
        valueDiv._used = used;
        valueDiv._hazard = hazard;
      } else if (!hazard) {
        hazard = document.createElement('div');
        valueDiv.appendChild(hazard);
        valueDiv._hazard = hazard;
      }
      const availableAmount = resource.getAvailableAmount ? resource.getAvailableAmount() : (resource.value - resource.reserved);
      const availText = getResourceUIText('land.available', 'Available {value}', {
        value: formatNumber(availableAmount, false, 3),
      });
      const usedText = getResourceUIText('land.used', 'Used {value}', {
        value: formatNumber(resource.reserved, false, 3),
      });
      if (avail.textContent !== availText) avail.textContent = availText;
      if (used.textContent !== usedText) used.textContent = usedText;
      if (hazard.textContent !== '') hazard.textContent = '';
      hazard.style.display = 'none';
    } else if (resource.name === 'planetaryMass' && resource.category === 'underground') {
      let planetaryDiv = valueDiv._planetary;
      let worldshellDiv = valueDiv._worldshell;
      let breathingWorldDiv = valueDiv._breathingWorld;
      if (!planetaryDiv || !worldshellDiv || !breathingWorldDiv) {
        clearElement(valueDiv);
        planetaryDiv = document.createElement('div');
        worldshellDiv = document.createElement('div');
        breathingWorldDiv = document.createElement('div');
        valueDiv.appendChild(planetaryDiv);
        valueDiv.appendChild(worldshellDiv);
        valueDiv.appendChild(breathingWorldDiv);
        valueDiv._planetary = planetaryDiv;
        valueDiv._worldshell = worldshellDiv;
        valueDiv._breathingWorld = breathingWorldDiv;
      }
      const unitSuffix = resource.unit ? ` ${resource.unit}` : '';
      const planetaryText = getResourceUIText('planetaryMass.planetary', 'Planetary Mass {value}{unit}', {
        value: formatNumber(resource.value, false, 3),
        unit: unitSuffix,
      });
      const surfaceMassTons = (terraforming?.celestialParameters?.currentSurfaceMassKg || 0) / 1000;
      const atmosphericMassTons = (terraforming?.celestialParameters?.currentAtmosphericMassKg || 0) / 1000;
      const worldshellText = getResourceUIText('planetaryMass.worldshell', 'Worldshell Mass {value}{unit}', {
        value: formatNumber(resource.value + surfaceMassTons, false, 3),
        unit: unitSuffix,
      });
      const breathingWorldText = getResourceUIText('planetaryMass.breathingWorld', 'Breathing World Mass {value}{unit}', {
        value: formatNumber(resource.value + surfaceMassTons + atmosphericMassTons, false, 3),
        unit: unitSuffix,
      });
      if (planetaryDiv.textContent !== planetaryText) planetaryDiv.textContent = planetaryText;
      if (worldshellDiv.textContent !== worldshellText) worldshellDiv.textContent = worldshellText;
      if (breathingWorldDiv.textContent !== breathingWorldText) breathingWorldDiv.textContent = breathingWorldText;
    } else {
      const text = getResourceUICommonText('valueWithUnit', 'Value {value}{unit}', {
        value: formatNumber(resource.value, false, 3),
        unit: resource.unit ? ` ${resource.unit}` : '',
      });
      if (valueDiv.textContent !== text) valueDiv.textContent = text;
    }
  }

  if (timeDiv) {
    if (resource.name !== 'land') {
      let showDefaultTime = true;
      const unstableTimer = resourceUICache.unstableTimers[resourceKey] || 0;
      const rateUnstable = unstableTimer > 0;
      const liquidTarget = resource.category === 'surface'
        ? terraforming.liquidCoverageTargets.find((entry) => entry.coverageKey === resource.name)
        : null;
      if (liquidTarget) {
        const targetAmount = getLiquidCoverageTargetAmount(terraforming, liquidTarget.coverageKey, liquidTarget.coverageTarget);
        const label = resource.displayName || resource.name;
        const isAtMost = liquidTarget.comparison === 'atMost';
        if (!isAtMost && netRate > 0) {
          const remaining = targetAmount - resource.value;
          if (remaining > 0) {
            const time = remaining / netRate;
            timeDiv.textContent = getResourceUICommonText('timeToTarget', 'Time to {label} terraforming target: {value}', {
              label,
              value: formatDuration(Math.max(time, 0)),
            });
          } else {
            timeDiv.textContent = getResourceUICommonText('targetReached', '{label} terraforming target reached.', { label });
          }
          showDefaultTime = false;
        } else if (isAtMost && netRate < 0) {
          const remaining = resource.value - targetAmount;
          if (remaining > 0) {
            const time = remaining / Math.abs(netRate);
            timeDiv.textContent = getResourceUICommonText('timeToTarget', 'Time to {label} terraforming target: {value}', {
              label,
              value: formatDuration(Math.max(time, 0)),
            });
          } else {
            timeDiv.textContent = getResourceUICommonText('targetReached', '{label} terraforming target reached.', { label });
          }
          showDefaultTime = false;
        } else if (isAtMost && resource.value <= targetAmount) {
          timeDiv.textContent = getResourceUICommonText('targetReached', '{label} terraforming target reached.', { label });
          showDefaultTime = false;
        }
      }
      if (showDefaultTime && resource.category === 'atmospheric' && netRate > 0) {
        const target = terraforming.gasTargets[resource.name] || { min: 0, max: 0 };
        if (target.min > 0) {
          const currentPressurePa = calculateAtmosphericPressure(
            resource.value || 0,
            terraforming.celestialParameters.gravity,
            terraforming.celestialParameters.radius
          );
          if (currentPressurePa < target.min) {
            const targetMass = (target.min * terraforming.celestialParameters.surfaceArea)
              / (terraforming.celestialParameters.gravity * 1000);
            const remaining = targetMass - resource.value;
            if (remaining > 0) {
              const time = remaining / netRate;
              timeDiv.textContent = getResourceUICommonText('timeToTargetPressure', 'Time to target pressure: {value}', {
                value: formatDuration(Math.max(time, 0)),
              });
            } else {
              timeDiv.textContent = getResourceUICommonText('terraformingTargetReached', 'Terraforming target reached.');
            }
            showDefaultTime = false;
          }
        }
      }
      if (showDefaultTime) {
        const capForTime = getTooltipTimeCapForResource(resource);
        if (rateUnstable && netRate > 0 && Number.isFinite(capForTime)) {
          timeDiv.textContent = getResourceUICommonText('timeToFullUnstable', 'Time to full: unstable.');
        } else if (netRate > 0 && Number.isFinite(capForTime)) {
          const remaining = Math.max(capForTime - resource.value, 0);
          const time = remaining / netRate;
          timeDiv.textContent = getResourceUICommonText('timeToFull', 'Time to full: {value}', {
            value: formatDuration(Math.max(time, 0)),
          });
        } else if (netRate > 0 && resource.category === 'spaceStorage') {
          timeDiv.textContent = getResourceUICommonText('timeToFullNoCap', 'Time to full: no cap set.');
        } else if (netRate < 0) {
          const time = resource.value / Math.abs(netRate);
          const wholeSeconds = Math.max(time, 0);
          timeDiv.textContent = getResourceUICommonText('timeToEmpty', 'Time to empty: {value}', {
            value: formatResourceTimeToEmpty(wholeSeconds),
          });
        } else {
          timeDiv.innerHTML = '&nbsp;';
        }
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
    } else if (resource.name === 'spaceships') {
      updateSpaceshipAssignments(assignmentsDiv);
    } else {
      clearElement(assignmentsDiv);
    }
  }

  if (warningDiv) {
    const warningInfo = warningDiv._info || {};
    const warningMessages = [];
    const allowRegularWarnings = resource.category !== 'spaceStorage';

    if (resource.autobuildShortage) {
      warningMessages.push(getResourceUIWarningText('autobuildShortage', 'Autobuild is short on required inputs for queued construction.'));
    }

    if (allowRegularWarnings && resource.name === 'androids') {
      let androidCapped = false;
      if (resource.cap && resource.value >= resource.cap) {
        if (typeof resources !== 'undefined') {
          const land = resources.surface?.land;
          androidCapped = !!(land && land.value > 0 && land.reserved / land.value < 0.99);
        } else {
          androidCapped = true;
        }
      }
      if (androidCapped) {
        warningMessages.push(getResourceUIWarningText('androidCapReached', 'Android production has reached its current cap.'));
      }
    }

    const limiter = allowRegularWarnings ? lifeManager?.biomassGrowthLimiters?.[resource.name] : null;
    if (limiter) {
      const limiterZones = limiter.zones || [];
      const zoneText = limiterZones.length
        ? getResourceUIWarningText('scopeZones', ' in the {zones} zone{s}', {
          zones: limiterZones.map(capitalizeFirstLetter).join(', '),
          s: limiterZones.length > 1 ? 's' : '',
        })
        : '';
      const scopeSuffix = limiter.scope === 'atmospheric'
        ? getResourceUIWarningText('scopeAtmosphere', ' across the atmosphere')
        : zoneText;
      warningMessages.push(getResourceUIWarningText('biomassLimited', 'Biomass growth is limited by {resource} availability{scope}.', {
        resource: resource.displayName,
        scope: scopeSuffix,
      }));
    }

    if (allowRegularWarnings && resource.category === 'atmospheric' && resource.name === 'hydrogen') {
      const gravityThreshold = (globalThis.HYDROGEN_ESCAPE_GRAVITY_THRESHOLD || 0);
      const atomicMultiplier = globalThis.HYDROGEN_ATOMIC_HALF_LIFE_MULTIPLIER || 1;
      const atomicSpeedup = Math.round(1 / atomicMultiplier);
      const photodissociationFraction = Math.round(
        (globalThis.HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION || 0) * 100
      );
      let hydrogenMessage = getResourceUIWarningText('hydrogenIntro', 'Hydrogen slowly escapes to space depending on solar flux and gravity.');
      hydrogenMessage += ` ${getResourceUIWarningText('hydrogenPhoto', 'Stellar UV can photodissociate up to {percent}% of that gas, creating atoms that escape about {speed}x faster than molecules.', {
        percent: photodissociationFraction,
        speed: formatNumber(atomicSpeedup, false, 0),
      })}`;

      const gravity = globalThis.terraforming?.celestialParameters?.gravity;
      if (Number.isFinite(gravity)) {
        const relationText = gravity < gravityThreshold
          ? getResourceUIWarningText('hydrogenGravityDecay', ', so expect ongoing decay.')
          : getResourceUIWarningText('hydrogenGravityRetain', ', so the atmosphere can retain hydrogen.');
        hydrogenMessage += ` ${getResourceUIWarningText('hydrogenGravityLine', 'Current gravity is {value} m/s²{relation}', {
          value: formatNumber(gravity, false, 2),
          relation: relationText,
        })}`;
      }

      const solarFlux = globalThis.terraforming?.luminosity?.solarFlux;
      const referenceFlux = globalThis.HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX || 0;
      if (Number.isFinite(solarFlux)) {
        const fluxText = solarFlux > referenceFlux
          ? getResourceUIWarningText('hydrogenFluxFast', 'accelerating the photodissociation that feeds this loss')
          : getResourceUIWarningText('hydrogenFluxSlow', 'keeping most hydrogen molecular and slowing the loss');
        hydrogenMessage += ` ${getResourceUIWarningText('hydrogenFluxLine', 'Solar flux is {value} W/m², {relation}.', {
          value: formatNumber(solarFlux, false, 0),
          relation: fluxText,
        })}`;
      }

      warningMessages.push(hydrogenMessage);
    }

    if (allowRegularWarnings && resource.name === 'biomass') {
      const zones = terraforming?.biomassDyingZones || {};
      const biomassWarning = getBiomassWarningMessage(zones);
      if (biomassWarning) warningMessages.push(biomassWarning);
    }

    if (allowRegularWarnings && resource.name === 'colonists') {
      const { severity, message } = getAerostatLiftAlert();
      if (severity && message) {
        warningMessages.push(message);
      }
    }

    const warningTimers = resourceUICache.warningTimers || (resourceUICache.warningTimers = {});
    const warningTextCache = resourceUICache.warningTextCache || (resourceUICache.warningTextCache = {});
    let warningTimer = warningTimers[resourceKey] || 0;
    let cachedText = warningTextCache[resourceKey] || { text: '', title: '' };
    if (warningMessages.length > 0) {
      warningTimer = 1;
      cachedText = { text: warningMessages.join(' '), title: warningMessages.join('\n') };
      warningTextCache[resourceKey] = cachedText;
    } else if (warningTimer > 0) {
      warningTimer = Math.max(0, warningTimer - frameDelta);
    }
    warningTimers[resourceKey] = warningTimer;

    if (warningMessages.length > 0 || warningTimer > 0) {
      const joinedText = warningMessages.length > 0 ? warningMessages.join(' ') : cachedText.text;
      const joinedTitle = warningMessages.length > 0 ? warningMessages.join('\n') : cachedText.title;
      if (warningDiv.style.display !== 'flex') warningDiv.style.display = 'flex';
      if (warningInfo.text && warningInfo.text.textContent !== joinedText) {
        warningInfo.text.textContent = joinedText;
      }
      const showTooltipIcon = joinedTitle !== joinedText;
      if (warningInfo.icon) {
        warningInfo.icon.style.display = showTooltipIcon ? 'inline-flex' : 'none';
      }
      if (warningInfo.tooltip) {
        setTooltipText(warningInfo.tooltip, showTooltipIcon ? joinedTitle : '', warningInfo.tooltipCache, 'text');
      }
    } else {
      if (warningInfo.text && warningInfo.text.textContent !== '') warningInfo.text.textContent = '';
      if (warningInfo.tooltip) setTooltipText(warningInfo.tooltip, '', warningInfo.tooltipCache, 'text');
      if (warningInfo.icon) warningInfo.icon.style.display = 'none';
      if (warningDiv.style.display !== 'none') warningDiv.style.display = 'none';
    }
  }

  if (zonesDiv && resource.category !== 'spaceStorage' && typeof terraforming !== 'undefined') {
    const zoneValues = {};
    const zoneBuried = {};
    getZones().forEach(zone => {
      let val;
      switch (resource.name) {
        case 'liquidWater':
          val = terraforming.zonalSurface?.[zone]?.liquidWater;
          break;
        case 'ice': {
          const iceObj = terraforming.zonalSurface?.[zone];
          if (iceObj) {
            val = (iceObj.ice || 0);
            zoneBuried[zone] = iceObj.buriedIce || 0;
          }
          break;
        }
        case 'dryIce':
          val = terraforming.zonalSurface?.[zone]?.dryIce;
          break;
        case 'liquidHydrogen':
          val = terraforming.zonalSurface?.[zone]?.liquidHydrogen;
          break;
        case 'biomass':
          val = terraforming.zonalSurface?.[zone]?.biomass;
          break;
        case 'hazardousBiomass':
          val = terraforming.zonalSurface?.[zone]?.hazardousBiomass;
          break;
        case 'liquidMethane':
          val = terraforming.zonalSurface?.[zone]?.liquidMethane;
          break;
        case 'hydrocarbonIce': {
          const obj = terraforming.zonalSurface?.[zone];
          if (obj) {
            val = (obj.hydrocarbonIce || 0);
            zoneBuried[zone] = obj.buriedHydrocarbonIce || 0;
          }
          break;
        }
        case 'fineSand':
          val = terraforming.zonalSurface?.[zone]?.fineSand;
          break;
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
      getZones().forEach(zone => {
        const line = info.lines.get(zone);
        if (zoneValues[zone] !== undefined) {
          let text = getResourceUICommonText('zoneAmount', '{zone}: {value}', {
            zone: capitalizeFirstLetter(zone),
            value: formatNumber(zoneValues[zone], false, 3),
          });
          if (resource.name === 'ice' || resource.name === 'hydrocarbonIce') {
            const buried = zoneBuried[zone] || 0;
            text = getResourceUICommonText('zoneAmountSurfaceBuried', '{zone}: {surface} / {buried} (surface/buried)', {
              zone: capitalizeFirstLetter(zone),
              surface: formatNumber(zoneValues[zone], false, 3),
              buried: formatNumber(buried, false, 3),
            });
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
  const autobuildAvg = (typeof autobuildCostTracker !== 'undefined' && isAutobuildTrackedResource(resource))
    ? autobuildCostTracker.getAverageCost(resource.category, resource.name)
    : 0;
  if (netDiv) {
    const autoLine = netDiv._lineAuto || netDiv.firstChild;
    const baseLine = netDiv._lineBase || netDiv.lastChild;
    const netRateWithAutobuild = netRate - autobuildAvg;
    const displayNetRate = Math.abs(netRateWithAutobuild) < 1e-6 ? 0 : netRateWithAutobuild;
    const baseText = `${formatNumber(displayNetRate, false, 2)}${resource.unit ? ' ' + resource.unit : ''}/s`;
    const autoText = isAutobuildTrackedResource(resource)
      ? getResourceUICommonText('netIncludingAutobuild', 'Net Change (including autobuild):')
      : '';
    if (autoLine && autoLine.textContent !== autoText) autoLine.textContent = autoText;
    if (baseLine && baseLine.textContent !== baseText) baseLine.textContent = baseText;
  }

  if (limitDiv) {
    if (resource.automationLimited) {
      const text = getResourceUICommonText('importsLimited', 'Imports are being limited by automation settings');
      if (limitDiv.textContent !== text) limitDiv.textContent = text;
      if (limitDiv.style.display !== 'block') limitDiv.style.display = 'block';
    } else {
      if (limitDiv.textContent !== '') limitDiv.textContent = '';
      if (limitDiv.style.display !== 'none') limitDiv.style.display = 'none';
    }
  }

  if (productionDiv) {
    const productionEntries = Object.entries(resource.productionRateBySource)
      .filter(([source, rate]) => rate !== 0 && source !== 'Overflow' && source !== 'Overflow (not summed)');
    const showProduction = updateRateTableWithCooldown(
      productionDiv,
      productionEntries,
      r => `${formatNumber(r, false, 2)}/s`,
      frameDelta
    );
    productionDiv.style.display = showProduction ? 'block' : 'none';
  }

  if (consumptionDiv) {
    const consumptionEntries = Object.entries(consumptionDisplay.bySource)
      .filter(([source, rate]) => rate !== 0 && source !== 'Overflow (not summed)');
    const showConsumption = updateRateTableWithCooldown(
      consumptionDiv,
      consumptionEntries,
      r => `${formatNumber(r, false, 2)}/s`,
      frameDelta
    );
    consumptionDiv.style.display = showConsumption ? 'block' : 'none';
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
    if (typeof autobuildCostTracker !== 'undefined' && isAutobuildTrackedResource(resource)) {
      const avgCost = autobuildAvg;
      const shortageBuildings = resource.autobuildShortageBuildings;
      if (avgCost !== 0 || shortageBuildings) {
        autobuildDiv.style.display = 'block';
        autobuildDiv._info.value.textContent = `${formatNumber(avgCost, false, 2)}${resource.unit ? ' ' + resource.unit : ''}/s`;
        const breakdown = autobuildCostTracker.getAverageCostBreakdown(resource.category, resource.name);
        updateAutobuildRateTable(
          autobuildDiv,
          breakdown,
          shortageBuildings,
          cost => `${formatNumber(cost, false, 2)}/s`
        );
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
  invalidateResourceUICache();
  createResourceContainers(resources);
  populateResourceElements(resources);
  // Build cache after first render for faster updates
  cacheResourceElements(resources);
  updateResourceViewToggleState(resources);
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// -------------------- DOM cache for Resource UI -------------------- //

const resourceUICache = {
  categories: {}, // { [category]: { container, header } }
  resources: {},  // { [resourceName]: { container, nameEl, autobuildWarningEl, warningEl, valueEl, capEl, ppsEl, availableEl, totalEl, scanEl, tooltip: {...} } }
  spaceStorageTotal: null,
  capLimitTimers: {},
  smallValueTimers: {},
  unstableTimers: {},
  warningTimers: {},
  warningTextCache: {},
  viewToggles: {},
};

function cacheResourceCategory(category) {
  const containerId = `${category}-resources-resources-container`;
  const container = document.getElementById(containerId);
  const header = document.getElementById(`${category}-resources-header`);
  resourceUICache.categories[category] = { container, header };
  return resourceUICache.categories[category];
}

function cacheSingleResource(category, resourceName) {
  const domPrefix = getResourceDomPrefix(category, resourceName);
  const entry = {
    container: document.getElementById(`${domPrefix}-container`),
    rowEl: document.querySelector(`#${domPrefix}-container .resource-row`),
    nameEl: document.getElementById(`${domPrefix}-name`),
    autobuildWarningEl: document.getElementById(`${domPrefix}-autobuild-warning`),
    warningEl: document.getElementById(`${domPrefix}-warning`),
    valueEl: document.getElementById(`${domPrefix}-resources-container`),
    slashEl: document.getElementById(`${domPrefix}-slash-resources-container`),
    capWrapperEl: document.getElementById(`${domPrefix}-cap-wrapper-resources-container`),
    capEl: document.getElementById(`${domPrefix}-cap-resources-container`),
    ppsEl: document.getElementById(`${domPrefix}-pps-resources-container`),
    availableEl: document.getElementById(`${domPrefix}-available-resources-container`),
    totalEl: document.getElementById(`${domPrefix}-total-resources-container`),
    scanEl: document.getElementById(`${domPrefix}-scanning-progress-resources-container`),
    tooltip: {
      root: document.getElementById(`${domPrefix}-tooltip`),
      valueDiv: document.getElementById(`${domPrefix}-tooltip-value`),
      timeDiv: document.getElementById(`${domPrefix}-tooltip-time`),
      assignmentsDiv: document.getElementById(`${domPrefix}-tooltip-assignments`),
      zonesDiv: document.getElementById(`${domPrefix}-tooltip-zones`),
      netDiv: document.getElementById(`${domPrefix}-tooltip-net`),
      limitDiv: document.getElementById(`${domPrefix}-tooltip-limit`),
      productionDiv: document.getElementById(`${domPrefix}-tooltip-production`),
      consumptionDiv: document.getElementById(`${domPrefix}-tooltip-consumption`),
      overflowDiv: document.getElementById(`${domPrefix}-tooltip-overflow`),
      autobuildDiv: document.getElementById(`${domPrefix}-tooltip-autobuild`),
      warningDiv: document.getElementById(`${domPrefix}-tooltip-warning`),
    }
  };
  resourceUICache.resources[getResourceUIKey(category, resourceName)] = entry;
  return entry;
}

function cacheResourceElements(resources) {
  if (typeof document === 'undefined') return;
  const categories = getResourceCategoriesForDisplay(resources);
  for (let i = 0; i < categories.length; i += 1) {
    const category = categories[i];
    if (!shouldRenderResourceCategory(category)) continue;
    cacheResourceCategory(category);
    if (category === 'spaceStorage') {
      cacheSpaceStorageTotalEntry();
    }
    const resourceNames = getResourceNamesForDisplay(category, resources[category], resources);
    for (let i = 0; i < resourceNames.length; i += 1) {
      const resourceName = resourceNames[i];
      cacheSingleResource(category, resourceName);
    }
  }
}

function invalidateResourceUICache() {
  resourceUICache.categories = {};
  resourceUICache.resources = {};
  resourceUICache.spaceStorageTotal = null;
  resourceUICache.capLimitTimers = {};
  resourceUICache.smallValueTimers = {};
  resourceUICache.unstableTimers = {};
  resourceUICache.warningTimers = {};
  resourceUICache.warningTextCache = {};
  resourceUICache.viewToggles = {};
  updateResourceDisplay.lastTimestamp = undefined;
}

try {
  module.exports = { getDisplayConsumptionRates, updateSpaceshipAssignments };
} catch (err) {
  // Browser environment: no module exports.
}
