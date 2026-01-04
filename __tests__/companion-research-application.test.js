describe('companion research travel rewards', () => {
  beforeEach(() => {
    global.window = global;
    require('../src/js/companion-research.js');
  });

  afterEach(() => {
    delete global.window.applyCompanionResearchTravelRewards;
    delete global.window;
    delete global.researchManager;
    delete global.projectManager;
    delete global.spaceManager;
    delete global.buildings;
    jest.resetModules();
  });

  it('completes space mirror research and seeds inactive mirrors', () => {
    const companionMirror = { isResearched: true };
    const companionSatellite = { isResearched: false };
    global.researchManager = {
      getResearchById: jest.fn((id) => (id === 'companion_mirror' ? companionMirror : companionSatellite)),
    };
    const mirrorProject = { enable: jest.fn(), isCompleted: false, complete: jest.fn() };
    global.projectManager = { projects: { spaceMirrorFacility: mirrorProject, satellite: { update: jest.fn() } } };
    global.spaceManager = { getTerraformedPlanetCount: jest.fn(() => 2.6) };
    const mirrorBuilding = { count: 0, active: 4, productivity: 1, updateResourceStorage: jest.fn() };
    global.buildings = { spaceMirror: mirrorBuilding };

    window.applyCompanionResearchTravelRewards();

    expect(mirrorProject.enable).toHaveBeenCalled();
    expect(mirrorProject.complete).toHaveBeenCalled();
    expect(mirrorBuilding.count).toBe(2000);
    expect(mirrorBuilding.active).toBe(0);
    expect(mirrorBuilding.productivity).toBe(0);
    expect(mirrorBuilding.updateResourceStorage).toHaveBeenCalled();
  });

  it('caps companion satellite repeat count based on terraformed worlds', () => {
    const companionMirror = { isResearched: false };
    const companionSatellite = { isResearched: true };
    global.researchManager = {
      getResearchById: jest.fn((id) => (id === 'companion_mirror' ? companionMirror : companionSatellite)),
      completeResearchInstant: jest.fn(),
    };
    const satelliteProject = { repeatCount: 0, maxRepeatCount: 3, update: jest.fn() };
    global.projectManager = { projects: { satellite: satelliteProject, spaceMirrorFacility: { enable: jest.fn(), isCompleted: true, complete: jest.fn() } } };
    global.spaceManager = { getTerraformedPlanetCount: jest.fn(() => 5) };
    global.buildings = { spaceMirror: { updateResourceStorage: jest.fn() } };

    window.applyCompanionResearchTravelRewards();

    expect(satelliteProject.repeatCount).toBe(3);
    expect(satelliteProject.update).toHaveBeenCalledWith(0);
  });
});
