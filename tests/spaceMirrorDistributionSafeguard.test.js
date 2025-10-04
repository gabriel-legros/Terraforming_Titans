const numbers = require('../src/js/numbers.js');

global.Project = class { update() {} };
global.formatNumber = numbers.formatNumber;
global.toDisplayTemperature = numbers.toDisplayTemperature;
global.getTemperatureUnit = numbers.getTemperatureUnit;

const { SpaceMirrorFacilityProject } = require('../src/js/projects/SpaceMirrorFacilityProject.js');

afterAll(() => {
  delete global.Project;
  delete global.formatNumber;
  delete global.toDisplayTemperature;
  delete global.getTemperatureUnit;
});

describe('Space mirror distribution safeguard', () => {
  test('clamps invalid slider values each tick', () => {
    const project = new SpaceMirrorFacilityProject({ name: 'Space Mirror Facility', cost: {}, duration: 0 }, 'spaceMirrorFacility');
    const settings = project.mirrorOversightSettings;
    settings.distribution = { tropical: 1.2, temperate: -0.1, polar: 0.3, focus: 0.3, unassigned: 0.4 };
    project.update(1000);
    const dist = settings.distribution;
    const total = dist.tropical + dist.temperate + dist.polar + dist.focus + dist.unassigned;
    Object.values(dist).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
    expect(total).toBeCloseTo(1, 10);
  });
});
