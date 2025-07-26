const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC R&D upgrades', () => {
  class MockResource extends EffectableEntity {
    constructor(v=0){
      super({description:'aa'});
      this.value = v;
    }
    decrease(v){ this.value -= v; }
  }

  function makeFactory(){
    const config = {
      name:'Component', category:'production', cost:{colony:{}}, consumption:{},
      production:{ colony:{ components:1 }}, storage:{}, dayNightActivity:false,
      canBeToggled:true, requiresMaintenance:true, maintenanceFactor:1,
      requiresDeposit:null, requiresWorker:0, unlocked:true
    };
    return new Building(config,'componentFactory');
  }

  beforeEach(() => {
    global.resources = { special: { alienArtifact: new MockResource(5) } };
    global.buildings = { componentFactory: makeFactory() };
    global.addEffect = effect => {
      const b = global.buildings[effect.targetId];
      if(b) b.addAndReplace(effect);
    };
  });

  test('purchaseUpgrade increases production multiplier', () => {
    const wgc = new WarpGateCommand();
    expect(wgc.purchaseUpgrade('componentsEfficiency')).toBe(true);
    const effect = global.buildings.componentFactory.activeEffects.find(e=>e.effectId==='wgc-componentsEfficiency');
    expect(effect).toBeDefined();
    expect(effect.value).toBeCloseTo(1.01);
    expect(global.resources.special.alienArtifact.value).toBe(4);
  });
});
