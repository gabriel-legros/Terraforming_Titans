function getHephaestusText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

let HephaestusContinuousExpansionBase = null;
try {
  HephaestusContinuousExpansionBase = ContinuousExpansionProject;
} catch (error) {}
try {
  HephaestusContinuousExpansionBase = require('./ContinuousExpansionProject.js');
} catch (error) {}
try {
  HephaestusContinuousExpansionBase = HephaestusContinuousExpansionBase || TerraformingDurationProject;
} catch (error) {}

class HephaestusMegaconstructionProject extends HephaestusContinuousExpansionBase {
  constructor(config, name) {
    super(config, name);
    this.continuousThreshold = 1000;
    this.fractionalRepeatCount = 0;
    this.yardAssignments = {};
    this.assignmentStep = 1;
    this.autoAssignFlags = {};
    this.autoAssignWeights = {};
    this.shortfallLastTick = false;
    const dummyText = { textContent: '' };
    const dummyButton = { textContent: '', disabled: false };
    const dummyWrapper = { style: { display: '' } };
    const rowElements = {};
    ['dysonSwarmReceiver', 'dysonSphere', 'spaceStorage', 'lifters', 'nuclearAlchemyFurnace', 'superalloyGigafoundry', name].forEach((key) => {
      rowElements[key] = {
        wrapper: dummyWrapper,
        value: dummyText,
        minusButton: dummyButton,
        plusButton: dummyButton,
        zeroButton: dummyButton,
        maxButton: dummyButton,
        autoAssign: { checked: false, disabled: false },
        weightInput: { value: '1', disabled: false },
        buttons: [dummyButton, dummyButton, dummyButton, dummyButton]
      };
    });
    this.uiElements = {
      totalValue: dummyText,
      freeValue: dummyText,
      assignedValue: dummyText,
      rowElements,
      stepValue: dummyText,
      stepDownButton: dummyButton,
      stepUpButton: dummyButton,
      assignmentGrid: dummyWrapper
    };
  }

  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.duration);
  }

  getExpansionProgressField() {
    return 'fractionalRepeatCount';
  }

  getTotalYards() {
    return this.repeatCount;
  }

  getActiveDysonKey() {
    const sphere = projectManager.projects.dysonSphere;
    if (sphere.isVisible() || sphere.unlocked || sphere.isCompleted || sphere.collectors > 0) {
      return 'dysonSphere';
    }
    return 'dysonSwarmReceiver';
  }

  getInactiveDysonKey() {
    return this.getActiveDysonKey() === 'dysonSphere' ? 'dysonSwarmReceiver' : 'dysonSphere';
  }

  getAllAssignableKeys() {
    return ['dysonSwarmReceiver', 'dysonSphere', 'spaceStorage', 'lifters', 'nuclearAlchemyFurnace', 'superalloyGigafoundry'];
  }

  shouldShowNuclearAlchemyTarget() {
    const project = projectManager?.projects?.nuclearAlchemyFurnace;
    if (!project) {
      return false;
    }
    return project.unlocked || project.isActive || project.repeatCount > 0;
  }

  shouldShowSuperalloyGigafoundryTarget() {
    const project = projectManager?.projects?.superalloyGigafoundry;
    if (!project) {
      return false;
    }
    return project.unlocked || project.isActive || project.repeatCount > 0;
  }

  getOptionalAssignmentKeys() {
    const keys = [];
    if (this.shouldShowNuclearAlchemyTarget()) {
      keys.push('nuclearAlchemyFurnace');
    }
    if (this.shouldShowSuperalloyGigafoundryTarget()) {
      keys.push('superalloyGigafoundry');
    }
    return keys;
  }

  getAssignmentKeys() {
    return [this.getActiveDysonKey(), 'spaceStorage', 'lifters'].concat(this.getOptionalAssignmentKeys());
  }

  normalizeAssignments() {
    const activeDyson = this.getActiveDysonKey();
    const inactiveDyson = this.getInactiveDysonKey();
    const inactiveValue = this.yardAssignments[inactiveDyson] || 0;
    if (inactiveValue > 0) {
      this.yardAssignments[activeDyson] = (this.yardAssignments[activeDyson] || 0) + inactiveValue;
    }
    this.yardAssignments[inactiveDyson] = 0;

    const keys = this.getAssignmentKeys();
    // Keep assignments for temporarily hidden optional targets (for example,
    // Nuclear Alchemy during load/travel sequencing) so saved auto-assign
    // flags and yard allocations are restored once that target is visible.
    const total = this.getTotalYards();
    const activeKey = this.getActiveDysonKey();
    let usedManual = 0;

    keys.forEach((key) => {
      if (key === 'dysonSwarmReceiver' || key === 'dysonSphere') {
        const targetKey = key === activeKey ? key : activeKey;
        this.autoAssignFlags[targetKey] = this.autoAssignFlags[targetKey] || false;
      }
      if (this.autoAssignFlags[key]) {
        this.yardAssignments[key] = Math.max(0, this.yardAssignments[key] || 0);
        return;
      }
      const value = Math.max(0, Math.floor(this.yardAssignments[key] || 0));
      this.yardAssignments[key] = value;
      usedManual += value;
    });

    if (this.autoAssignFlags['dysonSwarmReceiver'] || this.autoAssignFlags['dysonSphere']) {
      if (activeKey === 'dysonSphere') {
        this.autoAssignFlags.dysonSwarmReceiver = false;
      } else {
        this.autoAssignFlags.dysonSphere = false;
      }
    }

    const autoKeys = keys.filter((key) => this.autoAssignFlags[key]);
    const remaining = Math.max(0, total - usedManual);
    if (autoKeys.length > 0) {
      let totalWeight = 0;
      const weights = {};
      autoKeys.forEach((key) => {
        const weight = Math.max(0, Number(this.autoAssignWeights[key] || 1));
        this.autoAssignWeights[key] = weight || 0;
        weights[key] = weight || 0;
        totalWeight += weight || 0;
      });

      if (!totalWeight) {
        autoKeys.forEach((key) => {
          this.yardAssignments[key] = 0;
        });
      } else {
        const remainders = [];
        let assigned = 0;
        autoKeys.forEach((key) => {
          const exact = remaining * (weights[key] / totalWeight);
          const floorVal = Math.floor(exact);
          this.yardAssignments[key] = floorVal;
          assigned += floorVal;
          remainders.push({ key, remainder: exact - floorVal });
        });

        let leftover = remaining - assigned;
        remainders.sort((a, b) => b.remainder - a.remainder);
        for (let i = 0; i < remainders.length && leftover > 0; i++) {
          this.yardAssignments[remainders[i].key] += 1;
          leftover -= 1;
        }
      }
    }

    const totalAssigned = keys.reduce((sum, key) => sum + (this.yardAssignments[key] || 0), 0);
    if (totalAssigned > total && autoKeys.length === 0) {
      let excess = totalAssigned - total;
      for (let i = keys.length - 1; i >= 0 && excess > 0; i--) {
        const key = keys[i];
        const current = this.yardAssignments[key];
        const reduction = Math.min(current, excess);
        this.yardAssignments[key] = current - reduction;
        excess -= reduction;
      }
    }
  }

  getAssignedTotal() {
    this.normalizeAssignments();
    return this.getAssignmentKeys().reduce(
      (sum, key) => sum + (this.yardAssignments[key] || 0),
      0
    );
  }

  getAvailableYards() {
    const total = this.getTotalYards();
    const assigned = this.getAssignedTotal();
    return Math.max(0, total - assigned);
  }

  setAssignmentStep(step) {
    const next = Math.min(1e30, Math.max(1, Math.round(step)));
    this.assignmentStep = next;
  }

  setAutoAssignTarget(key, enabled) {
    this.autoAssignFlags[key] = enabled === true;
    this.normalizeAssignments();
    this.applyYardEffects();
    this.updateUI();
    this.refreshProjectUI();
  }

  adjustAssignment(key, delta) {
    if (this.autoAssignFlags[key]) {
      return;
    }
    this.normalizeAssignments();
    const keys = this.getAssignmentKeys();
    const total = this.getTotalYards();
    const current = this.yardAssignments[key] || 0;
    const usedOther = keys.reduce((sum, otherKey) => {
      if (otherKey === key) return sum;
      if (this.autoAssignFlags[otherKey]) return sum;
      return sum + (this.yardAssignments[otherKey] || 0);
    }, 0);
    const maxForKey = Math.max(0, total - usedOther);
    const next = Math.min(maxForKey, Math.max(0, current + delta));
    this.yardAssignments[key] = next;
    this.normalizeAssignments();
    this.applyYardEffects();
    this.updateUI();
    this.refreshProjectUI();
  }

  applyContinuousProgress(progress) {
    return this.applyExpansionProgress(progress, {
      progressField: 'fractionalRepeatCount',
      completeOnCap: false,
      deactivateOnCap: false
    }).completedDelta;
  }

  getExpansionRateSourceLabel() {
    return 'Hephaestus Yard expansion';
  }

  applyYardEffects() {
    this.normalizeAssignments();
    const targets = this.getAllAssignableKeys();
    const activeKeySet = new Set(this.getAssignmentKeys());

    targets.forEach((key) => {
      const project = projectManager.projects[key];
      if (!project) {
        return;
      }
      const assigned = activeKeySet.has(key) ? (this.yardAssignments[key] || 0) : 0;
      project.addAndReplace({
        type: 'effectiveTerraformedWorlds',
        value: assigned,
        effectId: `${this.name}-yard-${key}`,
        sourceId: this.name,
        name: this.displayName
      });
    });
  }

  syncContinuousState() {
    if (!this.isActive) {
      return;
    }
    const nowContinuous = this.isContinuous();
    const wasContinuous = this.startingDuration === Infinity;

    if (nowContinuous && !wasContinuous) {
      this.carryDiscreteExpansionProgress({
        progressField: 'fractionalRepeatCount',
        completeOnCap: false,
        deactivateOnCap: false
      });
      return;
    }

    if (!nowContinuous && wasContinuous) {
      this.isActive = false;
      this.isPaused = false;
      this.isCompleted = false;
      const duration = this.getEffectiveDuration();
      this.startingDuration = duration;
      this.remainingTime = duration;
      return;
    }

    if (!nowContinuous) {
      const ratio = this.startingDuration > 0
        ? (this.startingDuration - this.remainingTime) / this.startingDuration
        : 0;
      const duration = this.getEffectiveDuration();
      this.startingDuration = duration;
      this.remainingTime = duration * (1 - ratio);
    }
  }

  start(resources) {
    return this.startContinuousExpansion(resources);
  }

  update(deltaTime) {
    this.applyYardEffects();
    if (this.isActive) {
      this.syncContinuousState();
    }
    if (this.isContinuous()) {
      return;
    }
    super.update(deltaTime);
  }

  applyExpansionCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) return;

    this.shortfallLastTick = false;
    const progressOptions = {
      progressField: 'fractionalRepeatCount',
      completeOnCap: false,
      deactivateOnCap: false
    };
    const tick = this.getContinuousExpansionTickState(deltaTime, {
      progressOptions,
      capacityOptions: { progressField: 'fractionalRepeatCount' },
      progressScale: productivity
    });
    if (!tick.ready) {
      return;
    }
    const result = this.applyRequestedExpansionProgress(
      tick.requestedProgress,
      this.getScaledCost(),
      accumulatedChanges,
      {
        storageOptions: { reconcileOnDirectSpend: true },
        applyRates: tick.seconds > 0 && this.showsInResourcesRate(),
        seconds: tick.seconds,
        rateSourceLabel: this.getExpansionRateSourceLabel(),
        applyProgress: (progress) => this.applyContinuousProgress(progress),
        onApplied: ({ storageState }) => {
          if (!accumulatedChanges && storageState?.storageProject) {
            updateSpaceStorageUI(storageState.storageProject);
          }
        }
      }
    );
    this.shortfallLastTick = result.shortfall;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.applyExpansionCostAndGain(deltaTime, accumulatedChanges, productivity);
  }

  estimateExpansionCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    const expansionActive = this.isActive && (!this.isContinuous() || this.autoStart);
    if (!expansionActive) {
      return totals;
    }

    const duration = this.getEffectiveDuration();
    const limit = this.maxRepeatCount || Infinity;
    const completedExpansions = this.repeatCount + this.fractionalRepeatCount;
    const remainingRepeats = limit === Infinity ? Infinity : Math.max(0, limit - completedExpansions);
    const requestedProgress = this.isContinuous()
      ? Math.min((deltaTime / duration) * productivity, remainingRepeats)
      : (deltaTime / duration);
    if (!(remainingRepeats > 0) || !(requestedProgress > 0)) {
      return totals;
    }

    const storageState = this.createExpansionStorageState(accumulatedChanges);
    const cost = this.getScaledCost();
    const progress = this.isContinuous()
      ? this.getAffordableExpansionProgress(
          requestedProgress,
          cost,
          storageState,
          accumulatedChanges
        )
      : requestedProgress;
    if (!(progress > 0)) {
      return totals;
    }

    return {
      cost: this.estimateExpansionCostForProgress(
        cost,
        progress,
        deltaTime,
        accumulatedChanges,
        storageState,
        {
          applyRates,
          sourceLabel: this.getExpansionRateSourceLabel()
        }
      ),
      gain: {}
    };
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    return this.estimateExpansionCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
  }

  renderUI(container) {
    const card = document.createElement('div');
    card.classList.add('info-card', 'hephaestus-card');

    const header = document.createElement('div');
    header.classList.add('card-header');
    const title = document.createElement('span');
    title.classList.add('card-title');
    title.textContent = getHephaestusText('ui.projects.hephaestus.title', 'Hephaestus Yards');
    header.appendChild(title);
    card.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('card-body');

    const summaryGrid = document.createElement('div');
    summaryGrid.classList.add('stats-grid', 'three-col', 'project-summary-grid');

    const createSummaryBox = (labelText) => {
      const box = document.createElement('div');
      box.classList.add('stat-item', 'project-summary-box');
      const label = document.createElement('span');
      label.classList.add('stat-label');
      label.textContent = labelText;
      const content = document.createElement('div');
      content.classList.add('project-summary-content');
      const value = document.createElement('span');
      value.classList.add('stat-value');
      content.appendChild(value);
      box.append(label, content);
      summaryGrid.appendChild(box);
      return { value };
    };

    const totalValue = createSummaryBox(getHephaestusText('ui.projects.hephaestus.totalYards', 'Total Yards')).value;
    const freeValue = createSummaryBox(getHephaestusText('ui.projects.common.unassigned', 'Unassigned')).value;
    const expansionRateValue = createSummaryBox(getHephaestusText('ui.projects.common.expansion', 'Expansion')).value;

    const assignmentGrid = document.createElement('div');
    assignmentGrid.classList.add('hephaestus-assignment-list');

    const stepDownButton = document.createElement('button');
    stepDownButton.textContent = getHephaestusText('ui.projects.common.divideTen', '/10');
    stepDownButton.addEventListener('click', () => {
      this.setAssignmentStep(this.assignmentStep / 10);
      this.updateUI();
    });
    const stepUpButton = document.createElement('button');
    stepUpButton.textContent = getHephaestusText('ui.projects.common.timesTen', 'x10');
    stepUpButton.addEventListener('click', () => {
      this.setAssignmentStep(this.assignmentStep * 10);
      this.updateUI();
    });

    const headerRow = document.createElement('div');
    headerRow.classList.add('hephaestus-assignment-row', 'hephaestus-assignment-header-row');
    const headerName = document.createElement('span');
    headerName.classList.add('stat-label');
    headerName.textContent = getHephaestusText('ui.projects.hephaestus.project', 'Project');
    const headerValue = document.createElement('span');
    headerValue.classList.add('stat-label');
    headerValue.textContent = getHephaestusText('ui.projects.common.assigned', 'Assigned');
    const headerControls = document.createElement('div');
    headerControls.classList.add('hephaestus-assignment-controls');
    const headerButtons = document.createElement('div');
    headerButtons.classList.add('hephaestus-control-buttons', 'hephaestus-step-header');
    headerButtons.append(stepDownButton, stepUpButton);
    const weightHeader = document.createElement('span');
    weightHeader.classList.add('stat-label', 'hephaestus-weight-header');
    weightHeader.textContent = getHephaestusText('ui.projects.common.weight', 'Weight');
    headerControls.append(headerButtons, weightHeader);
    const headerSpacer = document.createElement('div');
    headerSpacer.classList.add('hephaestus-row-spacer');
    headerRow.append(headerName, headerValue, headerControls, headerSpacer);
    assignmentGrid.appendChild(headerRow);
    const headerDivider = document.createElement('div');
    headerDivider.classList.add('hephaestus-header-divider');
    assignmentGrid.appendChild(headerDivider);

    const rowElements = {};

    const createAssignmentRow = (key, labelText) => {
      const row = document.createElement('div');
      row.classList.add('hephaestus-assignment-row');

      const nameEl = document.createElement('span');
      nameEl.classList.add('stat-label');
      nameEl.textContent = labelText;

      const amountEl = document.createElement('span');
      amountEl.classList.add('stat-value');

      const zeroButton = document.createElement('button');
      zeroButton.textContent = getHephaestusText('ui.projects.common.zero', '0');
      zeroButton.addEventListener('click', () => {
        if (this.autoAssignFlags[key]) {
          return;
        }
        this.yardAssignments[key] = 0;
        this.normalizeAssignments();
        this.applyYardEffects();
        this.updateUI();
        this.refreshProjectUI();
      });

      const minusButton = document.createElement('button');
      const plusButton = document.createElement('button');
      minusButton.addEventListener('click', () => this.adjustAssignment(key, -this.assignmentStep));
      plusButton.addEventListener('click', () => this.adjustAssignment(key, this.assignmentStep));

      const maxButton = document.createElement('button');
      maxButton.textContent = getHephaestusText('ui.projects.common.max', 'Max');
      maxButton.addEventListener('click', () => {
        if (this.autoAssignFlags[key]) {
          return;
        }
        this.normalizeAssignments();
        const keys = this.getAssignmentKeys();
        const total = this.getTotalYards();
        const usedOther = keys.reduce((sum, otherKey) => {
          if (otherKey === key) return sum;
          if (this.autoAssignFlags[otherKey]) return sum;
          return sum + (this.yardAssignments[otherKey] || 0);
        }, 0);
        const target = Math.max(0, total - usedOther);
        this.yardAssignments[key] = target;
        this.normalizeAssignments();
        this.applyYardEffects();
        this.updateUI();
        this.refreshProjectUI();
      });

      const autoAssignContainer = document.createElement('div');
      autoAssignContainer.classList.add('hephaestus-auto-assign');
      const autoAssign = document.createElement('input');
      autoAssign.type = 'checkbox';
      autoAssign.addEventListener('change', () => {
        this.setAutoAssignTarget(key, autoAssign.checked);
      });
      const autoAssignLabel = document.createElement('span');
      autoAssignLabel.textContent = getHephaestusText('ui.projects.common.auto', 'Auto');
      autoAssignLabel.addEventListener('click', () => {
        autoAssign.checked = !autoAssign.checked;
        this.setAutoAssignTarget(key, autoAssign.checked);
      });
      autoAssignContainer.append(autoAssign, autoAssignLabel);

      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.min = '0';
      weightInput.step = '0.1';
      weightInput.value = String(this.autoAssignWeights[key] || 1);
      weightInput.classList.add('hephaestus-weight-input');
      weightInput.addEventListener('input', () => {
        this.autoAssignWeights[key] = Number(weightInput.value || 0);
        this.normalizeAssignments();
        this.applyYardEffects();
        this.updateUI();
        this.refreshProjectUI();
      });

      const controlBox = document.createElement('div');
      controlBox.classList.add('hephaestus-assignment-controls');
      const controlButtons = document.createElement('div');
      controlButtons.classList.add('hephaestus-control-buttons');
      controlButtons.append(zeroButton, minusButton, plusButton, maxButton, autoAssignContainer);
      controlBox.append(controlButtons, weightInput);
      const rowSpacer = document.createElement('div');
      rowSpacer.classList.add('hephaestus-row-spacer');
      row.append(nameEl, amountEl, controlBox, rowSpacer);
      assignmentGrid.appendChild(row);

      rowElements[key] = {
        wrapper: row,
        value: amountEl,
        zeroButton,
        maxButton,
        autoAssign,
        weightInput,
        minusButton,
        plusButton
      };
    };

    const assignmentKeys = ['dysonSwarmReceiver', 'dysonSphere', 'spaceStorage', 'lifters', 'nuclearAlchemyFurnace', 'superalloyGigafoundry'];
    assignmentKeys.forEach((key) => {
      const project = projectManager.projects[key];
      const labelText = project?.displayName || key;
      createAssignmentRow(key, labelText);
    });

    body.append(summaryGrid, assignmentGrid);
    card.appendChild(body);
    container.appendChild(card);

    this.uiElements = {
      totalValue,
      freeValue,
      expansionRateValue,
      rowElements,
      stepDownButton,
      stepUpButton,
      assignmentGrid
    };

    this.updateUI();
  }

  updateUI() {
    const elements = this.uiElements;
    this.normalizeAssignments();

    const total = this.getTotalYards();
    const assigned = this.getAssignedTotal();
    const available = Math.max(0, total - assigned);
    elements.totalValue.textContent = formatNumber(total, true, 2);
    elements.freeValue.textContent = formatNumber(available, true, 2);
    const step = this.assignmentStep;
    if (elements.expansionRateValue) {
      const rate = this.isActive ? (1000 / this.getEffectiveDuration()) : 0;
      elements.expansionRateValue.textContent = getHephaestusText('ui.projects.hephaestus.yardsPerSecond', '{value} yards/s', {
        value: formatNumber(rate, true, 3)
      });
    }

    const activeDyson = this.getActiveDysonKey();
    const keys = ['dysonSwarmReceiver', 'dysonSphere', 'spaceStorage', 'lifters', 'nuclearAlchemyFurnace', 'superalloyGigafoundry'];
    keys.forEach((key) => {
      const row = elements.rowElements[key];
      const current = this.yardAssignments[key] || 0;
      const usedOther = keys.reduce((sum, otherKey) => {
        if (otherKey === key) return sum;
        if (this.autoAssignFlags[otherKey]) return sum;
        return sum + (this.yardAssignments[otherKey] || 0);
      }, 0);
      const maxForKey = Math.max(0, total - usedOther);

      row.value.textContent = formatNumber(current, true);
      row.minusButton.textContent = `-${formatNumber(step, true)}`;
      row.plusButton.textContent = `+${formatNumber(step, true)}`;
      row.autoAssign.checked = this.autoAssignFlags[key] === true;
      row.autoAssign.disabled = total === 0;
      if (document.activeElement !== row.weightInput) {
        row.weightInput.value = String(this.autoAssignWeights[key] || 1);
      }
      row.weightInput.disabled = total === 0;
      row.zeroButton.disabled = current <= 0 || this.autoAssignFlags[key];
      row.maxButton.disabled = current >= maxForKey || total === 0 || this.autoAssignFlags[key];
      row.minusButton.disabled = current <= 0 || this.autoAssignFlags[key];
      row.plusButton.disabled = current >= maxForKey || total === 0 || this.autoAssignFlags[key];
      if (key === 'dysonSwarmReceiver' || key === 'dysonSphere') {
        const display = key === activeDyson ? '' : 'none';
        row.wrapper.style.display = display;
      } else if (key === 'nuclearAlchemyFurnace') {
        row.wrapper.style.display = this.shouldShowNuclearAlchemyTarget() ? '' : 'none';
      } else if (key === 'superalloyGigafoundry') {
        row.wrapper.style.display = this.shouldShowSuperalloyGigafoundryTarget() ? '' : 'none';
      }
    });
  }

  refreshProjectUI() {
    updateProjectUI(this.name);
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      yardAssignments: { ...this.yardAssignments },
      assignmentStep: this.assignmentStep,
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights }
    };
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'yardAssignments')) {
      this.yardAssignments = { ...(settings.yardAssignments || {}) };
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'assignmentStep')) {
      this.assignmentStep = settings.assignmentStep || 1;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'autoAssignFlags')) {
      this.autoAssignFlags = { ...(settings.autoAssignFlags || {}) };
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'autoAssignWeights')) {
      this.autoAssignWeights = { ...(settings.autoAssignWeights || {}) };
    }
    this.normalizeAssignments();
  }

  saveState() {
    return {
      ...super.saveState(),
      fractionalRepeatCount: this.fractionalRepeatCount,
      yardAssignments: { ...this.yardAssignments },
      assignmentStep: this.assignmentStep,
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights }
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.fractionalRepeatCount = state.fractionalRepeatCount || 0;
    this.yardAssignments = { ...(state.yardAssignments || {}) };
    this.assignmentStep = state.assignmentStep || 1;
    this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
    this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
    this.normalizeAssignments();
  }

  saveTravelState() {
    const state = {
      ...super.saveTravelState(),
      yardAssignments: { ...this.yardAssignments },
      assignmentStep: this.assignmentStep,
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights },
      fractionalRepeatCount: this.fractionalRepeatCount
    };
    if (this.isActive) {
      state.isActive = true;
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
    }
    return state;
  }

  loadTravelState(state = {}) {
    super.loadTravelState(state);
    this.yardAssignments = { ...(state.yardAssignments || {}) };
    this.assignmentStep = state.assignmentStep || 1;
    this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
    this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
    this.fractionalRepeatCount = state.fractionalRepeatCount || 0;
    if (state.isActive) {
      this.isActive = true;
      this.startingDuration = state.startingDuration || this.getEffectiveDuration();
      this.remainingTime = state.remainingTime || this.startingDuration;
    }
    this.normalizeAssignments();
  }
}

window.HephaestusMegaconstructionProject = HephaestusMegaconstructionProject;
