function getLifeAutomationPresetLabel(preset) {
  return preset.name || getAutomationCardText('presetWithId', { id: preset.id }, `Preset ${preset.id}`);
}

function buildAutomationLifeUI() {
  const card = automationElements.lifeDesign || document.getElementById('automation-life-design');

  const toggleCollapsed = () => {
    const automation = automationManager.lifeAutomation;
    automation.setCollapsed(!automation.collapsed);
    queueAutomationUIRefresh();
    updateAutomationUI();
  };

  const header = createAutomationCardHeader(
    card,
    getAutomationCardText('lifeAutomationTitle', {}, 'Life Automation'),
    toggleCollapsed,
    'life'
  );

  const body = document.createElement('div');
  body.classList.add('automation-body');
  card.appendChild(body);

  const presetRow = createAutomationPresetRow(body);

  const purchaseSection = document.createElement('div');
  purchaseSection.classList.add('life-automation-section');
  const purchaseHeader = document.createElement('div');
  purchaseHeader.classList.add('life-automation-section-title');
  const purchaseEnable = createAutomationToggle(
    getAutomationCardText('lifeAutoPurchaseOn', {}, 'Auto purchase on'),
    getAutomationCardText('lifeAutoPurchaseOff', {}, 'Auto purchase off')
  );
  purchaseEnable.classList.add('life-automation-purchase-toggle');
  const purchaseTitle = document.createElement('span');
  purchaseTitle.classList.add('life-automation-section-title-text');
  purchaseTitle.textContent = '';
  const purchaseInfo = document.createElement('span');
  purchaseInfo.classList.add('info-tooltip-icon');
  purchaseInfo.innerHTML = '&#9432;';
  purchaseTitle.append(' ', purchaseInfo);
  attachDynamicInfoTooltip(
    purchaseInfo,
    getAutomationCardText('lifeAutoPurchaseTooltip', {}, 'When enabled, auto purchase checks each category every tick.\nSpending uses the % threshold of current resources, with an optional max cost cap.')
  );
  purchaseHeader.append(purchaseEnable, purchaseTitle);
  purchaseSection.appendChild(purchaseHeader);
  const purchaseList = document.createElement('div');
  purchaseList.classList.add('life-automation-purchase-list');
  purchaseSection.appendChild(purchaseList);
  body.appendChild(purchaseSection);

  const designSection = document.createElement('div');
  designSection.classList.add('life-automation-section');
  const designHeader = document.createElement('div');
  designHeader.classList.add('life-automation-section-title');
  const designEnable = createAutomationToggle(
    getAutomationCardText('lifeAutoDesignOn', {}, 'Auto design on'),
    getAutomationCardText('lifeAutoDesignOff', {}, 'Auto design off')
  );
  designEnable.classList.add('life-automation-design-toggle');
  const deployNowButton = document.createElement('button');
  deployNowButton.classList.add('life-automation-deploy-now');
  deployNowButton.textContent = getAutomationCardText('lifeDeployNowButton', {}, 'Deploy Now');
  deployNowButton.title = getAutomationCardText('lifeDeployNowTitle', {}, 'Deploy the current auto design steps immediately.');
  designHeader.append(designEnable, deployNowButton);
  designSection.appendChild(designHeader);

  const deployRow = document.createElement('label');
  deployRow.classList.add('life-automation-deploy-row');
  const deployLabel = document.createElement('span');
  deployLabel.textContent = getAutomationCardText('lifeDeployImproveLabel', {}, 'Deploy only if design improves by');
  const deployInput = document.createElement('input');
  deployInput.type = 'number';
  deployInput.min = '0';
  deployInput.classList.add('life-automation-deploy-input');
  const deploySuffix = document.createElement('span');
  deploySuffix.textContent = getAutomationCardText('lifeDeployPointsSuffix', {}, 'points');
  const deployInfo = document.createElement('span');
  deployInfo.classList.add('info-tooltip-icon');
  deployInfo.innerHTML = '&#9432;';
  attachDynamicInfoTooltip(
    deployInfo,
    getAutomationCardText('lifeDeployInfo', {}, 'Auto deployment will only trigger if it improves a design by the given number of points.')
  );
  deployRow.append(deployLabel, deployInput, deploySuffix, deployInfo);
  designSection.appendChild(deployRow);

  const seedRow = document.createElement('div');
  seedRow.classList.add('life-automation-seed-row');
  const seedButton = document.createElement('button');
  seedButton.classList.add('life-automation-seed-button');
  seedButton.textContent = getAutomationCardText('lifeCreateStepsFromCurrentButton', {}, 'Create steps from current design');
  seedRow.appendChild(seedButton);
  designSection.appendChild(seedRow);

  const stepsContainer = document.createElement('div');
  stepsContainer.classList.add('life-automation-steps');
  designSection.appendChild(stepsContainer);

  const addStepButton = document.createElement('button');
  addStepButton.textContent = getAutomationCardText('addStepButton', {}, '+ Step');
  addStepButton.classList.add('automation-add-step');
  designSection.appendChild(addStepButton);

  body.appendChild(designSection);

  automationElements.lifeCollapseButton = header.collapse;
  automationElements.lifePanelBody = body;
  automationElements.lifePresetSelect = presetRow.presetSelect;
  automationElements.lifePresetMoveUpButton = presetRow.presetMoveUp;
  automationElements.lifePresetMoveDownButton = presetRow.presetMoveDown;
  automationElements.lifePresetNameInput = presetRow.presetName;
  automationElements.lifeNewPresetButton = presetRow.newPreset;
  automationElements.lifeDeletePresetButton = presetRow.deletePreset;
  automationElements.lifeEnablePresetCheckbox = presetRow.enableCheckbox;
  automationElements.lifeShowPresetInSidebarCheckbox = presetRow.showInSidebarCheckbox;
  automationElements.lifePurchaseContainer = purchaseList;
  automationElements.lifePurchaseEnableCheckbox = purchaseEnable;
  automationElements.lifeDesignStepsContainer = stepsContainer;
  automationElements.lifeAddStepButton = addStepButton;
  automationElements.lifeDeployInput = deployInput;
  automationElements.lifeSeedRow = seedRow;
  automationElements.lifeSeedButton = seedButton;
  automationElements.lifeDesignEnableCheckbox = designEnable;
  automationElements.lifeDeployNowButton = deployNowButton;

  attachLifeAutomationHandlers();
}

function updateLifeAutomationUI() {
  const {
    lifeDesign,
    lifeDesignDescription,
    lifePanelBody,
    lifeCollapseButton,
    lifePresetSelect,
    lifePresetMoveUpButton,
    lifePresetMoveDownButton,
    lifePresetNameInput,
    lifeNewPresetButton,
    lifeDeletePresetButton,
    lifeEnablePresetCheckbox,
    lifeShowPresetInSidebarCheckbox,
    lifePurchaseContainer,
    lifePurchaseEnableCheckbox,
    lifeDesignStepsContainer,
    lifeAddStepButton,
    lifeDeployInput,
    lifeSeedRow,
    lifeDesignEnableCheckbox,
    lifeDeployNowButton
  } = automationElements;
  const manager = automationManager;
  const automation = manager.lifeAutomation;
  const unlocked = manager.hasFeature('automationLifeDesign');
  lifeDesign.style.display = unlocked ? '' : 'none';
  lifeDesign.classList.toggle('automation-card-locked', !unlocked);
  lifeDesignDescription.textContent = unlocked
    ? getAutomationCardText('lifeAutomationDescriptionUnlocked', {}, 'Automates life point purchases and life design deployments.')
    : getAutomationCardText('lifeAutomationDescriptionLocked', {}, 'Purchase the Solis Life Automation upgrade to enable life automation.');
  if (!unlocked) {
    return;
  }

  lifePanelBody.style.display = automation.collapsed ? 'none' : 'flex';
  lifeCollapseButton.textContent = automation.collapsed ? '▶' : '▼';

  // Only rebuild preset dropdown if not currently focused
  if (document.activeElement !== lifePresetSelect) {
    while (lifePresetSelect.firstChild) lifePresetSelect.removeChild(lifePresetSelect.firstChild);
    automation.presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset.id;
      option.textContent = getLifeAutomationPresetLabel(preset);
      if (preset.id === automation.getSelectedPresetId()) {
        option.selected = true;
      }
      lifePresetSelect.appendChild(option);
    });
  }

  const activePreset = automation.getActivePreset();
  if (document.activeElement !== lifePresetNameInput) {
    lifePresetNameInput.value = activePreset.name || '';
  }
  setAutomationToggleState(lifeEnablePresetCheckbox, !!automation.enabled);
  lifeShowPresetInSidebarCheckbox.checked = activePreset.showInSidebar !== false;
  const activePresetIndex = automation.presets.findIndex(preset => preset.id === activePreset.id);
  lifePresetMoveUpButton.disabled = activePresetIndex <= 0;
  lifePresetMoveDownButton.disabled = activePresetIndex >= automation.presets.length - 1;
  setAutomationToggleState(lifePurchaseEnableCheckbox, activePreset.purchaseEnabled !== false);
  setAutomationToggleState(lifeDesignEnableCheckbox, activePreset.designEnabled !== false);
  if (document.activeElement !== lifeDeployInput) {
    lifeDeployInput.value = activePreset.deployImprovement;
  }
  lifeSeedRow.style.display = activePreset.designSteps.length === 0 ? '' : 'none';
  const deployCandidate = lifeDesigner.enabled && activePreset.designSteps.length > 0
    ? automation.buildCandidateDesign(activePreset)
    : null;
  const canDeploy = deployCandidate && deployCandidate.canSurviveAnywhere();
  lifeDeployNowButton.disabled = !canDeploy;

  // Only rebuild purchase container if no input within is focused
  const purchaseHasFocus = lifePurchaseContainer.contains(document.activeElement) &&
    document.activeElement.tagName === 'INPUT';
  if (!purchaseHasFocus) {
    const purchaseSignature = JSON.stringify(lifeShopCategories.map(category => {
      const settings = activePreset.purchaseSettings[category.name];
      return {
        category: category.name,
        unlocked: isLifeShopCategoryUnlocked(category),
        enabled: !!settings.enabled,
        threshold: settings.threshold,
        maxCost: settings.maxCost || 0
      };
    }));
    if (lifePurchaseContainer._renderSignature !== purchaseSignature) {
      lifePurchaseContainer.textContent = '';
      renderLifeAutomationPurchases(automation, activePreset, lifePurchaseContainer);
      lifePurchaseContainer._renderSignature = purchaseSignature;
    }
  }

  // Only rebuild steps if no dropdown/input within is focused
  const stepsHasFocus = lifeDesignStepsContainer.contains(document.activeElement) &&
    (document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'INPUT');
  if (!stepsHasFocus) {
    const stepsSignature = JSON.stringify({
      presetId: activePreset.id,
      designEnabled: activePreset.designEnabled !== false,
      maxSteps: automation.maxSteps,
      lifeDesignerEnabled: !!lifeDesigner.enabled,
      designSteps: activePreset.designSteps.map(step => ({
        id: step.id,
        mode: step.mode,
        limit: step.limit,
        entries: step.entries.map(entry => ({
          id: entry.id,
          attribute: entry.attribute,
          weight: entry.weight,
          cap: entry.cap,
          capMode: entry.capMode,
          zones: entry.zones
        }))
      }))
    });
    if (lifeDesignStepsContainer._renderSignature !== stepsSignature) {
      lifeDesignStepsContainer.textContent = '';
      normalizeLifeAutomationStepAttributes(automation, activePreset);
      renderLifeAutomationSteps(automation, activePreset, lifeDesignStepsContainer);
      lifeDesignStepsContainer._renderSignature = stepsSignature;
    }
  }
  updateLifeAutomationSpendPreview(automation, activePreset, lifeDesignStepsContainer);

  lifeAddStepButton.disabled = activePreset.designSteps.length >= automation.maxSteps;
  lifeAddStepButton.style.display = '';
}

function attachLifeAutomationHandlers() {
  const {
    lifePresetSelect,
    lifePresetMoveUpButton,
    lifePresetMoveDownButton,
    lifePresetNameInput,
    lifeNewPresetButton,
    lifeDeletePresetButton,
    lifeEnablePresetCheckbox,
    lifeShowPresetInSidebarCheckbox,
    lifePurchaseEnableCheckbox,
    lifeAddStepButton,
    lifeDeployInput,
    lifeSeedButton,
    lifeDesignEnableCheckbox,
    lifeDeployNowButton
  } = automationElements;
  lifePresetSelect.addEventListener('change', (event) => {
    const id = Number(event.target.value);
    automationManager.lifeAutomation.setSelectedPresetId(id);
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
  lifePresetMoveUpButton.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.movePreset(preset.id, -1);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifePresetMoveDownButton.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.movePreset(preset.id, 1);
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
  lifeEnablePresetCheckbox.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    automation.setEnabled(!automation.enabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifeShowPresetInSidebarCheckbox.addEventListener('change', (event) => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.setPresetShowInSidebar(preset.id, event.target.checked);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifePurchaseEnableCheckbox.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.setPurchaseAutomationEnabled(preset.id, !preset.purchaseEnabled);
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
  lifeDesignEnableCheckbox.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.setDesignAutomationEnabled(preset.id, !preset.designEnabled);
    queueAutomationUIRefresh();
    updateAutomationUI();
  });
  lifeDeployNowButton.addEventListener('click', () => {
    const automation = automationManager.lifeAutomation;
    const preset = automation.getActivePreset();
    automation.forceDeployDesign(preset.id);
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
  if (!isLifeAttributeUnlocked(attributeName)) {
    return false;
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
    const entries = Array.isArray(step.entries) ? step.entries : [];
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const entry = entries[entryIndex];
      if (!allowed.has(entry.attribute)) {
        automation.updateDesignEntry(preset.id, step.id, entry.id, { attribute: fallback });
      }
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
    thresholdText.textContent = getAutomationCardText('lifeSpendAtLabel', {}, 'Spend at');
    const thresholdInput = document.createElement('input');
    thresholdInput.type = 'number';
    thresholdInput.min = '0';
    thresholdInput.max = '100';
    thresholdInput.step = '0.01';
    thresholdInput.inputMode = 'decimal';
    thresholdInput.value = settings.threshold;
    const thresholdSuffix = document.createElement('span');
    thresholdSuffix.textContent = '%';
    thresholdLabel.append(thresholdText, thresholdInput, thresholdSuffix);
    row.appendChild(thresholdLabel);

    const maxLabel = document.createElement('label');
    maxLabel.classList.add('life-automation-field');
    const maxText = document.createElement('span');
    maxText.textContent = getAutomationCardText('lifeMaxCostLabel', {}, 'Max cost');
    const maxInput = document.createElement('input');
    maxInput.type = 'text';
    maxInput.min = '0';
    maxInput.placeholder = getAutomationCardText('lifeNoMaxPlaceholder', {}, 'No max');
    maxInput.value = settings.maxCost ? formatNumber(settings.maxCost, true, 3) : '';
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
    wireStringNumberInput(maxInput, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
      },
      formatValue: (value) => {
        return value > 0 ? formatNumber(value, true, 3) : '';
      },
      onValue: (parsed) => {
        automation.setPurchaseMaxCost(preset.id, category.name, parsed > 0 ? parsed : null);
        queueAutomationUIRefresh();
      }
    });

    container.appendChild(row);
  }
}

function renderLifeAutomationSteps(automation, preset, container) {
  const attributeOptions = getLifeAutomationAttributeOptions();
  if (attributeOptions.length === 0) {
    return;
  }
  const spendPreview = automation.getDesignStepSpends(preset);
  const zoneOptions = [
    { key: 'tropical', label: getAutomationCardText('lifeZoneTropical', {}, 'Tropical') },
    { key: 'temperate', label: getAutomationCardText('lifeZoneTemperate', {}, 'Temperate') },
    { key: 'polar', label: getAutomationCardText('lifeZonePolar', {}, 'Polar') }
  ];

  for (let index = 0; index < preset.designSteps.length; index += 1) {
    const step = preset.designSteps[index];
    const stepCard = document.createElement('div');
    stepCard.classList.add('automation-step');

    const header = document.createElement('div');
    header.classList.add('automation-step-header');
    const heading = document.createElement('div');
    heading.classList.add('automation-step-heading');
    const title = document.createElement('span');
    title.classList.add('automation-step-badge');
    title.textContent = getAutomationCardText('stepWithIndex', { index: index + 1 }, `Step ${index + 1}`);
    const subtitle = document.createElement('span');
    subtitle.classList.add('automation-step-subtitle');
    if (step.mode === 'cappedMax') {
      subtitle.textContent = getAutomationCardText('lifeStepSubtitleCappedMax', {}, 'Distribute points until the highest substep cap');
    } else {
      const limitText = Number(step.limit || 0).toLocaleString();
      subtitle.textContent = getAutomationCardText('lifeStepSubtitleAssignUpTo', { count: limitText }, `Spend up to ${limitText} points`);
    }
    heading.append(title, subtitle);
    header.appendChild(heading);

    const controlWrap = document.createElement('div');
    controlWrap.classList.add('automation-step-controls');
    const limitRow = document.createElement('div');
    limitRow.classList.add('automation-limit-row');
    const limitInfo = document.createElement('span');
    limitInfo.className = 'info-tooltip-icon';
    limitInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      limitInfo,
      getAutomationCardText('lifeStepLimitTooltip', {}, 'Step cap:\n- Spend Amount distributes up to the entered life design points by substep weight.\n- Capped by highest max distributes by weight until the highest finite substep cap is reached.\n\nSubstep caps:\n- Fixed uses the entered cap. Blank means uncapped.\n- Max uses the attribute max.\n- As needed is available for temperature tolerance and radiation tolerance.')
    );
    const limitMode = document.createElement('select');
    const fixedStepOpt = document.createElement('option');
    fixedStepOpt.value = 'fixed';
    fixedStepOpt.textContent = getAutomationCardText('lifeSpendAmount', {}, 'Spend Amount');
    const cappedStepOpt = document.createElement('option');
    cappedStepOpt.value = 'cappedMax';
    cappedStepOpt.textContent = getAutomationCardText('shipCappedByLargestMax', {}, 'Capped by largest max');
    limitMode.append(fixedStepOpt, cappedStepOpt);
    limitMode.value = step.mode === 'cappedMax' ? 'cappedMax' : 'fixed';
    const limitInput = document.createElement('input');
    limitInput.type = 'text';
    limitInput.min = '0';
    limitInput.placeholder = getAutomationCardText('lifeAmountPlaceholder', {}, 'Points');
    limitInput.value = step.mode === 'cappedMax' ? '' : (step.limit > 0 ? formatNumber(step.limit, true, 3) : '');
    limitInput.disabled = step.mode === 'cappedMax';
    limitMode.addEventListener('change', (event) => {
      const mode = event.target.value;
      automation.updateDesignStep(preset.id, step.id, { mode });
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    wireStringNumberInput(limitInput, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
      },
      formatValue: (value) => {
        return value > 0 ? formatNumber(value, true, 3) : '';
      },
      onValue: (parsed) => {
        automation.updateDesignStep(preset.id, step.id, { limit: parsed });
        queueAutomationUIRefresh();
      }
    });
    limitRow.append(limitInfo, limitMode, limitInput);
    controlWrap.appendChild(limitRow);

    const orderWrap = document.createElement('div');
    orderWrap.classList.add('automation-step-order');
    const canInsert = preset.designSteps.length < automation.maxSteps;
    const insertAbove = document.createElement('button');
    insertAbove.textContent = '+';
    insertAbove.title = getAutomationCardText('lifeInsertStepAbove', {}, 'Insert step above');
    insertAbove.disabled = !canInsert;
    insertAbove.addEventListener('click', () => {
      automation.insertDesignStep(preset.id, step.id, -1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    const moveUp = document.createElement('button');
    moveUp.textContent = '↑';
    moveUp.title = getAutomationCardText('moveStepUp', {}, 'Move step up');
    moveUp.disabled = index === 0;
    moveUp.addEventListener('click', () => {
      automation.moveDesignStep(preset.id, step.id, -1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    const moveDown = document.createElement('button');
    moveDown.textContent = '↓';
    moveDown.title = getAutomationCardText('moveStepDown', {}, 'Move step down');
    moveDown.disabled = index === preset.designSteps.length - 1;
    moveDown.addEventListener('click', () => {
      automation.moveDesignStep(preset.id, step.id, 1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    const insertBelow = document.createElement('button');
    insertBelow.textContent = '+';
    insertBelow.title = getAutomationCardText('lifeInsertStepBelow', {}, 'Insert step below');
    insertBelow.disabled = !canInsert;
    insertBelow.addEventListener('click', () => {
      automation.insertDesignStep(preset.id, step.id, 1);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    orderWrap.append(insertAbove, moveUp, moveDown, insertBelow);
    controlWrap.appendChild(orderWrap);
    const removeStep = document.createElement('button');
    removeStep.textContent = '✕';
    removeStep.title = getAutomationCardText('removeStep', {}, 'Remove step');
    removeStep.addEventListener('click', () => {
      automation.removeDesignStep(preset.id, step.id);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    controlWrap.appendChild(removeStep);
    header.appendChild(controlWrap);
    stepCard.appendChild(header);

    const entriesContainer = document.createElement('div');
    entriesContainer.classList.add('automation-step-entries');
    for (let entryIndex = 0; entryIndex < step.entries.length; entryIndex += 1) {
      const entry = step.entries[entryIndex];
      const row = document.createElement('div');
      row.classList.add('automation-entry', 'life-automation-entry');
      let capMode = null;
      let capInput = null;
      let zoneRow = null;

      const rebuildCapModeOptions = (attributeName) => {
        const currentMode = entry.capMode || 'fixed';
        capMode.textContent = '';
        const fixedCapOpt = document.createElement('option');
        fixedCapOpt.value = 'fixed';
        fixedCapOpt.textContent = getAutomationCardText('lifeModeFixedPoints', {}, 'Fixed points');
        capMode.appendChild(fixedCapOpt);
        const uncappedCapOpt = document.createElement('option');
        uncappedCapOpt.value = 'uncapped';
        uncappedCapOpt.textContent = getAutomationCardText('lifeModeUncapped', {}, 'Uncapped');
        capMode.appendChild(uncappedCapOpt);
        if (attributeName !== 'optimalGrowthTemperature') {
          const maxCapOpt = document.createElement('option');
          maxCapOpt.value = 'max';
          maxCapOpt.textContent = getAutomationCardText('lifeModeMaxOut', {}, 'Max');
          capMode.appendChild(maxCapOpt);
          if (attributeName === 'minTemperatureTolerance' || attributeName === 'maxTemperatureTolerance' || attributeName === 'radiationTolerance') {
            const neededCapOpt = document.createElement('option');
            neededCapOpt.value = 'needed';
            neededCapOpt.textContent = getAutomationCardText('lifeModeAsNeeded', {}, 'As needed');
            capMode.appendChild(neededCapOpt);
          }
        }
        capMode.value = currentMode;
        if (capMode.value !== currentMode) {
          capMode.value = 'fixed';
        }
        capInput.disabled = capMode.value !== 'fixed';
        zoneRow.style.display = capMode.value === 'needed' && (attributeName === 'minTemperatureTolerance' || attributeName === 'maxTemperatureTolerance') ? '' : 'none';
      };

      const attributeSelect = document.createElement('select');
      for (let optionIndex = 0; optionIndex < attributeOptions.length; optionIndex += 1) {
        const optionData = attributeOptions[optionIndex];
        const option = document.createElement('option');
        option.value = optionData.value;
        option.textContent = optionData.label;
        option.selected = optionData.value === entry.attribute;
        attributeSelect.appendChild(option);
      }
      attributeSelect.addEventListener('change', (event) => {
        const attributeName = event.target.value;
        automation.updateDesignEntry(preset.id, step.id, entry.id, { attribute: attributeName });
        rebuildCapModeOptions(attributeName);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      row.appendChild(attributeSelect);

      const weightWrapper = document.createElement('div');
      weightWrapper.classList.add('automation-weight');
      const weightLabel = document.createElement('span');
      weightLabel.textContent = getAutomationCardText('shipWeightLabel', {}, 'Weight');
      const weightInput = document.createElement('input');
      weightInput.type = 'text';
      weightInput.min = '0';
      weightInput.value = formatNumber(entry.weight, true, 3);
      wireStringNumberInput(weightInput, {
        parseValue: (value) => {
          const parsed = parseFlexibleNumber(value);
          return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
        },
        formatValue: (value) => {
          return value > 0 ? formatNumber(value, true, 3) : '0';
        },
        onValue: (parsed) => {
          automation.updateDesignEntry(preset.id, step.id, entry.id, { weight: parsed });
          queueAutomationUIRefresh();
        }
      });
      weightWrapper.append(weightLabel, weightInput);
      row.appendChild(weightWrapper);

      const capWrapper = document.createElement('div');
      capWrapper.classList.add('automation-max-wrapper');
      capMode = document.createElement('select');
      capInput = document.createElement('input');
      capInput.type = 'text';
      capInput.placeholder = getAutomationCardText('lifeNoMaxPlaceholder', {}, 'No max');
      capInput.value = entry.cap === null || entry.cap === undefined ? '' : formatNumber(entry.cap, true, 3);
      capMode.addEventListener('change', (event) => {
        const nextMode = event.target.value;
        automation.updateDesignEntry(preset.id, step.id, entry.id, { capMode: nextMode });
        entry.capMode = nextMode;
        capInput.disabled = nextMode !== 'fixed';
        zoneRow.style.display = nextMode === 'needed' && (entry.attribute === 'minTemperatureTolerance' || entry.attribute === 'maxTemperatureTolerance') ? '' : 'none';
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      wireStringNumberInput(capInput, {
        parseValue: (value) => {
          const parsed = parseFlexibleNumber(value);
          if (!Number.isFinite(parsed)) {
            return 0;
          }
          return Math.floor(parsed);
        },
        formatValue: (value) => {
          return value !== 0 ? formatNumber(value, true, 3) : '';
        },
        onValue: (parsed) => {
          automation.updateDesignEntry(preset.id, step.id, entry.id, { cap: parsed === 0 ? null : parsed });
          queueAutomationUIRefresh();
        }
      });
      capWrapper.append(capMode, capInput);
      row.appendChild(capWrapper);

      const spent = document.createElement('span');
      spent.classList.add('life-automation-entry-spend');
      spent.dataset.entryId = String(entry.id);
      spent.textContent = getAutomationCardText('lifeEntrySpendPreview', { count: spendPreview.entries[entry.id] || 0 }, `{count} pts`);
      row.appendChild(spent);

      const remove = document.createElement('button');
      remove.textContent = '✕';
      remove.title = getAutomationCardText('lifeRemoveSubstep', {}, 'Remove substep');
      remove.addEventListener('click', () => {
        automation.removeDesignEntry(preset.id, step.id, entry.id);
        queueAutomationUIRefresh();
        updateAutomationUI();
      });
      row.appendChild(remove);
      entriesContainer.appendChild(row);

      zoneRow = document.createElement('div');
      zoneRow.classList.add('life-automation-zone-row');
      const zoneLabel = document.createElement('span');
      zoneLabel.textContent = getAutomationCardText('lifeIncludeZonesLabel', {}, 'Include zones');
      zoneRow.appendChild(zoneLabel);
      for (let zoneIndex = 0; zoneIndex < zoneOptions.length; zoneIndex += 1) {
        const option = zoneOptions[zoneIndex];
        const label = document.createElement('label');
        label.classList.add('life-automation-zone-option');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!entry.zones[option.key];
        const text = document.createElement('span');
        text.textContent = option.label;
        label.append(checkbox, text);
        checkbox.addEventListener('change', (event) => {
          automation.setDesignStepZone(preset.id, step.id, entry.id, option.key, event.target.checked);
          queueAutomationUIRefresh();
          updateAutomationUI();
        });
        zoneRow.appendChild(label);
      }
      rebuildCapModeOptions(entry.attribute);
      entriesContainer.appendChild(zoneRow);
    }

    const addRow = document.createElement('div');
    addRow.classList.add('automation-add-entry-row');
    const addSelect = document.createElement('select');
    for (let optionIndex = 0; optionIndex < attributeOptions.length; optionIndex += 1) {
      const optionData = attributeOptions[optionIndex];
      const option = document.createElement('option');
      option.value = optionData.value;
      option.textContent = optionData.label;
      addSelect.appendChild(option);
    }
    const addEntryButton = document.createElement('button');
    addEntryButton.textContent = getAutomationCardText('lifeAddSubstepButton', {}, '+ Substep');
    addEntryButton.addEventListener('click', () => {
      automation.addDesignEntry(preset.id, step.id, addSelect.value);
      queueAutomationUIRefresh();
      updateAutomationUI();
    });
    addRow.append(addSelect, addEntryButton);

    stepCard.append(entriesContainer, addRow);
    container.appendChild(stepCard);
  }
}

function updateLifeAutomationSpendPreview(automation, preset, container) {
  const spendPreview = automation.getDesignStepSpends(preset);
  container.querySelectorAll('.life-automation-entry-spend').forEach(span => {
    const entryId = span.dataset.entryId;
    span.textContent = getAutomationCardText(
      'lifeEntrySpendPreview',
      { count: spendPreview.entries[entryId] || 0 },
      `{count} pts`
    );
  });
}
