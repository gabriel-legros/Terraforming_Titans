const { DayNightCycle, rotationPeriodToDuration } = require('../src/js/day-night-cycle.js');

describe('DayNightCycle retrograde rotation', () => {
  test('alternates day and night when rotation period is negative', () => {
    const { duration, direction } = rotationPeriodToDuration(-24);
    expect(direction).toBe(-1);

    const cycle = new DayNightCycle(duration, direction);

    expect(cycle.isDay()).toBe(true);

    cycle.update(duration / 2);
    expect(cycle.isNight()).toBe(true);

    cycle.update(duration / 2);
    expect(cycle.isDay()).toBe(true);
  });
});
