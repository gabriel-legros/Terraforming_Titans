class DeeperMiningProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    this.oreMineCount = 0;
    this.averageDepth = 1;
    this.maxDepth = config.maxDepth || Infinity;
  }

  registerMine() {
    let current = this.oreMineCount;
    const built = buildings.oreMine.count;
    const delta = built - current;
    if (delta > 0) {
      const totalDepth = (this.averageDepth || 1) * current;
      this.oreMineCount = built;
      this.averageDepth = (totalDepth + delta) / this.oreMineCount;
      if (this.attributes?.completionEffect) {
        this.applyCompletionEffect();
      }
      if (this.averageDepth < this.maxDepth) {
        this.isCompleted = false;
        if (typeof updateProjectUI === 'function') {
          updateProjectUI(this.name);
        }
      }
      this.adjustActiveDuration();
    }
  }

  canStart() {
    if (this.averageDepth >= this.maxDepth) {
      return false;
    }
    return super.canStart();
  }

  canContinue() {
    return this.averageDepth < this.maxDepth;
  }

  applyContinuousProgress(fraction, productivity) {
    const depthGain = (fraction || 0) * (productivity || 0);
    const currentDepth = this.averageDepth || 1;
    const newDepth = Math.min(currentDepth + depthGain, this.maxDepth);
    if (newDepth !== this.averageDepth) {
      this.averageDepth = newDepth;
      if (this.attributes?.completionEffect) {
        this.applyCompletionEffect();
      }
    }

    if (this.averageDepth >= this.maxDepth) {
      this.isActive = false;
      this.isCompleted = true;
    }
  }

  getScaledCost() {
    let cost = super.getScaledCost();
    if (this.attributes.costOreMineScaling) {
      const oreMines = Math.max(this.oreMineCount, 1);
      const depth = this.averageDepth || 1;
      const multiplier = oreMines * (0.9 + 0.1 * depth);
      const scaledCost = {};
      for (const category in cost) {
        scaledCost[category] = {};
        for (const resource in cost[category]) {
          scaledCost[category][resource] = cost[category][resource] * multiplier;
        }
      }
      return scaledCost;
    }
    return cost;
  }

  getAndroidSpeedLabelText() {
    return 'Deepening speed boost';
  }

  renderUI(container) {
    super.renderUI(container);
    const elements = projectElements[this.name];
    if (elements?.costElement) {
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.title = '90% of the cost scales with ore mines built. 10% also scales with average depth.';
      info.innerHTML = '&#9432;';
      elements.costElement.appendChild(info);
    }
  }

  applyCompletionEffect() {
    this.attributes.completionEffect.forEach((effect) => {
      const baseValue = effect.value;
      const depth = this.attributes.effectScaling ? (this.averageDepth || 1) : 1;
      const value = baseValue * depth;

      const baseId = effect.effectId || 'deeper_mining';

      addEffect({ ...effect, value, sourceId: this });

      // Scale ore mine consumption
      addEffect({
        target: effect.target,
        targetId: effect.targetId,
        type: 'consumptionMultiplier',
        effectId: `${baseId}_consumption`,
        value,
        sourceId: this
      });

      // Scale ore mine maintenance for each cost resource
      const oreMine = buildings[effect.targetId];
      if (oreMine?.cost?.colony) {
        for (const res in oreMine.cost.colony) {
          addEffect({
            target: effect.target,
            targetId: effect.targetId,
            type: 'maintenanceCostMultiplier',
            resourceCategory: 'colony',
            resourceId: res,
            effectId: `${baseId}_maintenance_${res}`,
            value,
            sourceId: this
          });
        }
      }
    });
  }

  complete() {
    if (this.averageDepth < this.maxDepth) {
      this.averageDepth = Math.min(this.averageDepth + 1, this.maxDepth);
      super.complete();
      if (this.averageDepth >= this.maxDepth) {
        this.isCompleted = true;
      }
    }
  }


  saveState() {
    return {
      ...super.saveState(),
      oreMineCount: this.oreMineCount,
      averageDepth: this.averageDepth,
    };
  }

  loadState(state) {
    super.loadState(state);
    const built = buildings.oreMine.count;
    this.oreMineCount = state.oreMineCount || built;
    this.averageDepth = state.averageDepth || (this.repeatCount || 0) + 1;
    if (this.attributes?.completionEffect) {
      this.applyCompletionEffect();
    }
    this.adjustActiveDuration();
  }
}

try {
  window.DeeperMiningProject = DeeperMiningProject;
} catch (error) {}

try {
  module.exports = DeeperMiningProject;
} catch (error) {}
