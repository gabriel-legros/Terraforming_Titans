class OpenTheBoxProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.opens = 0;
    this.targetOpens = config.attributes.targetOpens || 20;
    this.ui = null;
    this.shatterElapsed = 0;
    this.shatterTimeoutId = null;
    this.clearScreenFracture();
  }

  shouldHideStartBar() {
    return true;
  }

  getProgressRatio() {
    return this.targetOpens > 0 ? Math.max(0, Math.min(1, this.opens / this.targetOpens)) : 1;
  }

  open() {
    if (!this.unlocked || this.isCompleted) {
      return;
    }
    this.opens = Math.min(this.targetOpens, this.opens + 1);
    if (this.opens >= this.targetOpens) {
      this.complete();
      this.updateUI();
      return;
    }
    this.updateScreenFracture(true);
    this.updateUI();
  }

  complete() {
    if (this.isCompleted) {
      return;
    }
    this.isCompleted = true;
    this.isActive = false;
    this.repeatCount = Math.max(this.repeatCount || 0, 1);
    this.shatterElapsed = 1800;
    this.updateScreenFracture(false);
    this.shatterTimeoutId = window.setTimeout(() => {
      this.shatterElapsed = 0;
      this.clearScreenFracture();
    }, 1700);
  }

  renderUI(container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'open-the-box-panel';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'open-the-box-button';
    button.textContent = t('ui.projects.openTheBox.open', null, 'Open');
    button.addEventListener('click', () => this.open());

    wrapper.appendChild(button);
    container.appendChild(wrapper);

    this.ui = { button };
    this.updateUI();
    this.updateScreenFracture(false);
  }

  update(deltaTime) {
    if (this.shatterElapsed > 0) {
      this.shatterElapsed = Math.max(0, this.shatterElapsed - deltaTime);
      this.updateScreenFracture(false);
      if (this.shatterElapsed <= 0) {
        this.clearScreenFracture();
      }
    }
  }

  updateUI() {
    if (!this.ui) {
      return;
    }
    this.ui.button.disabled = this.isCompleted;
    this.ui.button.textContent = this.isCompleted
      ? t('ui.projects.openTheBox.opened', null, 'Opened')
      : t('ui.projects.openTheBox.open', null, 'Open');
  }

  getFractureOverlay() {
    let overlay = document.getElementById('open-the-box-fracture');
    if (overlay) {
      return overlay;
    }

    overlay = document.createElement('div');
    overlay.id = 'open-the-box-fracture';
    overlay.setAttribute('aria-hidden', 'true');

    const pane = document.createElement('div');
    pane.className = 'open-the-box-fracture-pane';
    overlay.appendChild(pane);

    const cracks = [];
    for (let i = 0; i < 20; i += 1) {
      const crack = document.createElement('span');
      crack.className = `open-the-box-crack open-the-box-crack-${i + 1}`;
      overlay.appendChild(crack);
      cracks.push(crack);
    }
    overlay._openTheBoxCracks = cracks;

    for (let i = 0; i < 14; i += 1) {
      const shard = document.createElement('span');
      shard.className = `open-the-box-shard open-the-box-shard-${i + 1}`;
      overlay.appendChild(shard);
    }

    document.body.appendChild(overlay);
    return overlay;
  }

  clearScreenFracture() {
    if (this.shatterTimeoutId) {
      window.clearTimeout(this.shatterTimeoutId);
      this.shatterTimeoutId = null;
    }
    const overlay = document.getElementById('open-the-box-fracture');
    if (overlay) {
      overlay.remove();
    }
  }

  updateScreenFracture(pulse) {
    if (!this.unlocked && this.opens <= 0) {
      return;
    }

    const ratio = this.getProgressRatio();
    const overlay = this.getFractureOverlay();
    overlay.style.setProperty('--open-box-fracture', ratio);
    overlay.dataset.fractureLevel = `${this.opens}`;
    overlay.classList.toggle('open-the-box-fracture-visible', ratio > 0);
    overlay.classList.toggle('open-the-box-fracture-shatter', this.shatterElapsed > 0);
    const visibleCracks = this.shatterElapsed > 0 ? 0 : this.opens;
    for (let i = 0; i < overlay._openTheBoxCracks.length; i += 1) {
      overlay._openTheBoxCracks[i].classList.toggle('open-the-box-crack-visible', i < visibleCracks);
    }
    if (pulse) {
      overlay.classList.remove('open-the-box-fracture-pulse');
      void overlay.offsetWidth;
      overlay.classList.add('open-the-box-fracture-pulse');
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      opens: this.opens,
      shatterElapsed: this.shatterElapsed
    };
  }

  loadState(state) {
    super.loadState(state);
    this.opens = Math.max(0, Math.min(this.targetOpens, state.opens || 0));
    if (this.opens >= this.targetOpens) {
      this.isCompleted = true;
      this.repeatCount = Math.max(this.repeatCount || 0, 1);
    }
    this.shatterElapsed = Math.max(0, state.shatterElapsed || 0);
    if (this.isCompleted && this.shatterElapsed <= 0) {
      this.clearScreenFracture();
      return;
    }
    this.updateScreenFracture(false);
  }
}

window.OpenTheBoxProject = OpenTheBoxProject;
