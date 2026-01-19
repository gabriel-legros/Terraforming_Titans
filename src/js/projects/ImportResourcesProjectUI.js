class ImportResourcesProjectUI {
  constructor({
    getProjectElements,
    getOrCreateCategoryContainer,
    moveProject,
    toggleProjectCollapse,
    updateProjectUI,
  } = {}) {
    this.projectNames = [
      'oreSpaceMining',
      'siliconSpaceMining',
      'carbonSpaceMining',
      'waterSpaceMining',
      'nitrogenSpaceMining',
      'hydrogenSpaceMining',
    ];
    this.projectSet = new Set(this.projectNames);
    this.getProjectElements = typeof getProjectElements === 'function'
      ? getProjectElements
      : (() => (typeof projectElements !== 'undefined' ? projectElements : {}));
    this.getOrCreateCategoryContainer = getOrCreateCategoryContainer;
    this.moveProject = moveProject;
    this.toggleProjectCollapse = toggleProjectCollapse;
    this.updateProjectUI = updateProjectUI;

    this.headerProjectName = this.projectNames[0];
    this.multiplier = 1;
    this.rows = {};
    this.card = null;
    this.cardBody = null;
    this.table = null;
    this.availableDisplay = null;
    this.costPerShipmentDisplay = null;
    this.capSection = null;
    this.capToggle = null;
    this.capArrow = null;
    this.capText = null;
    this.capElements = null;
    this.capExpanded = false;
    this.multiplierButtons = { decrease: null, increase: null };
    this.collapseArrow = null;
    this.upButton = null;
    this.downButton = null;
    this.kesslerWarning = null;
    this.kesslerWarningText = null;
  }

  reset() {
    this.headerProjectName = this.projectNames[0];
    this.multiplier = 1;
    this.rows = {};
    this.card = null;
    this.cardBody = null;
    this.table = null;
    this.availableDisplay = null;
    this.costPerShipmentDisplay = null;
    this.capSection = null;
    this.capToggle = null;
    this.capArrow = null;
    this.capText = null;
    this.capElements = null;
    this.capExpanded = false;
    this.multiplierButtons = { decrease: null, increase: null };
    this.collapseArrow = null;
    this.upButton = null;
    this.downButton = null;
    this.kesslerWarning = null;
    this.kesslerWarningText = null;
  }

  isImportProject(name) {
    return this.projectSet.has(name);
  }

  getHeaderProjectName() {
    return this.headerProjectName;
  }

  getProjectNames() {
    return this.projectNames.slice();
  }

  getRow(projectName) {
    return this.rows[projectName];
  }

  ensureCard(project) {
    if (this.card && this.card.isConnected) {
      return this.card;
    }

    this.headerProjectName = project.name;
    this.rows = {};
    this.multiplier = 1;
    this.projectNames.forEach((projectName) => {
      const target = projectManager.projects?.[projectName];
      if (target) {
        target.assignmentMultiplier = 1;
      }
    });

    const card = document.createElement('div');
    card.classList.add('project-card');
    card.dataset.projectName = this.headerProjectName;

    const cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header');

    const arrow = document.createElement('span');
    arrow.classList.add('collapse-arrow');
    arrow.innerHTML = '&#9660;';

    const nameElement = document.createElement('span');
    nameElement.classList.add('card-title');
    nameElement.textContent = 'Import Resources';

    arrow.addEventListener('click', () => this.toggleProjectCollapse?.(card));
    nameElement.addEventListener('click', () => this.toggleProjectCollapse?.(card));

    const headerRight = document.createElement('div');
    headerRight.classList.add('project-header-right');

    const reorderButtons = document.createElement('div');
    reorderButtons.classList.add('reorder-buttons');

    const upButton = document.createElement('button');
    upButton.innerHTML = '&#9650;';
    upButton.addEventListener('click', (event) => {
      this.moveProject?.(this.headerProjectName, 'up', event.shiftKey);
    });

    const downButton = document.createElement('button');
    downButton.innerHTML = '&#9660;';
    downButton.addEventListener('click', (event) => {
      this.moveProject?.(this.headerProjectName, 'down', event.shiftKey);
    });

    reorderButtons.appendChild(upButton);
    reorderButtons.appendChild(downButton);
    headerRight.appendChild(reorderButtons);

    cardHeader.appendChild(arrow);
    cardHeader.appendChild(nameElement);
    cardHeader.appendChild(headerRight);

    const cardBody = document.createElement('div');
    cardBody.classList.add('card-body');

    const description = document.createElement('p');
    description.classList.add('project-description');
    description.textContent = 'Coordinate orbital shipments for various space resources.  The first 100 spaceship assignments reduce the duration, every assignment afterward provides a multiplier.';
    cardBody.appendChild(description);

    const kesslerWarning = document.createElement('div');
    kesslerWarning.classList.add('project-kessler-warning');
    kesslerWarning.style.display = 'none';
    const warningIcon = document.createElement('span');
    warningIcon.classList.add('project-kessler-warning__icon');
    warningIcon.textContent = '⚠';
    const warningText = document.createElement('span');
    const warningIconRight = document.createElement('span');
    warningIconRight.classList.add('project-kessler-warning__icon');
    warningIconRight.textContent = '⚠';
    kesslerWarning.append(warningIcon, warningText, warningIconRight);
    cardBody.appendChild(kesslerWarning);

    const costDisplay = document.createElement('div');
    costDisplay.classList.add('import-cost-per-shipment');
    cardBody.appendChild(costDisplay);

    const capSection = document.createElement('div');
    capSection.classList.add('import-cap-section');

    const capToggle = document.createElement('button');
    capToggle.type = 'button';
    capToggle.classList.add('import-cap-toggle');
    capToggle.setAttribute('aria-expanded', this.capExpanded ? 'true' : 'false');

    const capArrow = document.createElement('span');
    capArrow.classList.add('import-cap-arrow');
    capArrow.textContent = this.capExpanded ? '\u25BC' : '\u25B6';

    const capLabel = document.createElement('span');
    capLabel.textContent = 'Import cap';

    capToggle.appendChild(capArrow);
    capToggle.appendChild(capLabel);

    const capBody = document.createElement('div');
    capBody.classList.add('import-cap-body');
    capBody.style.display = this.capExpanded ? 'block' : 'none';

    const capText = document.createElement('div');
    capText.classList.add('import-cap-text');
    capBody.appendChild(capText);
    this.buildCapSummaryElements(capText);

    capToggle.addEventListener('click', () => {
      this.capExpanded = !this.capExpanded;
      capToggle.setAttribute('aria-expanded', this.capExpanded ? 'true' : 'false');
      capArrow.textContent = this.capExpanded ? '\u25BC' : '\u25B6';
      capBody.style.display = this.capExpanded ? 'block' : 'none';
    });

    capSection.appendChild(capToggle);
    capSection.appendChild(capBody);
    cardBody.appendChild(capSection);

    const topControls = document.createElement('div');
    topControls.classList.add('import-top-row');

    const availableDisplay = document.createElement('span');
    availableDisplay.classList.add('import-available-display');
    availableDisplay.textContent = 'Available: 0';

    const availableCell = document.createElement('div');
    availableCell.classList.add('import-top-cell', 'import-top-available');
    availableCell.appendChild(availableDisplay);

    const decreaseButton = document.createElement('button');
    decreaseButton.textContent = '/10';
    decreaseButton.addEventListener('click', () => this.adjustMultiplier('decrease'));

    const increaseButton = document.createElement('button');
    increaseButton.textContent = 'x10';
    increaseButton.addEventListener('click', () => this.adjustMultiplier('increase'));

    const multiplierCell = document.createElement('div');
    multiplierCell.classList.add('import-top-cell', 'import-top-multiplier');
    const multiplierControls = document.createElement('div');
    multiplierControls.classList.add('import-multiplier-controls');
    multiplierControls.appendChild(decreaseButton);
    multiplierControls.appendChild(increaseButton);
    multiplierCell.appendChild(multiplierControls);

    const spacerCellOne = document.createElement('div');
    spacerCellOne.classList.add('import-top-cell');
    const spacerCellTwo = document.createElement('div');
    spacerCellTwo.classList.add('import-top-cell');
    const spacerCellThree = document.createElement('div');
    spacerCellThree.classList.add('import-top-cell', 'import-top-spacer');

    topControls.append(availableCell, multiplierCell, spacerCellOne, spacerCellTwo, spacerCellThree);
    cardBody.appendChild(topControls);

    const table = document.createElement('div');
    table.classList.add('import-resources-grid');

    const headerRow = document.createElement('div');
    headerRow.classList.add('import-resources-row', 'import-resources-header');
    const headers = ['Resource', 'Assignment', 'Auto Assign', 'Total Cost & Gain', ''];
    headers.forEach((labelText) => {
      const cell = document.createElement('div');
      cell.classList.add('import-resources-cell');
      if (labelText) {
        cell.innerHTML = `<strong>${labelText}</strong>`;
      } else {
        cell.classList.add('import-spacer-cell');
      }
      headerRow.appendChild(cell);
    });

    table.appendChild(headerRow);
    cardBody.appendChild(table);

    card.appendChild(cardHeader);
    card.appendChild(cardBody);

    const categoryContainer = this.getOrCreateCategoryContainer
      ? this.getOrCreateCategoryContainer(project.category || 'resources')
      : null;
    if (categoryContainer) {
      categoryContainer.appendChild(card);
    }

    this.card = card;
    this.cardBody = cardBody;
    this.table = table;
    this.availableDisplay = availableDisplay;
    this.costPerShipmentDisplay = costDisplay;
    this.capSection = capSection;
    this.capToggle = capToggle;
    this.capArrow = capArrow;
    this.capText = capText;
    this.multiplierButtons = { decrease: decreaseButton, increase: increaseButton };
    this.collapseArrow = arrow;
    this.upButton = upButton;
    this.downButton = downButton;
    this.kesslerWarning = kesslerWarning;
    this.kesslerWarningText = warningText;

    const projectElements = this.getProjectElements();
    const headerElements = projectElements[this.headerProjectName] || {};
    headerElements.projectItem = card;
    headerElements.cardBody = cardBody;
    headerElements.collapseArrow = arrow;
    headerElements.upButton = upButton;
    headerElements.downButton = downButton;
    headerElements.kesslerFailureWarning = kesslerWarning;
    headerElements.kesslerFailureWarningText = warningText;
    projectElements[this.headerProjectName] = headerElements;

    this.updateSharedDisplays(project);

    return card;
  }

  adjustMultiplier(direction) {
    if (direction === 'decrease') {
      const reduced = this.multiplier / 10;
      this.multiplier = reduced >= 1 ? reduced : 1;
    } else if (direction === 'increase') {
      this.multiplier *= 10;
    }

    this.projectNames.forEach((projectName) => {
      const project = projectManager.projects?.[projectName];
      if (project) {
        project.assignmentMultiplier = this.multiplier;
      }
    });

    this.updateAssignmentButtons();
  }

  updateAssignmentButtons() {
    Object.keys(this.rows).forEach((projectName) => {
      const row = this.rows[projectName];
      const project = projectManager.projects?.[projectName];
      if (!row || !project) {
        return;
      }
      const formatted = formatNumber(project.assignmentMultiplier, true);
      if (row.minusButton) {
        row.minusButton.textContent = `-${formatted}`;
      }
      if (row.plusButton) {
        row.plusButton.textContent = `+${formatted}`;
      }
    });
  }

  formatCostPerShipment(project) {
    if (!project || typeof project.calculateSpaceshipCost !== 'function') {
      return 'Cost per Shipment: -';
    }
    const costPerShip = project.calculateSpaceshipCost();
    const segments = [];
    for (const category in costPerShip) {
      if (!Object.prototype.hasOwnProperty.call(costPerShip, category)) continue;
      const resourcesForCategory = costPerShip[category];
      for (const resourceId in resourcesForCategory) {
        if (!Object.prototype.hasOwnProperty.call(resourcesForCategory, resourceId)) continue;
        const amount = resourcesForCategory[resourceId];
        if (!(amount > 0)) continue;
        const resourceConfig = resources?.[category]?.[resourceId];
        const resourceDisplayName = resourceConfig?.displayName ||
          resourceId.charAt(0).toUpperCase() + resourceId.slice(1);
        segments.push(`${resourceDisplayName}: ${formatNumber(amount, true)}`);
      }
    }
    if (!segments.length) {
      return 'Cost per Shipment: -';
    }
    return `Cost per Shipment: ${segments.join(', ')}`;
  }

  updateSharedDisplays(project) {
    if (!this.card || !this.card.isConnected) {
      return;
    }

    this.updateCapSummary(warpGateNetworkManager.getCapSummaryData());
    this.updateKesslerFailureWarning(project);

    if (this.availableDisplay) {
      const availableShips = formatNumber(Math.floor(resources?.special?.spaceships?.value || 0), true);
      this.availableDisplay.textContent = `Available: ${availableShips}`;
    }

    if (this.costPerShipmentDisplay && project && typeof project.calculateSpaceshipCost === 'function') {
      this.costPerShipmentDisplay.textContent = this.formatCostPerShipment(project);
    }
  }

  updateKesslerFailureWarning(project) {
    try {
      let hazardActive = false;
      try {
        hazardActive = hazardManager.parameters.kessler && !hazardManager.kesslerHazard.isCleared();
      } catch (error) {
        hazardActive = false;
      }
      const isCollapsed = this.card?.classList?.contains('collapsed');
      if (!hazardActive || isCollapsed) {
        this.kesslerWarning.style.display = 'none';
        return;
      }
      const failureChance = project.getKesslerFailureChance();
      const percent = Math.max(0, Math.min(1, failureChance)) * 100;
      if (percent <= 0) {
        this.kesslerWarning.style.display = 'none';
        return;
      }
      this.kesslerWarningText.textContent = `Kessler Skies: ${formatNumber(percent, false, 2)}% chance of project failure.`;
      this.kesslerWarning.style.display = 'flex';
    } catch (error) {
      // no-op
    }
  }

  buildCapSummaryElements(container) {
    const summary = document.createElement('div');
    summary.classList.add('import-cap-summary');

    const intro = document.createElement('div');
    intro.classList.add('import-cap-line', 'import-cap-intro');
    summary.appendChild(intro);

    const baseCap = document.createElement('div');
    baseCap.classList.add('import-cap-line');
    summary.appendChild(baseCap);

    const ratios = document.createElement('div');
    ratios.classList.add('import-cap-line');
    summary.appendChild(ratios);

    const rulesList = document.createElement('ul');
    rulesList.classList.add('import-cap-rules');
    summary.appendChild(rulesList);

    const fullControl = document.createElement('div');
    fullControl.classList.add('import-cap-line');
    summary.appendChild(fullControl);

    const table = document.createElement('div');
    table.classList.add('import-cap-table');

    ['Resource', 'Ratio', 'Cap', 'Details'].forEach((label) => {
      const cell = document.createElement('div');
      cell.classList.add('import-cap-cell', 'import-cap-header');
      cell.textContent = label;
      table.appendChild(cell);
    });

    summary.appendChild(table);
    container.appendChild(summary);

    this.capElements = {
      intro,
      baseCap,
      ratios,
      rulesList,
      fullControl,
      table,
      rows: {},
    };
  }

  createCapRow(label) {
    const row = {
      label: document.createElement('div'),
      ratio: document.createElement('div'),
      cap: document.createElement('div'),
      detail: document.createElement('div'),
    };

    row.label.classList.add('import-cap-cell', 'import-cap-resource');
    row.ratio.classList.add('import-cap-cell', 'import-cap-ratio');
    row.cap.classList.add('import-cap-cell', 'import-cap-value');
    row.detail.classList.add('import-cap-cell', 'import-cap-detail');

    row.label.textContent = label;

    this.capElements.table.appendChild(row.label);
    this.capElements.table.appendChild(row.ratio);
    this.capElements.table.appendChild(row.cap);
    this.capElements.table.appendChild(row.detail);

    this.capElements.rows[label] = row;
    return row;
  }

  updateCapSummary(data) {
    const elements = this.capElements;
    elements.intro.textContent = data.intro;
    elements.baseCap.textContent = data.baseCapLine;
    elements.baseCap.style.display = data.baseCapLine ? 'block' : 'none';
    elements.ratios.textContent = data.ratiosLine;
    elements.ratios.style.display = data.ratiosLine ? 'block' : 'none';
    elements.fullControl.textContent = data.fullControlLine;
    elements.fullControl.style.display = data.fullControlLine ? 'block' : 'none';

    while (elements.rulesList.firstChild) {
      elements.rulesList.removeChild(elements.rulesList.firstChild);
    }
    elements.rulesList.style.display = data.ruleLines.length ? 'block' : 'none';
    data.ruleLines.forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      elements.rulesList.appendChild(item);
    });

    const rowOrder = [];
    data.caps.forEach((entry) => {
      rowOrder.push(entry.label);
      const row = elements.rows[entry.label] || this.createCapRow(entry.label);
      row.ratio.textContent = entry.ratio;
      row.cap.textContent = entry.cap;
      row.detail.textContent = entry.detail;
    });

    if (data.hydrogen) {
      rowOrder.push(data.hydrogen.label);
      const row = elements.rows[data.hydrogen.label] || this.createCapRow(data.hydrogen.label);
      row.ratio.textContent = data.hydrogen.ratio;
      row.cap.textContent = data.hydrogen.cap;
      row.detail.textContent = data.hydrogen.detail;
    }

    rowOrder.forEach((label) => {
      const row = elements.rows[label];
      elements.table.appendChild(row.label);
      elements.table.appendChild(row.ratio);
      elements.table.appendChild(row.cap);
      elements.table.appendChild(row.detail);
    });
  }

  insertRow(mainRow, detailRow, projectName) {
    const table = this.table;
    if (!table) {
      return;
    }

    const orderIndex = this.projectNames.indexOf(projectName);
    let referenceRow = null;
    for (let index = orderIndex + 1; index < this.projectNames.length; index += 1) {
      const targetName = this.projectNames[index];
      const targetRow = this.rows[targetName]?.mainRow;
      if (targetRow && targetRow.isConnected) {
        referenceRow = targetRow;
        break;
      }
    }

    if (referenceRow) {
      table.insertBefore(mainRow, referenceRow);
      table.insertBefore(detailRow, referenceRow);
    } else {
      table.appendChild(mainRow);
      table.appendChild(detailRow);
    }
  }

  createRow(project) {
    this.ensureCard(project);

    if (this.rows[project.name]) {
      return;
    }

    const projectElements = this.getProjectElements();
    if (!projectElements[project.name]) {
      projectElements[project.name] = {};
    }

    const mainRow = document.createElement('div');
    mainRow.classList.add('import-resources-row');
    mainRow.dataset.projectName = project.name;

    const nameCell = document.createElement('div');
    nameCell.classList.add('import-resources-cell', 'import-name-cell');

    const progressButtonContainer = document.createElement('div');
    progressButtonContainer.classList.add('progress-button-container', 'import-progress-button-container');

    const progressButton = document.createElement('button');
    progressButton.classList.add('progress-button', 'import-progress-button');

    const progressNameLine = document.createElement('strong');
    progressNameLine.classList.add('import-progress-name');
    progressNameLine.textContent = project.displayName || project.name;

    const progressStatusLine = document.createElement('span');
    progressStatusLine.classList.add('import-progress-status');

    progressButton.appendChild(progressNameLine);
    progressButton.appendChild(progressStatusLine);

    progressButton.addEventListener('click', () => startProjectWithSelectedResources(project));
    progressButtonContainer.appendChild(progressButton);
    nameCell.appendChild(progressButtonContainer);

    const assignmentCell = document.createElement('div');
    assignmentCell.classList.add('import-resources-cell', 'import-assignment-cell');

    const assignmentInfo = document.createElement('div');
    assignmentInfo.classList.add('import-assignment-info');

    const assignedLabel = document.createElement('span');
    assignedLabel.textContent = 'Assigned:';
    const assignedDisplay = document.createElement('span');
    assignedDisplay.classList.add('import-assigned-value');
    assignmentInfo.appendChild(assignedLabel);
    assignmentInfo.appendChild(assignedDisplay);

    const buttonRow = document.createElement('div');
    buttonRow.classList.add('import-assignment-buttons');

    const zeroButton = document.createElement('button');
    zeroButton.textContent = '0';
    zeroButton.addEventListener('click', () => {
      project.assignSpaceships(-project.getActiveShipCount());
      project.disableAutoAssignSpaceships();
      this.projectNames.forEach((name) => this.updateProjectUI?.(name));
    });

    const minusButton = document.createElement('button');
    minusButton.addEventListener('click', () => {
      project.assignSpaceships(project.assignmentMultiplier * -1);
      this.projectNames.forEach((name) => this.updateProjectUI?.(name));
    });

    const plusButton = document.createElement('button');
    plusButton.addEventListener('click', () => {
      project.assignSpaceships(project.assignmentMultiplier);
      this.projectNames.forEach((name) => this.updateProjectUI?.(name));
    });

    const maxButton = document.createElement('button');
    maxButton.textContent = 'Max';
    maxButton.addEventListener('click', () => {
      const ships = Math.floor(resources.special?.spaceships?.value || 0);
      if (ships > 0) {
        project.assignSpaceships(ships);
        this.projectNames.forEach((name) => this.updateProjectUI?.(name));
      }
    });

    buttonRow.appendChild(zeroButton);
    buttonRow.appendChild(minusButton);
    buttonRow.appendChild(plusButton);
    buttonRow.appendChild(maxButton);

    assignmentCell.appendChild(assignmentInfo);
    assignmentCell.appendChild(buttonRow);

    const autoAssignCell = document.createElement('div');
    autoAssignCell.classList.add('import-resources-cell', 'import-auto-assign-cell');
    const autoAssignContainer = project.createAutoAssignSpaceshipsCheckbox();
    autoAssignCell.appendChild(autoAssignContainer);

    const totalGainCell = document.createElement('div');
    totalGainCell.classList.add('import-resources-cell', 'import-total-gain-cell');

    const totalCost = document.createElement('div');
    totalCost.classList.add('import-total-cost');
    const totalGain = document.createElement('div');
    totalGain.classList.add('import-total-gain');
    totalGainCell.appendChild(totalCost);
    totalGainCell.appendChild(totalGain);

    mainRow.appendChild(nameCell);
    mainRow.appendChild(assignmentCell);
    mainRow.appendChild(autoAssignCell);
    mainRow.appendChild(totalGainCell);

    const detailRow = document.createElement('div');
    detailRow.classList.add('import-resources-detail');

    const automationContainer = document.createElement('div');
    automationContainer.classList.add('automation-settings-container');
    automationContainer.style.borderTop = 'none';
    automationContainer.style.paddingTop = '0';
    automationContainer.style.marginTop = '0';

    const autoStartContainer = document.createElement('div');
    autoStartContainer.classList.add('checkbox-container');
    const autoStartCheckbox = document.createElement('input');
    autoStartCheckbox.type = 'checkbox';
    autoStartCheckbox.id = `${project.name}-auto-start`;
    autoStartCheckbox.addEventListener('change', (event) => {
      project.autoStart = event.target.checked;
    });
    const autoStartLabel = document.createElement('label');
    autoStartLabel.htmlFor = `${project.name}-auto-start`;
    autoStartLabel.textContent = 'Auto start';
    autoStartContainer.appendChild(autoStartCheckbox);
    autoStartContainer.appendChild(autoStartLabel);
    automationContainer.appendChild(autoStartContainer);

    if (project.renderAutomationUI) {
      project.renderAutomationUI(automationContainer);
    }

    detailRow.appendChild(automationContainer);

    this.insertRow(mainRow, detailRow, project.name);

    const elements = projectElements[project.name];
    elements.projectItem = this.card;
    elements.cardBody = this.cardBody;
    elements.collapseArrow = this.collapseArrow;
    elements.upButton = this.upButton;
    elements.downButton = this.downButton;
    elements.cardFooter = detailRow;
    elements.automationSettingsContainer = automationContainer;
    elements.autoStartCheckboxContainer = autoStartContainer;
    elements.autoStartCheckbox = autoStartCheckbox;
    elements.autoStartLabel = autoStartLabel;
    elements.progressButton = progressButton;
    elements.importProgressName = progressNameLine;
    elements.importProgressStatus = progressStatusLine;
    elements.assignedSpaceshipsDisplay = assignedDisplay;
    elements.isImportProject = true;
    elements.autoAssignCheckboxContainer = autoAssignContainer;
    elements.totalCostElement = totalCost;
    elements.totalGainElement = totalGain;

    this.rows[project.name] = {
      mainRow,
      detailRow,
      minusButton,
      plusButton,
      autoAssignContainer,
    };

    this.updateAssignmentButtons();
    if (typeof invalidateAutomationSettingsCache === 'function') {
      invalidateAutomationSettingsCache(project.name);
    }
  }

  updateVisibility(project, elements, rowVisible) {
    this.updateSharedDisplays(project);

    const rowEntry = this.rows[project.name];
    if (rowEntry) {
      rowEntry.mainRow.style.display = rowVisible ? 'grid' : 'none';
      rowEntry.detailRow.style.display = rowVisible ? 'flex' : 'none';
    }

    const anyVisibleRow = Object.keys(this.rows).some((key) => {
      const entry = this.rows[key];
      return entry && entry.mainRow && entry.mainRow.style.display !== 'none';
    });

    const projectItem = elements?.projectItem || this.card;
    if (projectItem) {
      projectItem.style.display = anyVisibleRow ? 'block' : 'none';
    }

    return rowVisible;
  }

  updateAssignedDisplay(elements, assignedText, maxShips) {
    if (!elements?.assignedSpaceshipsDisplay) {
      return;
    }

    const formattedCap = maxShips === Infinity ? '∞' : formatNumber(maxShips, true);
    if (maxShips != null) {
      elements.assignedSpaceshipsDisplay.textContent = `${assignedText}/${formattedCap}`;
    } else {
      elements.assignedSpaceshipsDisplay.textContent = assignedText;
    }
  }

  setProgressLabel(elements, project, statusText) {
    if (!elements || !elements.progressButton) return;
    const projectLabel = project.displayName || project.name;
    if (elements.importProgressName) {
      elements.importProgressName.textContent = projectLabel;
    }
    if (elements.importProgressStatus) {
      elements.importProgressStatus.textContent = statusText;
    } else {
      elements.progressButton.textContent = `${projectLabel}\n${statusText}`;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImportResourcesProjectUI;
} else if (typeof window !== 'undefined') {
  window.ImportResourcesProjectUI = ImportResourcesProjectUI;
}
