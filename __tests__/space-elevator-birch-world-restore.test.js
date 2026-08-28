const { createGameDom } = require('./helpers/jsdom-game-harness');

describe('Birch World Space Elevator restoration', () => {
  let dom;

  afterEach(() => {
    dom?.window?.close();
  });

  test('reapplies the spaceship metal waiver after restoring project state', async () => {
    dom = await createGameDom();
    const { window } = dom;
    const elevator = window.projectManager.projects.spaceElevator;
    const mining = window.projectManager.projects.oreSpaceMining;

    elevator.elevatorCount = 1;
    elevator.repeatCount = 1;
    elevator.isCompleted = true;
    elevator.applyCompletionEffect();

    const savedState = elevator.saveState();
    expect(mining.calculateSpaceshipCost().colony?.metal).toBeUndefined();

    elevator.clearCompletionEffects();
    elevator.elevatorCount = 0;
    elevator.repeatCount = 0;
    elevator.isCompleted = false;
    elevator.loadState(savedState);

    expect(elevator.elevatorCount).toBe(1);
    expect(mining.calculateSpaceshipCost().colony?.metal).toBeUndefined();
  }, 60000);
});
