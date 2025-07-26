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

  const rate = count * 0.001;
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
}

if (typeof window !== 'undefined') {
  window.updateAndroidResearch = updateAndroidResearch;
}
