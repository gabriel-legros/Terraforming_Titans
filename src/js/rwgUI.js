// rwgUI.js

// Guard flags
let rwgUIInitialized = false;
const equilibratedWorlds = new Set();
let historyContainerEl;
let historyListEl;
let historyPageEl;
let historyPrevBtn;
let historyNextBtn;
let historyCollapsed = false;
let historyData = [];
let historyPage = 0;
let lastHistoryState = '';
let rwgSeedEl;
let rwgTargetEl;
let rwgTypeEl;
let rwgOrbitEl;
let rwgHazardEl;
let rwgResultEl;

if (!globalThis.__rwgGravityHelpers) {
  globalThis.__rwgGravityHelpers = {};
}

var rwgGravityHelpers = globalThis.__rwgGravityHelpers;

if (!rwgGravityHelpers.constants) {
  rwgGravityHelpers.constants = {
    linearThreshold: 10,
    linearRate: 0.1,
    exponentialThreshold: 20,
    exponentialInterval: 10
  };
}

if (!rwgGravityHelpers.roundTo) {
  rwgGravityHelpers.roundTo = (value, decimals) => {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  };
}

if (!rwgGravityHelpers.calculateGravityCostMultiplier) {
  rwgGravityHelpers.calculateGravityCostMultiplier = (gravity) => {
    if (!Number.isFinite(gravity)) return 1;
    const constants = rwgGravityHelpers.constants;
    const linearExcess = Math.max(0, gravity - constants.linearThreshold);
    const linearIncrease = linearExcess * constants.linearRate;
    let exponentialIncrease = 0;
    if (gravity > constants.exponentialThreshold) {
      const exponent = (gravity - constants.exponentialThreshold) / constants.exponentialInterval;
      exponentialIncrease = Math.pow(2, exponent) - 1;
    }
    return 1 + linearIncrease + exponentialIncrease;
  };
}

if (!rwgGravityHelpers.createGravityWarning) {
  rwgGravityHelpers.createGravityWarning = (gravity, fmt, options = {}) => {
    const constants = rwgGravityHelpers.constants;
    if (!Number.isFinite(gravity) || gravity <= constants.linearThreshold) return '';
    const { includeFlavor = false } = options;
    const happinessPenalty = Math.min((gravity - constants.linearThreshold) * 5, 100);
    const costMultiplier = rwgGravityHelpers.calculateGravityCostMultiplier(gravity);
    const costIncrease = Math.max(0, (costMultiplier - 1) * 100);
    const flavor = includeFlavor ? 'Humans and their bodies are very sensitive to high gravity. ' : '';
    const happinessLine = `${flavor}Every m/s² above 10 reduces happiness by 5%, up to a 100% reduction.`;
    const costLine = gravity > constants.exponentialThreshold
      ? 'Construction costs climb 10% per m/s² above 10 and gain an exponential surcharge that doubles every additional 10 m/s² beyond 20.'
      : 'Construction costs climb 10% per m/s² above 10.';
    const happinessText = fmt(rwgGravityHelpers.roundTo(happinessPenalty, 2), false, 2);
    const costText = fmt(rwgGravityHelpers.roundTo(costIncrease, 2), false, 2);
    const penaltyLine = `This world imposes a ${happinessText}% happiness penalty and adds ${costText}% to all building and colony costs.`;
    return `<span class="info-tooltip-icon" title="${happinessLine} ${costLine} ${penaltyLine}">⚠</span>`;
  };
}

var calculateGravityCostMultiplier = rwgGravityHelpers.calculateGravityCostMultiplier;
var createGravityWarning = rwgGravityHelpers.createGravityWarning;

const hazardDisplayNames = { hazardousBiomass: 'Hazardous Biomass' };

function refreshHazardSelect() {
  if (!rwgHazardEl) return;
  const mgr = typeof rwgManager !== 'undefined' ? rwgManager : globalThis.rwgManager;
  const featureUnlocked = mgr && typeof mgr.isFeatureUnlocked === 'function'
    ? mgr.isFeatureUnlocked('hazards')
    : false;
  if (!featureUnlocked) {
    rwgHazardEl.style.display = 'none';
    if (rwgHazardEl.value !== 'none') rwgHazardEl.value = 'none';
    return;
  }

  rwgHazardEl.style.display = '';
  const hazards = mgr && typeof mgr.getAvailableHazards === 'function'
    ? mgr.getAvailableHazards()
    : [];
  const key = JSON.stringify(hazards);
  if (rwgHazardEl.dataset.lastHazardList !== key) {
    const frag = document.createDocumentFragment();
    const noneOpt = document.createElement('option');
    noneOpt.value = 'none';
    noneOpt.textContent = 'Hazards: None';
    frag.appendChild(noneOpt);
    hazards.forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `Hazards: ${hazardDisplayNames[id] || id}`;
      frag.appendChild(opt);
    });
    rwgHazardEl.innerHTML = '';
    rwgHazardEl.appendChild(frag);
    rwgHazardEl.dataset.lastHazardList = key;
  }

  const hasSelection = Array.from(rwgHazardEl.options).some((opt) => opt.value === rwgHazardEl.value);
  if (!hasSelection) {
    rwgHazardEl.value = 'none';
  }
}

function encodeSeedOptions(seed, opts = {}) {
  const t = opts.target ?? 'auto';
  const ty = opts.type ?? 'auto';
  const o = opts.orbitPreset ?? 'auto';
  const h = opts.hazard ?? 'auto';
  return `${seed}|${t}|${ty}|${o}|${h}`;
}

function decodeSeedOptions(str) {
  const parts = String(str).split('|');
  const seed = parts[0] || '';
  const t = parts[1] ?? 'auto';
  const ty = parts[2] ?? 'auto';
  const o = parts[3] ?? 'auto';
  const h = parts[4] ?? 'auto';
  return { seed, options: { target: t, type: ty, orbitPreset: o, hazard: h } };
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
      <select id="rwg-type"></select>
      <select id="rwg-orbit">
        <option value="auto" selected>Orbit: Auto</option>
        <option value="hz-inner">Orbit: HZ Inner</option>
        <option value="hz-mid">Orbit: HZ Mid</option>
        <option value="hz-outer">Orbit: HZ Outer</option>
        <option value="hot" disabled>Orbit: Hot (Locked)</option>
        <option value="cold">Orbit: Cold</option>
        <option value="very-cold">Orbit: Very Cold</option>
      </select>
      <select id="rwg-hazard" style="display:none;">
        <option value="none" selected>Hazards: None</option>
      </select>
    </div>
    <div>
      <button id="rwg-generate-planet" class="rwg-btn primary">Generate World</button>
    </div>
  `;
  container.appendChild(controls);

  rwgSeedEl = container.querySelector('#rwg-seed');
  rwgTargetEl = container.querySelector('#rwg-target');
  rwgTypeEl = container.querySelector('#rwg-type');
  rwgOrbitEl = container.querySelector('#rwg-orbit');
  rwgHazardEl = container.querySelector('#rwg-hazard');
  if (rwgHazardEl) {
    rwgHazardEl.dataset.lastHazardList = '[]';
    refreshHazardSelect();
  }

  if (rwgTypeEl) {
    const typeOrder = [
      'mars-like',
      'cold-desert',
      'icy-moon',
      'titan-like',
      'carbon-planet',
      'desiccated-desert',
      'super-earth',
      'venus-like',
    ];
    const frag = document.createDocumentFragment();
    const autoOpt = document.createElement('option');
    autoOpt.value = 'auto';
    autoOpt.textContent = 'Type: Auto';
    autoOpt.selected = true;
    frag.appendChild(autoOpt);
    typeOrder.forEach(t => {
      const info = (globalThis.RWG_WORLD_TYPES && globalThis.RWG_WORLD_TYPES[t]) || {};
      const opt = document.createElement('option');
      opt.value = t;
      const base = `Type: ${info.displayName || t}`;
      opt.textContent = base;
      opt.dataset.baseText = base;
      if (typeof rwgManager !== 'undefined' && typeof rwgManager.isTypeLocked === 'function' && rwgManager.isTypeLocked(t)) {
        opt.disabled = true;
        opt.textContent = `${base} (Locked)`;
      }
      frag.appendChild(opt);
    });
    rwgTypeEl.appendChild(frag);
  }

  const result = document.createElement('div');
  result.id = 'rwg-result';
  result.className = 'rwg-result';
  container.appendChild(result);
  rwgResultEl = result;

  const history = document.createElement('div');
  history.id = 'rwg-history';
  history.className = 'rwg-history';
  history.innerHTML = `
    <h3>Visited Worlds</h3>
    <div id="rwg-history-list"></div>
    <div class="rwg-history-controls">
      <button id="rwg-history-prev" class="rwg-btn">Prev</button>
      <span id="rwg-history-page"></span>
      <button id="rwg-history-next" class="rwg-btn">Next</button>
    </div>`;
  container.appendChild(history);

  historyContainerEl = history;
  historyListEl = history.querySelector('#rwg-history-list');
  historyPageEl = history.querySelector('#rwg-history-page');
  historyPrevBtn = history.querySelector('#rwg-history-prev');
  historyNextBtn = history.querySelector('#rwg-history-next');
  // Make header collapsible without changing markup structure
  const historyHeader = history.querySelector('h3');
  if (historyHeader) {
    historyHeader.classList.add('rwg-history-title');
    historyHeader.innerHTML = '<span id="rwg-history-arrow" class="summary-arrow">▼</span> Visited Worlds';
    const arrowEl = historyHeader.querySelector('#rwg-history-arrow');
    historyHeader.addEventListener('click', () => {
      historyCollapsed = !historyCollapsed;
      if (historyCollapsed) {
        if (historyListEl) historyListEl.style.display = 'none';
        if (historyPrevBtn?.parentElement) historyPrevBtn.parentElement.style.display = 'none';
        if (arrowEl) arrowEl.textContent = '▶';
      } else {
        if (historyListEl) historyListEl.style.display = '';
        if (historyPrevBtn?.parentElement) historyPrevBtn.parentElement.style.display = '';
        if (arrowEl) arrowEl.textContent = '▼';
      }
    });
  }

  historyPrevBtn.addEventListener('click', () => {
    if (historyPage > 0) {
      historyPage--;
      renderHistoryPage();
    }
  });
  historyNextBtn.addEventListener('click', () => {
    const maxPage = Math.ceil(historyData.length / 10) - 1;
    if (historyPage < maxPage) {
      historyPage++;
      renderHistoryPage();
    }
  });

  // Wire buttons
  const btnPlanet = controls.querySelector('#rwg-generate-planet');
  btnPlanet.addEventListener('click', () => {
    const seedInput = document.getElementById('rwg-seed').value.trim();
    const targetSel = /** @type {HTMLSelectElement} */(document.getElementById('rwg-target'));
    const orbitSel = /** @type {HTMLSelectElement} */(document.getElementById('rwg-orbit'));
    const typeSel = /** @type {HTMLSelectElement} */(document.getElementById('rwg-type'));
    refreshHazardSelect();
    if (seedInput) {
      const { seed, options } = decodeSeedOptions(seedInput);
      if (targetSel) targetSel.value = options.target;
      if (orbitSel) orbitSel.value = options.orbitPreset;
      if (typeSel) typeSel.value = options.type;
      const hazardOption = options.hazard && options.hazard !== 'auto' ? options.hazard : 'none';
      if (rwgHazardEl) {
        const hasOption = Array.from(rwgHazardEl.options).some(opt => opt.value === hazardOption);
        rwgHazardEl.value = hasOption ? hazardOption : 'none';
      }
      drawSingle(seed, { ...options, hazard: hazardOption });
    } else {
      const target = targetSel.value;
      const orbit = orbitSel.value;
      const type = typeSel.value;
      const hazard = rwgHazardEl ? rwgHazardEl.value : 'none';
      drawSingle(undefined, { target, orbitPreset: orbit, type, hazard });
    }
  });

  renderHistory();
}

function ensureRandomWorldUI() {
  if (document.getElementById('space-random')) {
    if (!rwgUIInitialized) initializeRandomWorldUI();
  }
}

function updateRandomWorldUI() {
  const mgr = typeof rwgManager !== 'undefined' ? rwgManager : globalThis.rwgManager;
  if (!mgr) return;

  refreshHazardSelect();

  if (rwgOrbitEl) {
    Array.from(rwgOrbitEl.options).forEach(opt => {
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

  if (rwgTypeEl) {
    Array.from(rwgTypeEl.options).forEach(opt => {
      if (opt.value === 'auto') return;
      const locked = typeof mgr.isTypeLocked === 'function' ? mgr.isTypeLocked(opt.value) : false;
      if (opt.disabled === locked) return; // No change needed

      const base = opt.dataset.baseText || opt.textContent.replace(' (Locked)', '');
      opt.dataset.baseText = base;
      const newText = locked ? base + ' (Locked)' : base;
      opt.disabled = locked;
      opt.textContent = newText;
    });
  }
  // Update the currently displayed world's travel lock/warning, if present
  try {
    const sm = typeof spaceManager !== 'undefined' ? spaceManager : globalThis.spaceManager;
    const travelBtn = /** @type {HTMLButtonElement|null} */(document.getElementById('rwg-travel-btn'));
    if (rwgResultEl && travelBtn && sm) {
      const seedUsed = rwgResultEl.dataset ? rwgResultEl.dataset.seedUsed : undefined;
      const canonicalSeed = rwgResultEl.dataset ? (rwgResultEl.dataset.canonicalSeed || rwgResultEl.dataset.seedString) : undefined;
      const eqDone = seedUsed
        ? (equilibratedWorlds.has(seedUsed) || (canonicalSeed ? equilibratedWorlds.has(canonicalSeed) : false))
        : false;
      const alreadyTerraformed = (canonicalSeed && typeof sm.isSeedTerraformed === 'function')
        ? sm.isSeedTerraformed(canonicalSeed)
        : (seedUsed && typeof sm.isSeedTerraformed === 'function' ? sm.isSeedTerraformed(seedUsed) : false);
      const lockedByStory = typeof sm.isRandomTravelLocked === 'function' ? sm.isRandomTravelLocked() : false;
      const travelDisabled = lockedByStory || !!alreadyTerraformed || !eqDone;
      travelBtn.disabled = travelDisabled;

      const warningMsg = lockedByStory
        ? 'You must complete the story for the current world first'
        : (alreadyTerraformed
          ? 'This world has already been terraformed.'
          : (!eqDone ? 'Press Equilibrate at least once before traveling.' : ''));
      let warnEl = document.getElementById('rwg-travel-warning');
      if (warningMsg) {
        if (!warnEl) {
          warnEl = document.createElement('span');
          warnEl.id = 'rwg-travel-warning';
          warnEl.className = 'rwg-inline-warning';
          travelBtn.parentElement?.appendChild(warnEl);
        }
        warnEl.textContent = `⚠ ${warningMsg} ⚠`;
      } else if (warnEl && warnEl.parentElement) {
        warnEl.parentElement.removeChild(warnEl);
      }
    }
  } catch(_) {}

  renderHistory();
}

function attachTravelHandler(res, sStr) {
  const travelBtn = document.getElementById('rwg-travel-btn');
  if (!travelBtn) return;
  travelBtn.onclick = () => {
    const canonical = res?.seedString || sStr;
    if (!equilibratedWorlds.has(sStr) && !equilibratedWorlds.has(canonical)) return;
    if (spaceManager?.isSeedTerraformed && (spaceManager.isSeedTerraformed(canonical) || spaceManager.isSeedTerraformed(sStr))) return;
    if (spaceManager?.travelToRandomWorld) {
      const travelled = spaceManager.travelToRandomWorld(res, sStr);
      if (travelled) {
        const box = document.getElementById('rwg-result');
        if (box) {
          box.innerHTML = renderWorldDetail(res, sStr);
          try {
            box.dataset.seedUsed = sStr;
            if (res?.seedString) box.dataset.canonicalSeed = res.seedString;
          } catch(_){}
          attachEquilibrateHandler(res, sStr, undefined, box);
          attachTravelHandler(res, sStr);
        }
        updateRandomWorldUI();
      }
    }
  };
}

function drawSingle(seed, options) {
  if (typeof generateRandomPlanet !== 'function') return;
  refreshHazardSelect();
  const hazardSelect = rwgHazardEl;
  const hazardOption = options?.hazard ?? (hazardSelect ? hazardSelect.value : 'none');
  const normalizedHazard = !hazardOption || hazardOption === 'auto' ? 'none' : hazardOption;
  if (hazardSelect) {
    const hasOption = Array.from(hazardSelect.options).some(opt => opt.value === normalizedHazard);
    hazardSelect.value = hasOption ? normalizedHazard : 'none';
  }
  const resolvedOptions = {
    target: options?.target,
    orbitPreset: options?.orbitPreset,
    type: options?.type,
    hazard: normalizedHazard
  };
  const sStr = seed ? String(seed) : String((Math.random() * 1e9) >>> 0);

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
        .map(opt => opt.value)
    : undefined;

  let res = generateRandomPlanet(sStr, {
    target: resolvedOptions.target,
    orbitPreset: resolvedOptions.orbitPreset,
    availableOrbits: orbitOptions,
    type: resolvedOptions.type,
    availableTypes: typeOptions,
    hazard: normalizedHazard
  });
  const appliedHazard = res?.hazard || normalizedHazard;
  if (hazardSelect) {
    const hasApplied = Array.from(hazardSelect.options).some(opt => opt.value === appliedHazard);
    hazardSelect.value = hasApplied ? appliedHazard : 'none';
  }
  const seedKey = encodeSeedOptions(sStr, { ...resolvedOptions, hazard: appliedHazard });
  let archetype = res.archetype;
  const box = document.getElementById('rwg-result');
  if (!box) return;
  box.innerHTML = renderWorldDetail(res, seedKey, archetype);
  try {
    box.dataset.seedUsed = seedKey;
    if (res?.seedString) box.dataset.canonicalSeed = res.seedString;
  } catch(_){}
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
      overlay.style.zIndex = 3;

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
        try { if (newRes?.seedString) equilibratedWorlds.add(newRes.seedString); } catch(_){}
        equilibratedWorlds.add(sStr);
        box.innerHTML = renderWorldDetail(newRes, sStr, archetype);
        try {
          box.dataset.seedUsed = sStr;
          if (newRes?.seedString) box.dataset.canonicalSeed = newRes.seedString;
        } catch(_){}
        attachEquilibrateHandler(newRes, sStr, archetype, box);
        attachTravelHandler(newRes, sStr);
      } catch (e) {
        if (e?.message === 'timeout') {
          try { if (res?.seedString) equilibratedWorlds.add(res.seedString); } catch(_){}
          equilibratedWorlds.add(sStr);
          box.innerHTML = renderWorldDetail(res, sStr, archetype);
          try {
            box.dataset.seedUsed = sStr;
            if (res?.seedString) box.dataset.canonicalSeed = res.seedString;
          } catch(_){}
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
  const gWarn = createGravityWarning(c.gravity, fmt);
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
  const ug = r.underground || {};
  const geoMax = ug.geothermal?.maxDeposits ?? 0;
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

  const sm = typeof spaceManager !== 'undefined' ? spaceManager : globalThis.spaceManager;
  const eqDone = seedUsed
    && (equilibratedWorlds.has(seedUsed) || (res.seedString ? equilibratedWorlds.has(res.seedString) : false));
  const alreadyTerraformed = (res.seedString && sm?.isSeedTerraformed)
    ? sm.isSeedTerraformed(res.seedString)
    : (seedUsed && sm?.isSeedTerraformed ? sm.isSeedTerraformed(seedUsed) : false);
  const lockedByStory = sm?.isRandomTravelLocked ? sm.isRandomTravelLocked() : false;
  const travelDisabled = lockedByStory || alreadyTerraformed || !eqDone;
  const showTemps = !seedUsed || eqDone;
  const meanTVal = (showTemps && temps)
    ? `${fmt(Math.round(toDisplayTemp(temps.mean)))} ${tempUnit}`
    : '—';
  const dayTVal = (showTemps && temps)
    ? `${fmt(Math.round(toDisplayTemp(temps.day)))} ${tempUnit}`
    : '—';
  const nightTVal = (showTemps && temps)
    ? `${fmt(Math.round(toDisplayTemp(temps.night)))} ${tempUnit}`
    : '—';
  const galaxy = globalThis?.galaxyManager;
  const galaxyEnabled = Boolean(galaxy?.enabled);
  const sectorChip = (galaxyEnabled && c.sector)
    ? `<div class="rwg-chip"><div class="label">Sector</div><div class="value">${c.sector}</div></div>`
    : '';
  const featureBlock = renderFeatureBlock(res);
  const warningMsg = lockedByStory
    ? 'You must complete the story for the current world first'
    : (alreadyTerraformed
      ? 'This world has already been terraformed.'
      : (!eqDone ? 'Press Equilibrate at least once before traveling.' : ''));
  const gWarn = createGravityWarning(c.gravity, fmt, { includeFlavor: true });
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
        <div class="rwg-chip"><div class="label">Magnetosphere</div><div class="value">${c.hasNaturalMagnetosphere ? 'Yes' : 'No'}</div></div>
        <div class="rwg-chip"><div class="label">Geo (max)</div><div class="value">${geoMax > 0 ? fmt(geoMax) : '—'}</div></div>
        <div class="rwg-chip"><div class="label">Type</div><div class="value">${forcedType && forcedType !== 'auto' ? forcedType : (cls?.archetype || '—')}</div></div>
        <div class="rwg-chip"><div class="label">Teq</div><div class="value">${teqDisplay ? fmt(toDisplayTemp(teqDisplay)) + ' ' + tempUnit : '—'}</div></div>
        <div class="rwg-chip"><div class="label">Mean T</div><div class="value">${meanTVal}</div></div>
        <div class="rwg-chip"><div class="label">Day T</div><div class="value">${dayTVal}</div></div>
        <div class="rwg-chip"><div class="label">Night T</div><div class="value">${nightTVal}</div></div>
        ${sectorChip}
      </div>
      <div class="rwg-columns" style="margin-top:10px;">
        <div>
          <h4>Atmosphere</h4>
          ${renderAtmoTable(res)}
        </div>
        <div>
          <h4>Surface</h4>
          ${renderResourceRow('Land (ha)', surf.land)}
          ${renderResourceRow('Ice', surf.ice)}
          ${renderResourceRow('Water', surf.liquidWater)}
          ${renderResourceRow('Dry Ice', surf.dryIce)}
          ${renderResourceRow('Liquid CH₄', surf.liquidMethane)}
          ${renderResourceRow('CH₄ Ice', surf.hydrocarbonIce)}
        </div>
        ${featureBlock}
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

function renderResourceRow(label, resource) {
  const amount = resource?.initialValue;
  if (resource?.hideWhenSmall && Math.abs(amount ?? 0) < 1e-4) return '';
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const v = (amount === undefined || amount === null) ? '—' : fmt(amount);
  return `<div class="rwg-row"><span>${label}</span><span>${v}</span></div>`;
}

function renderFeatureBlock(res) {
  const hazards = res.override?.hazards || res.merged?.hazards;
  if (!hazards) return '';
  const rows = [];
  if (hazards.hazardousBiomass) {
    const resource = res.override?.resources?.surface?.hazardousBiomass
      || res.merged?.resources?.surface?.hazardousBiomass;
    if (resource && Number.isFinite(resource.initialValue) && resource.initialValue > 0) {
      rows.push(renderResourceRow('Hazardous Biomass', resource));
    }
  }
  if (!rows.length) return '';
  return `<div><h4>Features</h4>${rows.join('')}</div>`;
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
    { label: 'CH₄', key: 'atmosphericMethane' },
    { label: 'H₂', key: 'hydrogen' },
    { label: 'H₂SO₄', key: 'sulfuricAcid' }
  ];
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const defaults = globalThis.defaultPlanetParameters?.resources?.atmospheric || {};
  const cells = rows.map(r => {
    const resource = res.merged?.resources?.atmospheric?.[r.key];
    const amt = resource?.initialValue;
    const hideSmall = resource?.hideWhenSmall ?? defaults[r.key]?.hideWhenSmall;
    if (hideSmall && Math.abs(amt ?? 0) < 1e-4) return '';
    const amtText = (amt === undefined || amt === null) ? '—' : fmt(amt);
    const kPa = estimateGasPressure(res, r.key);
    const pText = (typeof kPa === 'number' && isFinite(kPa)) ? `${formatNumber(kPa)}Pa` : '—';
    return `<div class="rwg-row"><span>${r.label}</span><span>${amtText}</span><span>${pText}</span></div>`;
  }).filter(Boolean).join('');
  // Header row
  const header = `<div class="rwg-row"><span><strong>Gas</strong></span><span><strong>Amount</strong></span><span><strong>Pressure</strong></span></div>`;
  return `<div class="rwg-atmo-table">${header}${cells}</div>`;
}

function renderHistory() {
  const sm = typeof spaceManager !== 'undefined' ? spaceManager : globalThis.spaceManager;
  if (!sm || !historyListEl) return;
  const currentSeed = String(sm.currentRandomSeed ?? '');
  const entries = Object.entries(sm.randomWorldStatuses || {})
    .filter(([, st]) => st?.visited)
    .map(([seed, st]) => ({
      name: st.name || `Seed ${seed}`,
      // Prefer top-level archetype from RWG result; fall back to any embedded classification
      type: (st.original?.archetype
            || st.original?.classification?.archetype
            || st.original?.merged?.classification?.archetype
           ) || '—',
      seed,
      colonists: typeof st.colonists === 'number' ? st.colonists : 0,
      state: (String(sm.currentRandomSeed ?? '') === String(seed))
        ? 'Current'
        : (st.terraformed ? 'Terraformed' : 'Abandoned'),
      departedAt: st.departedAt || 0
    }))
    .sort((a, b) => {
      const aCur = a.seed === currentSeed;
      const bCur = b.seed === currentSeed;
      if (aCur && !bCur) return -1;
      if (bCur && !aCur) return 1;
      return b.departedAt - a.departedAt;
    });
  const newState = JSON.stringify(entries);
  if (newState === lastHistoryState) return;
  lastHistoryState = newState;
  historyData = entries;
  // Hide the entire history container if no visited worlds
  if (historyContainerEl) {
    historyContainerEl.style.display = entries.length ? '' : 'none';
  }
  historyPage = Math.min(historyPage, Math.max(Math.ceil(historyData.length / 10) - 1, 0));
  renderHistoryPage();
}

function renderHistoryPage() {
  if (!historyListEl) return;
  const start = historyPage * 10;
  const slice = historyData.slice(start, start + 10);
  const fmt = typeof formatNumber === 'function' ? formatNumber : (n => n);
  const header = `<div class="rwg-history-head"><span>Name</span><span>Type</span><span>Seed</span><span>Population</span><span>State</span><span>Departed</span></div>`;
  const rows = slice.map(r => {
    const d = r.departedAt ? new Date(r.departedAt).toLocaleString() : '—';
    const pop = fmt(r.colonists || 0);
    const stateCls = r.state === 'Current' ? 'state-current' : '';
    return `<div class="rwg-history-row"><span class="name" title="${r.name}">${r.name}</span><span>${r.type}</span><span class="seed" title="${r.seed}">${r.seed}</span><span class="pop">${pop}</span><span class="${stateCls}">${r.state}</span><span>${d}</span></div>`;
  }).join('');
  historyListEl.innerHTML = header + rows;
  const totalPages = Math.max(Math.ceil(historyData.length / 10), 1);
  historyPageEl.textContent = `${historyData.length ? historyPage + 1 : 0}/${totalPages}`;
  historyPrevBtn.disabled = historyPage === 0;
  historyNextBtn.disabled = historyPage >= totalPages - 1;
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

