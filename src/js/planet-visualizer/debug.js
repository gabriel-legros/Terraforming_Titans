(function () {
  const PlanetVisualizer = window.PlanetVisualizer;
  if (!PlanetVisualizer) return;

  PlanetVisualizer.prototype.buildDebugControls = function buildDebugControls() {
    const host = document.createElement('div');
    host.className = 'planet-visualizer-debug';

    const grid = document.createElement('div');
    grid.className = 'pv-grid';
    host.appendChild(grid);

    const makeRow = (id, label, min, max, step) => {
      const l = document.createElement('div');
      l.className = 'pv-row-label';
      l.textContent = label;
      const range = document.createElement('input');
      range.type = 'range';
      range.min = String(min); range.max = String(max); range.step = String(step);
      range.id = `pv-${id}`;
      const valWrap = document.createElement('div');
      valWrap.className = 'pv-row-value';
      const number = document.createElement('input');
      number.type = 'number';
      number.min = String(min); number.max = String(max); number.step = String(step);
      valWrap.appendChild(number);
      grid.appendChild(l); grid.appendChild(range); grid.appendChild(valWrap);
      this.debug.rows[id] = { range, number };
      const syncFromRange = () => { number.value = range.value; this.applySlidersToGame(); };
      const syncFromNumber = () => { range.value = number.value; this.applySlidersToGame(); };
      range.addEventListener('input', syncFromRange);
      number.addEventListener('input', syncFromNumber);
    };

    makeRow('illum', 'Illumination', 0.0, 3.0, 0.01);
    makeRow('incl', 'Inclination (deg)', -90, 90, 1);
    makeRow('pop', 'Population', 0, 1000000, 1);
    makeRow('ships', 'Spaceships', 0, 1000, 1);
    makeRow('co2', 'CO2 (kPa)', 0, 100, 0.1);
    makeRow('o2', 'O2 (kPa)', 0, 100, 0.1);
    makeRow('inert', 'Inert (kPa)', 0, 100, 0.1);
    makeRow('h2o', 'H2O vap. (kPa)', 0, 100, 0.1);
    makeRow('ch4', 'CH4 (kPa)', 0, 100, 0.1);

    makeRow('wTrop', 'Water Trop (%)', 0, 100, 0.1);
    makeRow('wTemp', 'Water Temp (%)', 0, 100, 0.1);
    makeRow('wPol', 'Water Polar (%)', 0, 100, 0.1);
    makeRow('iTrop', 'Ice Trop (%)', 0, 100, 0.1);
    makeRow('iTemp', 'Ice Temp (%)', 0, 100, 0.1);
    makeRow('iPol', 'Ice Polar (%)', 0, 100, 0.1);
    makeRow('bTrop', 'Biomass Trop (%)', 0, 100, 0.1);
    makeRow('bTemp', 'Biomass Temp (%)', 0, 100, 0.1);
    makeRow('bPol', 'Biomass Polar (%)', 0, 100, 0.1);
    makeRow('cloudCov', 'Clouds (%)', 0, 100, 0.1);

    const baseColorLabel = document.createElement('div');
    baseColorLabel.className = 'pv-row-label';
    baseColorLabel.textContent = 'Base color';
    const baseColorInput = document.createElement('input');
    baseColorInput.type = 'color';
    baseColorInput.id = 'pv-baseColor';
    const baseColorHex = this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
    baseColorInput.value = baseColorHex;
    const baseColorValue = document.createElement('div');
    baseColorValue.className = 'pv-row-value';
    const baseColorText = document.createElement('input');
    baseColorText.type = 'text';
    baseColorText.value = baseColorHex.toUpperCase();
    baseColorText.maxLength = 7;
    baseColorText.pattern = '#[0-9a-fA-F]{6}';
    baseColorText.spellcheck = false;
    baseColorText.placeholder = '#RRGGBB';
    baseColorText.autocomplete = 'off';
    baseColorValue.appendChild(baseColorText);
    grid.appendChild(baseColorLabel);
    grid.appendChild(baseColorInput);
    grid.appendChild(baseColorValue);
    this.debug.rows.baseColor = { color: baseColorInput, text: baseColorText };

    const syncBaseColorInputs = (hex) => {
      const normalized = this.normalizeHexColor(hex) || this.normalizeHexColor(this.viz.baseColor) || '#8a2a2a';
      if (baseColorInput) baseColorInput.value = normalized;
      if (baseColorText) baseColorText.value = normalized.toUpperCase();
      return normalized;
    };

    baseColorInput.addEventListener('input', () => {
      if (this.debug.mode !== 'debug') {
        syncBaseColorInputs(this.viz.baseColor);
        return;
      }
      const normalized = syncBaseColorInputs(baseColorInput.value);
      if (normalized) {
        this.setBaseColor(normalized);
      }
    });

    baseColorText.addEventListener('change', () => {
      if (this.debug.mode !== 'debug') {
        syncBaseColorInputs(this.viz.baseColor);
        return;
      }
      const normalized = this.normalizeHexColor(baseColorText.value);
      if (!normalized) {
        syncBaseColorInputs(this.viz.baseColor);
        return;
      }
      syncBaseColorInputs(normalized);
      this.setBaseColor(normalized);
    });

    const controls = document.createElement('div');
    controls.className = 'pv-controls';
    const label = document.createElement('label');
    label.textContent = 'Mode:';
    label.style.marginRight = '6px';
    const select = document.createElement('select');
    const optGame = document.createElement('option'); optGame.value = 'game'; optGame.textContent = 'Game-driven';
    const optDebug = document.createElement('option'); optDebug.value = 'debug'; optDebug.textContent = 'Slider debug';
    select.appendChild(optGame);
    select.appendChild(optDebug);
    select.value = this.debug.mode;
    select.addEventListener('change', () => {
      this.debug.mode = select.value;
      if (this.debug.mode === 'game') {
        this.syncSlidersFromGame();
      }
      if (this.debug.mode === 'game') {
        this.setBaseColor(this.getGameBaseColor(), { fromGame: true });
      } else {
        syncBaseColorInputs(this.viz.baseColor);
      }
      this.updateDebugControlState();
    });
    controls.appendChild(label);
    controls.appendChild(select);

    const presetLabel = document.createElement('label');
    presetLabel.textContent = 'Planet preset:';
    presetLabel.style.marginLeft = '12px';
    presetLabel.style.marginRight = '6px';
    presetLabel.htmlFor = 'pv-planetPreset';
    controls.appendChild(presetLabel);

    const presetSelect = document.createElement('select');
    presetSelect.id = 'pv-planetPreset';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select planet';
    presetSelect.appendChild(placeholder);

    const allPlanets = (typeof planetParameters !== 'undefined' && planetParameters) ? planetParameters : null;
    if (allPlanets) {
      const entries = Object.keys(allPlanets)
        .map((key) => ({ key, name: allPlanets[key]?.name || key }))
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const opt = document.createElement('option');
        opt.value = entry.key;
        opt.textContent = entry.name;
        presetSelect.appendChild(opt);
      }
    }

    presetSelect.addEventListener('change', () => {
      if (this.debug.mode !== 'debug') return;
      const planetKey = presetSelect.value;
      if (!planetKey) return;
      this.applyPlanetPresetToSliders(planetKey);
    });

    controls.appendChild(presetSelect);
    host.appendChild(controls);
    this.debug.modeSelect = select;
    this.debug.presetSelect = presetSelect;

    this.updateDebugControlState();
    this.elements.container.insertAdjacentElement('afterend', host);
    this.debug.container = host;
  };

  PlanetVisualizer.prototype.updateSliderValueLabels = function updateSliderValueLabels() {
    const r = this.debug.rows; if (!r) return;
    const setVal = (id, v) => { if (r[id]) r[id].number.value = String(v); if (r[id]) r[id].range.value = String(v); };
    setVal('illum', Number(r.illum.range.value));
    setVal('pop', Number(r.pop.range.value));
    if (r.incl) setVal('incl', Number(r.incl.range.value));
    setVal('ships', Number(r.ships.range.value));
    setVal('co2', Number(r.co2.range.value));
    setVal('o2', Number(r.o2.range.value));
    setVal('inert', Number(r.inert.range.value));
    setVal('h2o', Number(r.h2o.range.value));
    setVal('ch4', Number(r.ch4.range.value));
    setVal('cloudCov', Number(r.cloudCov?.range?.value || 0));
    const sv = (id) => { if (r[id]) setVal(id, Number(r[id].range.value)); };
    ['wTrop', 'wTemp', 'wPol', 'iTrop', 'iTemp', 'iPol', 'bTrop', 'bTemp', 'bPol'].forEach(sv);
  };

  PlanetVisualizer.prototype.applySlidersToGame = function applySlidersToGame() {
    this.updateSliderValueLabels();
    const r = this.debug.rows;
    const cel = currentPlanetParameters.celestialParameters;

    const clampFrom = (pair) => {
      const n = pair.number; const range = pair.range;
      let v = Number(n.value);
      const min = Number(n.min); const max = Number(n.max);
      if (isNaN(v)) v = min;
      if (!isNaN(min)) v = Math.max(min, v);
      if (!isNaN(max)) v = Math.min(max, v);
      n.value = String(v); range.value = String(v);
      return v;
    };

    const illum = clampFrom(r.illum);
    this.viz.illum = illum;
    if (r.incl) {
      this.viz.inclinationDeg = clampFrom(r.incl);
      this.updateSunFromInclination();
    }
    if (this.sunLight) this.sunLight.intensity = illum;

    const pop = Math.max(0, Math.floor(clampFrom(r.pop)));
    this.viz.pop = pop;

    this.viz.ships = Math.max(0, Math.floor(clampFrom(r.ships)));

    this.viz.kpa.co2 = clampFrom(r.co2);
    this.viz.kpa.o2 = clampFrom(r.o2);
    this.viz.kpa.inert = clampFrom(r.inert);
    this.viz.kpa.h2o = clampFrom(r.h2o);
    this.viz.kpa.ch4 = clampFrom(r.ch4);

    const z = this.viz.zonalCoverage;
    const wT = clampFrom(r.wTrop) / 100, wM = clampFrom(r.wTemp) / 100, wP = clampFrom(r.wPol) / 100;
    const iT = clampFrom(r.iTrop) / 100, iM = clampFrom(r.iTemp) / 100, iP = clampFrom(r.iPol) / 100;
    const bT = clampFrom(r.bTrop) / 100, bM = clampFrom(r.bTemp) / 100, bP = clampFrom(r.bPol) / 100;
    z.tropical.water = wT; z.temperate.water = wM; z.polar.water = wP;
    z.tropical.ice = iT; z.temperate.ice = iM; z.polar.ice = iP;
    z.tropical.life = bT; z.temperate.life = bM; z.polar.life = bP;
    this.viz.coverage.water = ((wT + wM + wP) / 3) * 100;
    this.viz.coverage.life = ((bT + bM + bP) / 3) * 100;
    if (r.cloudCov) this.viz.coverage.cloud = clampFrom(r.cloudCov);

    this.updateSurfaceTextureFromPressure(true);
    this.updateCloudUniforms();
  };

  PlanetVisualizer.prototype.applyPlanetPresetToSliders = function applyPlanetPresetToSliders(planetKey) {
    if (!planetKey || !this.debug || this.debug.mode !== 'debug') return;
    const rows = this.debug.rows;
    if (!rows) return;
    const allPlanets = (typeof planetParameters !== 'undefined' && planetParameters) ? planetParameters : null;
    if (!allPlanets || !allPlanets[planetKey]) return;

    const planet = allPlanets[planetKey];
    const cel = planet.celestialParameters || {};
    const resourcesData = planet.resources || {};
    const atmospheric = resourcesData.atmospheric || {};

    const setPairValue = (pair, value, opts = {}) => {
      if (!pair) return;
      let numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        numeric = Number(pair.range?.min);
      }
      if (!Number.isFinite(numeric)) numeric = 0;
      if (opts.round) {
        numeric = Math.round(numeric);
      }
      if (typeof opts.precision === 'number' && Number.isFinite(opts.precision)) {
        const factor = Math.pow(10, opts.precision);
        numeric = Math.round(numeric * factor) / factor;
      }
      const min = Number(pair.range?.min);
      const max = Number(pair.range?.max);
      if (Number.isFinite(min)) numeric = Math.max(min, numeric);
      if (Number.isFinite(max)) numeric = Math.min(max, numeric);
      const str = String(numeric);
      if (pair.range) pair.range.value = str;
      if (pair.number) pair.number.value = str;
    };

    const computePressureKPa = (massTon) => {
      const mass = Number(massTon);
      const gravity = Number(cel.gravity ?? currentPlanetParameters?.celestialParameters?.gravity);
      const radius = Number(cel.radius ?? currentPlanetParameters?.celestialParameters?.radius);
      if (!Number.isFinite(mass) || mass <= 0 || !Number.isFinite(gravity) || gravity <= 0 || !Number.isFinite(radius) || radius <= 0) {
        return 0;
      }
      if (typeof calculateAtmosphericPressure === 'function') {
        try {
          const result = calculateAtmosphericPressure(mass, gravity, radius);
          if (Number.isFinite(result) && result > 0) {
            return Math.max(0, result) / 1000;
          }
        } catch (e) {
        }
      }
      const surfaceArea = 4 * Math.PI * Math.pow(radius * 1000, 2);
      const pressurePa = (1000 * mass * gravity) / surfaceArea;
      return Math.max(0, pressurePa) / 1000;
    };

    const starLuminosity = Number(cel.starLuminosity);
    setPairValue(rows.illum, Number.isFinite(starLuminosity) ? starLuminosity : this.viz?.illum ?? 1, { precision: 2 });
    if (rows.incl) {
      const incl = Number(planet.visualization?.inclinationDeg ?? this.viz?.inclinationDeg ?? 15);
      setPairValue(rows.incl, incl, { round: true });
    }

    const colonists = resourcesData.colony?.colonists?.initialValue ?? 0;
    setPairValue(rows.pop, colonists, { round: true });
    setPairValue(rows.ships, resourcesData.special?.spaceships?.initialValue ?? 0, { round: true });

    setPairValue(rows.co2, computePressureKPa(atmospheric.carbonDioxide?.initialValue), { precision: 2 });
    setPairValue(rows.o2, computePressureKPa(atmospheric.oxygen?.initialValue), { precision: 2 });
    setPairValue(rows.inert, computePressureKPa(atmospheric.inertGas?.initialValue), { precision: 2 });
    setPairValue(rows.h2o, computePressureKPa(atmospheric.atmosphericWater?.initialValue), { precision: 2 });
    setPairValue(rows.ch4, computePressureKPa(atmospheric.atmosphericMethane?.initialValue), { precision: 2 });

    const fallbackEstimateCoverage = (amount, zoneArea, scale = 0.0001) => {
      if (!Number.isFinite(zoneArea) || zoneArea <= 0) return 0;
      const normalizedAmount = Math.max(0, Number(amount) || 0);
      const resourceRatio = (scale * normalizedAmount) / zoneArea;
      const R0 = 0.002926577381;
      const LINEAR_SLOPE = 50;
      const LOG_A = LINEAR_SLOPE * R0;
      if (resourceRatio <= 0) return 0;
      if (resourceRatio <= R0) return Math.min(1, LINEAR_SLOPE * resourceRatio);
      if (resourceRatio < 1) return Math.min(1, LOG_A * Math.log(resourceRatio) + 1);
      return 1;
    };

    const estimateCoverageFn = (typeof estimateCoverage === 'function') ? estimateCoverage : fallbackEstimateCoverage;
    const zones = ['tropical', 'temperate', 'polar'];
    const defaultPct = 1 / zones.length;
    const zonePercentages = {};
    for (const zone of zones) {
      if (typeof getZonePercentage === 'function') {
        const pct = getZonePercentage(zone);
        zonePercentages[zone] = Number.isFinite(pct) && pct > 0 ? pct : defaultPct;
      } else {
        zonePercentages[zone] = defaultPct;
      }
    }

    const radiusKm = Number(cel.radius ?? currentPlanetParameters?.celestialParameters?.radius);
    const totalSurfaceArea = (Number.isFinite(radiusKm) && radiusKm > 0)
      ? 4 * Math.PI * Math.pow(radiusKm * 1000, 2)
      : 1;

    const zonalWater = planet.zonalWater || {};
    const zonalSurface = planet.zonalSurface || {};
    const waterFractions = [];

    for (const zone of zones) {
      const zoneArea = Math.max(1, totalSurfaceArea * (zonePercentages[zone] || defaultPct));
      const waterData = zonalWater[zone] || {};
      const surfaceData = zonalSurface[zone] || {};
      const waterFraction = estimateCoverageFn(waterData.liquid, zoneArea, 0.0001);
      const iceFraction = estimateCoverageFn(waterData.ice, zoneArea, 0.0001 * 100);
      const lifeFraction = estimateCoverageFn(surfaceData.biomass, zoneArea, 0.0001 * 100000);
      waterFractions.push(Math.max(0, Math.min(1, Number(waterFraction) || 0)));
      const pctWater = (Math.max(0, Math.min(1, Number(waterFraction) || 0)) * 100);
      const pctIce = (Math.max(0, Math.min(1, Number(iceFraction) || 0)) * 100);
      const pctLife = (Math.max(0, Math.min(1, Number(lifeFraction) || 0)) * 100);
      const wPair = rows[`w${zone === 'tropical' ? 'Trop' : zone === 'temperate' ? 'Temp' : 'Pol'}`];
      const iPair = rows[`i${zone === 'tropical' ? 'Trop' : zone === 'temperate' ? 'Temp' : 'Pol'}`];
      const bPair = rows[`b${zone === 'tropical' ? 'Trop' : zone === 'temperate' ? 'Temp' : 'Pol'}`];
      setPairValue(wPair, pctWater, { precision: 2 });
      setPairValue(iPair, pctIce, { precision: 2 });
      setPairValue(bPair, pctLife, { precision: 2 });
    }

    if (rows.cloudCov) {
      const avgWaterFraction = waterFractions.length
        ? waterFractions.reduce((sum, val) => sum + val, 0) / waterFractions.length
        : 0;
      setPairValue(rows.cloudCov, avgWaterFraction * 100, { precision: 2 });
    }

    if (planet.visualization?.baseColor) {
      const normalized = this.setBaseColor(planet.visualization.baseColor, { force: true });
      const colorRow = rows.baseColor;
      if (colorRow) {
        const hex = this.normalizeHexColor(normalized) || '#8a2a2a';
        if (colorRow.color) colorRow.color.value = hex;
        if (colorRow.text) colorRow.text.value = hex.toUpperCase();
      }
    }

    this.applySlidersToGame();
  };

  PlanetVisualizer.prototype.syncSlidersFromGame = function syncSlidersFromGame() {
    const r = this.debug.rows;
    const cel = currentPlanetParameters.celestialParameters;

    const illum = this.getGameIllumination();
    r.illum.range.value = String(illum);
    r.illum.number.value = String(illum);
    if (r.incl) {
      const inc = (this.viz?.inclinationDeg ?? 15);
      r.incl.range.value = String(inc);
      r.incl.number.value = String(inc);
    }
    const popNow = resources.colony.colonists.value || 0;
    r.pop.range.value = String(popNow);
    r.pop.number.value = String(popNow);
    const shipVal = (resources?.special?.spaceships?.value) ?? (this.viz.ships || 0);
    if (r.ships) { r.ships.range.value = String(shipVal); r.ships.number.value = String(shipVal); }

    const toKPa = (massTon) => calculateAtmosphericPressure(massTon || 0, cel.gravity, cel.radius) / 1000;
    const clamp100 = (v) => Math.max(0, Math.min(100, v));
    const atm = resources.atmospheric;
    r.co2.range.value = String(clamp100(toKPa(atm.carbonDioxide.value)));
    r.o2.range.value = String(clamp100(toKPa(atm.oxygen.value)));
    r.inert.range.value = String(clamp100(toKPa(atm.inertGas.value)));
    r.h2o.range.value = String(clamp100(toKPa(atm.atmosphericWater.value)));
    r.ch4.range.value = String(clamp100(toKPa(atm.atmosphericMethane.value)));
    r.co2.number.value = r.co2.range.value;
    r.o2.number.value = r.o2.range.value;
    r.inert.number.value = r.inert.range.value;
    r.h2o.number.value = r.h2o.range.value;
    r.ch4.number.value = r.ch4.range.value;

    this.updateZonalCoverageFromGameSafe();
    const z = this.viz.zonalCoverage;
    const fmt = (v) => String((Math.max(0, Math.min(1, v)) * 100).toFixed(2));
    if (r.wTrop) { const s = fmt(z.tropical.water); r.wTrop.range.value = s; r.wTrop.number.value = s; }
    if (r.wTemp) { const s = fmt(z.temperate.water); r.wTemp.range.value = s; r.wTemp.number.value = s; }
    if (r.wPol) { const s = fmt(z.polar.water); r.wPol.range.value = s; r.wPol.number.value = s; }
    if (r.iTrop) { const s = fmt(z.tropical.ice); r.iTrop.range.value = s; r.iTrop.number.value = s; }
    if (r.iTemp) { const s = fmt(z.temperate.ice); r.iTemp.range.value = s; r.iTemp.number.value = s; }
    if (r.iPol) { const s = fmt(z.polar.ice); r.iPol.range.value = s; r.iPol.number.value = s; }
    if (r.bTrop) { const s = fmt(z.tropical.life); r.bTrop.range.value = s; r.bTrop.number.value = s; }
    if (r.bTemp) { const s = fmt(z.temperate.life); r.bTemp.range.value = s; r.bTemp.number.value = s; }
    if (r.bPol) { const s = fmt(z.polar.life); r.bPol.range.value = s; r.bPol.number.value = s; }
    const avgWater = ((z.tropical.water + z.temperate.water + z.polar.water) / 3) * 100;
    if (r.cloudCov) {
      const s = String(avgWater.toFixed(2));
      r.cloudCov.range.value = s; r.cloudCov.number.value = s;
    }

    const colorRow = this.debug.rows.baseColor;
    if (colorRow && this.debug.mode !== 'debug') {
      const normalized = this.normalizeHexColor(this.getGameBaseColor() || this.viz.baseColor) || '#8a2a2a';
      if (colorRow.color) colorRow.color.value = normalized;
      if (colorRow.text) colorRow.text.value = normalized.toUpperCase();
    }

    this.updateSliderValueLabels();
    this.viz.illum = illum;
    this.viz.pop = popNow;
    this.viz.kpa = {
      co2: Number(r.co2.range.value),
      o2: Number(r.o2.range.value),
      inert: Number(r.inert.range.value),
      h2o: Number(r.h2o.range.value),
      ch4: Number(r.ch4.range.value),
    };
    const avg = (a, b, c) => (a + b + c) / 3;
    this.viz.coverage = {
      water: avg(z.tropical.water, z.temperate.water, z.polar.water) * 100,
      life: avg(z.tropical.life, z.temperate.life, z.polar.life) * 100,
      cloud: Number(r.cloudCov ? r.cloudCov.range.value : avgWater),
    };
    this.viz.ships = Number(r.ships ? r.ships.range.value : 0);
    if (this.sunLight) this.sunLight.intensity = this.viz.illum;
    this.updateSurfaceTextureFromPressure(true);
    this.updateCloudUniforms();
  };

  PlanetVisualizer.prototype.refreshGameModeSliderDisplays = function refreshGameModeSliderDisplays() {
    if (!this.debug || !this.debug.rows) return;
    const r = this.debug.rows;
    try {
      const cel = currentPlanetParameters.celestialParameters;
      const illum = this.getGameIllumination();
      if (r.illum) { r.illum.range.value = String(illum); r.illum.number.value = String(illum); }
      const popNow = resources?.colony?.colonists?.value || 0;
      if (r.pop) { r.pop.range.value = String(popNow); r.pop.number.value = String(popNow); }
      const shipVal = (resources?.special?.spaceships?.value) ?? (this.viz.ships || 0);
      if (r.ships) { r.ships.range.value = String(shipVal); r.ships.number.value = String(shipVal); }
      const toKPa = (massTon) => (calculateAtmosphericPressure(massTon || 0, cel.gravity, cel.radius) / 1000);
      const clamp100 = (v) => Math.max(0, Math.min(100, v));
      const atm = resources?.atmospheric || {};
      const setPair = (key, val) => { if (r[key]) { const s = String(clamp100(val)); r[key].range.value = s; r[key].number.value = s; } };
      setPair('co2', toKPa(atm.carbonDioxide?.value));
      setPair('o2', toKPa(atm.oxygen?.value));
      setPair('inert', toKPa(atm.inertGas?.value));
      setPair('h2o', toKPa(atm.atmosphericWater?.value));
      setPair('ch4', toKPa(atm.atmosphericMethane?.value));
      this.updateZonalCoverageFromGameSafe();
      const setPct = (pair, v) => { if (pair) { const s = String(Math.max(0, Math.min(100, v))); pair.range.value = s; pair.number.value = s; } };
      const zc = this.viz.zonalCoverage || {};
      setPct(r.wTrop, (zc.tropical?.water || 0) * 100);
      setPct(r.wTemp, (zc.temperate?.water || 0) * 100);
      setPct(r.wPol, (zc.polar?.water || 0) * 100);
      setPct(r.iTrop, (zc.tropical?.ice || 0) * 100);
      setPct(r.iTemp, (zc.temperate?.ice || 0) * 100);
      setPct(r.iPol, (zc.polar?.ice || 0) * 100);
      setPct(r.bTrop, (zc.tropical?.life || 0) * 100);
      setPct(r.bTemp, (zc.temperate?.life || 0) * 100);
      setPct(r.bPol, (zc.polar?.life || 0) * 100);
      if (r.cloudCov) setPct(r.cloudCov, this.viz.coverage?.cloud || 0);
    } catch (e) {
    }
  };
})();
