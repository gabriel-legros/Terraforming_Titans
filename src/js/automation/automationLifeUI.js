function buildAutomationLifeUI() {
  const card = automationElements.lifeDesign || document.getElementById('automation-life-design');

  const toggleCollapsed = () => {
    const automation = automationManager.lifeAutomation;
    automation.setCollapsed(!automation.collapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const header = createAutomationCardHeader(card, 'Life Automation', toggleCollapsed);

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const presetRow = createAutomationPresetRow(body);

  const purchaseSection = document.createElement('div');
  purchaseSection.classList.add('life-automation-section');
  const purchaseHeader = document.createElement('div');
  purchaseHeader.classList.add('life-automation-section-title');
  const purchaseEnableLabel = document.createElement('label');
  purchaseEnableLabel.classList.add('life-automation-enable');
  const purchaseEnable = document.createElement('input');
  purchaseEnable.type = 'checkbox';
  purchaseEnable.classList.add('life-automation-purchase-enable');
  purchaseEnableLabel.append(purchaseEnable);
  const purchaseTitle = document.createElement('span');
  purchaseTitle.classList.add('life-automation-section-title-text');
  purchaseTitle.textContent = 'Auto Purchase';
  const purchaseInfo = document.createElement('span');
  purchaseInfo.classList.add('info-tooltip-icon');
  purchaseInfo.innerHTML = '&#9432;';
  purchaseTitle.append(' ', purchaseInfo);
  attachDynamicInfoTooltip(
    purchaseInfo,
    'When enabled, auto purchase checks each category every tick.\nSpending uses the % threshold of current resources, with an optional max cost cap.'
  );
  purchaseHeader.append(purchaseEnableLabel, purchaseTitle);
  purchaseSection.appendChild(purchaseHeader);
  const purchaseList = document.createElement('div');
  purchaseList.classList.add('life-automation-purchase-list');
  purchaseSection.appendChild(purchaseList);
  body.appendChild(purchaseSection);

  const designSection = document.createElement('div');
  designSection.classList.add('life-automation-section');
  const designHeader = document.createElement('div');
  designHeader.classList.add('life-automation-section-title');
  const designEnableLabel = document.createElement('label');
  designEnableLabel.classList.add('life-automation-enable');
  const designEnable = document.createElement('input');
  designEnable.type = 'checkbox';
  designEnable.classList.add('life-automation-design-enable');
  designEnableLabel.append(designEnable);
  const designTitle = document.createElement('span');
  designTitle.classList.add('life-automation-section-title-text');
  designTitle.textContent = 'Auto Design';
  designHeader.append(designEnableLabel, designTitle);
  designSection.appendChild(designHeader);

  const deployRow = document.createElement('label');
  deployRow.classList.add('life-automation-deploy-row');
  const deployLabel = document.createElement('span');
  deployLabel.textContent = 'Deploy only if design improves by';
  const deployInput = document.createElement('input');
  deployInput.type = 'number';
  deployInput.min = '0';
  deployInput.classList.add('life-automation-deploy-input');
  const deploySuffix = document.createElement('span');
  deploySuffix.textContent = 'points';
  const deployInfo = document.createElement('span');
  deployInfo.classList.add('info-tooltip-icon');
  deployInfo.innerHTML = '&#9432;';
  deployInfo.title = 'Auto deployment will only trigger if it improves a design by the given number of points.';
  deployRow.append(deployLabel, deployInput, deploySuffix, deployInfo);
  designSection.appendChild(deployRow);

  const seedRow = document.createElement('div');
  seedRow.classList.add('life-automation-seed-row');
  const seedButton = document.createElement('button');
  seedButton.classList.add('life-automation-seed-button');
  seedButton.textContent = 'Create steps from current design';
  seedRow.appendChild(seedButton);
  designSection.appendChild(seedRow);

  const stepsContainer = document.createElement('div');
  stepsContainer.classList.add('life-automation-steps');
  designSection.appendChild(stepsContainer);

  const addStepButton = document.createElement('button');
  addStepButton.textContent = '+ Step';
  addStepButton.classList.add('automation-add-step');
  designSection.appendChild(addStepButton);

  body.appendChild(designSection);

  automationElements.lifeCollapseButton = header.collapse;
  automationElements.lifePanelBody = body;
  automationElements.lifePresetSelect = presetRow.presetSelect;
  automationElements.lifePresetNameInput = presetRow.presetName;
  automationElements.lifeNewPresetButton = presetRow.newPreset;
  automationElements.lifeDeletePresetButton = presetRow.deletePreset;
  automationElements.lifeEnablePresetCheckbox = presetRow.enableCheckbox;
  automationElements.lifePurchaseContainer = purchaseList;
  automationElements.lifePurchaseEnableCheckbox = purchaseEnable;
  automationElements.lifeDesignStepsContainer = stepsContainer;
  automationElements.lifeAddStepButton = addStepButton;
  automationElements.lifeDeployInput = deployInput;
  automationElements.lifeSeedRow = seedRow;
  automationElements.lifeSeedButton = seedButton;
  automationElements.lifeDesignEnableCheckbox = designEnable;

  attachLifeAutomationHandlers();
}

function updateLifeAutomationUI() {
  const {
    lifeDesign,
    lifeDesignDescription,
    lifePanelBody,
    lifeCollapseButton,
    lifePresetSelect,
    lifePresetNameInput,
    lifeNewPresetButton,
    lifeDeletePresetButton,
    lifeEnablePresetCheckbox,
    lifePurchaseContainer,
    lifePurchaseEnableCheckbox,
    lifeDesignStepsContainer,
    lifeAddStepButton,
    lifeDeployInput,
    lifeSeedRow,
    lifeDesignEnableCheckbox
  } = automationElements;
  const manager = automationManager;
  const automation = manager.lifeAutomation;
  const unlocked = manager.hasFeature('automationLifeDesign');
  lifeDesign.style.display = unlocked ? '' : 'none';
  lifeDesign.classList.toggle('automation-card-locked', !unlocked);
  lifeDesignDescription.textContent = unlocked
    ? 'Automates life point purchases and life design deployments.'
    : 'Purchase the Solis Life Automation upgrade to enable life automation.';
  if (!unlocked) {
    return;
  }

  lifePanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  lifeCollapseButton.textContent = automation.collapsed ? '▶' : '▼';

  while (lifePresetSelect.firstChild) lifePresetSelect.removeChild(lifePresetSelect.firstChild);
  automation.presets.forEach(preset => {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = preset.name || `Preset ${preset.id}`;
    if (preset.id === automation.activePresetId) {
      option.selected = true;
    }
    lifePresetSelect.appendChild(option);
  });

  const activePreset = automation.getActivePreset();
  lifePresetNameInput.value = activePreset.name || '';
  lifeEnablePresetCheckbox.checked = !!activePreset.enabled;
  lifePurchaseEnableCheckbox.checked = activePreset.purchaseEnabled !== false;
  lifeDesignEnableCheckbox.checked = activePreset.designEnabled !== false;
  lifeDeployInput.value = activePreset.deployImprovement;
  lifeSeedRow.style.display = activePreset.designSteps.length === 0 ? '' : 'none';

  lifePurchaseContainer.textContent = '';
  renderLifeAutomationPurchases(automation, activePreset, lifePurchaseContainer);

  lifeDesignStepsContainer.textContent = '';
  normalizeLifeAutomationStepAttributes(automation, activePreset);
  renderLifeAutomationSteps(automation, activePreset, lifeDesignStepsContainer);

  lifeAddStepButton.disabled = activePreset.designSteps.length >= automation.maxSteps;
  lifeAddStepButton.style.display = activePreset.designSteps.length === 0 ? '' : 'none';
}

function attachLifeAutomationHandlers() {
  const {
    lifeCollapseButton,
    lifePresetSelect,
    lifePresetNameInput,
    lifeNewPresetButton,
    lifeDeletePresetButton,
    lifeEnablePresetCheckbox,
    lifePurchaseEnableCheckbox,
    lifeAddStepButton,
    lifeDeployInput,
    lifeSeedButton,
    lifeDesignEnableCheckbox
  } = automationElements;
  lifeCollapseButton.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    automation.setCollapsed(!automation.collapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifePresetSelect.addEventListener('change', (event) => {
    const id = Number(event.target.value);
    automationManager.lifeAutomation.setActivePreset(id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifePresetNameInput.addEventListener('input', (event) => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.renamePreset(preset.id, event.target.value || '');
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifeNewPresetButton.addEventListener('click', () => {
    automationManager.lifeAutomation.addPreset('');
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifeDeletePresetButton.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.deletePreset(preset.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifeEnablePresetCheckbox.addEventListener('change', (event) => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.togglePresetEnabled(preset.id, event.target.checked);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifePurchaseEnableCheckbox.addEventListener('change', (event) => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.setPurchaseAutomationEnabled(preset.id, event.target.checked);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifeAddStepButton.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.addDesignStep(preset.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifeDeployInput.addEventListener('change', (event) => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.setDeployImprovement(preset.id, event.target.value);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifeSeedButton.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.populateDesignStepsFromCurrentDesign(preset.id);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifeDesignEnableCheckbox.addEventListener('change', (event) => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.setDesignAutomationEnabled(preset.id, event.target.checked);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
}

function getLifeAutomationAttributeOptions() {
  const metabolismStrings = buildMetabolismEfficiencyUIStrings();
  return baseLifeAttributeOrder
    .filter(attributeName => isLifeAutomationAttributeAvailable(attributeName))
    .map(attributeName => {
      const attribute = lifeDesigner.currentDesign[attributeName];
      const label = attributeName === 'photosynthesisEfficiency'
        ? metabolismStrings.displayName
        : attribute.displayName;
      return { value: attributeName, label };
    });
}

function isLifeAutomationAttributeAvailable(attributeName) {
  if (attributeName === 'bioworkforce') {
    return isBioworkforceUnlocked();
  }
  return lifeDesigner.currentDesign[attributeName].maxUpgrades > 0;
}

function normalizeLifeAutomationStepAttributes(automation, preset) {
  const attributeOptions = getLifeAutomationAttributeOptions();
  if (attributeOptions.length === 0) {
    return;
  }
  const allowed = new Set(attributeOptions.map(option => option.value));
  const fallback = attributeOptions[0].value;
  for (let index = 0; index < preset.designSteps.length; index += 1) {
    const step = preset.designSteps[index];
    if (!allowed.has(step.attribute)) {
      automation.updateDesignStep(preset.id, step.id, { attribute: fallback });
    }
  }
}

function renderLifeAutomationPurchases(automation, preset, container) {
  for (let index = 0; index < lifeShopCategories.length; index += 1) {
    const category = lifeShopCategories[index];
    const settings = preset.purchaseSettings[category.name];

    const row = document.createElement('div');
    row.classList.add('life-automation-row');
    const unlocked = isLifeShopCategoryUnlocked(category);
    if (!unlocked) {
      row.style.display = 'none';
    }

    const toggleLabel = document.createElement('label');
    toggleLabel.classList.add('life-automation-toggle');
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = !!settings.enabled;
    const nameText = document.createElement('span');
    nameText.textContent = resources.colony[category.name].displayName || category.label || category.name;
    toggleLabel.append(toggle, nameText);
    row.appendChild(toggleLabel);

    const thresholdLabel = document.createElement('label');
    thresholdLabel.classList.add('life-automation-field');
    const thresholdText = document.createElement('span');
    thresholdText.textContent = 'Spend at';
    const thresholdInput = document.createElement('input');
    thresholdInput.type = 'number';
    thresholdInput.min = '1';
    thresholdInput.max = '100';
    thresholdInput.value = settings.threshold;
    thresholdInput.disabled = !settings.enabled;
    const thresholdSuffix = document.createElement('span');
    thresholdSuffix.textContent = '%';
    thresholdLabel.append(thresholdText, thresholdInput, thresholdSuffix);
    row.appendChild(thresholdLabel);

    const maxLabel = document.createElement('label');
    maxLabel.classList.add('life-automation-field');
    const maxText = document.createElement('span');
    maxText.textContent = 'Max cost';
    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.min = '0';
    maxInput.placeholder = 'No max';
    maxInput.value = settings.maxCost || '';
    maxInput.disabled = !settings.enabled;
    maxLabel.append(maxText, maxInput);
    row.appendChild(maxLabel);

    toggle.addEventListener('change', (event) => {
      automation.setPurchaseEnabled(preset.id, category.name, event.target.checked);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    thresholdInput.addEventListener('change', (event) => {
      automation.setPurchaseThreshold(preset.id, category.name, event.target.value);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    maxInput.addEventListener('change', (event) => {
      automation.setPurchaseMaxCost(preset.id, category.name, event.target.value);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });

    container.appendChild(row);
  }
}

function renderLifeAutomationSteps(automation, preset, container) {
  const attributeOptions = getLifeAutomationAttributeOptions();
  if (attributeOptions.length === 0) {
    return;
  }
  for (let index = 0; index < preset.designSteps.length; index += 1) {
    const step = preset.designSteps[index];
    const isLast = index === preset.designSteps.length - 1;
    const stepCard = document.createElement('div');
    stepCard.classList.add('automation-step');

    const header = document.createElement('div');
    header.classList.add('automation-step-header');
    const heading = document.createElement('div');
    heading.classList.add('automation-step-heading');
    const title = document.createElement('span');
    title.classList.add('automation-step-badge');
    title.textContent = `Step ${index + 1}`;
    const subtitle = document.createElement('span');
    subtitle.classList.add('automation-step-subtitle');
    subtitle.textContent = step.mode === 'remaining' && isLast
      ? 'Spend all remaining points'
      : 'Spend fixed points';
    heading.append(title, subtitle);
    header.appendChild(heading);

    const controlWrap = document.createElement('div');
    controlWrap.classList.add('automation-step-controls');
    const orderWrap = document.createElement('div');
    orderWrap.classList.add('automation-step-order');
    const canInsert = preset.designSteps.length < automation.maxSteps;
    const insertAbove = document.createElement('button');
    insertAbove.textContent = '+';
    insertAbove.title = 'Insert step above';
    insertAbove.disabled = !canInsert;
    insertAbove.addEventListener('click', () => {
      automation.insertDesignStep(preset.id, step.id, -1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    const moveUp = document.createElement('button');
    moveUp.textContent = '↑';
    moveUp.title = 'Move step up';
    moveUp.disabled = index === 0;
    moveUp.addEventListener('click', () => {
      automation.moveDesignStep(preset.id, step.id, -1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    const moveDown = document.createElement('button');
    moveDown.textContent = '↓';
    moveDown.title = 'Move step down';
    moveDown.disabled = index === preset.designSteps.length - 1;
    moveDown.addEventListener('click', () => {
      automation.moveDesignStep(preset.id, step.id, 1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    const insertBelow = document.createElement('button');
    insertBelow.textContent = '+';
    insertBelow.title = 'Insert step below';
    insertBelow.disabled = !canInsert;
    insertBelow.addEventListener('click', () => {
      automation.insertDesignStep(preset.id, step.id, 1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    orderWrap.append(insertAbove, moveUp, moveDown, insertBelow);
    controlWrap.appendChild(orderWrap);
    const removeButton = document.createElement('button');
    removeButton.textContent = '✕';
    removeButton.title = 'Remove step';
    removeButton.addEventListener('click', () => {
      automation.removeDesignStep(preset.id, step.id);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    controlWrap.appendChild(removeButton);
    header.appendChild(controlWrap);
    stepCard.appendChild(header);

    const row = document.createElement('div');
    row.classList.add('life-automation-step-row');

    const attributeSelect = document.createElement('select');
    attributeOptions.forEach(optionData => {
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.label;
      if (optionData.value === step.attribute) {
        option.selected = true;
      }
      attributeSelect.appendChild(option);
    });
    attributeSelect.addEventListener('change', (event) => {
      automation.updateDesignStep(preset.id, step.id, { attribute: event.target.value });
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    row.appendChild(attributeSelect);

    const amountLabel = document.createElement('label');
    amountLabel.classList.add('life-automation-field');
    const amountText = document.createElement('span');
    amountText.textContent = 'Points';
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    const isOptimal = step.attribute === 'optimalGrowthTemperature';
    const attribute = lifeDesigner.currentDesign[step.attribute];
    const maxUpgrades = attribute.maxUpgrades;
    amountInput.min = isOptimal ? `-${maxUpgrades}` : '0';
    amountInput.max = `${maxUpgrades}`;
    amountInput.value = step.amount;
    const maxButton = document.createElement('button');
    maxButton.classList.add('life-automation-max-button');
    maxButton.textContent = 'Max';
    maxButton.addEventListener('click', () => {
      automation.updateDesignStep(preset.id, step.id, { amount: maxUpgrades });
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    amountLabel.append(amountText, amountInput, maxButton);
    row.appendChild(amountLabel);

    const modeLabel = document.createElement('label');
    modeLabel.classList.add('life-automation-field');
    const modeText = document.createElement('span');
    modeText.textContent = 'Mode';
    const modeSelect = document.createElement('select');
    const fixedOpt = document.createElement('option');
    fixedOpt.value = 'fixed';
    fixedOpt.textContent = 'Fixed points';
    const remainingOpt = document.createElement('option');
    remainingOpt.value = 'remaining';
    remainingOpt.textContent = 'All remaining';
    remainingOpt.disabled = !isLast;
    modeSelect.append(fixedOpt, remainingOpt);
    modeSelect.value = step.mode === 'remaining' && isLast ? 'remaining' : 'fixed';
    modeLabel.append(modeText, modeSelect);
    row.appendChild(modeLabel);

    amountInput.disabled = modeSelect.value === 'remaining' && !isOptimal;

    amountInput.addEventListener('change', (event) => {
      automation.updateDesignStep(preset.id, step.id, { amount: event.target.value });
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    modeSelect.addEventListener('change', (event) => {
      automation.updateDesignStep(preset.id, step.id, { mode: event.target.value });
      queueAutomationUIRefresh();
      updateAutomationUI();
    });

    stepCard.appendChild(row);
    container.appendChild(stepCard);
  }
}
