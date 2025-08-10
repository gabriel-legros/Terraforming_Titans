class DeeperMiningProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    this.oreMineCount = 0;
    this.averageDepth = 1;
    this.maxDepth = config.maxDepth || Infinity;
  }

  registerMine() {
    let current = this.oreMineCount;
    let built = 0;
    if (typeof buildings !== 'undefined' && buildings.oreMine) {
      built = buildings.oreMine.count;
    } else if (typeof globalThis !== 'undefined' && globalThis.buildings?.oreMine) {
      built = globalThis.buildings.oreMine.count;
    }
    const delta = built - current;
    if (delta > 0) {
      const totalDepth = this.averageDepth * current;
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
    }
  }

  canStart() {
    if (this.averageDepth >= this.maxDepth) {
      return false;
    }
    return Project.prototype.canStart.call(this);
  }

  getScaledCost() {
    let cost = super.getScaledCost();
    if (this.attributes.costOreMineScaling) {
      const oreMines = Math.max(this.oreMineCount, 1);
      const depth = this.averageDepth;
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

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (elements?.androidSpeedDisplay) {
      const mult = this.getAndroidSpeedMultiplier();
      elements.androidSpeedDisplay.textContent = `Deepening speed boost x${formatNumber(mult, true)}`;
    }
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
      const depth = this.attributes.effectScaling ? this.averageDepth : 1;
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
      const oreMine = buildings?.[effect.targetId];
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
    let built = 0;
    if (typeof buildings !== 'undefined' && buildings.oreMine) {
      built = buildings.oreMine.count;
    } else if (typeof globalThis !== 'undefined' && globalThis.buildings?.oreMine) {
      built = globalThis.buildings.oreMine.count;
    }
    this.oreMineCount =
      state.oreMineCount !== undefined ? state.oreMineCount : built;
    if (state.averageDepth !== undefined) {
      this.averageDepth = state.averageDepth;
    } else {
      this.averageDepth = (this.repeatCount || 0) + 1;
    }
    if (this.attributes?.completionEffect) {
      this.applyCompletionEffect();
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.DeeperMiningProject = DeeperMiningProject;
}

if (typeof module !== 'undefined') {
  module.exports = DeeperMiningProject;
}
