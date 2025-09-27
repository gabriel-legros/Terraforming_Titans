const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { WGCTeamMember } = require('../src/js/team-member.js');
const { WarpGateCommand } = require('../src/js/wgc.js');

describe('WGC operation events', () => {
  class MockResource extends EffectableEntity {
    constructor(v=0){ super({description:'aa'}); this.value=v; }
    increase(v){ this.value += v; }
  }

  beforeEach(() => {
    global.resources = { special: { alienArtifact: new MockResource(0) } };
  });

  test('events grant xp and artifacts on success', () => {
    const wgc = new WarpGateCommand();
    for(let i=0;i<4;i++){
      const m = WGCTeamMember.create('A'+i,'','Soldier',{});
      m.power = 10; m.athletics = 10; m.wit = 10;
      wgc.recruitMember(0,i,m);
    }
    wgc.roll = () => ({ sum: 20, rolls: [20] });
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(wgc.startOperation(0)).toBe(true);
    wgc.update(540000); // 9 minutes
    expect(wgc.operations[0].successes).toBe(9);
    expect(wgc.operations[0].artifacts).toBe(9);
    wgc.update(60000); // final minute
    expect(global.resources.special.alienArtifact.value).toBe(10);
    wgc.teams[0].forEach(m => expect(m.xp).toBe(9));
    Math.random.mockRestore();
  });
});
