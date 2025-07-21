const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { Building } = require('../src/js/building.js');
const { applyDayNightSettingEffects } = require('../src/js/day-night-setting.js');

describe('day-night setting effects', () => {
  function createBuilding(name){
    return new Building({
      name,
      category:'energy',
      cost:{ colony: { metal: 10 } },
      consumption:{},
      production:{ colony: { energy: 1 } },
      storage:{},
      dayNightActivity:true,
      canBeToggled:true,
      requiresMaintenance:true,
      maintenanceFactor:1,
      requiresDeposit:null,
      requiresWorker:0,
      unlocked:true
    }, name);
  }

  test('toggle adds and removes effects and respects research', () => {
    global.maintenanceFraction = 0.1;
    global.buildings = {
      solarPanel: createBuilding('solarPanel'),
      iceHarvester: createBuilding('iceHarvester')
    };
    global.addEffect = effect => buildings[effect.targetId].addAndReplace(effect);
    global.removeEffect = effect => buildings[effect.targetId].removeEffect(effect);
    global.gameSettings = { disableDayNightCycle: true };

    applyDayNightSettingEffects();

    expect(buildings.solarPanel.activeEffects.some(e => e.effectId === 'disable-day-night-production-solarPanel')).toBe(true);
    expect(buildings.solarPanel.activeEffects.some(e => e.effectId === 'disable-day-night-maintenance-solarPanel-metal')).toBe(true);
    expect(buildings.iceHarvester.activeEffects.some(e => e.effectId === 'disable-day-night-production-iceHarvester')).toBe(true);
    expect(buildings.iceHarvester.activeEffects.some(e => e.effectId === 'disable-day-night-consumption-iceHarvester')).toBe(true);

    buildings.iceHarvester.dayNightActivity = false;
    applyDayNightSettingEffects();
    expect(buildings.iceHarvester.activeEffects.some(e => e.effectId === 'disable-day-night-production-iceHarvester')).toBe(false);
    expect(buildings.iceHarvester.activeEffects.some(e => e.effectId === 'disable-day-night-consumption-iceHarvester')).toBe(false);

    global.gameSettings.disableDayNightCycle = false;
    applyDayNightSettingEffects();

    expect(buildings.solarPanel.activeEffects.length).toBe(0);
    expect(buildings.iceHarvester.activeEffects.length).toBe(0);
  });
});
