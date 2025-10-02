const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC artifact stance', () => {
  beforeEach(() => {
    global.resources = { special: { alienArtifact: { increase: jest.fn(), value: 0 } } };
  });

  test('Careful doubles artifact chance and delays next event', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      wgc.recruitMember(0, i, WGCTeamMember.create('A'+i, '', 'Natural Scientist', {}));
    }
    wgc.roll = () => ({ sum: 20, rolls: [20] });
    const ev = { name: 'Natural Science challenge', type: 'science', specialty: 'Natural Scientist' };
    jest.spyOn(Math, 'random').mockReturnValue(0.15);
    wgc.startOperation(0, 0);
    let res = wgc.resolveEvent(0, ev);
    wgc.operations[0].nextEvent += 60; // normal increment
    expect(res.artifact).toBe(false);
    expect(wgc.operations[0].nextEvent).toBe(120);
    wgc.setArtifactStance(0, 'Careful');
    res = wgc.resolveEvent(0, ev);
    wgc.operations[0].nextEvent += 60;
    expect(res.artifact).toBe(true);
    expect(wgc.operations[0].nextEvent).toBe(300);
    Math.random.mockRestore();
  });
});
