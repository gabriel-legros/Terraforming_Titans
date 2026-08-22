function getHephaestusText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

const HEPHAESTUS_UNASSIGNED_KEY = 'idleUnassigned';
const HEPHAESTUS_ASSIGNMENT_STEP_MAX = 1_000_000_000_000_000_000_000_000_000_000n;

let HephaestusAssignmentTools = {};
try {
  HephaestusAssignmentTools = {
    createProjectAssignmentBase,
    normalizeProjectAssignmentInteger,
    serializeProjectAssignmentInteger,
    serializeProjectAssignments
  };
} catch (error) {}
try {
  HephaestusAssignmentTools = require('./ProjectAssignmentBase.js');
} catch (error) {}

function normalizeHephaestusInteger(value) {
  return HephaestusAssignmentTools.normalizeProjectAssignmentInteger(value);
}

function serializeHephaestusInteger(value) {
  return HephaestusAssignmentTools.serializeProjectAssignmentInteger(value);
}

function serializeYardAssignments(assignments = {}) {
  return HephaestusAssignmentTools.serializeProjectAssignments(assignments);
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

class HephaestusMegaconstructionProject extends HephaestusAssignmentTools.createProjectAssignmentBase(HephaestusContinuousExpansionBase) {
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
    [HEPHAESTUS_UNASSIGNED_KEY, 'dysonSwarmReceiver', 'dysonSphere', 'spaceChemistry', 'spaceStorage', 'lifters', 'nuclearAlchemyFurnace', 'superalloyGigafoundry', 'graphenePrinter', 'artificialStars', 'planetCrackers', 'whiteDwarfHarvesters', 'artificialQuasars', name].forEach((key) => {
      rowElements[key] = {
        wrapper: dummyWrapper,
        complexity: dummyText,
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
    this.initializeAssignmentState({
      assignmentStateKey: 'yardAssignments',
      assignmentStepMax: HEPHAESTUS_ASSIGNMENT_STEP_MAX,
      dynamicAssignmentCaps: true
    });
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
        complexity: rowNode.querySelector('[data-hephaestus-role="complexity"]'),
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
    return ['dysonSwarmReceiver', 'dysonSphere', 'spaceChemistry', 'spaceStorage', 'lifters', 'nuclearAlchemyFurnace', 'superalloyGigafoundry', 'graphenePrinter', 'artificialStars', 'planetCrackers', 'whiteDwarfHarvesters', 'artificialQuasars'];
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

  shouldShowGraphenePrinterTarget() {
    const project = projectManager?.projects?.graphenePrinter;
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

  shouldShowArtificialQuasarsTarget() {
    const project = projectManager?.projects?.artificialQuasars;
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
    if (this.shouldShowGraphenePrinterTarget()) {
      keys.push('graphenePrinter');
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
    if (this.shouldShowArtificialQuasarsTarget()) {
      keys.push('artificialQuasars');
    }
    return keys;
  }

  getAssignmentKeys() {
    const keys = [this.getActiveDysonKey()];
    if (this.shouldShowSpaceChemistryTarget()) {
      keys.push('spaceChemistry');
    }
    return keys.concat(['spaceStorage', 'lifters'], this.getOptionalAssignmentKeys());
  }

  getAssignmentComplexity(key) {
    if (this.isUnassignedAssignmentKey(key)) {
      return null;
    }
    const project = projectManager.projects[key];
    const baseDuration = key === 'dysonSwarmReceiver' || key === 'dysonSphere'
      ? project.baseCollectorDuration
      : project.duration;
    return baseDuration / projectManager.projects.dysonSwarmReceiver.baseCollectorDuration;
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

  getAssignmentTotalCapacity() {
    return this.getTotalYards();
  }

  getPersistentAssignmentKeys() {
    return [this.getUnassignedAssignmentKey()].concat(this.getAllAssignableKeys());
  }

  prepareAssignmentsForNormalization() {
    const activeDyson = this.getActiveDysonKey();
    const inactiveDyson = this.getInactiveDysonKey();
    const inactiveValue = normalizeHephaestusInteger(this.yardAssignments[inactiveDyson]);
    if (inactiveValue > 0n) {
      this.yardAssignments[activeDyson] = normalizeHephaestusInteger(this.yardAssignments[activeDyson]) + inactiveValue;
    }
    this.yardAssignments[inactiveDyson] = 0n;
    this.yardAssignments[this.getUnassignedAssignmentKey()] = 0n;

    if (this.autoAssignFlags['dysonSwarmReceiver'] || this.autoAssignFlags['dysonSphere']) {
      if (activeDyson === 'dysonSphere') {
        this.autoAssignFlags.dysonSwarmReceiver = false;
      } else {
        this.autoAssignFlags.dysonSphere = false;
      }
    }
  }

  getAssignmentCapForKey(key, total = this.getAssignmentTotalCapacityForBatch()) {
    if (!this.isUnassignedAssignmentKey(key) && this.releaseIfDisabledFlags[key] && !this.isAssignmentExpansionEnabled(key)) {
      return 0n;
    }
    return total;
  }

  getAvailableYards(skipNormalization = false, assignedTotal = null) {
    return this.getAvailableAssignments(skipNormalization, assignedTotal);
  }

  getAssignedTotal(skipNormalization = false) {
    if (!skipNormalization) {
      this.normalizeAssignments();
    }
    return this.getAssignmentKeys().reduce(
      (sum, key) => sum + normalizeHephaestusInteger(this.yardAssignments[key]),
      0n
    );
  }

  afterAssignmentsChanged() {
    this.applyYardEffects();
    this.updateUI();
    this.refreshProjectUI();
  }

  setReleaseIfDisabledTarget(key, enabled) {
    this.releaseIfDisabledFlags[key] = enabled === true;
    this.markAssignmentsDirty();
    this.normalizeAssignments();
    this.afterAssignmentsChanged();
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
      return project.isActive && !project.isPaused && (project.autoStart || project.manualContinuousRun);
    }
    return project.isActive && !project.isPaused;
  }

  applyContinuousProgress(progress) {
    return this.applyExpansionProgress(progress, {
      progressField: 'fractionalRepeatCount',
      completeOnCap: false,
      deactivateOnCap: false
    }).completedDelta;
  }

  getExpansionRateSourceLabel() {
    return registerRateSource(
      'project:hephaestusMegaconstruction:expansion',
      getHephaestusText('ui.projects.hephaestus.rateSources.expansion', 'Hephaestus Yard expansion')
    );
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
      const effectId = `${this.name}-yard-${key}`;
      const previousEffect = project.activeEffects.find((effect) => effect.effectId === effectId);
      const durationChanged = !previousEffect || previousEffect.value !== assigned;
      project.addAndReplace({
        type: 'effectiveTerraformedWorlds',
        value: assigned,
        effectId,
        sourceId: this.name,
        name: this.displayName
      });
      if (durationChanged) {
        project.updateDurationFromEffects();
      }
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
        applyProgress: (progress) => this.applyContinuousProgress(progress)
      }
    );
    this.shortfallLastTick = result.shortfall;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.applyExpansionCostAndGain(deltaTime, accumulatedChanges, productivity);
  }

  estimateExpansionCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    const expansionActive = this.isActive
      && (!this.isContinuous() || this.autoStart || this.manualContinuousRun);
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

    const stepButtons = this.createAssignmentStepButtons((key, fallback) => {
      const paths = {
        divideTen: 'ui.projects.common.divideTen',
        timesTen: 'ui.projects.common.timesTen'
      };
      return getHephaestusText(paths[key], fallback);
    });
    const stepDownButton = stepButtons.stepDownButton;
    stepDownButton.dataset.hephaestusUi = 'stepDownButton';
    const stepUpButton = stepButtons.stepUpButton;
    stepUpButton.dataset.hephaestusUi = 'stepUpButton';

    const headerRow = document.createElement('div');
    headerRow.classList.add('hephaestus-assignment-row', 'hephaestus-assignment-header-row');
    const headerName = document.createElement('span');
    headerName.classList.add('stat-label');
    headerName.textContent = getHephaestusText('ui.projects.hephaestus.project', 'Project');
    const headerComplexity = document.createElement('span');
    headerComplexity.classList.add('stat-label');
    headerComplexity.textContent = getHephaestusText('ui.projects.common.complexity', 'Complexity');
    const complexityInfo = document.createElement('span');
    complexityInfo.classList.add('info-tooltip-icon');
    complexityInfo.innerHTML = '&#9432;';
    attachDynamicInfoTooltip(
      complexityInfo,
      getHephaestusText(
        'ui.projects.hephaestus.complexityTooltip',
        'Complexity is the project\'s base duration relative to 60 seconds. Before other duration modifiers, projection duration is 60 seconds x Complexity / max(1, effective terraformed worlds + effective assigned yards). Yard effectiveness bonuses increase the assigned-yard contribution.'
      )
    );
    headerComplexity.appendChild(complexityInfo);
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
    headerRow.append(headerName, headerComplexity, headerValue, headerControls, headerSpacer);
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

      const complexityEl = document.createElement('span');
      complexityEl.classList.add('stat-value');
      complexityEl.dataset.hephaestusRole = 'complexity';

      const amountEl = document.createElement('span');
      amountEl.classList.add('stat-value');
      amountEl.dataset.hephaestusRole = 'value';

      const assignmentControls = this.createAssignmentControls(key, {
        rolePrefix: 'hephaestus',
        textProvider: (controlKey, fallback) => {
          const paths = {
            zero: 'ui.projects.common.zero',
            max: 'ui.projects.common.max',
            auto: 'ui.projects.common.auto'
          };
          return getHephaestusText(paths[controlKey], fallback);
        }
      });
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
      assignmentControls.controlButtons.appendChild(releaseIfDisabledContainer);
      const rowSpacer = document.createElement('div');
      rowSpacer.classList.add('hephaestus-row-spacer');
      row.append(nameEl, complexityEl, amountEl, assignmentControls.controls, rowSpacer);
      assignmentGrid.appendChild(row);

      rowElements[key] = {
        wrapper: row,
        complexity: complexityEl,
        value: amountEl,
        zeroButton: assignmentControls.zeroButton,
        maxButton: assignmentControls.maxButton,
        autoAssign: assignmentControls.autoAssign,
        releaseIfDisabled,
        weightInput: assignmentControls.weightInput,
        minusButton: assignmentControls.minusButton,
        plusButton: assignmentControls.plusButton
      };
    };

    createAssignmentRow(
      this.getUnassignedAssignmentKey(),
      getHephaestusText('ui.projects.common.idleUnassigned', 'Idle/Unassigned')
    );

    const assignmentKeys = ['dysonSwarmReceiver', 'dysonSphere', 'spaceChemistry', 'spaceStorage', 'lifters', 'nuclearAlchemyFurnace', 'superalloyGigafoundry', 'graphenePrinter', 'artificialStars', 'planetCrackers', 'whiteDwarfHarvesters', 'artificialQuasars'];
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
    const totalText = formatNumber(total, true, 2);
    const availableText = formatNumber(available, true, 2);
    if (elements.totalValue.textContent !== totalText) {
      elements.totalValue.textContent = totalText;
    }
    if (elements.freeValue.textContent !== availableText) {
      elements.freeValue.textContent = availableText;
    }
    const step = this.assignmentStep;
    if (elements.expansionRateValue) {
      const rate = this.isActive ? (1000 / this.getEffectiveDuration()) : 0;
      const rateText = getHephaestusText('ui.projects.hephaestus.yardsPerSecond', '{value} yards/s', {
        value: formatNumber(rate, true, 3)
      });
      if (elements.expansionRateValue.textContent !== rateText) {
        elements.expansionRateValue.textContent = rateText;
      }
    }

    const activeDyson = this.getActiveDysonKey();
    const keys = [this.getUnassignedAssignmentKey(), 'dysonSwarmReceiver', 'dysonSphere', 'spaceChemistry', 'spaceStorage', 'lifters', 'nuclearAlchemyFurnace', 'superalloyGigafoundry', 'graphenePrinter', 'artificialStars', 'planetCrackers', 'whiteDwarfHarvesters', 'artificialQuasars'];
    keys.forEach((key) => {
      const row = elements.rowElements[key];
      const storedCurrent = this.getStoredAssignmentAmount(key);
      const displayedCurrent = this.getDisplayedAssignmentAmount(key);
      const maxForKey = this.getAssignmentMaxTarget(key);

      const complexity = this.getAssignmentComplexity(key);
      const complexityText = complexity === null ? '—' : formatNumber(complexity, true, 2);
      if (row.complexity.textContent !== complexityText) {
        row.complexity.textContent = complexityText;
      }
      const valueText = formatNumber(displayedCurrent, true, 2);
      if (row.value.textContent !== valueText) {
        row.value.textContent = valueText;
      }
      this.updateAssignmentControls(row, key, total, step);
      const releaseChecked = this.releaseIfDisabledFlags[key] === true;
      const isUnassigned = this.isUnassignedAssignmentKey(key);
      if (row.releaseIfDisabled.checked !== releaseChecked) {
        row.releaseIfDisabled.checked = releaseChecked;
      }
      if (row.releaseIfDisabled.disabled !== isUnassigned) {
        row.releaseIfDisabled.disabled = isUnassigned;
      }
      let display = '';
      if (key === 'dysonSwarmReceiver' || key === 'dysonSphere') {
        display = key === activeDyson ? '' : 'none';
      } else if (key === 'spaceChemistry') {
        display = this.shouldShowSpaceChemistryTarget() ? '' : 'none';
      } else if (key === 'nuclearAlchemyFurnace') {
        display = this.shouldShowNuclearAlchemyTarget() ? '' : 'none';
      } else if (key === 'superalloyGigafoundry') {
        display = this.shouldShowSuperalloyGigafoundryTarget() ? '' : 'none';
      } else if (key === 'graphenePrinter') {
        display = this.shouldShowGraphenePrinterTarget() ? '' : 'none';
      } else if (key === 'artificialStars') {
        display = this.shouldShowArtificialStarsTarget() ? '' : 'none';
      } else if (key === 'planetCrackers') {
        display = this.shouldShowPlanetCrackersTarget() ? '' : 'none';
      } else if (key === 'whiteDwarfHarvesters') {
        display = this.shouldShowWhiteDwarfHarvestersTarget() ? '' : 'none';
      } else if (key === 'artificialQuasars') {
        display = this.shouldShowArtificialQuasarsTarget() ? '' : 'none';
      }
      if (row.wrapper.style.display !== display) {
        row.wrapper.style.display = display;
      }
    });
  }

  refreshProjectUI() {
    updateProjectUI(this.name);
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      ...this.saveAssignmentSettings(),
      releaseIfDisabledFlags: { ...this.releaseIfDisabledFlags }
    };
  }

  loadAutomationSettings(settings = {}, options = {}) {
    super.loadAutomationSettings(settings);
    const isPresetApplication = options.isPresetApplication === true;
    const shouldApplyPresetReleaseFlags = !isPresetApplication
      || Object.keys(settings.releaseIfDisabledFlags || {}).length > 0;
    let assignmentSettingsChanged = this.loadAssignmentSettings(settings, options);
    if (Object.prototype.hasOwnProperty.call(settings, 'releaseIfDisabledFlags') && shouldApplyPresetReleaseFlags) {
      this.releaseIfDisabledFlags = { ...(settings.releaseIfDisabledFlags || {}) };
      assignmentSettingsChanged = true;
    }
    if (assignmentSettingsChanged) {
      this.normalizeAssignments();
      this.normalizeAssignmentStep();
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      fractionalRepeatCount: this.fractionalRepeatCount,
      ...this.saveAssignmentSettings(),
      releaseIfDisabledFlags: { ...this.releaseIfDisabledFlags }
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.fractionalRepeatCount = state.fractionalRepeatCount || 0;
    this.loadAssignmentSettings(state);
    this.releaseIfDisabledFlags = { ...(state.releaseIfDisabledFlags || {}) };
    this.normalizeAssignments();
    this.normalizeAssignmentStep();
  }

  saveTravelState() {
    const state = {
      ...super.saveTravelState(),
      ...this.saveAssignmentSettings(),
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
    this.loadAssignmentSettings(state);
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
