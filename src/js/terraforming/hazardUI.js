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

  let initializeKessler = null;
  try {
    initializeKessler = initializeKesslerHazardUI;
  } catch (error) {
    initializeKessler = null;
  }

  if (initializeKessler && initializeKessler.call) {
    initializeKessler();
  }

  let initializePulsar = null;
  try {
    initializePulsar = initializePulsarHazardUI;
  } catch (error) {
    initializePulsar = null;
  }

  if (initializePulsar && initializePulsar.call) {
    initializePulsar();
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

  let updateKessler = null;
  try {
    updateKessler = updateKesslerHazardUI;
  } catch (error) {
    updateKessler = null;
  }

  if (updateKessler && updateKessler.call) {
    updateKessler(parameters.kessler);
  }

  let updatePulsar = null;
  try {
    updatePulsar = updatePulsarHazardUI;
  } catch (error) {
    updatePulsar = null;
  }

  if (updatePulsar && updatePulsar.call) {
    updatePulsar(parameters.pulsar);
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
