class ScriptVariableRegistry {
  constructor() {
    this.sources = [
      { id: 'constant', label: 'Constant' },
      { id: 'buildings', label: 'Buildings' },
      { id: 'colony', label: 'Colony' },
      { id: 'projects', label: 'Special Projects' },
      { id: 'terraforming', label: 'Terraforming' },
      { id: 'celestial', label: 'Celestial Parameters' },
      { id: 'hazards', label: 'Hazards' },
      { id: 'research', label: 'Research' },
      { id: 'resources', label: 'Resources' }
    ];
  }

  getSources() {
    return this.sources.slice();
  }

  getCategories(sourceId) {
    if (sourceId === 'constant') return [{ id: 'constant', label: 'Constant' }];
    if (sourceId === 'buildings') return this.getBuildingCategories();
    if (sourceId === 'colony') return this.getColonyCategories();
    if (sourceId === 'projects') return this.getProjectCategories();
    if (sourceId === 'terraforming') return this.getTerraformingCategories();
    if (sourceId === 'celestial') return [{ id: 'celestial', label: 'Celestial Parameters' }];
    if (sourceId === 'hazards') return [{ id: 'hazards', label: 'Hazards' }];
    if (sourceId === 'research') return this.getResearchCategories();
    if (sourceId === 'resources') return this.getResourceCategories();
    return [];
  }

  getTargets(sourceId, categoryId) {
    if (sourceId === 'constant') return [{ id: 'constant', label: 'Constant' }];
    if (sourceId === 'buildings') return this.getBuildingTargets(categoryId);
    if (sourceId === 'colony') return this.getColonyTargets(categoryId);
    if (sourceId === 'projects') return this.getProjectTargets(categoryId);
    if (sourceId === 'terraforming') return this.getTerraformingTargets(categoryId);
    if (sourceId === 'celestial') return [{ id: 'celestial', label: 'Celestial Parameters' }];
    if (sourceId === 'hazards') return this.getHazardTargets();
    if (sourceId === 'research') return this.getResearchTargets(categoryId);
    if (sourceId === 'resources') return this.getResourceTargets(categoryId);
    return [];
  }

  getAttributes(sourceId, categoryId, targetId) {
    if (sourceId === 'constant') return [{ id: 'value', label: 'Value', valueType: 'number' }];
    if (sourceId === 'buildings') return this.getBuildingAttributes(targetId);
    if (sourceId === 'colony') return this.getColonyAttributes(categoryId, targetId);
    if (sourceId === 'projects') return this.getProjectAttributes(targetId);
    if (sourceId === 'terraforming') return this.getTerraformingAttributes(categoryId, targetId);
    if (sourceId === 'celestial') return this.getCelestialAttributes();
    if (sourceId === 'hazards') return this.getHazardAttributes(targetId);
    if (sourceId === 'research') return this.getResearchAttributes(targetId);
    if (sourceId === 'resources') return this.getResourceAttributes(categoryId, targetId);
    return [];
  }

  getBuildingCategories() {
    const categories = [];
    const seen = new Set();
    for (const buildingId in buildings) {
      const building = buildings[buildingId];
      const category = building.category || 'other';
      if (!seen.has(category)) {
        seen.add(category);
        categories.push({ id: category, label: this.formatIdLabel(category) });
      }
    }
    return categories;
  }

  getBuildingTargets(categoryId) {
    const targets = [];
    for (const buildingId in buildings) {
      const building = buildings[buildingId];
      if ((building.category || 'other') !== categoryId) continue;
      targets.push({ id: buildingId, label: building.displayName || building.name || buildingId });
    }
    return targets;
  }

  getBuildingAttributes(buildingId) {
    const attributes = [
      { id: 'count', label: 'Count', valueType: 'number' },
      { id: 'active', label: 'Active', valueType: 'number' },
      { id: 'unlocked', label: 'Unlocked', valueType: 'boolean' },
      { id: 'hidden', label: 'Hidden', valueType: 'boolean' },
      { id: 'permanentlyDisabled', label: 'Permanently Disabled', valueType: 'boolean' },
      { id: 'autoBuildEnabled', label: 'Auto-build Enabled', valueType: 'boolean' },
      { id: 'autoActiveEnabled', label: 'Auto-active Enabled', valueType: 'boolean' },
      { id: 'workerPriority', label: 'Worker Priority', valueType: 'number' },
      { id: 'productionRatio', label: 'Production Ratio', valueType: 'number' },
      { id: 'consumptionRatio', label: 'Consumption Ratio', valueType: 'number' }
    ];
    const building = buildings[buildingId];
    if (building && building.storage) {
      attributes.push({ id: 'storageFillPercent', label: 'Storage Fill %', valueType: 'number' });
    }
    return attributes;
  }

  getColonyCategories() {
    return [
      { id: 'global', label: 'Population' },
      { id: 'colonyBuildings', label: 'Colony Buildings' },
      { id: 'nanocolony', label: 'Nanocolony' },
      { id: 'sliders', label: 'Colony Sliders' },
      { id: 'orbitals', label: 'Orbitals' }
    ];
  }

  getColonyTargets(categoryId) {
    if (categoryId === 'global') {
      return [{ id: 'global', label: 'Population' }];
    }
    if (categoryId === 'nanocolony') {
      return [{ id: 'nanocolony', label: 'Nanocolony' }];
    }
    if (categoryId === 'sliders') {
      return [
        { id: 'workforceRatio', label: 'Workforce Allocation' },
        { id: 'foodConsumption', label: 'Food Consumption' },
        { id: 'luxuryWater', label: 'Luxury Water Use' },
        { id: 'oreMineWorkers', label: 'Ore Mine Workers' },
        { id: 'mechanicalAssistance', label: 'Mechanical Assistance' },
        { id: 'warpnetLevel', label: 'Warpnet' }
      ];
    }
    if (categoryId === 'orbitals') {
      return [{ id: 'orbitals', label: 'Orbitals' }];
    }
    const targets = [];
    for (const colonyId in colonies) {
      const colony = colonies[colonyId];
      targets.push({ id: colonyId, label: colony.displayName || colony.name || colonyId });
    }
    return targets;
  }

  getColonyAttributes(categoryId, targetId) {
    if (categoryId === 'global') {
      return [
        { id: 'population', label: 'Population', valueType: 'number' },
        { id: 'workers', label: 'Workers', valueType: 'number' },
        { id: 'unemployed', label: 'Unemployed', valueType: 'number' },
        { id: 'housingCapacity', label: 'Housing Capacity', valueType: 'number' },
        { id: 'workerCapacity', label: 'Worker Capacity', valueType: 'number' },
        { id: 'happiness', label: 'Happiness', valueType: 'number' }
      ];
    }
    if (categoryId === 'nanocolony') {
      return [
        { id: 'enabled', label: 'Enabled', valueType: 'boolean' },
        { id: 'nanobots', label: 'Nanobots', valueType: 'number' },
        { id: 'maxNanobots', label: 'Max Nanobots', valueType: 'number' },
        { id: 'powerFraction', label: 'Power Fraction', valueType: 'number' },
        { id: 'maintenanceSlider', label: 'Maintenance Slider', valueType: 'number' },
        { id: 'glassSlider', label: 'Glass Slider', valueType: 'number' },
        { id: 'componentsSlider', label: 'Components Slider', valueType: 'number' },
        { id: 'electronicsSlider', label: 'Electronics Slider', valueType: 'number' },
        { id: 'grapheneSlider', label: 'Graphene Slider', valueType: 'number' }
      ];
    }
    if (categoryId === 'sliders') {
      return [{ id: 'value', label: 'Value', valueType: 'number' }];
    }
    if (categoryId === 'orbitals') {
      return [
        { id: 'availableOrbitals', label: 'Available Orbitals', valueType: 'number' },
        { id: 'assignmentStep', label: 'Assignment Step', valueType: 'number' }
      ];
    }
    return [
      { id: 'count', label: 'Count', valueType: 'number' },
      { id: 'active', label: 'Active', valueType: 'number' },
      { id: 'unlocked', label: 'Unlocked', valueType: 'boolean' },
      { id: 'hidden', label: 'Hidden', valueType: 'boolean' },
      { id: 'autoBuildEnabled', label: 'Auto-build Enabled', valueType: 'boolean' },
      { id: 'autoActiveEnabled', label: 'Auto-active Enabled', valueType: 'boolean' },
      { id: 'workerPriority', label: 'Worker Priority', valueType: 'number' }
    ];
  }

  getProjectCategories() {
    const categories = [];
    const seen = new Set();
    const projects = projectManager?.projects || {};
    for (const projectId in projects) {
      const project = projects[projectId];
      if (project.category === 'story') continue;
      const category = project.category || 'other';
      if (!seen.has(category)) {
        seen.add(category);
        categories.push({ id: category, label: this.formatIdLabel(category) });
      }
    }
    return categories;
  }

  getProjectTargets(categoryId) {
    const targets = [];
    const projects = projectManager?.projects || {};
    for (const projectId in projects) {
      const project = projects[projectId];
      if (project.category === 'story') continue;
      if ((project.category || 'other') !== categoryId) continue;
      targets.push({ id: projectId, label: project.displayName || project.name || projectId });
    }
    return targets;
  }

  getProjectAttributes() {
    return [
      { id: 'unlocked', label: 'Unlocked', valueType: 'boolean' },
      { id: 'visible', label: 'Visible', valueType: 'boolean' },
      { id: 'completed', label: 'Completed', valueType: 'boolean' },
      { id: 'active', label: 'Active', valueType: 'boolean' },
      { id: 'progressPercent', label: 'Progress %', valueType: 'number' },
      { id: 'assignedSpaceships', label: 'Assigned Spaceships', valueType: 'number' },
      { id: 'durationRemaining', label: 'Duration Remaining', valueType: 'number' },
      { id: 'repeatCount', label: 'Repeat Count', valueType: 'number' },
      { id: 'maxRepeatCount', label: 'Max Repeat Count', valueType: 'number' },
      { id: 'autoStart', label: 'Auto-start', valueType: 'boolean' },
      { id: 'autoContinuousOperation', label: 'Auto-continuous Operation', valueType: 'boolean' },
      { id: 'buildCount', label: 'Build Count', valueType: 'number' }
    ];
  }

  getTerraformingCategories() {
    return [
      { id: 'temperature', label: 'Temperature' },
      { id: 'atmosphere', label: 'Atmosphere' },
      { id: 'surface', label: 'Surface' },
      { id: 'luminosity', label: 'Luminosity' },
      { id: 'life', label: 'Life' },
      { id: 'others', label: 'Others' }
    ];
  }

  getTerraformingTargets(categoryId) {
    return [{ id: categoryId, label: this.formatIdLabel(categoryId) }];
  }

  getTerraformingAttributes(categoryId) {
    if (categoryId === 'temperature') {
      return [
        { id: 'averageTemperatureK', label: 'Average Temperature K', valueType: 'number' },
        { id: 'averageTemperatureC', label: 'Average Temperature C', valueType: 'number' },
        { id: 'trendTemperatureK', label: 'Trend Temperature K', valueType: 'number' },
        { id: 'equilibriumTemperatureK', label: 'Equilibrium Temperature K', valueType: 'number' },
        { id: 'tropicalTemperatureK', label: 'Tropical Temperature K', valueType: 'number' },
        { id: 'temperateTemperatureK', label: 'Temperate Temperature K', valueType: 'number' },
        { id: 'polarTemperatureK', label: 'Polar Temperature K', valueType: 'number' }
      ];
    }
    if (categoryId === 'atmosphere') {
      return [
        { id: 'totalPressurePa', label: 'Total Pressure Pa', valueType: 'number' },
        { id: 'totalPressureKPa', label: 'Total Pressure kPa', valueType: 'number' },
        { id: 'co2PressurePa', label: 'CO₂ Pressure Pa', valueType: 'number' },
        { id: 'o2PressurePa', label: 'O₂ Pressure Pa', valueType: 'number' },
        { id: 'n2PressurePa', label: 'N₂ Pressure Pa', valueType: 'number' },
        { id: 'ch4PressurePa', label: 'CH₄ Pressure Pa', valueType: 'number' },
        { id: 'nh3PressurePa', label: 'NH₃ Pressure Pa', valueType: 'number' },
        { id: 'h2PressurePa', label: 'H₂ Pressure Pa', valueType: 'number' },
        { id: 'waterVaporPressurePa', label: 'Water Vapor Pressure Pa', valueType: 'number' }
      ];
    }
    if (categoryId === 'surface') {
      return [
        { id: 'land', label: 'Land', valueType: 'number' },
        { id: 'geometricLand', label: 'Geometric Land', valueType: 'number' },
        { id: 'liquidWaterCoverage', label: 'Liquid Water Coverage', valueType: 'number' },
        { id: 'iceCoverage', label: 'Ice Coverage', valueType: 'number' },
        { id: 'reservedLandPercent', label: 'Reserved Land %', valueType: 'number' }
      ];
    }
    if (categoryId === 'luminosity') {
      return [
        { id: 'solarFlux', label: 'Solar Flux', valueType: 'number' },
        { id: 'modifiedSolarFlux', label: 'Modified Solar Flux', valueType: 'number' },
        { id: 'albedo', label: 'Albedo', valueType: 'number' },
        { id: 'opticalDepth', label: 'Optical Depth', valueType: 'number' },
        { id: 'coreHeatFlux', label: 'Core Heat Flux', valueType: 'number' }
      ];
    }
    if (categoryId === 'life') {
      return [
        { id: 'biomass', label: 'Biomass', valueType: 'number' },
        { id: 'plants', label: 'Plants', valueType: 'number' },
        { id: 'animals', label: 'Animals', valueType: 'number' },
        { id: 'microbes', label: 'Microbes', valueType: 'number' }
      ];
    }
    return [
      { id: 'terraformingComplete', label: 'Terraforming Complete', valueType: 'boolean' },
      { id: 'dayNightPeriod', label: 'Day-Night Period', valueType: 'number' }
    ];
  }

  getCelestialAttributes() {
    return [
      { id: 'gravity', label: 'Gravity', valueType: 'number' },
      { id: 'radius', label: 'Radius', valueType: 'number' },
      { id: 'mass', label: 'Mass', valueType: 'number' },
      { id: 'surfaceArea', label: 'Surface Area', valueType: 'number' },
      { id: 'distanceFromSun', label: 'Distance From Sun', valueType: 'number' },
      { id: 'solarFlux', label: 'Solar Flux', valueType: 'number' },
      { id: 'rotationPeriod', label: 'Rotation Period', valueType: 'number' },
      { id: 'hasNaturalMagnetosphere', label: 'Natural Magnetosphere', valueType: 'boolean' },
      { id: 'coreHeatFlux', label: 'Core Heat Flux', valueType: 'number' },
      { id: 'density', label: 'Density', valueType: 'number' }
    ];
  }

  getHazardTargets() {
    return [
      { id: 'hazardousBiomass', label: 'Hazardous Biomass' },
      { id: 'hazardousMachinery', label: 'Hazardous Machinery' },
      { id: 'kessler', label: 'Kessler Skies' },
      { id: 'pulsar', label: 'Pulsar' },
      { id: 'garbage', label: 'Garbage' }
    ];
  }

  getHazardAttributes() {
    return [
      { id: 'active', label: 'Active', valueType: 'boolean' },
      { id: 'coveragePercent', label: 'Coverage %', valueType: 'number' },
      { id: 'severity', label: 'Severity', valueType: 'number' },
      { id: 'growthRate', label: 'Growth Rate', valueType: 'number' },
      { id: 'decayRate', label: 'Decay Rate', valueType: 'number' }
    ];
  }

  getResearchCategories() {
    const categories = [];
    for (const category in researchManager.researches) {
      categories.push({ id: category, label: this.formatIdLabel(category) });
    }
    return categories;
  }

  getResearchTargets(categoryId) {
    const researches = researchManager.researches[categoryId] || [];
    return researches.map(research => ({ id: research.id, label: research.name || research.id }));
  }

  getResearchAttributes() {
    return [
      { id: 'unlocked', label: 'Unlocked', valueType: 'boolean' },
      { id: 'completed', label: 'Completed', valueType: 'boolean' },
      { id: 'enabledForAutomation', label: 'Auto-research Enabled', valueType: 'boolean' },
      { id: 'hiddenByUser', label: 'Hidden By User', valueType: 'boolean' },
      { id: 'priority', label: 'Priority', valueType: 'number' },
      { id: 'cost', label: 'Cost', valueType: 'number' },
      { id: 'canAfford', label: 'Can Afford', valueType: 'boolean' },
      { id: 'isAdvanced', label: 'Advanced', valueType: 'boolean' }
    ];
  }

  getResourceCategories() {
    const categories = [];
    for (const category in resources) {
      if (resources[category] && resources[category].constructor === Object) {
        categories.push({ id: category, label: this.formatIdLabel(category) });
      }
    }
    return categories;
  }

  getResourceTargets(categoryId) {
    const group = resources[categoryId] || {};
    const targets = [];
    for (const resourceId in group) {
      const resource = group[resourceId];
      if (!resource || resource.constructor !== Resource) continue;
      targets.push({ id: resourceId, label: resource.displayName || resource.name || resourceId });
    }
    return targets;
  }

  getResourceAttributes() {
    return [
      { id: 'value', label: 'Value', valueType: 'number' },
      { id: 'cap', label: 'Cap', valueType: 'number' },
      { id: 'fillPercent', label: 'Fill %', valueType: 'number' },
      { id: 'productionRate', label: 'Production Rate', valueType: 'number' },
      { id: 'consumptionRate', label: 'Consumption Rate', valueType: 'number' },
      { id: 'netRate', label: 'Net Rate', valueType: 'number' }
    ];
  }

  resolveValue(ref) {
    if (!ref || ref.constructor !== Object) return 0;
    if (ref.source === 'constant') return this.toNumber(ref.constant);
    if (ref.source === 'buildings') return this.resolveBuildingValue(ref);
    if (ref.source === 'colony') return this.resolveColonyValue(ref);
    if (ref.source === 'projects') return this.resolveProjectValue(ref);
    if (ref.source === 'terraforming') return this.resolveTerraformingValue(ref);
    if (ref.source === 'celestial') return this.resolveCelestialValue(ref);
    if (ref.source === 'hazards') return this.resolveHazardValue(ref);
    if (ref.source === 'research') return this.resolveResearchValue(ref);
    if (ref.source === 'resources') return this.resolveResourceValue(ref);
    return 0;
  }

  resolveBuildingValue(ref) {
    const building = buildings[ref.target];
    if (!building) return 0;
    if (ref.attribute === 'count') return this.toNumber(building.countNumber ?? building.count);
    if (ref.attribute === 'active') return this.toNumber(building.activeNumber ?? building.active);
    if (ref.attribute === 'unlocked') return building.unlocked ? 1 : 0;
    if (ref.attribute === 'hidden') return building.isHidden ? 1 : 0;
    if (ref.attribute === 'permanentlyDisabled') return building.permanentlyDisabled ? 1 : 0;
    if (ref.attribute === 'autoBuildEnabled') return building.autoBuildEnabled ? 1 : 0;
    if (ref.attribute === 'autoActiveEnabled') return building.autoActiveEnabled ? 1 : 0;
    if (ref.attribute === 'workerPriority') return this.toNumber(building.workerPriority);
    if (ref.attribute === 'productionRatio') return this.toNumber(building.getProductionRatio());
    if (ref.attribute === 'consumptionRatio') return this.toNumber(building.getConsumptionRatio());
    if (ref.attribute === 'storageFillPercent') return this.resolveStorageFillPercent(building);
    return 0;
  }

  resolveColonyValue(ref) {
    if (ref.category === 'global') return this.resolveColonyGlobalValue(ref.attribute);
    if (ref.category === 'nanocolony') return this.resolveNanocolonyValue(ref.attribute);
    if (ref.category === 'sliders') return this.resolveColonySliderValue(ref.target);
    if (ref.category === 'orbitals') return this.resolveOrbitalsValue(ref.attribute);
    const colony = colonies[ref.target];
    if (!colony) return 0;
    if (ref.attribute === 'count') return this.toNumber(colony.countNumber ?? colony.count);
    if (ref.attribute === 'active') return this.toNumber(colony.activeNumber ?? colony.active);
    if (ref.attribute === 'unlocked') return colony.unlocked ? 1 : 0;
    if (ref.attribute === 'hidden') return colony.isHidden ? 1 : 0;
    if (ref.attribute === 'autoBuildEnabled') return colony.autoBuildEnabled ? 1 : 0;
    if (ref.attribute === 'autoActiveEnabled') return colony.autoActiveEnabled ? 1 : 0;
    if (ref.attribute === 'workerPriority') return this.toNumber(colony.workerPriority);
    return 0;
  }

  resolveColonyGlobalValue(attribute) {
    if (attribute === 'population') return this.toNumber(resources.colony.colonists.value);
    if (attribute === 'workers') return this.toNumber(resources.colony.workers?.value);
    if (attribute === 'unemployed') return this.toNumber(resources.colony.unemployed?.value);
    if (attribute === 'housingCapacity') return this.toNumber(resources.colony.colonists.cap);
    if (attribute === 'workerCapacity') return this.toNumber(resources.colony.workers?.cap);
    if (attribute === 'happiness') return this.toNumber(colonySliderSettings?.happiness);
    return 0;
  }

  resolveNanocolonyValue(attribute) {
    if (attribute === 'enabled') return nanotechManager?.enabled ? 1 : 0;
    if (attribute === 'nanobots') return this.toNumber(nanotechManager?.nanobots);
    if (attribute === 'maxNanobots') return this.toNumber(nanotechManager?.maxNanobots);
    if (attribute === 'powerFraction') return this.toNumber(nanotechManager?.powerFraction);
    return this.toNumber(nanotechManager?.[attribute]);
  }

  resolveColonySliderValue(target) {
    if (target === 'workforceRatio') return this.toNumber(colonySliderSettings.workerRatio);
    if (target === 'foodConsumption') return this.toNumber(colonySliderSettings.foodConsumption);
    if (target === 'luxuryWater') return this.toNumber(colonySliderSettings.luxuryWater);
    if (target === 'oreMineWorkers') return this.toNumber(colonySliderSettings.oreMineWorkers);
    if (target === 'mechanicalAssistance') return this.toNumber(colonySliderSettings.mechanicalAssistance);
    if (target === 'warpnetLevel') return this.toNumber(colonySliderSettings.warpnetLevel);
    return 0;
  }

  resolveOrbitalsValue(attribute) {
    if (attribute === 'availableOrbitals') return this.toNumber(followersManager?.availableOrbitals);
    if (attribute === 'assignmentStep') return this.toNumber(followersManager?.assignmentStep);
    return 0;
  }

  resolveProjectValue(ref) {
    const project = projectManager.projects[ref.target];
    if (!project) return 0;
    if (ref.attribute === 'unlocked') return project.unlocked ? 1 : 0;
    if (ref.attribute === 'visible') return project.isVisible ? (project.isVisible() ? 1 : 0) : (project.unlocked ? 1 : 0);
    if (ref.attribute === 'completed') return project.isCompleted ? 1 : 0;
    if (ref.attribute === 'active') return project.isActive ? 1 : 0;
    if (ref.attribute === 'progressPercent') return this.resolveProjectProgressPercent(project);
    if (ref.attribute === 'assignedSpaceships') return this.toNumber(project.assignedSpaceships);
    if (ref.attribute === 'durationRemaining') return this.toNumber(project.remainingTime);
    if (ref.attribute === 'repeatCount') return this.toNumber(project.repeatCount);
    if (ref.attribute === 'maxRepeatCount') return this.toNumber(project.maxRepeatCount);
    if (ref.attribute === 'autoStart') return project.autoStart ? 1 : 0;
    if (ref.attribute === 'autoContinuousOperation') return project.autoContinuousOperation ? 1 : 0;
    if (ref.attribute === 'buildCount') return this.toNumber(project.buildCount);
    return 0;
  }

  resolveTerraformingValue(ref) {
    const attribute = ref.attribute;
    if (attribute === 'averageTemperatureK') return this.toNumber(terraforming.temperature.value);
    if (attribute === 'averageTemperatureC') return this.toNumber(terraforming.temperature.value - 273.15);
    if (attribute === 'trendTemperatureK') return this.toNumber(terraforming.temperature.trendValue);
    if (attribute === 'equilibriumTemperatureK') return this.toNumber(terraforming.temperature.equilibriumTemperature);
    if (attribute === 'tropicalTemperatureK') return this.toNumber(terraforming.temperature.zones.tropical.value);
    if (attribute === 'temperateTemperatureK') return this.toNumber(terraforming.temperature.zones.temperate.value);
    if (attribute === 'polarTemperatureK') return this.toNumber(terraforming.temperature.zones.polar.value);
    if (attribute === 'totalPressurePa') return this.toNumber(terraforming.atmosphericPressureCache.totalPressure);
    if (attribute === 'totalPressureKPa') return this.toNumber(terraforming.atmosphericPressureCache.totalPressureKPa);
    if (attribute === 'co2PressurePa') return this.toNumber(terraforming.atmosphericPressureCache.pressureByKey.carbonDioxide);
    if (attribute === 'o2PressurePa') return this.toNumber(terraforming.atmosphericPressureCache.pressureByKey.oxygen);
    if (attribute === 'n2PressurePa') return this.toNumber(terraforming.atmosphericPressureCache.pressureByKey.inertGas);
    if (attribute === 'ch4PressurePa') return this.toNumber(terraforming.atmosphericPressureCache.pressureByKey.atmosphericMethane);
    if (attribute === 'nh3PressurePa') return this.toNumber(terraforming.atmosphericPressureCache.pressureByKey.atmosphericAmmonia);
    if (attribute === 'h2PressurePa') return this.toNumber(terraforming.atmosphericPressureCache.pressureByKey.atmosphericHydrogen);
    if (attribute === 'waterVaporPressurePa') return this.toNumber(terraforming.atmosphericPressureCache.pressureByKey.atmosphericWater);
    if (attribute === 'land') return this.toNumber(resources.surface.land.value);
    if (attribute === 'geometricLand') return resolveWorldGeometricLand(terraforming, resources.surface.land);
    if (attribute === 'liquidWaterCoverage') return this.toNumber(resources.surface.liquidWater?.coverage);
    if (attribute === 'iceCoverage') return this.toNumber(resources.surface.ice?.coverage);
    if (attribute === 'reservedLandPercent') return this.toNumber(resources.surface.land.reservedPercent);
    if (attribute === 'solarFlux') return this.toNumber(terraforming.luminosity.solarFlux);
    if (attribute === 'modifiedSolarFlux') return this.toNumber(terraforming.luminosity.modifiedSolarFlux);
    if (attribute === 'albedo') return this.toNumber(terraforming.luminosity.surfaceAlbedo);
    if (attribute === 'opticalDepth') return this.toNumber(terraforming.temperature.opticalDepth);
    if (attribute === 'coreHeatFlux') return this.toNumber(terraforming.celestialParameters.coreHeatFlux);
    if (attribute === 'biomass') return this.toNumber(resources.surface.biomass?.value);
    if (attribute === 'plants') return this.toNumber(resources.surface.plants?.value);
    if (attribute === 'animals') return this.toNumber(resources.surface.animals?.value);
    if (attribute === 'microbes') return this.toNumber(resources.surface.microbes?.value);
    if (attribute === 'terraformingComplete') return terraforming.isTerraformingComplete ? 1 : 0;
    if (attribute === 'dayNightPeriod') return this.toNumber(dayNightCycle?.periodSeconds);
    return 0;
  }

  resolveCelestialValue(ref) {
    const params = terraforming.celestialParameters || {};
    if (ref.attribute === 'hasNaturalMagnetosphere') return params.hasNaturalMagnetosphere ? 1 : 0;
    return this.toNumber(params[ref.attribute]);
  }

  resolveHazardValue(ref) {
    const hazard = this.getHazard(ref.target);
    if (!hazard) return 0;
    if (ref.attribute === 'active') return hazard.active || hazard.enabled ? 1 : 0;
    if (ref.attribute === 'coveragePercent') return this.toNumber((hazard.coverage || hazard.coverageFraction || hazard.landCoverage || 0) * 100);
    if (ref.attribute === 'severity') return this.toNumber(hazard.severity || hazard.intensity);
    if (ref.attribute === 'growthRate') return this.toNumber(hazard.growthRate);
    if (ref.attribute === 'decayRate') return this.toNumber(hazard.decayRate);
    return 0;
  }

  resolveResearchValue(ref) {
    const research = researchManager.getResearchById(ref.target);
    if (!research) return 0;
    if (ref.attribute === 'unlocked') return research.unlocked ? 1 : 0;
    if (ref.attribute === 'completed') return research.completed ? 1 : 0;
    if (ref.attribute === 'enabledForAutomation') return automationManager.researchAutomation?.isAutoResearchEnabled(ref.target) ? 1 : 0;
    if (ref.attribute === 'hiddenByUser') return research.hiddenByUser ? 1 : 0;
    if (ref.attribute === 'priority') return this.toNumber(automationManager.researchAutomation?.getResearchPriority(ref.target));
    if (ref.attribute === 'cost') return this.toNumber(research.cost);
    if (ref.attribute === 'canAfford') return researchManager.canAffordResearch(research) ? 1 : 0;
    if (ref.attribute === 'isAdvanced') return research.isAdvanced ? 1 : 0;
    return 0;
  }

  resolveResourceValue(ref) {
    const resource = resources[ref.category]?.[ref.target];
    if (!resource) return 0;
    if (ref.attribute === 'value') return this.toNumber(resource.value);
    if (ref.attribute === 'cap') return this.toNumber(resource.cap);
    if (ref.attribute === 'fillPercent') return resource.cap > 0 ? (this.toNumber(resource.value) / this.toNumber(resource.cap)) * 100 : 0;
    if (ref.attribute === 'productionRate') return this.toNumber(resource.productionRate);
    if (ref.attribute === 'consumptionRate') return this.toNumber(resource.consumptionRate);
    if (ref.attribute === 'netRate') return this.toNumber(resource.productionRate) - this.toNumber(resource.consumptionRate);
    return 0;
  }

  resolveProjectProgressPercent(project) {
    const starting = this.toNumber(project.startingDuration || project.duration);
    if (starting <= 0) return project.isCompleted ? 100 : 0;
    return Math.max(0, Math.min(100, ((starting - this.toNumber(project.remainingTime)) / starting) * 100));
  }

  resolveStorageFillPercent(structure) {
    let value = 0;
    let cap = 0;
    const storage = structure.storage || {};
    for (const category in storage) {
      for (const resourceId in storage[category]) {
        const resource = resources[category]?.[resourceId];
        if (!resource) continue;
        value += this.toNumber(resource.value);
        cap += this.toNumber(resource.cap);
      }
    }
    return cap > 0 ? (value / cap) * 100 : 0;
  }

  getHazard(hazardId) {
    if (hazardId === 'hazardousBiomass') return hazardManager?.hazardousBiomassHazard;
    if (hazardId === 'hazardousMachinery') return hazardManager?.hazardousMachineryHazard;
    if (hazardId === 'kessler') return hazardManager?.kesslerHazard;
    if (hazardId === 'pulsar') return hazardManager?.pulsarHazard;
    if (hazardId === 'garbage') return hazardManager?.garbageHazard;
    return null;
  }

  describeReference(ref) {
    if (!ref || ref.constructor !== Object) return 'Value';
    if (ref.source === 'constant') return `${ref.constant ?? 0}`;
    const source = this.sources.find(item => item.id === ref.source);
    const categories = this.getCategories(ref.source);
    const category = categories.find(item => item.id === ref.category);
    const targets = this.getTargets(ref.source, ref.category);
    const target = targets.find(item => item.id === ref.target);
    const attributes = this.getAttributes(ref.source, ref.category, ref.target);
    const attribute = attributes.find(item => item.id === ref.attribute);
    return [source?.label, category?.label, target?.label, attribute?.label].filter(Boolean).join(' / ');
  }

  toNumber(value) {
    if (value === Infinity) return 1e300;
    if (value === -Infinity) return -1e300;
    if (value && value.constructor === BigInt) return Number(value);
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  formatIdLabel(id) {
    return String(id || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }
}
