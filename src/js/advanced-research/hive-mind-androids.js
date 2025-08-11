const androidResearch = new EffectableEntity({ description: 'Android Research' });
androidResearch.getEffectiveProductionMultiplier = function () {
  let multiplier = 1;
  if (this.activeEffects) {
    this.activeEffects.forEach(effect => {
      if (effect.type === 'productionMultiplier') {
        multiplier *= effect.value;
      }
    });
  }
  return multiplier;
};
if (typeof globalThis !== 'undefined') {
  globalThis.androidResearch = androidResearch;
}

function updateAndroidResearch(deltaTime, resources, globalEffects, accumulatedChanges) {
  if (!globalEffects || typeof globalEffects.isBooleanFlagSet !== 'function') {
    return;
  }
  if (!globalEffects.isBooleanFlagSet('hiveMindAndroids')) {
    return;
  }

  const androidsResource = resources?.colony?.androids;
  const researchResource = resources?.colony?.research;
  if (!androidsResource || !researchResource) return;

  const count = androidsResource.value;
  if (count <= 0) return;

  const baseRate = count * 0.001;
  const rate = baseRate * androidResearch.getEffectiveProductionMultiplier();
  const increase = rate * (deltaTime / 1000);

  if (accumulatedChanges && accumulatedChanges.colony) {
    accumulatedChanges.colony.research += increase;
  } else {
    researchResource.value += increase;
  }
  researchResource.modifyRate(rate, 'Android Hive Mind', 'global');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = updateAndroidResearch;
  module.exports.androidResearch = androidResearch;
}

if (typeof window !== 'undefined') {
  window.updateAndroidResearch = updateAndroidResearch;
  window.androidResearch = androidResearch;
}
