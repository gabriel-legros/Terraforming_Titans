const fs = require('fs');
const path = require('path');
const vm = require('vm');

const researchPath = path.join(__dirname, '..', 'src/js', 'research-parameters.js');
const code = fs.readFileSync(researchPath, 'utf8');

describe('Infrared Vision advanced research', () => {
  test('unlocks night operation for ice harvesters', () => {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(code + '; this.researchParameters = researchParameters;', ctx);
    const adv = ctx.researchParameters.advanced;
    const research = adv.find(r => r.id === 'infrared_vision');
    expect(research).toBeDefined();
    expect(research.cost.advancedResearch).toBe(20000);
    const flagEffect = research.effects.find(e => e.target === 'building' && e.targetId === 'iceHarvester' && e.type === 'booleanFlag' && e.flagId === 'dayNightActivity' && e.value === false);
    expect(flagEffect).toBeDefined();
  });
});

const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
const { applyDayNightSettingEffects } = require('../src/js/day-night-setting.js');

function createIceHarvester() {
  return new Building({
    name: 'Ice Harvesters',
    category: 'resource',
    cost: { colony: { metal: 10, electronics: 1 } },
    consumption: { surface: { ice: 1 } },
    production: { colony: { water: 1 } },
    storage: {},
    dayNightActivity: true,
    canBeToggled: true,
    requiresMaintenance: true,
    requiresWorker: 0,
    maintenanceFactor: 5,
    unlocked: false
  }, 'iceHarvester');
}

test('boolean flag lets ice harvester produce at night', () => {
  global.maintenanceFraction = 0.1;
  global.dayNightCycle = { isDay: () => false };
  global.resources = {
    colony: { water: { modifyRate: () => {}, productionRate: 0, consumptionRate: 0, value: 0 } },
    surface: { ice: { modifyRate: () => {}, productionRate: 0, consumptionRate: 0, value: 0 } }
  };
  const harvester = createIceHarvester();
  harvester.active = 1;
  harvester.productivity = 1;
  let changes = { colony: { water: 0 }, surface: { ice: 0 } };
  if (!global.dayNightCycle.isDay() && harvester.dayNightActivity) {
    harvester.productivity = 0;
  }
  harvester.produce(changes, 1000);
  expect(changes.colony.water).toBe(0);

  harvester.addEffect({ type: 'booleanFlag', flagId: 'dayNightActivity', value: false });
  harvester.productivity = 1;
  changes = { colony: { water: 0 }, surface: { ice: 0 } };
  if (!global.dayNightCycle.isDay() && harvester.dayNightActivity) {
    harvester.productivity = 0;
  }
  harvester.produce(changes, 1000);
  expect(changes.colony.water).toBeGreaterThan(0);
});

test('infrared vision removes day-night penalty without loops', () => {
  global.maintenanceFraction = 0.1;
  const harvester = createIceHarvester();
  global.buildings = { iceHarvester: harvester };
  global.addEffect = effect => harvester.addAndReplace(effect);
  global.removeEffect = effect => harvester.removeEffect(effect);
  global.gameSettings = { disableDayNightCycle: true };

  applyDayNightSettingEffects();
  expect(harvester.activeEffects.some(e => e.effectId === 'disable-day-night-production-iceHarvester')).toBe(true);

  let calls = 0;
  global.applyGameEffects = () => {
    calls++;
    if (calls > 10) throw new Error('loop');
    applyDayNightSettingEffects();
  };

  harvester.addEffect({ type: 'booleanFlag', flagId: 'dayNightActivity', value: false });

  expect(calls).toBe(1);
  expect(harvester.activeEffects.some(e => e.effectId === 'disable-day-night-production-iceHarvester')).toBe(false);
});
