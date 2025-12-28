function updateShipReplication(deltaTime, resources, globalEffects, accumulatedChanges) {
  if (!globalEffects.isBooleanFlagSet('selfReplicatingShips')) {
    return;
  }

  const shipsResource = resources.special.spaceships;
  const metalImportAssigned = projectManager.projects.oreSpaceMining.assignedSpaceships;
  const baseReplicators = Math.max(0, warpGateNetworkManager.getCapForResource('metal') - metalImportAssigned);
  const available = shipsResource.value;
  if (available < 1 || baseReplicators <= 0) return;

  const replicatingShips = Math.min(available, baseReplicators);
  const rate = replicatingShips * 0.001;
  const increase = rate * (deltaTime / 1000);

  accumulatedChanges.special.spaceships += increase;
  shipsResource.modifyRate(rate, 'Replication', 'global');
}

try {
  module.exports = updateShipReplication;
} catch (err) {}

try {
  window.updateShipReplication = updateShipReplication;
} catch (err) {}
