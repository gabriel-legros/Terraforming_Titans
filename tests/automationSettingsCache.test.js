const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('automation settings cache', () => {
  test('cache updates when automation items change', () => {
    const dom = new JSDOM(`<!DOCTYPE html><div class="projects-subtab-content-wrapper"></div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.projectElements = {};
    ctx.capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);
    ctx.formatNumber = () => '';
    ctx.SpaceMiningProject = function () {};
    ctx.SpaceExportBaseProject = function () {};
    ctx.SpaceStorageProject = function () {};

    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    const storageUICode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'spaceStorageUI.js'), 'utf8');
    vm.runInContext(
      uiCode + '\n' + storageUICode +
      '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.invalidateAutomationSettingsCache = invalidateAutomationSettingsCache; this.projectElements = projectElements;',
      ctx
    );

    const project = Object.assign(new ctx.SpaceStorageProject(), {
      name: 'spaceStorage',
      displayName: 'Space Storage',
      description: '',
      category: 'mega',
      autoStart: false,
      shipOperationAutoStart: false,
      prioritizeMegaProjects: false,
      renderUI: () => {},
      updateUI: () => {},
      getEffectiveDuration: () => 1000,
      getShipOperationDuration: () => 1000,
      canStart: () => true,
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {},
      assignedSpaceships: 0,
      isShipOperationContinuous() { return false; }
    });

    ctx.projectManager = {
      projects: { spaceStorage: project },
      isBooleanFlagSet: () => true,
      getProjectStatuses: () => [project]
    };

    ctx.createProjectItem(project);
    ctx.updateProjectUI('spaceStorage');
    const els = ctx.projectElements[project.name];

    expect(els.cachedAutomationItems.length).toBe(4);

    while (els.automationSettingsContainer.firstChild) {
      els.automationSettingsContainer.firstChild.remove();
    }
    ctx.updateProjectUI('spaceStorage');
    expect(els.cachedAutomationItems.length).toBe(4);
    expect(els.automationSettingsContainer.style.display).toBe('flex');

    ctx.invalidateAutomationSettingsCache(project.name);
    ctx.updateProjectUI('spaceStorage');
    expect(els.cachedAutomationItems.length).toBe(0);
    expect(els.automationSettingsContainer.style.display).toBe('none');

    const extra = dom.window.document.createElement('div');
    extra.classList.add('checkbox-container');
    els.automationSettingsContainer.appendChild(extra);
    ctx.invalidateAutomationSettingsCache(project.name);
    ctx.updateProjectUI('spaceStorage');
    expect(els.cachedAutomationItems.length).toBe(1);
    expect(els.automationSettingsContainer.style.display).toBe('flex');
  });
});
