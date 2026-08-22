global.Building = class Building {
  constructor(config) {
    this.storage = config.storage;
    this._active = 0n;
    this.activeNumber = 0;
  }

  get active() {
    return this._active;
  }

  set active(value) {
    this._active = value;
    this.activeNumber = Number(value);
  }

  isBooleanFlagSet(flagId) {
    return flagId === 'antimatterWarpLogistics';
  }

  getStorageContribution(category, resource) {
    return this.activeNumber * (this.storage[category]?.[resource] || 0);
  }
};

global.resources = {
  colony: {
    energy: {
      cap: 200_000_000_000_000_000,
      value: 0
    }
  },
  special: {
    antimatter: {
      value: 1_000_000
    }
  },
  space: {
    energy: {
      value: 100_000_000_000_000_000_000
    }
  }
};
global.isAntimatterSpaceEnergySyncActive = () => true;
global.getAntimatterEquivalentValue = () => (
  global.resources.space.energy.value / 2_000_000_000_000_000
);

const { AntimatterBattery } = require('../src/js/buildings/AntimatterBattery.js');

function createBattery() {
  return new AntimatterBattery({
    storage: {
      colony: {
        energy: 1_000_000_000_000_000
      }
    }
  }, 'antimatterBattery');
}

describe('Antimatter battery auto fill', () => {
  it('does not produce an auto-fill rate without an active antimatter battery', () => {
    const battery = createBattery();
    battery.autoFillingEnabled = true;
    const accumulatedChanges = { colony: { energy: 0 } };
    const spaceEnergyBefore = global.resources.space.energy.value;

    expect(battery.getAutoFillEnergyRate(1000)).toBe(0);
    battery.applyAutoFillProduction(1000, accumulatedChanges);
    expect(accumulatedChanges.colony.energy).toBe(0);
    expect(global.resources.space.energy.value).toBe(spaceEnergyBefore);
  });

  it('bases auto-fill throughput on active antimatter battery storage', () => {
    const battery = createBattery();
    battery.active = 1n;
    battery.autoFillingEnabled = true;

    expect(battery.getAutoFillEnergyRate(1000)).toBe(10_000_000_000_000_000);
    expect(battery.getAutoFillEnergyGain(0, 1000)).toBe(10_000_000_000_000_000);

    battery.active = 2n;

    expect(battery.getAutoFillEnergyRate(1000)).toBe(20_000_000_000_000_000);
    expect(battery.getAutoFillEnergyGain(0, 1000)).toBe(20_000_000_000_000_000);
  });
});
