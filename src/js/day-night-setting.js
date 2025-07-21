(function(){
  function applyDayNightSettingEffects(){
    if(typeof buildings === 'undefined') return;
    const targets = ['iceHarvester','solarPanel'];
    targets.forEach(id => {
      const building = buildings[id];
      if(!building) return;

      const effects = [];
      const prodEffect = {
        target: 'building',
        targetId: id,
        type: 'productionMultiplier',
        value: 0.5,
        effectId: `disable-day-night-production-${id}`,
        sourceId: 'settings'
      };
      effects.push(prodEffect);

      if (id === 'iceHarvester') {
        const consEffect = {
          target: 'building',
          targetId: id,
          type: 'consumptionMultiplier',
          value: 0.5,
          effectId: `disable-day-night-consumption-${id}`,
          sourceId: 'settings'
        };
        effects.push(consEffect);
      }

      const cost = (building.cost && building.cost.colony) || {};
      for(const resource in cost){
        effects.push({
          target: 'building',
          targetId: id,
          type: 'maintenanceCostMultiplier',
          resourceCategory: 'colony',
          resourceId: resource,
          value: 0.5,
          effectId: `disable-day-night-maintenance-${id}-${resource}`,
          sourceId: 'settings'
        });
      }

      if(typeof gameSettings !== 'undefined' && gameSettings.disableDayNightCycle && building.dayNightActivity){
        if(typeof addEffect === 'function') effects.forEach(addEffect);
      } else {
        if(typeof removeEffect === 'function') effects.forEach(removeEffect);
      }
    });
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('dayNightCycleToggled'));
    }
  }

  if(typeof module !== 'undefined' && module.exports){
    module.exports = { applyDayNightSettingEffects };
  } else {
    globalThis.applyDayNightSettingEffects = applyDayNightSettingEffects;
  }
})();
