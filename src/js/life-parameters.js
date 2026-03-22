const lifeParameters = {
    lichen: {
        displayName: '',
        minTemperature : 253,
        maxTemperature : 313,
        minRainfall : 0,
        growthRate : 0.0004
    },
    grass: {
        displayName: '',
        minTemperature : 278,
        maxTemperature : 308,
        minRainfall : 1e6,
        growthRate : 0.0008
    },
    trees: {
        displayName: '',
        minTemperature : 288,
        maxTemperature : 308,
        minRainfall : 1e9,
        growthRate : 0.0012
    }
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = lifeParameters;
}
