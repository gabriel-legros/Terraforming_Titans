const fs = require('fs');
const path = require('path');
const vm = require('vm');

function setup(currentPlanet) {
  const ctx = { console, projectElements: {} };
  ctx.EffectableEntity = require('../src/js/effectable-entity.js');
  ctx.resources = { colony: {} };
  ctx.spaceManager = { getCurrentPlanetKey() { return currentPlanet; } };
  vm.createContext(ctx);
  const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
  vm.runInContext(projectsCode + '; this.Project = Project;', ctx);
  ctx.globalThis = ctx;
  return ctx;
}

describe('story project planet restriction', () => {
  test('cannot start on wrong planet', () => {
    const ctx = setup('titan');
    const config = {
      name: 'test',
      category: 'story',
      cost: {},
      duration: 1,
      description: '',
      unlocked: true,
      attributes: { planet: 'mars' }
    };
    const project = new ctx.Project(config, 'test');
    expect(project.canStart()).toBe(false);
    expect(project.start(ctx.resources)).toBe(false);
  });

  test('active project stops after leaving planet', () => {
    const ctx = setup('mars');
    const config = {
      name: 'test',
      category: 'story',
      cost: {},
      duration: 1000,
      description: '',
      unlocked: true,
      attributes: { planet: 'mars' }
    };
    const project = new ctx.Project(config, 'test');
    expect(project.start(ctx.resources)).toBe(true);
    ctx.spaceManager.getCurrentPlanetKey = () => 'titan';
    project.update(1000);
    expect(project.isActive).toBe(false);
  });
});
