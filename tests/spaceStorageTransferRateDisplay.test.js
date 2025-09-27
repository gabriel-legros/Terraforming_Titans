const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require(path.join(process.execPath, '..', '..', 'lib', 'node_modules', 'jsdom'));
const numbers = require('../src/js/numbers.js');

describe('Space Storage transfer rate display', () => {
  test('shows transfer rate under Cost & Gain', () => {
    const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>');
    const ctx = {
      console,
      document: dom.window.document,
      EffectableEntity: require('../src/js/effectable-entity.js'),
      resources: {
        special: { spaceships: { value: 0 } },
        colony: {
          metal: { displayName: 'Metal', value: 0 },
          energy: { displayName: 'Energy', value: 0 }
        },
        surface: {},
        atmospheric: {}
      },
      buildings: {},
      colonies: {},
      projectElements: {},
      addEffect: () => {},
      globalGameIsLoadingFromSave: false,
      formatNumber: numbers.formatNumber,
      formatBigInteger: numbers.formatBigInteger,
      formatTotalCostDisplay: () => '',
      formatTotalResourceGainDisplay: () => '',
      capitalizeFirstLetter: s => s.charAt(0).toUpperCase() + s.slice(1),
      spaceManager: {
        getTerraformedPlanetCount: () => 0,
        getTerraformedPlanetCountIncludingCurrent: () => 1
      }
    };
    vm.createContext(ctx);
    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
    const shipCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceshipProject.js'), 'utf8');
    vm.runInContext(shipCode + '; this.SpaceshipProject = SpaceshipProject;', ctx);
    const storageCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'SpaceStorageProject.js'), 'utf8');
    vm.runInContext(storageCode + '; this.SpaceStorageProject = SpaceStorageProject;', ctx);
    const uiCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects', 'spaceStorageUI.js'), 'utf8');
    vm.runInContext(uiCode + '; this.renderSpaceStorageUI = renderSpaceStorageUI; this.updateSpaceStorageUI = updateSpaceStorageUI;', ctx);

    const attrs = { costPerShip: { colony: { metal: 1, energy: 1 } }, transportPerShip: 1_000_000 };
    const params = { name: 'spaceStorage', category: 'mega', cost: {}, duration: 300000, description: '', repeatable: true, maxRepeatCount: Infinity, unlocked: true, attributes: attrs };
    const project = new ctx.SpaceStorageProject(params, 'spaceStorage');
    project.assignedSpaceships = 10;
    project.selectedResources = [{ category: 'colony', resource: 'metal' }];

    const container = dom.window.document.getElementById('root');
    project.renderUI(container);

    const els = ctx.projectElements[project.name];
    const transferEl = els.transferRateElement;
    const expectedRate = numbers.formatNumber(1_000_000 / (project.getShipOperationDuration() / 1000), true);
    expect(transferEl.textContent).toBe(`Transfer Rate: ${expectedRate}/s`);
  });
});
