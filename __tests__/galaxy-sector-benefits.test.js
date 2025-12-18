const hadUhfFactionId = Object.prototype.hasOwnProperty.call(global, 'UHF_FACTION_ID');
const previousUhfFactionId = global.UHF_FACTION_ID;
global.UHF_FACTION_ID = 'uhf';

const { GalaxyFaction } = require('../src/js/galaxy/faction.js');

function createSector({
  value = 1000,
  control = {},
  originalControllerId = null,
  lastFullControllerId = null,
} = {}) {
  return {
    value,
    control: { ...control },
    originalControllerId,
    lastFullControllerId,
    getControlValue(id) {
      return this.control[id] || 0;
    },
    getDominantController() {
      const entries = Object.entries(this.control);
      if (!entries.length) {
        return null;
      }
      let bestId = '';
      let bestValue = -Infinity;
      let tie = false;
      entries.forEach(([factionId, rawValue]) => {
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue) || numericValue <= 0) {
          return;
        }
        if (numericValue > bestValue) {
          bestValue = numericValue;
          bestId = factionId;
          tie = false;
          return;
        }
        if (numericValue === bestValue) {
          tie = true;
        }
      });
      if (bestValue <= 0 || tie) {
        return null;
      }
      return { factionId: bestId, value: bestValue };
    },
    getValue() {
      return this.value;
    },
  };
}

describe('Galaxy sector benefits', () => {
  afterAll(() => {
    if (!hadUhfFactionId) {
      delete global.UHF_FACTION_ID;
      return;
    }
    global.UHF_FACTION_ID = previousUhfFactionId;
  });

  test('AI sector defense and fleet capacity go to last full controller only', () => {
    const alpha = new GalaxyFaction({ id: 'alpha', name: 'Alpha' });
    const beta = new GalaxyFaction({ id: 'beta', name: 'Beta' });

    const sector = createSector({
      value: 1000,
      control: { alpha: 0.4, beta: 0.6 },
      lastFullControllerId: 'alpha',
    });

    alpha.updateFleetCapacity({ getSectors: () => [sector] });
    beta.updateFleetCapacity({ getSectors: () => [sector] });

    expect(alpha.fleetCapacity).toBe(1000);
    expect(beta.fleetCapacity).toBe(0);
    expect(alpha.getSectorDefense(sector, { getSectors: () => [sector] })).toBe(1000);
    expect(beta.getSectorDefense(sector, { getSectors: () => [sector] })).toBe(0);
  });

  test('missing last-full data falls back to original controller', () => {
    const alpha = new GalaxyFaction({ id: 'alpha', name: 'Alpha' });
    const beta = new GalaxyFaction({ id: 'beta', name: 'Beta' });

    const sector = createSector({
      value: 500,
      control: { alpha: 0.4, beta: 0.6 },
      originalControllerId: 'beta',
    });

    alpha.updateFleetCapacity({ getSectors: () => [sector] });
    beta.updateFleetCapacity({ getSectors: () => [sector] });

    expect(alpha.fleetCapacity).toBe(0);
    expect(beta.fleetCapacity).toBe(500);
    expect(alpha.getSectorDefense(sector, null)).toBe(0);
    expect(beta.getSectorDefense(sector, null)).toBe(500);
  });

  test('missing memory data falls back to dominant controller', () => {
    const alpha = new GalaxyFaction({ id: 'alpha', name: 'Alpha' });
    const beta = new GalaxyFaction({ id: 'beta', name: 'Beta' });

    const sector = createSector({
      value: 250,
      control: { alpha: 0.4, beta: 0.6 },
    });

    alpha.updateFleetCapacity({ getSectors: () => [sector] });
    beta.updateFleetCapacity({ getSectors: () => [sector] });

    expect(alpha.fleetCapacity).toBe(0);
    expect(beta.fleetCapacity).toBe(250);
  });
});
