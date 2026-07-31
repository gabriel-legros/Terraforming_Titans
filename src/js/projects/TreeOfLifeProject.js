const TREE_OF_LIFE_COLONIST_CAPACITY_COEFFICIENT = 0.01;
const TREE_OF_LIFE_COLONIST_CAPACITY_MAX_DENSITY_T_PER_M2 = 10000;
const TREE_OF_LIFE_DENSITY_THRESHOLD_T_PER_M2 = 10;
const TREE_OF_LIFE_NUTRIENT_PER_BIOMASS = 1e-5;
const TREE_OF_LIFE_MAX_NUTRIENT_MULTIPLIER = 5;
const TREE_OF_LIFE_GROWTH_EFFECT_ID = 'tree-of-life-growth-controller';

function getTreeOfLifeText(path, fallback, vars) {
  return t(`ui.projects.treeOfLife.${path}`, vars, fallback);
}

class TreeOfLifeProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.storage = { colony: { colonists: 0 } };
    this.uiElements = null;
    this.lastNutrientConsumptionRate = 0;
    this.lastResearchRate = 0;
    this.lastDensityMultiplier = 1;
    this.lastNutrientMultiplier = 1;
  }

  shouldHideStartBar() {
    return true;
  }

  renderAutomationUI(container) {
    const children = Array.from(container.children);
    children.forEach((child) => {
      child.style.display = 'none';
    });
  }

  canStart() {
    return false;
  }

  start() {
    return false;
  }

  getActiveYggieLand() {
    return this.unlocked ? Math.max(0, buildings.yggieLand.activeNumber) : 0;
  }

  getGeometricLand() {
    return Math.max(0, resolveWorldGeometricLand(terraforming, resources.surface.land));
  }

  getLandCoverageMultiplier() {
    const geometricLand = this.getGeometricLand();
    return geometricLand > 0
      ? Math.max(0, Math.min(1, this.getActiveYggieLand() / geometricLand))
      : 0;
  }

  getBiomassDensity() {
    return Math.max(0, getLifeBiomassDensity(terraforming));
  }

  getDensityGrowthMultiplier() {
    const density = this.getBiomassDensity();
    if (density <= TREE_OF_LIFE_DENSITY_THRESHOLD_T_PER_M2) {
      return 1;
    }
    return Math.pow(
      2,
      -Math.log10(density / TREE_OF_LIFE_DENSITY_THRESHOLD_T_PER_M2)
    );
  }

  getStorageContribution(category, resourceName) {
    if (!this.unlocked || category !== 'colony' || resourceName !== 'colonists') {
      return 0;
    }
    return TREE_OF_LIFE_COLONIST_CAPACITY_COEFFICIENT
      * this.getActiveYggieLand()
      * Math.min(this.getBiomassDensity(), TREE_OF_LIFE_COLONIST_CAPACITY_MAX_DENSITY_T_PER_M2);
  }

  getColonistCapacity() {
    return this.getStorageContribution('colony', 'colonists');
  }

  getResidentCount() {
    const totalCapacity = Math.max(0, resources.colony.colonists.cap || 0);
    const fillRatio = totalCapacity > 0
      ? Math.max(0, Math.min(1, resources.colony.colonists.value / totalCapacity))
      : 0;
    return this.getColonistCapacity() * fillRatio;
  }

  installLifeGrowthController() {
    lifeManager.addAndReplace({
      type: 'yggieGrowthController',
      controller: this,
      effectId: TREE_OF_LIFE_GROWTH_EFFECT_ID,
      sourceId: this.name,
    });
  }

  getLifeGrowthControl(totalPotentialGrowth) {
    const densityMultiplier = this.getDensityGrowthMultiplier();
    const baseNutrientRequirement = totalPotentialGrowth * TREE_OF_LIFE_NUTRIENT_PER_BIOMASS;
    const maximumNutrientRequirement = baseNutrientRequirement * TREE_OF_LIFE_MAX_NUTRIENT_MULTIPLIER;
    const nutrientMultiplier = baseNutrientRequirement > 0
      ? Math.max(
          0,
          Math.min(
            TREE_OF_LIFE_MAX_NUTRIENT_MULTIPLIER,
            resources.special.yggieNutrients.value / baseNutrientRequirement
          )
        )
      : 1;
    const adjustedPotentialGrowth = totalPotentialGrowth * nutrientMultiplier;

    this.lastDensityMultiplier = densityMultiplier;
    this.lastNutrientMultiplier = nutrientMultiplier;

    return {
      adjustedPotentialGrowth,
      nutrientMultiplier,
      densityMultiplier,
      nutrientShortfall: Math.max(0, maximumNutrientRequirement - resources.special.yggieNutrients.value),
      nutrientLimited: totalPotentialGrowth > 0
        && nutrientMultiplier < TREE_OF_LIFE_MAX_NUTRIENT_MULTIPLIER,
    };
  }

  commitLifeGrowth(actualGrowth, growthControl, seconds) {
    if (!growthControl || !(actualGrowth > 0) || !(seconds > 0)) {
      this.lastNutrientConsumptionRate = 0;
      return;
    }
    const nutrientResource = resources.special.yggieNutrients;
    const nutrientCost = Math.min(
      nutrientResource.value,
      actualGrowth * TREE_OF_LIFE_NUTRIENT_PER_BIOMASS
    );
    nutrientResource.value -= nutrientCost;
    this.lastNutrientConsumptionRate = nutrientCost / seconds;
    nutrientResource.modifyRate(-this.lastNutrientConsumptionRate, this.getRateSource(), 'project');
  }

  produceResearch(deltaTime, accumulatedChanges) {
    const seconds = deltaTime / 1000;
    this.lastResearchRate = this.getResidentCount();
    if (!(this.lastResearchRate > 0) || !(seconds > 0)) {
      return;
    }
    const researchGain = this.lastResearchRate * seconds;
    accumulatedChanges.colony.research += researchGain;
    resources.colony.research.modifyRate(this.lastResearchRate, this.getRateSource(), 'project');
  }

  applyCostAndGain(deltaTime, accumulatedChanges) {
    if (!this.unlocked) {
      return;
    }
    this.installLifeGrowthController();
    this.produceResearch(deltaTime, accumulatedChanges);
  }

  createSummaryBox(container, labelText, tooltipText = '') {
    const box = document.createElement('div');
    box.classList.add('stat-item', 'project-summary-box');
    const labelRow = document.createElement('div');
    labelRow.classList.add('tree-of-life-summary-label-row');
    const label = document.createElement('span');
    label.classList.add('stat-label');
    label.textContent = labelText;
    labelRow.appendChild(label);
    const value = document.createElement('span');
    if (tooltipText) {
      const icon = document.createElement('span');
      icon.classList.add('info-tooltip-icon');
      icon.innerHTML = '&#9432;';
      value._tooltipContent = attachDynamicInfoTooltip(icon, tooltipText);
      labelRow.appendChild(icon);
    }
    value.classList.add('stat-value');
    box.append(labelRow, value);
    container.appendChild(box);
    return value;
  }

  createSection(container, titleText) {
    const section = document.createElement('section');
    section.classList.add('tree-of-life-section');
    const header = document.createElement('div');
    header.classList.add('tree-of-life-section-header');
    header.textContent = titleText;
    const grid = document.createElement('div');
    grid.classList.add('stats-grid', 'project-summary-grid', 'tree-of-life-summary-grid');
    section.append(header, grid);
    container.appendChild(section);
    return grid;
  }

  renderUI(container) {
    const layout = document.createElement('div');
    layout.classList.add('tree-of-life-layout');
    const sections = document.createElement('div');
    sections.classList.add('tree-of-life-sections');

    const canopyGrid = this.createSection(
      sections,
      getTreeOfLifeText('sections.canopy', 'Canopy and Land')
    );
    const activeLand = this.createSummaryBox(
      canopyGrid,
      getTreeOfLifeText('summary.activeLand', 'Active Yggie Land'),
      getTreeOfLifeText('tooltips.terraformingBuildingSource', 'Can be provided by a terraforming building')
    );
    const coverage = this.createSummaryBox(
      canopyGrid,
      getTreeOfLifeText('summary.coverage', 'Supported Surface'),
      getTreeOfLifeText('tooltips.coverage', 'Active Yggie Land determines the fraction of the planetary surface where Yggie biomass can grow.')
    );
    const density = this.createSummaryBox(canopyGrid, getTreeOfLifeText('summary.density', 'Biomass Density'));
    const densityMultiplier = this.createSummaryBox(
      canopyGrid,
      getTreeOfLifeText('summary.densityMultiplier', 'Density Growth'),
      getTreeOfLifeText('tooltips.densityMultiplier', 'Growth is normal through 10 t/m^2, then halves for every additional order of magnitude.')
    );

    const habitationGrid = this.createSection(
      sections,
      getTreeOfLifeText('sections.habitation', 'Habitation and Research')
    );
    const capacity = this.createSummaryBox(
      habitationGrid,
      getTreeOfLifeText('summary.capacity', 'Colonist Capacity'),
      getTreeOfLifeText(
        'tooltips.capacityFormula',
        'Colonist capacity = {coefficient} × {land} active Yggie Land × min({density}, {densityCap}) t/m^2 biomass density = {capacity}.',
        {
          coefficient: TREE_OF_LIFE_COLONIST_CAPACITY_COEFFICIENT,
          land: 0,
          density: 0,
          densityCap: TREE_OF_LIFE_COLONIST_CAPACITY_MAX_DENSITY_T_PER_M2,
          capacity: 0,
        }
      )
    );
    const residents = this.createSummaryBox(habitationGrid, getTreeOfLifeText('summary.residents', 'Tree Residents'));
    const occupancy = this.createSummaryBox(habitationGrid, getTreeOfLifeText('summary.occupancy', 'World Occupancy'));
    const research = this.createSummaryBox(habitationGrid, getTreeOfLifeText('summary.research', 'Research Output'));

    const nutrientGrid = this.createSection(
      sections,
      getTreeOfLifeText('sections.nutrients', 'Nutrients')
    );
    const nutrients = this.createSummaryBox(
      nutrientGrid,
      getTreeOfLifeText('summary.nutrients', 'Yggie Nutrients'),
      getTreeOfLifeText('tooltips.terraformingBuildingSource', 'Can be provided by a terraforming building')
    );
    const nutrientConsumption = this.createSummaryBox(nutrientGrid, getTreeOfLifeText('summary.nutrientConsumption', 'Growth Consumption'));
    const nutrientMultiplier = this.createSummaryBox(
      nutrientGrid,
      getTreeOfLifeText('summary.nutrientMultiplier', 'Nutrient Growth'),
      getTreeOfLifeText(
        'tooltips.nutrientMultiplier',
        'Provides between 0 and {maximum} growth multiplier based on nutrients being available.',
        {
          maximum: TREE_OF_LIFE_MAX_NUTRIENT_MULTIPLIER,
        }
      )
    );
    const totalMultiplier = this.createSummaryBox(nutrientGrid, getTreeOfLifeText('summary.totalMultiplier', 'Combined Growth'));

    layout.appendChild(sections);
    container.appendChild(layout);

    this.uiElements = {
      card: layout,
      activeLand,
      coverage,
      density,
      densityMultiplier,
      capacity,
      residents,
      occupancy,
      research,
      nutrients,
      nutrientConsumption,
      nutrientMultiplier,
      totalMultiplier,
    };
    this.updateUI();
  }

  updateUI() {
    if (!this.uiElements) {
      return;
    }
    const activeLand = this.getActiveYggieLand();
    const coverage = this.getLandCoverageMultiplier();
    const density = this.getBiomassDensity();
    const capacity = this.getColonistCapacity();
    const residents = this.getResidentCount();
    const totalCapacity = Math.max(0, resources.colony.colonists.cap || 0);
    const occupancy = totalCapacity > 0
      ? Math.max(0, Math.min(1, resources.colony.colonists.value / totalCapacity))
      : 0;

    this.uiElements.activeLand.textContent = formatNumber(activeLand, true, 3);
    this.uiElements.coverage.textContent = getTreeOfLifeText('values.percent', '{value}%', {
      value: formatNumber(coverage * 100, false, 2),
    });
    this.uiElements.density.textContent = getTreeOfLifeText('values.density', '{value} t/m^2', {
      value: formatNumber(density, true, 3),
    });
    this.uiElements.densityMultiplier.textContent = getTreeOfLifeText('values.multiplier', 'x{value}', {
      value: formatNumber(this.getDensityGrowthMultiplier(), false, 3),
    });
    this.uiElements.capacity.textContent = formatNumber(capacity, true, 3);
    this.uiElements.capacity._tooltipContent.textContent = getTreeOfLifeText(
      'tooltips.capacityFormula',
      'Colonist capacity = {coefficient} × {land} active Yggie Land × min({density}, {densityCap}) t/m^2 biomass density = {capacity}.',
      {
        coefficient: TREE_OF_LIFE_COLONIST_CAPACITY_COEFFICIENT,
        land: formatNumber(activeLand, true, 3),
        density: formatNumber(density, true, 3),
        densityCap: formatNumber(TREE_OF_LIFE_COLONIST_CAPACITY_MAX_DENSITY_T_PER_M2, true, 3),
        capacity: formatNumber(capacity, true, 3),
      }
    );
    this.uiElements.residents.textContent = formatNumber(residents, true, 3);
    this.uiElements.occupancy.textContent = getTreeOfLifeText('values.percent', '{value}%', {
      value: formatNumber(occupancy * 100, false, 2),
    });
    this.uiElements.research.textContent = getTreeOfLifeText('values.perSecond', '{value}/s', {
      value: formatNumber(this.lastResearchRate, true, 3),
    });
    this.uiElements.nutrients.textContent = formatNumber(resources.special.yggieNutrients.value, true, 3);
    this.uiElements.nutrientConsumption.textContent = getTreeOfLifeText('values.perSecond', '{value}/s', {
      value: formatNumber(this.lastNutrientConsumptionRate, true, 3),
    });
    this.uiElements.nutrientMultiplier.textContent = getTreeOfLifeText('values.multiplier', 'x{value}', {
      value: formatNumber(this.lastNutrientMultiplier, false, 3),
    });
    this.uiElements.totalMultiplier.textContent = getTreeOfLifeText('values.multiplier', 'x{value}', {
      value: formatNumber(this.lastDensityMultiplier * this.lastNutrientMultiplier, false, 3),
    });
  }

  loadState(state) {
    super.loadState(state);
    const saved = state.treeOfLife || {};
    resources.special.yggieNutrients.value += Math.max(0, saved.nutrientPool || 0);
  }
}

window.TreeOfLifeProject = TreeOfLifeProject;
