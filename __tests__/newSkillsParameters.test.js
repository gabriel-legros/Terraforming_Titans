const skillParams = require('../skills-parameters.js');

describe('new skill parameter definitions', () => {
  test('project_speed skill exists with correct config', () => {
    const skill = skillParams.project_speed;
    expect(skill).toBeDefined();
    expect(skill.maxRank).toBe(5);
    expect(skill.requires).toContain('maintenance_reduction');
  });

  test('life_design_points skill exists with correct config', () => {
    const skill = skillParams.life_design_points;
    expect(skill).toBeDefined();
    expect(skill.maxRank).toBe(5);
    expect(skill.requires).toContain('scanning_speed');
  });
});
