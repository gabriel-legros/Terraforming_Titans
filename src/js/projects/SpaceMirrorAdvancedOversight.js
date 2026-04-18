class SpaceMirrorAdvancedOversight {
  static advancedAssignmentInProgress = false;
  static solverAlgorithm = 'newton';

  static runAssignments(project, settings) {
    if (!settings || !settings.advancedOversight) return;
    if (SpaceMirrorAdvancedOversight.advancedAssignmentInProgress) return;

    SpaceMirrorAdvancedOversight.advancedAssignmentInProgress = true;
    const snapshot = terraforming.saveTemperatureState();
    let solvedSnapshot = null;

    try {
      const K_TOL = 0.001;
      const FLUX_TOL = 0.01;
      const MIN_ZONE_FLUX = 2.4e-5;
      const MAX_COORDINATE_PASSES = 12;
      const MAX_BRACKET_STEPS = 24;
      const MAX_BISECTION_STEPS = 32;
      const POWER_EPSILON = 1e-9;
      const COUNT_EPSILON = 1e-9;

      const ZONES = getZones();
      const ZONES_WITH_FOCUS_ANY = ZONES.concat(['focus', 'any']);

      const FOCUS_FLAG =
        (projectManager && projectManager.isBooleanFlagSet && projectManager.isBooleanFlagSet('spaceMirrorFocusing')) ||
        (projectManager &&
          projectManager.projects &&
          projectManager.projects.spaceMirrorFacility &&
          projectManager.projects.spaceMirrorFacility.isBooleanFlagSet &&
          projectManager.projects.spaceMirrorFacility.isBooleanFlagSet('spaceMirrorFocusing'));

      const REVERSAL_AVAILABLE = !!(project && project.reversalAvailable);

      const prio = settings.priority || { tropical: 1, temperate: 1, polar: 1, focus: 1 };
      const targets = settings.targets || { tropical: 0, temperate: 0, polar: 0, water: 0 };
      const tempMode = settings.tempMode || { tropical: 'average', temperate: 'average', polar: 'average' };

      const assignM = settings.assignments.mirrors || (settings.assignments.mirrors = {});
      const assignL = settings.assignments.lanterns || (settings.assignments.lanterns = {});
      const reverse = settings.assignments.reversalMode || (
        settings.assignments.reversalMode = {
          tropical: false,
          temperate: false,
          polar: false,
          focus: false,
          any: false,
        }
      );

      const getZoneMode = (zone) => tempMode[zone] || 'average';
      const getZoneTolerance = (zone) => getZoneMode(zone) === 'flux' ? FLUX_TOL : K_TOL;
      const getZonePriority = (zone) => zone === 'focus' ? (prio.focus || 5) : (prio[zone] || 5);
      const getZoneObjectiveWeight = (zone) => Math.pow(4, 5 - Math.min(5, Math.max(1, getZonePriority(zone))));

      const mirrorBuilding = buildings.spaceMirror;
      const lanternBuilding = buildings.hyperionLantern;

      const totalMirrors = Math.max(
        0,
        Number.isFinite(mirrorBuilding?.activeNumber)
          ? mirrorBuilding.activeNumber
          : (typeof buildingCountToNumber === 'function'
            ? buildingCountToNumber(mirrorBuilding?.active)
            : Math.max(0, Math.floor(Number(mirrorBuilding?.active) || 0)))
      );
      const totalLanterns = settings.applyToLantern
        ? Math.max(
            0,
            Number.isFinite(lanternBuilding?.activeNumber)
              ? lanternBuilding.activeNumber
              : (typeof buildingCountToNumber === 'function'
                ? buildingCountToNumber(lanternBuilding?.active)
                : Math.max(0, Math.floor(Number(lanternBuilding?.active) || 0)))
          )
        : 0;

      const mirrorPowerPer = Math.max(
        0,
        (terraforming.calculateMirrorEffect()?.interceptedPower || 0) * getFacilityResourceFactor(mirrorBuilding)
      );
      const lanternPowerPer = settings.applyToLantern
        ? Math.max(0, (lanternBuilding?.powerPerBuilding || 0) * getFacilityResourceFactor(lanternBuilding))
        : 0;

      const totalSurfaceArea = terraforming?.celestialParameters?.surfaceArea || 0;
      const zoneAreas = {};
      const baseFluxes = {};
      for (const zone of ZONES) {
        zoneAreas[zone] = totalSurfaceArea * getZonePercentage(zone);
        baseFluxes[zone] = Math.max(MIN_ZONE_FLUX, terraforming.calculateZoneSolarFlux(zone, false, true));
      }

      const clearAssignments = () => {
        for (const zone of ZONES_WITH_FOCUS_ANY) {
          assignM[zone] = 0;
          assignL[zone] = 0;
          reverse[zone] = false;
        }
        assignM.unassigned = 0;
        assignL.unassigned = 0;
        reverse.focus = false;
        reverse.any = false;
      };

      const syncDerivedReverseState = () => {
        for (const zone of ZONES) {
          reverse[zone] = REVERSAL_AVAILABLE && (Number(assignM[zone]) || 0) < 0;
        }
        reverse.focus = false;
        reverse.any = false;
      };

      const getTrendMetric = (zone) => {
        const mode = getZoneMode(zone);
        if (mode === 'flux') {
          const flux = terraforming.luminosity?.zonalFluxes?.[zone];
          return Number.isFinite(flux) ? flux / 4 : NaN;
        }

        const data = terraforming.temperature?.zones?.[zone];
        if (!data) return NaN;

        const meanTrend = Number.isFinite(data.trendValue) ? data.trendValue : data.value;
        if (mode === 'day') {
          const offset = (Number.isFinite(data.day) && Number.isFinite(data.value)) ? (data.day - data.value) : 0;
          return meanTrend + offset;
        }
        if (mode === 'night') {
          const offset = (Number.isFinite(data.night) && Number.isFinite(data.value)) ? (data.night - data.value) : 0;
          return meanTrend + offset;
        }
        return meanTrend;
      };

      const readCurrentMetrics = () => {
        const metrics = {};
        for (const zone of ZONES) {
          metrics[zone] = getTrendMetric(zone);
        }
        return metrics;
      };

      const computeMetricError = (metrics) => {
        let totalError = 0;
        for (const zone of ZONES) {
          const target = targets[zone] || 0;
          if (!(target > 0)) continue;
          const value = metrics[zone];
          if (!Number.isFinite(value)) continue;
          const error = value - target;
          totalError += getZoneObjectiveWeight(zone) * error * error;
        }
        return totalError;
      };

      const withinIdealTolerance = (metrics) => {
        for (const zone of ZONES) {
          const target = targets[zone] || 0;
          if (!(target > 0)) continue;
          const value = metrics[zone];
          if (!Number.isFinite(value)) return false;
          if (Math.abs(value - target) > getZoneTolerance(zone)) return false;
        }
        return true;
      };

      const simulateFluxes = (zonalFluxes) => {
        terraforming.restoreTemperatureState(snapshot);
        terraforming.updateSurfaceTemperature(0, {
          ignoreHeatCapacity: true,
          zonalFluxOverrides: zonalFluxes,
          disableAvailableAdvancedHeating: true,
        });
        const metrics = readCurrentMetrics();
        return {
          metrics,
          error: computeMetricError(metrics),
        };
      };

      const solveZoneFluxForTarget = (zone, idealFluxes, currentMetric) => {
        const target = targets[zone] || 0;
        const tolerance = getZoneTolerance(zone);
        const currentFlux = Math.max(MIN_ZONE_FLUX, idealFluxes[zone] || MIN_ZONE_FLUX);
        if (!(target > 0) || !Number.isFinite(currentMetric)) return currentFlux;
        if (Math.abs(currentMetric - target) <= tolerance) return currentFlux;

        const evaluate = (flux) => {
          const nextFlux = Math.max(MIN_ZONE_FLUX, flux);
          const trialFluxes = { ...idealFluxes, [zone]: nextFlux };
          const result = simulateFluxes(trialFluxes);
          return {
            flux: nextFlux,
            metric: result.metrics[zone],
            error: Number.isFinite(result.metrics[zone]) ? Math.abs(result.metrics[zone] - target) : Infinity,
            objective: result.error,
          };
        };

        let low = null;
        let high = null;
        let best = {
          flux: currentFlux,
          metric: currentMetric,
          error: Math.abs(currentMetric - target),
          objective: simulation.error,
        };

        const updateBest = (candidate) => {
          if (
            candidate.objective < best.objective - 1e-12 ||
            (Math.abs(candidate.objective - best.objective) <= 1e-12 && candidate.error < best.error)
          ) {
            best = candidate;
          }
        };

        if (currentMetric < target) {
          low = { flux: currentFlux, metric: currentMetric };
          let candidate = evaluate(Math.max(currentFlux + 1, currentFlux * 2));
          updateBest(candidate);
          high = { flux: candidate.flux, metric: candidate.metric };
          for (let step = 0; step < MAX_BRACKET_STEPS && high.metric < target; step++) {
            const nextFlux = Math.max(high.flux + 1, high.flux * 2);
            if (nextFlux === high.flux) break;
            candidate = evaluate(nextFlux);
            updateBest(candidate);
            low = high;
            high = { flux: candidate.flux, metric: candidate.metric };
          }
          if (high.metric < target) {
            return best.flux;
          }
        } else {
          high = { flux: currentFlux, metric: currentMetric };
          let candidate = evaluate(Math.max(MIN_ZONE_FLUX, currentFlux / 2));
          updateBest(candidate);
          low = { flux: candidate.flux, metric: candidate.metric };
          for (let step = 0; step < MAX_BRACKET_STEPS && low.metric > target; step++) {
            const nextFlux = Math.max(MIN_ZONE_FLUX, low.flux / 2);
            if (nextFlux === low.flux) break;
            candidate = evaluate(nextFlux);
            updateBest(candidate);
            high = low;
            low = { flux: candidate.flux, metric: candidate.metric };
          }
          if (low.metric > target) {
            return best.flux;
          }
        }

        for (let step = 0; step < MAX_BISECTION_STEPS; step++) {
          const midFlux = (low.flux + high.flux) / 2;
          if (!(midFlux > low.flux && midFlux < high.flux)) break;
          const candidate = evaluate(midFlux);
          updateBest(candidate);
          if (Math.abs(candidate.metric - target) <= tolerance) {
            return candidate.flux;
          }
          if (candidate.metric < target) {
            low = { flux: candidate.flux, metric: candidate.metric };
          } else {
            high = { flux: candidate.flux, metric: candidate.metric };
          }
        }

        return best.flux;
      };

      const solveLinearSystem = (matrix, vector) => {
        const size = vector.length;
        const augmented = matrix.map((row, index) => row.slice().concat(vector[index]));

        for (let pivotIndex = 0; pivotIndex < size; pivotIndex++) {
          let pivotRow = pivotIndex;
          let pivotAbs = Math.abs(augmented[pivotRow][pivotIndex] || 0);
          for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex++) {
            const candidateAbs = Math.abs(augmented[rowIndex][pivotIndex] || 0);
            if (candidateAbs > pivotAbs) {
              pivotAbs = candidateAbs;
              pivotRow = rowIndex;
            }
          }

          if (!(pivotAbs > 1e-12)) return null;
          if (pivotRow !== pivotIndex) {
            const tmp = augmented[pivotIndex];
            augmented[pivotIndex] = augmented[pivotRow];
            augmented[pivotRow] = tmp;
          }

          const pivotValue = augmented[pivotIndex][pivotIndex];
          for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex++) {
            augmented[pivotIndex][columnIndex] /= pivotValue;
          }

          for (let rowIndex = 0; rowIndex < size; rowIndex++) {
            if (rowIndex === pivotIndex) continue;
            const factor = augmented[rowIndex][pivotIndex];
            if (!factor) continue;
            for (let columnIndex = pivotIndex; columnIndex <= size; columnIndex++) {
              augmented[rowIndex][columnIndex] -= factor * augmented[pivotIndex][columnIndex];
            }
          }
        }

        return augmented.map((row) => row[size]);
      };

      const refineFluxesWithNewton = (idealFluxes, currentSimulation, activeZones) => {
        if (activeZones.length === 0) return currentSimulation;

        let damping = 1e-3;

        for (let iteration = 0; iteration < 8; iteration++) {
          const residual = [];
          let withinTolerance = true;

          for (const zone of activeZones) {
            const metric = currentSimulation.metrics[zone];
            const target = targets[zone] || 0;
            const error = metric - target;
            residual.push(error);
            if (Math.abs(error) > getZoneTolerance(zone)) {
              withinTolerance = false;
            }
          }

          if (withinTolerance) break;

          const jacobian = activeZones.map(() => []);
          for (let columnIndex = 0; columnIndex < activeZones.length; columnIndex++) {
            const zone = activeZones[columnIndex];
            const baseFlux = idealFluxes[zone] || MIN_ZONE_FLUX;
            const step = Math.max(1, Math.abs(baseFlux) * 0.01);
            const probeFluxes = { ...idealFluxes, [zone]: Math.max(MIN_ZONE_FLUX, baseFlux + step) };
            const probeSimulation = simulateFluxes(probeFluxes);

            for (let rowIndex = 0; rowIndex < activeZones.length; rowIndex++) {
              const rowZone = activeZones[rowIndex];
              jacobian[rowIndex][columnIndex] =
                (probeSimulation.metrics[rowZone] - currentSimulation.metrics[rowZone]) / step;
            }
          }

          const hessian = activeZones.map(() => activeZones.map(() => 0));
          const gradient = activeZones.map(() => 0);

          for (let rowIndex = 0; rowIndex < activeZones.length; rowIndex++) {
            const zone = activeZones[rowIndex];
            const weight = getZoneObjectiveWeight(zone);
            for (let columnIndex = 0; columnIndex < activeZones.length; columnIndex++) {
              gradient[columnIndex] += jacobian[rowIndex][columnIndex] * weight * residual[rowIndex];
              for (let innerIndex = 0; innerIndex < activeZones.length; innerIndex++) {
                hessian[columnIndex][innerIndex] +=
                  jacobian[rowIndex][columnIndex] * weight * jacobian[rowIndex][innerIndex];
              }
            }
          }

          let solved = false;
          for (let attempt = 0; attempt < 5 && !solved; attempt++) {
            const dampedHessian = hessian.map((row, rowIndex) => row.map((value, columnIndex) => {
              if (rowIndex !== columnIndex) return value;
              return value + damping;
            }));
            const stepVector = solveLinearSystem(dampedHessian, gradient.map((value) => -value));

            if (!stepVector) {
              damping *= 10;
              continue;
            }

            let bestFluxes = null;
            let bestSimulation = currentSimulation;
            for (const scale of [1, 0.5, 0.25, 0.1, 0.05]) {
              const trialFluxes = { ...idealFluxes };
              let changed = false;

              for (let index = 0; index < activeZones.length; index++) {
                const zone = activeZones[index];
                const nextFlux = Math.max(
                  MIN_ZONE_FLUX,
                  (idealFluxes[zone] || MIN_ZONE_FLUX) + (stepVector[index] * scale)
                );
                if (Math.abs(nextFlux - (idealFluxes[zone] || MIN_ZONE_FLUX)) > FLUX_TOL * 0.0001) {
                  changed = true;
                }
                trialFluxes[zone] = nextFlux;
              }

              if (!changed) continue;
              const trialSimulation = simulateFluxes(trialFluxes);
              if (trialSimulation.error < bestSimulation.error - 1e-12) {
                bestFluxes = trialFluxes;
                bestSimulation = trialSimulation;
              }
            }

            if (!bestFluxes) {
              damping *= 10;
              continue;
            }

            for (const zone of activeZones) {
              idealFluxes[zone] = bestFluxes[zone];
            }
            currentSimulation = bestSimulation;
            damping = Math.max(1e-6, damping / 4);
            solved = true;
          }

          if (!solved) {
            const maxGradient = gradient.reduce((maxValue, value) => Math.max(maxValue, Math.abs(value)), 0);
            if (!(maxGradient > 1e-12)) break;

            let bestFluxes = null;
            let bestSimulation = currentSimulation;
            for (const scale of [1, 0.5, 0.25, 0.1, 0.05, 0.01]) {
              const trialFluxes = { ...idealFluxes };
              let changed = false;

              for (let index = 0; index < activeZones.length; index++) {
                const zone = activeZones[index];
                const baseFlux = idealFluxes[zone] || MIN_ZONE_FLUX;
                const unitDirection = -gradient[index] / maxGradient;
                const stepMagnitude = Math.max(1, Math.abs(baseFlux) * 0.1);
                const nextFlux = Math.max(
                  MIN_ZONE_FLUX,
                  baseFlux + (unitDirection * stepMagnitude * scale)
                );
                if (Math.abs(nextFlux - baseFlux) > FLUX_TOL * 0.0001) {
                  changed = true;
                }
                trialFluxes[zone] = nextFlux;
              }

              if (!changed) continue;
              const trialSimulation = simulateFluxes(trialFluxes);
              if (trialSimulation.error < bestSimulation.error - 1e-12) {
                bestFluxes = trialFluxes;
                bestSimulation = trialSimulation;
              }
            }

            if (!bestFluxes) break;
            for (const zone of activeZones) {
              idealFluxes[zone] = bestFluxes[zone];
            }
            currentSimulation = bestSimulation;
            damping *= 2;
            solved = true;
          }

          if (!solved) break;
        }

        return currentSimulation;
      };

      const refineFluxesWithJacobian = (idealFluxes, currentSimulation, activeZones) => {
        if (activeZones.length === 0) return currentSimulation;

        for (let iteration = 0; iteration < 8; iteration++) {
          const rhs = [];
          let withinTolerance = true;

          for (const zone of activeZones) {
            const metric = currentSimulation.metrics[zone];
            const target = targets[zone] || 0;
            const error = target - metric;
            rhs.push(error);
            if (Math.abs(error) > getZoneTolerance(zone)) {
              withinTolerance = false;
            }
          }

          if (withinTolerance) break;

          const jacobian = activeZones.map(() => []);
          for (let columnIndex = 0; columnIndex < activeZones.length; columnIndex++) {
            const zone = activeZones[columnIndex];
            const baseFlux = idealFluxes[zone] || MIN_ZONE_FLUX;
            const step = Math.max(1, Math.abs(baseFlux) * 0.01);
            const probeFluxes = { ...idealFluxes, [zone]: Math.max(MIN_ZONE_FLUX, baseFlux + step) };
            const probeSimulation = simulateFluxes(probeFluxes);

            for (let rowIndex = 0; rowIndex < activeZones.length; rowIndex++) {
              const rowZone = activeZones[rowIndex];
              jacobian[rowIndex][columnIndex] =
                (probeSimulation.metrics[rowZone] - currentSimulation.metrics[rowZone]) / step;
            }
          }

          const delta = solveLinearSystem(jacobian, rhs);
          if (!delta) break;

          let bestFluxes = null;
          let bestSimulation = currentSimulation;
          for (const scale of [1, 0.5, 0.25, 0.1, 0.05]) {
            const trialFluxes = { ...idealFluxes };
            let changed = false;

            for (let index = 0; index < activeZones.length; index++) {
              const zone = activeZones[index];
              const nextFlux = Math.max(MIN_ZONE_FLUX, (idealFluxes[zone] || MIN_ZONE_FLUX) + (delta[index] * scale));
              if (Math.abs(nextFlux - (idealFluxes[zone] || MIN_ZONE_FLUX)) > FLUX_TOL * 0.0001) {
                changed = true;
              }
              trialFluxes[zone] = nextFlux;
            }

            if (!changed) continue;
            const trialSimulation = simulateFluxes(trialFluxes);
            if (trialSimulation.error < bestSimulation.error - 1e-12) {
              bestFluxes = trialFluxes;
              bestSimulation = trialSimulation;
            }
          }

          if (!bestFluxes) break;
          for (const zone of activeZones) {
            idealFluxes[zone] = bestFluxes[zone];
          }
          currentSimulation = bestSimulation;
        }

        return currentSimulation;
      };

      terraforming.restoreTemperatureState(snapshot);
      terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
      const currentFluxes = {};
      for (const zone of ZONES) {
        currentFluxes[zone] = Math.max(
          MIN_ZONE_FLUX,
          Number(terraforming.luminosity?.zonalFluxes?.[zone]) || baseFluxes[zone]
        );
      }

      const idealFluxes = { ...currentFluxes };
      for (const zone of ZONES) {
        if (!(targets[zone] > 0)) continue;
        if (getZoneMode(zone) === 'flux') {
          idealFluxes[zone] = Math.max(MIN_ZONE_FLUX, (targets[zone] || 0) * 4);
        }
      }

      let simulation = simulateFluxes(idealFluxes);
      const solveOrder = ZONES
        .filter((zone) => (targets[zone] || 0) > 0 && getZoneMode(zone) !== 'flux')
        .sort((a, b) => getZonePriority(a) - getZonePriority(b));

      const solveIdealFluxesCurrent = () => {
        for (let pass = 0; pass < MAX_COORDINATE_PASSES; pass++) {
          let changed = false;
          for (const zone of solveOrder) {
            const nextFlux = solveZoneFluxForTarget(zone, idealFluxes, simulation.metrics[zone]);
            if (Math.abs(nextFlux - idealFluxes[zone]) <= FLUX_TOL * 0.0001) continue;
            idealFluxes[zone] = nextFlux;
            simulation = simulateFluxes(idealFluxes);
            changed = true;
          }
          if (!changed || withinIdealTolerance(simulation.metrics)) break;
        }
        simulation = refineFluxesWithJacobian(idealFluxes, simulation, solveOrder);
      };

      const solveIdealFluxesNewton = () => {
        const startingError = simulation.error;
        simulation = refineFluxesWithNewton(idealFluxes, simulation, solveOrder);
        if (!(simulation.error < startingError * 0.95)) {
          solveIdealFluxesCurrent();
        }
      };

      if (SpaceMirrorAdvancedOversight.solverAlgorithm === 'newton') {
        solveIdealFluxesNewton();
      } else {
        solveIdealFluxesCurrent();
      }

      const computeFocusPowerTarget = () => {
        if (!FOCUS_FLAG || !(targets.water > 0)) return 0;
        const averageTemperature = snapshot?.temperature?.value ?? terraforming.temperature?.value ?? 0;
        const deltaT = Math.max(0, 273.15 - averageTemperature);
        const energyPerKg = (2100 * deltaT) + 334000;
        if (!(energyPerKg > 0)) return 0;
        return ((targets.water || 0) * 1000 / 86400) * energyPerKg;
      };

      const focusPowerTarget = computeFocusPowerTarget();

      const demandBuckets = [];
      for (const zone of ZONES) {
        const target = targets[zone] || 0;
        if (!(target > 0)) continue;
        const zoneArea = zoneAreas[zone] || 0;
        if (!(zoneArea > 0)) continue;
        const deltaFlux = (idealFluxes[zone] || 0) - (baseFluxes[zone] || 0);
        const deltaPower = (deltaFlux * zoneArea) / 4;
        if (deltaPower > POWER_EPSILON) {
          demandBuckets.push({
            type: 'heating',
            zone,
            priority: getZonePriority(zone),
            remainingPower: deltaPower,
          });
        } else if (deltaPower < -POWER_EPSILON) {
          demandBuckets.push({
            type: 'cooling',
            zone,
            priority: getZonePriority(zone),
            remainingPower: -deltaPower,
          });
        }
      }
      if (focusPowerTarget > POWER_EPSILON) {
        demandBuckets.push({
          type: 'heating',
          zone: 'focus',
          priority: getZonePriority('focus'),
          remainingPower: focusPowerTarget,
        });
      }

      const allocateUnits = (availableUnits, buckets, perUnitPower, applyUnits, useAllAvailableWhenScarce) => {
        if (!(availableUnits > 0) || !(perUnitPower > 0)) return 0;

        const entries = buckets
          .map((bucket) => ({
            bucket,
            demand: Math.max(0, bucket.remainingPower / perUnitPower),
          }))
          .filter((entry) => entry.demand > COUNT_EPSILON);

        if (!entries.length) return 0;

        let totalDemand = 0;
        for (const entry of entries) {
          totalDemand += entry.demand;
        }

        const scarce = totalDemand > availableUnits + COUNT_EPSILON;
        const scale = scarce ? (availableUnits / totalDemand) : 1;
        let used = 0;

        for (const entry of entries) {
          const scaledDemand = entry.demand * scale;
          entry.units = Math.floor(scaledDemand);
          entry.remainder = scaledDemand - entry.units;
          used += entry.units;
        }

        entries.sort((a, b) => b.remainder - a.remainder);
        let unitsLeft = Math.max(0, availableUnits - used);

        if (scarce && useAllAvailableWhenScarce) {
          for (const entry of entries) {
            if (!(unitsLeft > 0)) break;
            entry.units += 1;
            unitsLeft -= 1;
          }
        } else {
          for (const entry of entries) {
            if (!(unitsLeft > 0)) break;
            if (!(entry.remainder > 0.5)) break;
            entry.units += 1;
            unitsLeft -= 1;
          }
        }

        let applied = 0;
        for (const entry of entries) {
          if (!(entry.units > 0)) continue;
          applyUnits(entry.bucket, entry.units);
          applied += entry.units;
        }

        return applied;
      };

      clearAssignments();

      let mirrorsLeft = totalMirrors;
      let lanternsLeft = totalLanterns;
      const maxPriority = Math.max(
        1,
        ...demandBuckets.map((bucket) => bucket.priority)
      );

      for (let priorityLevel = 1; priorityLevel <= maxPriority; priorityLevel++) {
        const coolingBuckets = demandBuckets.filter(
          (bucket) => bucket.type === 'cooling' && bucket.priority === priorityLevel && bucket.remainingPower > POWER_EPSILON
        );

        if (REVERSAL_AVAILABLE && mirrorPowerPer > 0 && mirrorsLeft > 0 && coolingBuckets.length) {
          const usedMirrors = allocateUnits(
            mirrorsLeft,
            coolingBuckets,
            mirrorPowerPer,
            (bucket, units) => {
              assignM[bucket.zone] = -(Number(assignM[bucket.zone]) || 0) - units;
              bucket.remainingPower = Math.max(0, bucket.remainingPower - (units * mirrorPowerPer));
            },
            true
          );
          mirrorsLeft -= usedMirrors;
        }

        const heatingBuckets = demandBuckets.filter(
          (bucket) => bucket.type === 'heating' && bucket.priority === priorityLevel && bucket.remainingPower > POWER_EPSILON
        );

        if (lanternPowerPer > 0 && lanternsLeft > 0 && heatingBuckets.length) {
          const usedLanterns = allocateUnits(
            lanternsLeft,
            heatingBuckets,
            lanternPowerPer,
            (bucket, units) => {
              assignL[bucket.zone] = (Number(assignL[bucket.zone]) || 0) + units;
              bucket.remainingPower = Math.max(0, bucket.remainingPower - (units * lanternPowerPer));
            },
            false
          );
          lanternsLeft -= usedLanterns;
        }

        if (mirrorPowerPer > 0 && mirrorsLeft > 0 && heatingBuckets.length) {
          const usedMirrors = allocateUnits(
            mirrorsLeft,
            heatingBuckets,
            mirrorPowerPer,
            (bucket, units) => {
              assignM[bucket.zone] = (Number(assignM[bucket.zone]) || 0) + units;
              bucket.remainingPower = Math.max(0, bucket.remainingPower - (units * mirrorPowerPer));
            },
            false
          );
          mirrorsLeft -= usedMirrors;
        }
      }

      if (!(targets.water > 0)) {
        assignM.focus = 0;
        assignL.focus = 0;
      }

      syncDerivedReverseState();
      settings.assignments.mirrors = assignM;
      settings.assignments.lanterns = assignL;
      settings.assignments.reversalMode = reverse;
      settings.lastSolution = {
        mirrors: { ...assignM },
        lanterns: { ...assignL },
        reversalMode: { ...reverse },
      };

      terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
      solvedSnapshot = terraforming.saveTemperatureState();

    } finally {
      SpaceMirrorAdvancedOversight.advancedAssignmentInProgress = false;
    }

    terraforming.restoreTemperatureState(snapshot);
    if (solvedSnapshot) {
      const solvedTemp = solvedSnapshot.temperature || {};
      const solvedLum = solvedSnapshot.luminosity || {};

      if (terraforming.temperature) {
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'trendValue')) {
          terraforming.temperature.trendValue = solvedTemp.trendValue;
        }
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'equilibriumTemperature')) {
          terraforming.temperature.equilibriumTemperature = solvedTemp.equilibriumTemperature;
        }
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'effectiveTempNoAtmosphere')) {
          terraforming.temperature.effectiveTempNoAtmosphere = solvedTemp.effectiveTempNoAtmosphere;
        }
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'emissivity')) {
          terraforming.temperature.emissivity = solvedTemp.emissivity;
        }
        if (Object.prototype.hasOwnProperty.call(solvedTemp, 'opticalDepth')) {
          terraforming.temperature.opticalDepth = solvedTemp.opticalDepth;
        }

        const targetContributions = terraforming.temperature.opticalDepthContributions || {};
        const solvedContributions = solvedTemp.opticalDepthContributions || {};
        for (const key of Object.keys(targetContributions)) {
          delete targetContributions[key];
        }
        for (const key of Object.keys(solvedContributions)) {
          targetContributions[key] = solvedContributions[key];
        }

        const zones = terraforming.temperature.zones || {};
        const solvedZones = solvedTemp.zones || {};
        for (const zoneKey of Object.keys(zones)) {
          const zone = zones[zoneKey];
          const solvedZone = solvedZones[zoneKey] || {};
          if (Object.prototype.hasOwnProperty.call(solvedZone, 'trendValue')) {
            zone.trendValue = solvedZone.trendValue;
          }
          if (Object.prototype.hasOwnProperty.call(solvedZone, 'equilibriumTemperature')) {
            zone.equilibriumTemperature = solvedZone.equilibriumTemperature;
          }
        }
      }

      if (terraforming.luminosity) {
        if (Object.prototype.hasOwnProperty.call(solvedLum, 'modifiedSolarFlux')) {
          terraforming.luminosity.modifiedSolarFlux = solvedLum.modifiedSolarFlux;
        }
        if (Object.prototype.hasOwnProperty.call(solvedLum, 'modifiedSolarFluxUnpenalized')) {
          terraforming.luminosity.modifiedSolarFluxUnpenalized = solvedLum.modifiedSolarFluxUnpenalized;
        }
        const targetZonalFluxes = terraforming.luminosity.zonalFluxes || {};
        const solvedZonalFluxes = solvedLum.zonalFluxes || {};
        for (const key of Object.keys(targetZonalFluxes)) {
          delete targetZonalFluxes[key];
        }
        for (const key of Object.keys(solvedZonalFluxes)) {
          targetZonalFluxes[key] = solvedZonalFluxes[key];
        }
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.SpaceMirrorAdvancedOversight = SpaceMirrorAdvancedOversight;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SpaceMirrorAdvancedOversight,
  };
}
