const { GalaxyOperationManager } = require('../src/js/galaxy/operation.js');

function createFaction(id, fleetPower, name = id) {
  return {
    id,
    name,
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
  return {
    key: '0,0',
    q: 0,
    r: 0,
    control: { uhf: 100 },
    getControlValue(id) {
      return this.control[id] || 0;
    },
    getTotalControlValue() {
      return Object.values(this.control).reduce((sum, value) => sum + Number(value || 0), 0);
    },
    setControl(id, value) {
      this.control[id] = value;
    },
    getValue() {
      return 100;
    },
    getDisplayName() {
      return 'R5-06';
    }
  };
}

function createDefenseSummary(defensePower) {
  return {
    basePower: 0,
    fleetPower: defensePower,
    totalPower: defensePower,
    contributions: [{ factionId: 'uhf', basePower: 0, fleetPower: defensePower, totalPower: defensePower }]
  };
}

function createOperationContext(defensePower) {
  const sector = createSector();
  const factions = new Map([
    ['uhf', createFaction('uhf', 5000, 'UHF')],
    ['alpha', createFaction('alpha', 5000, 'Alpha Collective')]
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
    getDefenseSummary: () => createDefenseSummary(defensePower),
    resolveTargetFaction: () => 'uhf'
  });
  return { operationManager, sector };
}

describe('Galaxy operation attack history', () => {
  test('records completed attacks against UHF sectors', () => {
    const { operationManager, sector } = createOperationContext(200);
    operationManager.startOperation({
      sectorKey: sector.key,
      factionId: 'alpha',
      assignedPower: 100,
      durationMs: 1
    });
    operationManager.update(1);

    const history = operationManager.getRecentAttackHistory(5);
    expect(history).toHaveLength(1);
    expect(history[0].sectorKey).toBe(sector.key);
    expect(history[0].sectorName).toBe('R5-06');
    expect(history[0].enemyPower).toBe(100);
    expect(history[0].successfulDefense).toBe(true);
    expect(history[0].uhfLosses).toBeGreaterThan(0);
  });

  test('limits recent history to requested length', () => {
    const { operationManager, sector } = createOperationContext(50);
    for (let index = 0; index < 6; index += 1) {
      operationManager.startOperation({
        sectorKey: sector.key,
        factionId: 'alpha',
        assignedPower: 200,
        durationMs: 1
      });
      operationManager.update(1);
    }

    const history = operationManager.getRecentAttackHistory(5);
    expect(history).toHaveLength(5);
    expect(history[0].enemyPower).toBe(200);
  });
});

