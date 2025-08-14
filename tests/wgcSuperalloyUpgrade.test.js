const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC superalloy upgrade', () => {
  class MockResource extends EffectableEntity {
    constructor(v=0){
      super({description:'aa'});
      this.value = v;
    }
    decrease(v){ this.value -= v; }
  }

  function makeFoundry(){
    const config = {
      name:'Superalloy Foundry', category:'production', cost:{colony:{}}, consumption:{},
      production:{ colony:{ superalloys:1 }}, storage:{}, dayNightActivity:false,
      canBeToggled:true, requiresMaintenance:true, maintenanceFactor:1,
      requiresDeposit:null, requiresWorker:0, unlocked:true
    };
    return new Building(config,'superalloyFoundry');
  }

  beforeEach(() => {
    global.resources = { special: { alienArtifact: new MockResource(5) } };
    global.buildings = { superalloyFoundry: makeFoundry() };
    global.addEffect = effect => {
      const b = global.buildings[effect.targetId];
      if(b) b.addAndReplace(effect);
    };
    global.researchManager = { isBooleanFlagSet: () => false };
  });

  test('requires superalloy research and is capped at 900 purchases', () => {
    const wgc = new WarpGateCommand();
    expect(wgc.purchaseUpgrade('superalloyEfficiency')).toBe(false);
    global.researchManager.isBooleanFlagSet = f => f === 'superalloyResearchUnlocked';
    wgc.rdUpgrades.superalloyEfficiency.enabled = true;
    expect(wgc.purchaseUpgrade('superalloyEfficiency')).toBe(true);
    const effect = global.buildings.superalloyFoundry.activeEffects.find(e=>e.effectId==='wgc-superalloyEfficiency');
    expect(effect).toBeDefined();
    expect(effect.value).toBeCloseTo(2);
    expect(wgc.purchaseUpgrade('superalloyEfficiency')).toBe(true);
    const effect2 = global.buildings.superalloyFoundry.activeEffects.find(e=>e.effectId==='wgc-superalloyEfficiency');
    expect(effect2.value).toBeCloseTo(3);
    wgc.rdUpgrades.superalloyEfficiency.purchases = 900;
    expect(wgc.purchaseUpgrade('superalloyEfficiency')).toBe(false);
  });
});
