const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const vm = require('vm');
const numbers = require('../src/js/numbers.js');

describe('project cost and gain lists', () => {
  test('updates list items without rebuilding HTML', () => {
    const dom = new JSDOM(`<!DOCTYPE html>
      <div class="projects-subtab-content-wrapper">
        <div id="resources-projects-list" class="projects-list"></div>
      </div>`, { runScripts: 'outside-only' });
    const ctx = dom.getInternalVMContext();
    ctx.document = dom.window.document;
    ctx.console = console;
    ctx.formatNumber = numbers.formatNumber;
    ctx.formatBigInteger = numbers.formatBigInteger;
    ctx.projectElements = {};
    ctx.resources = {
      colony: {
        metal: { value: 5, displayName: 'Metal', unlocked: true },
        funding: { value: 0, displayName: 'Funding', unlocked: true }
      }
    };
    ctx.buildings = {};
    ctx.colonies = {};

    const effectCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'effectable-entity.js'), 'utf8');
    vm.runInContext(effectCode + '; this.EffectableEntity = EffectableEntity;', ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projectsUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.createProjectItem = createProjectItem; this.updateProjectUI = updateProjectUI; this.projectElements = projectElements;', ctx);

    const params = {
      name: 'test_project',
      displayName: 'Test Project',
      category: 'resources',
      cost: { colony: { metal: 10 } },
      duration: 1000,
      description: '',
      repeatable: true,
      maxRepeatCount: 1,
      unlocked: true,
      attributes: { resourceGain: { colony: { metal: 1 } } }
    };
    const project = new ctx.Project(params, 'test_project');
    ctx.projectManager = { projects: { test_project: project }, getProjectStatuses: () => [project], isBooleanFlagSet: () => false };

    ctx.createProjectItem(project);
    ctx.updateProjectUI('test_project');

    let costItems = ctx.projectElements.test_project.costElement.querySelectorAll('span span');
    expect(costItems.length).toBe(1);
    expect(costItems[0].textContent).toBe('Metal: 10');
    expect(costItems[0].style.color).toBe('red');

    ctx.resources.colony.metal.value = 15;
    ctx.updateProjectUI('test_project');
    costItems = ctx.projectElements.test_project.costElement.querySelectorAll('span span');
    expect(costItems[0].style.color).toBe('');

    const gainItems = ctx.projectElements.test_project.resourceGainElement.querySelectorAll('span span');
    expect(gainItems.length).toBe(1);
    expect(gainItems[0].textContent).toBe('Metal: 1');
  });
});

