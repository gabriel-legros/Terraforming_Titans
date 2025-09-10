const fs = require('fs');
const path = require('path');
const vm = require('vm');
const EffectableEntity = require('../src/js/effectable-entity.js');

describe('spaceship self replication', () => {
  function createContext(flag, assigned = 0) {
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
    ctx.projectManager = {
      getAssignedSpaceships: () => assigned,
      estimateProjects: () => {}
    };
    ctx.globalEffects = new EffectableEntity({ description: 'global' });
    if (flag) {
      ctx.globalEffects.addAndReplace({ type: 'booleanFlag', flagId: 'selfReplicatingShips', value: true, sourceId: 'test' });
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
    ctx.resources = { colony:{}, surface:{}, underground:{}, atmospheric:{}, special:{ spaceships: stubResource(1000) } };
    const replicationCode = fs.readFileSync(path.join(__dirname,'..','src/js','advanced-research','self-replicating-ships.js'),'utf8');
    vm.runInContext(replicationCode + '; this.updateShipReplication = updateShipReplication;', ctx);
    const resourceCode = fs.readFileSync(path.join(__dirname,'..','src/js','resource.js'),'utf8');
    vm.runInContext(resourceCode + '; this.produceResources = produceResources;', ctx);
    return ctx;
  }

  test('replicates when enabled', () => {
    const ctx = createContext(true);
    vm.runInContext('produceResources(1000, {})', ctx);
    expect(ctx.resources.special.spaceships.value).toBeCloseTo(1001);
    expect(ctx.resources.special.spaceships.modifyRate).toHaveBeenCalledWith(1, 'Replication', 'global');
  });

  test('respects cap', () => {
    const ctx = createContext(true);
    ctx.resources.special.spaceships.value = 1e14 - 1;
    vm.runInContext('produceResources(1000, {})', ctx);
    expect(ctx.resources.special.spaceships.value).toBeCloseTo(1e14);
  });

  test('counts assigned ships toward cap', () => {
    const ctx = createContext(true, 50);
    ctx.resources.special.spaceships.value = 1e14 - 60;
    vm.runInContext('produceResources(1000, {})', ctx);
    expect(ctx.resources.special.spaceships.value).toBeCloseTo(1e14 - 50);
  });

  test('no replication when disabled', () => {
    const ctx = createContext(false);
    vm.runInContext('produceResources(1000, {})', ctx);
    expect(ctx.resources.special.spaceships.value).toBe(1000);
  });
});
