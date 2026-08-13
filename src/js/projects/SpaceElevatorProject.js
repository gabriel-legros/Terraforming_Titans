(function () {
  const SPACE_ELEVATOR_MODE = 'elevator';
  const SKYHOOK_MODE = 'skyhook';
  const CAPACITY_TARGET_FIXED = 'fixed';
  const CAPACITY_TARGET_WORKERS = 'workers';

  function calculateTetherGeometry(
    gravity,
    radiusMeters,
    spinSeconds,
    specificStrength,
    maximumTaper,
    integrationSteps
  ) {
    if (!(gravity > 0) || !(radiusMeters > 0) || !(spinSeconds > 0)) {
      return { possible: false, reason: 'noSpin' };
    }
    const angularVelocity = 2 * Math.PI / spinSeconds;
    const gravitationalParameter = gravity * radiusMeters * radiusMeters;
    const synchronousRadius = Math.cbrt(
      gravitationalParameter / (angularVelocity * angularVelocity)
    );
    if (!(synchronousRadius > radiusMeters)) {
      return { possible: false, reason: 'synchronousBelowSurface', synchronousRadius };
    }

    const barrierAt = (radius) => gravitationalParameter * (1 / radiusMeters - 1 / radius)
      - 0.5 * angularVelocity * angularVelocity * (radius * radius - radiusMeters * radiusMeters);
    const barrier = barrierAt(synchronousRadius);
    const taper = Math.exp(barrier / specificStrength);
    const step = (synchronousRadius - radiusMeters) / integrationSteps;
    let weightedArea = 0;
    for (let index = 0; index <= integrationSteps; index += 1) {
      const radius = radiusMeters + index * step;
      const area = Math.exp(barrierAt(radius) / specificStrength);
      const weight = index === 0 || index === integrationSteps
        ? 1
        : (index % 2 === 0 ? 2 : 4);
      weightedArea += weight * area;
    }
    return {
      possible: taper <= maximumTaper,
      reason: taper <= maximumTaper ? '' : 'taperTooHigh',
      synchronousRadius,
      synchronousAltitude: synchronousRadius - radiusMeters,
      barrier,
      taper,
      tetherIntegral: weightedArea * step / 3,
    };
  }

  class SpaceElevatorProject extends Project {
    constructor(config, name) {
      super(config, name);
      this.spaceAccessParameters = this.attributes.spaceAccess;
      const tether = this.spaceAccessParameters.tether;
      const referenceWorld = tether.referenceWorld;
      this.referenceTetherIntegral = calculateTetherGeometry(
        referenceWorld.gravity,
        referenceWorld.radiusMeters,
        referenceWorld.spinSeconds,
        tether.traditionalSpecificStrength,
        tether.maximumTaper,
        tether.integrationSteps
      ).tetherIntegral;
      this.constructionMode = SPACE_ELEVATOR_MODE;
      this.lockedConstructionMode = '';
      this.lockedConstructionCost = null;
      this.elevatorCount = 0;
      this.skyhookCount = 0;
      this.expansionProgress = 0;
      this.capacityTargetEnabled = false;
      this.capacityTarget = this.spaceAccessParameters.elevatorCapacity;
      this.capacityTargetMode = CAPACITY_TARGET_FIXED;
      this.capThroughputToCapacity = false;
      this.continuousThreshold = this.spaceAccessParameters.continuousThresholdMs;
      this.elevatorEngineeringCache = null;
      this.spaceAccessUI = null;
    }

    getCompletedInstallationCount() {
      return this.elevatorCount + this.skyhookCount;
    }

    getSpaceAccessCapacity() {
      return this.elevatorCount * this.spaceAccessParameters.elevatorCapacity
        + this.skyhookCount * this.spaceAccessParameters.skyhookCapacity;
    }

    getCapacityForMode(mode = this.getConstructionMode()) {
      return mode === SKYHOOK_MODE
        ? this.spaceAccessParameters.skyhookCapacity
        : this.spaceAccessParameters.elevatorCapacity;
    }

    getConstructionMode() {
      return this.lockedConstructionMode || this.constructionMode;
    }

    setConstructionMode(mode) {
      const selected = mode === SKYHOOK_MODE ? SKYHOOK_MODE : SPACE_ELEVATOR_MODE;
      if (selected === SPACE_ELEVATOR_MODE && !this.getElevatorEngineering().possible) {
        return false;
      }
      this.constructionMode = selected;
      if (!this.isActive && this.expansionProgress === 0) {
        this.lockedConstructionMode = '';
        this.lockedConstructionCost = null;
      }
      return true;
    }

    getRemainingCurrentModeProgress() {
      if (
        this.lockedConstructionMode
        && this.lockedConstructionMode !== this.constructionMode
      ) {
        return Math.max(0, 1 - this.expansionProgress);
      }
      return Infinity;
    }

    hasSignificantEngineeringInputChange(inputs) {
      if (!this.elevatorEngineeringCache) {
        return true;
      }
      const previous = this.elevatorEngineeringCache.inputs;
      if (
        inputs.traditionalSpecificStrength !== previous.traditionalSpecificStrength
        || inputs.superalloySpecificStrength !== previous.superalloySpecificStrength
        || inputs.maximumTaper !== previous.maximumTaper
        || inputs.integrationSteps !== previous.integrationSteps
      ) {
        return true;
      }
      const tolerance = this.spaceAccessParameters.tether.geometryCacheRelativeTolerance;
      for (const key of ['gravity', 'radiusMeters', 'spinSeconds']) {
        const scale = Math.max(Math.abs(previous[key]), Math.abs(inputs[key]), 1);
        if (Math.abs(inputs[key] - previous[key]) > scale * tolerance) {
          return true;
        }
      }
      return false;
    }

    getElevatorEngineering() {
      const celestial = terraforming.celestialParameters;
      const tether = this.spaceAccessParameters.tether;
      const radiusMeters = celestial.radius * 1000;
      const spinSeconds = Math.abs(celestial.spinPeriod) * 3600;
      const inputs = {
        gravity: celestial.gravity,
        radiusMeters,
        spinSeconds,
        traditionalSpecificStrength: tether.traditionalSpecificStrength,
        superalloySpecificStrength: tether.superalloySpecificStrength,
        maximumTaper: tether.maximumTaper,
        integrationSteps: tether.integrationSteps,
      };
      if (!this.hasSignificantEngineeringInputChange(inputs)) {
        return this.elevatorEngineeringCache.result;
      }
      const traditional = calculateTetherGeometry(
        celestial.gravity,
        radiusMeters,
        spinSeconds,
        tether.traditionalSpecificStrength,
        tether.maximumTaper,
        tether.integrationSteps
      );
      if (traditional.possible) {
        const result = {
          ...traditional,
          material: 'traditional',
          integralRatio: traditional.tetherIntegral / this.referenceTetherIntegral,
        };
        this.elevatorEngineeringCache = { inputs, result };
        return result;
      }
      if (traditional.reason !== 'taperTooHigh') {
        const result = { ...traditional, material: '', integralRatio: 0 };
        this.elevatorEngineeringCache = { inputs, result };
        return result;
      }
      const superalloy = calculateTetherGeometry(
        celestial.gravity,
        radiusMeters,
        spinSeconds,
        tether.superalloySpecificStrength,
        tether.maximumTaper,
        tether.integrationSteps
      );
      const result = {
        ...superalloy,
        material: superalloy.possible ? 'superalloy' : '',
        integralRatio: superalloy.possible ? superalloy.tetherIntegral / this.referenceTetherIntegral : 0,
      };
      this.elevatorEngineeringCache = { inputs, result };
      return result;
    }

    getModeBaseCost(mode = this.getConstructionMode()) {
      if (!gameSettings.spaceAccessCapacity) {
        return this.cost;
      }
      if (mode === SKYHOOK_MODE) {
        return this.spaceAccessParameters.skyhookCost;
      }
      const engineering = this.getElevatorEngineering();
      if (!engineering.possible) {
        return { colony: {} };
      }
      const cost = this.spaceAccessParameters.elevatorCost.colony;
      const colony = {
        metal: Math.round(cost.baseMetal + cost.metalPerReferenceTether * engineering.integralRatio),
        electronics: cost.electronics,
        components: cost.components,
      };
      if (engineering.material === 'superalloy') {
        colony.superalloys = Math.round(cost.superalloysPerReferenceTether * engineering.integralRatio);
      }
      return { colony };
    }

    getEffectiveCost() {
      const baseCost = this.getModeBaseCost();
      const effectiveCost = {};
      for (const category in baseCost) {
        effectiveCost[category] = {};
        for (const resource in baseCost[category]) {
          const amount = baseCost[category][resource]
            * this.getEffectiveCostMultiplier(category, resource);
          if (amount > 0) {
            effectiveCost[category][resource] = amount;
          }
        }
        if (!Object.keys(effectiveCost[category]).length) {
          delete effectiveCost[category];
        }
      }
      return effectiveCost;
    }

    calculateCurrentCost() {
      const cost = this.getEffectiveCost();
      if (gameSettings.spaceAccessCapacity) {
        return cost;
      }
      const radiusKm = terraforming.celestialParameters.radius || 0;
      const multiplier = Math.max(radiusKm / EARTH_RADIUS_KM, 1);
      const scaled = {};
      for (const category in cost) {
        scaled[category] = {};
        for (const resource in cost[category]) {
          scaled[category][resource] = cost[category][resource] * multiplier;
        }
      }
      return scaled;
    }

    getScaledCost() {
      return this.lockedConstructionCost || this.calculateCurrentCost();
    }

    getSpeedBoost() {
      if (!gameSettings.spaceAccessCapacity) {
        return 1;
      }
      const workerPotential = Math.max(
        0,
        resources.colony.workers.potential || resources.colony.workers.cap || 0
      );
      return Math.max(1, workerPotential / this.spaceAccessParameters.workersPerCompletion);
    }

    applyDurationEffects(baseDuration, options) {
      const duration = Project.prototype.applyDurationEffects.call(this, baseDuration, options);
      return duration / this.getSpeedBoost();
    }

    isContinuous() {
      return gameSettings.spaceAccessCapacity && this.getEffectiveDuration() < this.continuousThreshold;
    }

    getMaxRepeats() {
      return gameSettings.spaceAccessCapacity ? Infinity : 1;
    }

    showsInResourcesRate() {
      return gameSettings.spaceAccessCapacity && super.showsInResourcesRate();
    }

    hasReachedCapacityTarget() {
      return gameSettings.spaceAccessCapacity
        && this.capacityTargetEnabled
        && this.getSpaceAccessCapacity() >= this.getCapacityTarget();
    }

    getCapacityTarget() {
      if (this.capacityTargetMode === CAPACITY_TARGET_WORKERS) {
        return this.capacityTarget * Math.max(0, resources.colony.workers.potential);
      }
      return this.capacityTarget;
    }

    getRemainingTargetProgress(mode = this.getConstructionMode()) {
      if (!this.capacityTargetEnabled) {
        return Infinity;
      }
      const remainingCapacity = this.getCapacityTarget() - this.getSpaceAccessCapacity();
      if (!(remainingCapacity > 0)) {
        return 0;
      }
      const remainingCompletions = Math.ceil(remainingCapacity / this.getCapacityForMode(mode));
      return Math.max(0, remainingCompletions - this.expansionProgress);
    }

    getWarningState() {
      if (
        gameSettings.spaceAccessCapacity
        && this.getConstructionMode() === SPACE_ELEVATOR_MODE
        && !this.getElevatorEngineering().possible
      ) {
        return {
          blocksStart: true,
          blocksProgress: false,
          message: t(
            'ui.projects.spaceElevator.elevatorImpossible',
            null,
            'A stationary Space Elevator is impossible with available materials and this world spin. Select Skyhook Network.'
          )
        };
      }
      return null;
    }

    canStart() {
      if (!gameSettings.spaceAccessCapacity && this.getCompletedInstallationCount() > 0) {
        return false;
      }
      if (this.hasReachedCapacityTarget()) {
        return false;
      }
      return super.canStart();
    }

    start(resources) {
      if (!this.canStart()) {
        return false;
      }
      if (!this.isPaused && !(this.expansionProgress > 0 && this.lockedConstructionMode)) {
        this.lockedConstructionMode = gameSettings.spaceAccessCapacity
          ? this.constructionMode
          : SPACE_ELEVATOR_MODE;
        this.lockedConstructionCost = this.calculateCurrentCost();
      }
      if (this.isContinuous()) {
        if (!this.isPaused && !this.canAfford(resources)) {
          this.lockedConstructionMode = '';
          this.lockedConstructionCost = null;
          return false;
        }
        this.isActive = true;
        this.isPaused = false;
        this.isCompleted = false;
        this.startingDuration = Infinity;
        this.remainingTime = Infinity;
        return true;
      }
      const started = Project.prototype.start.call(this, resources);
      if (!started) {
        this.lockedConstructionMode = '';
        this.lockedConstructionCost = null;
      }
      return started;
    }

    canAfford(resources) {
      const cost = this.getScaledCost();
      for (const category in cost) {
        for (const resource in cost[category]) {
          if (resources[category][resource].value < cost[category][resource]) {
            return false;
          }
        }
      }
      return true;
    }

    recordCompletions(count, mode = this.getConstructionMode()) {
      if (!(count > 0)) {
        return;
      }
      this.repeatCount += count;
      if (mode === SKYHOOK_MODE) {
        this.skyhookCount += count;
      } else {
        this.elevatorCount += count;
      }
      this.applyCompletionEffect();
    }

    complete() {
      this.isCompleted = true;
      this.isActive = false;
      this.recordCompletions(1, this.getConstructionMode());
      this.lockedConstructionMode = '';
      this.lockedConstructionCost = null;
      if (gameSettings.spaceAccessCapacity) {
        this.resetProject();
      }
    }

    applyCompletionEffect() {
      if (!(this.getCompletedInstallationCount() > 0)) {
        return;
      }
      const effects = gameSettings.spaceAccessCapacity
        ? this.attributes.completionEffect.filter(effect => effect.target === 'building' && effect.targetId === 'spaceMirror')
        : this.attributes.completionEffect;
      effects.forEach(effect => addEffect({ ...effect, sourceId: this }));
    }

    clearCompletionEffects() {
      const source = { sourceId: this };
      for (const id in buildings) {
        buildings[id].removeEffect(source);
      }
      for (const id in projectManager.projects) {
        projectManager.projects[id].removeEffect(source);
      }
    }

    refreshSpaceAccessRules() {
      this.clearCompletionEffects();
      this.isCompleted = !gameSettings.spaceAccessCapacity && this.getCompletedInstallationCount() > 0;
      if (this.getCompletedInstallationCount() > 0) {
        this.applyCompletionEffect();
      }
      this.updateDurationFromEffects();
      projectManager.markUIDirty();
    }

    update(deltaTime) {
      if (!this.isActive || this.isPaused || this.isCompleted || this.isContinuous()) {
        return;
      }
      Project.prototype.update.call(this, deltaTime);
    }

    estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
      if (!this.isContinuous() || !this.isActive) {
        return Project.prototype.estimateProjectCostAndGain.call(
          this,
          deltaTime,
          applyRates,
          productivity,
          accumulatedChanges
        );
      }
      const totals = { cost: {}, gain: {} };
      const duration = this.getEffectiveDuration();
      const requestedProgress = Math.min(
        deltaTime / duration * productivity,
        this.getRemainingTargetProgress(),
        this.getRemainingCurrentModeProgress()
      );
      const cost = this.getScaledCost();
      const progress = this.getAffordableExpansionProgress(
        requestedProgress,
        cost,
        null,
        accumulatedChanges
      );
      totals.cost = this.estimateExpansionCostForProgress(
        cost,
        progress,
        deltaTime,
        accumulatedChanges,
        null,
        { applyRates, sourceLabel: this.getRateSource() }
      );
      return totals;
    }

    applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
      if (!this.isContinuous() || !this.isActive) {
        return;
      }
      const duration = this.getEffectiveDuration();
      const requestedProgress = Math.min(
        deltaTime / duration * productivity,
        this.getRemainingTargetProgress(),
        this.getRemainingCurrentModeProgress()
      );
      const mode = this.getConstructionMode();
      const cost = this.getScaledCost();
      this.applyRequestedExpansionProgress(
        requestedProgress,
        cost,
        accumulatedChanges,
        {
          applyRates: true,
          seconds: deltaTime / 1000,
          rateSourceLabel: this.getRateSource(),
          applyProgress(progress) {
            const total = this.expansionProgress + progress;
            const completions = Math.floor(total);
            this.expansionProgress = total - completions;
            this.recordCompletions(completions, mode);
            if (completions > 0) {
              this.lockedConstructionMode = this.constructionMode;
              this.lockedConstructionCost = null;
              this.lockedConstructionCost = this.calculateCurrentCost();
            }
            if (this.hasReachedCapacityTarget()) {
              this.isActive = false;
              this.manualContinuousRun = false;
              this.lockedConstructionMode = '';
              this.lockedConstructionCost = null;
            }
          }
        }
      );
    }

    renderUI(container) {
      const card = document.createElement('div');
      card.className = 'info-card space-access-card';
      const header = document.createElement('div');
      header.className = 'card-header';
      const title = document.createElement('span');
      title.className = 'card-title';
      title.textContent = t('ui.projects.spaceElevator.summaryTitle', null, 'Space Access');
      header.appendChild(title);
      const body = document.createElement('div');
      body.className = 'card-body space-access-card-body';

      const modeRow = document.createElement('div');
      modeRow.className = 'stat-item space-access-mode-panel';
      const modeCopy = document.createElement('div');
      modeCopy.className = 'space-access-control-copy';
      const modeLabel = document.createElement('span');
      modeLabel.className = 'stat-label';
      modeLabel.id = `${this.name}-construction-mode-label`;
      modeLabel.textContent = t('ui.projects.spaceElevator.constructionMode', null, 'Construction mode');
      const modeHelp = document.createElement('span');
      modeHelp.className = 'space-access-control-help';
      modeHelp.textContent = t(
        'ui.projects.spaceElevator.constructionModeHelp',
        {
          elevatorCapacity: formatNumber(this.spaceAccessParameters.elevatorCapacity, true),
          skyhookCapacity: formatNumber(this.spaceAccessParameters.skyhookCapacity, true),
        },
        'Elevators add {elevatorCapacity} t/s with world-scaled tether costs. Skyhook Networks add {skyhookCapacity} t/s at a fixed cost.'
      );
      const modeSelect = document.createElement('select');
      modeSelect.id = `${this.name}-construction-mode`;
      modeSelect.className = 'automation-select space-access-mode-select';
      modeSelect.setAttribute('aria-labelledby', modeLabel.id);
      const elevatorOption = document.createElement('option');
      elevatorOption.value = SPACE_ELEVATOR_MODE;
      elevatorOption.textContent = t('ui.projects.spaceElevator.elevatorMode', null, 'Space Elevator');
      const skyhookOption = document.createElement('option');
      skyhookOption.value = SKYHOOK_MODE;
      skyhookOption.textContent = t('ui.projects.spaceElevator.skyhookMode', null, 'Skyhook Network');
      modeSelect.append(elevatorOption, skyhookOption);
      modeCopy.append(modeLabel, modeHelp);
      modeRow.append(modeCopy, modeSelect);
      body.appendChild(modeRow);

      const createMetric = (parent, labelText) => {
        const box = document.createElement('div');
        box.className = 'stat-item project-summary-box';
        const label = document.createElement('span');
        label.className = 'stat-label';
        label.textContent = labelText;
        const value = document.createElement('span');
        value.className = 'stat-value';
        box.append(label, value);
        parent.appendChild(box);
        return value;
      };

      const buildGrid = document.createElement('div');
      buildGrid.className = 'stats-grid project-summary-grid space-access-build-grid';
      const capacityValue = createMetric(
        buildGrid,
        t('ui.projects.spaceElevator.totalCapacity', null, 'Total Capacity')
      );
      const expansionRateValue = createMetric(
        buildGrid,
        t('ui.projects.spaceElevator.expansionPerSecond', null, 'Expansion /s')
      );
      const speedBoostValue = createMetric(
        buildGrid,
        t('ui.projects.spaceElevator.speedBoost', null, 'Speed boost')
      );
      const speedBoostInfo = document.createElement('span');
      speedBoostInfo.className = 'info-tooltip-icon';
      speedBoostInfo.innerHTML = '&#9432;';
      attachDynamicInfoTooltip(
        speedBoostInfo,
        t(
          'ui.projects.spaceElevator.speedBoostTooltip',
          { workers: formatNumber(this.spaceAccessParameters.workersPerCompletion, true) },
          'Construction speed is multiplied by max(1, total worker potential / {workers}). The project duration is divided by this multiplier.'
        )
      );
      speedBoostValue.previousElementSibling.appendChild(speedBoostInfo);
      body.appendChild(buildGrid);

      const summaryGrid = document.createElement('div');
      summaryGrid.className = 'stats-grid project-summary-grid space-access-summary-grid';
      const elevatorsValue = createMetric(summaryGrid, t('ui.projects.spaceElevator.elevatorsBuilt', null, 'Elevator Lanes Built'));
      const skyhooksValue = createMetric(summaryGrid, t('ui.projects.spaceElevator.skyhooksBuilt', null, 'Skyhooks Built'));
      const engineeringValue = createMetric(summaryGrid, t('ui.projects.spaceElevator.engineering', null, 'Engineering'));
      body.appendChild(summaryGrid);

      const targetRow = document.createElement('div');
      targetRow.className = 'stat-item space-access-target-panel';
      const targetControls = document.createElement('div');
      targetControls.className = 'space-access-target-controls';
      const targetToggle = document.createElement('div');
      targetToggle.className = 'checkbox-container space-access-target-toggle';
      const targetCheckbox = document.createElement('input');
      targetCheckbox.type = 'checkbox';
      targetCheckbox.id = `${this.name}-capacity-target-enabled`;
      const targetLabel = document.createElement('label');
      targetLabel.htmlFor = targetCheckbox.id;
      targetLabel.textContent = t('ui.projects.spaceElevator.stopAtCapacity', null, 'Stop at total capacity');
      const targetValue = document.createElement('div');
      targetValue.className = 'space-access-target-value';
      const targetInput = document.createElement('input');
      targetInput.type = 'text';
      targetInput.className = 'automation-input space-access-target-input';
      const targetModeSelect = document.createElement('select');
      targetModeSelect.className = 'automation-select space-access-target-mode-select';
      targetModeSelect.setAttribute(
        'aria-label',
        t('ui.projects.spaceElevator.capacityTargetMode', null, 'Capacity target mode')
      );
      const fixedTargetOption = document.createElement('option');
      fixedTargetOption.value = CAPACITY_TARGET_FIXED;
      fixedTargetOption.textContent = t('ui.projects.spaceElevator.capacityTargetFixed', null, 'fixed');
      const workersTargetOption = document.createElement('option');
      workersTargetOption.value = CAPACITY_TARGET_WORKERS;
      workersTargetOption.textContent = t('ui.projects.spaceElevator.capacityTargetWorkers', null, 'x workers');
      targetModeSelect.append(fixedTargetOption, workersTargetOption);
      const targetUnit = document.createElement('span');
      targetUnit.className = 'space-access-target-unit';
      targetUnit.textContent = t('ui.projects.spaceElevator.capacityUnit', null, 't/s');
      targetToggle.append(targetCheckbox, targetLabel);
      targetValue.append(targetInput, targetModeSelect, targetUnit);
      targetControls.append(targetToggle, targetValue);

      const throughputCapToggle = document.createElement('div');
      throughputCapToggle.className = 'checkbox-container space-access-throughput-cap-toggle';
      const throughputCapCheckbox = document.createElement('input');
      throughputCapCheckbox.type = 'checkbox';
      throughputCapCheckbox.id = `${this.name}-cap-throughput`;
      const throughputCapLabel = document.createElement('label');
      throughputCapLabel.htmlFor = throughputCapCheckbox.id;
      throughputCapLabel.textContent = t(
        'ui.projects.spaceElevator.capThroughput',
        null,
        'Cap throughput to capacity'
      );
      const throughputCapInfo = document.createElement('span');
      throughputCapInfo.className = 'info-tooltip-icon';
      throughputCapInfo.innerHTML = '&#9432;';
      attachDynamicInfoTooltip(
        throughputCapInfo,
        t(
          'ui.projects.spaceElevator.capThroughputTooltip',
          null,
          'Proportionally slows continuous spaceship traffic when shared demand exceeds Space Access Capacity. Aerobraking bypass traffic, Teleporters, and Mass Drivers remain uncapped.'
        )
      );
      throughputCapToggle.append(throughputCapCheckbox, throughputCapLabel, throughputCapInfo);
      targetRow.append(targetControls, throughputCapToggle);
      body.appendChild(targetRow);

      const operationsGrid = document.createElement('div');
      operationsGrid.className = 'stats-grid project-summary-grid space-access-operations-grid';
      const throughputValue = createMetric(operationsGrid, t('ui.projects.spaceElevator.activeThroughput', null, 'Active Throughput'));
      const coverageValue = createMetric(operationsGrid, t('ui.projects.spaceElevator.coverage', null, 'Benefit Coverage'));
      body.appendChild(operationsGrid);

      const explanation = document.createElement('p');
      explanation.className = 'space-access-explanation';
      explanation.textContent = t(
        'ui.projects.spaceElevator.capacityTooltip',
        null,
        'Continuous spaceship cargo shares total access capacity. Metal savings and the before/after Space Elevator energy settings scale with coverage.'
      );
      body.appendChild(explanation);
      card.append(header, body);
      container.appendChild(card);

      modeSelect.addEventListener('change', () => {
        this.setConstructionMode(modeSelect.value);
        updateProjectUI(this.name);
      });
      targetCheckbox.addEventListener('change', () => {
        this.capacityTargetEnabled = targetCheckbox.checked;
        if (this.hasReachedCapacityTarget()) {
          this.isActive = false;
        }
        updateProjectUI(this.name);
      });
      wireStringNumberInput(targetInput, {
        datasetKey: 'spaceAccessCapacityTarget',
        parseValue: value => Math.max(0, parseFlexibleNumber(value)),
        formatValue: value => formatNumber(value, false, 2),
        onValue: value => {
          this.capacityTarget = Math.max(0, value);
          if (this.hasReachedCapacityTarget()) {
            this.isActive = false;
          }
          updateProjectUI(this.name);
        }
      });
      targetModeSelect.addEventListener('change', () => {
        this.capacityTargetMode = targetModeSelect.value === CAPACITY_TARGET_WORKERS
          ? CAPACITY_TARGET_WORKERS
          : CAPACITY_TARGET_FIXED;
        if (this.hasReachedCapacityTarget()) {
          this.isActive = false;
        }
        updateProjectUI(this.name);
      });
      throughputCapCheckbox.addEventListener('change', () => {
        this.capThroughputToCapacity = throughputCapCheckbox.checked;
        for (const name in projectManager.projects) {
          const project = projectManager.projects[name];
          if (project instanceof SpaceshipProject) {
            project.clearContinuousExecutionPlanCache();
          }
        }
        invalidateAutomationSettingsCache(this.name);
        updateProjectUI(this.name);
      });

      this.spaceAccessUI = {
        card,
        modeRow,
        modeSelect,
        elevatorOption,
        expansionRateValue,
        speedBoostValue,
        elevatorsValue,
        skyhooksValue,
        capacityValue,
        throughputValue,
        coverageValue,
        engineeringValue,
        targetRow,
        targetCheckbox,
        targetInput,
        targetModeSelect,
        throughputCapCheckbox,
      };
      this.updateUI();
    }

    updateUI() {
      const ui = this.spaceAccessUI;
      if (!ui) {
        return;
      }
      projectElements[this.name].descriptionElement.textContent = gameSettings.spaceAccessCapacity
        ? t(
          'ui.projects.spaceElevator.descriptionCapacity',
          null,
          'Build repeatable, worker-accelerated Elevator lanes or Skyhook Networks. Any completed installation eliminates Space Mirror metal costs. Shared capacity scales the metal savings and before/after Space Elevator energy benefit of continuous spaceship logistics.'
        )
        : t(
          'ui.projects.spaceElevator.descriptionStandard',
          null,
          'Build a planetary tether that eliminates metal costs for Space Mirrors, space mining, resource disposal and export, and spaceship-based Space Storage transfers. It also switches spaceship projects from the before-elevator energy multiplier to the after-elevator multiplier.'
        );
      const enabled = gameSettings.spaceAccessCapacity;
      ui.card.style.display = enabled ? '' : 'none';
      if (!enabled) {
        return;
      }
      const engineering = this.getElevatorEngineering();
      ui.elevatorOption.disabled = !engineering.possible;
      if (!engineering.possible && this.constructionMode === SPACE_ELEVATOR_MODE && !this.isActive && this.expansionProgress === 0) {
        this.constructionMode = SKYHOOK_MODE;
      }
      ui.modeSelect.value = this.constructionMode;
      ui.elevatorsValue.textContent = formatNumber(this.elevatorCount, true);
      ui.skyhooksValue.textContent = formatNumber(this.skyhookCount, true);
      const expansionRate = 1000 / this.getEffectiveDuration();
      ui.expansionRateValue.textContent = formatNumber(expansionRate, true, 3);
      ui.speedBoostValue.textContent = `x${formatNumber(this.getSpeedBoost(), false, 2)}`;
      const capacity = getTotalSpaceAccessCapacity();
      const throughput = getTotalContinuousSpaceAccessThroughput();
      const coverage = getSpaceAccessCoverage();
      ui.capacityValue.textContent = capacity === Infinity
        ? t('ui.projects.spaceElevator.unlimited', null, 'Unlimited')
        : `${formatNumber(capacity, true)} t/s`;
      ui.throughputValue.textContent = `${formatNumber(throughput, true)} t/s`;
      ui.coverageValue.textContent = `${formatNumber(coverage * 100, false, 2)}%`;
      ui.engineeringValue.textContent = engineering.possible
        ? t(
          engineering.material === 'superalloy'
            ? 'ui.projects.spaceElevator.superalloyEngineering'
            : 'ui.projects.spaceElevator.traditionalEngineering',
          { taper: formatNumber(engineering.taper, false, 2) },
          engineering.material === 'superalloy'
            ? 'Superalloy tether, taper {taper}'
            : 'Traditional tether, taper {taper}'
        )
        : t('ui.projects.spaceElevator.skyhookOnly', null, 'Skyhook only');
      ui.targetCheckbox.checked = this.capacityTargetEnabled;
      ui.throughputCapCheckbox.checked = this.capThroughputToCapacity;
      ui.targetModeSelect.value = this.capacityTargetMode;
      if (document.activeElement !== ui.targetInput) {
        ui.targetInput.value = formatNumber(this.capacityTarget, false, 2);
      }
    }

    saveAutomationSettings() {
      return {
        ...super.saveAutomationSettings(),
        constructionMode: this.constructionMode,
        capacityTargetEnabled: this.capacityTargetEnabled === true,
        capacityTarget: this.capacityTarget,
        capacityTargetMode: this.capacityTargetMode,
        capThroughputToCapacity: this.capThroughputToCapacity === true,
      };
    }

    loadAutomationSettings(settings = {}) {
      super.loadAutomationSettings(settings);
      if (Object.prototype.hasOwnProperty.call(settings, 'constructionMode')) {
        this.setConstructionMode(settings.constructionMode);
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'capacityTargetEnabled')) {
        this.capacityTargetEnabled = settings.capacityTargetEnabled === true;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'capacityTarget')) {
        this.capacityTarget = Math.max(0, Number(settings.capacityTarget) || 0);
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'capacityTargetMode')) {
        this.capacityTargetMode = settings.capacityTargetMode === CAPACITY_TARGET_WORKERS
          ? CAPACITY_TARGET_WORKERS
          : CAPACITY_TARGET_FIXED;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'capThroughputToCapacity')) {
        this.capThroughputToCapacity = settings.capThroughputToCapacity === true;
      }
      if (this.hasReachedCapacityTarget()) {
        this.isActive = false;
        this.manualContinuousRun = false;
      }
    }

    saveState() {
      return {
        ...super.saveState(),
        constructionMode: this.constructionMode,
        lockedConstructionMode: this.lockedConstructionMode,
        lockedConstructionCost: this.lockedConstructionCost,
        elevatorCount: this.elevatorCount,
        skyhookCount: this.skyhookCount,
        expansionProgress: this.expansionProgress,
        capacityTargetEnabled: this.capacityTargetEnabled,
        capacityTarget: this.capacityTarget,
        capacityTargetMode: this.capacityTargetMode,
        capThroughputToCapacity: this.capThroughputToCapacity,
      };
    }

    loadState(state) {
      const legacyCompleted = state.isCompleted === true;
      const legacyRepeatCount = state.repeatCount || 0;
      super.loadState(state);
      this.constructionMode = state.constructionMode === SKYHOOK_MODE ? SKYHOOK_MODE : SPACE_ELEVATOR_MODE;
      this.lockedConstructionMode = state.lockedConstructionMode === SKYHOOK_MODE
        ? SKYHOOK_MODE
        : (state.lockedConstructionMode === SPACE_ELEVATOR_MODE ? SPACE_ELEVATOR_MODE : '');
      this.lockedConstructionCost = state.lockedConstructionCost || null;
      this.elevatorCount = state.elevatorCount ?? (legacyCompleted ? Math.max(1, legacyRepeatCount) : legacyRepeatCount);
      this.skyhookCount = state.skyhookCount || 0;
      this.repeatCount = this.elevatorCount + this.skyhookCount;
      this.expansionProgress = Math.max(0, state.expansionProgress || 0);
      this.capacityTargetEnabled = state.capacityTargetEnabled === true;
      this.capacityTarget = Math.max(0, state.capacityTarget ?? this.spaceAccessParameters.elevatorCapacity);
      this.capacityTargetMode = state.capacityTargetMode === CAPACITY_TARGET_WORKERS
        ? CAPACITY_TARGET_WORKERS
        : CAPACITY_TARGET_FIXED;
      this.capThroughputToCapacity = state.capThroughputToCapacity === true;
    }
  }

  ContinuousExpansionProject.applyCapabilityTo(SpaceElevatorProject);
  registerProjectConstructor('SpaceElevatorProject', SpaceElevatorProject);
}());
