(function(){
  function captureValues() {
    const globalVals = {
      ice: resources.surface.ice?.value || 0,
      liquidWater: resources.surface.liquidWater?.value || 0,
      dryIce: resources.surface.dryIce?.value || 0,
      co2: resources.atmospheric.carbonDioxide?.value || 0,
      waterVapor: resources.atmospheric.atmosphericWater?.value || 0
    };
    const zonalVals = {};
    if (typeof ZONES !== 'undefined' && terraforming) {
      ZONES.forEach(zone => {
        zonalVals[zone] = {
          ice: terraforming.zonalWater[zone]?.ice || 0,
          liquidWater: terraforming.zonalWater[zone]?.liquid || 0,
          dryIce: terraforming.zonalSurface[zone]?.dryIce || 0
        };
      });
    }
    return { global: globalVals, zones: zonalVals };
  }

  function isStable(prev, cur, threshold) {
    const keys = ['ice', 'liquidWater', 'dryIce', 'co2', 'waterVapor'];
    for (const k of keys) {
      if (Math.abs(cur.global[k] - prev.global[k]) > threshold) return false;
    }
    for (const zone in cur.zones) {
      for (const k of ['ice', 'liquidWater', 'dryIce']) {
        if (Math.abs(cur.zones[zone][k] - prev.zones[zone][k]) > threshold) return false;
      }
    }
    return true;
  }

  function fastForwardToEquilibrium(options = {}) {
    const stepMs = options.stepMs || 1000;
    const maxSteps = options.maxSteps || 100000;
    const stableSteps = options.stableSteps || 10;
    const threshold = options.threshold || 1;
    let prev = captureValues();
    let stable = 0;
    let step;
    for (step = 0; step < maxSteps; step++) {
      updateLogic(stepMs);
      const cur = captureValues();
      if (isStable(prev, cur, threshold)) {
        stable++;
      } else {
        stable = 0;
      }
      if (stable >= stableSteps) {
        console.log('Equilibrium reached after', step + 1, 'steps');
        console.log('Global values:', cur.global);
        console.log('Zonal values:', cur.zones);
        return cur;
      }
      prev = cur;
    }
    console.log('Max steps reached without clear equilibrium');
    console.log('Global values:', prev.global);
    console.log('Zonal values:', prev.zones);
    return prev;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fastForwardToEquilibrium };
  } else {
    globalThis.fastForwardToEquilibrium = fastForwardToEquilibrium;
  }
})();