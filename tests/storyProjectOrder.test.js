const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EffectableEntity = require('../src/js/effectable-entity.js');

describe('default story project order', () => {
  test('story projects appear in reverse order', () => {
    const ctx = { console, EffectableEntity };
    vm.createContext(ctx);

    const projectsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'projects.js'), 'utf8');
    vm.runInContext(projectsCode + '; this.ProjectManager = ProjectManager;', ctx);
    const paramsCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'project-parameters.js'), 'utf8');
    const progressCode = fs.readFileSync(path.join(__dirname, '..', 'src/js', 'progress-data.js'), 'utf8');
    vm.runInContext(paramsCode + progressCode + '; this.projectParameters = projectParameters;', ctx);

    ctx.projectManager = new ctx.ProjectManager();
    ctx.projectManager.initializeProjects(ctx.projectParameters);

    const order = ctx.projectManager.getProjectStatuses()
      .filter(p => p.category === 'story')
      .map(p => p.name);

    expect(order.slice(0, 4)).toEqual([
      'interrogate_alien',
      'sticky_dust_trap',
      'triangulate_attack',
      'earthProbe'
    ]);
  });
});
