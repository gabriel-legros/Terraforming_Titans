function initializeHazardUI() {
  let initializeHazardous = null;
  try {
    initializeHazardous = initializeHazardousBiomassUI;
  } catch (error) {
    initializeHazardous = null;
  }

  if (initializeHazardous && initializeHazardous.call) {
    initializeHazardous();
  }

  let initializeGarbage = null;
  try {
    initializeGarbage = initializeGarbageHazardUI;
  } catch (error) {
    initializeGarbage = null;
  }

  if (initializeGarbage && initializeGarbage.call) {
    initializeGarbage();
  }
}

function updateHazardUI(parameters = {}) {
  let updateGarbage = null;
  try {
    updateGarbage = updateGarbageHazardUI;
  } catch (error) {
    updateGarbage = null;
  }

  if (updateGarbage && updateGarbage.call) {
    updateGarbage(parameters.garbage);
  }

  let updateHazardous = null;
  try {
    updateHazardous = updateHazardousBiomassUI;
  } catch (error) {
    updateHazardous = null;
  }

  if (updateHazardous && updateHazardous.call) {
    updateHazardous(parameters);
  }
}

try {
  window.initializeHazardUI = initializeHazardUI;
  window.updateHazardUI = updateHazardUI;
} catch (error) {
  // Window not available (tests)
}

try {
  module.exports = {
    initializeHazardUI,
    updateHazardUI
  };
} catch (error) {
  // Module system not available in browser
}

