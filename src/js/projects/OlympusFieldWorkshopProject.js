class OlympusFieldWorkshopProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.actions = {
      smashRocks: this.createActionState('smashRocks'),
      smeltSand: this.createActionState('smeltSand'),
      smeltScrapMetal: this.createActionState('smeltScrapMetal'),
      assembleComponents: this.createActionState('assembleComponents'),
      assembleAndroid: this.createActionState('assembleAndroid'),
      scavengeElectronics: this.createActionState('scavengeElectronics')
    };
    this.ui = null;
    this.holdTimers = {};
    this.assignedAndroids = 0;
    this.assignmentStep = 1;
    this.continuousActionId = '';
    this.continuousProductivity = 1;
  }

  getText(path, fallback, vars) {
    return t(`ui.projects.olympusFieldWorkshop.${path}`, vars, fallback);
  }

  createActionState(actionId) {
    return {
      id: actionId,
      running: false,
      remaining: 0
    };
  }

  getActionConfig(actionId) {
    const configs = {
      smashRocks: {
        label: this.getText('actions.smashRocks', 'Smash rocks'),
        durationMs: 10000,
        input: { category: 'surface', resource: 'rocks', amount: 10 },
        output: { category: 'surface', resource: 'scrapMetal', amount: 1 }
      },
      smeltSand: {
        label: this.getText('actions.smeltSand', 'Smelt sand'),
        durationMs: 5000,
        input: { category: 'colony', resource: 'silicon', amount: 2 },
        output: { category: 'colony', resource: 'glass', amount: 2 }
      },
      smeltScrapMetal: {
        label: this.getText('actions.smeltScrapMetal', 'Smelt scrap metal'),
        durationMs: 5000,
        input: { category: 'surface', resource: 'scrapMetal', amount: 1 },
        output: { category: 'colony', resource: 'metal', amount: 1 }
      },
      assembleComponents: {
        label: this.getText('actions.assembleComponents', 'Assemble components'),
        durationMs: 30000,
        input: { category: 'colony', resource: 'metal', amount: 5 },
        output: { category: 'colony', resource: 'components', amount: 1 }
      },
      assembleAndroid: {
        label: this.getText('actions.assembleAndroid', 'Assemble android'),
        durationMs: 30000,
        input: { category: 'colony', resource: 'components', amount: 4 },
        extraInput: { category: 'colony', resource: 'electronics', amount: 1 },
        output: { category: 'colony', resource: 'androids', amount: 1 }
      },
      scavengeElectronics: {
        label: this.getText('actions.scavengeElectronics', 'Scavenge for electronics'),
        durationMs: 30000,
        input: null,
        output: { category: 'colony', resource: 'electronics', amount: 1 }
      }
    };
    return configs[actionId];
  }

  getGatherConfig(gatherId) {
    const configs = {
      gatherRocks: {
        labelKey: 'gatherRocks',
        fallback: 'Collect rocks (+{amount})',
        category: 'surface',
        resource: 'rocks',
        amount: 0.2
      },
      gatherSand: {
        labelKey: 'gatherSand',
        fallback: 'Collect sand (+{amount} silica)',
        category: 'colony',
        resource: 'silicon',
        amount: 0.2
      }
    };
    return configs[gatherId];
  }

  getGatherLabel(gatherId) {
    const config = this.getGatherConfig(gatherId);
    return this.getText(config.labelKey, config.fallback, {
      amount: formatNumber(config.amount, true)
    });
  }

  formatActionRecipe(config) {
    const outputResource = resources[config.output.category][config.output.resource];
    const outputText = `${formatNumber(config.output.amount, true)} ${outputResource.displayName}`;
    if (!config.input) {
      return this.getText('recipeProduces', 'Produces: {output}', { output: outputText });
    }
    const inputResource = resources[config.input.category][config.input.resource];
    let inputText = `${formatNumber(config.input.amount, true)} ${inputResource.displayName}`;
    if (config.extraInput) {
      const extraResource = resources[config.extraInput.category][config.extraInput.resource];
      inputText += `, ${formatNumber(config.extraInput.amount, true)} ${extraResource.displayName}`;
    }
    return this.getText('recipeLine', 'Consumes: {input} -> Produces: {output}', {
      input: inputText,
      output: outputText
    });
  }

  enable() {
    super.enable();
    this.applyEffects();
  }

  applyEffects() {
    if (!this.unlocked) {
      return;
    }
    resources.surface.rocks.unlocked = true;
    resources.surface.scrapMetal.unlocked = true;
  }

  isGatherUnlocked(gatherId) {
    return this.isBooleanFlagSet(`olympusWorkshop_${gatherId}`);
  }

  isActionUnlocked(actionId) {
    return this.isBooleanFlagSet(`olympusWorkshop_${actionId}`);
  }

  canAssignAndroids() {
    return this.unlocked && this.isBooleanFlagSet('olympusWorkshop_androidAssist');
  }

  getMaxAssignedAndroids() {
    return 100;
  }

  getAssignableAndroidTotal() {
    return Math.floor(Math.min(resources.colony.androids.value || 0, resources.colony.androids.cap || 0));
  }

  getAvailableAndroids() {
    return Math.max(0, this.getAssignableAndroidTotal() - projectManager.getAssignedAndroids());
  }

  clampAssignedAndroids() {
    const current = Math.max(0, this.assignedAndroids || 0);
    const assignedOther = projectManager.getAssignedAndroids(this);
    const maxForWorkshop = Math.max(0, Math.min(this.getMaxAssignedAndroids(), this.getAssignableAndroidTotal() - assignedOther));
    this.assignedAndroids = Math.min(current, maxForWorkshop);
  }

  getAndroidSpeedMultiplier() {
    return 1 + Math.max(0, this.assignedAndroids || 0);
  }

  getEffectiveActionDuration(actionId) {
    const config = this.getActionConfig(actionId);
    return config.durationMs / this.getAndroidSpeedMultiplier();
  }

  canUseContinuousAction(actionId) {
    return this.isActionUnlocked(actionId) && this.getEffectiveActionDuration(actionId) < 1000;
  }

  usesContinuousWithdrawalProductivity() {
    return !!this.continuousActionId && this.canUseContinuousAction(this.continuousActionId);
  }

  setContinuousAction(actionId, enabled) {
    this.continuousActionId = enabled ? actionId : '';
    if (this.continuousActionId && !this.canUseContinuousAction(this.continuousActionId)) {
      this.continuousActionId = '';
    }
    if (this.continuousActionId) {
      const action = this.actions[this.continuousActionId];
      action.running = false;
      action.remaining = 0;
    }
    this.updateUI();
  }

  assignAndroids(amount) {
    if (!this.canAssignAndroids()) {
      this.assignedAndroids = 0;
      this.updateUI();
      return;
    }
    const current = Math.max(0, this.assignedAndroids || 0);
    const assignedOther = projectManager.getAssignedAndroids(this);
    const maxForWorkshop = Math.max(0, Math.min(this.getMaxAssignedAndroids(), this.getAssignableAndroidTotal() - assignedOther));
    const available = maxForWorkshop - current;
    const adjusted = Math.max(-current, Math.min(amount, available));
    this.assignedAndroids = current + adjusted;
    populationModule.updateWorkerCap();
    this.updateUI();
  }

  setAssignmentStep(step) {
    this.assignmentStep = Math.max(1, Math.min(this.getMaxAssignedAndroids(), Math.round(step || 1)));
    this.updateUI();
  }

  isVisible() {
    return this.unlocked && !this.isPermanentlyDisabled();
  }

  shouldHideStartBar() {
    return true;
  }

  gatherRocks() {
    if (!this.isGatherUnlocked('gatherRocks')) {
      return;
    }
    const config = this.getGatherConfig('gatherRocks');
    resources[config.category][config.resource].increase(config.amount);
    this.updateUI();
  }

  gatherSand() {
    if (!this.isGatherUnlocked('gatherSand')) {
      return;
    }
    const config = this.getGatherConfig('gatherSand');
    resources[config.category][config.resource].increase(config.amount);
    this.updateUI();
  }

  canStartAction(actionId) {
    if (!this.isActionUnlocked(actionId)) {
      return false;
    }
    const action = this.actions[actionId];
    const config = this.getActionConfig(actionId);
    if (!action || !config || action.running) {
      return false;
    }
    if (!config.input) {
      return true;
    }
    const hasInput = resources[config.input.category][config.input.resource].value >= config.input.amount;
    const hasExtraInput = !config.extraInput ||
      resources[config.extraInput.category][config.extraInput.resource].value >= config.extraInput.amount;
    return hasInput && hasExtraInput;
  }

  hasActionResourceShortage(actionId) {
    if (!this.isActionUnlocked(actionId)) {
      return false;
    }
    const action = this.actions[actionId];
    if (!action || action.running) {
      return false;
    }
    const config = this.getActionConfig(actionId);
    if (!config.input) {
      return false;
    }
    if (resources[config.input.category][config.input.resource].value < config.input.amount) {
      return true;
    }
    return !!config.extraInput &&
      resources[config.extraInput.category][config.extraInput.resource].value < config.extraInput.amount;
  }

  startAction(actionId, skipUiUpdate = false) {
    if (!this.canStartAction(actionId)) {
      return false;
    }
    const action = this.actions[actionId];
    const config = this.getActionConfig(actionId);
    if (config.input) {
      resources[config.input.category][config.input.resource].decrease(config.input.amount);
    }
    if (config.extraInput) {
      resources[config.extraInput.category][config.extraInput.resource].decrease(config.extraInput.amount);
    }
    action.running = true;
    action.remaining = config.durationMs;
    if (!skipUiUpdate) {
      this.updateUI();
    }
    return true;
  }

  completeAction(actionId) {
    const action = this.actions[actionId];
    const config = this.getActionConfig(actionId);
    action.running = false;
    action.remaining = 0;
    resources[config.output.category][config.output.resource].increase(config.output.amount);
  }

  estimateCostAndGain(deltaTime = 1000) {
    const totals = { cost: {}, gain: {} };
    if (!this.continuousActionId || !this.canUseContinuousAction(this.continuousActionId)) {
      return totals;
    }
    const config = this.getActionConfig(this.continuousActionId);
    const seconds = deltaTime / 1000;
    if (seconds <= 0) {
      return totals;
    }
    const completionsPerSecond = 1000 / this.getEffectiveActionDuration(this.continuousActionId);
    const addRate = (entry, bucketName) => {
      if (!entry) {
        return;
      }
      if (!totals[bucketName][entry.category]) {
        totals[bucketName][entry.category] = {};
      }
      totals[bucketName][entry.category][entry.resource] =
        (totals[bucketName][entry.category][entry.resource] || 0) + entry.amount * completionsPerSecond * seconds;
    };
    addRate(config.input, 'cost');
    addRate(config.extraInput, 'cost');
    addRate(config.output, 'gain');
    return totals;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.continuousActionId || !this.canUseContinuousAction(this.continuousActionId)) {
      this.shortfallLastTick = false;
      return;
    }
    const config = this.getActionConfig(this.continuousActionId);
    const seconds = deltaTime / 1000;
    if (seconds <= 0) {
      this.shortfallLastTick = false;
      return;
    }
    const desiredRuns = (1000 / this.getEffectiveActionDuration(this.continuousActionId)) * seconds * productivity;
    let actualRuns = desiredRuns;
    const limitRunsByInput = (entry) => {
      if (!entry || entry.amount <= 0) {
        return;
      }
      const pending = accumulatedChanges?.[entry.category]?.[entry.resource] || 0;
      const available = Math.max(0, resources[entry.category][entry.resource].value + pending);
      actualRuns = Math.min(actualRuns, available / entry.amount);
    };
    limitRunsByInput(config.input);
    limitRunsByInput(config.extraInput);
    actualRuns = Math.max(0, actualRuns);
    this.shortfallLastTick = actualRuns < desiredRuns;

    const applyEntry = (entry, sign) => {
      if (!entry || actualRuns <= 0) {
        return;
      }
      const amount = sign * entry.amount * actualRuns;
      if (accumulatedChanges) {
        if (!accumulatedChanges[entry.category]) {
          accumulatedChanges[entry.category] = {};
        }
        accumulatedChanges[entry.category][entry.resource] =
          (accumulatedChanges[entry.category][entry.resource] || 0) + amount;
      } else if (amount < 0) {
        resources[entry.category][entry.resource].decrease(-amount);
      } else {
        resources[entry.category][entry.resource].increase(amount);
      }
      resources[entry.category][entry.resource].modifyRate(
        amount / seconds,
        this.displayName || this.name,
        'project'
      );
    };

    applyEntry(config.input, -1);
    applyEntry(config.extraInput, -1);
    applyEntry(config.output, 1);
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.tickActions(deltaTime);
  }

  tickActions(deltaTime) {
    const speedMultiplier = this.getAndroidSpeedMultiplier();
    if (this.continuousActionId && !this.canUseContinuousAction(this.continuousActionId)) {
      this.continuousActionId = '';
    }
    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      if (this.continuousActionId === actionId) {
        continue;
      }
      const action = this.actions[actionId];
      if (!action.running) {
        continue;
      }
      action.remaining -= deltaTime * speedMultiplier;
      while (action.remaining <= 0) {
        const overflow = -action.remaining;
        this.completeAction(actionId);
        if (this.continuousActionId !== actionId || !this.canStartAction(actionId)) {
          break;
        }
        this.startAction(actionId, true);
        action.remaining -= overflow;
      }
    }
  }

  attachHoldHandlers(button, pressFn, holdKey) {
    button.addEventListener('click', (event) => {
      if (event.detail === 0) {
        return;
      }
      pressFn();
    });
    button.addEventListener('pointerdown', () => {
      this.stopHoldTimer(holdKey);
      this.holdTimers[holdKey] = setInterval(() => {
        pressFn();
      }, 50);
    });
    const clear = () => this.stopHoldTimer(holdKey);
    button.addEventListener('pointerup', clear);
    button.addEventListener('pointercancel', clear);
    button.addEventListener('pointerleave', clear);
  }

  stopHoldTimer(holdKey) {
    const timer = this.holdTimers[holdKey];
    if (!timer) {
      return;
    }
    clearInterval(timer);
    delete this.holdTimers[holdKey];
  }

  renderUI(container) {
    const panel = document.createElement('div');
    panel.classList.add('olympus-workshop-panel');

    const gatherRow = document.createElement('div');
    gatherRow.classList.add('olympus-workshop-gather-row');
    const gatherRockControl = document.createElement('div');
    gatherRockControl.classList.add('olympus-workshop-gather-control');
    const gatherSandControl = document.createElement('div');
    gatherSandControl.classList.add('olympus-workshop-gather-control');
    const gatherRockButton = document.createElement('button');
    gatherRockButton.type = 'button';
    gatherRockButton.classList.add('olympus-workshop-gather-button');
    const gatherSandButton = document.createElement('button');
    gatherSandButton.type = 'button';
    gatherSandButton.classList.add('olympus-workshop-gather-button');
    this.attachHoldHandlers(gatherRockButton, () => this.gatherRocks(), 'rocks');
    this.attachHoldHandlers(gatherSandButton, () => this.gatherSand(), 'sand');
    gatherRockControl.appendChild(gatherRockButton);
    gatherSandControl.appendChild(gatherSandButton);
    gatherRow.append(gatherRockControl, gatherSandControl);

    const androidPanel = document.createElement('div');
    androidPanel.classList.add('olympus-workshop-android-panel');
    const androidHeader = document.createElement('div');
    androidHeader.classList.add('olympus-workshop-android-header');
    const androidTitle = document.createElement('span');
    androidTitle.classList.add('olympus-workshop-android-title');
    const androidSpeed = document.createElement('span');
    androidSpeed.classList.add('olympus-workshop-android-speed');
    androidHeader.append(androidTitle, androidSpeed);

    const androidStats = document.createElement('div');
    androidStats.classList.add('olympus-workshop-android-stats');
    const androidAssigned = document.createElement('span');
    const androidAvailable = document.createElement('span');
    androidStats.append(androidAssigned, androidAvailable);

    const androidControls = document.createElement('div');
    androidControls.classList.add('olympus-workshop-android-controls');
    const zeroButton = this.createAssignmentButton('0', () => this.assignAndroids(-(this.assignedAndroids || 0)));
    const minusButton = this.createAssignmentButton('', () => this.assignAndroids(-this.assignmentStep));
    const plusButton = this.createAssignmentButton('', () => this.assignAndroids(this.assignmentStep));
    const maxButton = this.createAssignmentButton('', () => this.assignAndroids(this.getMaxAssignedAndroids()));
    const divideButton = this.createAssignmentButton('/10', () => this.setAssignmentStep(this.assignmentStep / 10));
    const timesButton = this.createAssignmentButton('x10', () => this.setAssignmentStep(this.assignmentStep * 10));
    androidControls.append(zeroButton, minusButton, plusButton, maxButton, divideButton, timesButton);

    androidPanel.append(androidHeader, androidStats, androidControls);

    const actionsContainer = document.createElement('div');
    actionsContainer.classList.add('olympus-workshop-actions');
    const actionRows = {};
    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      const row = document.createElement('div');
      row.classList.add('olympus-workshop-action-row');
      const topRow = document.createElement('div');
      topRow.classList.add('olympus-workshop-action-top');
      const continuousCheckbox = document.createElement('input');
      continuousCheckbox.type = 'checkbox';
      continuousCheckbox.classList.add('olympus-workshop-continuous-checkbox');
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('olympus-workshop-action-button');
      button.addEventListener('click', () => this.startAction(actionId));
      continuousCheckbox.addEventListener('click', (event) => event.stopPropagation());
      continuousCheckbox.addEventListener('change', () => this.setContinuousAction(actionId, continuousCheckbox.checked));
      const buttonText = document.createElement('span');
      buttonText.classList.add('olympus-workshop-action-button-text');
      button.append(continuousCheckbox, buttonText);
      const status = document.createElement('span');
      status.classList.add('olympus-workshop-action-status');
      topRow.append(button, status);
      const flavor = document.createElement('div');
      flavor.classList.add('olympus-workshop-action-flavor');

      const track = document.createElement('div');
      track.classList.add('olympus-workshop-progress-track');
      const fill = document.createElement('div');
      fill.classList.add('olympus-workshop-progress-fill');
      track.appendChild(fill);

      row.append(topRow, flavor, track);
      actionsContainer.appendChild(row);
      actionRows[actionId] = { container: row, continuousCheckbox, button, buttonText, status, flavor, fill };
    }

    panel.append(gatherRow, androidPanel, actionsContainer);
    container.appendChild(panel);

    this.ui = {
      gatherRockButton,
      gatherSandButton,
      androidPanel,
      androidTitle,
      androidSpeed,
      androidAssigned,
      androidAvailable,
      minusButton,
      plusButton,
      maxButton,
      actionRows
    };
    this.updateUI();
  }

  createAssignmentButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('olympus-workshop-android-button');
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  updateUI() {
    if (!this.ui) {
      return;
    }
    this.ui.gatherRockButton.textContent = this.getGatherLabel('gatherRocks');
    this.ui.gatherRockButton.style.display = this.isGatherUnlocked('gatherRocks') ? '' : 'none';
    this.ui.gatherSandButton.textContent = this.getGatherLabel('gatherSand');
    this.ui.gatherSandButton.style.display = this.isGatherUnlocked('gatherSand') ? '' : 'none';
    this.updateAndroidAssignmentUI();
    if (this.continuousActionId && !this.canUseContinuousAction(this.continuousActionId)) {
      this.continuousActionId = '';
    }

    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      const action = this.actions[actionId];
      const config = this.getActionConfig(actionId);
      const row = this.ui.actionRows[actionId];
      const isUnlocked = this.isActionUnlocked(actionId);
      const canUseContinuous = this.canUseContinuousAction(actionId);
      row.container.style.display = isUnlocked ? '' : 'none';
      row.continuousCheckbox.style.display = canUseContinuous ? '' : 'none';
      row.continuousCheckbox.checked = this.continuousActionId === actionId;
      row.continuousCheckbox.title = this.getText('continuousTooltip', 'Repeat this action automatically while its duration is below 1 second. Only one field action can repeat at a time.');
      row.buttonText.textContent = `${config.label} (${this.formatActionRecipe(config)})`;
      const blocked = this.hasActionResourceShortage(actionId);
      row.container.classList.toggle('olympus-workshop-action-row--blocked', blocked);
      row.button.disabled = !this.canStartAction(actionId);
      row.flavor.textContent = this.getText(`actionFlavor.${actionId}`, this.getActionFlavorFallback(actionId));

      if (this.continuousActionId === actionId) {
        row.fill.style.width = '100%';
        row.status.textContent = this.hasActionResourceShortage(actionId)
          ? this.getText('waiting', 'Waiting')
          : this.getText('continuous', 'Continuous');
      } else if (action.running) {
        const pct = Math.max(0, Math.min(100, ((config.durationMs - action.remaining) / config.durationMs) * 100));
        row.fill.style.width = `${pct}%`;
        const speedMultiplier = this.getAndroidSpeedMultiplier();
        row.status.textContent = this.getText(
          'inProgress',
          '{seconds}s remaining',
          { seconds: formatNumber((action.remaining / speedMultiplier) / 1000, false, 1) }
        );
      } else {
        row.fill.style.width = '0%';
        row.status.textContent = this.getText('ready', 'Ready');
      }
    }
  }

  updateAndroidAssignmentUI() {
    const ui = this.ui;
    const canAssign = this.canAssignAndroids();
    ui.androidPanel.style.display = canAssign ? '' : 'none';
    if (!canAssign) {
      if (this.assignedAndroids > 0) {
        this.assignedAndroids = 0;
      }
      return;
    }
    this.clampAssignedAndroids();
    const speed = this.getAndroidSpeedMultiplier();
    const assigned = Math.max(0, this.assignedAndroids || 0);
    const available = this.getAvailableAndroids();
    ui.androidTitle.textContent = this.getText('android.title', 'Field androids');
    ui.androidSpeed.textContent = this.getText('android.speed', 'Speed x{value}', {
      value: formatNumber(speed, false, 1)
    });
    ui.androidAssigned.textContent = this.getText('android.assigned', 'Assigned: {value}/{max}', {
      value: formatNumber(assigned, true),
      max: formatNumber(this.getMaxAssignedAndroids(), true)
    });
    ui.androidAvailable.textContent = this.getText('android.available', 'Available: {value}', {
      value: formatNumber(available, true)
    });
    ui.minusButton.textContent = `-${formatNumber(this.assignmentStep, true)}`;
    ui.plusButton.textContent = `+${formatNumber(this.assignmentStep, true)}`;
    ui.maxButton.textContent = this.getText('android.max', 'Max');
    ui.minusButton.disabled = assigned <= 0;
    ui.plusButton.disabled = assigned >= this.getMaxAssignedAndroids() || available <= 0;
    ui.maxButton.disabled = assigned >= this.getMaxAssignedAndroids() || available <= 0;
  }

  getActionFlavorFallback(actionId) {
    const fallbacks = {
      smashRocks: 'Flat stones become anvils. Bigger stones become hammers.',
      smeltSand: 'A crude furnace turns beach grit into something clear enough to build with.',
      smeltScrapMetal: 'Every bent fragment is one step back toward a usable frame.',
      assembleComponents: 'Hand-fitted parts are slow, but they still count.',
      assembleAndroid: 'The frame is crude. The hands will still help.',
      scavengeElectronics: 'Broken panels and dead instruments still have useful circuits inside.'
    };
    return fallbacks[actionId] || '';
  }

  saveState() {
    const savedActions = {};
    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      const action = this.actions[actionId];
      savedActions[actionId] = {
        running: action.running === true,
        remaining: action.remaining || 0
      };
    }
    return {
      ...super.saveState(),
      workshopActions: savedActions,
      assignedAndroids: this.assignedAndroids || 0,
      assignmentStep: this.assignmentStep || 1,
      continuousActionId: this.continuousActionId || ''
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.applyEffects();
    this.assignedAndroids = Math.max(0, Math.min(this.getMaxAssignedAndroids(), state.assignedAndroids || 0));
    this.assignmentStep = Math.max(1, Math.min(this.getMaxAssignedAndroids(), state.assignmentStep || 1));
    this.continuousActionId = this.actions[state.continuousActionId] ? state.continuousActionId : '';
    const savedActions = state.workshopActions || {};
    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      const action = this.actions[actionId];
      const saved = savedActions[actionId] || {};
      action.running = saved.running === true;
      action.remaining = saved.remaining || 0;
      if (action.running && action.remaining <= 0) {
        action.running = false;
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.OlympusFieldWorkshopProject = OlympusFieldWorkshopProject;
}
