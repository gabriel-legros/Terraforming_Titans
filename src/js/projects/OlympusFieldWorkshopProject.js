class OlympusFieldWorkshopProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.actions = {
      smashRocks: this.createActionState('smashRocks'),
      smeltSand: this.createActionState('smeltSand'),
      smeltScrapMetal: this.createActionState('smeltScrapMetal'),
      assembleComponents: this.createActionState('assembleComponents'),
      assembleAndroid: this.createActionState('assembleAndroid'),
      scavengeElectronics: this.createActionState('scavengeElectronics')
    };
    this.ui = null;
    this.holdTimers = {};
  }

  getText(path, fallback, vars) {
    return t(`ui.projects.olympusFieldWorkshop.${path}`, vars, fallback);
  }

  createActionState(actionId) {
    return {
      id: actionId,
      running: false,
      remaining: 0
    };
  }

  getActionConfig(actionId) {
    const configs = {
      smashRocks: {
        label: this.getText('actions.smashRocks', 'Smash rocks'),
        durationMs: 1000,
        input: { category: 'surface', resource: 'rocks', amount: 1 },
        output: { category: 'surface', resource: 'scrapMetal', amount: 0.1 }
      },
      smeltSand: {
        label: this.getText('actions.smeltSand', 'Smelt sand'),
        durationMs: 1000,
        input: { category: 'colony', resource: 'silicon', amount: 1 },
        output: { category: 'colony', resource: 'glass', amount: 1 }
      },
      smeltScrapMetal: {
        label: this.getText('actions.smeltScrapMetal', 'Smelt scrap metal'),
        durationMs: 10000,
        input: { category: 'surface', resource: 'scrapMetal', amount: 1 },
        output: { category: 'colony', resource: 'metal', amount: 1 }
      },
      assembleComponents: {
        label: this.getText('actions.assembleComponents', 'Assemble components'),
        durationMs: 60000,
        input: { category: 'colony', resource: 'metal', amount: 5 },
        output: { category: 'colony', resource: 'components', amount: 1 }
      },
      assembleAndroid: {
        label: this.getText('actions.assembleAndroid', 'Assemble android'),
        durationMs: 60000,
        input: { category: 'colony', resource: 'components', amount: 5 },
        extraInput: { category: 'colony', resource: 'electronics', amount: 1 },
        output: { category: 'colony', resource: 'androids', amount: 1 }
      },
      scavengeElectronics: {
        label: this.getText('actions.scavengeElectronics', 'Scavenge for electronics'),
        durationMs: 30000,
        input: null,
        output: { category: 'colony', resource: 'electronics', amount: 1 }
      }
    };
    return configs[actionId];
  }

  formatActionRecipe(config) {
    const outputResource = resources[config.output.category][config.output.resource];
    const outputText = `${formatNumber(config.output.amount, true)} ${outputResource.displayName}`;
    if (!config.input) {
      return this.getText('recipeProduces', 'Produces: {output}', { output: outputText });
    }
    const inputResource = resources[config.input.category][config.input.resource];
    let inputText = `${formatNumber(config.input.amount, true)} ${inputResource.displayName}`;
    if (config.extraInput) {
      const extraResource = resources[config.extraInput.category][config.extraInput.resource];
      inputText += `, ${formatNumber(config.extraInput.amount, true)} ${extraResource.displayName}`;
    }
    return this.getText('recipeLine', 'Consumes: {input} -> Produces: {output}', {
      input: inputText,
      output: outputText
    });
  }

  enable() {
    super.enable();
    this.applyEffects();
  }

  applyEffects() {
    if (!this.unlocked) {
      return;
    }
    resources.surface.rocks.unlocked = true;
    resources.surface.scrapMetal.unlocked = true;
  }

  isGatherUnlocked(gatherId) {
    return this.hasBooleanFlag(`olympusWorkshop_${gatherId}`);
  }

  isActionUnlocked(actionId) {
    return this.hasBooleanFlag(`olympusWorkshop_${actionId}`);
  }

  isVisible() {
    return this.unlocked && !this.isPermanentlyDisabled();
  }

  shouldHideStartBar() {
    return true;
  }

  gatherRocks() {
    if (!this.isGatherUnlocked('gatherRocks')) {
      return;
    }
    resources.surface.rocks.increase(1);
    this.updateUI();
  }

  gatherSand() {
    if (!this.isGatherUnlocked('gatherSand')) {
      return;
    }
    resources.colony.silicon.increase(0.1);
    this.updateUI();
  }

  canStartAction(actionId) {
    if (!this.isActionUnlocked(actionId)) {
      return false;
    }
    const action = this.actions[actionId];
    const config = this.getActionConfig(actionId);
    if (!action || !config || action.running) {
      return false;
    }
    if (!config.input) {
      return true;
    }
    const hasInput = resources[config.input.category][config.input.resource].value >= config.input.amount;
    const hasExtraInput = !config.extraInput ||
      resources[config.extraInput.category][config.extraInput.resource].value >= config.extraInput.amount;
    return hasInput && hasExtraInput;
  }

  startAction(actionId) {
    if (!this.canStartAction(actionId)) {
      return false;
    }
    const action = this.actions[actionId];
    const config = this.getActionConfig(actionId);
    if (config.input) {
      resources[config.input.category][config.input.resource].decrease(config.input.amount);
    }
    if (config.extraInput) {
      resources[config.extraInput.category][config.extraInput.resource].decrease(config.extraInput.amount);
    }
    action.running = true;
    action.remaining = config.durationMs;
    this.updateUI();
    return true;
  }

  completeAction(actionId) {
    const action = this.actions[actionId];
    const config = this.getActionConfig(actionId);
    action.running = false;
    action.remaining = 0;
    resources[config.output.category][config.output.resource].increase(config.output.amount);
  }

  update(deltaTime) {
    super.update(deltaTime);
    this.tickActions(deltaTime);
  }

  tickActions(deltaTime) {
    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      const action = this.actions[actionId];
      if (!action.running) {
        continue;
      }
      action.remaining -= deltaTime;
      if (action.remaining <= 0) {
        this.completeAction(actionId);
      }
    }
  }

  attachHoldHandlers(button, pressFn, holdKey) {
    button.addEventListener('click', (event) => {
      if (event.detail === 0) {
        return;
      }
      pressFn();
    });
    button.addEventListener('pointerdown', () => {
      this.stopHoldTimer(holdKey);
      this.holdTimers[holdKey] = setInterval(() => {
        pressFn();
      }, 100);
    });
    const clear = () => this.stopHoldTimer(holdKey);
    button.addEventListener('pointerup', clear);
    button.addEventListener('pointercancel', clear);
    button.addEventListener('pointerleave', clear);
  }

  stopHoldTimer(holdKey) {
    const timer = this.holdTimers[holdKey];
    if (!timer) {
      return;
    }
    clearInterval(timer);
    delete this.holdTimers[holdKey];
  }

  renderUI(container) {
    const panel = document.createElement('div');
    panel.classList.add('olympus-workshop-panel');

    const gatherRow = document.createElement('div');
    gatherRow.classList.add('olympus-workshop-gather-row');
    const gatherRockControl = document.createElement('div');
    gatherRockControl.classList.add('olympus-workshop-gather-control');
    const gatherSandControl = document.createElement('div');
    gatherSandControl.classList.add('olympus-workshop-gather-control');
    const gatherRockButton = document.createElement('button');
    gatherRockButton.type = 'button';
    gatherRockButton.classList.add('olympus-workshop-gather-button');
    const gatherSandButton = document.createElement('button');
    gatherSandButton.type = 'button';
    gatherSandButton.classList.add('olympus-workshop-gather-button');
    this.attachHoldHandlers(gatherRockButton, () => this.gatherRocks(), 'rocks');
    this.attachHoldHandlers(gatherSandButton, () => this.gatherSand(), 'sand');
    gatherRockControl.appendChild(gatherRockButton);
    gatherSandControl.appendChild(gatherSandButton);
    gatherRow.append(gatherRockControl, gatherSandControl);

    const actionsContainer = document.createElement('div');
    actionsContainer.classList.add('olympus-workshop-actions');
    const actionRows = {};
    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      const row = document.createElement('div');
      row.classList.add('olympus-workshop-action-row');
      const topRow = document.createElement('div');
      topRow.classList.add('olympus-workshop-action-top');
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('olympus-workshop-action-button');
      button.addEventListener('click', () => this.startAction(actionId));
      const status = document.createElement('span');
      status.classList.add('olympus-workshop-action-status');
      topRow.append(button, status);
      const flavor = document.createElement('div');
      flavor.classList.add('olympus-workshop-action-flavor');

      const track = document.createElement('div');
      track.classList.add('olympus-workshop-progress-track');
      const fill = document.createElement('div');
      fill.classList.add('olympus-workshop-progress-fill');
      track.appendChild(fill);

      row.append(topRow, flavor, track);
      actionsContainer.appendChild(row);
      actionRows[actionId] = { container: row, button, status, flavor, fill };
    }

    panel.append(gatherRow, actionsContainer);
    container.appendChild(panel);

    this.ui = {
      gatherRockButton,
      gatherSandButton,
      actionRows
    };
    this.updateUI();
  }

  updateUI() {
    if (!this.ui) {
      return;
    }
    this.ui.gatherRockButton.textContent = this.getText('gatherRocks', 'Collect rocks (+1)');
    this.ui.gatherRockButton.style.display = this.isGatherUnlocked('gatherRocks') ? '' : 'none';
    this.ui.gatherSandButton.textContent = this.getText('gatherSand', 'Collect sand (+0.1 silica)');
    this.ui.gatherSandButton.style.display = this.isGatherUnlocked('gatherSand') ? '' : 'none';

    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      const action = this.actions[actionId];
      const config = this.getActionConfig(actionId);
      const row = this.ui.actionRows[actionId];
      row.container.style.display = this.isActionUnlocked(actionId) ? '' : 'none';
      row.button.textContent = `${config.label} (${this.formatActionRecipe(config)})`;
      row.button.disabled = !this.canStartAction(actionId);
      row.flavor.textContent = this.getText(`actionFlavor.${actionId}`, this.getActionFlavorFallback(actionId));

      if (action.running) {
        const pct = Math.max(0, Math.min(100, ((config.durationMs - action.remaining) / config.durationMs) * 100));
        row.fill.style.width = `${pct}%`;
        row.status.textContent = this.getText(
          'inProgress',
          '{seconds}s remaining',
          { seconds: formatNumber(action.remaining / 1000, false, 1) }
        );
      } else {
        row.fill.style.width = '0%';
        row.status.textContent = this.getText('ready', 'Ready');
      }
    }
  }

  getActionFlavorFallback(actionId) {
    const fallbacks = {
      smashRocks: 'Flat stones become anvils. Bigger stones become hammers.',
      smeltSand: 'A crude furnace turns beach grit into something clear enough to build with.',
      smeltScrapMetal: 'Every bent fragment is one step back toward a usable frame.',
      assembleComponents: 'Hand-fitted parts are slow, but they still count.',
      assembleAndroid: 'The frame is crude. The hands will still help.',
      scavengeElectronics: 'Broken panels and dead instruments still have useful circuits inside.'
    };
    return fallbacks[actionId] || '';
  }

  saveState() {
    const savedActions = {};
    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      const action = this.actions[actionId];
      savedActions[actionId] = {
        running: action.running === true,
        remaining: action.remaining || 0
      };
    }
    return {
      ...super.saveState(),
      workshopActions: savedActions
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.applyEffects();
    const savedActions = state.workshopActions || {};
    const actionIds = Object.keys(this.actions);
    for (let i = 0; i < actionIds.length; i += 1) {
      const actionId = actionIds[i];
      const action = this.actions[actionId];
      const saved = savedActions[actionId] || {};
      action.running = saved.running === true;
      action.remaining = saved.remaining || 0;
      if (action.running && action.remaining <= 0) {
        action.running = false;
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.OlympusFieldWorkshopProject = OlympusFieldWorkshopProject;
}
