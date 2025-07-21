function updateShipReplication(deltaTime, resources, globalEffects, accumulatedChanges) {
  if (!globalEffects || typeof globalEffects.isBooleanFlagSet !== 'function') {
    return;
  }
  if (!globalEffects.isBooleanFlagSet('selfReplicatingShips')) {
    return;
  }

  const shipsResource = resources?.special?.spaceships;
  if (!shipsResource) return;

  const cap = 1e12;
  const current = shipsResource.value;
  if (current >= cap) return;

  const rate = current * 0.001;
  const increase = Math.min(rate * (deltaTime / 1000), cap - current);

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
