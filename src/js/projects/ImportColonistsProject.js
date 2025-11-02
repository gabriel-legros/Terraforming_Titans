class ImportColonistsProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.importTarget = 'colonists';
  }

  canImportCrusaders() {
    return this.isBooleanFlagSet && this.isBooleanFlagSet('crusaderImportEnabled');
  }

  getImportTarget() {
    return this.canImportCrusaders() && this.importTarget === 'crusaders'
      ? 'crusaders'
      : 'colonists';
  }

  setImportTarget(target) {
    this.importTarget = target === 'crusaders' ? 'crusaders' : 'colonists';
  }

  renderUI() {
    const elements = projectElements[this.name];
    const gainElement = elements.resourceGainElement;
    const gainList = gainElement.lastElementChild;
    while (gainList.firstChild) {
      gainList.removeChild(gainList.firstChild);
    }

    const wrapper = document.createElement('span');
    wrapper.classList.add('import-colonists-gain');

    const label = document.createElement('span');
    label.classList.add('import-target-label');
    wrapper.appendChild(label);

    const select = document.createElement('select');
    select.classList.add('import-target-select');

    const colonistsOption = document.createElement('option');
    colonistsOption.value = 'colonists';
    colonistsOption.textContent = resources.colony.colonists.displayName;
    select.appendChild(colonistsOption);

    const crusaders = resources.special.crusaders;
    if (crusaders) {
      const crusadersOption = document.createElement('option');
      crusadersOption.value = 'crusaders';
      crusadersOption.textContent = crusaders.displayName;
      select.appendChild(crusadersOption);
    }

    select.addEventListener('change', () => {
      this.setImportTarget(select.value);
      if (typeof updateProjectUI === 'function') {
        updateProjectUI(this.name);
      }
    });
    wrapper.appendChild(select);

    const separator = document.createElement('span');
    separator.textContent = ': ';
    wrapper.appendChild(separator);

    const crusaderTooltip = document.createElement('span');
    crusaderTooltip.classList.add('info-tooltip-icon');
    crusaderTooltip.innerHTML = '&#9432;';
    crusaderTooltip.title = 'Crusaders count as two workers, do not grow or produce research, and can eliminate hazardous biomass.';
    crusaderTooltip.style.display = 'none';
    wrapper.appendChild(crusaderTooltip);

    const amount = document.createElement('span');
    amount.classList.add('import-target-amount');
    wrapper.appendChild(amount);

    gainList.appendChild(wrapper);

    elements.resourceGainItems = null;
    elements.importTargetWrapper = wrapper;
    elements.importTargetLabel = label;
    elements.importTargetSelect = select;
    elements.importTargetSeparator = separator;
    elements.crusaderTooltip = crusaderTooltip;
    elements.importAmountSpan = amount;

    this.updateUI();
  }

  updateUI() {
    const elements = projectElements[this.name];
    const select = elements.importTargetSelect;
    const label = elements.importTargetLabel;
    const amountSpan = elements.importAmountSpan;
    const crusaderTooltip = elements.crusaderTooltip;

    const crusaderEnabled = this.canImportCrusaders();

    if (crusaderEnabled) {
      select.value = this.importTarget;
      select.style.display = '';
      label.style.display = 'none';
      crusaderTooltip.style.display = '';
    } else {
      label.textContent = resources.colony.colonists.displayName;
      label.style.display = '';
      select.style.display = 'none';
      crusaderTooltip.style.display = 'none';
    }

    const gain = this.getEffectiveResourceGain();
    const colonistGain = gain.colony && gain.colony.colonists ? gain.colony.colonists : 0;
    amountSpan.textContent = formatNumber(colonistGain, true);
  }

  applyResourceGain() {
    const gain = this.getEffectiveResourceGain();
    const amount = gain.colony && gain.colony.colonists ? gain.colony.colonists : 0;
    const target = this.getImportTarget();
    if (amount <= 0) {
      return;
    }
    if (target === 'crusaders') {
      const crusaders = resources.special.crusaders;
      if (crusaders.unlock) {
        crusaders.unlock();
      } else {
        crusaders.unlocked = true;
      }
      crusaders.increase(amount);
    } else {
      resources.colony.colonists.increase(amount);
    }
  }

  saveState() {
    const state = super.saveState();
    state.importTarget = this.importTarget;
    return state;
  }

  loadState(state) {
    super.loadState(state);
    this.setImportTarget(state?.importTarget);
    const elements = projectElements?.[this.name];
    if (elements?.importTargetSelect) {
      this.updateUI();
      return;
    }
    updateProjectUI?.(this.name);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImportColonistsProject;
} else if (typeof window !== 'undefined') {
  window.ImportColonistsProject = ImportColonistsProject;
} else if (typeof global !== 'undefined') {
  global.ImportColonistsProject = ImportColonistsProject;
}
