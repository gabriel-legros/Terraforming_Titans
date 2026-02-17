const ARTIFICIAL_SKY_SEGMENT_LAND = 1000;
const ARTIFICIAL_SKY_CONTINUOUS_THRESHOLD_MS = 1000;
const ARTIFICIAL_SKY_SPACE_MIRROR_EFFECT_ID = 'artificial-sky-disable-space-mirror';
const ARTIFICIAL_SKY_SPACE_MIRROR_SOURCE_ID = 'artificialSkyProject';
const ARTIFICIAL_SKY_MAGNETIC_SHIELD_EFFECT_ID = 'artificial-sky-disable-magnetic-shield';
const ARTIFICIAL_SKY_MAGNETIC_SHIELD_SOURCE_ID = 'artificialSkyProject';

class ArtificialSkyProject extends SpaceshipProject {
  constructor(config, name) {
    super(config, name);
    this.autoContinuousOperation = true;
    this.segmentProgress = 0;
    this.kesslerDebrisSize = 'large';
    this.maxRepeatCount = 1;
  }

  getInitialLand() {
    try {
      return Math.max(terraforming.initialLand || 0, 0);
    } catch (error) {
      return 0;
    }
  }

  getMaxRepeats() {
    const initialLand = this.getInitialLand();
    const segments = Math.max(1, Math.ceil(initialLand / ARTIFICIAL_SKY_SEGMENT_LAND));
    this.maxRepeatCount = segments;
    return segments;
  }

  getBuiltSegmentsWithProgress() {
    const maxSegments = this.getMaxRepeats();
    if (this.isCompleted) {
      return maxSegments;
    }

    let built = this.repeatCount + this.segmentProgress;
    if (this.isActive && !this.isContinuous() && this.startingDuration > 0) {
      const progress = (this.startingDuration - this.remainingTime) / this.startingDuration;
      built += Math.max(0, Math.min(1, progress));
    }
    return Math.max(0, Math.min(maxSegments, built));
  }

  getCompletionFraction() {
    const maxSegments = this.getMaxRepeats();
    if (maxSegments <= 0) {
      return 1;
    }
    return Math.max(0, Math.min(1, this.getBuiltSegmentsWithProgress() / maxSegments));
  }

  isContinuous() {
    if (this.getActiveShipCount() <= 0) {
      return false;
    }
    return this.getEffectiveDuration() < ARTIFICIAL_SKY_CONTINUOUS_THRESHOLD_MS;
  }

  calculateSpaceshipAdjustedDuration() {
    const ships = Math.max(this.getActiveShipCount(), 1);
    return this.duration / ships;
  }

  getFullBuildCost() {
    const baseCost = Project.prototype.getScaledCost.call(this);
    const fullCost = {};
    const initialLand = this.getInitialLand();

    for (const category in baseCost) {
      fullCost[category] = {};
      for (const resource in baseCost[category]) {
        const scaled = baseCost[category][resource] * initialLand;
        if (scaled > 0) {
          fullCost[category][resource] = scaled;
        }
      }
      if (!Object.keys(fullCost[category]).length) {
        delete fullCost[category];
      }
    }

    return fullCost;
  }

  getScaledCost() {
    const fullCost = this.getFullBuildCost();
    const segments = this.getMaxRepeats();
    const perSegment = {};

    for (const category in fullCost) {
      perSegment[category] = {};
      for (const resource in fullCost[category]) {
        const amount = fullCost[category][resource] / segments;
        if (amount > 0) {
          perSegment[category][resource] = amount;
        }
      }
      if (!Object.keys(perSegment[category]).length) {
        delete perSegment[category];
      }
    }

    return perSegment;
  }

  calculateSpaceshipCost() {
    return this.getScaledCost();
  }

  calculateSpaceshipGainPerShip() {
    return {};
  }

  calculateSpaceshipTotalCost(perSecond = false) {
    const totalCost = {};
    const perSegmentCost = this.calculateSpaceshipCost();
    const multiplier = perSecond ? (1000 / this.getEffectiveDuration()) : 1;

    for (const category in perSegmentCost) {
      totalCost[category] = {};
      for (const resource in perSegmentCost[category]) {
        totalCost[category][resource] = perSegmentCost[category][resource] * multiplier;
      }
    }

    return totalCost;
  }

  getDebrisEligibleCostAmount(cost) {
    let total = 0;
    const debrisResources = { metal: true, superalloys: true };
    for (const category in cost) {
      for (const resource in cost[category]) {
        if (!debrisResources[resource]) {
          continue;
        }
        total += cost[category][resource];
      }
    }
    return total;
  }

  applyKesslerShipFailure() {
    const cost = this.kesslerShipCostSnapshot || this.calculateSpaceshipTotalCost();
    const debris = this.getDebrisEligibleCostAmount(cost) + this.getKesslerShipDebrisPerShip();
    this.addKesslerDebris(debris);
    this.loseAssignedShips(1);
    this.pendingGain = null;
    this.isActive = false;
    this.isPaused = false;
    this.isCompleted = false;
    this.resetKesslerShipRoll();
    this.remainingTime = this.getEffectiveDuration();
    this.startingDuration = this.remainingTime;
  }

  canStart() {
    if (this.repeatCount >= this.getMaxRepeats()) {
      return false;
    }
    if (!super.canStart()) {
      return false;
    }
    if (!this.isContinuous()) {
      return true;
    }
    const cost = this.calculateSpaceshipCost();
    for (const category in cost) {
      for (const resource in cost[category]) {
        if (resources[category][resource].value < cost[category][resource]) {
          return false;
        }
      }
    }
    return true;
  }

  canContinue() {
    return this.repeatCount < this.getMaxRepeats();
  }

  deductResources(resources) {
    let shortfall = false;
    if (this.isContinuous()) {
      this.shortfallLastTick = false;
      return;
    }

    const totalCost = this.calculateSpaceshipTotalCost();
    for (const category in totalCost) {
      for (const resource in totalCost[category]) {
        const required = totalCost[category][resource];
        const available = resources[category][resource].value;
        const spend = Math.min(required, available);
        if (spend < required) {
          shortfall = shortfall || required > 0;
        }
        resources[category][resource].decrease(spend);
      }
    }

    this.shortfallLastTick = shortfall;
  }

  start(resources) {
    this.maxRepeatCount = this.getMaxRepeats();
    this.shortfallLastTick = false;
    this.pendingGain = null;

    if (this.isContinuous()) {
      if (!this.canStart()) {
        return false;
      }
      this.isActive = true;
      this.isPaused = false;
      this.isCompleted = false;
      this.startingDuration = Infinity;
      this.remainingTime = Infinity;
      this.kesslerRollPending = false;
      this.kesslerRollElapsed = 0;
      this.kesslerStartCost = null;
      this.resetKesslerShipRoll();
      return true;
    }

    this.segmentProgress = 0;
    const started = Project.prototype.start.call(this, resources);
    if (!started) {
      return false;
    }

    this.kesslerRollPending = false;
    this.kesslerRollElapsed = 0;
    this.kesslerStartCost = null;
    this.kesslerShipRollElapsed = 0;
    this.kesslerShipRollPending = true;
    this.kesslerShipCostSnapshot = this.calculateSpaceshipTotalCost();
    return true;
  }

  completeProjectFully() {
    const maxSegments = this.getMaxRepeats();
    this.repeatCount = maxSegments;
    this.segmentProgress = 0;
    this.isCompleted = true;
    this.isActive = false;
    this.isPaused = false;
    this.remainingTime = 0;
    this.startingDuration = 0;
    this.applyArtificialSkyCompletionEffects();
  }

  complete() {
    this.kesslerShipRollElapsed = 0;
    this.kesslerShipRollPending = false;
    this.kesslerShipCostSnapshot = null;

    const maxSegments = this.getMaxRepeats();
    this.repeatCount = Math.min(maxSegments, this.repeatCount + 1);

    if (this.repeatCount >= maxSegments) {
      this.completeProjectFully();
      return;
    }

    this.isCompleted = false;
    this.isActive = false;
    this.isPaused = false;
    this.remainingTime = this.getEffectiveDuration();
    this.startingDuration = this.remainingTime;
  }

  applyContinuousProgress(progress) {
    const maxSegments = this.getMaxRepeats();
    const remainingSegments = Math.max(0, maxSegments - (this.repeatCount + this.segmentProgress));
    if (remainingSegments <= 0) {
      this.completeProjectFully();
      return;
    }

    const appliedProgress = Math.max(0, Math.min(remainingSegments, progress));
    const totalProgress = this.segmentProgress + appliedProgress;
    const completed = Math.floor(totalProgress);
    if (completed > 0) {
      this.repeatCount += completed;
    }
    this.segmentProgress = totalProgress - completed;

    if (this.repeatCount >= maxSegments) {
      this.completeProjectFully();
    }
  }

  applyContinuousKesslerConsequences(costPerSegment, failedProgress, seconds) {
    if (failedProgress <= 0) {
      return;
    }

    const debrisFromCost = this.getDebrisEligibleCostAmount(costPerSegment) * failedProgress;
    if (debrisFromCost > 0) {
      this.addKesslerDebris(debrisFromCost);
      if (seconds > 0) {
        this.reportKesslerDebrisRate(debrisFromCost, seconds);
      }
    }

    const shipLoss = failedProgress;
    if (shipLoss > 0) {
      const shipDebris = shipLoss * this.getKesslerShipDebrisPerShip();
      this.addKesslerDebris(shipDebris);
      if (seconds > 0) {
        this.reportKesslerDebrisRate(shipDebris, seconds);
      }
      this.applyKesslerShipLoss(shipLoss);
    }
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) return;
    if (this.isBlockedByPulsarStorm()) return;
    if (!this.canContinue()) {
      this.completeProjectFully();
      return;
    }

    const duration = this.getEffectiveDuration();
    if (!duration || duration === Infinity) {
      this.isActive = false;
      return;
    }

    const maxSegments = this.getMaxRepeats();
    const remainingSegments = Math.max(0, maxSegments - (this.repeatCount + this.segmentProgress));
    if (remainingSegments <= 0) {
      this.completeProjectFully();
      return;
    }

    const requestedProgress = Math.min((deltaTime / duration) * productivity, remainingSegments);
    if (requestedProgress <= 0) {
      return;
    }

    const costPerSegment = this.calculateSpaceshipCost();
    let paidProgress = requestedProgress;
    for (const category in costPerSegment) {
      for (const resource in costPerSegment[category]) {
        const amount = costPerSegment[category][resource];
        if (amount <= 0) {
          continue;
        }
        const pending = accumulatedChanges?.[category]?.[resource] || 0;
        const available = Math.max(0, (resources[category][resource].value || 0) + pending);
        paidProgress = Math.min(paidProgress, available / amount);
      }
    }

    paidProgress = Math.max(0, paidProgress);
    const shortfall = paidProgress < requestedProgress;

    if (paidProgress > 0) {
      for (const category in costPerSegment) {
        for (const resource in costPerSegment[category]) {
          const amount = costPerSegment[category][resource] * paidProgress;
          if (accumulatedChanges) {
            if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
            if (accumulatedChanges[category][resource] === undefined) {
              accumulatedChanges[category][resource] = 0;
            }
            accumulatedChanges[category][resource] -= amount;
          } else {
            resources[category][resource].decrease(amount);
          }
        }
      }

      const successChance = this.getKesslerSuccessChance();
      const failureChance = 1 - successChance;
      const successfulProgress = paidProgress * successChance;
      const failedProgress = paidProgress * failureChance;

      if (successfulProgress > 0) {
        this.applyContinuousProgress(successfulProgress);
      }

      if (failedProgress > 0) {
        const seconds = deltaTime / 1000;
        this.applyContinuousKesslerConsequences(costPerSegment, failedProgress, seconds);
      }
    }

    this.shortfallLastTick = shortfall;
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    if (!this.isContinuous()) {
      return super.estimateProjectCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
    }

    const totals = { cost: {}, gain: {} };
    if (!this.isActive || this.isBlockedByPulsarStorm()) {
      return totals;
    }

    const duration = this.getEffectiveDuration();
    if (!duration || duration === Infinity) {
      return totals;
    }

    const maxSegments = this.getMaxRepeats();
    const remainingSegments = Math.max(0, maxSegments - (this.repeatCount + this.segmentProgress));
    if (remainingSegments <= 0) {
      return totals;
    }

    const requestedProgress = Math.min((deltaTime / duration) * productivity, remainingSegments);
    if (requestedProgress <= 0) {
      return totals;
    }

    const costPerSegment = this.calculateSpaceshipCost();
    let paidProgress = requestedProgress;
    for (const category in costPerSegment) {
      for (const resource in costPerSegment[category]) {
        const amount = costPerSegment[category][resource];
        if (amount <= 0) {
          continue;
        }
        const pending = accumulatedChanges?.[category]?.[resource] || 0;
        const available = Math.max(0, (resources[category][resource].value || 0) + pending);
        paidProgress = Math.min(paidProgress, available / amount);
      }
    }
    paidProgress = Math.max(0, paidProgress);

    const seconds = deltaTime / 1000;
    const progressPerSecond = seconds > 0 ? paidProgress / seconds : 0;
    const rateLabel = this.getCostRateLabel ? this.getCostRateLabel() : this.displayName;

    for (const category in costPerSegment) {
      totals.cost[category] = {};
      for (const resource in costPerSegment[category]) {
        const amount = costPerSegment[category][resource] * paidProgress;
        totals.cost[category][resource] = amount;
        if (applyRates) {
          const rateValue = costPerSegment[category][resource] * progressPerSecond;
          resources[category][resource].modifyRate(-rateValue, rateLabel, 'project');
        }
      }
      if (!Object.keys(totals.cost[category]).length) {
        delete totals.cost[category];
      }
    }

    return totals;
  }

  getSegmentsPerSecond() {
    if (this.getActiveShipCount() <= 0) {
      return 0;
    }
    const duration = this.getEffectiveDuration();
    if (!duration || duration === Infinity) {
      return 0;
    }
    return 1000 / duration;
  }

  createProjectDetailsGridUI(container) {
    super.createProjectDetailsGridUI(container);
    const elements = projectElements[this.name];
    const grid = elements.totalGainElement ? elements.totalGainElement.parentElement : null;
    if (!grid) {
      return;
    }

    const segmentProgressElement = document.createElement('div');
    segmentProgressElement.id = `${this.name}-segment-progress`;
    grid.appendChild(segmentProgressElement);
    projectElements[this.name].segmentProgressElement = segmentProgressElement;
  }

  renderUI(container) {
    const elements = projectElements[this.name] || {};
    if (elements.costElement) {
      elements.costElement.remove();
      delete elements.costElement;
      delete elements.costItems;
      delete elements.costList;
    }
    if (elements.repeatCountElement) {
      elements.repeatCountElement.remove();
      delete elements.repeatCountElement;
    }
    super.renderUI(container);
  }

  updateCostAndGains(elements) {
    if (!elements) return;

    const perSegmentCost = this.calculateSpaceshipCost();
    const costPerSegmentText = Object.entries(perSegmentCost)
      .flatMap(([category, resourcesList]) =>
        Object.entries(resourcesList)
          .filter(([, amount]) => amount > 0)
          .map(([resource, amount]) => {
            const displayName = resources[category][resource].displayName ||
              resource.charAt(0).toUpperCase() + resource.slice(1);
            return `${displayName}: ${formatNumber(amount, true)}`;
          })
      )
      .join(', ');

    if (elements.costPerShipElement) {
      elements.costPerShipElement.style.display = 'none';
    }

    if (elements.totalCostElement) {
      const perSecond = this.isContinuous();
      const totalCost = this.calculateSpaceshipTotalCost(perSecond);
      if (perSecond) {
        elements.totalCostElement.innerHTML = formatTotalCostDisplay(totalCost, this, true)
          .replace(/^Total Cost:/, 'Cost/s:');
      } else {
        const fallbackText = formatTotalCostDisplay(totalCost, this, false).replace(/^Total Cost:\s*/, '');
        elements.totalCostElement.innerHTML = `Segment Cost: ${costPerSegmentText || fallbackText}`;
      }
    }

    if (elements.resourceGainPerShipElement) {
      elements.resourceGainPerShipElement.style.display = 'none';
    }

    if (elements.totalGainElement) {
      const rate = this.getSegmentsPerSecond();
      elements.totalGainElement.textContent = `Build Rate: ${formatNumber(rate, true, 3)} segments/s`;
      elements.totalGainElement.style.display = 'block';
    }

    if (elements.segmentProgressElement) {
      const built = this.getBuiltSegmentsWithProgress();
      const maxSegments = this.getMaxRepeats();
      elements.segmentProgressElement.textContent =
        `Segments Built: ${formatNumber(built, true, 3)} / ${formatNumber(maxSegments, true, 0)}`;
    }
  }

  updateUI() {
    this.maxRepeatCount = this.getMaxRepeats();
    super.updateUI();
  }

  finalizeAssignmentChange(wasContinuous) {
    const nowContinuous = this.isContinuous();
    if (this.isActive && !wasContinuous && nowContinuous && this.startingDuration > 0) {
      const progress = (this.startingDuration - this.remainingTime) / this.startingDuration;
      const carriedProgress = Math.max(0, Math.min(0.999999, progress));
      this.segmentProgress = Math.max(this.segmentProgress, carriedProgress);
    }
    if (this.isActive && wasContinuous && !nowContinuous) {
      this.segmentProgress = 0;
    }
    super.finalizeAssignmentChange(wasContinuous);
  }

  applySpaceMirrorDisableEffect() {
    addEffect({
      target: 'building',
      targetId: 'spaceMirror',
      type: 'permanentBuildingDisable',
      value: true,
      effectId: ARTIFICIAL_SKY_SPACE_MIRROR_EFFECT_ID,
      sourceId: ARTIFICIAL_SKY_SPACE_MIRROR_SOURCE_ID
    });
  }

  applyMagneticShieldDisableEffect() {
    addEffect({
      target: 'project',
      targetId: 'magneticShield',
      type: 'permanentProjectDisable',
      value: true,
      effectId: ARTIFICIAL_SKY_MAGNETIC_SHIELD_EFFECT_ID,
      sourceId: ARTIFICIAL_SKY_MAGNETIC_SHIELD_SOURCE_ID
    });
  }

  applyArtificialSkyLuminosity() {
    const celestialTargets = [
      terraforming?.celestialParameters,
      currentPlanetParameters?.celestialParameters,
      spaceManager?.currentPlanetParameters?.celestialParameters
    ].filter(Boolean);

    for (let index = 0; index < celestialTargets.length; index += 1) {
      celestialTargets[index].starLuminosity = 0;
    }

    if (currentPlanetParameters) {
      delete currentPlanetParameters.star;
    }
    if (spaceManager?.currentPlanetParameters) {
      delete spaceManager.currentPlanetParameters.star;
    }

    setStarLuminosity?.(0);
    terraforming?.updateLuminosity?.();
  }

  applyArtificialSkyCompletionEffects() {
    this.applyArtificialSkyLuminosity();
    this.applySpaceMirrorDisableEffect();
    this.applyMagneticShieldDisableEffect();
  }

  update(deltaTime) {
    if (this.isContinuous()) {
      if (this.isBlockedByPulsarStorm()) {
        this.lastActiveTime = 0;
        return;
      }
      return;
    }
    super.update(deltaTime);
    if (this.isCompleted) {
      this.applyArtificialSkyCompletionEffects();
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      segmentProgress: this.segmentProgress
    };
  }

  loadState(state) {
    this.maxRepeatCount = this.getMaxRepeats();
    super.loadState(state);
    this.segmentProgress = state.segmentProgress || 0;
    const maxSegments = this.getMaxRepeats();
    this.repeatCount = Math.min(this.repeatCount || 0, maxSegments);
    if (this.repeatCount >= maxSegments || this.isCompleted) {
      this.completeProjectFully();
    }
  }
}

try {
  window.ArtificialSkyProject = ArtificialSkyProject;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = ArtificialSkyProject;
} catch (error) {
  // Module system not available in browser
}
