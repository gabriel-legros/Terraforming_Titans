// RWG Equilibration: isolate terraforming simulation and fast-forward to a steady state
(function() {
  function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }
  function deepMerge(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        const t = target[key];
        const s = source[key];
        if (isObject(t) && isObject(s)) output[key] = deepMerge(t, s);
        else if (s !== undefined) output[key] = s;
      });
    }
    return output;
  }

  const ZONE_KEYS = ['tropical', 'temperate', 'polar'];
  const MIN_TERRAFORMING_SUBSTEP_MS = terraformingParameters.gameplay.simulation.resourceSubstepMs;

  function quantizeEquilibrationStepMs(stepMs) {
    const numericStep = Number(stepMs) || 0;
    if (numericStep <= MIN_TERRAFORMING_SUBSTEP_MS) {
      return MIN_TERRAFORMING_SUBSTEP_MS;
    }
    return Math.max(
      MIN_TERRAFORMING_SUBSTEP_MS,
      Math.round(numericStep / MIN_TERRAFORMING_SUBSTEP_MS) * MIN_TERRAFORMING_SUBSTEP_MS
    );
  }

  function ensureEquilibrationZones(terra) {
    const zonalSurface = terra.zonalSurface || (terra.zonalSurface = {});
    const resourceKeys = new Set();
    (terra.zonalSurfaceResourceConfigs || []).forEach((config) => {
      (config.keys || []).forEach((key) => resourceKeys.add(key));
    });
    resourceKeys.forEach((key) => {
      ZONE_KEYS.forEach((zone) => {
        if (zonalSurface[key][zone] === undefined) {
          zonalSurface[key][zone] = 0;
        }
      });
    });
  }

  function buildSandboxResourcesFromOverride(overrideResources) {
    const res = {};
    const mergedResources = deepMerge(defaultPlanetParameters.resources, overrideResources || {});
    for (const cat of Object.keys(mergedResources)) {
      res[cat] = {};
      const bucket = mergedResources[cat];
      for (const key of Object.keys(bucket)) {
        const entry = bucket[key] || {};
        const initialValue = entry.initialValue || 0;
        res[cat][key] = {
          value: initialValue,
          productionRateByType: {},
          consumptionRateByType: {},
          modifyRate: function(value, source, rateType) {
            if (!(value > 0) && !(value < 0)) {
              return;
            }
            const typeKey = rateType || 'unknown';
            const sourceKey = source || 'Unknown';
            if (value > 0) {
              const prod = this.productionRateByType;
              if (!prod[typeKey]) {
                prod[typeKey] = {};
              }
              prod[typeKey][sourceKey] = (prod[typeKey][sourceKey] || 0) + value;
              return;
            }
            const cons = this.consumptionRateByType;
            if (!cons[typeKey]) {
              cons[typeKey] = {};
            }
            cons[typeKey][sourceKey] = (cons[typeKey][sourceKey] || 0) - value;
          },
          zonalConfig: entry.zonalConfig,
        };
      }
    }
    return res;
  }


  function copyBackToOverrideFromSandbox(override, sandboxResources, terra) {
    const out = JSON.parse(JSON.stringify(override));
    // Write atmospheric and surface resources back into override
    const atmoKeys = ['carbonDioxide','inertGas','oxygen','atmosphericWater','greenhouseGas','atmosphericMethane','atmosphericAmmonia','hydrogen','sulfuricAcid','calciteAerosol','vanadiumAerosol'];
    out.resources = out.resources || {};
    out.resources.atmospheric = out.resources.atmospheric || {};
    atmoKeys.forEach(k => {
      const v = sandboxResources.atmospheric && sandboxResources.atmospheric[k] ? sandboxResources.atmospheric[k].value || 0 : 0;
      out.resources.atmospheric[k] = out.resources.atmospheric[k] || {}; out.resources.atmospheric[k].initialValue = v;
    });
    const surfKeys = ['ice','liquidWater','dryIce','liquidCO2','liquidHydrogen','liquidMethane','hydrocarbonIce','liquidAmmonia','ammoniaIce','liquidOxygen','oxygenIce','buriedOxygenIce','liquidNitrogen','nitrogenIce','buriedNitrogenIce'];
    out.resources.surface = out.resources.surface || {};
    surfKeys.forEach(k => {
      const v = sandboxResources.surface && sandboxResources.surface[k] ? sandboxResources.surface[k].value || 0 : 0;
      out.resources.surface[k] = out.resources.surface[k] || {}; out.resources.surface[k].initialValue = v;
    });
    // Zonal structures copied from terraforming instance
    if (terra) {
      out.zonalSurface = JSON.parse(JSON.stringify(terra.zonalSurface || {}));

      if (terra.celestialParameters) {
        out.celestialParameters = JSON.parse(JSON.stringify(terra.celestialParameters));
      }

      const eqT = terra.temperature && typeof terra.temperature.effectiveTempNoAtmosphere === 'number'
        ? terra.temperature.effectiveTempNoAtmosphere
        : undefined;
      if (eqT !== undefined) {
        out.classification = out.classification || {};
        out.classification.TeqK = Math.round(eqT);
      }

      if (terra.temperature && terra.temperature.zones && typeof getZonePercentage === 'function') {
        const z = terra.temperature.zones;
        const weights = {
          tropical: getZonePercentage('tropical'),
          temperate: getZonePercentage('temperate'),
          polar: getZonePercentage('polar')
        };
        const day = z.tropical.day * weights.tropical + z.temperate.day * weights.temperate + z.polar.day * weights.polar;
        const night = z.tropical.night * weights.tropical + z.temperate.night * weights.temperate + z.polar.night * weights.polar;
        out.finalTemps = { mean: terra.temperature.value, day, night };
      }
      if (terra?.temperature?.zones) {
        const prev = out.zonalTemperatures || {};
        const zonalTemps = {};
        const zones = ['tropical', 'temperate', 'polar'];
        for (const zone of zones) {
          const src = terra.temperature.zones[zone];
          if (!src && !prev[zone]) continue;
          const mean = (src && (src.value ?? src.initial)) ?? prev[zone]?.value;
          const day = (src && (src.day ?? src.value ?? src.initial)) ?? prev[zone]?.day ?? mean;
          const night = (src && (src.night ?? src.value ?? src.initial)) ?? prev[zone]?.night ?? mean;
          zonalTemps[zone] = { value: mean, day, night };
        }
        if (Object.keys(zonalTemps).length > 0) {
          out.zonalTemperatures = { ...prev, ...zonalTemps };
        }
      }
    }
    return out;
  }

  function snapshotMetrics(terra) {
    const atmo = terra.resources.atmospheric || {};
    const surf = terra.resources.surface || {};
    function g(obj, k) { return obj[k] ? (obj[k].value || 0) : 0; }
    const metrics = [
      g(atmo,'carbonDioxide'), g(atmo,'inertGas'), g(atmo,'oxygen'), g(atmo,'atmosphericWater'), g(atmo,'greenhouseGas'), g(atmo,'atmosphericMethane'), g(atmo,'atmosphericAmmonia'), g(atmo,'hydrogen'), g(atmo,'sulfuricAcid'), g(atmo,'calciteAerosol'), g(atmo,'vanadiumAerosol'),
      g(surf,'ice'), g(surf,'liquidWater'), g(surf,'dryIce'), g(surf,'liquidCO2'), g(surf,'liquidHydrogen'), g(surf,'liquidMethane'), g(surf,'hydrocarbonIce'), g(surf,'liquidAmmonia'), g(surf,'ammoniaIce'),
      g(surf,'liquidOxygen'), g(surf,'oxygenIce'), g(surf,'liquidNitrogen'), g(surf,'nitrogenIce')
    ];
    const zones = ['tropical', 'temperate', 'polar'];
    for (const zone of zones) {
       const zs = terra.zonalSurface;
       metrics.push(zs.liquidWater[zone] || 0, zs.ice[zone] || 0, zs.buriedIce[zone] || 0);
       metrics.push(zs.liquidCO2[zone] || 0, zs.dryIce[zone] || 0, zs.biomass[zone] || 0);
       metrics.push(zs.liquidHydrogen[zone] || 0);
       metrics.push(zs.liquidMethane[zone] || 0, zs.hydrocarbonIce[zone] || 0, zs.buriedHydrocarbonIce[zone] || 0);
       metrics.push(zs.liquidAmmonia[zone] || 0, zs.ammoniaIce[zone] || 0, zs.buriedAmmoniaIce[zone] || 0);
       metrics.push(zs.liquidOxygen[zone] || 0, zs.oxygenIce[zone] || 0, zs.buriedOxygenIce[zone] || 0);
       metrics.push(zs.liquidNitrogen[zone] || 0, zs.nitrogenIce[zone] || 0, zs.buriedNitrogenIce[zone] || 0);
    }
    metrics.push(terra.temperature.value);
    for (const zone of zones) {
      const temperature = terra.temperature.zones[zone];
      metrics.push(temperature.value, temperature.day, temperature.night);
    }
    return metrics;
  }

  function buildEquilibrationDiagnostics(terra) {
    terra._updateZonalCoverageCache();
    const atmosphericWater = terra.resources.atmospheric.atmosphericWater.value || 0;
    const surfaceArea = terra.celestialParameters.surfaceArea;
    const gravity = terra.celestialParameters.gravity;
    const zones = {};
    for (const zone of ZONE_KEYS) {
      zones[zone] = {
        temperatureK: terra.temperature.zones[zone].value,
        dayTemperatureK: terra.temperature.zones[zone].day,
        nightTemperatureK: terra.temperature.zones[zone].night,
        liquidWaterTons: terra.zonalSurface.liquidWater[zone] || 0,
        iceTons: terra.zonalSurface.ice[zone] || 0,
        liquidWaterCoverage: terra.zonalCoverageCache[zone].liquidWater || 0,
        iceCoverage: terra.zonalCoverageCache[zone].ice || 0
      };
    }
    return {
      temperatureK: terra.temperature.value,
      atmosphericWaterTons: atmosphericWater,
      atmosphericWaterPressurePa: calculateAtmosphericPressure(
        atmosphericWater,
        gravity,
        terra.celestialParameters.radius,
        surfaceArea
      ),
      ratesTonsPerDay: {
        evaporation: terra.totalEvaporationRate || 0,
        sublimation: terra.totalWaterSublimationRate || 0,
        boiling: terra.totalBoilingRate || 0,
        rainfall: terra.totalRainfallRate || 0,
        snowfall: terra.totalSnowfallRate || 0
      },
      zones
    };
  }

  function measureEquilibrationChange(prev, curr, previousChanges, intervalScale, absTol, relTol, temperatureTol) {
    let error = 0;
    let movement = 0;
    let reversedMovement = 0;
    let relativeChange = 0;
    const changes = [];
    const temperatureStart = curr.length - (ZONE_KEYS.length * 3 + 1);
    for (let i = 0; i < prev.length; i++) {
      const a = prev[i], b = curr[i];
      const change = b - a;
      changes.push(change);
      const diff = Math.abs(change);
      const scale = Math.max(1, Math.abs(a), Math.abs(b));
      // Large reservoirs can oscillate by one representable increment at equilibrium.
      const representedDiff = Math.max(0, diff - Number.EPSILON * scale);
      const tolerance = i >= temperatureStart ? temperatureTol : Math.max(absTol, relTol * scale);
      const normalized = representedDiff / Math.max(Number.MIN_VALUE, tolerance * intervalScale);
      error = Math.max(error, normalized);
      relativeChange = Math.max(relativeChange, representedDiff / scale);
      if (normalized > 1) {
        movement += normalized;
        if (previousChanges && change * previousChanges[i] < 0) reversedMovement += normalized;
      }
    }
    return { error, changes, relativeChange, reversal: movement > 0 ? reversedMovement / movement : 0 };
  }

  function normalizeEquilibrationStar(fullParams) {
    fullParams.celestialParameters = fullParams.celestialParameters || {};
    const star = fullParams.star || (fullParams.star = {});
    const lumFromStar = Number(star.luminositySolar);
    const lumFromCel = Number(fullParams.celestialParameters.starLuminosity);
    const luminosity = Number.isFinite(lumFromStar)
      ? lumFromStar
      : (Number.isFinite(lumFromCel) ? lumFromCel : 1);
    star.luminositySolar = luminosity;
    fullParams.celestialParameters.starLuminosity = luminosity;
  }

  function captureEquilibrationState(terra) {
    const values = {};
    for (const category of Object.keys(terra.resources)) {
      values[category] = {};
      for (const key of Object.keys(terra.resources[category])) {
        values[category][key] = terra.resources[category][key].value;
      }
    }
    return {
      resources: values,
      zonalSurface: terra.zonalSurface.clone(),
      temperature: structuredClone(terra.temperature),
      celestialParameters: structuredClone(terra.celestialParameters),
      ratesTonsPerDay: buildEquilibrationDiagnostics(terra).ratesTonsPerDay
    };
  }

  function restoreEquilibrationState(terra, state) {
    for (const category of Object.keys(state.resources)) {
      for (const key of Object.keys(state.resources[category])) {
        terra.resources[category][key].value = state.resources[category][key];
      }
    }
    terra.zonalSurface = state.zonalSurface.clone();
    terra.temperature = structuredClone(state.temperature);
    terra.celestialParameters = structuredClone(state.celestialParameters);
    celestialParameters = terra.celestialParameters;
  }

  function solveEquilibrationSystem(matrix, right) {
    if (right.some(value => !Number.isFinite(value)) || matrix.some(row => row.some(value => !Number.isFinite(value)))) return null;
    const size = right.length;
    const rows = matrix.map((row, i) => [...row, right[i]]);
    for (let column = 0; column < size; column++) {
      let pivot = column;
      for (let row = column + 1; row < size; row++) {
        if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
      }
      [rows[pivot], rows[column]] = [rows[column], rows[pivot]];
      if (Math.abs(rows[column][column]) < 1e-28) return null;
      const divisor = rows[column][column];
      for (let entry = column; entry <= size; entry++) rows[column][entry] /= divisor;
      for (let row = column + 1; row < size; row++) {
        const multiplier = rows[row][column];
        for (let entry = column; entry <= size; entry++) rows[row][entry] -= multiplier * rows[column][entry];
      }
    }
    const solution = Array(size).fill(0);
    for (let row = size - 1; row >= 0; row--) {
      solution[row] = rows[row][size];
      for (let column = row + 1; column < size; column++) solution[row] -= rows[row][column] * solution[column];
    }
    return solution.every(Number.isFinite) ? solution : null;
  }

  function buildEquilibrationFamilies(stepDays) {
    const initialSteps = stepDays === undefined ? terraformingParameters.gameplay.equilibration.implicitInitialSteps
      : quantizeEquilibrationStepMs(1000 * stepDays) / MIN_TERRAFORMING_SUBSTEP_MS;
    return [waterCycle, co2Cycle, methaneCycle, ammoniaCycle, oxygenCycle, nitrogenCycle, hydrogenCycle].map(cycle => {
      const keys = cycle === hydrogenCycle ? ['liquidHydrogen'] : cycle.availableKeys.map(key => cycle.resolveSurfaceKey(key));
      const nodes = [{ key: cycle.atmKey }];
      for (const key of keys) for (const zone of ZONE_KEYS) nodes.push({ key, zone });
      return { cycle, nodes, stepScale: initialSteps, previousChanges: null, refinements: 0, growths: 0 };
    });
  }

  function relaxEquilibrationFamily(terra, family) {
    const defaults = terraformingParameters.gameplay.equilibration;
    const { cycle, nodes } = family;
    const values = nodes.map(node => node.zone ? Number(terra.zonalSurface[node.key][node.zone]) : terra.resources.atmospheric[node.key].value);
    const total = values.reduce((sum, value) => sum + value, 0);
    if (!(total > 0)) return values;
    const edges = [];
    const nodeIndex = new Map(nodes.map((node, index) => [node.key + ':' + (node.zone || ''), index]));
    const durationSeconds = MIN_TERRAFORMING_SUBSTEP_MS * 86400 / 1000;
    const pressure = terra.atmosphericPressureCache;
    if (cycle === hydrogenCycle) {
      const projected = Object.create(terra);
      projected.zonalSurface = terra.zonalSurface.clone();
      const totals = cycle.runCycle(projected, ZONE_KEYS, {
        durationSeconds, vaporPressure: pressure.pressureByKey[cycle.atmKey] || 0,
        extraParams: cycle.getExtraParams(terra)
      });
      const changes = nodes.map((node, index) => node.zone
        ? Number(projected.zonalSurface[node.key][node.zone]) - values[index]
        : totals.totalAtmosphericChange);
      const gains = changes.reduce((sum, change) => sum + Math.max(0, change), 0);
      for (let from = 0; from < nodes.length; from++) for (let to = 0; to < nodes.length; to++) {
        if (changes[from] < 0 && changes[to] > 0) edges.push({ from, to, amount: -changes[from] * changes[to] / gains });
      }
    } else {
      // Collect transition bookkeeping without applying phase-change heat.
      const data = cycle.calculateZonalChanges(terra, ZONE_KEYS, {
        atmPressure: pressure.totalPressure, vaporPressure: pressure.pressureByKey[cycle.atmKey] || 0,
        available: values[0], durationSeconds, phaseChangeHeatEnabled: true,
        extraParams: cycle.getExtraParams(terra)
      });
      for (const zone of ZONE_KEYS) {
        for (const transition of data.zonalChanges[zone].phaseTransitions) {
          const sources = transition.adjustments.filter(change => change.perTon < 0 && change.bucket !== 'precipitation');
          const destinations = transition.adjustments.filter(change => change.perTon > 0 && change.bucket !== 'precipitation');
          for (const source of sources) for (const destination of destinations) {
            const from = source.bucket === 'atmosphere' ? 0 : nodeIndex.get(source.key + ':' + (source.zone || zone));
            const to = destination.bucket === 'atmosphere' ? 0 : nodeIndex.get(destination.key + ':' + (destination.zone || zone));
            if (from !== to) edges.push({ from, to, amount: transition.amount * -source.perTon * destination.perTon });
          }
        }
      }
      if (cycle.surfaceFlowFn) {
        const projected = Object.create(terra);
        projected.zonalSurface = terra.zonalSurface.clone();
        for (const zone of ZONE_KEYS) {
          for (const [key, amount] of Object.entries(data.zonalChanges[zone][cycle.surfaceBucket])) {
            projected.zonalSurface.change(key, zone, amount);
          }
        }
        const temperatures = Object.fromEntries(ZONE_KEYS.map(zone => [zone, terra.temperature.zones[zone].value]));
        const flow = cycle.surfaceFlowFn(projected, durationSeconds, temperatures);
        const changes = Array(nodes.length).fill(0);
        changes[0] = flow.totals.totalAtmosphericChange || 0;
        for (const [zone, zoneChanges] of Object.entries(flow.changes)) {
          for (const [key, amount] of Object.entries(zoneChanges)) changes[nodeIndex.get(key + ':' + zone)] += amount;
        }
        const gains = changes.reduce((sum, change) => sum + Math.max(0, change), 0);
        for (let from = 0; from < nodes.length; from++) for (let to = 0; to < nodes.length; to++) {
          if (changes[from] < 0 && changes[to] > 0) edges.push({ from, to, amount: -changes[from] * changes[to] / gains });
        }
      }
    }
    const inflow = Array(nodes.length).fill(0);
    for (const edge of edges) inflow[edge.to] += edge.amount;
    const matrix = nodes.map((_, row) => nodes.map((_, column) => row === column ? 1 : 0));
    const parent = nodes.map((_, index) => index);
    function root(index) {
      while (parent[index] !== index) index = parent[index];
      return index;
    }
    for (const edge of edges) {
      if (!(edge.amount > 0)) continue;
      const coefficient = family.stepScale * edge.amount / Math.max(values[edge.from], inflow[edge.from], 1e-30);
      matrix[edge.from][edge.from] += coefficient;
      matrix[edge.to][edge.from] -= coefficient;
      parent[root(edge.from)] = root(edge.to);
    }
    const components = new Map();
    for (let index = 0; index < nodes.length; index++) {
      const key = root(index);
      if (!components.has(key)) components.set(key, []);
      components.get(key).push(index);
    }
    const right = values.map(value => value / total);
    // Replace a redundant balance equation with exact component inventory.
    // This avoids cancellation at large implicit steps and preserves isolated buried stores.
    for (const component of components.values()) {
      const row = component.reduce((best, index) => values[index] > values[best] ? index : best, component[0]);
      matrix[row].fill(0);
      for (const index of component) matrix[row][index] = 1;
      right[row] = component.reduce((sum, index) => sum + values[index] / total, 0);
    }
    const solution = solveEquilibrationSystem(matrix, right);
    if (!solution || solution.some(value => !Number.isFinite(value) || value < -1e-12)) {
      family.stepScale = Math.max(1, family.stepScale * defaults.implicitReduction);
      family.refinements++;
      return values;
    }
    const next = solution.map(value => Math.max(0, value) * total);
    for (const component of components.values()) {
      const inventory = component.reduce((sum, index) => sum + values[index], 0);
      const assigned = component.reduce((sum, index) => sum + next[index], 0);
      if (assigned > 0) for (const index of component) next[index] *= inventory / assigned;
    }
    const changes = next.map((value, index) => value - values[index]);
    let movement = 0, reversed = 0;
    for (let index = 0; index < nodes.length; index++) {
      const amount = Math.max(0, Math.abs(changes[index]) - Number.EPSILON * Math.max(1, values[index], next[index]));
      movement += amount;
      if (family.previousChanges && family.previousChanges[index] * changes[index] < 0) reversed += amount;
    }
    if (movement > 0 && reversed / movement > defaults.implicitReversalThreshold) {
      family.stepScale = Math.max(1, family.stepScale * defaults.implicitReduction);
      family.refinements++;
    } else {
      family.stepScale = Math.min(defaults.implicitMaximumSteps, family.stepScale * defaults.implicitGrowth);
      family.growths++;
    }
    family.previousChanges = changes;
    return next;
  }

  function relaxEquilibrationChemistry(terra, absTol, relTol, checkEvery) {
    const pressure = terra.atmosphericPressureCache;
    const realSeconds = MIN_TERRAFORMING_SUBSTEP_MS / 1000;
    const params = {
      pressureByKey: pressure.pressureByKey, availableByKey: pressure.availableByKey,
      realSeconds, durationSeconds: realSeconds * 86400,
      surfaceArea: terra.celestialParameters.surfaceArea, surfaceTemperatureK: terra.temperature.value,
      waterCloudActivity: terra.luminosity.waterCloudActivity, gravity: terra.celestialParameters.gravity,
      solarFlux: terra.luminosity.modifiedSolarFlux, atmosphericPressurePa: pressure.totalPressure,
      applyRates: false
    };
    const initial = runAtmosphericChemistry(terra.resources, params);
    let scale = Infinity;
    for (const [key, change] of Object.entries(initial.changes)) {
      if (!(change < 0)) continue;
      const amount = terra.resources.atmospheric[key].value;
      const tolerance = Math.max(absTol, relTol * Math.max(1, amount)) / checkEvery * terraformingParameters.gameplay.equilibration.implicitVerificationMargin;
      if (-change > tolerance) scale = Math.min(scale, amount / -change);
    }
    if (scale === Infinity) return 0;
    scale = Math.max(1, Math.min(terraformingParameters.gameplay.equilibration.implicitMaximumSteps, scale / 2));
    const result = runAtmosphericChemistry(terra.resources, {
      ...params, realSeconds: realSeconds * scale, durationSeconds: params.durationSeconds * scale
    });
    const surfaceChanges = {};
    for (const [key, amount] of Object.entries(result.changes)) {
      if (terra.resources.atmospheric[key]) {
        terra.resources.atmospheric[key].value = Math.max(0, terra.resources.atmospheric[key].value + amount);
      } else if (amount) surfaceChanges[key] = amount;
    }
    terra.distributeSurfaceChangesToZones(surfaceChanges);
    return MIN_TERRAFORMING_SUBSTEP_MS * scale;
  }

  function* iterateImplicitEquilibration(terra, absTol, relTol, checkEvery, stepDays) {
    const defaults = terraformingParameters.gameplay.equilibration;
    const margin = defaults.implicitVerificationMargin;
    const families = buildEquilibrationFamilies(stepDays);
    const fields = families.flatMap(family => family.nodes.map(node => ({ ...node, family })));
    const physicsOptions = { refreshStandaloneRates: true, skipTerraformingEffects: true, skipHazardUpdates: true };
    const relaxationOptions = { ...physicsOptions, ignoreHeatCapacity: true };
    let accepted = captureEquilibrationState(terra);
    let currentError = Infinity;
    let networkSteps = 0;
    let verifying = true;
    let stableChecks = 0;
    function familyError(measurement, family) {
      let error = 0;
      fields.forEach((field, index) => {
        if (field.family !== family) return;
        const scale = Math.max(1, Math.abs(measurement.amounts[index]));
        const change = Math.max(0, Math.abs(measurement.changes[index]) - Number.EPSILON * scale);
        error = Math.max(error, change / (Math.max(absTol, relTol * scale) / checkEvery));
      });
      return error;
    }
    function* evaluate(candidate, checkpoint = false) {
      restoreEquilibrationState(terra, candidate);
      terra.runUpdateStep(0, { ignoreHeatCapacity: true });
      const before = snapshotMetrics(terra);
      const amounts = fields.map(field => field.zone ? Number(terra.zonalSurface[field.key][field.zone]) : terra.resources.atmospheric[field.key].value);
      terra.updateResources(MIN_TERRAFORMING_SUBSTEP_MS, relaxationOptions);
      const changes = fields.map((field, index) => (field.zone ? Number(terra.zonalSurface[field.key][field.zone]) : terra.resources.atmospheric[field.key].value) - amounts[index]);
      const measurement = measureEquilibrationChange(before, snapshotMetrics(terra), null, 1 / checkEvery, absTol, relTol, defaults.temperatureToleranceK);
      restoreEquilibrationState(terra, candidate);
      yield { phase: 'verifying', stepMs: MIN_TERRAFORMING_SUBSTEP_MS, ...(checkpoint ? { error: measurement.error, checkpoint: true } : {}) };
      return { amounts, changes, error: measurement.error };
    }
    try {
      while (true) {
        if (verifying) {
          const before = snapshotMetrics(terra);
          for (let index = 0; index < checkEvery; index++) {
            terra.updateResources(MIN_TERRAFORMING_SUBSTEP_MS, physicsOptions);
            accepted = captureEquilibrationState(terra);
            if (index + 1 < checkEvery) yield { phase: 'verifying', stepMs: MIN_TERRAFORMING_SUBSTEP_MS };
          }
          const measurement = measureEquilibrationChange(before, snapshotMetrics(terra), null, 1, absTol, relTol, defaults.temperatureToleranceK);
          currentError = measurement.error;
          stableChecks = currentError <= margin ? stableChecks + 1 : 0;
          yield { phase: 'verifying', stepMs: MIN_TERRAFORMING_SUBSTEP_MS, error: currentError, checkpoint: true, stableChecks, converged: stableChecks >= defaults.verificationChecks };
          if (currentError <= margin) {
            if (stableChecks >= defaults.verificationChecks) return;
            continue;
          }
          stableChecks = 0;
          verifying = false;
        }
        terra.runUpdateStep(0, { ignoreHeatCapacity: true });
        let chemistryMs = 0;
        if (getStellarEvolutionState(terra, currentPlanetParameters).stage !== 'star') {
          chemistryMs = relaxEquilibrationChemistry(terra, absTol, relTol, checkEvery);
          if (chemistryMs) terra.runUpdateStep(0, { ignoreHeatCapacity: true });
          const results = families.map(family => relaxEquilibrationFamily(terra, family));
          families.forEach((family, index) => family.nodes.forEach((node, nodeIndex) => {
            if (node.zone) terra.zonalSurface[node.key][node.zone] = results[index][nodeIndex];
            else terra.resources.atmospheric[node.key].value = results[index][nodeIndex];
          }));
        }
        terra.runUpdateStep(0, { ignoreHeatCapacity: true });
        accepted = captureEquilibrationState(terra);
        networkSteps++;
        yield {
          phase: 'relaxing', stepMs: MIN_TERRAFORMING_SUBSTEP_MS * Math.max(...families.map(family => family.stepScale)),
          simulatedMs: chemistryMs, error: currentError,
          refinements: families.reduce((sum, family) => sum + family.refinements, 0),
          growths: families.reduce((sum, family) => sum + family.growths, 0)
        };
        if (networkSteps % checkEvery !== 0) continue;
        let result = yield* evaluate(accepted, true);
        restoreEquilibrationState(terra, accepted);
        currentError = result.error;
        const blockPolish = networkSteps % defaults.implicitBlockPolishEvery === 0;
        if (currentError > margin && currentError <= defaults.implicitPolishThreshold && networkSteps % defaults.implicitPolishEvery === 0 && (currentError <= defaults.implicitLocalPolishThreshold || blockPolish)) {
          const corrections = blockPolish ? defaults.implicitBlockPolishCorrections : defaults.implicitPolishCorrections;
          for (let correction = 0; correction < corrections; correction++) {
            const ranked = fields.map((field, index) => {
              const value = result.amounts[index];
              const noise = Number.EPSILON * Math.max(1, Math.abs(value));
              const tolerance = Math.max(absTol, relTol * Math.max(1, Math.abs(value))) / checkEvery;
              return { index, error: Math.max(0, Math.abs(result.changes[index]) - noise) / tolerance };
            }).sort((a, b) => b.error - a.error);
            let improved = false;
            let retryWithReservoir = false;
            for (const { index } of ranked.slice(0, 3)) {
              const field = fields[index];
              const others = fields.map((other, otherIndex) => ({ other, otherIndex }))
                .filter(entry => entry.other.family === field.family && entry.otherIndex !== index)
                .sort((a, b) => result.amounts[b.otherIndex] - result.amounts[a.otherIndex]);
              const poolIndex = others[0].otherIndex;
              const pool = fields[poolIndex];
              const increment = Math.min(Math.max(0.001, result.amounts[index] * 1e-5), result.amounts[poolIndex] * 0.01);
              if (!(increment > 0)) continue;
              restoreEquilibrationState(terra, accepted);
              if (field.zone) terra.zonalSurface[field.key][field.zone] = result.amounts[index] + increment;
              else terra.resources.atmospheric[field.key].value = result.amounts[index] + increment;
              if (pool.zone) terra.zonalSurface[pool.key][pool.zone] = result.amounts[poolIndex] - increment;
              else terra.resources.atmospheric[pool.key].value = result.amounts[poolIndex] - increment;
              const sample = yield* evaluate(captureEquilibrationState(terra));
              const slope = (sample.changes[index] - result.changes[index]) / increment;
              if (!Number.isFinite(slope) || slope === 0) continue;
              const amount = Math.max(-result.amounts[index], Math.min(result.amounts[poolIndex], -result.changes[index] / slope));
              for (let line = 0; line < 8; line++) {
                const delta = amount * 2 ** -line;
                restoreEquilibrationState(terra, accepted);
                if (field.zone) terra.zonalSurface[field.key][field.zone] = result.amounts[index] + delta;
                else terra.resources.atmospheric[field.key].value = result.amounts[index] + delta;
                if (pool.zone) terra.zonalSurface[pool.key][pool.zone] = result.amounts[poolIndex] - delta;
                else terra.resources.atmospheric[pool.key].value = result.amounts[poolIndex] - delta;
                const candidate = captureEquilibrationState(terra);
                const trial = yield* evaluate(candidate);
                if (trial.error < result.error * 0.999 || trial.error < margin) {
                  accepted = candidate;
                  result = trial;
                  improved = true;
                  break;
                }
              }
              if (improved) break;
            }
            restoreEquilibrationState(terra, accepted);
            currentError = result.error;
            if (blockPolish && currentError > margin) {
              let blockImproved = false;
              const focus = fields[ranked[0].index].family;
              const separate = focus.polishPool !== undefined || currentError <= defaults.implicitLocalPolishThreshold;
              const pools = new Map();
              fields.forEach((field, index) => {
                const current = pools.get(field.family);
                if (current === undefined || result.amounts[index] > result.amounts[current]) pools.set(field.family, index);
              });
              for (const family of families) {
                if (family.polishPool !== undefined) pools.set(family, family.polishPool);
              }
              const active = fields.map((field, index) => ({ field, index })).filter(({ field, index }) =>
                (!separate || field.family === focus) && index !== pools.get(field.family)
                && (Math.abs(result.changes[index]) > Math.max(1e-8, absTol / checkEvery * 0.01) || (result.amounts[index] > absTol && !field.key.startsWith('buried')))
              );
              const scales = active.map(({ index }) => Math.max(1, result.amounts[index], Math.abs(result.changes[index]) * 100));
              const jacobian = active.map(() => Array(active.length).fill(0));
              for (let column = 0; column < active.length; column++) {
                const { field, index } = active[column];
                const poolIndex = pools.get(field.family), pool = fields[poolIndex];
                const requestedIncrement = Math.max(0.001, scales[column] * 1e-5);
                const upward = Math.min(requestedIncrement, result.amounts[poolIndex] * 0.01);
                const increment = upward >= requestedIncrement * 0.1 ? upward : -Math.min(requestedIncrement, result.amounts[index] * 0.01);
                if (increment === 0) continue;
                restoreEquilibrationState(terra, accepted);
                if (field.zone) terra.zonalSurface[field.key][field.zone] = result.amounts[index] + increment;
                else terra.resources.atmospheric[field.key].value = result.amounts[index] + increment;
                if (pool.zone) terra.zonalSurface[pool.key][pool.zone] = result.amounts[poolIndex] - increment;
                else terra.resources.atmospheric[pool.key].value = result.amounts[poolIndex] - increment;
                const sample = yield* evaluate(captureEquilibrationState(terra));
                const representedIncrement = sample.amounts[index] - result.amounts[index];
                if (representedIncrement === 0) continue;
                for (let row = 0; row < active.length; row++) {
                  const target = active[row].index;
                  jacobian[row][column] = (sample.changes[target] - result.changes[target]) / representedIncrement * scales[column] / scales[row];
                }
              }
              const matrix = jacobian.map((row, index) => row.map((value, column) => (index === column ? 1 : 0) - defaults.implicitMaximumSteps * value));
              const right = active.map(({ index }, row) => defaults.implicitMaximumSteps * result.changes[index] / scales[row]);
              let changes = solveEquilibrationSystem(matrix, right);
              if (changes) {
                const fixed = new Set();
                for (let pass = 0; pass < active.length; pass++) {
                  let bounded = false;
                  for (let row = 0; row < active.length; row++) {
                    if (!fixed.has(row) && result.amounts[active[row].index] + changes[row] * scales[row] < 0) {
                      fixed.add(row);
                      bounded = true;
                    }
                  }
                  if (!bounded) break;
                  const constrained = matrix.map(row => row.slice()), target = right.slice();
                  for (const row of fixed) { constrained[row].fill(0); constrained[row][row] = 1; target[row] = -result.amounts[active[row].index] / scales[row]; }
                  changes = solveEquilibrationSystem(constrained, target);
                  if (!changes) break;
                }
              }
              if (changes) {
                const deltas = Array(fields.length).fill(0);
                active.forEach(({ field, index }, row) => {
                  deltas[index] += changes[row] * scales[row];
                  deltas[pools.get(field.family)] -= changes[row] * scales[row];
                });
                let fraction = 1;
                deltas.forEach((delta, index) => { if (delta < 0) fraction = Math.min(fraction, -result.amounts[index] / delta); });
                for (let line = 0; line < 10 && fraction > 0; line++) {
                  restoreEquilibrationState(terra, accepted);
                  fields.forEach((field, index) => {
                    const amount = Math.max(0, result.amounts[index] + deltas[index] * fraction * 2 ** -line);
                    if (field.zone) terra.zonalSurface[field.key][field.zone] = amount;
                    else terra.resources.atmospheric[field.key].value = amount;
                  });
                  const candidate = captureEquilibrationState(terra);
                  const trial = yield* evaluate(candidate);
                  const beforeError = separate ? familyError(result, focus) : result.error;
                  const afterError = separate ? familyError(trial, focus) : trial.error;
                  if (afterError < beforeError * 0.999 || afterError < margin) {
                    accepted = candidate;
                    result = trial;
                    improved = true;
                    blockImproved = true;
                    break;
                  }
                }
              }
              restoreEquilibrationState(terra, accepted);
              currentError = result.error;
              if (!blockImproved) {
                const family = fields[ranked[0].index].family;
                if (family.cycle !== hydrogenCycle) {
                  const cold = ZONE_KEYS.filter(zone => terra.temperature.zones[zone].value < family.cycle.freezePoint)
                    .sort((a, b) => terra.temperature.zones[a].value - terra.temperature.zones[b].value);
                  if (cold.length) {
                    const pool = fields.findIndex(field => field.family === family && field.key === family.cycle.resolveSurfaceKey('buriedIce') && field.zone === cold[0]);
                    retryWithReservoir = family.polishPool !== pool;
                    family.polishPool = pool;
                  }
                }
              }
            }
            if ((!improved && !retryWithReservoir) || currentError < margin) break;
          }
        }
        restoreEquilibrationState(terra, accepted);
        terra.runUpdateStep(0, { ignoreHeatCapacity: true });
        accepted = captureEquilibrationState(terra);
        if (currentError <= margin) verifying = true;
      }
    } finally {
      restoreEquilibrationState(terra, accepted);
    }
  }

  /**
   * Run isolated adaptive relaxation followed by fixed 20 ms verification.
   * options: { stepDays, checkEvery, absTol, relTol, chunkSteps, maxSteps,
   *            instabilityRefinementEveryChecks, cancelToken, sync }
   * onProgress: fn(workBudgetFraction, info)
   */
  function runEquilibration(fullParams, options = {}, onProgress) {
    const defaults = terraformingParameters.gameplay.equilibration;
    const checkEvery = options.checkEvery ?? defaults.checkEvery;
    const absTol = options.absTol ?? defaults.absoluteToleranceTons;
    const relTol = options.relTol ?? defaults.relativeTolerance;
    const finalRelTol = Math.min(relTol, defaults.finalRelativeTolerance);
    const convergenceEnabled = absTol >= 0 || relTol >= 0;
    const chunkSteps = options.chunkSteps ?? defaults.chunkSteps;
    const adaptationChecks = options.instabilityRefinementEveryChecks || defaults.adaptationChecks;
    const cancelToken = options.cancelToken;
    let stepBudget = options.maxSteps > 0 ? options.maxSteps : defaults.maximumSteps;

    return new Promise((resolve, reject) => {
      const prevLum = getStarLuminosity();
      const previousPlanetParameters = currentPlanetParameters;
      const previousResources = resources;
      const previousFacilityFunction = calculateZoneSolarFluxWithFacility;
      const previousTerraforming = terraforming;
      const previousCelestialParameters = celestialParameters;
      let terra;
      let implicit = null;
      let implicitPhase = null;
      let previousResourceSubstepMs;
      let previousMaxResourceSubsteps;
      let finished = false;

      function restoreGlobals() {
        isEquilibrating = false;
        setStarLuminosity(prevLum);
        currentPlanetParameters = previousPlanetParameters;
        resources = previousResources;
        terraforming = previousTerraforming;
        celestialParameters = previousCelestialParameters;
        calculateZoneSolarFluxWithFacility = previousFacilityFunction;
        if (terra) {
          terra.resourceSubstepMilliseconds = previousResourceSubstepMs;
          terra.maxResourceSubsteps = previousMaxResourceSubsteps;
        }
      }

      try {
        isEquilibrating = true;
        normalizeEquilibrationStar(fullParams);
        const sandboxResources = buildSandboxResourcesFromOverride(fullParams.resources || {});
        currentPlanetParameters = fullParams;
        resources = sandboxResources;
        calculateZoneSolarFluxWithFacility = undefined;
        terra = new Terraforming(sandboxResources, fullParams.celestialParameters || {});
        terraforming = terra;
        celestialParameters = terra.celestialParameters;
        previousResourceSubstepMs = terra.resourceSubstepMilliseconds;
        previousMaxResourceSubsteps = terra.maxResourceSubsteps;
        terra.calculateInitialValues(fullParams);
        ensureEquilibrationZones(terra);
        if (convergenceEnabled && !gameSettings.phaseChangeHeat) implicit = iterateImplicitEquilibration(terra, absTol, finalRelTol, checkEvery, options.stepDays);

        let stepIdx = 0;
        let stableCount = 0;
        let prevSnap = snapshotMetrics(terra);
        let previousChanges = null;
        let refinementCount = 0;
        let refinementsFromInstability = 0;
        let growthCount = 0;
        let checksAtStep = 0;
        let startingError = null;
        let previousError = null;
        let currentError = Infinity;
        let totalSimulatedMs = 0;
        let checkSimulatedMs = 0;
        let bestError = Infinity;
        let verificationError = 0;
        let bestState = null;
        let polishing = false;
        const initialStepMs = quantizeEquilibrationStepMs(1000 * (options.stepDays ?? defaults.initialStepDays));
        let maximumStepMs = quantizeEquilibrationStepMs(1000 * defaults.maximumStepDays);

        function applyEquilibrationStep(nextStepMs) {
          const quantizedStepMs = quantizeEquilibrationStepMs(nextStepMs);
          terra.resourceSubstepMilliseconds = quantizedStepMs;
          terra.maxResourceSubsteps = 1;
          stableCount = 0;
          checksAtStep = 0;
          startingError = null;
          previousError = null;
          previousChanges = null;
          verificationError = 0;
          return quantizedStepMs;
        }
        let stepMs = applyEquilibrationStep(initialStepMs);

        function reportProgress(reason, error) {
          if (!onProgress) return;
          onProgress(reason ? 1 : Math.min(1, stepIdx / stepBudget), {
            step: stepIdx, stepBudget, stableCount,
            phase: implicitPhase || (stepMs === MIN_TERRAFORMING_SUBSTEP_MS ? 'verifying' : 'relaxing'),
            refinementsFromStability: refinementCount,
            refinementsFromInstability, growthCount,
            simulatedMs: totalSimulatedMs, stepMs, error, reason
          });
        }

        function finalize(reason) {
          finished = true;
          try {
            if (implicit) implicit.return();
            if (reason === 'step-limit' && bestState) {
              restoreEquilibrationState(terra, bestState);
            }
            terra.runUpdateStep(0, { ignoreHeatCapacity: true });
            const outOverride = copyBackToOverrideFromSandbox(fullParams, sandboxResources, terra);
            const diagnostics = buildEquilibrationDiagnostics(terra);
            if (reason === 'step-limit' && bestState) diagnostics.ratesTonsPerDay = bestState.ratesTonsPerDay;
            const specialSeedKey = outOverride.rwgMeta?.specialSeedKey;
            if (!specialSeedKey) applyPostEquilibrationHazardTuning(outOverride, terra);
            reportProgress(reason, reason === 'step-limit' && bestState ? bestError : currentError);
            resolve({ override: outOverride, steps: stepIdx, diagnostics, reason });
          } finally {
            restoreGlobals();
          }
        }

        function loopChunk() {
          try {
            const end = Math.min(stepBudget, stepIdx + chunkSteps);
            while (!finished) {
              if (cancelToken?.cancelled) {
                finished = true;
                restoreGlobals();
                reject(new Error('cancelled'));
                return;
              }
              if (cancelToken?.endEarly) { finalize('ended-early'); return; }
              if (cancelToken?.addSteps) {
                stepBudget += cancelToken.addSteps;
                cancelToken.addSteps = 0;
              }
              if (stepIdx >= stepBudget) { finalize('step-limit'); return; }
              if (!options.sync && stepIdx >= end) break;
              if (implicit) {
                const next = implicit.next();
                if (next.done) { finalize('converged'); return; }
                stepIdx++;
                implicitPhase = next.value.phase;
                stepMs = next.value.stepMs;
                totalSimulatedMs += next.value.simulatedMs ?? stepMs;
                if (next.value.error !== undefined) currentError = next.value.error;
                stableCount = next.value.stableChecks ?? stableCount;
                refinementsFromInstability = next.value.refinements ?? refinementsFromInstability;
                growthCount = next.value.growths ?? growthCount;
                if (next.value.checkpoint && currentError < bestError) {
                  bestError = currentError;
                  bestState = captureEquilibrationState(terra);
                }
                if (next.value.converged) { finalize('converged'); return; }
                if (options.sync && stepIdx % chunkSteps === 0) reportProgress(null, currentError);
                continue;
              }

              // updateResources already refreshes geometry, coverage, luminosity and climate.
              terra.updateResources(stepMs, {
                refreshStandaloneRates: true,
                ignoreSubstepping: true,
                ignoreHeatCapacity: true,
                skipTerraformingEffects: true,
                skipHazardUpdates: true
              });
              if (stepIdx < 5) terra.setTemperatureValuesToTrend();
              stepIdx++;
              totalSimulatedMs += stepMs;
              checkSimulatedMs += stepMs;
              if (stepIdx % checkEvery !== 0) continue;

              const snap = snapshotMetrics(terra);
              const atMinimumStep = stepMs === MIN_TERRAFORMING_SUBSTEP_MS;
              const stageRelTol = atMinimumStep ? finalRelTol : Math.max(finalRelTol, relTol * (stepMs / initialStepMs) ** 2);
              const measurement = measureEquilibrationChange(
                prevSnap, snap, previousChanges,
                checkSimulatedMs / (checkEvery * MIN_TERRAFORMING_SUBSTEP_MS),
                absTol, stageRelTol, defaults.temperatureToleranceK
              );
              currentError = measurement.error;
              checkSimulatedMs = 0;
              prevSnap = snap;
              previousChanges = measurement.changes;
              stableCount = convergenceEnabled && measurement.error <= 1 ? stableCount + 1 : 0;
              checksAtStep++;
              if (startingError === null) startingError = measurement.error;

              if (atMinimumStep) verificationError = Math.max(verificationError, measurement.error);
              if (convergenceEnabled && atMinimumStep && checksAtStep >= defaults.verificationChecks && verificationError < bestError) {
                bestError = verificationError;
                bestState = captureEquilibrationState(terra);
              }
              if (atMinimumStep && stableCount >= defaults.verificationChecks) {
                finalize('converged');
                return;
              }
              if (atMinimumStep && checksAtStep >= defaults.verificationChecks && stableCount === 0 && convergenceEnabled) {
                // A failed fine-step check can be a slow transient, not a timestep problem.
                // Resume relaxation rather than spending the remaining budget at 20 ms.
                polishing = false;
                growthCount++;
                const retryStepMs = Math.max(MIN_TERRAFORMING_SUBSTEP_MS, initialStepMs / 4);
                maximumStepMs = Math.max(maximumStepMs, retryStepMs);
                stepMs = applyEquilibrationStep(retryStepMs);
              }
              if (!atMinimumStep) {
                if (stableCount >= defaults.stableChecks) {
                  polishing = true;
                  refinementCount++;
                  stepMs = applyEquilibrationStep(stepMs / 4);
                } else if (
                  measurement.error > 1 && (
                    measurement.reversal > 0.35
                    || (previousError !== null && measurement.error > previousError * 1.5)
                    || (checksAtStep >= adaptationChecks && measurement.error >= startingError * 0.8)
                  )
                ) {
                  refinementsFromInstability++;
                  stepMs = applyEquilibrationStep(stepMs / (measurement.reversal > 0.35 ? 4 : 2));
                  maximumStepMs = Math.min(maximumStepMs, stepMs);
                } else if (checksAtStep >= adaptationChecks) {
                  if (!polishing && measurement.reversal === 0 && measurement.relativeChange < 0.05 && stepMs < maximumStepMs) {
                    growthCount++;
                    stepMs = applyEquilibrationStep(Math.min(maximumStepMs, stepMs * 2));
                  } else {
                    checksAtStep = 0;
                    startingError = measurement.error;
                  }
                }
              }
              if (checksAtStep > 0) previousError = measurement.error;
              if (options.sync && stepIdx % chunkSteps === 0) reportProgress(null, currentError);
            }
            if (!finished) {
              reportProgress(null, currentError);
              setTimeout(loopChunk, 0);
            }
          } catch (error) {
            finished = true;
            restoreGlobals();
            reject(error);
          }
        }
        if (options.sync) loopChunk(); else setTimeout(loopChunk, 0);
      } catch (error) {
        restoreGlobals();
        reject(error);
      }
    });
  }

  window.runEquilibration = runEquilibration;
})();



