// rwgUI.js

// Guard flags
let rwgUIInitialized = false;
const equilibratedWorlds = new Set();

function encodeSeedOptions(seed, opts = {}) {
  const t = opts.target ?? 'auto';
  const ty = opts.type ?? 'auto';
  const o = opts.orbitPreset ?? 'auto';
  return `${seed}|${t}|${ty}|${o}`;
}

function decodeSeedOptions(str) {
  const [seed, t = 'auto', ty = 'auto', o = 'auto'] = String(str).split('|');
  return { seed, options: { target: t, type: ty, orbitPreset: o } };
}

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
        <option value="auto" selected>Target: Auto</option>
        <option value="planet">Target: Planet</option>
        <option value="moon">Target: Moon</option>
      </select>
      <select id="rwg-type">
        <option value="auto" selected>Type: Auto</option>
        <option value="mars-like">Type: Mars-like</option>
        <option value="cold-desert">Type: Cold Desert</option>
        <option value="icy-moon">Type: Icy</option>
        <option value="titan-like">Type: Titan-like</option>
        <option value="carbon-planet">Type: Carbon</option>
        <option value="desiccated-desert">Type: Desiccated-desert</option>
        <option value="super-earth">Type: Super-Earth</option>
        <option value="venus-like" disabled>Type: Venus-like (Locked)</option>
      </select>
      <select id="rwg-orbit">
        <option value="auto" selected>Orbit: Auto</option>
        <option value="hz-inner">Orbit: HZ Inner</option>
        <option value="hz-mid">Orbit: HZ Mid</option>
        <option value="hz-outer">Orbit: HZ Outer</option>
        <option value="hot" disabled>Orbit: Hot (Locked)</option>
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
    const seedInput = document.getElementById('rwg-seed').value.trim();
    const targetSel = /** @type {HTMLSelectElement} */(document.getElementById('rwg-target'));
    const orbitSel = /** @type {HTMLSelectElement} */(document.getElementById('rwg-orbit'));
    const typeSel = /** @type {HTMLSelectElement} */(document.getElementById('rwg-type'));
    if (seedInput) {
      const { seed, options } = decodeSeedOptions(seedInput);
      if (targetSel) targetSel.value = options.target;
      if (orbitSel) orbitSel.value = options.orbitPreset;
      if (typeSel) typeSel.value = options.type;
      drawSingle(seed, options);
    } else {
      const target = targetSel.value;
      const orbit = orbitSel.value;
      const type = typeSel.value;
      drawSingle(undefined, { target, orbitPreset: orbit, type });
    }
  });
}

function ensureRandomWorldUI() {
  if (document.getElementById('space-random')) {
    if (!rwgUIInitialized) initializeRandomWorldUI();
  }
}

function updateRandomWorldUI() {
  const mgr = typeof rwgManager !== 'undefined' ? rwgManager : globalThis.rwgManager;
  if (!mgr) return;

  const orbitSel = /** @type {HTMLSelectElement|null} */(document.getElementById('rwg-orbit'));
  if (orbitSel) {
    Array.from(orbitSel.options).forEach(opt => {
      if (opt.value === 'auto') return;
      const locked = typeof mgr.isOrbitLocked === 'function' ? mgr.isOrbitLocked(opt.value) : false;
      if (opt.disabled === locked) return; // No change needed

      const base = opt.dataset.baseText || opt.textContent.replace(' (Locked)', '');
      opt.dataset.baseText = base;
      const newText = locked ? base + ' (Locked)' : base;
      opt.disabled = locked;
      opt.textContent = newText;
    });
  }

  const typeSel = /** @type {HTMLSelectElement|null} */(document.getElementById('rwg-type'));
  if (typeSel) {
    Array.from(typeSel.options).forEach(opt => {
      if (opt.value === 'auto') return;
      const key = opt.value === 'rocky' ? 'hot-rocky' : opt.value;
      const locked = typeof mgr.isTypeLocked === 'function' ? mgr.isTypeLocked(key) : false;
      if (opt.disabled === locked) return; // No change needed

      const base = opt.dataset.baseText || opt.textContent.replace(' (Locked)', '');
      opt.dataset.baseText = base;
      const newText = locked ? base + ' (Locked)' : base;
      opt.disabled = locked;
      opt.textContent = newText;
    });
  }
}

function attachTravelHandler(res, sStr) {
  const travelBtn = document.getElementById('rwg-travel-btn');
  if (!travelBtn) return;
  travelBtn.onclick = () => {
    if (!equilibratedWorlds.has(sStr)) return;
    if (spaceManager?.isSeedTerraformed && spaceManager.isSeedTerraformed(sStr)) return;
    if (spaceManager?.travelToRandomWorld) {
      spaceManager.travelToRandomWorld(res, sStr);
    }
  };
}

function drawSingle(seed, options) {
  if (typeof generateRandomPlanet !== 'function') return;
  const sStr = seed ? String(seed) : String((Math.random() * 1e9) >>> 0);
  const seedKey = encodeSeedOptions(sStr, options);

  const orbitSelect = /** @type {HTMLSelectElement|null} */(document.getElementById('rwg-orbit'));
  const orbitOptions = orbitSelect
    ? Array.from(orbitSelect.options)
        .filter(opt => !opt.disabled && opt.value !== 'auto')
        .map(opt => opt.value)
    : undefined;

  const typeSelect = /** @type {HTMLSelectElement|null} */(document.getElementById('rwg-type'));
  const typeOptions = typeSelect
    ? Array.from(typeSelect.options)
        .filter(opt => !opt.disabled && opt.value !== 'auto')
        .map(opt => opt.value === 'rocky' ? 'hot-rocky' : opt.value)
    : undefined;

  let res = generateRandomPlanet(sStr, {
    target: options?.target,
    orbitPreset: options?.orbitPreset,
    availableOrbits: orbitOptions,
    type: options?.type,
    availableTypes: typeOptions
  });
  let archetype = res.archetype;
  // Enforce high flux rule: if flux >= 2000 W/m², force Venus-like
  try {
    const fluxNow = estimateFlux(res);
    const venusLocked = document.getElementById('rwg-type')
      ?.querySelector('option[value="venus-like"]')?.disabled;
    if (fluxNow >= 2000 && res.archetype !== 'venus-like' && !venusLocked) {
      const fixedAU = res.orbitAU;
      res = generateRandomPlanet(sStr, { star: res.star, aAU: fixedAU, isMoon: res.isMoon, archetype: 'venus-like' });
      archetype = res.archetype;
    }
  } catch (e) {}
  const box = document.getElementById('rwg-result');
  if (!box) return;
  box.innerHTML = renderWorldDetail(res, seedKey, archetype);
  attachEquilibrateHandler(res, seedKey, archetype, box);
  attachTravelHandler(res, seedKey);
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
      progressLabel.textContent = 'Minimum fast-forward (Game is paused)';

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

      const statsDiv = document.createElement('div');
      statsDiv.style.marginBottom = '12px';
      const stableRefText = document.createElement('div');
      stableRefText.textContent = 'Number of refinements from stability: 0';
      const unstableRefText = document.createElement('div');
      unstableRefText.textContent = 'Number of refinements from instability: 0';
      const timeSimText = document.createElement('div');
      timeSimText.textContent = 'Time simulated: 0s';
      statsDiv.appendChild(stableRefText);
      statsDiv.appendChild(unstableRefText);
      statsDiv.appendChild(timeSimText);

      const endBtn = document.createElement('button');
      endBtn.id = 'rwg-end-early-btn';
      endBtn.textContent = 'End Early';
      endBtn.style.display = 'none';
      endBtn.onclick = () => { cancelToken.endEarly = true; };

      const addTimeBtn = document.createElement('button');
      addTimeBtn.textContent = 'Add 10s';
      addTimeBtn.onclick = () => {
        cancelToken.addTime = (cancelToken.addTime || 0) + 10000;
      };

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = () => { cancelToken.cancelled = true; };

      win.appendChild(progressLabel);
      win.appendChild(barContainer);
      win.appendChild(statsDiv);
      win.appendChild(endBtn);
      win.appendChild(addTimeBtn);
      win.appendChild(cancelBtn);
      overlay.appendChild(win);
      document.body.appendChild(overlay);

      eqBtn.disabled = true;
      try {
        const result = await runEquilibration(res.merged, {
          cancelToken
        }, (p, info) => {
          const label = document.getElementById('rwg-progress-label');
          if (label && info?.label) label.textContent = info.label;
          bar.style.width = `${(p * 100).toFixed(2)}%`;
          if (info) {
            stableRefText.textContent = `Number of refinements from stability: ${info.refinementsFromStability || 0}/20`;
            unstableRefText.textContent = `Number of refinements from instability: ${info.refinementsFromInstability || 0}`;
            if (typeof formatDuration === 'function') {
              const seconds = (info.simulatedMs || 0) / 1000 * 86400;
              timeSimText.textContent = `Time simulated: ${formatDuration(seconds)}`;
            }
          }
          if (info?.label === 'Additional fast-forward (Game is paused)') endBtn.style.display = '';
        });
        const newRes = { ...res, override: result.override, merged: deepMerge(defaultPlanetParameters, result.override) };
        equilibratedWorlds.add(sStr);
        box.innerHTML = renderWorldDetail(newRes, sStr, archetype);
        attachEquilibrateHandler(newRes, sStr, archetype, box);
        attachTravelHandler(newRes, sStr);
      } catch (e) {
        if (e?.message === 'timeout') {
          equilibratedWorlds.add(sStr);
          box.innerHTML = renderWorldDetail(res, sStr, archetype);
          attachEquilibrateHandler(res, sStr, archetype, box);
          attachTravelHandler(res, sStr);
        } else if (e?.message !== 'cancelled') {
          console.error('Equilibration failed:', e);
        }
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
  const gWarn = c.gravity > 10
    ? '<span class="info-tooltip-icon" title="Every value of gravity above 10 reduces happiness by 10%, for a maximum of a 100% reduction">⚠</span>'
    : '';
  return `
    <div class="rwg-planet-card">
      <div class="rwg-planet-title">${p.name || p.merged?.name || 'Planet ' + (index + 1)}</div>
      <div class="rwg-grid">
        <div><strong>Orbit</strong><div>${(p.orbitAU ?? c.distanceFromSun)?.toFixed ? (p.orbitAU ?? c.distanceFromSun).toFixed(2) : (p.orbitAU ?? c.distanceFromSun)} AU</div></div>
        <div><strong>Radius</strong><div>${fmt((c.radius ?? 0).toFixed ? c.radius.toFixed(0) : c.radius)} km</div></div>
        <div><strong>Gravity</strong><div>${fmt((c.gravity ?? 0).toFixed ? c.gravity.toFixed(2) : c.gravity)} m/s²${gWarn}</div></div>
        <div><strong>Albedo</strong><div>${(c.albedo ?? 0)}</div></div>
        <div><strong>Type</strong><div>${cls?.archetype || '—'}</div></div>
      </div>
    </div>`;
}

function renderWorldDetail(res, seedUsed, forcedType) {
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const c = res.merged?.celestialParameters || {};
  const seedString = res.seedString;
  const r = res.merged?.resources || {};
  const cls = res.override?.classification || res.merged?.classification;
  const surf = r.surface || {};
  const temps = res.override?.finalTemps || null;
  const fluxWm2 = estimateFlux(res);
  const teqCalc = estimateEquilibriumTemp(res, fluxWm2);
  const teqDisplay = cls?.TeqK || (teqCalc ? Math.round(teqCalc) : null);
  // Star summary + parent body if any
  const star = res.star;
  const toDisplayTemp = typeof toDisplayTemperature === 'function' ? toDisplayTemperature : (v => v);
  const tempUnit = typeof getTemperatureUnit === 'function' ? getTemperatureUnit() : 'K';
  const starPanel = `
    <div class="rwg-card">
      <h3>Star: ${star.name}</h3>
      <div class="rwg-infobar">
        <div class="rwg-chip"><div class="label">Spectral</div><div class="value">${star.spectralType}</div></div>
        <div class="rwg-chip"><div class="label">Luminosity</div><div class="value">${(star.luminositySolar).toFixed(3)} L☉</div></div>
        <div class="rwg-chip"><div class="label">Mass</div><div class="value">${(star.massSolar).toFixed(3)} M☉</div></div>
        <div class="rwg-chip"><div class="label">Temp</div><div class="value">${fmt(toDisplayTemp(star.temperatureK))} ${tempUnit}</div></div>
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
  const alreadyTerraformed = seedUsed && typeof globalThis.spaceManager?.isSeedTerraformed === 'function'
    ? globalThis.spaceManager.isSeedTerraformed(seedUsed)
    : false;
  const travelDisabled = !eqDone || alreadyTerraformed;
  const warningMsg = !eqDone
    ? 'Press Equilibrate at least once before traveling.'
    : (alreadyTerraformed ? 'This world has already been terraformed.' : '');
  const gWarn = c.gravity > 10
    ? '<span class="info-tooltip-icon" title="Every value of gravity above 10 reduces happiness by 10%, for a maximum of a 100% reduction">⚠</span>'
    : '';
  const worldPanel = `
    <div class="rwg-card">
      <h3>${res.merged?.name || 'Generated World'}</h3>
      <div style="margin-bottom:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button id="rwg-equilibrate-btn" class="rwg-btn">Equilibrate</button>
        <span class="info-tooltip-icon" title="The weather model in Terraforming Titans is quite complex.  It is not realistic for the random world generator to generate worlds that already start near equilibrium.  However, most real worlds are fairly near equilibrium, at least on a short term, ignoring seasons, atmospheric loss, star heating, etc.  \n\nTo reach this state, worlds can be simulated for thousands of year, as necessary, so that the climate stabilizes.  This button must be pressed to get at least a little of simulation, but can also be ended early if preferred.  Some milestones might complete very easily if equilibrium fails to be reached, but it is otherwise not a major issue.  For best results, please keep the window in focus while running the simulation.  The rest of the game will pause.">&#9432;</span>
        <button id="rwg-travel-btn" class="rwg-btn" ${travelDisabled ? 'disabled' : ''}>Travel</button>
        ${warningMsg ? `<span id="rwg-travel-warning" class="rwg-inline-warning">⚠ ${warningMsg} ⚠</span>` : ''}
      </div>
      <div class="rwg-infobar">
        <div class="rwg-chip"><div class="label">Seed</div><div class="value">${seedString}</div></div>
        <div class="rwg-chip"><div class="label">Orbit</div><div class="value">${(res.orbitAU ?? c.distanceFromSun)?.toFixed ? (res.orbitAU ?? c.distanceFromSun).toFixed(2) : (res.orbitAU ?? c.distanceFromSun)} AU</div></div>
        <div class="rwg-chip"><div class="label">Radius</div><div class="value">${fmt(c.radius)} km</div></div>
        <div class="rwg-chip"><div class="label">Gravity</div><div class="value">${fmt(c.gravity)} m/s²${gWarn}</div></div>
        <div class="rwg-chip"><div class="label">Albedo</div><div class="value">${c.albedo}</div></div>
        <div class="rwg-chip"><div class="label">Rotation</div><div class="value">${fmt(c.rotationPeriod)} h</div></div>
        <div class="rwg-chip"><div class="label">Flux</div><div class="value">${fmt((fluxWm2).toFixed ? fluxWm2.toFixed(0) : fluxWm2)} W/m²</div></div>
        <div class="rwg-chip"><div class="label">Type</div><div class="value">${forcedType && forcedType !== 'auto' ? forcedType : (cls?.archetype || '—')}</div></div>
        <div class="rwg-chip"><div class="label">Teq</div><div class="value">${teqDisplay ? fmt(toDisplayTemp(teqDisplay)) + ' ' + tempUnit : '—'}</div></div>
        ${temps ? `<div class="rwg-chip"><div class="label">Mean T</div><div class="value">${fmt(Math.round(toDisplayTemp(temps.mean)))} ${tempUnit}</div></div>` : ''}
        ${temps ? `<div class="rwg-chip"><div class="label">Day T</div><div class="value">${fmt(Math.round(toDisplayTemp(temps.day)))} ${tempUnit}</div></div>` : ''}
        ${temps ? `<div class="rwg-chip"><div class="label">Night T</div><div class="value">${fmt(Math.round(toDisplayTemp(temps.night)))} ${tempUnit}</div></div>` : ''}
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

function estimateEquilibriumTemp(res, fluxWm2) {
  try {
    const c = res.merged?.celestialParameters || {};
    const albedo = c.albedo ?? 0.3;
    const sigma = 5.670374419e-8;
    if (!fluxWm2) return null;
    return Math.pow((fluxWm2 * (1 - albedo)) / (4 * sigma), 0.25);
  } catch {
    return null;
  }
}

function renderResourceRow(label, value) {
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const v = (value === undefined || value === null) ? '—' : fmt(value);
  return `<div class="rwg-row"><span>${label}</span><span>${v}</span></div>`;
}

function estimateGasPressure(res, gasKey) {
  try {
    if (typeof calculateAtmosphericPressure !== 'function') return null;
    const c = res.merged?.celestialParameters || {};
    const amt = res.merged?.resources?.atmospheric?.[gasKey]?.initialValue || 0; // tons
    if (!c.gravity || !c.radius) return null;
    const pa = calculateAtmosphericPressure(amt, c.gravity, c.radius);
    return pa; // kPa
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
    const pText = (typeof kPa === 'number' && isFinite(kPa)) ? `${formatNumber(kPa)}Pa` : '—';
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

if (typeof updateSpaceUI === 'function') {
  const originalUpdateSpaceUI = updateSpaceUI;
  updateSpaceUI = function(...args) {
    originalUpdateSpaceUI.apply(this, args);
    updateRandomWorldUI();
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeRandomWorldUI, ensureRandomWorldUI, updateRandomWorldUI, renderWorldDetail, attachEquilibrateHandler, attachTravelHandler };
}

