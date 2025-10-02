const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');

describe('Dyson Swarm project visibility without tech', () => {
  test('project shows but cannot start receiver', () => {
    const html = `<!DOCTYPE html>
      <div class="projects-subtab" data-subtab="mega-projects"></div>
      <div id="mega-projects"></div>
      <div class="projects-subtab-content-wrapper"></div>`;
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.window = dom.window;
    ctx.projectElements = {};
    ctx.formatNumber = n => n;
    ctx.formatBigInteger = n => n;
    ctx.resources = { special: { spaceships: { value: 0 } } };
    ctx.spaceManager = { getCurrentPlanetKey: () => 'mars' };
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.updateMegaProjectsVisibility = updateMegaProjectsVisibility; this.projectElements = projectElements;', ctx);

    const project = {
      name: 'dysonSwarmReceiver',
      displayName: 'Dyson Swarm Receiver',
      description: '',
      cost: {},
      attributes: {},
      category: 'mega',
      unlocked: false,
      collectors: 2,
      isVisible() { return this.unlocked || this.collectors > 0; },
      isCompleted: false,
      repeatable: false,
      repeatCount: 0,
      maxRepeatCount: 1,
      autoStart: false,
      isActive: false,
      isContinuous: () => false,
      getEffectiveCost: () => ({}),
      getScaledCost: () => ({}),
      getEffectiveDuration: () => 1000,
      getProgress: () => 0,
      canStart: () => false,
      renderUI: () => {},
      updateUI: () => {}
    };

    ctx.projectManager = {
      projects: { dysonSwarmReceiver: project },
      projectOrder: ['dysonSwarmReceiver'],
      getProjectStatuses() { return this.projectOrder.map(name => this.projects[name]); },
      reorderProject: () => {},
      isBooleanFlagSet: () => false,
      startProject: () => {}
    };

    ctx.createProjectItem(project);
    ctx.updateProjectUI(project.name);
    ctx.updateMegaProjectsVisibility();

    const els = ctx.projectElements[project.name];
    expect(els.projectItem.style.display).toBe('block');
    expect(els.progressButton.style.display).toBe('none');
    const megaSubtab = dom.window.document.querySelector('.projects-subtab[data-subtab="mega-projects"]');
    expect(megaSubtab.classList.contains('hidden')).toBe(false);
  });
});
