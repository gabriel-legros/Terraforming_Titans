class TitanAftermathProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.leads = this.attributes.milestones.flatMap(milestone => milestone.leads);
    this.milestones = this.attributes.milestones.map(milestone => {
      const first = this.leads.indexOf(milestone.leads[0]);
      return { ...milestone, first, end: first + milestone.leads.length };
    });
    this.activeLeadId = null;
    this.reliefSent = new Set();
    this.aftermathUI = null;
  }

  get verifiedMilestones() {
    return this.milestones.filter(milestone => this.repeatCount >= milestone.end).length;
  }

  get chaos() {
    return 70 - 10 * this.verifiedMilestones - 5 * this.reliefSent.size;
  }

  getCurrentLead(milestone = this.milestones.find(item => this.repeatCount < item.end)) {
    if (!milestone || (milestone.requiresFlag && !this.isBooleanFlagSet(milestone.requiresFlag))) return null;
    // A save from before leads were sequential may already be investigating a later lead.
    if (this.isActive && this.activeLeadId) return milestone.leads.find(lead => lead.id === this.activeLeadId);
    return milestone.leads.find((lead, index) => !this.shownStorySteps.has(milestone.first + index));
  }

  getLeadCost(lead) {
    const colony = {};
    for (const [resource, amount] of Object.entries(lead.cost)) {
      colony[resource] = amount * this.getEffectiveCostMultiplier('colony', resource);
    }
    return { colony };
  }

  getScaledCost() {
    const lead = this.getCurrentLead();
    return lead ? this.getLeadCost(lead) : {};
  }

  canStart() {
    return !!this.getCurrentLead() && super.canStart();
  }

  start(stock, leadId) {
    if (this.isActive) return false;
    const lead = this.getCurrentLead();
    if (!lead || (leadId && leadId !== lead.id) || !super.start(stock)) return false;
    this.activeLeadId = lead.id;
    this.isCompleted = false;
    return true;
  }

  complete() {
    const lead = this.getCurrentLead();
    if (!lead) return;
    const before = this.chaos;
    const index = this.leads.indexOf(lead);
    super.complete(index);
    this.shownStorySteps.add(index);
    this.activeLeadId = null;
    if (this.chaos !== before) this.applyEffects();
  }

  canSendRelief(id) {
    return this.unlocked && projectManager.isProjectRelevantToCurrentPlanet(this)
      && this.attributes.reliefResources.includes(id)
      && !this.reliefSent.has(id) && resources.colony[id].value >= this.attributes.reliefCost;
  }

  sendRelief(id) {
    if (!this.canSendRelief(id)) return;
    resources.colony[id].decrease(this.attributes.reliefCost);
    this.reliefSent.add(id);
    this.applyEffects();
  }

  applyEffects() {
    const chaos = spaceManager.getCurrentPlanetKey() === this.attributes.planet ? this.chaos : 0;
    const sourceId = 'titan-mars-chaos';
    for (const [target, type] of [['fundingModule', 'productionMultiplier'], ['researchManager', 'advancedResearchBoost']]) {
      if (chaos === 0) {
        removeEffect({ target, sourceId });
      } else {
        addEffect({ target, type, sourceId, effectId: sourceId, clearOnTravel: true,
          value: (100 - chaos) / 100, name: t('ui.projects.earthProbe.mars') });
      }
    }
  }

  getJournalObjectiveSteps({ repeatCount, assumeCompleted }) {
    const target = assumeCompleted ? repeatCount : Math.min(repeatCount, this.repeatCount);
    const indices = [];
    for (const stage of this.milestones) {
      if (stage.first >= target) break;
      const recorded = [...this.shownStorySteps].filter(index => index >= stage.first && index < stage.end);
      indices.push(...recorded);
      // Completed chapters can reconstruct their journal without a matching project snapshot.
      for (let index = stage.first; indices.length < Math.min(target, stage.end); index++) {
        if (!this.shownStorySteps.has(index)) indices.push(index);
      }
    }
    return indices.slice(0, target).map((index, order) => ({
      sourceStep: index, stepLabel: `${order + 1}/${this.maxRepeatCount}`, text: this.attributes.storySteps[index]
    }));
  }

  saveState() {
    return { ...super.saveState(), activeLeadId: this.activeLeadId, reliefSent: [...this.reliefSent] };
  }

  loadState(state) {
    super.loadState(state);
    this.restoreInvestigation(state);
  }

  saveTravelState(resetLevel) {
    return { ...super.saveTravelState(resetLevel), activeLeadId: this.activeLeadId,
      shownStorySteps: [...this.shownStorySteps], reliefSent: [...this.reliefSent] };
  }

  loadTravelState(state, resetLevel) {
    super.loadTravelState(state, resetLevel);
    this.restoreInvestigation(state);
  }

  restoreInvestigation(state) {
    this.shownStorySteps = new Set(state.shownStorySteps || []);
    for (let index = 0; index < this.leads.length && this.shownStorySteps.size < this.repeatCount; index++) {
      this.shownStorySteps.add(index);
    }
    this.reliefSent = new Set(this.attributes.reliefResources.filter(id => state.reliefSent?.includes(id)));
    this.activeLeadId = state.activeLeadId || (this.isActive ? this.leads[this.repeatCount]?.id : null);
  }

  static migrateLegacyProjects(projects, completedChapters) {
    const probe = projects.earthProbe;
    const origins = projects.triangulate_attack;
    if (!probe || !origins) return;
    const traced = origins.repeatCount || origins.isActive || completedChapters.includes('chapter4.12b');
    const probeCount = traced ? 10 : probe.repeatCount || 0;
    const originCount = completedChapters.includes('chapter5.7') ? 5 : origins.repeatCount || 0;
    const count = probeCount + originCount;
    const state = origins.isActive ? origins : probe;
    projects.earthProbe = { ...probe, repeatCount: count, isActive: count < 15 && state.isActive,
      isCompleted: false, autoStart: probeCount < 10 ? probe.autoStart : origins.autoStart,
      startingDuration: state.startingDuration, remainingTime: state.remainingTime,
      shownStorySteps: Array.from({ length: count }, (_, index) => index) };
  }

  shouldHideStartBar() {
    return true;
  }

  static puzzlePiecePath(column, row) {
    const width = 160;
    const height = 150;
    const x = column * width;
    const y = row * height;
    const tab = (column + row) % 2 === 0 ? 1 : -1;
    // The same symmetric curve, traversed backwards, cuts the adjacent piece's socket.
    function edge(startX, startY, dx, dy, direction) {
      const length = Math.hypot(dx, dy);
      const middle = length / 2;
      const point = (along, across) => [
        startX + (along * dx - across * direction * dy) / length,
        startY + (along * dy + across * direction * dx) / length
      ].join(' ');
      if (!direction) return `L${point(length, 0)}`;
      return `L${point(middle - 15, 0)}
        C${point(middle - 8, 0)} ${point(middle - 8, 3)} ${point(middle - 12, 9)}
        C${point(middle - 27, 33)} ${point(middle + 27, 33)} ${point(middle + 12, 9)}
        C${point(middle + 8, 3)} ${point(middle + 8, 0)} ${point(middle + 15, 0)}
        L${point(length, 0)}`;
    }
    return [`M${x} ${y}`,
      edge(x, y, width, 0, row > 0 ? tab : 0),
      edge(x + width, y, 0, height, column < 4 ? -tab : 0),
      edge(x + width, y + height, -width, 0, row < 2 ? tab : 0),
      edge(x, y + height, 0, -height, column > 0 ? -tab : 0), 'Z'].join(' ');
  }

  renderPuzzle(parent) {
    const figure = document.createElement('figure');
    figure.className = 'aftermath-puzzle';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 800 450');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-labelledby', 'aftermath-puzzle-title');
    const addSvg = (parentNode, tag, attributes) => {
      const node = document.createElementNS(svg.namespaceURI, tag);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
      parentNode.appendChild(node);
      return node;
    };
    const image = this.attributes.puzzleImage;
    const title = addSvg(svg, 'title', { id: 'aftermath-puzzle-title' });
    const defs = addSvg(svg, 'defs', {});
    addSvg(defs, 'image', { id: 'aftermath-original', href: image.src, width: 800, height: 450 });
    const art = addSvg(defs, 'pattern', { id: 'aftermath-art', patternUnits: 'userSpaceOnUse', width: 800, height: 450 });
    addSvg(art, 'use', { href: '#aftermath-original' });
    const cover = addSvg(defs, 'linearGradient', { id: 'aftermath-cover', x2: '75%', y2: '100%' });
    addSvg(cover, 'stop', { offset: '0%', 'stop-color': '#273e49' });
    addSvg(cover, 'stop', { offset: '65%', 'stop-color': '#192c37' });
    addSvg(cover, 'stop', { offset: '100%', 'stop-color': '#11212c' });
    const grid = addSvg(defs, 'pattern', { id: 'aftermath-grid', patternUnits: 'userSpaceOnUse', width: 32, height: 32 });
    addSvg(grid, 'path', { d: 'M0 3V0H3', fill: 'none', stroke: '#83b2bd', opacity: '.4' });
    const sockets = addSvg(svg, 'g', { class: 'aftermath-sockets', fill: 'url(#aftermath-cover)' });
    addSvg(svg, 'rect', { width: 800, height: 450, fill: 'url(#aftermath-grid)' });
    const pieces = addSvg(svg, 'g', {});
    const tiles = new Map();
    const layout = [
      ['carrier', 'timeline', 'thermal', 'laser', 'parallax'],
      ['asteroid', 'clocks', 'photograph', 'crater', 'orbit'],
      ['occultation', 'gamma', 'relay', 'glass', 'positrons']
    ];
    layout.forEach((line, row) => line.forEach((id, column) => {
      const d = TitanAftermathProject.puzzlePiecePath(column, row);
      addSvg(sockets, 'path', { d });
      const tile = addSvg(pieces, 'path', { d, fill: 'url(#aftermath-art)', class: 'aftermath-piece', 'data-lead': id });
      tiles.set(id, tile);
    }));
    const trace = addSvg(svg, 'path', { class: 'aftermath-trace', pathLength: 100 });
    addSvg(svg, 'path', { class: 'aftermath-fiducials',
      d: 'M10 31V10H31 M769 10H790V31 M790 419V440H769 M31 440H10V419' });
    addSvg(svg, 'use', { href: '#aftermath-original', class: 'aftermath-finished-image' });
    const caption = document.createElement('figcaption');
    figure.append(svg, caption);
    parent.appendChild(figure);
    return { tiles, trace, title, caption, figure };
  }

  updatePuzzle(puzzle) {
    for (const stage of this.milestones) {
      stage.leads.forEach((lead, offset) => {
        const tile = puzzle.tiles.get(lead.id);
        const placed = this.repeatCount >= stage.end || this.shownStorySteps.has(stage.first + offset);
        const working = !placed && this.isActive && this.activeLeadId === lead.id;
        const state = placed ? 'placed' : working ? 'forming' : 'missing';
        if (tile.dataset.state !== state) {
          tile.dataset.state = state;
        }
      });
    }
    const activeId = (this.isActive && this.activeLeadId) || '';
    if (puzzle.trace.dataset.lead !== activeId) {
      puzzle.trace.dataset.lead = activeId;
      puzzle.trace.setAttribute('d', activeId ? puzzle.tiles.get(activeId).getAttribute('d') : '');
    }
    if (activeId) {
      const offset = (100 - this.getProgress()).toFixed(1);
      if (puzzle.trace.getAttribute('stroke-dashoffset') !== offset) puzzle.trace.setAttribute('stroke-dashoffset', offset);
    }
    const complete = this.repeatCount >= this.maxRepeatCount;
    puzzle.figure.classList.toggle('is-complete', complete);
  }

  renderUI(container) {
    const append = (parent, tag, className) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      parent.appendChild(element);
      return element;
    };
    const root = append(container, 'div', 'aftermath-panel');
    const puzzle = this.renderPuzzle(root);
    const investigation = append(root, 'section', 'aftermath-investigation');
    const heading = append(investigation, 'h3');
    const intro = append(investigation, 'p', 'aftermath-note');
    const stage = append(investigation, 'div');
    const stageHeading = append(stage, 'h4', 'aftermath-stage-heading');
    const stageTitle = append(stageHeading, 'span');
    const stageCount = append(stageHeading, 'span', 'aftermath-count');
    const row = append(stage, 'div', 'aftermath-lead');
    const label = append(row, 'strong');
    const button = append(row, 'button');
    button.type = 'button';
    button.addEventListener('click', () => {
      this.start(resources, row.dataset.lead);
      this.updateUI();
    });
    const costs = append(row, 'div', 'aftermath-costs');
    const mars = append(root, 'section', 'aftermath-mars');
    const marsHeading = append(mars, 'h3');
    const meterRow = append(mars, 'div', 'aftermath-meter');
    const meter = append(meterRow, 'progress');
    meter.max = 100;
    meter.value = this.chaos;
    const percent = append(meterRow, 'strong');
    const penalty = append(mars, 'p', 'aftermath-note');
    const dispatch = append(mars, 'p', 'aftermath-dispatch');
    const reliefSection = append(mars, 'section');
    const reliefTitle = append(reliefSection, 'h4');
    const terms = append(reliefSection, 'p', 'aftermath-note');
    const relief = new Map();
    for (const id of this.attributes.reliefResources) {
      const row = append(reliefSection, 'div', 'aftermath-shipment');
      const label = append(row, 'span');
      const button = append(row, 'button');
      button.type = 'button';
      button.addEventListener('click', () => {
        this.sendRelief(id);
        this.updateUI();
      });
      relief.set(id, { label, button });
    }
    this.aftermathUI = { heading, puzzle, intro, stage, stageTitle, stageCount, row, label, button, costs,
      marsHeading, meter, percent, penalty, dispatch, reliefSection, reliefTitle, terms, relief };
    this.updateUI();
  }

  updateUI() {
    const ui = this.aftermathUI;
    if (!ui) return;
    const text = (node, key, vars) => {
      const value = t(`ui.projects.earthProbe.${key}`, vars);
      if (node.textContent !== value) node.textContent = value;
    };
    text(ui.heading, 'investigation');
    text(ui.puzzle.caption, 'reconstruction');
    const investigationComplete = this.repeatCount >= this.maxRepeatCount;
    text(ui.puzzle.title, investigationComplete ? 'destroyedEarth' : 'puzzleAlt',
      { done: this.repeatCount, total: this.maxRepeatCount });
    this.updatePuzzle(ui.puzzle);
    const current = this.milestones.find(stage => this.repeatCount < stage.end);
    const lead = this.getCurrentLead(current);
    text(ui.intro, investigationComplete ? 'investigationComplete' : lead ? 'cut' : 'locked');
    if (ui.stage.hidden !== !lead) ui.stage.hidden = !lead;
    if (lead) {
      text(ui.stageTitle, `stages.${current.id}`);
      text(ui.stageCount, 'progress', { done: this.repeatCount - current.first, total: current.leads.length });
      const title = this.attributes.storyStepTitles[this.leads.indexOf(lead)];
      if (ui.label.textContent !== title) ui.label.textContent = title;
      if (ui.row.dataset.lead !== lead.id) ui.row.dataset.lead = lead.id;
      ui.row.classList.toggle('is-investigating', this.isActive);
      const cost = this.getLeadCost(lead);
      updateTotalCostDisplayElement(ui.costs, cost, this, false, t('ui.projects.earthProbe.requires'),
        { resourceAmountKey: 'ui.projects.earthProbe.resourceAmount' });
      const disabled = this.isActive || Object.entries(cost.colony).some(([id, amount]) => resources.colony[id].value < amount);
      if (ui.button.disabled !== disabled) ui.button.disabled = disabled;
      const seconds = Math.ceil((this.isActive ? this.remainingTime : this.getEffectiveDuration()) / 1000);
      const time = seconds % 60 === 0
        ? t('ui.projects.earthProbe.minutes', { minutes: seconds / 60 })
        : formatDurationDetailed(seconds);
      text(ui.button, this.isActive ? 'working' : 'investigate', { time });
    }
    const chaos = this.chaos;
    text(ui.marsHeading, 'mars');
    if (ui.meter.getAttribute('aria-label') !== ui.marsHeading.textContent) ui.meter.setAttribute('aria-label', ui.marsHeading.textContent);
    if (ui.meter.value !== chaos) ui.meter.value = chaos;
    const percent = `${chaos}%`;
    if (ui.percent.textContent !== percent) ui.percent.textContent = percent;
    text(ui.penalty, 'penalty', { percent: chaos, available: 100 - chaos });
    text(ui.dispatch, chaos === 0 ? 'relieved' : `dispatches.${this.verifiedMilestones}`);
    const hideRelief = chaos === 0;
    if (ui.reliefSection.hidden !== hideRelief) ui.reliefSection.hidden = hideRelief;
    if (hideRelief) return;
    text(ui.reliefTitle, 'relief');
    text(ui.terms, 'reliefTerms');
    const amount = formatNumber(this.attributes.reliefCost, true);
    for (const [id, { label, button }] of ui.relief) {
      const name = resources.colony[id].displayName;
      if (label.textContent !== name) label.textContent = name;
      const disabled = !this.canSendRelief(id);
      if (button.disabled !== disabled) button.disabled = disabled;
      text(button, this.reliefSent.has(id) ? 'delivered' : 'send', { amount });
    }
  }
}

registerProjectConstructor('TitanAftermathProject', TitanAftermathProject);
