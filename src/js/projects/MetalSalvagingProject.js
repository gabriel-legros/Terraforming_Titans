class MetalSalvagingProject extends AndroidProject {
  isRelevantToCurrentPlanet(currentPlanetKey) {
    return !this.attributes?.planet || this.attributes.planet === currentPlanetKey;
  }

  getAndroidSpeedMultiplier() {
    return (this.assignedAndroids || 0) * 10;
  }

  getAndroidSpeedLabelText() {
    return t('ui.projects.metalSalvaging.salvageSpeed', null, 'Salvage speed');
  }

  getAndroidSpeedTooltip() {
    return t('ui.projects.metalSalvaging.salvageSpeedTooltip', null, '10 x assigned androids');
  }

  canStart() {
    return (this.assignedAndroids || 0) > 0 && super.canStart();
  }

  estimateProjectCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1) {
    if (!this.isActive) {
      return { cost: {}, gain: {} };
    }
    if (!this.isContinuous()) {
      return super.estimateProjectCostAndGain(deltaTime, applyRates, productivity);
    }
    const duration = this.getEffectiveDuration();
    const amount = (deltaTime / duration) * productivity;
    if (applyRates) {
      resources.surface.scrapMetal.modifyRate(amount / (deltaTime / 1000), this.displayName, 'project');
    }
    return {
      cost: {},
      gain: { surface: { scrapMetal: amount } }
    };
  }

  applyContinuousProgress(fraction, productivity) {
    const amount = fraction * productivity;
    if (amount <= 0) {
      return;
    }
    resources.surface.scrapMetal.increase(amount);
    this.repeatCount += amount;
  }
}

if (typeof window !== 'undefined') {
  window.MetalSalvagingProject = MetalSalvagingProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MetalSalvagingProject;
}
