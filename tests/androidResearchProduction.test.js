const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('android research production', () => {
  function createContext(flag) {
    const ctx = { console };
    vm.createContext(ctx);
    ctx.EffectableEntity = EffectableEntity;
    ctx.dayNightCycle = { isDay: () => true };
    ctx.structures = {};
    ctx.buildings = {};
    ctx.colonies = {};
    ctx.terraforming = { updateResources: () => {}, distributeGlobalChangesToZones: () => {} };
    ctx.fundingModule = null;
    ctx.lifeManager = null;
    ctx.researchManager = null;
    ctx.projectManager = null;
    ctx.globalEffects = new EffectableEntity({ description: 'global' });
    if (flag) {
      ctx.globalEffects.addAndReplace({ type: 'booleanFlag', flagId: 'hiveMindAndroids', value: true, sourceId: 'test' });
    }
    function stubResource(val = 0) {
      return {
        value: val,
        cap: Infinity,
        hasCap: false,
        updateStorageCap: () => {},
        resetRates: function(){},
        recalculateTotalRates: () => {},
        modifyRate: jest.fn()
      };
    }
    ctx.resources = { colony:{ androids: stubResource(100), research: stubResource(0) }, surface:{}, underground:{}, atmospheric:{}, special:{} };
    const code = fs.readFileSync(path.join(__dirname,'..','src/js','advanced-research','hive-mind-androids.js'),'utf8');
    vm.runInContext(code + '; this.updateAndroidResearch = updateAndroidResearch;', ctx);
    const resourceCode = fs.readFileSync(path.join(__dirname,'..','src/js','resource.js'),'utf8');
    vm.runInContext(resourceCode + '; this.produceResources = produceResources;', ctx);
    global.colonies = ctx.colonies;
    global.androidResearch = ctx.androidResearch;
    return ctx;
  }

  test('produces research when enabled', () => {
    const ctx = createContext(true);
    vm.runInContext('produceResources(1000, {})', ctx);
    expect(ctx.resources.colony.research.value).toBeCloseTo(0.1);
    expect(ctx.resources.colony.research.modifyRate).toHaveBeenCalledWith(0.1, 'Android Hive Mind', 'global');
  });

  test('production scales with global research boost', () => {
    const ctx = createContext(true);
    ctx.globalEffects.addAndReplace({ type: 'globalResearchBoost', value: 0.5, effectId: 'skill', sourceId: 'skill' });
    vm.runInContext('produceResources(1000, {})', ctx);
    expect(ctx.resources.colony.research.value).toBeCloseTo(0.15);
    const [[rate, source, type]] = ctx.resources.colony.research.modifyRate.mock.calls;
    expect(rate).toBeCloseTo(0.15);
    expect(source).toBe('Android Hive Mind');
    expect(type).toBe('global');
  });

  test('no production when disabled', () => {
    const ctx = createContext(false);
    vm.runInContext('produceResources(1000, {})', ctx);
    expect(ctx.resources.colony.research.value).toBe(0);
  });
});
