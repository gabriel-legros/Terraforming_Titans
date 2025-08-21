const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Space Storage ship auto-start label', () => {
  test('renames to Run in continuous mode and reverts otherwise', () => {
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
      '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.updateSpaceStorageUI = updateSpaceStorageUI; this.projectElements = projectElements;',
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
      assignedSpaceships: 50,
      isShipOperationContinuous() { return this.assignedSpaceships > 100; }
    });

    ctx.projectManager = {
      projects: { spaceStorage: project },
      isBooleanFlagSet: () => true,
      getProjectStatuses: () => [project]
    };

    ctx.createProjectItem(project);
    ctx.updateProjectUI('spaceStorage');
    let label = ctx.projectElements[project.name].shipAutoStartContainer.querySelector('label');
    expect(label.textContent).toBe('Auto Start Ships');

    project.assignedSpaceships = 150;
    ctx.updateProjectUI('spaceStorage');
    label = ctx.projectElements[project.name].shipAutoStartContainer.querySelector('label');
    expect(label.textContent).toBe('Run');

    project.assignedSpaceships = 50;
    ctx.updateProjectUI('spaceStorage');
    label = ctx.projectElements[project.name].shipAutoStartContainer.querySelector('label');
    expect(label.textContent).toBe('Auto Start Ships');
  });
});
