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
  megaprojectsCard: null,
  megaprojectsSlider: null,
  megaprojectsAllocation: null,
  megaprojectsSummary: null,
  megaprojectsNotches: null,
  megaprojectsTooltip: null,
  megaprojectsTooltipContent: null,
};
let spaceSlidersUiSpaceManager = null;
let spaceSlidersUiInputBound = false;
let megaprojectsCoordinationInputBound = false;

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
  if (elements.megaprojectsCard) {
    spaceSlidersUiCache.megaprojectsCard = elements.megaprojectsCard;
  }
  if (elements.megaprojectsSlider) {
    spaceSlidersUiCache.megaprojectsSlider = elements.megaprojectsSlider;
  }
  if (elements.megaprojectsAllocation) {
    spaceSlidersUiCache.megaprojectsAllocation = elements.megaprojectsAllocation;
  }
  if (elements.megaprojectsSummary) {
    spaceSlidersUiCache.megaprojectsSummary = elements.megaprojectsSummary;
  }
  if (elements.megaprojectsNotches) {
    spaceSlidersUiCache.megaprojectsNotches = elements.megaprojectsNotches;
  }
  if (elements.megaprojectsTooltip) {
    spaceSlidersUiCache.megaprojectsTooltip = elements.megaprojectsTooltip;
  }
  if (elements.megaprojectsTooltipContent) {
    spaceSlidersUiCache.megaprojectsTooltipContent = elements.megaprojectsTooltipContent;
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
  const megaprojectsCard = document.getElementById('space-slider-megaprojects-coordination-card');
  const megaprojectsSlider = document.getElementById('space-slider-megaprojects-coordination-input');
  const megaprojectsAllocation = document.getElementById('space-slider-megaprojects-coordination-allocation');
  const megaprojectsSummary = document.getElementById('space-slider-megaprojects-coordination-summary');
  const megaprojectsNotches = document.getElementById('space-slider-megaprojects-coordination-notches');
  const megaprojectsTooltip = document.getElementById('space-slider-megaprojects-coordination-tooltip');
  const megaprojectsTooltipContent = attachDynamicInfoTooltip(megaprojectsTooltip, '');
  setSpaceSliderElements({
    section,
    card,
    slider,
    tickValue,
    notches,
    energyValue,
    productivityValue,
    tooltip,
    tooltipContent,
    megaprojectsCard,
    megaprojectsSlider,
    megaprojectsAllocation,
    megaprojectsSummary,
    megaprojectsNotches,
    megaprojectsTooltip,
    megaprojectsTooltipContent
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
  if (megaprojectsSlider && !megaprojectsCoordinationInputBound) {
    megaprojectsCoordinationInputBound = true;
    megaprojectsSlider.addEventListener('input', () => {
      if (!spaceSlidersUiSpaceManager) {
        return;
      }
      spaceSlidersUiSpaceManager.setSpaceSliderTick('megaprojectsCoordination', megaprojectsSlider.value);
      projectManager.updateProjectDurations();
      artificialManager.refreshActiveProjectDuration();
      updateSpaceSlidersUI({ space: spaceSlidersUiSpaceManager });
    });
  }
  renderSpaceSliderNotches(notches);
  renderSpaceSliderNotches(megaprojectsNotches);
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

function renderSpaceSliderNotches(notches) {
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
  if (spaceSlidersUiCache.megaprojectsCard) {
    spaceSlidersUiCache.megaprojectsCard.classList.toggle('hidden', !isMegaprojectsCoordinationUnlocked(space));
  }
  if (isCylindersHopeUnlocked(space)) {
    const tick = getCylindersHopeTick(space);
    const cylinders = Math.max(0, Number(space?.getOneillCylinderCount?.() || 0));
    const perCylinder = getCylindersHopeEnergyPerCylinderPerSecond(tick);
    const totalEnergy = getCylindersHopeTotalDesiredEnergyPerSecond(space);
    const productivity = tick <= 0 ? 1 : space.getSpaceSliderRuntimeProductivity('cylindersHope');
    const worldsPerSector = getCylindersHopeWarpGateWorldBonusPerSector(space, galaxyManager) * productivity;
    const perCylinderManufacturing = tick <= 0 ? 0 : CYLINDERS_HOPE_MANUFACTURING_POP_PER_CYLINDER * (tick / 10) * productivity;
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
    setSpaceSlidersTooltip(t(
      'ui.space.spaceSliders.cylindersHope.tooltip',
      null,
      "0-10 slider. Tick 0: disabled. Tick 1: 1Q space energy/s per O'Neill cylinder. Each additional tick multiplies this by 10. Manufacturing and Warp Gate Network bonuses are scaled by this slider's space-energy productivity."
    ));
  }
  if (isMegaprojectsCoordinationUnlocked(space)) {
    const megaprojectsAllocation = getMegaprojectsCoordinationAllocation(space);
    const advancedResearchAllocation = 100 - megaprojectsAllocation;
    const megaprojectSpeed = getMegaprojectsCoordinationMegaprojectSpeedMultiplier(space);
    const advancedResearchMultiplier = getMegaprojectsCoordinationAdvancedResearchMultiplier(space);
    if (spaceSlidersUiCache.megaprojectsSlider && document.activeElement !== spaceSlidersUiCache.megaprojectsSlider) {
      spaceSlidersUiCache.megaprojectsSlider.value = String(megaprojectsAllocation);
    }
    if (spaceSlidersUiCache.megaprojectsAllocation) {
      spaceSlidersUiCache.megaprojectsAllocation.textContent = `${megaprojectsAllocation} / ${advancedResearchAllocation}`;
    }
    if (spaceSlidersUiCache.megaprojectsSummary) {
      spaceSlidersUiCache.megaprojectsSummary.textContent = t(
        'ui.space.spaceSliders.megaprojectsCoordination.summary',
        {
          megaprojects: megaprojectsAllocation,
          megaprojectSpeed: formatNumber(megaprojectSpeed, false, 1),
          advancedResearch: advancedResearchAllocation,
          advancedResearchMultiplier: formatNumber(advancedResearchMultiplier, false, 1),
        },
        'Megaprojects: {megaprojects}% (x{megaprojectSpeed} speed) | Advanced research: {advancedResearch}% (x{advancedResearchMultiplier} gain)'
      );
    }
    spaceSlidersUiCache.megaprojectsTooltipContent.textContent = t(
      'ui.space.spaceSliders.megaprojectsCoordination.tooltip',
      null,
      'Allocates UHF coordination between megaprojects and advanced research in 5% steps. Megaproject speed affects Mega, Giga, and Tera project expansion plus artificial-world construction. Active durations adjust immediately without changing completion percentage.'
    );
  }
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
