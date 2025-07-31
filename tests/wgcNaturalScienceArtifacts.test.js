const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC Natural Science artifact bonus', () => {
  beforeEach(() => {
    global.resources = { special: { alienArtifact: { increase: jest.fn(), value: 0 } } };
  });

  test('Natural Science challenges grant double artifacts', () => {
    const wgc = new WarpGateCommand();
    for (let i = 0; i < 4; i++) {
      const m = WGCTeamMember.create('A' + i, '', 'Natural Scientist', {});
      m.wit = 10;
      wgc.recruitMember(0, i, m);
    }
    wgc.roll = () => ({ sum: 20, rolls: [20] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    wgc.startOperation(0, 2);
    const ev = { name: 'Natural Science challenge', type: 'science', specialty: 'Natural Scientist', artifactMultiplier: 2 };
    wgc.resolveEvent(0, ev);
    expect(wgc.operations[0].artifacts).toBeCloseTo(2.4);
    Math.random.mockRestore();
  });
});
