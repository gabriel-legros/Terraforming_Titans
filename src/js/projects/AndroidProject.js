class AndroidProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.assignedAndroids = 0;
    this.autoAssignAndroids = false;
    this.autoAssignAndroidPercent = 100;
    this.assignmentMultiplier = 1;
    this.continuousThreshold = config.continuousThreshold || 1000; // Duration threshold in ms below which project becomes continuous
    this.shortfallLastTick = false;
  }

  isContinuous() {
    const baseDuration = this.getEffectiveDuration();
    return baseDuration < this.continuousThreshold && this.assignedAndroids > 0;
  }

  adjustActiveDuration() {
    const wasContinuous = this.remainingTime === Infinity;
    const nowContinuous = this.isContinuous();
    const hasProgress = this.isActive
      && Number.isFinite(this.startingDuration)
      && Number.isFinite(this.remainingTime)
      && this.startingDuration > 0;
    const progressRatio = hasProgress
      ? (this.startingDuration - this.remainingTime) / this.startingDuration
      : 0;

    if (this.isActive && wasContinuous !== nowContinuous) {
      if (nowContinuous) {
        this.onEnterContinuousMode?.(progressRatio);
        this.startingDuration = Infinity;
        this.remainingTime = Infinity;
      } else {
        // Transitioning from continuous to discrete mode
        // If we can start (have androids assigned), restart in discrete mode
        // Otherwise, just stop the project
        this.isActive = false;
        this.isCompleted = false;
        this.isPaused = false;
        
        if (this.canStart()) {
          const duration = this.getEffectiveDuration();
          this.startingDuration = duration;
          this.remainingTime = duration;
          this.start(resources);
        }
      }
    } else if (this.isActive) {
      const newDuration = this.getEffectiveDuration();
      this.startingDuration = newDuration;
      this.remainingTime = newDuration * (1 - progressRatio);
    }
  }

  assignAndroids(count) {
    const total = Math.floor(resources.colony.androids.value);
    const assignedOther = (typeof projectManager !== 'undefined' && typeof projectManager.getAssignedAndroids === 'function') ? projectManager.getAssignedAndroids(this) : 0;
    const maxForThisProject = total - assignedOther;
    this.assignedAndroids = this.assignedAndroids || 0;
    const available = maxForThisProject - this.assignedAndroids;
    const adjusted = Math.max(-this.assignedAndroids, Math.min(count, available));
    this.assignedAndroids += adjusted;
    this.adjustActiveDuration();
    if (typeof populationModule !== 'undefined' && typeof populationModule.updateWorkerCap === 'function') {
      populationModule.updateWorkerCap();
    }
    if (typeof updateProjectUI === 'function') {
      updateProjectUI(this.name);
    }
  }

  getAndroidSpeedMultiplier() {
    const mineCount = Math.max((buildings?.oreMine?.count || 0), 1);
    return 1 + Math.sqrt(this.assignedAndroids / mineCount);
  }

  getBaseDuration() {
    if (this.isBooleanFlagSet('androidAssist')) {
      const multiplier = this.getAndroidSpeedMultiplier();
      if (multiplier > 1) {
        return this.duration / multiplier;
      }
    }
    return super.getBaseDuration();
  }

  canStart() {
    if (this.isContinuous()) {
      const cost = this.getScaledCost();
      for (const category in cost) {
        for (const resource in cost[category]) {
          if (resources[category][resource].value < cost[category][resource]) {
            return false;
          }
        }
      }
      return this.unlocked && !this.isPermanentlyDisabled() && !this.isActive;
    }
    return super.canStart();
  }

  start(resources) {
    const started = super.start(resources);
    if (!started) return false;

    if (this.isContinuous()) {
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
    }

    return true;
  }

  update(deltaTime) {
    if (this.isPermanentlyDisabled()) {
      this.isActive = false;
      this.isPaused = false;
      return;
    }
    if (!this.isActive || this.isCompleted || this.isPaused) return;

    if (this.isContinuous()) {
      // Continuous mode is handled by applyCostAndGain
      return;
    }

    super.update(deltaTime);
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    const totals = { cost: {}, gain: {} };
    if (!this.isActive) return totals;

    if (this.isContinuous()) {
      const duration = this.getEffectiveDuration();
      const rate = 1000 / duration;
      const cost = this.getScaledCost();
      
      for (const category in cost) {
        if (!totals.cost[category]) totals.cost[category] = {};
        for (const resource in cost[category]) {
          const rateValue = cost[category][resource] * rate * (applyRates ? productivity : 1);
          if (applyRates && resources[category]?.[resource]) {
            resources[category][resource].modifyRate(
              -rateValue,
              this.displayName,
              'project'
            );
          }
          totals.cost[category][resource] =
            (totals.cost[category][resource] || 0) + cost[category][resource] * (deltaTime / duration);
        }
      }
      return totals;
    }

    return super.estimateProjectCostAndGain(deltaTime, applyRates, productivity);
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) return;
    if (!this.canContinue()) {
      this.isActive = false;
      return;
    }

    this.shortfallLastTick = false;
    const duration = this.getEffectiveDuration();
    const fraction = deltaTime / duration;
    const cost = this.getScaledCost();

    let shortfall = false;
    for (const category in cost) {
      for (const resource in cost[category]) {
        const amount = cost[category][resource] * fraction * productivity;
        const available = resources[category]?.[resource]?.value || 0;
        if (available < amount) {
          shortfall = true;
        }
        if (accumulatedChanges) {
          if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
          if (accumulatedChanges[category][resource] === undefined) {
            accumulatedChanges[category][resource] = 0;
          }
          accumulatedChanges[category][resource] -= amount;
        } else {
          const res = resources[category]?.[resource];
          if (res && typeof res.decrease === 'function') {
            res.decrease(amount);
          }
        }
      }
    }

    // Apply progress proportionally - subclasses can override this
    this.applyContinuousProgress(fraction, productivity);

    this.shortfallLastTick = shortfall;
  }

  // Override in subclasses to define what happens when continuous progress is made
  applyContinuousProgress(fraction, productivity) {
    // Default: increment repeat count fractionally (for projects that use repeatCount)
    // Subclasses like DeeperMiningProject override this to increment averageDepth instead
  }

  // Override in subclasses to check if the project can continue (e.g., max depth reached)
  canContinue() {
    return true;
  }

  createAndroidAssignmentUI(container) {
    const sectionContainer = document.createElement('div');
    sectionContainer.classList.add('project-section-container', 'android-assignment-section');

    const headerRow = document.createElement('div');
    headerRow.classList.add('android-assignment-headers');
    const androidHeader = document.createElement('div');
    androidHeader.textContent = 'Androids';
    const controlsHeader = document.createElement('div');
    controlsHeader.textContent = 'Controls';
    const autoHeader = document.createElement('div');
    autoHeader.textContent = 'Auto';
    const speedHeader = document.createElement('div');
    speedHeader.textContent = this.getAndroidSpeedLabelText();
    headerRow.append(androidHeader, controlsHeader, autoHeader, speedHeader);
    sectionContainer.appendChild(headerRow);

    const assignmentContainer = document.createElement('div');
    assignmentContainer.classList.add('spaceship-assignment-container', 'android-assignment-container');

    const assignedAndAvailableContainer = document.createElement('div');
    assignedAndAvailableContainer.classList.add('assigned-and-available-container', 'android-assigned-and-available');

    const assignedContainer = document.createElement('div');
    assignedContainer.classList.add('assigned-ships-container');
    const assignedLabel = document.createElement('span');
    assignedLabel.textContent = 'Assigned:';
    const assignedDisplay = document.createElement('span');
    assignedDisplay.id = `${this.name}-assigned-androids`;
    assignedContainer.append(assignedLabel, assignedDisplay);

    const availableContainer = document.createElement('div');
    availableContainer.classList.add('available-ships-container');
    const availableLabel = document.createElement('span');
    availableLabel.textContent = 'Available:';
    const availableDisplay = document.createElement('span');
    availableDisplay.id = `${this.name}-available-androids`;
    availableContainer.append(availableLabel, availableDisplay);

    assignedAndAvailableContainer.append(assignedContainer, availableContainer);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container', 'android-controls-container');

    const createButton = (text, onClick, parent = buttonsContainer) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.addEventListener('click', onClick);
      parent.appendChild(button);
      return button;
    };

    const mainButtons = document.createElement('div');
    mainButtons.classList.add('main-buttons');
    buttonsContainer.appendChild(mainButtons);

    createButton('0', () => this.assignAndroids(-this.assignedAndroids), mainButtons);
    const minusButton = createButton(`-${formatNumber(this.assignmentMultiplier, true)}`, () => this.assignAndroids(-this.assignmentMultiplier), mainButtons);
    const plusButton = createButton(`+${formatNumber(this.assignmentMultiplier, true)}`, () => this.assignAndroids(this.assignmentMultiplier), mainButtons);
    createButton('Max', () => {
      const max = Math.floor(resources.colony.androids.value - ((typeof projectManager !== 'undefined' && typeof projectManager.getAssignedAndroids === 'function') ? projectManager.getAssignedAndroids(this) : 0));
      this.assignAndroids(max);
    }, mainButtons);

    const multiplierContainer = document.createElement('div');
    multiplierContainer.classList.add('multiplier-container');
    buttonsContainer.appendChild(multiplierContainer);

    createButton('/10', () => {
      this.assignmentMultiplier = Math.max(1, this.assignmentMultiplier / 10);
      minusButton.textContent = `-${formatNumber(this.assignmentMultiplier, true)}`;
      plusButton.textContent = `+${formatNumber(this.assignmentMultiplier, true)}`;
    }, multiplierContainer);
    createButton('x10', () => {
      this.assignmentMultiplier *= 10;
      minusButton.textContent = `-${formatNumber(this.assignmentMultiplier, true)}`;
      plusButton.textContent = `+${formatNumber(this.assignmentMultiplier, true)}`;
    }, multiplierContainer);

    const autoAssignContainer = document.createElement('div');
    autoAssignContainer.classList.add('android-auto-assign-container');
    const autoAssignCheckbox = document.createElement('input');
    autoAssignCheckbox.type = 'checkbox';
    autoAssignCheckbox.id = `${this.name}-auto-assign-androids`;
    autoAssignCheckbox.checked = this.autoAssignAndroids;
    const autoAssignLabel = document.createElement('label');
    autoAssignLabel.htmlFor = autoAssignCheckbox.id;
    autoAssignLabel.textContent = 'Auto';
    const autoAssignInput = document.createElement('input');
    autoAssignInput.type = 'text';
    autoAssignInput.inputMode = 'decimal';
    autoAssignInput.min = '0';
    autoAssignInput.max = '100';
    autoAssignInput.step = '0.01';
    const initialAutoAssign = this.autoAssignAndroidPercent || 0;
    autoAssignInput.value = String(initialAutoAssign);
    autoAssignInput.classList.add('android-auto-assign-input');
    const autoAssignSuffix = document.createElement('span');
    autoAssignSuffix.textContent = '% of androids';
    autoAssignContainer.append(autoAssignCheckbox, autoAssignLabel, autoAssignInput, autoAssignSuffix);

    const speedContainer = document.createElement('div');
    speedContainer.classList.add('android-speed-container');
    const speedRow = document.createElement('div');
    speedRow.classList.add('android-speed-row');
    const speedDisplay = document.createElement('span');
    speedDisplay.id = `${this.name}-android-speed`;
    speedDisplay.classList.add('android-speed-value');
    speedDisplay.title = this.getAndroidSpeedTooltip();
    speedRow.append(speedDisplay);
    speedContainer.append(speedRow);

    assignmentContainer.append(assignedAndAvailableContainer, buttonsContainer, autoAssignContainer, speedContainer);
    sectionContainer.appendChild(assignmentContainer);
    sectionContainer.id = `${this.name}-android-assignment`;
    sectionContainer.style.display = this.isBooleanFlagSet('androidAssist') ? 'block' : 'none';
    container.appendChild(sectionContainer);

    projectElements[this.name] = {
      ...projectElements[this.name],
      assignedAndroidsDisplay: assignedDisplay,
      availableAndroidsDisplay: availableDisplay,
      androidAssignmentContainer: sectionContainer,
      autoAssignAndroidCheckbox: autoAssignCheckbox,
      autoAssignAndroidInput: autoAssignInput,
      androidSpeedDisplay: speedDisplay,
    };

    autoAssignCheckbox.addEventListener('change', () => {
      this.autoAssignAndroids = autoAssignCheckbox.checked;
      this.autoAssign();
      updateProjectUI(this.name);
    });
    wireStringNumberInput(autoAssignInput, {
      datasetKey: 'autoAssignAndroidPercent',
      parseValue: (value) => {
        const numeric = parseFlexibleNumber(value) || 0;
        const clamped = Math.min(100, Math.max(0, numeric));
        return Math.round(clamped * 100) / 100;
      },
      formatValue: (parsed) => String(parsed),
      onValue: (parsed) => {
        this.autoAssignAndroidPercent = parsed;
        if (this.autoAssignAndroids) {
          this.autoAssign();
        }
        updateProjectUI(this.name);
      },
    });
    autoAssignInput.dataset.autoAssignAndroidPercent = String(initialAutoAssign);
  }

  renderUI(container) {
    this.createAndroidAssignmentUI(container);
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements) return;
    if (elements.androidAssignmentContainer) {
      elements.androidAssignmentContainer.style.display = this.isBooleanFlagSet('androidAssist') ? 'block' : 'none';
    }
    elements.assignedAndroidsDisplay.textContent = formatNumber(this.assignedAndroids, true);
    const avail = Math.floor(resources.colony.androids.value - projectManager.getAssignedAndroids());
    elements.availableAndroidsDisplay.textContent = formatNumber(avail, true);
    elements.autoAssignAndroidCheckbox.checked = this.autoAssignAndroids;
    const percent = this.autoAssignAndroidPercent || 0;
    elements.autoAssignAndroidInput.dataset.autoAssignAndroidPercent = String(percent);
    if (document.activeElement !== elements.autoAssignAndroidInput) {
      elements.autoAssignAndroidInput.value = String(percent);
    }
    elements.androidSpeedDisplay.title = this.getAndroidSpeedTooltip();
    elements.androidSpeedDisplay.textContent = this.getAndroidSpeedDisplayText();
  }

  autoAssign() {
    if (!this.autoAssignAndroids) return;
    const total = Math.floor(resources.colony.androids.value);
    const assignedOther = projectManager.getAssignedAndroids(this);
    const maxForThisProject = Math.max(0, total - assignedOther);
    const target = Math.min(Math.floor(total * (this.autoAssignAndroidPercent / 100)), maxForThisProject);
    const delta = target - this.assignedAndroids;
    if (delta) {
      this.assignAndroids(delta);
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      assignedAndroids: this.assignedAndroids,
      autoAssignAndroids: this.autoAssignAndroids,
      autoAssignAndroidPercent: this.autoAssignAndroidPercent,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.assignedAndroids = state.assignedAndroids || 0;
    this.autoAssignAndroids = state.autoAssignAndroids || 0;
    this.autoAssignAndroidPercent = Number(state.autoAssignAndroidPercent ?? 100) || 0;
  }

  saveTravelState() {
    if (!gameSettings.preserveProjectSettingsOnTravel) {
      return {};
    }
    return {
      autoAssignAndroids: this.autoAssignAndroids,
      autoAssignAndroidPercent: this.autoAssignAndroidPercent,
      assignmentMultiplier: this.assignmentMultiplier,
    };
  }

  loadTravelState(state = {}) {
    if (!gameSettings.preserveProjectSettingsOnTravel) {
      return;
    }
    this.autoAssignAndroids = state.autoAssignAndroids === true;
    this.autoAssignAndroidPercent = state.autoAssignAndroidPercent ?? this.autoAssignAndroidPercent;
    this.assignmentMultiplier = state.assignmentMultiplier ?? this.assignmentMultiplier;
  }

  getAndroidSpeedDisplayText() {
    const mult = this.getAndroidSpeedMultiplier();
    return `x${formatNumber(mult, true)}`;
  }

  getAndroidSpeedTooltip() {
    return '1 + sqrt(androids assigned / ore mines built)';
  }

  getAndroidSpeedLabelText() {
    return 'Speed boost';
  }
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.AndroidProject = AndroidProject;
}

if (typeof module !== 'undefined') {
  module.exports = AndroidProject;
}
