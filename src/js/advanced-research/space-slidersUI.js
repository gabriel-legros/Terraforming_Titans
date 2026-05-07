const spaceSlidersUiCache = {
  section: null,
  card: null,
  slider: null,
  tickValue: null,
  energyValue: null,
  productivityValue: null,
  notches: null,
  tooltip: null,
  tooltipContent: null,
};
let spaceSlidersUiSpaceManager = null;
let spaceSlidersUiInputBound = false;

function setSpaceSliderElements(elements = {}) {
  if (elements.section) {
    spaceSlidersUiCache.section = elements.section;
  }
  if (elements.card) {
    spaceSlidersUiCache.card = elements.card;
  }
  if (elements.slider) {
    spaceSlidersUiCache.slider = elements.slider;
  }
  if (elements.tickValue) {
    spaceSlidersUiCache.tickValue = elements.tickValue;
  }
  if (elements.energyValue) {
    spaceSlidersUiCache.energyValue = elements.energyValue;
  }
  if (elements.productivityValue) {
    spaceSlidersUiCache.productivityValue = elements.productivityValue;
  }
  if (elements.notches) {
    spaceSlidersUiCache.notches = elements.notches;
  }
  if (elements.tooltip) {
    spaceSlidersUiCache.tooltip = elements.tooltip;
  }
  if (elements.tooltipContent) {
    spaceSlidersUiCache.tooltipContent = elements.tooltipContent;
  }
  return spaceSlidersUiCache;
}

function initializeSpaceSlidersUI(space) {
  spaceSlidersUiSpaceManager = space || null;
  const section = document.getElementById('space-sliders-section');
  const card = document.getElementById('space-slider-cylinders-hope-card');
  const slider = document.getElementById('space-slider-cylinders-hope-input');
  const tickValue = document.getElementById('space-slider-cylinders-hope-tick');
  const notches = document.getElementById('space-slider-cylinders-hope-notches');
  const energyValue = document.getElementById('space-slider-cylinders-hope-energy');
  const productivityValue = document.getElementById('space-slider-cylinders-hope-productivity');
  const tooltip = document.getElementById('space-slider-cylinders-hope-tooltip');
  const tooltipContent = attachDynamicInfoTooltip(tooltip, '');
  setSpaceSliderElements({
    section,
    card,
    slider,
    tickValue,
    notches,
    energyValue,
    productivityValue,
    tooltip,
    tooltipContent
  });
  if (slider && !spaceSlidersUiInputBound) {
    spaceSlidersUiInputBound = true;
    slider.addEventListener('input', () => {
      if (!spaceSlidersUiSpaceManager) {
        return;
      }
      spaceSlidersUiSpaceManager.setSpaceSliderTick('cylindersHope', slider.value);
      updateSpaceSlidersUI({ space: spaceSlidersUiSpaceManager });
    });
  }
  renderSpaceSliderNotches();
}

function setSpaceSlidersUIManager(space) {
  spaceSlidersUiSpaceManager = space || null;
}

function setSpaceSlidersTooltip(text) {
  if (spaceSlidersUiCache.tooltipContent) {
    spaceSlidersUiCache.tooltipContent.textContent = text;
  } else if (spaceSlidersUiCache.tooltip) {
    spaceSlidersUiCache.tooltip.title = text;
  }
}

function renderSpaceSliderNotches() {
  const notches = spaceSlidersUiCache.notches;
  if (!notches || notches.childElementCount > 0) {
    return;
  }
  for (let index = 0; index <= 10; index += 1) {
    const notch = document.createElement('span');
    notch.className = 'space-slider-notch';
    notch.style.left = `${index * 10}%`;
    notches.appendChild(notch);
  }
}

function updateSpaceSlidersUI({ space } = {}) {
  const anyEnabled = getAnySpaceSliderEnabled(space);
  if (spaceSlidersUiCache.section) {
    spaceSlidersUiCache.section.classList.toggle('hidden', !anyEnabled);
  }
  if (spaceSlidersUiCache.card) {
    spaceSlidersUiCache.card.classList.toggle('hidden', !isCylindersHopeUnlocked(space));
  }
  if (!isCylindersHopeUnlocked(space)) {
    return;
  }
  const tick = getCylindersHopeTick(space);
  const cylinders = Math.max(0, Number(space?.getOneillCylinderCount?.() || 0));
  const perCylinder = getCylindersHopeEnergyPerCylinderPerSecond(tick);
  const totalEnergy = getCylindersHopeTotalDesiredEnergyPerSecond(space);
  const productivity = tick <= 0 ? 1 : space.getSpaceSliderRuntimeProductivity('cylindersHope');
  const worldsPerSector = getCylindersHopeWarpGateWorldBonusPerSector(space, galaxyManager) * productivity;
  const perCylinderManufacturing = tick <= 0 ? 0 : 1e12 * (tick / 10) * productivity;
  const totalManufacturing = cylinders * perCylinderManufacturing;
  if (spaceSlidersUiCache.slider && document.activeElement !== spaceSlidersUiCache.slider) {
    spaceSlidersUiCache.slider.value = String(tick);
  }
  if (spaceSlidersUiCache.tickValue) {
    spaceSlidersUiCache.tickValue.textContent = String(tick);
  }
  if (spaceSlidersUiCache.energyValue) {
    const line = t(
      'ui.space.spaceSliders.cylindersHope.combinedLine',
      {
        energyPerCylinder: formatNumber(perCylinder, true),
        energyTotal: formatNumber(totalEnergy, true),
        manufacturingPerCylinder: formatNumber(perCylinderManufacturing, true),
        manufacturingTotal: formatNumber(totalManufacturing, true),
        worldsPerSector: formatNumber(worldsPerSector, true, 2),
        productivity: formatNumber(productivity * 100, false, 2),
      },
      'Energy Cost: {energyPerCylinder} per cylinder/s, total {energyTotal}/s | Manufacturing Population Gain: {manufacturingPerCylinder} per cylinder, total {manufacturingTotal} | Worlds per Sector: {worldsPerSector} | Productivity: {productivity}%'
    );
    spaceSlidersUiCache.energyValue.textContent = line;
  }
  if (spaceSlidersUiCache.productivityValue) {
    spaceSlidersUiCache.productivityValue.textContent = '';
  }
  const tooltipText = t(
    'ui.space.spaceSliders.cylindersHope.tooltip',
    null,
    "0-10 slider. Tick 0: disabled. Tick 1: 1Q space energy/s per O'Neill cylinder. Each additional tick multiplies this by 10. Manufacturing and Warp Gate Network bonuses are scaled by this slider's space-energy productivity."
  );
  setSpaceSlidersTooltip(tooltipText);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setSpaceSliderElements,
    initializeSpaceSlidersUI,
    setSpaceSlidersUIManager,
    updateSpaceSlidersUI
  };
}

if (typeof window !== 'undefined') {
  window.setSpaceSliderElements = setSpaceSliderElements;
  window.initializeSpaceSlidersUI = initializeSpaceSlidersUI;
  window.setSpaceSlidersUIManager = setSpaceSlidersUIManager;
  window.updateSpaceSlidersUI = updateSpaceSlidersUI;
}
