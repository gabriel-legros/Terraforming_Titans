const fs = require('fs');
const path = require('path');
const vm = require('vm');

const scripts = ['effectable-entity', 'rate-sources', 'resource', 'building'].map(name => {
  const filename = path.resolve(__dirname, '../src/js', name + '.js');
  return new vm.Script(fs.readFileSync(filename, 'utf8'), { filename });
});

function createWorld(initialWater, cap = 100, temperatures = [290, 280, 260]) {
  const zones = Object.fromEntries(['tropical', 'temperate', 'polar'].map((name, i) => [
    name, { value: temperatures[i] }
  ]));
  const game = vm.createContext({
    DEBUG_MODE: false, GAME_RESET_LEVEL, window: {}, resources: {},
    getZones: () => Object.keys(zones), terraforming: { temperature: { zones } },
    t: (_key, _vars, fallback) => fallback
  });
  for (const script of scripts) script.runInContext(game);
  const Resource = vm.runInContext('Resource', game);
  const changes = {};
  for (const [category, keys] of Object.entries({
    colony: ['water'], surface: ['ice', 'liquidWater'], atmospheric: ['atmosphericWater']
  })) {
    game.resources[category] = {};
    changes[category] = {};
    for (const name of keys) {
      game.resources[category][name] = new Resource({ ...defaultPlanetResources[category][name], name, category });
      changes[category][name] = 0;
    }
  }
  Object.assign(game.resources.colony.water, { value: initialWater, cap });
  return { game, changes };
}

// The fixture supplies demand and deliveries in tons. The game owns reservations,
// conversion, source attribution, and the lifetime of a pending payment.
function exercisePayments({ initial, demands, deliveries, dt = 1000, displayMultiplier = 1 }) {
  const { game, changes } = createWorld(initial);
  const pending = {};
  const maintenance = {};
  const seconds = dt / 1000;
  demands.forEach((amount, i) => {
    const structure = Object.assign(Object.create(game.window.Building.prototype), {
      name: 'colony' + i, activeNumber: 1, productivity: 0.5,
      displayProductivity: 0.5 * displayMultiplier, ignoreResourceForProductivityResourceDisplay: true,
      calculateMaintenanceCost: () => ({ water: amount / (0.5 * seconds) })
    });
    structure.applyMaintenance(changes, maintenance, dt, pending);
  });
  const totalDemand = demands.reduce((sum, x) => sum + x, 0);
  expect(maintenance.water).toBeCloseTo(totalDemand, 7);
  let supply = initial;
  // Check each settlement, including a repeated settlement with no new receipts.
  for (const delivery of [0, ...deliveries, 0]) {
    changes.colony.water += delivery;
    supply += delivery;
    game.settleMaintenanceConversions(dt, changes, pending);
    const returned = changes.atmospheric.atmosphericWater;
    const tank = Math.max(0, initial + changes.colony.water);
    expect(returned).toBeCloseTo(Math.min(supply, totalDemand), 7);
    expect(tank + returned).toBeCloseTo(supply, 7);
    const vapor = game.resources.atmospheric.atmosphericWater;
    let left = supply;
    demands.forEach((amount, i) => {
      const paid = Math.min(amount, left);
      const rate = vapor.productionRateByType.building?.['building:colony' + i] ?? 0;
      expect(rate * seconds).toBeCloseTo(paid * displayMultiplier, 7);
      left -= paid;
    });
  }
}

describe('water paid into structure maintenance', () => {
  test.each([
    ['empty tank, project and pump successively pay different colonies', 0, [4, 11, 7], [6, 9]],
    ['stored water, partial payment, then excess supply', 5, [8, 4], [2, 12]],
    ['unfunded maintenance never emits vapor', 0, [0, 8, 4], [0, 0]],
    ['fully funded requests receive no second credit', 30, [8, 0, 4], [5, 3]],
    ['exact exhaustion across two settlements', 3, [3, 2, 5], [2, 5]],
    ['original five-billion-ton pump shortfall over a 20 ms tick', 0, [330e6], [0, 100e6]]
  ])('%s', (_label, initial, demands, deliveries) => {
    exercisePayments({ initial, demands, deliveries, dt: 20 });
  });

  test('display productivity scales the rate breakdown independently of physical mass', () => {
    exercisePayments({ initial: 0.75, demands: [1, 4, 8], deliveries: [0.5, 5], dt: 125, displayMultiplier: 2 });
  });

  test.each([431, 7103, 81289])('reproducible delivery and priority schedules, seed %i', seed => {
    let state = seed;
    function draw(limit) {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return Math.floor((state / 2 ** 32) * limit);
    }
    for (let i = 0; i < 32; i++) {
      const scenario = {
        initial: draw(30) / 4,
        demands: Array.from({ length: 1 + draw(6) }, () => draw(60) / 4),
        deliveries: Array.from({ length: 1 + draw(5) }, () => draw(40) / 4),
        dt: [20, 125, 250, 1000][draw(4)]
      };
      try {
        exercisePayments(scenario);
      } catch (error) {
        throw new Error('Scenario ' + JSON.stringify(scenario) + '\n' + error.message);
      }
    }
  });
});

describe('water overflow at the colony storage boundary', () => {
  test.each([
    ['all frozen, including the freezing point', [210, 240, 273.15], 'ice'],
    ['one warm zone', [200, 273.16, 240], 'liquidWater'],
    ['one zone at the hot threshold', [380, 400, 373.15], 'liquidWater'],
    ['every zone hot', [400, 380, 374], 'atmosphericWater']
  ])('%s', (_label, temperatures, target) => {
    const { game, changes } = createWorld(91, 100, temperatures);
    changes.colony.water = 30;
    game.routeColonyWaterOverflow(250, changes, {});
    game.routeColonyWaterOverflow(250, changes, {});
    const planetary = { ...changes.surface, ...changes.atmospheric };
    expect(planetary[target]).toBe(21);
    expect(changes.colony.water).toBe(9);
    expect(changes.colony.water + Object.values(planetary).reduce((a, b) => a + b, 0)).toBe(30);
  });

  test('an already over-cap tank retains its stock and routes only new eligible water', () => {
    const { game, changes } = createWorld(115, 100);
    changes.colony.water = 16;
    game.routeColonyWaterOverflow(20, changes, { colonyWaterNoOverflow: 6 });
    expect(changes.surface.liquidWater).toBe(10);
    // Protected colony-only imports are handled by the subsequent cap/sale stage.
    expect(changes.colony.water).toBe(6);
  });
});
