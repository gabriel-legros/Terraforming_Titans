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
    root.querySelector('.dagon-requirements').appendChild(row);
    ui.requirements.set(key, row);
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
    for (const [key, element] of ui.requirements) {
      const value = t(`ui.space.invasion.dagon.requirements.${key}`);
      if (element.textContent !== value) element.textContent = value;
      element.classList.add('project-requirements-item');
      element.classList.toggle('is-unmet', !requirements[key]);
    }
    const canStart = state.enabled && Object.values(requirements).every(Boolean);
    ui.start.classList.toggle('hidden', !canStart);
    ui.warning.classList.toggle('hidden', !canStart);
    return;
  }
  const ready = storyManager.completedEventIds.has('chapterA.4');
  const repairReady = storyManager.completedEventIds.has('chapterA.1');
  ui.repair.classList.toggle('hidden', state.prometheusRepaired || !repairReady || state.completed);
  const storage = projectManager.projects.spaceStorage;
  ui.repairButton.disabled = storage.getStoredResourceValue('electronics') < 1e21 || storage.getStoredResourceValue('superalloys') < 1e21;
  text.repairCost = t('ui.space.invasion.dagon.repairCost', { electronics: resources.colony.electronics.displayName, superalloys: resources.colony.superalloys.displayName });
  ui.begin.classList.toggle('hidden', !ready || state.scene >= 0 || state.completed);
  ui.waiting.classList.toggle('hidden', ready || state.completed);
  ui.complete.classList.toggle('hidden', !state.completed);
  for (const [key, value] of Object.entries(text)) if (ui[key].textContent !== value) ui[key].textContent = value;
  ui.cutscene.sync(state);
}

function createDagonSectorUI(container) {
  const root = document.createElement('div');
  root.className = 'dagon-sector-actions hidden';
  root.innerHTML = `<div class="dagon-ability-heading"><span class="galaxy-sector-panel__subtitle"></span></div><p class="dagon-protection"></p><div class="dagon-actions"><button type="button" class="dagon-protect galaxy-operations-launch__button"></button><button type="button" class="dagon-conquer galaxy-operations-launch__button"></button></div><p class="dagon-cost"></p>`;
  const ui = { root, sectorKey: null, title: root.querySelector('.galaxy-sector-panel__subtitle'),
    protection: root.querySelector('.dagon-protection'), cost: root.querySelector('.dagon-cost'),
    protect: root.querySelector('.dagon-protect'), conquer: root.querySelector('.dagon-conquer') };
  ui.protect.addEventListener('click', () => {
    galaxyInvasionManager.dagon.useSectorAbility(ui.sectorKey);
    updateGalaxyUI({ force: true });
  });
  ui.conquer.addEventListener('click', () => {
    galaxyInvasionManager.dagon.useSectorAbility(ui.sectorKey, true);
    updateGalaxyUI({ force: true });
  });
  container.appendChild(root);
  return ui;
}

function updateDagonSectorUI(ui, sector) {
  const state = galaxyInvasionManager.dagon;
  ui.sectorKey = sector.key;
  ui.root.classList.toggle('hidden', !state.active);
  ui.protect.disabled = ui.conquer.disabled = !state.active;
  if (!state.active) return;
  const cost = state.getResearchCost();
  const cannotAfford = !(cost > 0) || resources.colony.advancedResearch.value < cost;
  const remaining = state.protection[sector.key] || 0;
  ui.protect.disabled = cannotAfford || remaining > 0 || sector.getControlValue('uhf') <= 0;
  ui.conquer.classList.toggle('hidden', !state.prometheusRepaired);
  ui.conquer.disabled = cannotAfford || !state.prometheusRepaired || sector.getControlValue('uhf') >= 1 - FULL_CONTROL_EPSILON;
  const text = {
    title: t('ui.space.invasion.dagon.sectorAbilities'),
    protect: t('ui.space.invasion.dagon.protect'), conquer: t('ui.space.invasion.dagon.conquer'),
    protection: remaining > 0 ? t('ui.space.invasion.dagon.protection', { time: formatDuration(Math.ceil(remaining / 1000)) }) : t('ui.space.invasion.dagon.unprotected'),
    cost: cost > 0 ? t('ui.space.invasion.dagon.researchCost', { cost: formatNumber(cost, true, 2), resource: resources.colony.advancedResearch.displayName }) : t('ui.space.invasion.dagon.zeroProduction')
  };
  for (const [key, value] of Object.entries(text)) if (ui[key].textContent !== value) ui[key].textContent = value;
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
    const t0 = reducedMotion ? 2 : time;
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#050711'; c.fillRect(0, 0, w, h);
    const glow = c.createRadialGradient(880, 230, 10, 800, 240, 440);
    glow.addColorStop(0, scene >= 9 ? '#152f42' : '#380c23'); glow.addColorStop(1, '#050711');
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
    const fade = scene >= 10 ? 0 : scene === 9 ? Math.max(0, 1 - t0 / 3) : 1;
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
    // Small, legible AI avatars in the same schematic style as the Zeus battle.
    for (const [x, y, color, name] of [[200, 190, '#83deff', 'hope'], [260, 325, '#ff886c', 'prometheus']]) {
      c.save(); c.translate(x, y + Math.sin(t0 * 1.2) * 3);
      c.shadowColor = color; c.shadowBlur = 16; c.strokeStyle = color; c.fillStyle = '#101b2c'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, -24); c.lineTo(18, -4); c.lineTo(13, 20); c.lineTo(-13, 20); c.lineTo(-18, -4); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = color; c.fillRect(-8, -5, 5, 3); c.fillRect(3, -5, 5, 3);
      c.shadowBlur = 0; c.font = '15px monospace'; c.textAlign = 'center'; c.fillText(t(`story.dagon.${name}`), 0, 45);
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
    if (scene === 2 || scene === 9) {
      c.save(); c.shadowBlur = 20; c.shadowColor = scene === 2 ? '#b895ff' : '#f7e49b';
      for (let i = 0; i < (scene === 2 ? 3 : 15); i += 1) {
        c.strokeStyle = scene === 2 ? '#dbb6ff' : `rgba(255,235,173,${Math.max(0, 0.8 - t0 / 6)})`;
        c.lineWidth = scene === 2 ? 2 : 3;
        c.beginPath(); c.moveTo(280, 325); c.lineTo(500 + i * 5, 260 + Math.sin(i + t0) * 20); c.lineTo(870, 240 + (i - 5) * 7); c.stroke();
      }
      c.restore();
    }
    if (scene === 3 || scene === 4) {
      c.lineWidth = 3; c.strokeStyle = '#fa385a';
      for (let i = 0; i < 14; i += 1) {
        const f = ((t0 * 0.5 + i / 14) % 1);
        const x = 780 - f * (scene === 4 ? 450 : 560);
        const y = 240 + Math.sin(f * 15 + i) * 30;
        c.beginPath(); c.moveTo(x + 15, y); c.lineTo(x, y + 7); c.stroke();
      }
      if (scene === 4) {
        c.strokeStyle = '#9eefff'; c.shadowColor = '#71d6ff'; c.shadowBlur = 20;
        c.beginPath(); c.moveTo(330, 60); c.lineTo(310, 170); c.lineTo(330, 235); c.lineTo(305, 420); c.stroke(); c.shadowBlur = 0;
      }
    }
    if (scene >= 5 && scene <= 8) {
      for (let i = 0; i < 100; i += 1) {
        const angle = i * 2.39996 + t0 * 0.15;
        const radius = 30 + (i % 17) * 7;
        let x = 260 + Math.cos(angle) * radius, y = 260 + Math.sin(angle) * radius;
        if (scene >= 6) x += ((t0 * 70 + i * 19) % 420);
        c.fillStyle = scene === 8 ? '#ffe599' : `hsl(${i * 29 % 360} 80% 75%)`;
        c.fillRect(x, y, scene === 8 ? 3 : 2, 2);
        if (scene === 6) { c.fillStyle = '#e45688'; c.fillRect(1100 - x, y, 2, 2); }
        if (scene === 7 && i % 8 === 0) { c.strokeStyle = '#84dfff88'; c.strokeRect(x - 5, y - 5, 12, 12); }
      }
    }
    if (scene >= 9) {
      c.strokeStyle = '#c0e8ff55'; c.lineWidth = 1;
      for (let i = 0; i < 20; i += 1) {
        const a = i * Math.PI / 10, r = 25 + Math.min(t0, 5) * 60;
        c.beginPath(); c.moveTo(860 + Math.cos(a) * r, 240 + Math.sin(a) * r);
        c.lineTo(860 + Math.cos(a) * (r + 16), 240 + Math.sin(a) * (r + 16)); c.stroke();
      }
    }
  }
}
