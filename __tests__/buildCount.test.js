const { multiplyByTen, divideByTen, getRoundedBuildCount, MAX_BUILD_COUNT } = require('../src/js/buildCount');

describe('buildCount helpers', () => {
  test('caps multiplied build count at 100No', () => {
    expect(multiplyByTen(MAX_BUILD_COUNT / 10)).toBe(MAX_BUILD_COUNT);
    expect(multiplyByTen(MAX_BUILD_COUNT)).toBe(MAX_BUILD_COUNT);
  });

  test('divideByTen floors and never drops below one', () => {
    expect(divideByTen(99)).toBe(9);
    expect(divideByTen(10)).toBe(1);
    expect(divideByTen(1)).toBe(1);
  });

  test('getRoundedBuildCount rounds up to the next build multiple', () => {
    expect(getRoundedBuildCount(157, 100)).toBe(43);
    expect(getRoundedBuildCount(200, 100)).toBe(100);
    expect(getRoundedBuildCount(0, 100)).toBe(100);
  });
});
