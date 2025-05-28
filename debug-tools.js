(function(){
  function captureValues() {
    const globalVals = {
      ice: resources.surface.ice?.value || 0,
      liquidWater: resources.surface.liquidWater?.value || 0,
      dryIce: resources.surface.dryIce?.value || 0,
      co2: resources.atmospheric.carbonDioxide?.value || 0,
      waterVapor: resources.atmospheric.atmosphericWater?.value || 0,
      buriedIce: 0
    };
    const zonalVals = {};
    if (typeof ZONES !== 'undefined' && terraforming) {
      ZONES.forEach(zone => {
        const bIce = terraforming.zonalWater[zone]?.buriedIce || 0;
        globalVals.buriedIce += bIce;
        zonalVals[zone] = {
          ice: terraforming.zonalWater[zone]?.ice || 0,
          buriedIce: bIce,
          liquidWater: terraforming.zonalWater[zone]?.liquid || 0,
          dryIce: terraforming.zonalSurface[zone]?.dryIce || 0
        };
      });
    }
    return { global: globalVals, zones: zonalVals };
  }

  function isStable(prev, cur, threshold) {
    const keys = ['ice', 'buriedIce', 'liquidWater', 'dryIce', 'co2', 'waterVapor'];
    for (const k of keys) {
      if (Math.abs(cur.global[k] - prev.global[k]) > threshold) return false;
    }
    for (const zone in cur.zones) {
      for (const k of ['ice', 'buriedIce', 'liquidWater', 'dryIce']) {
        if (Math.abs(cur.zones[zone][k] - prev.zones[zone][k]) > threshold) return false;
      }
    }
    return true;
  }

  function buildOverrideObject(values) {
    const surface = {
      ice: { initialValue: values.global.ice },
      liquidWater: { initialValue: values.global.liquidWater },
      dryIce: { initialValue: values.global.dryIce }
    };
    const atmospheric = {
      carbonDioxide: { initialValue: values.global.co2 },
      atmosphericWater: { initialValue: values.global.waterVapor }
    };
    const zonalWater = {};
    const zonalSurface = {};
    for (const zone in values.zones) {
      zonalWater[zone] = {
        liquid: values.zones[zone].liquidWater,
        ice: values.zones[zone].ice,
        buriedIce: values.zones[zone].buriedIce
      };
      zonalSurface[zone] = {
        dryIce: values.zones[zone].dryIce
      };
    }
    return { resources: { surface, atmospheric }, zonalWater, zonalSurface };
  }

  function generateOverrideSnippet(values) {
    return JSON.stringify(buildOverrideObject(values), null, 2);
  }

  function fastForwardToEquilibrium(options = {}) {
    let stepMs = options.stepMs || 1000;
    const maxSteps = options.maxSteps || 100000;
    const stableSteps = options.stableSteps || 10;
    const threshold = options.threshold ?? 1;
    const refineFactor = options.refineFactor || 0.5;
    const minStepMs = options.minStepMs || 1;
    const accelerateFactor = options.accelerateFactor || 2;
    const accelerateThreshold = options.accelerateThreshold || 100;
    const maxStepMs = options.maxStepMs || Infinity;

    let prev = captureValues();
    let stable = 0;
    let unstable = 0;
    let step;

    for (step = 0; step < maxSteps; step++) {
      updateLogic(stepMs);
      const cur = captureValues();

      if (isStable(prev, cur, threshold)) {
        stable++;
        unstable = 0;
      } else {
        stable = 0;
        unstable++;
      }

      if (stable >= stableSteps) {
        if (stepMs > minStepMs) {
          stepMs = Math.max(minStepMs, stepMs * refineFactor);
          stable = 0;
        } else {
          console.log('Equilibrium reached after', step + 1, 'steps');
          console.log('Global values:', cur.global);
          console.log('Zonal values:', cur.zones);
          console.log('Override snippet:\n' + generateOverrideSnippet(cur));
          return cur;
        }
      } else if (unstable >= accelerateThreshold) {
        if (stepMs < maxStepMs) {
          stepMs = Math.min(maxStepMs, stepMs * accelerateFactor);
        }
        unstable = 0;
      }

      prev = cur;
    }

    console.log('Max steps reached without clear equilibrium');
    console.log('Global values:', prev.global);
    console.log('Zonal values:', prev.zones);
    console.log('Override snippet:\n' + generateOverrideSnippet(prev));
    return prev;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fastForwardToEquilibrium, generateOverrideSnippet };
  } else {
    globalThis.fastForwardToEquilibrium = fastForwardToEquilibrium;
    globalThis.generateOverrideSnippet = generateOverrideSnippet;
  }
})();