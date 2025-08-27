const fs = require('fs');
const path = require('path');
const jsdomPath = path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom');
const { JSDOM } = require(jsdomPath);
const vm = require('vm');

describe('Space Storage automation UI recreation', () => {
  test('recreates ship auto-start controls when automation section is rebuilt', () => {
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
    const oldShipContainer = els.shipAutoStartContainer;
    const oldShipLabel = els.shipAutoStartLabel;

    const newContainer = dom.window.document.createElement('div');
    newContainer.classList.add('automation-settings-container');
    els.cardFooter.replaceChild(newContainer, els.automationSettingsContainer);
    els.automationSettingsContainer = newContainer;

    const autoStartContainer = dom.window.document.createElement('div');
    autoStartContainer.classList.add('checkbox-container');
    const autoStartCheckbox = dom.window.document.createElement('input');
    autoStartCheckbox.type = 'checkbox';
    autoStartCheckbox.id = `${project.name}-auto-start`;
    const autoStartLabel = dom.window.document.createElement('label');
    autoStartLabel.htmlFor = autoStartCheckbox.id;
    autoStartLabel.textContent = 'Auto start';
    autoStartContainer.append(autoStartCheckbox, autoStartLabel);
    newContainer.appendChild(autoStartContainer);
    els.autoStartCheckbox = autoStartCheckbox;
    els.autoStartCheckboxContainer = autoStartContainer;
    els.autoStartLabel = autoStartLabel;

    project.renderAutomationUI(newContainer);

    const newShipContainer = ctx.projectElements[project.name].shipAutoStartContainer;
    const newShipLabel = ctx.projectElements[project.name].shipAutoStartLabel;
    expect(newShipContainer.parentElement).toBe(newContainer);
    expect(newShipContainer).not.toBe(oldShipContainer);
    expect(newShipLabel).not.toBe(oldShipLabel);
    expect(newShipLabel.textContent).toBe('Auto Start Ships');
  });
});

