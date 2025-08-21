const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Space Storage automation settings', () => {
  test('adds ship and prioritize checkboxes next to expansion auto start', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab-content-wrapper"></div>`, { runScripts: 'outside-only' });
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
      '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.projectElements = projectElements; this.updateSpaceStorageUI = updateSpaceStorageUI;',
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
      updateUI() { ctx.updateSpaceStorageUI(this); },
      getEffectiveDuration: () => 1000,
      getShipOperationDuration: () => 1000,
      canStart: () => true,
      repeatable: true,
      maxRepeatCount: Infinity,
      unlocked: true,
      attributes: {},
      assignedSpaceships: 0,
      isShipOperationContinuous() { return this.assignedSpaceships > 100; }
    });

    ctx.projectManager = {
      projects: { spaceStorage: project },
      isBooleanFlagSet: () => true,
      getProjectStatuses: () => [project]
    };

    ctx.createProjectItem(project);
    ctx.updateProjectUI('spaceStorage');
    const els = ctx.projectElements[project.name];
    const labels = Array.from(els.automationSettingsContainer.querySelectorAll('label')).map(l => l.textContent);
    expect(labels).toEqual([
      'Auto Start Expansion',
      'Auto Start Ships',
      'Prioritize space resources for mega projects'
    ]);

    els.shipAutoStartCheckbox.checked = true;
    els.shipAutoStartCheckbox.dispatchEvent(new dom.window.Event('change'));
    expect(project.shipOperationAutoStart).toBe(true);

    els.prioritizeMegaCheckbox.checked = true;
    els.prioritizeMegaCheckbox.dispatchEvent(new dom.window.Event('change'));
    expect(project.prioritizeMegaProjects).toBe(true);
  });
});
