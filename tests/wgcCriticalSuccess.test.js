const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC critical success', () => {
  class MockResource extends EffectableEntity {
    constructor(v=0){ super({description:'aa'}); this.value=v; }
    increase(v){ this.value += v; }
  }

  beforeEach(() => {
    global.resources = { special: { alienArtifact: new MockResource(0) } };
  });

  test('individual roll of 20 always succeeds and grants an artifact', () => {
    const wgc = new WarpGateCommand();
    wgc.recruitMember(0, 0, WGCTeamMember.create('A', '', 'Soldier', {}));
    const event = { name: 'Test', type: 'individual', skill: 'athletics' };
    wgc.roll = () => ({ sum: 20, rolls: [20] });
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const res = wgc.resolveEvent(0, event);
    expect(res.success).toBe(true);
    expect(res.artifact).toBe(true);
    expect(wgc.operations[0].artifacts).toBe(1);
    expect(wgc.operations[0].summary).toMatch(/Critical Success/);
    Math.random.mockRestore();
  });
});
