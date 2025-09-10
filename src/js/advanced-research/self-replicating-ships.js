function updateShipReplication(deltaTime, resources, globalEffects, accumulatedChanges) {
  if (!globalEffects || typeof globalEffects.isBooleanFlagSet !== 'function') {
    return;
  }
  if (!globalEffects.isBooleanFlagSet('selfReplicatingShips')) {
    return;
  }

  const shipsResource = resources?.special?.spaceships;
  if (!shipsResource) return;

  const assigned =
    typeof projectManager !== 'undefined' &&
    projectManager &&
    typeof projectManager.getAssignedSpaceships === 'function'
      ? projectManager.getAssignedSpaceships()
      : 0;

  const cap = 1e14;
  const available = shipsResource.value;
  const total = available + assigned;
  if (total >= cap) return;

  const rate = available * 0.001;
  const increase = Math.min(rate * (deltaTime / 1000), cap - total);

  if (accumulatedChanges && accumulatedChanges.special) {
    accumulatedChanges.special.spaceships += increase;
  } else {
    shipsResource.value += increase;
  }
  shipsResource.modifyRate(rate, 'Replication', 'global');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = updateShipReplication;
}

if (typeof window !== 'undefined') {
  window.updateShipReplication = updateShipReplication;
}
