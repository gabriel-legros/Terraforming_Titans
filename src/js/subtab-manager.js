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
    if (typeof document === 'undefined' || !document.querySelectorAll) {
      this.subtabs = [];
      return;
    }
    this.subtabs = Array.from(document.querySelectorAll(this.subtabSelector));
  }

  _isActiveInDOM(id) {
    if (!id || typeof document === 'undefined') return false;
    const tab = this.getSubtab(id);
    if (tab && tab.classList && tab.classList.contains('active')) return true;
    const content = document.getElementById ? document.getElementById(id) : null;
    return !!(content && content.classList && content.classList.contains('active'));
  }

  _inferActiveIdFromDOM() {
    if (typeof document === 'undefined') return null;
    if (!this.subtabs) this._cacheSubtabs();
    if (Array.isArray(this.subtabs)) {
      const tab = this.subtabs.find(t => t && t.classList && t.classList.contains('active') && t.dataset && t.dataset.subtab);
      if (tab) return tab.dataset.subtab;
    }
    if (this.contentClass && document.querySelector) {
      const content = document.querySelector(`.${this.contentClass}.active`);
      if (content && typeof content.id === 'string' && content.id) {
        return content.id;
      }
    }
    return null;
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

  getActiveId() {
    if (this.activeId && this._isActiveInDOM(this.activeId)) {
      return this.activeId;
    }
    const domId = this._inferActiveIdFromDOM();
    if (domId) {
      this.activeId = domId;
      return domId;
    }
    return this.activeId || null;
  }

  isActive(id) {
    if (!id) return false;
    if (this._isActiveInDOM(id)) return true;
    const active = this.getActiveId();
    if (!active) return false;
    return active === id;
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
    this.subtabs = null;
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

