// rwgUI.js

// Guard flags
let rwgUIInitialized = false;
const equilibratedWorlds = new Set();

function initializeRandomWorldUI() {
  const container = document.getElementById('space-random');
  if (!container) return;
  if (rwgUIInitialized) return;
  rwgUIInitialized = true;

  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'rwg-header';
  header.innerHTML = '<div class="rwg-title">Random Worlds</div>';
  container.appendChild(header);

  const controls = document.createElement('div');
  controls.className = 'rwg-controls';
  controls.innerHTML = `
    <div class="rwg-input">
      <label for="rwg-seed">Seed</label>
      <input id="rwg-seed" class="rwg-text" type="text" placeholder="Enter seed or leave blank" />
    </div>
    <div class="rwg-select">
      <select id="rwg-target">
        <option value="planet" selected>Planet</option>
        <option value="moon">Moon</option>
      </select>
      <select id="rwg-type">
        <option value="auto" selected>Type: Auto</option>
        <option value="mars-like">Type: Mars-like</option>
        <option value="rocky" disabled>Type: Hot Rocky (Locked)</option>
        <option value="cold-desert">Type: Cold Desert</option>
        <option value="icy-moon">Type: Icy</option>
        <option value="titan-like">Type: Titan-like</option>
        <option value="venus-like" disabled>Type: Venus-like (Locked)</option>
      </select>
      <select id="rwg-orbit">
        <option value="auto" selected>Orbit: Auto</option>
        <option value="hz-inner">Orbit: HZ Inner</option>
        <option value="hz-mid">Orbit: HZ Mid</option>
        <option value="hz-outer">Orbit: HZ Outer</option>
        <option value="hot">Orbit: Hot</option>
        <option value="cold">Orbit: Cold</option>
      </select>
    </div>
    <div>
      <button id="rwg-generate-planet" class="rwg-btn primary">Generate World</button>
    </div>
  `;
  container.appendChild(controls);

  const result = document.createElement('div');
  result.id = 'rwg-result';
  result.className = 'rwg-result';
  container.appendChild(result);

  // Wire buttons
  const btnPlanet = controls.querySelector('#rwg-generate-planet');
  btnPlanet.addEventListener('click', () => {
    const seed = document.getElementById('rwg-seed').value;
    const target = /** @type {HTMLSelectElement} */(document.getElementById('rwg-target')).value;
    const orbit = /** @type {HTMLSelectElement} */(document.getElementById('rwg-orbit')).value;
    const type = /** @type {HTMLSelectElement} */(document.getElementById('rwg-type')).value;
    drawSingle(seed, { isMoon: target === 'moon', orbitPreset: orbit, type });
  });
}

function ensureRandomWorldUI() {
  if (document.getElementById('space-random')) {
    if (!rwgUIInitialized) initializeRandomWorldUI();
  }
}

function attachTravelHandler(res, sStr) {
  const travelBtn = document.getElementById('rwg-travel-btn');
  if (!travelBtn) return;
  travelBtn.onclick = () => {
    if (!equilibratedWorlds.has(sStr)) return;
    if (typeof saveGameToSlot === 'function') {
      try { saveGameToSlot('pretravel'); } catch (_) {}
    }
    if (projectManager?.projects?.spaceStorage?.saveTravelState) {
      try { projectManager.projects.spaceStorage.saveTravelState(); } catch (_) {}
    }
    globalThis.currentPlanetParameters = res.merged;
    if (typeof initializeGameState === 'function') {
      initializeGameState({ preserveManagers: true, preserveJournal: true });
    }
  };
}

function drawSingle(seed, options) {
  if (typeof generateRandomPlanet !== 'function') return;
  const sStr = seed ? String(seed) : String((Math.random() * 1e9) >>> 0);
  const star = generateStar(hashStringToInt(sStr) ^ 0x1234);
  // Orbit presets
  let aAU;
  if (options?.orbitPreset && options.orbitPreset !== 'auto') {
    const hz = star.habitableZone;
    const mapping = {
      'hz-inner': hz.inner,
      'hz-mid': (hz.inner + hz.outer) / 2,
      'hz-outer': hz.outer,
      'hot': Math.max(0.2, hz.inner * 0.5),
      'cold': Math.min(30, hz.outer * 2)
    };
    aAU = mapping[options.orbitPreset] ?? undefined;
  }
  let archetype = (options?.type && options.type !== 'auto') ? options.type : undefined;
  if (!archetype) {
    // Even weights among sensible candidates, seeded for determinism
    try {
      const rng = mulberry32(hashStringToInt(sStr) ^ 0xC0FFEE);
      const candidates = options?.isMoon
        ? ['icy-moon', 'titan-like']
        : ['temperate-terran', 'mars-like', 'hot-rocky', 'cold-desert', 'titan-like'];
      archetype = candidates[Math.floor(rng() * candidates.length)];
    } catch (e) {
      // Fallback
      archetype = options?.isMoon ? 'icy-moon' : 'mars-like';
    }
  }
  let res = generateRandomPlanet(sStr, { star, aAU, isMoon: options?.isMoon, archetype });
  // Enforce high flux rule: if flux >= 2000 W/m², force Venus-like
  try {
    const fluxNow = estimateFlux(res);
    if (fluxNow >= 2000 && res.override?.classification?.archetype !== 'venus-like') {
      const fixedAU = res.orbitAU ?? aAU;
      res = generateRandomPlanet(sStr, { star, aAU: fixedAU, isMoon: options?.isMoon, archetype: 'venus-like' });
    }
  } catch (e) {}
  const box = document.getElementById('rwg-result');
  if (!box) return;
  box.innerHTML = renderWorldDetail(res, sStr, archetype);
  attachEquilibrateHandler(res, sStr, archetype, box);
  attachTravelHandler(res, sStr);
}

function attachEquilibrateHandler(res, sStr, archetype, box) {
  // Attach equilibrate handler if available
  const eqBtn = document.getElementById('rwg-equilibrate-btn');
  if (eqBtn && typeof runEquilibration === 'function') {
    eqBtn.onclick = async () => {
      const prevSpeed = typeof getGameSpeed === 'function' ? getGameSpeed() : 1;
      if (typeof setGameSpeed === 'function') setGameSpeed(0);
      const cancelToken = { cancelled: false };
      // Progress window
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.5)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';

      const win = document.createElement('div');
      win.style.background = '#222';
      win.style.padding = '16px';
      win.style.border = '1px solid #555';
      win.style.color = '#fff';
      win.style.width = '260px';

      const progressLabel = document.createElement('div');
      progressLabel.id = 'rwg-progress-label';
      progressLabel.style.marginBottom = '4px';
      progressLabel.textContent = 'Minimum fast-forward';

      const barContainer = document.createElement('div');
      barContainer.style.width = '100%';
      barContainer.style.height = '20px';
      barContainer.style.background = '#444';
      barContainer.style.marginBottom = '12px';

      const bar = document.createElement('div');
      bar.style.height = '100%';
      bar.style.width = '0%';
      bar.style.background = '#0f0';
      barContainer.appendChild(bar);

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = () => { cancelToken.cancelled = true; };

      win.appendChild(progressLabel);
      win.appendChild(barContainer);
      win.appendChild(cancelBtn);
      overlay.appendChild(win);
      document.body.appendChild(overlay);

      eqBtn.disabled = true;
      try {
        const result = await runEquilibration(res.override, {
          yearsMax: 10000,
          stepDays: 1,
          checkEvery: 5,
          absTol: 1,
          relTol: 1e-6,
          chunkSteps: 20,
          cancelToken
        }, (p, info) => {
           const label = document.getElementById('rwg-progress-label');
           if (label && info?.label) label.textContent = info.label;
           bar.style.width = `${(p * 100).toFixed(2)}%`;
       });
        const newRes = { ...res, override: result.override, merged: deepMerge(defaultPlanetParameters, result.override) };
        equilibratedWorlds.add(sStr);
        box.innerHTML = renderWorldDetail(newRes, sStr, archetype);
        attachEquilibrateHandler(newRes, sStr, archetype, box);
        attachTravelHandler(newRes, sStr);
      } catch (e) {
        if (e?.message !== 'cancelled') console.error('Equilibration failed:', e);
      } finally {
        if (typeof setGameSpeed === 'function') setGameSpeed(prevSpeed);
        const btn = document.getElementById('rwg-equilibrate-btn');
        if (btn) btn.disabled = false;
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }
    };
  }
}

function renderPlanetCard(p, index) {
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const c = p.merged?.celestialParameters || {};
  const cls = p.classification || p.merged?.classification;
  return `
    <div class="rwg-planet-card">
      <div class="rwg-planet-title">${p.name || p.merged?.name || 'Planet ' + (index + 1)}</div>
      <div class="rwg-grid">
        <div><strong>Orbit</strong><div>${(p.orbitAU ?? c.distanceFromSun)?.toFixed ? (p.orbitAU ?? c.distanceFromSun).toFixed(2) : (p.orbitAU ?? c.distanceFromSun)} AU</div></div>
        <div><strong>Radius</strong><div>${fmt((c.radius ?? 0).toFixed ? c.radius.toFixed(0) : c.radius)} km</div></div>
        <div><strong>Gravity</strong><div>${fmt((c.gravity ?? 0).toFixed ? c.gravity.toFixed(2) : c.gravity)} m/s²</div></div>
        <div><strong>Albedo</strong><div>${(c.albedo ?? 0)}</div></div>
        <div><strong>Type</strong><div>${cls?.archetype || '—'}</div></div>
      </div>
    </div>`;
}

function renderWorldDetail(res, seedUsed, forcedType) {
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const c = res.merged?.celestialParameters || {};
  const r = res.merged?.resources || {};
  const cls = res.override?.classification || res.merged?.classification;
  const atmo = r.atmospheric || {};
  const surf = r.surface || {};
  const temps = estimateWorldTemperatures(res);
  const fluxWm2 = estimateFlux(res);
  // Star summary + parent body if any
  const star = res.star;
  const starPanel = `
    <div class="rwg-card">
      <h3>Star: ${star.name}</h3>
      <div class="rwg-infobar">
        <div class="rwg-chip"><div class="label">Spectral</div><div class="value">${star.spectralType}</div></div>
        <div class="rwg-chip"><div class="label">Luminosity</div><div class="value">${(star.luminositySolar).toFixed(3)} L☉</div></div>
        <div class="rwg-chip"><div class="label">Mass</div><div class="value">${(star.massSolar).toFixed(3)} M☉</div></div>
        <div class="rwg-chip"><div class="label">Temp</div><div class="value">${fmt(star.temperatureK)} K</div></div>
        <div class="rwg-chip"><div class="label">Habitable Zone</div><div class="value">${star.habitableZone.inner.toFixed(2)}–${star.habitableZone.outer.toFixed(2)} AU</div></div>
      </div>
    </div>`;

  const parent = c.parentBody ? `
    <div class="rwg-card">
      <h3>Parent Body: ${c.parentBody.name}</h3>
      <div class="rwg-infobar">
        <div class="rwg-chip"><div class="label">Mass</div><div class="value">${fmt(c.parentBody.mass)}</div></div>
        <div class="rwg-chip"><div class="label">Radius</div><div class="value">${fmt(c.parentBody.radius)} km</div></div>
        <div class="rwg-chip"><div class="label">Orbit Radius</div><div class="value">${fmt(c.parentBody.orbitRadius)} km</div></div>
      </div>
    </div>` : '';

  const eqDone = seedUsed && equilibratedWorlds.has(seedUsed);
  const worldPanel = `
    <div class="rwg-card">
      <h3>${res.merged?.name || 'Generated World'}</h3>
      <div style="margin-bottom:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button id="rwg-equilibrate-btn" class="rwg-btn">Equilibrate</button>
        <button id="rwg-travel-btn" class="rwg-btn" ${eqDone ? '' : 'disabled'}>Travel</button>
      </div>
      ${eqDone ? '' : '<div id="rwg-travel-warning" class="warning-message">Press Equilibrate at least once before traveling.</div>'}
      <div class="rwg-infobar">
        <div class="rwg-chip"><div class="label">Seed</div><div class="value">${seedUsed !== undefined ? seedUsed : ''}</div></div>
        <div class="rwg-chip"><div class="label">Orbit</div><div class="value">${(res.orbitAU ?? c.distanceFromSun)?.toFixed ? (res.orbitAU ?? c.distanceFromSun).toFixed(2) : (res.orbitAU ?? c.distanceFromSun)} AU</div></div>
        <div class="rwg-chip"><div class="label">Radius</div><div class="value">${fmt(c.radius)} km</div></div>
        <div class="rwg-chip"><div class="label">Gravity</div><div class="value">${fmt(c.gravity)} m/s²</div></div>
        <div class="rwg-chip"><div class="label">Albedo</div><div class="value">${c.albedo}</div></div>
        <div class="rwg-chip"><div class="label">Rotation</div><div class="value">${fmt(c.rotationPeriod)} h</div></div>
        <div class="rwg-chip"><div class="label">Flux</div><div class="value">${fmt((fluxWm2).toFixed ? fluxWm2.toFixed(0) : fluxWm2)} W/m²</div></div>
        <div class="rwg-chip"><div class="label">Type</div><div class="value">${forcedType && forcedType !== 'auto' ? forcedType : (cls?.archetype || '—')}</div></div>
        <div class="rwg-chip"><div class="label">Teq</div><div class="value">${cls?.TeqK ? fmt(cls.TeqK) + ' K' : '—'}</div></div>
        ${temps ? `<div class="rwg-chip"><div class="label">Mean T</div><div class="value">${fmt(temps.mean.toFixed ? temps.mean.toFixed(0) : temps.mean)} K</div></div>` : ''}
        ${temps ? `<div class="rwg-chip"><div class="label">Day T</div><div class="value">${fmt(temps.day.toFixed ? temps.day.toFixed(0) : temps.day)} K</div></div>` : ''}
        ${temps ? `<div class="rwg-chip"><div class="label">Night T</div><div class="value">${fmt(temps.night.toFixed ? temps.night.toFixed(0) : temps.night)} K</div></div>` : ''}
      </div>
      <div class="rwg-columns" style="margin-top:10px;">
        <div>
          <h4>Atmosphere</h4>
          ${renderAtmoTable(res)}
        </div>
        <div>
          <h4>Surface</h4>
          ${renderResourceRow('Land (ha)', surf.land?.initialValue)}
          ${renderResourceRow('Ice', surf.ice?.initialValue)}
          ${renderResourceRow('Water', surf.liquidWater?.initialValue)}
          ${renderResourceRow('Dry Ice', surf.dryIce?.initialValue)}
          ${renderResourceRow('Liquid CH₄', surf.liquidMethane?.initialValue)}
          ${renderResourceRow('CH₄ Ice', surf.hydrocarbonIce?.initialValue)}
        </div>
      </div>
    </div>`;

  return `${starPanel}${parent}${worldPanel}`;
}

function estimateWorldTemperatures(res) {
  try {
    if (typeof dayNightTemperaturesModel !== 'function' || typeof calculateAtmosphericPressure !== 'function') {
      return null;
    }
    const c = res.merged?.celestialParameters || {};
    const atmo = res.merged?.resources?.atmospheric || {};
    const star = res.star;
    const Lsun = 3.828e26; // W
    const AU = 149597870700; // m
    const distanceAU = res.orbitAU ?? c.distanceFromSun;
    if (!star || !distanceAU || !c.radius || !c.gravity) return null;
    const flux = (Lsun * (star.luminositySolar || 1)) / (4 * Math.PI * Math.pow(distanceAU * AU, 2));

    const mCO2 = (atmo.carbonDioxide?.initialValue || 0) * 1000; // kg
    const mH2O = (atmo.atmosphericWater?.initialValue || 0) * 1000; // kg
    const mCH4 = (atmo.atmosphericMethane?.initialValue || 0) * 1000; // kg
    const mGHG = (atmo.greenhouseGas?.initialValue || 0) * 1000; // kg
    const totalKg = mCO2 + mH2O + mCH4 + mGHG + ((atmo.inertGas?.initialValue || 0) * 1000);
    const totalTonsForPressure = totalKg / 1000; // physics expects tons
    const pPa = calculateAtmosphericPressure(totalTonsForPressure, c.gravity, c.radius);
    const pBar = pPa / 1e5;
    const mixDen = (mCO2 + mH2O + mCH4 + mGHG) || 1;
    const composition = {
      co2: mCO2 / mixDen,
      h2o: mH2O / mixDen,
      ch4: mCH4 / mixDen,
      greenhouseGas: mGHG / mixDen
    };
    const rotationH = c.rotationPeriod || 24;
    const albedo = c.albedo ?? 0.25;
    const temps = dayNightTemperaturesModel({
      groundAlbedo: albedo,
      flux,
      rotationPeriodH: rotationH,
      surfacePressureBar: pBar,
      composition,
      gSurface: c.gravity
    });
    return temps;
  } catch (e) {
    console.warn('RWG temperature estimate failed', e);
    return null;
  }
}

function estimateFlux(res) {
  try {
    const c = res.merged?.celestialParameters || {};
    const star = res.star;
    const Lsun = 3.828e26; // W
    const AU = 149597870700; // m
    const distanceAU = res.orbitAU ?? c.distanceFromSun;
    if (!star || !distanceAU) return 0;
    return (Lsun * (star.luminositySolar || 1)) / (4 * Math.PI * Math.pow(distanceAU * AU, 2));
  } catch {
    return 0;
  }
}

function renderResourceRow(label, value) {
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const v = (value === undefined || value === null) ? '—' : fmt(value);
  return `<div class="rwg-row"><span>${label}</span><span>${v}</span></div>`;
}

function renderAtmoRow(label, amountTons, kPa) {
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const amt = (amountTons === undefined || amountTons === null) ? '—' : fmt(amountTons);
  const p = (typeof kPa === 'number' && isFinite(kPa)) ? `${(kPa).toFixed(1)} kPa` : '—';
  return `<div class="rwg-row"><span>${label}</span><span>${amt} (${p})</span></div>`;
}

function estimateGasPressure(res, gasKey) {
  try {
    if (typeof calculateAtmosphericPressure !== 'function') return null;
    const c = res.merged?.celestialParameters || {};
    const amt = res.merged?.resources?.atmospheric?.[gasKey]?.initialValue || 0; // tons
    if (!c.gravity || !c.radius) return null;
    const pa = calculateAtmosphericPressure(amt, c.gravity, c.radius);
    return pa / 1000; // kPa
  } catch { return null; }
}

function renderAtmoTable(res) {
  const rows = [
    { label: 'CO₂', key: 'carbonDioxide' },
    { label: 'Inert Gas', key: 'inertGas' },
    { label: 'O₂', key: 'oxygen' },
    { label: 'Water Vap.', key: 'atmosphericWater' },
    { label: 'CH₄', key: 'atmosphericMethane' }
  ];
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const cells = rows.map(r => {
    const amt = res.merged?.resources?.atmospheric?.[r.key]?.initialValue;
    const amtText = (amt === undefined || amt === null) ? '—' : fmt(amt);
    const kPa = estimateGasPressure(res, r.key);
    const pText = (typeof kPa === 'number' && isFinite(kPa)) ? `${kPa.toFixed(1)} kPa` : '—';
    return `<div class="rwg-row"><span>${r.label}</span><span>${amtText}</span><span>${pText}</span></div>`;
  }).join('');
  // Header row
  const header = `<div class="rwg-row"><span><strong>Gas</strong></span><span><strong>Amount</strong></span><span><strong>Pressure</strong></span></div>`;
  return `<div class="rwg-atmo-table">${header}${cells}</div>`;
}

// Hook into Space UI whenever Random subtab is shown
document.addEventListener('click', (e) => {
  const el = e.target.closest('.space-subtab');
  if (!el) return;
  const id = el.dataset.subtab;
  if (id === 'space-random') {
    ensureRandomWorldUI();
  }
});

// If Random gets activated programmatically
if (typeof showSpaceRandomTab === 'function') {
  const originalShow = showSpaceRandomTab;
  showSpaceRandomTab = function() {
    originalShow();
    ensureRandomWorldUI();
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeRandomWorldUI, ensureRandomWorldUI, renderWorldDetail, attachEquilibrateHandler, attachTravelHandler };
}

