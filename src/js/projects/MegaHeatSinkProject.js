(function () {
  const MEGA_HEAT_SINK_POWER_W = 100_000_000_000_000;
  const MEGA_HEAT_SINK_MIN_CAPACITY = 100;
  const SECONDS_PER_DAY = 86_400;
  const ORDERED_ZONES = ['tropical', 'temperate', 'polar'];

  function resolveMinimumHeatCapacity() {
    const globalMinimum = globalThis?.MIN_SURFACE_HEAT_CAPACITY;
    if (Number.isFinite(globalMinimum) && globalMinimum > 0) {
      return globalMinimum;
    }
    return MEGA_HEAT_SINK_MIN_CAPACITY;
  }

  class MegaHeatSinkProject extends Project {
    constructor(config, name) {
      super(config, name);
      this.uiElements = null;
    }

    renderUI(container) {
      const card = document.createElement('div');
      card.classList.add('info-card');

      const header = document.createElement('div');
      header.classList.add('card-header');
      const title = document.createElement('span');
      title.classList.add('card-title');
      title.textContent = 'Heat Sink Summary';
      header.appendChild(title);
      card.appendChild(header);

      const body = document.createElement('div');
      body.classList.add('card-body');

      const summaryGrid = document.createElement('div');
      summaryGrid.classList.add('stats-grid', 'two-col', 'project-summary-grid');

      const createSummaryBox = (labelText) => {
        const box = document.createElement('div');
        box.classList.add('stat-item', 'project-summary-box');
        const label = document.createElement('span');
        label.classList.add('stat-label');
        label.textContent = labelText;
        const content = document.createElement('div');
        content.classList.add('project-summary-content');
        const value = document.createElement('span');
        value.classList.add('stat-value');
        content.appendChild(value);
        box.append(label, content);
        summaryGrid.appendChild(box);
        return value;
      };

      const countValue = createSummaryBox('Heat Sinks Built');
      const coolingValue = createSummaryBox('Cooling per Second');

      body.appendChild(summaryGrid);
      card.appendChild(body);
      container.appendChild(card);

      this.uiElements = {
        card,
        countValue,
        coolingValue
      };

      this.updateUI();
    }

    updateUI() {
      const elements = this.uiElements;
      if (!elements) {
        return;
      }

      const formatter = globalThis?.formatNumber;
      const formatValue = (value, short = false, precision = 2) => {
        if (formatter) {
          return formatter(value, short, precision);
        }
        if (!Number.isFinite(value)) {
          return '—';
        }
        if (short) {
          return Math.round(value).toString();
        }
        const safePrecision = precision > 0 ? precision : 2;
        return value.toFixed(Math.min(safePrecision, 6));
      };

      const heatSinkCount = this.repeatCount || 0;
      elements.countValue.textContent = formatValue(heatSinkCount, true);

      const coolingPerSecond = this.calculateCoolingPerSecond();
      if (Number.isFinite(coolingPerSecond) && coolingPerSecond > 0) {
        elements.coolingValue.textContent = `${formatValue(coolingPerSecond, false, 3)} K/s`;
      } else {
        elements.coolingValue.textContent = '—';
      }
    }

    calculateCoolingPerSecond() {
      const effectiveCount = Math.max(1, this.repeatCount || 0);
      const terra = globalThis?.terraforming;
      const area = terra?.celestialParameters?.surfaceArea;
      if (!terra || !Number.isFinite(area) || area <= 0) {
        return 0;
      }

      const gravity = terra.celestialParameters?.gravity ?? 0;
      const radius = terra.celestialParameters?.radius ?? 0;
      const rotationPeriodH = terra.celestialParameters?.rotationPeriod ?? 24;

      const compositionInfo = terra.calculateAtmosphericComposition?.() || {};
      const totalMass = compositionInfo.totalMass ?? 0;
      const massKg = totalMass / 1000;

      const surfacePressurePa = globalThis?.calculateAtmosphericPressure?.(massKg, gravity, radius) || 0;
      const surfacePressureBar = surfacePressurePa / 100000;

      const atmosphericHeatCapacity = globalThis?.calculateEffectiveAtmosphericHeatCapacity?.(
        terra.resources?.atmospheric,
        surfacePressurePa,
        gravity
      ) ?? 0;

      const baseSlabOptions = { atmosphereCapacity: atmosphericHeatCapacity };

      const zonePercentage = globalThis?.getZonePercentage || (() => 1 / ORDERED_ZONES.length);
      const fractionCalculator = globalThis?.calculateZonalSurfaceFractions
        ? (zone) => globalThis.calculateZonalSurfaceFractions(terra, zone)
        : () => ({ ocean: 0, ice: 0, hydrocarbon: 0, hydrocarbonIce: 0, co2_ice: 0, biomass: 0 });

      const coolingFlux = (effectiveCount * MEGA_HEAT_SINK_POWER_W) / area;

      let weightedCooling = 0;
      let totalWeight = 0;

      for (const zone of ORDERED_ZONES) {
        const pct = zonePercentage(zone);
        if (!Number.isFinite(pct) || pct <= 0) {
          continue;
        }

        const zoneFractions = fractionCalculator(zone) || {};
        const slabOptions = {
          ...baseSlabOptions,
          zoneArea: area * pct,
          zoneLiquidWater: terra.zonalWater?.[zone]?.liquid ?? 0
        };

        let capacity = globalThis?.autoSlabHeatCapacity?.(
          rotationPeriodH,
          surfacePressureBar,
          zoneFractions,
          gravity,
          undefined,
          undefined,
          slabOptions
        );

        if (!Number.isFinite(capacity) || capacity <= 0) {
          if (Number.isFinite(atmosphericHeatCapacity) && atmosphericHeatCapacity > 0) {
            capacity = atmosphericHeatCapacity;
          } else if (Number.isFinite(surfacePressurePa) && Number.isFinite(gravity) && gravity > 0) {
            capacity = 1004 * (surfacePressurePa / gravity);
          } else {
            capacity = resolveMinimumHeatCapacity();
          }
        }

        const minimumCapacity = resolveMinimumHeatCapacity();
        const capacityPerArea = Math.max(capacity, minimumCapacity);
        const zoneCoolingPerSecond = (coolingFlux * SECONDS_PER_DAY) / capacityPerArea;
        weightedCooling += zoneCoolingPerSecond * pct;
        totalWeight += pct;
      }

      return totalWeight > 0 ? weightedCooling / totalWeight : 0;
    }

    complete() {
      super.complete();
      this.updateUI();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MegaHeatSinkProject;
  } else {
    globalThis.MegaHeatSinkProject = MegaHeatSinkProject;
  }
}());
