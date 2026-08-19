global.Building = class Building {
  constructor() {
    this.active = 0n;
  }

  isBooleanFlagSet(flagId) {
    return flagId === 'antimatterWarpLogistics';
  }
};

global.resources = {
  colony: {
    energy: {
      cap: 200_000_000_000_000,
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

describe('Antimatter battery auto fill', () => {
  it('does not produce an auto-fill rate without an active antimatter battery', () => {
    const battery = new AntimatterBattery({}, 'antimatterBattery');
    battery.autoFillingEnabled = true;
    const accumulatedChanges = { colony: { energy: 0 } };
    const spaceEnergyBefore = global.resources.space.energy.value;

    expect(battery.getAutoFillEnergyRate(1000)).toBe(0);
    battery.applyAutoFillProduction(1000, accumulatedChanges);
    expect(accumulatedChanges.colony.energy).toBe(0);
    expect(global.resources.space.energy.value).toBe(spaceEnergyBefore);
  });

  it('produces the configured auto-fill rate with an active antimatter battery', () => {
    const battery = new AntimatterBattery({}, 'antimatterBattery');
    battery.active = 1n;
    battery.autoFillingEnabled = true;

    expect(battery.getAutoFillEnergyRate(1000)).toBe(2_000_000_000_000_000);
  });
});
