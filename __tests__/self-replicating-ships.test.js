const { describe, beforeEach, test, expect } = global;

describe('Self-replicating ships', () => {
  let updateShipReplication;
  let shipsResource;
  let accumulatedChanges;

  beforeEach(() => {
    jest.resetModules();
    shipsResource = { value: 0, modifyRate: jest.fn() };
    global.resources = { special: { spaceships: shipsResource } };
    global.projectManager = {
      projects: {
        oreSpaceMining: { assignedSpaceships: 0 }
      }
    };
    global.warpGateNetworkManager = {
      getCapForResource: () => 0
    };
    accumulatedChanges = { special: { spaceships: 0 } };
    updateShipReplication = require('../src/js/advanced-research/self-replicating-ships.js');
  });

  test('scales replication rate by import cap headroom', () => {
    shipsResource.value = 1000;
    projectManager.projects.oreSpaceMining.assignedSpaceships = 200;
    warpGateNetworkManager.getCapForResource = () => 500;

    updateShipReplication(1000, resources, { isBooleanFlagSet: () => true }, accumulatedChanges);

    expect(accumulatedChanges.special.spaceships).toBeCloseTo(0.3, 5);
    expect(shipsResource.modifyRate).toHaveBeenCalledWith(0.3, 'Replication', 'global');
  });

  test('skips replication when import cap is fully assigned', () => {
    shipsResource.value = 100;
    projectManager.projects.oreSpaceMining.assignedSpaceships = 500;
    warpGateNetworkManager.getCapForResource = () => 500;

    updateShipReplication(1000, resources, { isBooleanFlagSet: () => true }, accumulatedChanges);

    expect(accumulatedChanges.special.spaceships).toBe(0);
    expect(shipsResource.modifyRate).not.toHaveBeenCalled();
  });
});
