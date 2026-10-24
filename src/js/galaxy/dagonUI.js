function revealDagonOnGalaxyMap() {
  tabManager.activateTab('space');
  spaceSubtabManager.activate('space-galaxy');
  document.getElementById('space-galaxy').scrollTop = 0;
  const cache = galaxyUICache;
  const hex = cache.hexLookup.get(galaxyInvasionManager.dagon.centralSectorKey);
  const state = cache.mapState;
  state.userInteracted = true;
  state.deferredCenter = false;
  state.offsetX = cache.mapCanvas.clientWidth / 2 - hex.galaxyCenterX * state.scale;
  state.offsetY = cache.mapCanvas.clientHeight / 2 - hex.galaxyCenterY * state.scale;
  updateGalaxyMapTransform(cache);
}

function createDagonUI(section) {
  section.section.className = 'project-card dagon-section';
  section.header.className = 'card-header';
  section.arrow.className = 'collapse-arrow';
  section.title.className = 'card-title';
  section.body.className = 'card-body';
  section.body.innerHTML = `
    <p class="dagon-teaser project-description" data-text="coming"></p>
    <div class="dagon-arrival hidden">
      <ul class="dagon-requirements project-requirements-list"></ul>
      <p class="dagon-warning project-description hidden" data-text="warning"></p>
      <button type="button" class="dagon-start progress-button" data-text="here"></button>
    </div>
    <div class="dagon-campaign hidden">
      <p class="project-description" data-text="subtitle"></p>
      <p class="dagon-waiting project-description" data-text="waiting"></p>
      <div class="dagon-command">
        <div class="dagon-repair"><button type="button" class="progress-button" data-text="repair"></button><p class="project-cost"></p></div>
      </div>
      <button type="button" class="dagon-begin progress-button" data-text="beginBattle"></button>
      <div class="dagon-cutscene hidden"><div class="dagon-stage zeus-battle-canvas-wrap"><canvas width="1200" height="480"></canvas><span class="dagon-coordinate">R3-13</span><span class="dagon-frame"></span></div><div class="dagon-scene-actions"><button type="button" class="dagon-previous progress-button" data-text="previous"></button><button type="button" class="dagon-advance progress-button"></button></div></div>
      <p class="dagon-complete project-description hidden" data-text="complete"></p>
    </div>`;
  const root = section.body;
  const ui = {
    section, root, arrival: root.querySelector('.dagon-arrival'), campaign: root.querySelector('.dagon-campaign'),
    teaser: root.querySelector('.dagon-teaser'), start: root.querySelector('.dagon-start'),
    warning: root.querySelector('.dagon-warning'),
    repair: root.querySelector('.dagon-repair'), repairButton: root.querySelector('.dagon-repair button'), repairCost: root.querySelector('.dagon-repair p'),
    waiting: root.querySelector('.dagon-waiting'), begin: root.querySelector('.dagon-begin'), complete: root.querySelector('.dagon-complete'),
    requirements: new Map(), texts: Array.from(root.querySelectorAll('[data-text]'))
  };
  for (const key of ['story', 'galaxy', 'world', 'materials', 'training']) {
    const row = document.createElement('li');
    const label = document.createElement('span');
    row.appendChild(label);
    if (key === 'story') {
      ui.skipStory = document.createElement('button');
      ui.skipStory.type = 'button';
      ui.skipStory.className = 'dagon-skip-story progress-button hidden';
      ui.skipStory.dataset.text = 'skipStory';
      row.appendChild(ui.skipStory);
      ui.texts.push(ui.skipStory);
      ui.skipStory.addEventListener('click', () => {
        if (gameCompleted || window.popupActive) return;
        createSystemChoicePopup('', t('ui.space.invasion.dagon.skipStoryConfirm'),
          t('ui.space.invasion.dagon.yes'), t('ui.space.invasion.dagon.no'), () => {
            gameCompleted = true;
            updateDagonUI(ui);
          });
      });
    }
    root.querySelector('.dagon-requirements').appendChild(row);
    ui.requirements.set(key, { row, label });
  }
  ui.start.addEventListener('click', () => { galaxyInvasionManager.dagon.start(); updateGalacticInvasionUI({ force: true }); });
  ui.repairButton.addEventListener('click', () => { galaxyInvasionManager.dagon.repairPrometheus(); updateDagonUI(ui); });
  ui.cutscene = new DagonCutscene(root.querySelector('.dagon-cutscene'));
  ui.begin.addEventListener('click', () => { galaxyInvasionManager.dagon.advanceScene(); updateDagonUI(ui); });
  return ui;
}

function updateDagonUI(ui) {
  const state = galaxyInvasionManager.dagon;
  const text = {};
  for (const element of ui.texts) {
    const value = t(`ui.space.invasion.dagon.${element.dataset.text}`);
    if (element.textContent !== value) element.textContent = value;
  }
  const title = t(state.started ? 'ui.space.invasion.dagon.title' : 'ui.space.invasion.mysteryTitle');
  if (ui.section.title.textContent !== title) ui.section.title.textContent = title;
  ui.teaser.classList.toggle('hidden', state.started);
  ui.arrival.classList.toggle('hidden', !state.enabled || state.started);
  ui.campaign.classList.toggle('hidden', !state.started);
  if (!state.started) {
    const requirements = state.getRequirements();
    for (const [key, { row, label }] of ui.requirements) {
      const value = t(`ui.space.invasion.dagon.requirements.${key}`);
      if (label.textContent !== value) label.textContent = value;
      row.classList.add('project-requirements-item');
      row.classList.toggle('is-unmet', !requirements[key]);
    }
    ui.skipStory.classList.toggle('hidden', requirements.story);
    const canStart = state.enabled && Object.values(requirements).every(Boolean);
    ui.start.classList.toggle('hidden', !canStart);
    ui.warning.classList.toggle('hidden', !canStart);
    return;
  }
  const ready = storyManager.completedEventIds.has('chapterA.4');
  const repairReady = storyManager.completedEventIds.has('chapterA.1');
  ui.repair.classList.toggle('hidden', state.prometheusRepaired || !repairReady || state.completed);
  text.repairCost = t('ui.space.invasion.dagon.repairCost', { electronics: resources.colony.electronics.displayName, superalloys: resources.colony.superalloys.displayName });
  ui.begin.classList.toggle('hidden', !ready || state.scene >= 0 || state.completed);
  ui.waiting.classList.toggle('hidden', ready || state.completed);
  ui.complete.classList.toggle('hidden', !state.completed);
  for (const [key, value] of Object.entries(text)) if (ui[key].textContent !== value) ui[key].textContent = value;
  ui.cutscene.sync(state);
}

function createDagonMapMarker(hex) {
  const root = document.createElement('div');
  root.className = 'dagon-map-marker hidden';
  root.setAttribute('role', 'img');
  root.style.left = `${hex.galaxyCenterX}px`;
  root.style.top = `${hex.galaxyCenterY}px`;
  root.innerHTML = createDagonEyeMarkup('dagon-map');
  return { root };
}

function createDagonEyeMarkup(id, tentacleLength = 1) {
  const tendrils = Array.from({ length: 18 }, (_, i) => {
    const angle = i * Math.PI * 2 / 18;
    const x = 100 + Math.cos(angle) * 35, y = 96 + Math.sin(angle) * 40;
    const path = `M${x} ${y} C${x + Math.cos(angle) * 27 * tentacleLength} ${y + Math.sin(angle) * 21 * tentacleLength}, ${x + Math.cos(angle + .5) * 51 * tentacleLength} ${y + Math.sin(angle) * 36 * tentacleLength}, ${x + Math.cos(angle) * 60 * tentacleLength} ${y + Math.sin(angle) * 51 * tentacleLength}`;
    return `<path d="${path}" stroke="${i % 3 === 0 ? '#8a1639' : '#42132d'}" stroke-width="${4.5 - (i % 5) * .6}"/><path d="${path}" stroke="#e25a6355" stroke-width=".4"/>`;
  }).join('');
  const orbits = Array.from({ length: 5 }, (_, i) =>
    `<ellipse cx="97" cy="95" rx="31.5" ry="13.8" transform="rotate(${(i + 1) * 36} 97 95)" stroke="${i % 2 ? '#b94c5b88' : '#501b4788'}"/>`).join('');
  return `<svg viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <radialGradient id="${id}-aura"><stop stop-color="#ad092d" stop-opacity=".4"/><stop offset="1" stop-color="#440916" stop-opacity="0"/></radialGradient>
      <radialGradient id="${id}-body" cx="47%" cy="48%"><stop stop-color="#05040b"/><stop offset=".75" stop-color="#170a20"/><stop offset="1" stop-color="#831b3d"/></radialGradient>
    </defs>
    <ellipse class="dagon-map-aura" cx="100" cy="96" rx="95" ry="95" fill="url(#${id}-aura)"/>
    <g class="dagon-map-tendrils" fill="none" stroke-linecap="round">${tendrils}</g>
    <ellipse cx="100" cy="96" rx="42" ry="48" transform="rotate(-7 100 96)" fill="url(#${id}-body)" stroke="#a13a50" stroke-width=".8"/>
    <g fill="none" stroke-width=".6">${orbits}</g>
    <g class="dagon-map-gaze">
      <ellipse class="dagon-map-glint" cx="90" cy="95" rx="8" ry="1.8" transform="rotate(-7 90 95)" fill="#ff5969"/>
    </g>
  </svg>`;
}

function createDagonTentacleMap(hexes, width, height) {
  const root = document.createElement('div');
  root.className = 'dagon-map-arms hidden';
  root.setAttribute('aria-hidden', 'true');
  const lookup = new Map(hexes.map(hex => [hex.galaxyKey, hex]));
  const groups = galaxyInvasionManager.dagon.tentacles.map((tentacle, armIndex) => {
    const route = tentacle.keys.map(key => lookup.get(key));
    const points = [];
    for (let segment = 0; segment < route.length - 1; segment += 1) {
      const a = route[Math.max(0, segment - 1)], b = route[segment];
      const c = route[segment + 1], d = route[Math.min(route.length - 1, segment + 2)];
      for (let step = 0; step < 24; step += 1) {
        const t = step / 24;
        const point = {};
        for (const [axis, property] of [['x', 'galaxyCenterX'], ['y', 'galaxyCenterY']]) {
          point[axis] = .5 * (2 * b[property] + (-a[property] + c[property]) * t
            + (2 * a[property] - 5 * b[property] + 4 * c[property] - d[property]) * t * t
            + (-a[property] + 3 * b[property] - 3 * c[property] + d[property]) * t * t * t);
        }
        points.push(point);
      }
    }
    const tip = route[route.length - 1];
    points.push({ x: tip.galaxyCenterX, y: tip.galaxyCenterY });
    const left = [], right = [], filaments = [[], [], []], wisps = [];
    points.forEach((point, i) => {
      const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
      const angle = Math.atan2(after.y - before.y, after.x - before.x);
      const nx = -Math.sin(angle), ny = Math.cos(angle), progress = i / (points.length - 1);
      const radius = .5 + 13 * Math.pow(1 - progress, .75);
      const ripple = Math.sin(i * .23 + armIndex) * 3 * Math.sin(progress * Math.PI);
      const x = point.x + nx * ripple, y = point.y + ny * ripple;
      const fringe = radius * (1 + .2 * Math.sin(i * .53 + armIndex));
      left.push(`${x + nx * fringe},${y + ny * fringe}`);
      right.push(`${x - nx * radius},${y - ny * radius}`);
      filaments.forEach((line, strand) => {
        const displacement = Math.sin(i * .12 + strand * 2.1 + armIndex) * radius * .65;
        line.push(`${x + nx * displacement},${y + ny * displacement}`);
      });
      if (i % 12 === 0 && progress > .08 && progress < .92) {
        const side = i % 24 === 0 ? 1 : -1;
        const reach = radius * (1.8 + .6 * Math.sin(i));
        const tx = Math.cos(angle), ty = Math.sin(angle);
        wisps.push(`<path d="M${x} ${y} C${x + nx * reach * side - tx * 12} ${y + ny * reach * side - ty * 12}, ${x + nx * reach * side + tx * 10} ${y + ny * reach * side + ty * 10}, ${x + nx * reach * side * .7 + tx * 24} ${y + ny * reach * side * .7 + ty * 24}" fill="none" stroke="#b8b3ed" stroke-width=".7" opacity=".35"/>`);
      }
    });
    return `<g data-arm="${tentacle.id}">
      <path d="M${left.join(' L')} L${right.slice().reverse().join(' L')} Z" fill="#9982d6" opacity=".25" filter="url(#dagon-arm-mist)"/>
      <path d="M${left.join(' L')} L${right.reverse().join(' L')} Z" fill="url(#dagon-arm-spectral)"/>
      <g class="dagon-arm-filaments" fill="none" stroke-linecap="round">
        ${filaments.map((line, index) => `<path d="M${line.join(' L')}" stroke="${['#c6c1f5', '#9be0d9', '#9574c7'][index]}" stroke-width="${[1.2, .65, 2][index]}" opacity="${[.7, .5, .4][index]}"/>`).join('')}
        ${wisps.join('')}
      </g>
    </g>`;
  });
  root.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="dagon-arm-spectral" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#20132f" stop-opacity=".7"/><stop offset=".45" stop-color="#8470ba" stop-opacity=".3"/><stop offset="1" stop-color="#9ecbcf" stop-opacity=".08"/></linearGradient>
      <filter id="dagon-arm-mist" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    ${groups.join('')}
  </svg>`;
  return { root, arms: new Map(Array.from(root.querySelectorAll('[data-arm]'), arm => [arm.dataset.arm, arm])) };
}

function createDagonAbilityEffects(width, height) {
  const root = document.createElement('div');
  root.className = 'dagon-map-ability-effects hidden';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <filter id="dagon-laser-blur" filterUnits="userSpaceOnUse" x="-80" y="-80" width="${Math.hypot(width, height) + 160}" height="160"><feGaussianBlur stdDeviation="7"/></filter>
      <radialGradient id="dagon-laser-flare"><stop stop-color="#efffff" stop-opacity=".95"/><stop offset=".25" stop-color="#b7b9ff" stop-opacity=".75"/><stop offset="1" stop-color="#7e51d1" stop-opacity="0"/></radialGradient>
    </defs>
    <g class="dagon-laser-beam" stroke-linecap="round">
      <g class="dagon-laser-discharge">
      <line stroke="#b3a0ff" stroke-width="56" opacity=".45" filter="url(#dagon-laser-blur)"/>
      <line stroke="#9579ec" stroke-width="27" opacity=".65"/>
      <line class="dagon-laser-core" stroke="#deffff" stroke-width="10"/>
      <path class="dagon-laser-filament" fill="none" stroke="#b6fff4" stroke-width="2"/>
      <path class="dagon-laser-filament" fill="none" stroke="#e9d9ff" stroke-width="1.5"/>
      <circle r="38" fill="url(#dagon-laser-flare)"/>
      <g class="dagon-laser-impact">
        <circle r="72" fill="url(#dagon-laser-flare)"/>
        <circle class="dagon-laser-ring" r="40" fill="none" stroke="#c6fff2" stroke-width="2"/>
        <circle r="52" fill="none" stroke="#bd9cff" stroke-width="1" stroke-dasharray="3 9"/>
        <path d="M-62 0H62M0 -62V62M-42 -42L42 42M-42 42L42 -42" stroke="#d8e4ff" stroke-width="1" opacity=".7"/>
      </g>
      </g>
      <g class="dagon-laser-charge">
        <line stroke="#ddbcff" stroke-width="1.5" stroke-dasharray="5 10" opacity=".65"/>
        <circle class="dagon-laser-source" r="42" fill="url(#dagon-laser-flare)"/>
        <g class="dagon-laser-target" fill="none" stroke="currentColor">
          <circle r="27" stroke-width="1" opacity=".4"/>
          <circle class="dagon-laser-countdown-ring" r="27" pathLength="1" stroke-dasharray="1" stroke-width="2" transform="rotate(-90)"/>
          <path d="M-30 -8V-15Q-30 -22 -23 -22H-17M17 -22H23Q30 -22 30 -15V-8M30 8V15Q30 22 23 22H17M-17 22H-23Q-30 22 -30 15V8" stroke-width="1.5"/>
          <text class="dagon-laser-countdown" y="22" text-anchor="middle" stroke="none" fill="currentColor"></text>
        </g>
      </g>
    </g>
  </svg>`;
  return { root, targetKey: null, beam: root.querySelector('.dagon-laser-beam'),
    lines: Array.from(root.querySelectorAll('line')), filaments: Array.from(root.querySelectorAll('.dagon-laser-filament')),
    impact: root.querySelector('.dagon-laser-impact'), target: root.querySelector('.dagon-laser-target'),
    countdown: root.querySelector('.dagon-laser-countdown'), ring: root.querySelector('.dagon-laser-countdown-ring'),
    source: root.querySelector('.dagon-laser-source') };
}

function updateDagonAbilityEffects(cache) {
  const state = galaxyInvasionManager.dagon;
  const pulsing = state.active && state.pulseRemainingMs > 0;
  cache.dagonTentacles.root.classList.toggle('is-pulsing', pulsing);
  const neighbors = pulsing ? state.getPulseSectorKeys() : new Set();
  for (const hex of cache.hexElements) {
    const threatened = neighbors.has(hex.galaxyKey) && !(state.protection[hex.galaxyKey] > 0)
      && galaxyManager.sectors.get(hex.galaxyKey).getControlValue('dagon') < 1 - FULL_CONTROL_EPSILON;
    if (hex.classList.contains('is-dagon-pulse-target') !== threatened) hex.classList.toggle('is-dagon-pulse-target', threatened);
  }
  const effects = cache.dagonAbilityEffects;
  const charging = state.active && state.laserChargeRemainingMs > 0 && state.laserTargetKey !== null;
  const firing = state.active && state.laserRemainingMs > 0 && state.laserTargetKey !== null;
  effects.root.classList.toggle('hidden', !charging && !firing);
  if (!charging && !firing) return;
  effects.root.classList.toggle('is-charging', charging);
  effects.root.classList.toggle('is-blocked', state.protection[state.laserTargetKey] > 0);
  if (effects.targetKey !== state.laserTargetKey) {
    effects.targetKey = state.laserTargetKey;
    const origin = cache.hexLookup.get(state.centralSectorKey), target = cache.hexLookup.get(state.laserTargetKey);
    const dx = target.galaxyCenterX - origin.galaxyCenterX, dy = target.galaxyCenterY - origin.galaxyCenterY;
    const length = Math.hypot(dx, dy);
    effects.beam.setAttribute('transform', `translate(${origin.galaxyCenterX} ${origin.galaxyCenterY}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`);
    for (const line of effects.lines) line.setAttribute('x2', length);
    effects.filaments.forEach((path, index) => {
      const bend = index ? -22 : 22;
      path.setAttribute('d', `M0 0 C${length * .2} ${bend}, ${length * .3} ${-bend}, ${length * .5} 0 S${length * .8} ${bend}, ${length} 0`);
    });
    effects.impact.setAttribute('transform', `translate(${length} 0)`);
    effects.target.setAttribute('transform', `translate(${length} 0) rotate(${-Math.atan2(dy, dx) * 180 / Math.PI})`);
  }
  if (charging) {
    const progress = 1 - state.laserChargeRemainingMs / terraformingParameters.gameplay.dagon.laserChargeDurationMs;
    const countdown = formatDuration(Math.ceil(state.laserChargeRemainingMs / 1000));
    if (effects.countdown.textContent !== countdown) effects.countdown.textContent = countdown;
    const offset = String(progress);
    if (effects.ring.style.strokeDashoffset !== offset) effects.ring.style.strokeDashoffset = offset;
    const scale = `scale(${.4 + progress * .6})`;
    if (effects.source.getAttribute('transform') !== scale) effects.source.setAttribute('transform', scale);
  }
  const opacity = charging ? '1' : String(Math.min(1, state.laserRemainingMs / terraformingParameters.gameplay.dagon.laserDurationMs * 3));
  if (effects.root.style.opacity !== opacity) effects.root.style.opacity = opacity;
}

function createDagonAbilitiesUI(container) {
  const root = document.createElement('div');
  root.className = 'dagon-abilities';
  const selection = document.createElement('p');
  selection.className = 'galaxy-sector-panel__subtitle';
  const status = document.createElement('p');
  root.append(selection, status);
  const ui = { root, selection, status, sectorKey: null, pools: new Map(), actions: new Map() };
  for (const [owner, abilities] of [['hope', ['protect', 'logistics']], ['prometheus', ['conquer', 'cut']]]) {
    const group = document.createElement('div');
    group.className = 'dagon-power-group';
    const title = document.createElement('strong');
    const power = document.createElement('p');
    const meter = document.createElement('progress');
    group.append(title, power, meter);
    for (const ability of abilities) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'galaxy-operations-launch__button';
      const description = document.createElement('p');
      button.addEventListener('click', () => {
        galaxyInvasionManager.dagon.useSectorAbility(ui.sectorKey, ability);
        updateGalaxyUI({ force: true });
      });
      group.append(button, description);
      ui.actions.set(ability, { button, description });
    }
    ui.pools.set(owner, { group, title, power, meter });
    root.appendChild(group);
  }
  container.appendChild(root);
  return ui;
}

function updateDagonAbilitiesUI(ui, sector) {
  const state = galaxyInvasionManager.dagon;
  const parameters = terraformingParameters.gameplay.dagon;
  ui.sectorKey = sector ? sector.key : null;
  const selection = sector ? t('ui.space.invasion.dagon.targetSector', { sector: sector.getDisplayName() })
    : t('ui.space.invasion.dagon.selectSector');
  if (ui.selection.textContent !== selection) ui.selection.textContent = selection;
  const status = [];
  if (state.blocksOffensiveOperation(ui.sectorKey)) status.push(t('ui.space.invasion.dagon.offensiveBlocked'));
  for (const [timers, label] of [[state.protection, 'protection'], [state.logistics, 'logisticsActive']]) {
    if (timers[ui.sectorKey] > 0) status.push(t(`ui.space.invasion.dagon.${label}`, { time: formatDuration(Math.ceil(timers[ui.sectorKey] / 1000)) }));
  }
  const statusText = status.join(' ');
  if (ui.status.textContent !== statusText) ui.status.textContent = statusText;
  ui.status.classList.toggle('hidden', !statusText);
  for (const [owner, pool] of ui.pools) {
    pool.group.classList.toggle('hidden', owner === 'prometheus' && !state.prometheusRepaired);
    const title = t(`ui.space.invasion.dagon.${owner}Power`);
    const power = t('ui.space.invasion.dagon.powerValue', { value: formatNumber(Math.floor(state[`${owner}Power`]), true), capacity: formatNumber(parameters.powerCapacity, true), rate: parameters.powerPerSecond });
    for (const [key, value] of Object.entries({ title, power })) if (pool[key].textContent !== value) pool[key].textContent = value;
    if (pool.meter.max !== parameters.powerCapacity) pool.meter.max = parameters.powerCapacity;
    if (pool.meter.value !== state[`${owner}Power`]) pool.meter.value = state[`${owner}Power`];
    if (pool.meter.getAttribute('aria-label') !== title) pool.meter.setAttribute('aria-label', title);
  }
  for (const [ability, { button, description }] of ui.actions) {
    const cost = ability === 'conquer' ? parameters.instantCaptureCost : ability === 'cut' ? parameters.prometheusAbilityCost
      : ability === 'protect' ? parameters.protectionCost : parameters.abilityCost;
    const label = t('ui.space.invasion.dagon.powerCost', {
      ability: t(`ui.space.invasion.dagon.${ability}`), cost: formatNumber(cost, true)
    });
    let text = t(`ui.space.invasion.dagon.${ability}Description`);
    if (ability === 'cut' && !state.tentaclesSevered) {
      const roots = new Set(state.tentacles.filter(arm => !state.severedTentacles.includes(arm.id)).map(arm => arm.keys[1]));
      text += ` ${t('ui.space.invasion.dagon.cutRoots', {
        sectors: [...roots].map(key => galaxyManager.sectors.get(key).getDisplayName()).join(', ')
      })}`;
    }
    if (button.textContent !== label) button.textContent = label;
    if (description.textContent !== text) description.textContent = text;
    button.disabled = !state.canUseSectorAbility(ui.sectorKey, ability);
  }
}

class DagonCutscene {
  constructor(root) {
    this.root = root;
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.frame = root.querySelector('.dagon-frame');
    this.previous = root.querySelector('.dagon-previous');
    this.advance = root.querySelector('.dagon-advance');
    this.index = -1;
    this.unlocked = -1;
    this.raf = 0;
    this.visible = false;
    this.elapsedSeconds = 0;
    this.exoticTimeOffset = 0;
    this.warpTimeOffset = 0;
    this.dagonShards = Array.from({ length: 72 }, (_, i) => ({
      angle: i * 2.399963,
      radius: 25 + ((i * .754878) % 1) * 115,
      speed: 65 + ((i * .618034) % 1) * 200,
      size: 12 + (i % 9) * 3,
      spin: Math.sin(i * 1.7) * 2,
      color: ['#ffc7a4', '#e75b87', '#b6eaff'][i % 3]
    }));
    this.warpParticles = Array.from({ length: 560 }, (_, i) => ({
      rift: i % 3,
      delay: (i * .618034) % 1,
      duration: 1.1 + ((i * .414214) % 1) * .7,
      targetY: 48 + ((i * .754878) % 1) * 384,
      bend: Math.sin(i * 2.4) * 28,
      size: 1 + (i % 4) * .45,
      trail: 10 + (i % 7) * 2,
      color: ['#ff486e', '#dc3466', '#ff94af', '#ffe0ed'][i % 4]
    }));
    this.exoticMatter = Array.from({ length: 2400 }, (_, i) => {
      const angle = i * 2.399963;
      const radius = Math.sqrt((i * .754877666 + .5) % 1);
      const edge = 1 + .09 * Math.sin(angle * 3);
      return {
        // Keep the shared cloud left of the warp split, including particle drift.
        x: 165 + Math.cos(angle) * radius * 135 * edge,
        y: 250 + Math.sin(angle) * radius * 185 * edge,
        delay: ((i * .569840291) % 1) * 2.3,
        phase: i * 1.618,
        size: .8 + (i % 7) * .25,
        color: ['#9beaff', '#d3b0ff', '#9fffd4', '#ffd9a6', '#f5b8ed', '#e1f4ff'][i % 6],
        exchange: i % 5 === 0 ? {
          delay: .8 + ((i * .413287) % 1) * 4.5,
          duration: 1.9 + ((i * .319713) % 1) * .7,
          impactX: 510 + ((i * .618034) % 1) * 155,
          impactY: 75 + ((i * .414214) % 1) * 330,
          originX: 780 + Math.cos(i * .73) * 30,
          originY: 240 + Math.sin(i * .73) * 110
        } : null
      };
    });
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.previous.addEventListener('click', () => { if (this.index > 0) this.showScene(this.index - 1); });
    this.advance.addEventListener('click', () => {
      const state = galaxyInvasionManager.dagon;
      if (this.index === state.scene && journalTyping) {
        skipJournalTyping();
        this.updateControls();
      } else if (this.index < state.scene) this.showScene(this.index + 1);
      else { state.advanceScene(); this.sync(state); }
    });
    this.observer = new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      if (this.visible) this.startAnimation();
      else { cancelAnimationFrame(this.raf); this.raf = 0; }
    });
    this.observer.observe(this.root);
    this.onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; }
      else this.startAnimation();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onJournalFinished = () => queueMicrotask(() => {
      if (this.root.isConnected && this.index >= 0) this.updateControls();
    });
    document.addEventListener('storyJournalFinishedTyping', this.onJournalFinished);
    this.motionQuery.addEventListener('change', this.onVisibility);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    document.removeEventListener('storyJournalFinishedTyping', this.onJournalFinished);
    this.motionQuery.removeEventListener('change', this.onVisibility);
  }

  sync(state) {
    this.root.classList.toggle('hidden', state.scene < 0);
    if (state.scene !== this.unlocked) {
      this.unlocked = state.scene;
      if (state.scene >= 0) this.showScene(state.scene);
    }
    if (this.index >= 0) {
      this.frame.textContent = t('ui.space.invasion.dagon.frame', { current: this.index + 1, total: DAGON_SCENES.length });
      this.updateControls();
    }
  }

  showScene(index) {
    this.exoticTimeOffset = index === 7 ? (this.index === 6 ? this.elapsedSeconds : 8) : 0;
    this.warpTimeOffset = index === 4 ? (this.index === 3 ? this.elapsedSeconds : 2)
      : index === 5 || index === 6 ? (this.index === index - 1 ? this.warpTimeOffset + this.elapsedSeconds : 2) : 0;
    this.index = index;
    this.elapsedSeconds = 0;
    this.frame.textContent = t('ui.space.invasion.dagon.frame', { current: index + 1, total: DAGON_SCENES.length });
    this.updateControls();
    this.draw(0);
    this.startAnimation();
  }

  updateControls() {
    this.previous.disabled = this.index <= 0;
    const state = galaxyInvasionManager.dagon;
    const key = this.index === state.scene && journalTyping ? 'ui.space.invasion.dagon.reveal'
      : this.index < state.scene ? 'ui.space.invasion.dagon.next'
      : `story.dagon.scenes.${DAGON_SCENES[this.index]}.action`;
    const label = t(key);
    if (this.advance.textContent !== label) this.advance.textContent = label;
    this.advance.disabled = state.completed && this.index === state.scene;
  }

  startAnimation() {
    if (this.raf || !this.visible || document.hidden || this.index < 0 || !this.root.isConnected) return;
    let last = performance.now();
    const animate = now => {
      this.raf = 0;
      if (!this.visible || document.hidden || !this.root.isConnected) return;
      const dt = Math.min(100, now - last);
      last = now;
      this.elapsedSeconds += dt / 1000;
      if (!this.motionQuery.matches) this.draw(this.elapsedSeconds);
      if (this.motionQuery.matches) return;
      this.raf = requestAnimationFrame(animate);
    };
    this.raf = requestAnimationFrame(animate);
  }

  draw(time) {
    const c = this.ctx, w = 1200, h = 480, scene = this.index;
    const reducedMotion = this.motionQuery.matches;
    const t0 = reducedMotion ? (scene >= 6 && scene <= 8 ? 8 : scene === 9 ? 3.1 : scene === 10 ? 3.6 : 2) : time;
    const exchangeTime = t0 + (scene === 7 ? this.exoticTimeOffset : 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#050711'; c.fillRect(0, 0, w, h);
    const glow = c.createRadialGradient(880, 230, 10, 800, 240, 440);
    glow.addColorStop(0, scene >= 10 || (scene === 9 && t0 > 3.2) ? '#152f42' : '#380c23'); glow.addColorStop(1, '#050711');
    c.fillStyle = glow; c.fillRect(0, 0, w, h);
    // Deterministic stars and warped coordinate grid; no per-frame DOM or random state.
    for (let i = 0; i < 145; i += 1) {
      const x = (i * 137.51) % w, y = (i * i * 17.31) % h;
      c.fillStyle = `rgba(190,210,255,${0.15 + (i % 4) * 0.12})`;
      c.fillRect(x, y, i % 9 === 0 ? 2 : 1, 1);
    }
    c.lineWidth = 1; c.strokeStyle = '#21334555';
    for (let y = 30; y < h; y += 35) {
      c.beginPath(); c.moveTo(0, y);
      c.bezierCurveTo(550, y, 720, y + Math.sin(y + t0 * 0.3) * 45, w, y); c.stroke();
    }
    const fade = scene >= 10 ? 0 : scene === 9 ? Math.max(0, 1 - Math.max(0, t0 - 2.2) / 1.6) : 1;
    c.save(); c.globalAlpha = fade;
    // Dagon occupies most of the battlefield; a dark body with many drifting limbs.
    for (let i = 0; i < 18; i += 1) {
      const angle = i * Math.PI * 2 / 18;
      const x = 860 + Math.cos(angle) * 116, y = 240 + Math.sin(angle) * 135;
      const wave = Math.sin(t0 * 0.6 + i) * 26;
      c.beginPath(); c.moveTo(x, y);
      c.bezierCurveTo(x + Math.cos(angle) * 90, y + Math.sin(angle) * 70 + wave,
        x + Math.cos(angle + 0.5) * 170, y + Math.sin(angle) * 120 - wave,
        x + Math.cos(angle) * 220, y + Math.sin(angle) * 170);
      c.lineWidth = 15 - (i % 5) * 2; c.strokeStyle = i % 3 === 0 ? '#8a1639' : '#42132d'; c.stroke();
      c.lineWidth = 1; c.strokeStyle = '#e25a6355'; c.stroke();
    }
    const body = c.createRadialGradient(850, 235, 20, 860, 240, 165);
    body.addColorStop(0, '#05040b'); body.addColorStop(0.75, '#170a20'); body.addColorStop(1, '#831b3d');
    c.fillStyle = body; c.strokeStyle = '#a13a50'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(860, 240, 140 + Math.sin(t0) * 3, 160, -0.12, 0, Math.PI * 2); c.fill(); c.stroke();
    c.save(); c.translate(850, 235);
    for (let i = 0; i < 5; i += 1) {
      c.rotate(0.63 + t0 * 0.006); c.strokeStyle = i % 2 ? '#b94c5b88' : '#501b4788';
      c.beginPath(); c.ellipse(0, 0, 105, 46, 0, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
    c.shadowBlur = 25; c.shadowColor = '#ff273d'; c.fillStyle = '#ff5969';
    c.beginPath(); c.ellipse(827, 236, scene >= 3 ? 27 : 17, 5, -0.12, 0, Math.PI * 2); c.fill();
    c.restore();
    if (scene >= 5 && scene <= 7) {
      const cloudTime = scene >= 6 ? 4 + exchangeTime : reducedMotion ? 4 : t0;
      c.save();
      c.save();
      c.translate(165, 250);
      c.scale(.7, 1);
      const cloudGlow = c.createRadialGradient(0, 0, 25, 0, 0, 210);
      cloudGlow.addColorStop(0, '#826bdd18');
      cloudGlow.addColorStop(.65, '#5fbde511');
      cloudGlow.addColorStop(1, '#5fbde500');
      c.globalAlpha = Math.min(1, cloudTime / 2);
      c.fillStyle = cloudGlow;
      c.fillRect(-210, -210, 420, 420);
      c.restore();
      // Materialize at Prometheus, then disperse into a cloud enclosing both AIs.
      for (const particle of this.exoticMatter) {
        // Each launched particle is replaced by a new one spreading from Prometheus.
        const replenishing = scene >= 6 && particle.exchange && exchangeTime >= particle.exchange.delay;
        const age = replenishing ? (exchangeTime - particle.exchange.delay) % 5.8 : cloudTime - particle.delay;
        if (age <= 0) continue;
        const progress = Math.min(1, age / 1.1);
        const spread = progress * progress * (3 - 2 * progress);
        const driftX = Math.sin(exchangeTime * .3 + particle.phase) * 4;
        const driftY = Math.cos(exchangeTime * .24 + particle.phase) * 4;
        const x = 260 + (particle.x - 260) * spread + driftX * spread;
        const y = 325 + (particle.y - 325) * spread + driftY * spread;
        c.globalAlpha = Math.min(1, age / .3) * (.5 + .25 * Math.sin(exchangeTime * 1.2 + particle.phase));
        c.fillStyle = particle.color;
        c.fillRect(x, y, particle.size, particle.size);
        if (particle.size > 2 && age < .65) {
          c.globalAlpha *= .45;
          c.fillRect(x - 3, y, 8, 1);
          c.fillRect(x, y - 3, 1, 8);
        }
      }
      c.restore();
    }
    if (scene === 6 || scene === 7) {
      c.save();
      c.lineWidth = 1;
      for (const particle of this.exoticMatter) {
        const exchange = particle.exchange;
        if (!exchange || exchangeTime < exchange.delay) continue;
        const age = (exchangeTime - exchange.delay) % 5.8;
        // Already-annihilated particles stay gone when Hope joins the exchange.
        const protectedParticle = scene === 7 && exchangeTime - age + exchange.duration >= this.exoticTimeOffset;
        if (age < exchange.duration || (protectedParticle && age < exchange.duration + 1.15)) {
          const progress = Math.min(1, age / exchange.duration);
          const onward = Math.max(0, (age - exchange.duration) / 1.15);
          const x = particle.x + (exchange.impactX - particle.x) * progress
            + (exchange.originX + 50 - exchange.impactX) * onward;
          const y = particle.y + (exchange.impactY - particle.y) * progress
            + (exchange.originY - exchange.impactY) * onward;
          c.globalAlpha = .8;
          c.fillStyle = particle.color;
          c.fillRect(x, y, particle.size + 1, particle.size + 1);
          c.globalAlpha = .25;
          c.strokeStyle = particle.color;
          c.beginPath();
          c.moveTo(x, y);
          const trail = Math.min(progress, .035);
          c.lineTo(x - (onward > 0 ? exchange.originX + 50 - exchange.impactX : exchange.impactX - particle.x) * trail,
            y - (onward > 0 ? exchange.originY - exchange.impactY : exchange.impactY - particle.y) * trail);
          c.stroke();
          if (protectedParticle) {
            const barrier = reducedMotion ? 1 : Math.min(1, t0 / .5);
            c.globalAlpha = barrier * .65;
            c.strokeStyle = '#83deff';
            c.beginPath();
            for (let side = 0; side <= 6; side++) {
              const angle = side * Math.PI / 3;
              const bx = x + 1 + Math.cos(angle) * 7;
              const by = y + 1 + Math.sin(angle) * 7;
              if (side === 0) c.moveTo(bx, by); else c.lineTo(bx, by);
            }
            c.stroke();
            // Brief threads show Hope placing the barriers on new projectiles.
            if (age < .3 && Math.floor(particle.phase) % 17 === 0) {
              c.globalAlpha = (.3 - age) * .7 * barrier;
              c.beginPath(); c.moveTo(200, 190); c.lineTo(x, y); c.stroke();
            }
          }
          // Dagon's counter reaches the barrier at the original interception time.
          if (age >= .4 && age < exchange.duration) {
            const counter = (age - .4) / (exchange.duration - .4);
            const counterX = exchange.originX + (exchange.impactX - exchange.originX) * counter;
            const counterY = exchange.originY + (exchange.impactY - exchange.originY) * counter;
            c.globalAlpha = .9;
            c.fillStyle = '#ff648e';
            c.fillRect(counterX, counterY, particle.size + 1, particle.size + 1);
            c.globalAlpha = .35;
            c.strokeStyle = '#fa385a';
            c.beginPath(); c.moveTo(counterX, counterY);
            const counterTrail = Math.max(0, counter - .05);
            c.lineTo(exchange.originX + (exchange.impactX - exchange.originX) * counterTrail,
              exchange.originY + (exchange.impactY - exchange.originY) * counterTrail);
            c.stroke();
          }
        }
        if (age >= exchange.duration && age < exchange.duration + .24) {
          const flash = (age - exchange.duration) / .24;
          c.globalAlpha = (1 - flash) * .8;
          c.fillStyle = protectedParticle ? '#83deff' : '#fff0e0';
          c.fillRect(exchange.impactX - 1, exchange.impactY - 1, 3, 3);
          c.strokeStyle = protectedParticle ? '#83deff' : particle.color;
          c.beginPath();
          c.arc(exchange.impactX, exchange.impactY, 1 + flash * 7, 0, Math.PI * 2);
          c.stroke();
          if (protectedParticle) {
            c.fillStyle = '#ff648e';
            c.fillRect(exchange.impactX + 3 + flash * 12, exchange.impactY - flash * 9, 2, 2);
            c.fillRect(exchange.impactX + 3 + flash * 9, exchange.impactY + flash * 12, 2, 2);
          }
        }
        // Some shielded particles scar Dagon once they survive the counter and arrive.
        const impactAge = age - exchange.duration - 1.15;
        if (protectedParticle && Math.floor(particle.phase) % 7 === 0 && impactAge >= 0 && impactAge < .8) {
          const impact = impactAge / .8;
          const x = exchange.originX + 50, y = exchange.originY;
          c.save();
          c.globalAlpha = (1 - impact) * .8;
          c.strokeStyle = '#d9c8ff'; c.lineWidth = 1;
          c.shadowColor = '#b895ff'; c.shadowBlur = 10;
          c.beginPath(); c.arc(x, y, 2 + impact * 15, 0, Math.PI * 2); c.stroke();
          for (let ray = 0; ray < 3; ray += 1) {
            const angle = particle.phase + ray * Math.PI * 2 / 3;
            c.beginPath(); c.moveTo(x, y);
            c.lineTo(x + Math.cos(angle + .3) * 11, y + Math.sin(angle + .3) * 11);
            c.lineTo(x + Math.cos(angle) * 24, y + Math.sin(angle) * 24); c.stroke();
          }
          c.restore();
        }
      }
      c.restore();
    }
    if (scene === 3 || scene === 4) this.drawWarpAssault(t0 + this.warpTimeOffset, scene === 4);
    if (scene === 5) this.drawWarpSplit(t0 + this.warpTimeOffset);
    if (scene === 6 && t0 < .65) {
      c.save();
      c.globalAlpha = 1 - t0 / .65;
      this.drawWarpSplit(t0 + this.warpTimeOffset);
      c.restore();
    }
    if (scene === 8) this.drawPrometheusCharge(t0);
    if (scene === 4 || scene === 8) {
      c.save();
      c.globalAlpha = Math.min(1, t0 / .65);
      this.drawWarpSplit(t0 + this.warpTimeOffset, scene === 4);
      c.restore();
    }
    if (scene === 9) this.drawPrometheusStrike(t0);
    if (scene === 10) this.drawHopeDeparture(t0);
    // Small, legible AI avatars in the same schematic style as the Zeus battle.
    for (const [x, y, color, name] of [[200, 190, '#83deff', 'hope'], [260, 325, '#ff886c', 'prometheus']]) {
      const departure = scene === 10 && name === 'hope' ? Math.min(1, Math.max(0, t0 - .75)) : 0;
      if (departure === 1) continue;
      c.save(); c.translate(x, y + Math.sin(t0 * 1.2) * 3);
      c.globalAlpha = 1 - departure;
      c.save();
      if (departure > 0) c.scale(1 - departure * departure, 1 + departure * .5);
      c.shadowColor = color; c.shadowBlur = 16; c.strokeStyle = color; c.fillStyle = '#101b2c'; c.lineWidth = 2;
      c.beginPath();
      if (name === 'hope') {
        c.ellipse(0, -1, 20, 23, 0, 0, Math.PI * 2);
      } else {
        c.moveTo(0, -30); c.lineTo(7, -15); c.lineTo(22, -23); c.lineTo(17, -6);
        c.lineTo(25, 0); c.lineTo(17, 9); c.lineTo(13, 22); c.lineTo(0, 18);
        c.lineTo(-13, 22); c.lineTo(-17, 9); c.lineTo(-25, 0); c.lineTo(-17, -6);
        c.lineTo(-22, -23); c.lineTo(-7, -15);
      }
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = color; c.fillRect(-8, -5, 5, 3); c.fillRect(3, -5, 5, 3);
      c.restore();
      c.fillStyle = color; c.shadowBlur = 0; c.font = '15px monospace'; c.textAlign = 'center'; c.fillText(t(`story.dagon.${name}`), 0, 45);
      c.restore();
    }
    c.font = '13px monospace'; c.textAlign = 'center'; c.fillStyle = '#e5a7b2';
    if (scene < 9) c.fillText(t('story.dagon.entity'), 860, 435);
    // Waves pass through; tachyons scar the field; the warp strike reflects off Hope.
    if (scene === 1) {
      c.strokeStyle = '#7ddcffaa'; c.lineWidth = 2;
      for (let i = 0; i < 7; i += 1) {
        const x = 220 + ((t0 * 190 + i * 130) % 1100);
        c.beginPath(); c.ellipse(x, 190, 12, 24 + i * 3, 0, -1.4, 1.4); c.stroke();
      }
    }
    if (scene === 2) {
      c.save(); c.shadowColor = '#b895ff'; c.shadowBlur = 10;
      // Stagger discrete, fast particles; each leaves only a short wake and a local impact scar.
      for (let i = 0; i < 20; i += 1) {
        const launched = t0 - i * .14;
        if (launched < 0) continue;
        const age = launched % 3;
        const duration = .55 + (i % 3) * .06;
        const targetX = 754 + (i % 4) * 14, targetY = 185 + (i * 37) % 115;
        if (age < duration) {
          const progress = age / duration;
          const x = 280 + (targetX - 280) * progress, y = 325 + (targetY - 325) * progress;
          const tail = Math.max(0, progress - .035);
          c.globalAlpha = .55; c.strokeStyle = '#bba5ff'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(280 + (targetX - 280) * tail, 325 + (targetY - 325) * tail);
          c.lineTo(x, y); c.stroke();
          c.globalAlpha = 1; c.fillStyle = '#f1f4ff';
          c.beginPath(); c.arc(x, y, 2.5 + (i % 2), 0, Math.PI * 2); c.fill();
        } else if (age < duration + .8) {
          const impact = (age - duration) / .8;
          c.globalAlpha = (1 - impact) * .8; c.strokeStyle = '#d9c8ff'; c.lineWidth = 1;
          c.beginPath(); c.arc(targetX, targetY, 2 + impact * 15, 0, Math.PI * 2); c.stroke();
          for (let ray = 0; ray < 3; ray += 1) {
            const angle = i + ray * Math.PI * 2 / 3;
            c.beginPath(); c.moveTo(targetX, targetY);
            c.lineTo(targetX + Math.cos(angle + .3) * 11, targetY + Math.sin(angle + .3) * 11);
            c.lineTo(targetX + Math.cos(angle) * 24, targetY + Math.sin(angle) * 24); c.stroke();
          }
        }
      }
      c.restore();
    }
  }

  drawHopeDeparture(time) {
    if (time >= 3.1) return;
    const c = this.ctx;
    const opening = Math.min(1, time / .6);
    const closing = Math.min(1, Math.max(0, (time - 1.75) / 1.35));
    const width = 34 * opening * (1 - closing), height = 54 * opening * (1 - closing * .6);
    c.save(); c.translate(200, 190 + Math.sin(time * 1.2) * 3);
    c.globalAlpha = opening * (1 - closing);
    const glow = c.createRadialGradient(0, 0, 5, 0, 0, 85);
    glow.addColorStop(0, '#d1faff88'); glow.addColorStop(.5, '#57cfff33'); glow.addColorStop(1, '#57cfff00');
    c.fillStyle = glow; c.fillRect(-85, -85, 170, 170);
    c.shadowColor = '#83deff'; c.shadowBlur = 16;
    c.fillStyle = '#061523'; c.strokeStyle = '#bbf3ff'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(0, 0, width, height, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.shadowBlur = 0; c.lineWidth = 1;
    for (let ring = 0; ring < 3; ring += 1) {
      c.strokeStyle = ring % 2 ? '#dafaffbb' : '#67caff88';
      c.beginPath(); c.ellipse(0, 0, width + ring * 5, height + ring * 4, Math.sin(time + ring) * .12,
        time * .8 + ring, time * .8 + ring + Math.PI * 1.4); c.stroke();
    }
    for (let i = 0; i < 44; i += 1) {
      const phase = (time * .65 + i * .618034) % 1;
      const angle = i * 2.399963 + time * .8;
      const radius = 15 + (1 - phase) * 60;
      c.globalAlpha = opening * (1 - closing) * Math.sin(phase * Math.PI);
      c.fillStyle = '#c7f4ff';
      c.fillRect(Math.cos(angle) * radius * .65, Math.sin(angle) * radius, 1.5, 1.5);
    }
    const glint = Math.max(0, 1 - Math.abs(time - 1.65) / .45);
    c.globalAlpha = glint; c.strokeStyle = '#efffff'; c.lineWidth = 3; c.shadowBlur = 14;
    c.beginPath(); c.moveTo(0, -48); c.lineTo(0, 48); c.stroke();
    c.restore();
  }

  drawPrometheusCharge(time) {
    const c = this.ctx, x = 115, y = 325;
    const charge = Math.min(1, time / 6);
    const radius = 8 + 72 * charge * charge * (3 - 2 * charge);
    c.save();
    // Keep the gathered matter behind HOPE's restored split.
    c.beginPath(); c.rect(12, 0, 314, 480); c.clip();
    const aura = c.createRadialGradient(x, y, radius * .4, x, y, radius * 2.3);
    aura.addColorStop(0, '#ffdb7155'); aura.addColorStop(.5, '#9dcfff20'); aura.addColorStop(1, '#9dcfff00');
    c.fillStyle = aura; c.fillRect(12, 0, 314, 480);
    // Reuse the exotic-matter cloud as inward-spiralling fuel, with no per-frame particle allocation.
    for (let i = 0; i < this.exoticMatter.length; i += 5) {
      const particle = this.exoticMatter[i];
      const progress = (time * .42 + particle.delay) % 1;
      const spread = 1 - progress;
      const angle = particle.phase + progress * 2.8;
      const px = x + Math.cos(angle) * (radius * .8 + spread * 170);
      const py = y + Math.sin(angle) * (radius * .8 + spread * 340);
      c.globalAlpha = Math.sin(progress * Math.PI) * .8;
      c.fillStyle = i % 3 ? '#ffe8a6' : '#c9f5ff';
      c.fillRect(px, py, particle.size, particle.size);
    }
    // Two arcing streams feed the growing sphere to Prometheus's left.
    c.globalAlpha = 1;
    for (let i = 0; i < 100; i += 1) {
      const progress = (time * .65 + i / 100) % 1;
      const side = i % 2 ? 1 : -1;
      const px = 235 + (x + radius * .65 - 235) * progress;
      const py = 325 + (y - 325) * progress + side * Math.sin(progress * Math.PI) * 48;
      c.fillStyle = i % 3 ? '#ffd68f' : '#fff5da';
      c.globalAlpha = .45 + progress * .5;
      c.beginPath(); c.arc(px, py, 1.2 + progress * 1.5, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    this.drawPrometheusSphere(x, y, radius, time);
    c.restore();
  }

  drawPrometheusSphere(x, y, radius, time) {
    const c = this.ctx;
    c.save();
    const core = c.createRadialGradient(x - radius * .2, y - radius * .2, 0, x, y, radius);
    core.addColorStop(0, '#ffffff'); core.addColorStop(.4, '#fff9dc');
    core.addColorStop(.76, '#ffe5a0'); core.addColorStop(.94, '#eda95b'); core.addColorStop(1, '#b3e8ff');
    c.fillStyle = core; c.shadowColor = '#ffe8ac'; c.shadowBlur = 22;
    c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
    c.save(); c.translate(x, y);
    for (let i = 0; i < 6; i += 1) {
      c.save(); c.rotate(i * Math.PI / 3 + time * .18);
      c.strokeStyle = i % 2 ? '#fffef0bb' : '#c4f4ff99'; c.lineWidth = 1.3;
      c.beginPath(); c.ellipse(0, 0, radius * 1.02, radius * .38, 0, .3, Math.PI * 1.8); c.stroke();
      c.restore();
    }
    c.restore();
    c.restore();
  }

  drawPrometheusStrike(time) {
    const c = this.ctx, impactTime = 2.2;
    c.save();
    if (time < impactTime) {
      // Open the split, then accelerate the fully charged sphere into Dagon.
      if (time < .65) {
        c.globalAlpha = 1 - time / .65;
        this.drawWarpSplit(time);
        c.globalAlpha = 1;
      }
      const launch = Math.max(0, (time - .45) / (impactTime - .45));
      const progress = launch * launch;
      const x = 115 + 745 * progress, y = 325 - 85 * progress * progress;
      const wake = c.createRadialGradient(x, y, 15, x, y, 170);
      wake.addColorStop(0, '#fff2b866'); wake.addColorStop(1, '#bdeaff00');
      c.fillStyle = wake; c.fillRect(x - 170, y - 170, 340, 340);
      for (let layer = 0; layer < 3; layer += 1) {
        const p = Math.max(0, progress - .45);
        const tailX = 115 + 745 * p, tailY = 325 - 85 * p * p;
        const width = 65 - layer * 20;
        const trail = c.createLinearGradient(tailX, tailY, x + 1, y);
        trail.addColorStop(0, '#ffe8a600'); trail.addColorStop(1, ['#ffcd7355', '#fff1ad88', '#e4f7ffbb'][layer]);
        c.fillStyle = trail; c.beginPath(); c.moveTo(tailX, tailY);
        c.bezierCurveTo(tailX + (x - tailX) * .5, tailY, x - 65, y - width, x, y - width);
        c.lineTo(x, y + width);
        c.bezierCurveTo(x - 65, y + width, tailX + (x - tailX) * .5, tailY, tailX, tailY);
        c.closePath(); c.fill();
      }
      this.drawPrometheusSphere(x, y, 80 + progress * 14, time + 8);
    } else {
      const age = time - impactTime;
      const light = Math.exp(-age * .8);
      const bloomRadius = 80 + 260 * (1 - Math.exp(-age * 3));
      const bloom = c.createRadialGradient(860, 240, 0, 860, 240, bloomRadius);
      bloom.addColorStop(0, '#fffef2'); bloom.addColorStop(.18, '#fff1b9dd');
      bloom.addColorStop(.48, '#ffc57866'); bloom.addColorStop(.75, '#93deff22'); bloom.addColorStop(1, '#93deff00');
      c.globalAlpha = light; c.fillStyle = bloom;
      c.fillRect(860 - bloomRadius, 240 - bloomRadius, bloomRadius * 2, bloomRadius * 2);
      // Staggered shock fronts expand beyond the frame instead of repeating a beam.
      for (let ring = 0; ring < 5; ring += 1) {
        const elapsed = age - ring * .16;
        if (elapsed < 0 || elapsed > 3) continue;
        const radius = 40 + elapsed * (230 + ring * 24);
        c.globalAlpha = (1 - elapsed / 3) * .8;
        c.strokeStyle = ring % 2 ? '#b6eaff' : '#fff0bc'; c.lineWidth = ring ? 2 : 5;
        c.beginPath(); c.ellipse(860, 240, radius, radius * (.55 + ring * .1), -.2, 0, Math.PI * 2); c.stroke();
      }
      // Bright faults cross the original body before its shattered shell peels away.
      if (age < 1.8) {
        c.globalAlpha = Math.min(1, age * 5) * (1 - age / 1.8);
        c.strokeStyle = '#fff1d0'; c.lineWidth = 2;
        for (let i = 0; i < 16; i += 1) {
          const angle = i * Math.PI / 8;
          c.beginPath(); c.moveTo(860, 240);
          for (let step = 1; step <= 4; step += 1) {
            const radius = step * 38;
            const turn = angle + Math.sin(i + step * 3) * .16;
            c.lineTo(860 + Math.cos(turn) * radius, 240 + Math.sin(turn) * radius);
          }
          c.stroke();
        }
      }
      for (const shard of this.dagonShards) {
        const distance = shard.radius + age * shard.speed;
        c.save();
        c.globalAlpha = Math.max(0, 1 - age / 4.5);
        c.translate(860 + Math.cos(shard.angle) * distance, 240 + Math.sin(shard.angle) * distance * .8);
        c.rotate(shard.angle + age * shard.spin);
        c.fillStyle = '#200b23'; c.strokeStyle = shard.color; c.lineWidth = 1.3;
        c.beginPath(); c.moveTo(-shard.size, -shard.size * .35);
        c.lineTo(shard.size * .8, -shard.size * .65); c.lineTo(shard.size * .35, shard.size * .6);
        c.lineTo(-shard.size * .4, shard.size * .25); c.closePath(); c.fill(); c.stroke();
        c.restore();
      }
      c.globalAlpha = Math.max(0, 1 - age / 6);
      for (let i = 0; i < this.exoticMatter.length; i += 4) {
        const particle = this.exoticMatter[i];
        const distance = 30 + age * (75 + particle.delay * 135);
        const x = 860 + Math.cos(particle.phase) * distance;
        const y = 240 + Math.sin(particle.phase) * distance * .8;
        c.strokeStyle = i % 3 ? '#ffd99f' : '#b9edff'; c.lineWidth = particle.size * .5;
        c.beginPath(); c.moveTo(x, y);
        c.lineTo(x - Math.cos(particle.phase) * 12, y - Math.sin(particle.phase) * 10); c.stroke();
      }
    }
    c.restore();
  }

  drawWarpAssault(time, deflected) {
    const c = this.ctx;
    const opening = Math.min(1, time / .6);
    c.save();
    const stormGlow = c.createRadialGradient(570, 240, 30, 530, 240, 390);
    stormGlow.addColorStop(0, '#e72b6038'); stormGlow.addColorStop(1, '#840a3000');
    c.fillStyle = stormGlow; c.fillRect(180, 0, 800, 480);
    // Dagon tears three jagged apertures through the warp, feeding them from its core.
    for (let rift = 0; rift < 3; rift += 1) {
      const x = 728 + rift * 18, y = 94 + rift * 146;
      c.globalAlpha = opening; c.shadowBlur = 18; c.shadowColor = '#ff285b';
      c.strokeStyle = '#ed466e'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(827, 236);
      c.bezierCurveTo(920, y, x + 65, y - 60, x, y); c.stroke();
      c.save(); c.translate(x, y); c.scale(opening, .9 + .06 * Math.sin(time * 2 + rift));
      c.fillStyle = '#080512'; c.strokeStyle = '#ff6a91'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, -82); c.lineTo(13, -46); c.lineTo(7, -29);
      c.lineTo(24, -9); c.lineTo(12, 14); c.lineTo(18, 42); c.lineTo(0, 82);
      c.lineTo(-11, 45); c.lineTo(-8, 25); c.lineTo(-20, 4); c.lineTo(-10, -27);
      c.lineTo(-17, -48); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#ffb1c7'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-3, -65); c.lineTo(-10, -34); c.lineTo(4, -6);
      c.lineTo(-7, 23); c.lineTo(0, 62); c.stroke();
      c.restore();
    }
    c.shadowBlur = 0; c.globalCompositeOperation = 'lighter';
    // Cached particles occupy a broad front; the split reflects their trajectories.
    for (const particle of this.warpParticles) {
      const elapsed = time / particle.duration - particle.delay;
      if (elapsed < 0) continue;
      const phase = elapsed % 1;
      const originX = 728 + particle.rift * 18, originY = 94 + particle.rift * 146;
      let x, y, dx, dy;
      const reflected = deflected && phase >= .63;
      if (reflected) {
        const progress = (phase - .63) / .37;
        dx = 420 + particle.delay * 150;
        dy = (particle.targetY < 240 ? -1 : 1) * (130 + particle.delay * 170);
        x = 364 + progress * dx; y = particle.targetY + progress * dy;
      } else {
        const progress = deflected ? phase / .63 : phase;
        dx = (deflected ? 364 : 225 + particle.delay * 70) - originX;
        dy = particle.targetY - originY;
        x = originX + progress * dx;
        y = originY + progress * dy + Math.sin(progress * Math.PI) * particle.bend;
      }
      const length = Math.hypot(dx, dy);
      c.globalAlpha = reflected ? .7 : Math.min(1, phase * 12) * (deflected ? .7 : Math.min(.8, (1 - phase) * 5));
      c.strokeStyle = reflected ? '#c4c7ff' : particle.color;
      c.lineWidth = particle.size * .65;
      c.beginPath(); c.moveTo(x - dx / length * particle.trail, y - dy / length * particle.trail);
      c.lineTo(x, y); c.stroke();
      c.fillStyle = reflected ? '#e4faff' : particle.color;
      c.fillRect(x - particle.size / 2, y - particle.size / 2, particle.size, particle.size);
    }
    c.restore();
  }

  drawWarpSplit(time, underAttack = false) {
    const c = this.ctx;
    c.save();
    const opacity = c.globalAlpha;
    // Two luminous banks surround an actual dark gap, splitting the entire attack front.
    const splitGlow = c.createLinearGradient(292, 0, 395, 0);
    splitGlow.addColorStop(0, '#6bdfff00'); splitGlow.addColorStop(.5, '#79dcff44'); splitGlow.addColorStop(1, '#6bdfff00');
    c.fillStyle = splitGlow; c.fillRect(292, 0, 103, 480);
    c.beginPath();
    for (let y = 0; y <= 480; y += 24) {
      const x = 332 + Math.sin(y * .067 + time * .4) * 8;
      if (y === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    for (let y = 480; y >= 0; y -= 24) c.lineTo(354 + Math.sin(y * .067 + time * .4) * 8, y);
    c.closePath(); c.fillStyle = '#02040d'; c.fill();
    c.shadowColor = '#66dfff'; c.shadowBlur = 16;
    for (let bank = 0; bank < 2; bank += 1) {
      c.beginPath();
      for (let y = 0; y <= 480; y += 24) {
        const x = 332 + bank * 22 + Math.sin(y * .067 + time * .4) * 8;
        if (y === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = bank ? '#d8fcff' : '#76cfff'; c.lineWidth = bank ? 3 : 2; c.stroke();
    }
    c.shadowBlur = 0;
    c.strokeStyle = '#8cddff88'; c.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      c.beginPath(); c.moveTo(220, 190);
      c.quadraticCurveTo(290, 190, 328, 80 + i * 155); c.stroke();
    }
    if (underAttack) for (let i = 0; i < 14; i += 1) {
      const pulse = (time * .85 + i * .618034) % 1;
      const y = 28 + (i * 73) % 425;
      c.globalAlpha = opacity * (1 - pulse) * .85; c.strokeStyle = '#d7fcff'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(365, y, 3 + pulse * 22, -Math.PI / 2, Math.PI / 2); c.stroke();
      c.fillStyle = '#eaffff'; c.fillRect(360, y - 2, 10 * (1 - pulse), 4);
    }
    c.restore();
  }
}
