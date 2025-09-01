const utils = typeof require === 'function' ? require('./ui-utils.js') : window;
const activateSubtabFn = utils.activateSubtab;

class SubtabManager {
  constructor(subtabSelector, contentSelector, unhide = false) {
    this.subtabSelector = subtabSelector;
    this.contentSelector = contentSelector;
    this.unhide = unhide;
    this.subtabClass = this._extractClass(subtabSelector);
    this.contentClass = this._extractClass(contentSelector);
    this.subtabs = null;
    this.activeId = null;
    this.activateListeners = [];
    this._register();
  }

  _extractClass(selector) {
    if (!selector) return '';
    const match = selector.match(/\.([\w-]+)$/);
    return match ? match[1] : selector.replace(/^\./, '');
  }

  _cacheSubtabs() {
    this.subtabs = Array.from(document.querySelectorAll(this.subtabSelector));
  }

  _register() {
    this._cacheSubtabs();
    this.subtabs.forEach(tab => {
      tab.addEventListener('click', () => this.activate(tab.dataset.subtab));
    });
  }

  onActivate(fn) {
    if (typeof fn === 'function') this.activateListeners.push(fn);
  }

  activate(id) {
    if (!id) return;
    activateSubtabFn(this.subtabClass, this.contentClass, id, this.unhide);
    this.activeId = id;
    this.activateListeners.forEach(fn => {
      try { fn(id); } catch (_) {}
    });
  }

  show(id) {
    const tab = this.getSubtab(id);
    const content = document.getElementById(id);
    if (tab) tab.classList.remove('hidden');
    if (content) content.classList.remove('hidden');
  }

  hide(id) {
    const tab = this.getSubtab(id);
    const content = document.getElementById(id);
    if (tab) tab.classList.add('hidden');
    if (content) content.classList.add('hidden');
  }

  reset() {
    this._register();
  }

  getSubtab(id) {
    if (!this.subtabs) this._cacheSubtabs();
    return this.subtabs.find(t => t && t.dataset && t.dataset.subtab === id) || null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubtabManager;
} else {
  window.SubtabManager = SubtabManager;
}

