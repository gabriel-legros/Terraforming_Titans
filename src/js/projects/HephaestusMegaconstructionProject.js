function getHephaestusText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

const HEPHAESTUS_UNASSIGNED_KEY = 'idleUnassigned';
const HEPHAESTUS_ASSIGNMENT_STEP_MAX = 1_000_000_000_000_000_000_000_000_000_000n;

function normalizeHephaestusInteger(value) {
  if (value === undefined || value === null || value === '') {
    return 0n;
  }
  if (Object.prototype.toString.call(value) === '[object BigInt]') {
    return value < 0n ? 0n : value;
  }
  if (Object.prototype.toString.call(value) === '[object String]') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      return BigInt(trimmed);
    }
    const parsed = parseFlexibleNumber(trimmed);
    if (Number.isFinite(parsed) && parsed > 0) {
      if (Number.isSafeInteger(parsed)) {
        return BigInt(parsed);
      }
      return BigInt(Math.floor(parsed).toLocaleString('fullwide', {
        useGrouping: false,
        maximumFractionDigits: 0
      }));
    }
  }
  const numeric = Number(value) || 0;
  if (numeric <= 0) {
    return 0n;
  }
  if (Number.isSafeInteger(numeric)) {
    return BigInt(numeric);
  }
  return BigInt(Math.floor(numeric).toLocaleString('fullwide', {
    useGrouping: false,
    maximumFractionDigits: 0
  }));
}

function serializeHephaestusInteger(value) {
  const normalized = normalizeHephaestusInteger(value);
  return normalized <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(normalized)
    : normalized.toString();
}

function serializeYardAssignments(assignments = {}) {
  const serialized = {};
  Object.keys(assignments).forEach((key) => {
    serialized[key] = serializeHephaestusInteger(assignments[key]);
  });
  return serialized;
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
    this.assignmentStep = 1n;
    this.autoAssignFlags = {};
    this.autoAssignWeights = {};
    this.releaseIfDisabledFlags = {};
    this.shortfallLastTick = false;
    const dummyText = { textContent: '' };
    const dummyButton = { textContent: '', disabled: false };
    const dummyWrapper = { style: { display: '' } };
    const rowElements = {};
    [HEPHAESTUS_UNASSIGNED_KEY, 'dysonSwarmReceiver', 'dysonSphere', 'spaceStorage', 'lifters', 'spaceChemistry', 'nuclearAlchemyFurnace', 'superalloyGigafoundry', 'artificialStars', 'planetCrackers', 'whiteDwarfHarvesters', name].forEach((key) => {
      rowElements[key] = {
        wrapper: dummyWrapper,
        value: dummyText,
        minusButton: dummyButton,
        plusButton: dummyButton,
        zeroButton: dummyButton,
        maxButton: dummyButton,
        autoAssign: { checked: false, disabled: false },
        releaseIfDisabled: { checked: false, disabled: false },
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

  resolveUIElements() {
    if (this.uiElements?.assignmentGrid?.isConnected) {
      return this.uiElements;
    }
    const card = projectElements?.[this.name]?.projectItem;
    if (!card || !card.isConnected) {
      return null;
    }
    const assignmentGrid = card.querySelector('[data-hephaestus-ui="assignmentGrid"]');
    if (!assignmentGrid) {
      return null;
    }
    const rowElements = {};
    const rowNodes = assignmentGrid.querySelectorAll('[data-hephaestus-assignment-key]');
    rowNodes.forEach((rowNode) => {
      const key = rowNode.dataset.hephaestusAssignmentKey;
      rowElements[key] = {
        wrapper: rowNode,
        value: rowNode.querySelector('[data-hephaestus-role="value"]'),
        minusButton: rowNode.querySelector('[data-hephaestus-role="minusButton"]'),
        plusButton: rowNode.querySelector('[data-hephaestus-role="plusButton"]'),
        zeroButton: rowNode.querySelector('[data-hephaestus-role="zeroButton"]'),
        maxButton: rowNode.querySelector('[data-hephaestus-role="maxButton"]'),
        autoAssign: rowNode.querySelector('[data-hephaestus-role="autoAssign"]'),
        releaseIfDisabled: rowNode.querySelector('[data-hephaestus-role="releaseIfDisabled"]'),
        weightInput: rowNode.querySelector('[data-hephaestus-role="weightInput"]')
      };
    });
    this.uiElements = {
      totalValue: card.querySelector('[data-hephaestus-ui="totalValue"]'),
      freeValue: card.querySelector('[data-hephaestus-ui="freeValue"]'),
      expansionRateValue: card.querySelector('[data-hephaestus-ui="expansionRateValue"]'),
      rowElements,
      stepDownButton: card.querySelector('[data-hephaestus-ui="stepDownButton"]'),
      stepUpButton: card.querySelector('[data-hephaestus-ui="stepUpButton"]'),
      assignmentGrid
    };
    return this.uiElements;
  }

  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.duration);
  }

  getExpansionProgressField() {
    return 'fractionalRepeatCount';
  }

  getTotalYards() {
    return normalizeHephaestusInteger(this.repeatCount);
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
    return ['dysonSwarmReceiver', 'dysonSphere', 'spaceStorage', 'lifters', 'spaceChemistry', 'nuclearAlchemyFurnace', 'superalloyGigafoundry', 'artificialStars', 'planetCrackers', 'whiteDwarfHarvesters'];
  }

  shouldShowSpaceChemistryTarget() {
    const project = projectManager?.projects?.spaceChemistry;
    if (!project) {
      return false;
    }
    return project.unlocked || project.isActive || project.repeatCount > 0;
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

  shouldShowArtificialStarsTarget() {
    const project = projectManager?.projects?.artificialStars;
    if (!project) {
      return false;
    }
    return project.unlocked || project.isActive || project.repeatCount > 0;
  }

  shouldShowPlanetCrackersTarget() {
    const project = projectManager?.projects?.planetCrackers;
    if (!project) {
      return false;
    }
    return project.unlocked || project.isActive || project.repeatCount > 0;
  }

  shouldShowWhiteDwarfHarvestersTarget() {
    const project = projectManager?.projects?.whiteDwarfHarvesters;
    if (!project) {
      return false;
    }
    return project.unlocked || project.isActive || project.repeatCount > 0;
  }

  getOptionalAssignmentKeys() {
    const keys = [];
    if (this.shouldShowSpaceChemistryTarget()) {
      keys.push('spaceChemistry');
    }
    if (this.shouldShowNuclearAlchemyTarget()) {
      keys.push('nuclearAlchemyFurnace');
    }
    if (this.shouldShowSuperalloyGigafoundryTarget()) {
      keys.push('superalloyGigafoundry');
    }
    if (this.shouldShowArtificialStarsTarget()) {
      keys.push('artificialStars');
    }
    if (this.shouldShowPlanetCrackersTarget()) {
      keys.push('planetCrackers');
    }
    if (this.shouldShowWhiteDwarfHarvestersTarget()) {
      keys.push('whiteDwarfHarvesters');
    }
    return keys;
  }

  getAssignmentKeys() {
    return [this.getActiveDysonKey(), 'spaceStorage', 'lifters'].concat(this.getOptionalAssignmentKeys());
  }

  getUnassignedAssignmentKey() {
    return HEPHAESTUS_UNASSIGNED_KEY;
  }

  getManagedAssignmentKeys() {
    return [this.getUnassignedAssignmentKey()].concat(this.getAssignmentKeys());
  }

  isUnassignedAssignmentKey(key) {
    return key === this.getUnassignedAssignmentKey();
  }

  normalizeAssignments() {
    const activeDyson = this.getActiveDysonKey();
    const inactiveDyson = this.getInactiveDysonKey();
    const inactiveValue = normalizeHephaestusInteger(this.yardAssignments[inactiveDyson]);
    if (inactiveValue > 0n) {
      this.yardAssignments[activeDyson] = normalizeHephaestusInteger(this.yardAssignments[activeDyson]) + inactiveValue;
    }
    this.yardAssignments[inactiveDyson] = 0n;

    const keys = this.getManagedAssignmentKeys();
    this.yardAssignments[this.getUnassignedAssignmentKey()] = 0n;
    // Keep assignments for temporarily hidden optional targets (for example,
    // Nuclear Alchemy during load/travel sequencing) so saved auto-assign
    // flags and yard allocations are restored once that target is visible.
    const total = this.getTotalYards();
    const activeKey = this.getActiveDysonKey();
    let usedManual = 0n;
    const blockedAutoKeys = {};

    keys.forEach((key) => {
      if (this.isUnassignedAssignmentKey(key)) {
        return;
      }
      if (key === 'dysonSwarmReceiver' || key === 'dysonSphere') {
        const targetKey = key === activeKey ? key : activeKey;
        this.autoAssignFlags[targetKey] = this.autoAssignFlags[targetKey] || false;
      }
      if (this.releaseIfDisabledFlags[key] && !this.isAssignmentExpansionEnabled(key)) {
        this.yardAssignments[key] = 0n;
        blockedAutoKeys[key] = true;
        return;
      }
      if (this.autoAssignFlags[key]) {
        this.yardAssignments[key] = normalizeHephaestusInteger(this.yardAssignments[key]);
        return;
      }
      const value = normalizeHephaestusInteger(this.yardAssignments[key]);
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

    const autoKeys = keys.filter((key) => this.autoAssignFlags[key] && !blockedAutoKeys[key]);
    const remaining = total > usedManual ? (total - usedManual) : 0n;
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
          this.yardAssignments[key] = 0n;
        });
      } else {
        const remainders = [];
        let assigned = 0n;
        autoKeys.forEach((key) => {
          const exact = Number(remaining) * (weights[key] / totalWeight);
          const finiteExact = Number.isFinite(exact) && exact > 0 ? exact : 0;
          const floorNumber = Math.floor(finiteExact);
          const floorVal = normalizeHephaestusInteger(floorNumber);
          this.yardAssignments[key] = floorVal;
          assigned += floorVal;
          remainders.push({ key, remainder: finiteExact - floorNumber });
        });

        let leftover = remaining - assigned;
        remainders.sort((a, b) => b.remainder - a.remainder);
        for (let i = 0; i < remainders.length && leftover > 0n; i++) {
          this.yardAssignments[remainders[i].key] += 1n;
          leftover -= 1n;
        }
        if (leftover > 0n && autoKeys.length > 0) {
          const idleKey = this.getUnassignedAssignmentKey();
          const targetKey = autoKeys.includes(idleKey) ? idleKey : autoKeys[0];
          this.yardAssignments[targetKey] += leftover;
        }
      }
    }

    const totalAssigned = keys.reduce((sum, key) => sum + normalizeHephaestusInteger(this.yardAssignments[key]), 0n);
    if (totalAssigned > total && autoKeys.length === 0) {
      let excess = totalAssigned - total;
      for (let i = keys.length - 1; i >= 0 && excess > 0n; i--) {
        const key = keys[i];
        const current = this.yardAssignments[key] || 0n;
        const reduction = current < excess ? current : excess;
        this.yardAssignments[key] = current - reduction;
        excess -= reduction;
      }
    }
  }

  getAssignedTotal() {
    this.normalizeAssignments();
    return this.getAssignmentKeys().reduce(
      (sum, key) => sum + normalizeHephaestusInteger(this.yardAssignments[key]),
      0n
    );
  }

  getAvailableYards() {
    const total = this.getTotalYards();
    const assigned = this.getAssignedTotal();
    return total > assigned ? (total - assigned) : 0n;
  }

  getStoredAssignmentAmount(key) {
    const normalized = normalizeHephaestusInteger(this.yardAssignments[key]);
    this.yardAssignments[key] = normalized;
    return normalized;
  }

  getDisplayedAssignmentAmount(key) {
    if (this.isUnassignedAssignmentKey(key)) {
      return this.getAvailableYards();
    }
    return this.getStoredAssignmentAmount(key);
  }

  getAssignmentMaxTarget(key) {
    const keys = this.getManagedAssignmentKeys();
    const total = this.getTotalYards();
    const usedOther = keys.reduce((sum, otherKey) => {
      if (otherKey === key) return sum;
      if (this.autoAssignFlags[otherKey]) return sum;
      return sum + this.getStoredAssignmentAmount(otherKey);
    }, 0n);
    return total > usedOther ? (total - usedOther) : 0n;
  }

  setAssignmentStep(step) {
    const next = normalizeHephaestusInteger(step);
    this.assignmentStep = next < 1n ? 1n : (next > HEPHAESTUS_ASSIGNMENT_STEP_MAX ? HEPHAESTUS_ASSIGNMENT_STEP_MAX : next);
  }

  normalizeAssignmentStep() {
    this.assignmentStep = normalizeHephaestusInteger(this.assignmentStep);
    if (this.assignmentStep < 1n) {
      this.assignmentStep = 1n;
    }
  }

  getSignedAssignmentDelta(delta) {
    const valueType = Object.prototype.toString.call(delta);
    if (valueType === '[object BigInt]') {
      return delta;
    }
    if (valueType === '[object String]') {
      const trimmed = delta.trim();
      if (!trimmed || trimmed === '-') {
        return 0n;
      }
      const isNegative = trimmed.startsWith('-');
      const digits = isNegative || trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
      if (!/^\d+$/.test(digits)) {
        return 0n;
      }
      const magnitude = BigInt(digits);
      return isNegative ? -magnitude : magnitude;
    }
    const numeric = Number(delta);
    if (!Number.isFinite(numeric) || numeric === 0) {
      return 0n;
    }
    const magnitude = normalizeHephaestusInteger(Math.abs(numeric));
    return numeric < 0 ? -magnitude : magnitude;
  }

  setAutoAssignTarget(key, enabled) {
    this.autoAssignFlags[key] = enabled === true;
    this.normalizeAssignments();
    this.applyYardEffects();
    this.updateUI();
    this.refreshProjectUI();
  }

  setReleaseIfDisabledTarget(key, enabled) {
    this.releaseIfDisabledFlags[key] = enabled === true;
    this.normalizeAssignments();
    this.applyYardEffects();
    this.updateUI();
    this.refreshProjectUI();
  }

  isAssignmentExpansionEnabled(key) {
    const project = projectManager.projects[key];
    if (!project) {
      return false;
    }
    if (key === 'dysonSwarmReceiver' || key === 'dysonSphere') {
      if (project.isCollectorContinuous()) {
        return project.autoContinuousOperation === true
          && (project.isCompleted || project.collectors > 0);
      }
      return (project.collectorProgress || 0) > 0;
    }
    const isExpansionContinuous = project.isExpansionContinuous && project.isExpansionContinuous();
    if (isExpansionContinuous) {
      return project.isActive && !project.isPaused && project.autoStart;
    }
    return project.isActive && !project.isPaused;
  }

  adjustAssignment(key, delta) {
    if (this.autoAssignFlags[key]) {
      return;
    }
    this.normalizeAssignments();
    const signedDelta = this.getSignedAssignmentDelta(delta);
    if (signedDelta === 0n) {
      return;
    }
    const current = this.getStoredAssignmentAmount(key);
    const maxForKey = this.getAssignmentMaxTarget(key);
    let next = current + signedDelta;
    if (next < 0n) {
      next = 0n;
    }
    if (next > maxForKey) {
      next = maxForKey;
    }
    this.yardAssignments[key] = next;
    this.normalizeAssignments();
    this.applyYardEffects();
    this.updateUI();
    this.refreshProjectUI();
  }

  clearAssignment(key) {
    if (this.autoAssignFlags[key]) {
      return;
    }
    this.yardAssignments[key] = 0n;
    this.normalizeAssignments();
    this.applyYardEffects();
    this.updateUI();
    this.refreshProjectUI();
  }

  maximizeAssignment(key) {
    if (this.autoAssignFlags[key]) {
      return;
    }
    this.normalizeAssignments();
    this.yardAssignments[key] = this.getAssignmentMaxTarget(key);
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

  getEffectiveYardAssignmentMultiplier() {
    let bonus = 0;
    this.activeEffects.forEach((effect) => {
      if (effect?.type !== 'yardEffectivenessMultiplier') {
        return;
      }
      const value = Number(effect.value);
      if (Number.isFinite(value) && value > 0) {
        bonus += value;
      }
    });
    return Math.max(1, 1 + bonus);
  }

  applyYardEffects() {
    this.normalizeAssignments();
    const targets = this.getAllAssignableKeys();
    const activeKeySet = new Set(this.getAssignmentKeys());
    const multiplier = this.getEffectiveYardAssignmentMultiplier();

    targets.forEach((key) => {
      const project = projectManager.projects[key];
      if (!project) {
        return;
      }
      const assigned = activeKeySet.has(key) ? Number(this.yardAssignments[key] || 0n) * multiplier : 0;
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
    totalValue.dataset.hephaestusUi = 'totalValue';
    freeValue.dataset.hephaestusUi = 'freeValue';
    expansionRateValue.dataset.hephaestusUi = 'expansionRateValue';

    const assignmentGrid = document.createElement('div');
    assignmentGrid.classList.add('hephaestus-assignment-list', 'hephaestus-yards-assignment-list');
    assignmentGrid.dataset.hephaestusUi = 'assignmentGrid';

    const stepDownButton = document.createElement('button');
    stepDownButton.dataset.hephaestusUi = 'stepDownButton';
    stepDownButton.textContent = getHephaestusText('ui.projects.common.divideTen', '/10');
    stepDownButton.addEventListener('click', () => {
      this.normalizeAssignmentStep();
      this.setAssignmentStep(this.assignmentStep > 1n ? (this.assignmentStep / 10n) : 1n);
      this.updateUI();
    });
    const stepUpButton = document.createElement('button');
    stepUpButton.dataset.hephaestusUi = 'stepUpButton';
    stepUpButton.textContent = getHephaestusText('ui.projects.common.timesTen', 'x10');
    stepUpButton.addEventListener('click', () => {
      this.normalizeAssignmentStep();
      this.setAssignmentStep(this.assignmentStep * 10n);
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
      row.dataset.hephaestusAssignmentKey = key;
      row.classList.add('hephaestus-assignment-row');
      if (this.isUnassignedAssignmentKey(key)) {
        row.classList.add('assignment-divider-row');
      }

      const nameEl = document.createElement('span');
      nameEl.classList.add('stat-label');
      nameEl.textContent = labelText;

      const amountEl = document.createElement('span');
      amountEl.classList.add('stat-value');
      amountEl.dataset.hephaestusRole = 'value';

      const zeroButton = document.createElement('button');
      zeroButton.dataset.hephaestusRole = 'zeroButton';
      zeroButton.textContent = getHephaestusText('ui.projects.common.zero', '0');
      zeroButton.addEventListener('click', () => {
        this.clearAssignment(key);
      });

      const minusButton = document.createElement('button');
      const plusButton = document.createElement('button');
      minusButton.dataset.hephaestusRole = 'minusButton';
      plusButton.dataset.hephaestusRole = 'plusButton';
      minusButton.addEventListener('click', () => this.adjustAssignment(key, -this.assignmentStep));
      plusButton.addEventListener('click', () => this.adjustAssignment(key, this.assignmentStep));

      const maxButton = document.createElement('button');
      maxButton.dataset.hephaestusRole = 'maxButton';
      maxButton.textContent = getHephaestusText('ui.projects.common.max', 'Max');
      maxButton.addEventListener('click', () => {
        this.maximizeAssignment(key);
      });

      const autoAssignContainer = document.createElement('div');
      autoAssignContainer.classList.add('hephaestus-auto-assign');
      const autoAssign = document.createElement('input');
      autoAssign.type = 'checkbox';
      autoAssign.dataset.hephaestusRole = 'autoAssign';
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
      const releaseIfDisabledContainer = document.createElement('div');
      releaseIfDisabledContainer.classList.add('hephaestus-auto-assign');
      const releaseIfDisabled = document.createElement('input');
      releaseIfDisabled.type = 'checkbox';
      releaseIfDisabled.dataset.hephaestusRole = 'releaseIfDisabled';
      releaseIfDisabled.addEventListener('change', () => {
        this.setReleaseIfDisabledTarget(key, releaseIfDisabled.checked);
      });
      const releaseIfDisabledLabel = document.createElement('span');
      releaseIfDisabledLabel.textContent = getHephaestusText('ui.projects.hephaestus.releaseIfDisabled', 'Release if disabled');
      releaseIfDisabledLabel.addEventListener('click', () => {
        releaseIfDisabled.checked = !releaseIfDisabled.checked;
        this.setReleaseIfDisabledTarget(key, releaseIfDisabled.checked);
      });
      releaseIfDisabledContainer.append(releaseIfDisabled, releaseIfDisabledLabel);

      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.min = '0';
      weightInput.step = '0.1';
      weightInput.value = String(
        Object.prototype.hasOwnProperty.call(this.autoAssignWeights, key) ? this.autoAssignWeights[key] : 1
      );
      weightInput.classList.add('hephaestus-weight-input');
      weightInput.dataset.hephaestusRole = 'weightInput';
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
      controlButtons.append(zeroButton, minusButton, plusButton, maxButton, autoAssignContainer, releaseIfDisabledContainer);
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
        releaseIfDisabled,
        weightInput,
        minusButton,
        plusButton
      };
    };

    createAssignmentRow(
      this.getUnassignedAssignmentKey(),
      getHephaestusText('ui.projects.common.idleUnassigned', 'Idle/Unassigned')
    );

    const assignmentKeys = ['dysonSwarmReceiver', 'dysonSphere', 'spaceStorage', 'lifters', 'spaceChemistry', 'nuclearAlchemyFurnace', 'superalloyGigafoundry', 'artificialStars', 'planetCrackers', 'whiteDwarfHarvesters'];
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
    const elements = this.resolveUIElements();
    if (!elements) {
      return;
    }
    this.normalizeAssignments();

    const total = this.getTotalYards();
    const assigned = this.getAssignedTotal();
    const available = total > assigned ? (total - assigned) : 0n;
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
    const keys = [this.getUnassignedAssignmentKey(), 'dysonSwarmReceiver', 'dysonSphere', 'spaceStorage', 'lifters', 'spaceChemistry', 'nuclearAlchemyFurnace', 'superalloyGigafoundry', 'artificialStars', 'planetCrackers', 'whiteDwarfHarvesters'];
    keys.forEach((key) => {
      const row = elements.rowElements[key];
      const storedCurrent = this.getStoredAssignmentAmount(key);
      const displayedCurrent = this.getDisplayedAssignmentAmount(key);
      const maxForKey = this.getAssignmentMaxTarget(key);

      row.value.textContent = formatNumber(displayedCurrent, true, 2);
      row.minusButton.textContent = `-${formatNumber(step, true)}`;
      row.plusButton.textContent = `+${formatNumber(step, true)}`;
      row.autoAssign.checked = this.autoAssignFlags[key] === true;
      row.autoAssign.disabled = total === 0;
      row.releaseIfDisabled.checked = this.releaseIfDisabledFlags[key] === true;
      row.releaseIfDisabled.disabled = this.isUnassignedAssignmentKey(key);
      if (document.activeElement !== row.weightInput) {
        row.weightInput.value = String(
          Object.prototype.hasOwnProperty.call(this.autoAssignWeights, key) ? this.autoAssignWeights[key] : 1
        );
      }
      row.weightInput.disabled = total === 0;
      row.zeroButton.disabled = storedCurrent <= 0 || this.autoAssignFlags[key];
      row.maxButton.disabled = storedCurrent >= maxForKey || total === 0 || this.autoAssignFlags[key];
      row.minusButton.disabled = storedCurrent <= 0 || this.autoAssignFlags[key];
      row.plusButton.disabled = storedCurrent >= maxForKey || total === 0 || this.autoAssignFlags[key];
      if (this.isUnassignedAssignmentKey(key)) {
        row.wrapper.style.display = '';
      } else if (key === 'dysonSwarmReceiver' || key === 'dysonSphere') {
        const display = key === activeDyson ? '' : 'none';
        row.wrapper.style.display = display;
      } else if (key === 'spaceChemistry') {
        row.wrapper.style.display = this.shouldShowSpaceChemistryTarget() ? '' : 'none';
      } else if (key === 'nuclearAlchemyFurnace') {
        row.wrapper.style.display = this.shouldShowNuclearAlchemyTarget() ? '' : 'none';
      } else if (key === 'superalloyGigafoundry') {
        row.wrapper.style.display = this.shouldShowSuperalloyGigafoundryTarget() ? '' : 'none';
      } else if (key === 'artificialStars') {
        row.wrapper.style.display = this.shouldShowArtificialStarsTarget() ? '' : 'none';
      } else if (key === 'planetCrackers') {
        row.wrapper.style.display = this.shouldShowPlanetCrackersTarget() ? '' : 'none';
      } else if (key === 'whiteDwarfHarvesters') {
        row.wrapper.style.display = this.shouldShowWhiteDwarfHarvestersTarget() ? '' : 'none';
      }
    });
  }

  refreshProjectUI() {
    updateProjectUI(this.name);
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      yardAssignments: serializeYardAssignments(this.yardAssignments),
      assignmentStep: serializeHephaestusInteger(this.assignmentStep),
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights },
      releaseIfDisabledFlags: { ...this.releaseIfDisabledFlags }
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
    if (Object.prototype.hasOwnProperty.call(settings, 'releaseIfDisabledFlags')) {
      this.releaseIfDisabledFlags = { ...(settings.releaseIfDisabledFlags || {}) };
    }
    this.normalizeAssignments();
    this.normalizeAssignmentStep();
  }

  saveState() {
    return {
      ...super.saveState(),
      fractionalRepeatCount: this.fractionalRepeatCount,
      yardAssignments: serializeYardAssignments(this.yardAssignments),
      assignmentStep: serializeHephaestusInteger(this.assignmentStep),
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights },
      releaseIfDisabledFlags: { ...this.releaseIfDisabledFlags }
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.fractionalRepeatCount = state.fractionalRepeatCount || 0;
    this.yardAssignments = { ...(state.yardAssignments || {}) };
    this.assignmentStep = state.assignmentStep || 1;
    this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
    this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
    this.releaseIfDisabledFlags = { ...(state.releaseIfDisabledFlags || {}) };
    this.normalizeAssignments();
    this.normalizeAssignmentStep();
  }

  saveTravelState() {
    const state = {
      ...super.saveTravelState(),
      yardAssignments: serializeYardAssignments(this.yardAssignments),
      assignmentStep: serializeHephaestusInteger(this.assignmentStep),
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights },
      releaseIfDisabledFlags: { ...this.releaseIfDisabledFlags },
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
    this.releaseIfDisabledFlags = { ...(state.releaseIfDisabledFlags || {}) };
    this.fractionalRepeatCount = state.fractionalRepeatCount || 0;
    if (state.isActive) {
      this.isActive = true;
      this.startingDuration = state.startingDuration || this.getEffectiveDuration();
      this.remainingTime = state.remainingTime || this.startingDuration;
    }
    this.normalizeAssignments();
    this.normalizeAssignmentStep();
  }
}

window.HephaestusMegaconstructionProject = HephaestusMegaconstructionProject;
