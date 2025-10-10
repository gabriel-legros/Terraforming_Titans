const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

function loadScript(ctx, relativePath) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  vm.runInContext(code, ctx);
}

function createSubtabManager(dom) {
  return class {
    constructor() {
      this.listener = null;
    }

    onActivate(fn) {
      this.listener = fn;
    }

    activate(id) {
      const tabs = dom.window.document.querySelectorAll('.hope-subtab');
      tabs.forEach(tab => {
        if (!tab.dataset) return;
        tab.classList.toggle('active', tab.dataset.subtab === id);
      });
      const contents = dom.window.document.querySelectorAll('.hope-subtab-content');
      contents.forEach(content => {
        content.classList.toggle('active', content.id === id);
      });
      if (this.listener) this.listener(id);
    }

    isActive(id) {
      const el = dom.window.document.getElementById(id);
      return !!(el && el.classList.contains('active'));
    }
  };
}

function createBaseContext(dom) {
  const ctx = dom.getInternalVMContext();
  ctx.window = dom.window;
  ctx.document = dom.window.document;
  ctx.requestAnimationFrame = fn => fn();
  ctx.skillManager = {
    skillPoints: 0,
    skills: {},
    getUpgradeCost: () => 0
  };
  ctx.SubtabManager = createSubtabManager(dom);
  ctx.solisManager = null;
  ctx.solisTabVisible = false;
  ctx.warpGateCommand = null;
  ctx.wgcTabVisible = false;
  ctx.initializeSolisUI = () => {};
  ctx.initializeWGCUI = () => {};
  ctx.updateSolisVisibility = () => {};
  ctx.updateSolisUI = () => {};
  ctx.updateWGCVisibility = () => {};
  ctx.updateWGCUI = () => {};
  return ctx;
}

function createHopeDOM({ awakeningActive = false } = {}) {
  const activeClass = awakeningActive ? ' active' : '';
  return `<!DOCTYPE html><body>
    <div id="hope-tab">H.O.P.E.<span id="hope-alert" class="hope-alert">!</span></div>
    <div class="hope-subtabs">
      <div class="hope-subtab${awakeningActive ? ' active' : ''}" data-subtab="awakening-hope">Awakening<span id="awakening-subtab-alert" class="hope-alert">!</span></div>
    </div>
    <div class="hope-subtab-content-wrapper">
      <div id="awakening-hope" class="hope-subtab-content${activeClass}">
        <div id="skill-points-display">Skill Points: <span id="skill-points-value">0</span></div>
      </div>
    </div>
  </body>`;
}

describe('Awakening alert behaviour', () => {
  test('shows and clears alerts when viewing awakening', () => {
    const dom = new JSDOM(createHopeDOM({ awakeningActive: false }), { runScripts: 'outside-only' });
    const ctx = createBaseContext(dom);
    loadScript(ctx, 'src/js/skillsUI.js');
    loadScript(ctx, 'src/js/hopeUI.js');

    ctx.initializeHopeTabs();
    ctx.skillManager.skillPoints += 1;
    ctx.notifySkillPointGained(1);

    const awakeningAlert = dom.window.document.getElementById('awakening-subtab-alert');
    const hopeAlert = dom.window.document.getElementById('hope-alert');
    expect(awakeningAlert.style.display).toBe('inline');
    expect(hopeAlert.style.display).toBe('inline');

    ctx.activateHopeSubtab('awakening-hope');
    expect(awakeningAlert.style.display).toBe('none');
    expect(hopeAlert.style.display).toBe('none');
  });

  test('gaining skill points while viewing awakening keeps alerts hidden', () => {
    const dom = new JSDOM(createHopeDOM({ awakeningActive: true }), { runScripts: 'outside-only' });
    const ctx = createBaseContext(dom);
    loadScript(ctx, 'src/js/skillsUI.js');
    loadScript(ctx, 'src/js/hopeUI.js');

    ctx.initializeHopeTabs();
    ctx.skillManager.skillPoints += 1;
    ctx.notifySkillPointGained(1);

    const awakeningAlert = dom.window.document.getElementById('awakening-subtab-alert');
    const hopeAlert = dom.window.document.getElementById('hope-alert');
    expect(awakeningAlert.style.display).toBe('none');
    expect(hopeAlert.style.display).toBe('none');
  });

  test('pending alerts persist until hope UI initializes', () => {
    const dom = new JSDOM(createHopeDOM({ awakeningActive: false }), { runScripts: 'outside-only' });
    const ctx = createBaseContext(dom);
    loadScript(ctx, 'src/js/skillsUI.js');

    ctx.skillManager.skillPoints += 1;
    ctx.notifySkillPointGained(1);

    loadScript(ctx, 'src/js/hopeUI.js');
    ctx.initializeHopeTabs();

    const awakeningAlert = dom.window.document.getElementById('awakening-subtab-alert');
    const hopeAlert = dom.window.document.getElementById('hope-alert');
    expect(awakeningAlert.style.display).toBe('inline');
    expect(hopeAlert.style.display).toBe('inline');

    ctx.activateHopeSubtab('awakening-hope');
    expect(awakeningAlert.style.display).toBe('none');
    expect(hopeAlert.style.display).toBe('none');
  });
});
