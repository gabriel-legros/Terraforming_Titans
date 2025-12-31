const { GalaxyOperationManager } = require('../src/js/galaxy/operation.js');

function createFaction(id, fleetPower) {
  return {
    id,
    fleetPower,
    setFleetPower(value) {
      this.fleetPower = value;
    },
    getOperationalFleetPower() {
      return this.fleetPower;
    }
  };
}

function createSector() {
  const control = { alpha: 40, beta: 60 };
  return {
    key: '0,0',
    q: 0,
    r: 0,
    control,
    getControlValue(id) {
      return this.control[id] || 0;
    },
    getTotalControlValue() {
      return Object.values(this.control).reduce((sum, value) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) && numeric > 0 ? sum + numeric : sum;
      }, 0);
    },
    setControl(id, value) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        this.control[id] = numeric;
        return;
      }
      delete this.control[id];
    },
    clearControl(id) {
      delete this.control[id];
    },
    getValue() {
      return 100;
    }
  };
}

function createDefenseSummary(targetFactionId) {
  const entries = [
    { factionId: 'alpha', basePower: 100, fleetPower: 400, totalPower: 500 },
    { factionId: 'beta', basePower: 50, fleetPower: 150, totalPower: 200 }
  ];
  const filtered = targetFactionId
    ? entries.filter((entry) => entry.factionId === targetFactionId)
    : entries.slice();
  const basePower = filtered.reduce((sum, entry) => sum + entry.basePower, 0);
  const fleetPower = filtered.reduce((sum, entry) => sum + entry.fleetPower, 0);
  const totalPower = filtered.reduce((sum, entry) => sum + entry.totalPower, 0);
  return {
    basePower,
    fleetPower,
    totalPower,
    contributions: filtered.map((entry) => ({
      factionId: entry.factionId,
      basePower: entry.basePower,
      fleetPower: entry.fleetPower,
      totalPower: entry.totalPower
    }))
  };
}

function createOperationContext() {
  const sector = createSector();
  const factions = new Map([
    ['uhf', createFaction('uhf', 1000)],
    ['alpha', createFaction('alpha', 500)],
    ['beta', createFaction('beta', 300)]
  ]);
  const manager = {
    enabled: true,
    sectors: new Map([[sector.key, sector]]),
    getSector(q, r) {
      return q === sector.q && r === sector.r ? sector : null;
    },
    getFaction(id) {
      return factions.get(id) || null;
    }
  };
  const operationManager = new GalaxyOperationManager(manager, {
    uhfFactionId: 'uhf',
    hasNeighboringStronghold: () => false,
    hasFactionPresence: () => true,
    isFactionFullControlSector: () => false,
    isSectorTargetingRestricted: () => false,
    updateSectorControl: (target, mutator) => mutator(target),
    getDefenseSummary: (sectorArg, attackerId, targetFactionId) => createDefenseSummary(targetFactionId),
    resolveTargetFaction: () => 'beta'
  });
  return { operationManager, sector, factions };
}

describe('Galaxy operation targeting', () => {
  test('player operations evaluate only the targeted faction defense', () => {
    const { operationManager, sector } = createOperationContext();
    const chance = operationManager.getOperationSuccessChance({
      sectorKey: sector.key,
      factionId: 'uhf',
      assignedPower: 300
    });
    expect(chance).toBeCloseTo(0.5);
    const estimate = operationManager.getOperationLossEstimate({
      sectorKey: sector.key,
      factionId: 'uhf',
      assignedPower: 300
    });
    expect(estimate.targetFactionId).toBe('beta');
    expect(estimate.defensePower).toBeCloseTo(200);
  });

  test('operations only strip control and fleet power from the chosen target', () => {
    const { operationManager, sector, factions } = createOperationContext();
    const operation = operationManager.startOperation({
      sectorKey: sector.key,
      factionId: 'uhf',
      assignedPower: 500,
      durationMs: 1000,
      successChance: 1
    });
    expect(operation).toBeTruthy();
    operationManager.update(1000);

    expect(sector.control.alpha).toBeCloseTo(40);
    expect(sector.control.beta).toBeCloseTo(50);
    expect(sector.control.uhf).toBeCloseTo(10);
    expect(factions.get('alpha').fleetPower).toBeCloseTo(500);
    expect(factions.get('beta').fleetPower).toBeCloseTo(100);
  });

  test('multiple factions can launch operations against the same sector', () => {
    const { operationManager, sector } = createOperationContext();
    const alphaOperation = operationManager.startOperation({
      sectorKey: sector.key,
      factionId: 'alpha',
      assignedPower: 200,
      durationMs: 1000,
      successChance: 0.5
    });
    expect(alphaOperation).toBeTruthy();

    const uhfOperation = operationManager.startOperation({
      sectorKey: sector.key,
      factionId: 'uhf',
      assignedPower: 300,
      durationMs: 1000,
      successChance: 0.5
    });
    expect(uhfOperation).toBeTruthy();
    expect(operationManager.getOperationForSector(sector.key, 'alpha')).toBe(alphaOperation);
    expect(operationManager.getOperationForSector(sector.key, 'uhf')).toBe(uhfOperation);
    expect(operationManager.operations.size).toBe(2);
  });
});
