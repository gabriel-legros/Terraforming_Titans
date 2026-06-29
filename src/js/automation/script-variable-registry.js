class ScriptVariableRegistry {
  constructor() {
    this.sources = [
      { id: 'constant', label: this.getScriptVariableText('sources.constant', 'Constant') },
      { id: 'variables', label: this.getScriptVariableText('variables.source', 'Variables') },
      { id: 'resources', label: this.getScriptVariableText('sources.resources', 'Resources') },
      { id: 'buildings', label: this.getScriptVariableText('sources.buildings', 'Buildings') },
      { id: 'colony', label: this.getScriptVariableText('sources.colony', 'Colony') },
      { id: 'projects', label: this.getScriptVariableText('sources.projects', 'Special Projects') },
      { id: 'terraforming', label: this.getScriptVariableText('sources.terraforming', 'Terraforming') },
      { id: 'celestial', label: this.getScriptVariableText('sources.celestial', 'Celestial Parameters') },
      { id: 'artificial', label: this.getScriptVariableText('artificial.source', 'Artificial') },
      { id: 'hazards', label: this.getScriptVariableText('sources.hazards', 'Hazards') },
      { id: 'research', label: this.getScriptVariableText('sources.research', 'Research') }
    ];
  }

  getScriptVariableText(path, fallback) {
    return t(`ui.hope.automationCards.scriptVariables.${path}`, {}, fallback);
  }

  getSources() {
    return this.sources.slice();
  }

  getCategories(sourceId) {
    if (sourceId === 'constant') return [{ id: 'constant', label: this.getScriptVariableText('sources.constant', 'Constant') }];
    if (sourceId === 'buildings') return this.getBuildingCategories();
    if (sourceId === 'colony') return this.getColonyCategories();
    if (sourceId === 'projects') return this.getProjectCategories();
    if (sourceId === 'terraforming') return this.getTerraformingCategories();
    if (sourceId === 'celestial') return [{ id: 'celestial', label: this.getScriptVariableText('sources.celestial', 'Celestial Parameters') }];
    if (sourceId === 'artificial') return this.getArtificialCategories();
    if (sourceId === 'hazards') return [{ id: 'hazards', label: this.getScriptVariableText('sources.hazards', 'Hazards') }];
    if (sourceId === 'research') return this.getResearchCategories();
    if (sourceId === 'resources') return this.getResourceCategories();
    if (sourceId === 'variables') return [{ id: 'variables', label: this.getScriptVariableText('variables.source', 'Variables') }];
    return [];
  }

  getTargets(sourceId, categoryId) {
    if (sourceId === 'constant') return [{ id: 'constant', label: this.getScriptVariableText('sources.constant', 'Constant') }];
    if (sourceId === 'buildings') return this.getBuildingTargets(categoryId);
    if (sourceId === 'colony') return this.getColonyTargets(categoryId);
    if (sourceId === 'projects') return this.getProjectTargets(categoryId);
    if (sourceId === 'terraforming') return this.getTerraformingTargets(categoryId);
    if (sourceId === 'celestial') return [{ id: 'celestial', label: this.getScriptVariableText('sources.celestial', 'Celestial Parameters') }];
    if (sourceId === 'artificial') return this.getArtificialTargets();
    if (sourceId === 'hazards') return this.getHazardTargets();
    if (sourceId === 'research') return this.getResearchTargets(categoryId);
    if (sourceId === 'resources') return this.getResourceTargets(categoryId);
    if (sourceId === 'variables') return this.getVariableTargets();
    return [];
  }

  getAttributes(sourceId, categoryId, targetId, optionId) {
    if (sourceId === 'constant') return [{ id: 'value', label: this.getScriptVariableText('common.value', 'Value'), valueType: 'number' }];
    if (sourceId === 'buildings') return this.getBuildingAttributes(targetId);
    if (sourceId === 'colony') return this.getColonyAttributes(categoryId, targetId);
    if (sourceId === 'projects') return this.getProjectAttributes(targetId);
    if (sourceId === 'terraforming') return this.getTerraformingAttributes(categoryId, targetId);
    if (sourceId === 'celestial') return this.getCelestialAttributes();
    if (sourceId === 'artificial') return this.getArtificialAttributes();
    if (sourceId === 'hazards') return this.getHazardAttributes(targetId);
    if (sourceId === 'research') return this.getResearchAttributes(targetId);
    if (sourceId === 'resources') return this.getResourceAttributes(categoryId, targetId, optionId);
    if (sourceId === 'variables') return [{ id: 'value', label: this.getScriptVariableText('common.value', 'Value'), valueType: 'number' }];
    return [];
  }

  getVariableTargets() {
    const targets = [];
    for (let index = 0; index < 26; index += 1) {
      const letter = String.fromCharCode(65 + index);
      targets.push({ id: letter, label: letter });
    }
    return targets;
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
      { id: 'count', label: this.getScriptVariableText('common.count', 'Count'), valueType: 'number' },
      { id: 'active', label: this.getScriptVariableText('common.active', 'Active'), valueType: 'number' },
      { id: 'unlocked', label: this.getScriptVariableText('common.unlocked', 'Unlocked'), valueType: 'boolean' },
      { id: 'hidden', label: this.getScriptVariableText('common.hidden', 'Hidden'), valueType: 'boolean' },
      { id: 'autoBuildEnabled', label: this.getScriptVariableText('common.autoBuildEnabled', 'Auto-build Enabled'), valueType: 'boolean' },
      { id: 'autoActiveEnabled', label: this.getScriptVariableText('common.autoActiveEnabled', 'Auto-active Enabled'), valueType: 'boolean' },
      { id: 'workerPriority', label: this.getScriptVariableText('common.workerPriority', 'Worker Priority'), valueType: 'number' },
      { id: 'productionRatio', label: this.getScriptVariableText('common.productionRatio', 'Production Ratio'), valueType: 'number' },
      { id: 'consumptionRatio', label: this.getScriptVariableText('common.consumptionRatio', 'Consumption Ratio'), valueType: 'number' }
    ];
    const building = buildings[buildingId];
    if (building && building.storage) {
      attributes.push({ id: 'storageFillPercent', label: this.getScriptVariableText('common.storageFillPercent', 'Storage Fill %'), valueType: 'number' });
    }
    return attributes;
  }

  getColonyCategories() {
    return [
      { id: 'global', label: this.getScriptVariableText('colony.categories.population', 'Population') },
      { id: 'colonyBuildings', label: this.getScriptVariableText('colony.categories.colonyBuildings', 'Colony Buildings') },
      { id: 'nanocolony', label: this.getScriptVariableText('colony.categories.nanocolony', 'Nanocolony') },
      { id: 'sliders', label: this.getScriptVariableText('colony.categories.colonySliders', 'Colony Sliders') },
      { id: 'orbitals', label: this.getScriptVariableText('colony.categories.orbitals', 'Orbitals') }
    ];
  }

  getColonyTargets(categoryId) {
    if (categoryId === 'global') {
      return [{ id: 'global', label: this.getScriptVariableText('colony.categories.population', 'Population') }];
    }
    if (categoryId === 'nanocolony') {
      return [{ id: 'nanocolony', label: this.getScriptVariableText('colony.categories.nanocolony', 'Nanocolony') }];
    }
    if (categoryId === 'sliders') {
      return [
        { id: 'workforceRatio', label: this.getScriptVariableText('colony.sliders.workforceAllocation', 'Workforce Allocation') },
        { id: 'foodConsumption', label: this.getScriptVariableText('colony.sliders.foodConsumption', 'Food Consumption') },
        { id: 'luxuryWater', label: this.getScriptVariableText('colony.sliders.luxuryWaterUse', 'Luxury Water Use') },
        { id: 'oreMineWorkers', label: this.getScriptVariableText('colony.sliders.oreMineWorkers', 'Ore Mine Workers') },
        { id: 'mechanicalAssistance', label: this.getScriptVariableText('colony.sliders.mechanicalAssistance', 'Mechanical Assistance') },
        { id: 'warpnetLevel', label: this.getScriptVariableText('colony.sliders.warpnet', 'Warpnet') }
      ];
    }
    if (categoryId === 'orbitals') {
      return [{ id: 'orbitals', label: this.getScriptVariableText('colony.categories.orbitals', 'Orbitals') }];
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
        { id: 'population', label: this.getScriptVariableText('colony.attributes.population', 'Population'), valueType: 'number' },
        { id: 'workers', label: this.getScriptVariableText('colony.attributes.workers', 'Workers'), valueType: 'number' },
        { id: 'housingCapacity', label: this.getScriptVariableText('colony.attributes.housingCapacity', 'Housing Capacity'), valueType: 'number' },
        { id: 'workerCapacity', label: this.getScriptVariableText('colony.attributes.workerCapacity', 'Worker Capacity'), valueType: 'number' },
        { id: 'happiness', label: this.getScriptVariableText('colony.attributes.happiness', 'Happiness'), valueType: 'number' }
      ];
    }
    if (categoryId === 'nanocolony') {
      return [
        { id: 'enabled', label: this.getScriptVariableText('common.enabled', 'Enabled'), valueType: 'boolean' },
        { id: 'nanobots', label: this.getScriptVariableText('colony.attributes.nanobots', 'Nanobots'), valueType: 'number' },
        { id: 'maxNanobots', label: this.getScriptVariableText('colony.attributes.maxNanobots', 'Max Nanobots'), valueType: 'number' },
        { id: 'powerFraction', label: this.getScriptVariableText('colony.attributes.powerFraction', 'Power Fraction'), valueType: 'number' },
        { id: 'maintenanceSlider', label: this.getScriptVariableText('colony.attributes.maintenanceI', 'Maintenance I'), valueType: 'number' },
        { id: 'glassSlider', label: this.getScriptVariableText('colony.attributes.glassSlider', 'Glass Slider'), valueType: 'number' },
        { id: 'maintenance2Slider', label: this.getScriptVariableText('colony.attributes.maintenanceII', 'Maintenance II'), valueType: 'number' },
        { id: 'componentsSlider', label: this.getScriptVariableText('colony.attributes.componentsSlider', 'Components Slider'), valueType: 'number' },
        { id: 'maintenance3Slider', label: this.getScriptVariableText('colony.attributes.maintenanceIII', 'Maintenance III'), valueType: 'number' },
        { id: 'electronicsSlider', label: this.getScriptVariableText('colony.attributes.electronicsSlider', 'Electronics Slider'), valueType: 'number' },
        { id: 'maintenance4Slider', label: this.getScriptVariableText('colony.attributes.maintenanceIV', 'Maintenance IV'), valueType: 'number' },
        { id: 'grapheneSlider', label: this.getScriptVariableText('colony.attributes.grapheneSlider', 'Graphene Slider'), valueType: 'number' }
      ];
    }
    if (categoryId === 'sliders') {
      return [{ id: 'value', label: this.getScriptVariableText('common.value', 'Value'), valueType: 'number' }];
    }
    if (categoryId === 'orbitals') {
      return [
        { id: 'availableOrbitals', label: this.getScriptVariableText('colony.attributes.availableOrbitals', 'Available Orbitals'), valueType: 'number' },
        { id: 'assignedOrbitals', label: this.getScriptVariableText('colony.attributes.assignedOrbitals', 'Assigned Orbitals'), valueType: 'number' }
      ];
    }
    return [
      { id: 'count', label: this.getScriptVariableText('common.count', 'Count'), valueType: 'number' },
      { id: 'active', label: this.getScriptVariableText('common.active', 'Active'), valueType: 'number' },
      { id: 'unlocked', label: this.getScriptVariableText('common.unlocked', 'Unlocked'), valueType: 'boolean' },
      { id: 'hidden', label: this.getScriptVariableText('common.hidden', 'Hidden'), valueType: 'boolean' },
      { id: 'autoBuildEnabled', label: this.getScriptVariableText('common.autoBuildEnabled', 'Auto-build Enabled'), valueType: 'boolean' },
      { id: 'autoActiveEnabled', label: this.getScriptVariableText('common.autoActiveEnabled', 'Auto-active Enabled'), valueType: 'boolean' },
      { id: 'workerPriority', label: this.getScriptVariableText('common.workerPriority', 'Worker Priority'), valueType: 'number' }
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

  getProjectAttributes(targetId) {
    const project = projectManager?.projects?.[targetId];
    const attributes = [
      { id: 'unlocked', label: this.getScriptVariableText('common.unlocked', 'Unlocked'), valueType: 'boolean' },
      { id: 'visible', label: this.getScriptVariableText('common.visible', 'Visible'), valueType: 'boolean' },
      { id: 'completed', label: this.getScriptVariableText('common.completed', 'Completed'), valueType: 'boolean' },
      { id: 'active', label: this.getScriptVariableText('projects.constructionActive', 'Construction Active'), valueType: 'boolean' },
      { id: 'running', label: this.getScriptVariableText('common.running', 'Running'), valueType: 'boolean' },
      { id: 'progressPercent', label: this.getScriptVariableText('common.progressPercent', 'Progress %'), valueType: 'number' },
      { id: 'assignedSpaceships', label: this.getScriptVariableText('projects.assignedSpaceships', 'Assigned Spaceships'), valueType: 'number' },
      { id: 'durationRemaining', label: this.getScriptVariableText('projects.durationRemaining', 'Duration Remaining'), valueType: 'number' },
      { id: 'repeatCount', label: this.getScriptVariableText('projects.repeatCount', 'Repeat Count'), valueType: 'number' },
      { id: 'maxRepeatCount', label: this.getScriptVariableText('projects.maxRepeatCount', 'Max Repeat Count'), valueType: 'number' },
      { id: 'autoStart', label: this.getScriptVariableText('projects.autoStartConstruction', 'Auto-start Construction'), valueType: 'boolean' },
      { id: 'autoContinuousOperation', label: this.getScriptVariableText('projects.autoOperationEnabled', 'Auto Operation Enabled'), valueType: 'boolean' }
    ];
    if (project instanceof SpaceshipProject) {
      attributes.push({ id: 'spaceshipCostMultiplier', label: this.getScriptVariableText('projects.spaceshipCostMultiplier', 'Spaceship Cost Multiplier'), valueType: 'number' });
    }
    if (targetId === 'ringworldTerraforming') {
      attributes.push({ id: 'currentMass', label: this.getScriptVariableText('projects.currentMass', 'Current Mass'), valueType: 'number' });
    }
    return attributes;
  }

  getTerraformingCategories() {
    return [
      { id: 'status', label: this.getScriptVariableText('terraforming.categories.status', 'Status') },
      { id: 'dominion', label: this.getScriptVariableText('terraforming.dominion.category', 'Dominion') },
      { id: 'specialization', label: this.getScriptVariableText('terraforming.categories.specialization', 'Specialization') },
      { id: 'life', label: this.getScriptVariableText('terraforming.life.category', 'Life') },
      { id: 'temperature', label: this.getScriptVariableText('terraforming.categories.temperature', 'Temperature') },
      { id: 'atmosphere', label: this.getScriptVariableText('terraforming.categories.atmosphere', 'Atmosphere') },
      { id: 'surface', label: this.getScriptVariableText('terraforming.categories.surface', 'Surface') },
      { id: 'luminosity', label: this.getScriptVariableText('terraforming.categories.luminosity', 'Luminosity') },
      { id: 'others', label: this.getScriptVariableText('terraforming.categories.others', 'Others') }
    ];
  }

  getTerraformingTargets(categoryId) {
    if (categoryId === 'status') return [{ id: 'status', label: this.getScriptVariableText('terraforming.categories.status', 'Status') }];
    if (categoryId === 'dominion') {
      return [{ id: 'dominion', label: this.getScriptVariableText('terraforming.dominion.target', 'Dominion') }];
    }
    if (categoryId === 'specialization') return [{ id: 'specialization', label: this.getScriptVariableText('terraforming.specialization.currentSpecialization', 'Current Specialization') }];
    if (categoryId === 'life') return [{ id: 'life', label: this.getScriptVariableText('terraforming.life.target', 'Life') }];
    return [{ id: categoryId, label: this.formatIdLabel(categoryId) }];
  }

  getTerraformingAttributes(categoryId) {
    if (categoryId === 'status') {
      return [
        { id: 'pending', label: this.getScriptVariableText('terraforming.status.pending', 'Pending'), valueType: 'boolean' },
        { id: 'readyForCompletion', label: this.getScriptVariableText('terraforming.status.readyForCompletion', 'Ready for completion'), valueType: 'boolean' },
        { id: 'complete', label: this.getScriptVariableText('terraforming.status.complete', 'Complete'), valueType: 'boolean' },
        {
          id: 'timeSinceAwakeningSeconds',
          label: this.getScriptVariableText('terraforming.status.timeSinceAwakeningSeconds', 'Time since awakening (seconds)'),
          valueType: 'number'
        }
      ];
    }
    if (categoryId === 'dominion') {
      const requirementOptions = this.getTerraformingRequirementOptions();
      return requirementOptions.map(option => ({
        id: `requirement-${option.id}`,
        label: option.label,
        valueType: 'boolean'
      }));
    }
    if (categoryId === 'specialization') {
      return [
        {
          id: 'currentSpecialization',
          label: this.getScriptVariableText('terraforming.specialization.currentSpecialization', 'Current Specialization'),
          valueType: 'enum',
          valueLabels: {
            0: this.getScriptVariableText('terraforming.specialization.none', 'None'),
            1: this.getScriptVariableText('terraforming.specialization.bioworld', 'BioWorld'),
            2: this.getScriptVariableText('terraforming.specialization.manufacturingWorld', 'Manufacturing World'),
            3: this.getScriptVariableText('terraforming.specialization.holyWorld', 'Holy World'),
            4: this.getScriptVariableText('terraforming.specialization.foundryWorld', 'Foundry World'),
            5: this.getScriptVariableText('terraforming.specialization.resortWorld', 'Resort World')
          }
        },
        { id: 'bioworld', label: this.getScriptVariableText('terraforming.specialization.bioworld', 'BioWorld'), valueType: 'boolean' },
        { id: 'manufacturingWorld', label: this.getScriptVariableText('terraforming.specialization.manufacturingWorld', 'Manufacturing World'), valueType: 'boolean' },
        { id: 'holyWorld', label: this.getScriptVariableText('terraforming.specialization.holyWorld', 'Holy World'), valueType: 'boolean' },
        { id: 'foundryWorld', label: this.getScriptVariableText('terraforming.specialization.foundryWorld', 'Foundry World'), valueType: 'boolean' },
        { id: 'resortWorld', label: this.getScriptVariableText('terraforming.specialization.resortWorld', 'Resort World'), valueType: 'boolean' }
      ];
    }
    if (categoryId === 'life') {
      return [
        {
          id: 'canSurviveAnyZone',
          label: this.getScriptVariableText('terraforming.life.canSurviveAnyZone', 'Can Survive in Any Zone'),
          valueType: 'boolean'
        },
        {
          id: 'canSurviveAllZones',
          label: this.getScriptVariableText('terraforming.life.canSurviveAllZones', 'Can Survive in All Zones'),
          valueType: 'boolean'
        },
        {
          id: 'biomassDensity',
          label: this.getScriptVariableText('terraforming.life.biomassDensity', 'Biomass Density'),
          valueType: 'number'
        },
        {
          id: 'coverageRequirementPercent',
          label: this.getScriptVariableText('terraforming.life.coverageRequirementPercent', 'Coverage Requirement %'),
          valueType: 'number'
        }
      ];
    }
    if (categoryId === 'temperature') {
      return [
        { id: 'averageTemperatureK', label: this.getScriptVariableText('terraforming.temperature.averageTemperatureK', 'Average Temperature K'), valueType: 'number' },
        { id: 'averageTemperatureC', label: this.getScriptVariableText('terraforming.temperature.averageTemperatureC', 'Average Temperature C'), valueType: 'number' },
        { id: 'trendTemperatureK', label: this.getScriptVariableText('terraforming.temperature.trendTemperatureK', 'Trend Temperature K'), valueType: 'number' },
        { id: 'trendTemperatureC', label: this.getScriptVariableText('terraforming.temperature.trendTemperatureC', 'Trend Temperature C'), valueType: 'number' },
        { id: 'equilibriumTemperatureK', label: this.getScriptVariableText('terraforming.temperature.equilibriumTemperatureK', 'Equilibrium Temperature K'), valueType: 'number' },
        { id: 'equilibriumTemperatureC', label: this.getScriptVariableText('terraforming.temperature.equilibriumTemperatureC', 'Equilibrium Temperature C'), valueType: 'number' },
        { id: 'tropicalTemperatureK', label: this.getScriptVariableText('terraforming.temperature.tropicalTemperatureK', 'Tropical Temperature K'), valueType: 'number' },
        { id: 'tropicalTemperatureC', label: this.getScriptVariableText('terraforming.temperature.tropicalTemperatureC', 'Tropical Temperature C'), valueType: 'number' },
        { id: 'temperateTemperatureK', label: this.getScriptVariableText('terraforming.temperature.temperateTemperatureK', 'Temperate Temperature K'), valueType: 'number' },
        { id: 'temperateTemperatureC', label: this.getScriptVariableText('terraforming.temperature.temperateTemperatureC', 'Temperate Temperature C'), valueType: 'number' },
        { id: 'polarTemperatureK', label: this.getScriptVariableText('terraforming.temperature.polarTemperatureK', 'Polar Temperature K'), valueType: 'number' },
        { id: 'polarTemperatureC', label: this.getScriptVariableText('terraforming.temperature.polarTemperatureC', 'Polar Temperature C'), valueType: 'number' },
        { id: 'coreHeatFlux', label: this.getScriptVariableText('terraforming.temperature.coreHeatFlux', 'Core Heat Flux'), valueType: 'number' },
        {
          id: 'netCoreHeatFlux',
          label: this.getScriptVariableText('terraforming.temperature.netCoreHeatFlux', 'Net Core Heat Flux'),
          valueType: 'number'
        }
      ];
    }
    if (categoryId === 'atmosphere') {
      return [
        { id: 'totalPressurePa', label: this.getScriptVariableText('terraforming.atmosphere.totalPressurePa', 'Total Pressure Pa'), valueType: 'number' },
        { id: 'totalPressureKPa', label: this.getScriptVariableText('terraforming.atmosphere.totalPressureKPa', 'Total Pressure kPa'), valueType: 'number' },
        { id: 'co2PressurePa', label: this.getScriptVariableText('terraforming.atmosphere.co2PressurePa', 'CO₂ Pressure Pa'), valueType: 'number' },
        { id: 'o2PressurePa', label: this.getScriptVariableText('terraforming.atmosphere.o2PressurePa', 'O₂ Pressure Pa'), valueType: 'number' },
        { id: 'n2PressurePa', label: this.getScriptVariableText('terraforming.atmosphere.n2PressurePa', 'N₂ Pressure Pa'), valueType: 'number' },
        { id: 'ch4PressurePa', label: this.getScriptVariableText('terraforming.atmosphere.ch4PressurePa', 'CH₄ Pressure Pa'), valueType: 'number' },
        { id: 'nh3PressurePa', label: this.getScriptVariableText('terraforming.atmosphere.nh3PressurePa', 'NH₃ Pressure Pa'), valueType: 'number' },
        { id: 'h2PressurePa', label: this.getScriptVariableText('terraforming.atmosphere.h2PressurePa', 'H₂ Pressure Pa'), valueType: 'number' },
        { id: 'waterVaporPressurePa', label: this.getScriptVariableText('terraforming.atmosphere.waterVaporPressurePa', 'Water Vapor Pressure Pa'), valueType: 'number' }
      ];
    }
    if (categoryId === 'surface') {
      return [
        { id: 'land', label: this.getScriptVariableText('terraforming.surface.land', 'Land'), valueType: 'number' },
        { id: 'geometricLand', label: this.getScriptVariableText('terraforming.surface.geometricLand', 'Geometric Land'), valueType: 'number' }
      ];
    }
    if (categoryId === 'luminosity') {
      return [
        { id: 'solarFlux', label: this.getScriptVariableText('terraforming.luminosity.solarFlux', 'Solar Flux'), valueType: 'number' },
        { id: 'modifiedSolarFlux', label: this.getScriptVariableText('terraforming.luminosity.modifiedSolarFlux', 'Modified Solar Flux'), valueType: 'number' },
        { id: 'albedo', label: this.getScriptVariableText('terraforming.luminosity.albedo', 'Albedo'), valueType: 'number' },
        { id: 'opticalDepth', label: this.getScriptVariableText('terraforming.luminosity.opticalDepth', 'Optical Depth'), valueType: 'number' }
      ];
    }
    return [
      { id: 'hasNaturalMagnetosphere', label: this.getScriptVariableText('terraforming.others.naturalMagnetosphere', 'Natural Magnetosphere'), valueType: 'boolean' },
      { id: 'hasArtificialMagnetosphere', label: this.getScriptVariableText('terraforming.others.artificialMagnetosphere', 'Artificial Magnetosphere'), valueType: 'boolean' },
      { id: 'magnetosphereStatus', label: this.getScriptVariableText('terraforming.others.magnetosphereStatus', 'Magnetosphere Status'), valueType: 'boolean' },
      {
        id: 'surfaceRadiation',
        label: this.getScriptVariableText('terraforming.others.surfaceRadiation', 'Surface Radiation'),
        valueType: 'number'
      },
      {
        id: 'orbitalRadiation',
        label: this.getScriptVariableText('terraforming.others.orbitalRadiation', 'Orbital Radiation'),
        valueType: 'number'
      }
    ];
  }

  getCelestialAttributes() {
    return [
      {
        id: 'worldArchetype',
        label: this.getScriptVariableText('celestial.worldArchetype', 'World Archetype'),
        valueType: 'boolean'
      },
      {
        id: 'worldType',
        label: this.getScriptVariableText('celestial.worldType', 'World Type'),
        valueType: 'boolean'
      },
      { id: 'gravity', label: this.getScriptVariableText('celestial.gravity', 'Gravity'), valueType: 'number' },
      { id: 'radius', label: this.getScriptVariableText('celestial.radius', 'Radius'), valueType: 'number' },
      { id: 'mass', label: this.getScriptVariableText('celestial.mass', 'Mass'), valueType: 'number' },
      { id: 'surfaceArea', label: this.getScriptVariableText('celestial.surfaceArea', 'Surface Area'), valueType: 'number' },
      { id: 'distanceFromSun', label: this.getScriptVariableText('celestial.distanceFromSun', 'Distance From Sun'), valueType: 'number' },
      { id: 'solarFlux', label: this.getScriptVariableText('celestial.solarFlux', 'Solar Flux'), valueType: 'number' },
      { id: 'rotationPeriod', label: this.getScriptVariableText('celestial.rotationPeriod', 'Rotation Period'), valueType: 'number' },
      { id: 'hasNaturalMagnetosphere', label: this.getScriptVariableText('terraforming.others.naturalMagnetosphere', 'Natural Magnetosphere'), valueType: 'boolean' },
      { id: 'coreHeatFlux', label: this.getScriptVariableText('terraforming.temperature.coreHeatFlux', 'Core Heat Flux'), valueType: 'number' },
      { id: 'density', label: this.getScriptVariableText('celestial.density', 'Density'), valueType: 'number' }
    ];
  }

  getArtificialCategories() {
    return [
      { id: 'artificial', label: this.getScriptVariableText('artificial.category', 'Artificial') }
    ];
  }

  getArtificialTargets() {
    return [
      { id: 'artificial', label: this.getScriptVariableText('artificial.category', 'Artificial') }
    ];
  }

  getArtificialAttributes() {
    return [
      {
        id: 'storedCount',
        label: this.getScriptVariableText('artificial.storedCount', 'Stored Count'),
        valueType: 'number'
      }
    ];
  }

  getHazardTargets() {
    return [
      { id: 'hazardousBiomass', label: this.getScriptVariableText('hazards.hazardousBiomass', 'Hazardous Biomass') },
      { id: 'hazardousMachinery', label: this.getScriptVariableText('hazards.hazardousMachinery', 'Hazardous Machinery') },
      { id: 'kessler', label: this.getScriptVariableText('hazards.kesslerSkies', 'Kessler Skies') },
      { id: 'pulsar', label: this.getScriptVariableText('hazards.pulsar', 'Pulsar') },
      { id: 'garbage', label: this.getScriptVariableText('hazards.garbage', 'Garbage') }
    ];
  }

  getHazardAttributes() {
    return [
      { id: 'active', label: this.getScriptVariableText('common.active', 'Active'), valueType: 'boolean' },
      { id: 'unclearedPercent', label: this.getScriptVariableText('hazards.unclearedPercent', 'Uncleared %'), valueType: 'number' },
      { id: 'clearedPercent', label: this.getScriptVariableText('hazards.clearedPercent', 'Cleared %'), valueType: 'number' }
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
      { id: 'completed', label: this.getScriptVariableText('research.researched', 'Researched'), valueType: 'boolean' },
      { id: 'unlocked', label: this.getScriptVariableText('common.unlocked', 'Unlocked'), valueType: 'boolean' },
      { id: 'enabledForAutomation', label: this.getScriptVariableText('research.autoResearchEnabled', 'Auto-research Enabled'), valueType: 'boolean' },
      { id: 'hiddenByUser', label: this.getScriptVariableText('research.hiddenByUser', 'Hidden By User'), valueType: 'boolean' },
      { id: 'priority', label: this.getScriptVariableText('research.priority', 'Priority'), valueType: 'number' },
      { id: 'cost', label: this.getScriptVariableText('research.cost', 'Cost'), valueType: 'number' },
      { id: 'canAfford', label: this.getScriptVariableText('research.canAfford', 'Can Afford'), valueType: 'boolean' },
      { id: 'isAdvanced', label: this.getScriptVariableText('research.advanced', 'Advanced'), valueType: 'boolean' }
    ];
  }

  getResourceCategories() {
    const categories = [];
    for (const category in resources) {
      if (resources[category] && resources[category].constructor === Object) {
        categories.push({ id: category, label: this.getResourceCategoryLabel(category) });
      }
    }
    return categories;
  }

  getResourceTargets(categoryId) {
    if (categoryId === 'surface') return this.getSurfaceResourceGroups();
    const group = resources[categoryId] || {};
    const targets = [];
    for (const resourceId in group) {
      const resource = group[resourceId];
      if (!resource || resource.constructor !== Resource) continue;
      targets.push({ id: resourceId, label: this.getResourceLabel(categoryId, resourceId, resource) });
    }
    return targets;
  }

  getResourceAttributes(categoryId, targetId, optionId) {
    const resolvedTargetId = this.getResolvedResourceTargetId(categoryId, targetId, optionId);
    if (!resolvedTargetId) return [];
    const attributes = [
      { id: 'value', label: this.getScriptVariableText('common.value', 'Value'), valueType: 'number' },
      { id: 'cap', label: this.getScriptVariableText('resources.cap', 'Cap'), valueType: 'number' },
      { id: 'fillPercent', label: this.getScriptVariableText('resources.fillPercent', 'Fill %'), valueType: 'number' },
      { id: 'productionRate', label: this.getScriptVariableText('resources.productionRate', 'Production Rate'), valueType: 'number' },
      { id: 'consumptionRate', label: this.getScriptVariableText('resources.consumptionRate', 'Consumption Rate'), valueType: 'number' },
      { id: 'netRate', label: this.getScriptVariableText('resources.netRate', 'Net Rate'), valueType: 'number' }
    ];
    if (categoryId === 'atmospheric') {
      attributes.push({ id: 'pressurePa', label: this.getScriptVariableText('resources.pressurePa', 'Pressure Pa'), valueType: 'number' });
    }
    if (categoryId === 'special' && resolvedTargetId === 'spaceships') {
      attributes.push({
        id: 'totalAmount',
        label: this.getScriptVariableText('resources.totalAmount', 'Total Amount'),
        valueType: 'number'
      });
    }
    if (categoryId === 'surface' && resolvedTargetId === 'land') {
      return [
        { id: 'value', label: this.getScriptVariableText('common.value', 'Value'), valueType: 'number' },
        { id: 'available', label: this.getScriptVariableText('resources.available', 'Available'), valueType: 'number' },
        { id: 'fillPercent', label: this.getScriptVariableText('resources.fillPercent', 'Fill %'), valueType: 'number' },
        { id: 'productionRate', label: this.getScriptVariableText('resources.productionRate', 'Production Rate'), valueType: 'number' },
        { id: 'consumptionRate', label: this.getScriptVariableText('resources.consumptionRate', 'Consumption Rate'), valueType: 'number' },
        { id: 'netRate', label: this.getScriptVariableText('resources.netRate', 'Net Rate'), valueType: 'number' }
      ];
    }
    if (this.getSurfaceResourceCoverageKey(categoryId, resolvedTargetId)) {
      attributes.push({ id: 'coverage', label: this.getScriptVariableText('resources.coverage', 'Coverage'), valueType: 'number' });
    }
    return attributes;
  }

  getSurfaceResourceGroups() {
    return [
      { id: 'solid', label: this.getScriptVariableText('resources.surface.solid', 'Solid') },
      { id: 'liquid', label: this.getScriptVariableText('resources.surface.liquid', 'Liquid') },
      { id: 'buried', label: this.getScriptVariableText('resources.surface.buried', 'Buried') },
      { id: 'others', label: this.getScriptVariableText('resources.surface.others', 'Others') }
    ];
  }

  getSurfaceResourceOptions(groupId) {
    const group = resources.surface || {};
    const targets = [];
    for (const resourceId in group) {
      const resource = group[resourceId];
      if (!resource || resource.constructor !== Resource) continue;
      if (this.getSurfaceResourceGroupId(resourceId) !== groupId) continue;
      targets.push({ id: resourceId, label: this.getResourceLabel('surface', resourceId, resource) });
    }
    return targets;
  }

  getSurfaceResourceGroupId(resourceId) {
    if (String(resourceId).startsWith('liquid')) return 'liquid';
    const zonalKeys = defaultPlanetResources.surface?.[resourceId]?.zonalConfig?.keys || [];
    if (zonalKeys.some(key => String(key).startsWith('buried'))) return 'buried';
    if (['fineSand', 'graphite'].includes(resourceId)) return 'solid';
    return 'others';
  }

  getResolvedResourceTargetId(categoryId, targetId, optionId) {
    if (categoryId === 'surface') {
      if (optionId) return optionId;
      const groups = this.getSurfaceResourceGroups();
      if (groups.some(group => group.id === targetId)) return '';
      return targetId;
    }
    return targetId;
  }

  resolveValue(ref) {
    if (!ref || ref.constructor !== Object) return 0;
    if (ref.source === 'constant') return this.toNumber(ref.constant);
    if (ref.source === 'buildings') return this.resolveBuildingValue(ref);
    if (ref.source === 'colony') return this.resolveColonyValue(ref);
    if (ref.source === 'projects') return this.resolveProjectValue(ref);
    if (ref.source === 'terraforming') return this.resolveTerraformingValue(ref);
    if (ref.source === 'celestial') return this.resolveCelestialValue(ref);
    if (ref.source === 'artificial') return this.resolveArtificialValue(ref);
    if (ref.source === 'hazards') return this.resolveHazardValue(ref);
    if (ref.source === 'research') return this.resolveResearchValue(ref);
    if (ref.source === 'resources') return this.resolveResourceValue(ref);
    if (ref.source === 'variables') return this.resolveVariableValue(ref);
    return 0;
  }

  resolveVariableValue(ref) {
    return this.toNumber(automationManager.scriptAutomation.getVariableValue(ref.target));
  }

  resolveBuildingValue(ref) {
    const building = buildings[ref.target];
    if (!building) return 0;
    if (ref.attribute === 'count') return this.toNumber(building.countNumber ?? building.count);
    if (ref.attribute === 'active') return this.toNumber(building.activeNumber ?? building.active);
    if (ref.attribute === 'unlocked') return building.unlocked ? 1 : 0;
    if (ref.attribute === 'hidden') return building.isHidden ? 1 : 0;
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
    if (attribute === 'housingCapacity') return this.toNumber(resources.colony.colonists.cap);
    if (attribute === 'workerCapacity') return this.toNumber(resources.colony.workers?.cap);
    if (attribute === 'happiness') return this.resolveColonyHappiness();
    return 0;
  }

  resolveNanocolonyValue(attribute) {
    if (attribute === 'enabled') return nanotechManager?.enabled ? 1 : 0;
    if (attribute === 'nanobots') return this.toNumber(nanotechManager?.nanobots);
    if (attribute === 'maxNanobots') return this.toNumber(nanotechManager?.getMaxNanobots());
    if (attribute === 'powerFraction') return this.toNumber(nanotechManager?.powerFraction);
    return this.toNumber(nanotechManager?.[attribute]);
  }

  resolveColonyHappiness() {
    let totalWeightedHappiness = 0;
    let totalCapacity = 0;
    for (const colonyId in colonies) {
      const colony = colonies[colonyId];
      const capacity = colony.getStorageContribution('colony', 'colonists');
      if (capacity > 0) {
        totalWeightedHappiness += colony.happiness * capacity;
        totalCapacity += capacity;
      }
    }
    return totalCapacity > 0 ? totalWeightedHappiness / totalCapacity : 0;
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
    if (attribute === 'assignedOrbitals') return this.resolveAssignedOrbitals();
    return 0;
  }

  resolveAssignedOrbitals() {
    const snapshot = followersManager?.getAssignmentsSnapshot?.();
    return this.toNumber(snapshot?.assigned);
  }

  resolveProjectValue(ref) {
    const project = projectManager.projects[ref.target];
    if (!project) return 0;
    if (ref.attribute === 'unlocked') return project.unlocked ? 1 : 0;
    if (ref.attribute === 'visible') return project.isVisible ? (project.isVisible() ? 1 : 0) : (project.unlocked ? 1 : 0);
    if (ref.attribute === 'completed') return project.isCompleted ? 1 : 0;
    if (ref.attribute === 'active') return project.isActive ? 1 : 0;
    if (ref.attribute === 'running') return this.resolveProjectRunning(project);
    if (ref.attribute === 'progressPercent') return this.resolveProjectProgressPercent(project);
    if (ref.attribute === 'assignedSpaceships') return this.toNumber(project.assignedSpaceships);
    if (ref.attribute === 'durationRemaining') return this.toNumber(project.remainingTime);
    if (ref.attribute === 'repeatCount') return this.toNumber(project.repeatCount);
    if (ref.attribute === 'maxRepeatCount') return this.toNumber(project.maxRepeatCount);
    if (ref.attribute === 'autoStart') return project.autoStart ? 1 : 0;
    if (ref.attribute === 'autoContinuousOperation') return project.autoContinuousOperation ? 1 : 0;
    if (ref.attribute === 'spaceshipCostMultiplier') return this.resolveProjectSpaceshipCostMultiplier(project);
    if (ref.attribute === 'currentMass' && ref.target === 'ringworldTerraforming') {
      return this.toNumber(project.getTotalRingworldMassTons());
    }
    return 0;
  }

  resolveProjectSpaceshipCostMultiplier(project) {
    if (!(project instanceof SpaceshipProject)) return 0;
    const costPerShip = project.attributes?.costPerShip || {};
    let weightedBaseCost = 0;
    let weightedAdjustedCost = 0;
    for (const category in costPerShip) {
      for (const resourceId in costPerShip[category]) {
        const baseCost = this.toNumber(costPerShip[category][resourceId]);
        if (baseCost <= 0) continue;
        const efficiencyMultiplier = resourceId === 'energy' ? shipEfficiency : 1;
        const baseWithSharedMultipliers = baseCost
          * project.getEffectiveCostMultiplier(category, resourceId)
          * efficiencyMultiplier;
        weightedBaseCost += baseWithSharedMultipliers;
        weightedAdjustedCost += baseWithSharedMultipliers * project.getEffectiveSpaceshipCostMultiplier(category, resourceId);
      }
    }
    if (weightedBaseCost <= 0) return 1;
    return weightedAdjustedCost / weightedBaseCost;
  }

  resolveProjectRunning(project) {
    if (project.isRunning === true) return 1;
    if (project.heatSinksActive === true) return project.repeatCount > 0 ? 1 : 0;
    if (project.autoContinuousOperation === true) return 1;
    return project.isActive && !project.isPaused ? 1 : 0;
  }

  resolveTerraformingValue(ref) {
    const attribute = ref.attribute;
    if (ref.category === 'status') return this.resolveTerraformingStatusValue(attribute);
    if (ref.category === 'dominion') return this.resolveTerraformingDominionValue(ref);
    if (ref.category === 'specialization') return this.resolveTerraformingSpecializationValue(attribute);
    if (ref.category === 'life') return this.resolveTerraformingLifeValue(attribute);
    if (attribute === 'averageTemperatureK') return this.toNumber(terraforming.temperature.value);
    if (attribute === 'averageTemperatureC') return this.toNumber(terraforming.temperature.value - 273.15);
    if (attribute === 'trendTemperatureK') return this.toNumber(terraforming.temperature.trendValue);
    if (attribute === 'trendTemperatureC') return this.toNumber(terraforming.temperature.trendValue - 273.15);
    if (attribute === 'equilibriumTemperatureK') return this.toNumber(terraforming.temperature.equilibriumTemperature);
    if (attribute === 'equilibriumTemperatureC') return this.toNumber(terraforming.temperature.equilibriumTemperature - 273.15);
    if (attribute === 'tropicalTemperatureK') return this.toNumber(terraforming.temperature.zones.tropical.value);
    if (attribute === 'tropicalTemperatureC') return this.toNumber(terraforming.temperature.zones.tropical.value - 273.15);
    if (attribute === 'temperateTemperatureK') return this.toNumber(terraforming.temperature.zones.temperate.value);
    if (attribute === 'temperateTemperatureC') return this.toNumber(terraforming.temperature.zones.temperate.value - 273.15);
    if (attribute === 'polarTemperatureK') return this.toNumber(terraforming.temperature.zones.polar.value);
    if (attribute === 'polarTemperatureC') return this.toNumber(terraforming.temperature.zones.polar.value - 273.15);
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
    if (attribute === 'solarFlux') return this.toNumber(terraforming.luminosity.solarFlux);
    if (attribute === 'modifiedSolarFlux') return this.toNumber(terraforming.luminosity.modifiedSolarFlux);
    if (attribute === 'albedo') return this.toNumber(terraforming.luminosity.surfaceAlbedo);
    if (attribute === 'opticalDepth') return this.toNumber(terraforming.temperature.opticalDepth);
    if (attribute === 'coreHeatFlux') return this.toNumber(terraforming.celestialParameters.coreHeatFlux);
    if (attribute === 'netCoreHeatFlux') return this.toNumber(terraforming.getNetCoreHeatFlux());
    if (attribute === 'hasNaturalMagnetosphere') return terraforming.celestialParameters.hasNaturalMagnetosphere ? 1 : 0;
    if (attribute === 'hasArtificialMagnetosphere') return this.hasArtificialMagnetosphere() ? 1 : 0;
    if (attribute === 'magnetosphereStatus') return terraforming.celestialParameters.hasNaturalMagnetosphere || this.hasArtificialMagnetosphere() ? 1 : 0;
    if (attribute === 'surfaceRadiation') return this.toNumber(terraforming.surfaceRadiation);
    if (attribute === 'orbitalRadiation') return this.toNumber(terraforming.orbitalRadiation);
    return 0;
  }

  resolveTerraformingDominionValue(ref) {
    if (!String(ref.attribute || '').startsWith('requirement-')) return 0;
    const requirementId = String(ref.attribute).slice('requirement-'.length);
    return terraforming.requirementId === requirementId ? 1 : 0;
  }

  hasArtificialMagnetosphere() {
    const project = projectManager.projects.apolloCoreSurgeryPlatform;
    return project && project.isCompleted && terraforming.celestialParameters.hasNaturalMagnetosphere;
  }

  resolveTerraformingStatusValue(attribute) {
    const complete = terraforming.completed === true;
    const ready = !complete && terraforming.readyForCompletion;
    if (attribute === 'pending') return !complete && !ready ? 1 : 0;
    if (attribute === 'readyForCompletion') return ready ? 1 : 0;
    if (attribute === 'complete') return complete ? 1 : 0;
    if (attribute === 'timeSinceAwakeningSeconds') return this.toNumber(playTimeSeconds);
    return 0;
  }

  resolveTerraformingSpecializationValue(attribute) {
    const current = this.getCurrentWorldSpecializationValue();
    if (attribute === 'currentSpecialization') return current;
    if (attribute === 'bioworld') return current === 1 ? 1 : 0;
    if (attribute === 'manufacturingWorld') return current === 2 ? 1 : 0;
    if (attribute === 'holyWorld') return current === 3 ? 1 : 0;
    if (attribute === 'foundryWorld') return current === 4 ? 1 : 0;
    if (attribute === 'resortWorld') return current === 5 ? 1 : 0;
    return 0;
  }

  resolveTerraformingLifeValue(attribute) {
    const design = lifeDesigner.currentDesign;
    if (attribute === 'canSurviveAnyZone') return design.canSurviveAnywhere() ? 1 : 0;
    if (attribute === 'canSurviveAllZones') return design.canSurviveInAllZones() ? 1 : 0;
    if (attribute === 'biomassDensity') {
      const totalBiomass = resources.surface.biomass?.value || 0;
      const totalSurfaceArea = terraforming.celestialParameters.surfaceArea;
      return totalSurfaceArea > 0 ? this.toNumber(totalBiomass / totalSurfaceArea) : 0;
    }
    if (attribute === 'coverageRequirementPercent') return this.toNumber(getEffectiveLifeFraction(terraforming) * 100);
    return 0;
  }

  getCurrentWorldSpecializationValue() {
    const projects = projectManager.projects;
    if (projects.bioworld && (projects.bioworld.isCompleted || projects.bioworld.isActive)) return 1;
    if (projects.manufacturingWorld && (projects.manufacturingWorld.isCompleted || projects.manufacturingWorld.isActive)) return 2;
    if (followersManager && followersManager.isCurrentWorldHolyConsecrated && followersManager.isCurrentWorldHolyConsecrated()) return 3;
    if (projects.foundryWorld && (projects.foundryWorld.isCompleted || projects.foundryWorld.isActive)) return 4;
    if (projects.resortWorld && (projects.resortWorld.isCompleted || projects.resortWorld.isActive)) return 5;
    return 0;
  }

  resolveCelestialValue(ref) {
    const params = terraforming.celestialParameters || {};
    if (ref.attribute === 'worldArchetype') return this.resolveWorldArchetypeOption(ref);
    if (ref.attribute === 'worldType') return this.resolveCelestialOptionMatch(ref, this.getCurrentWorldTypeValue());
    if (ref.attribute === 'hasNaturalMagnetosphere') return params.hasNaturalMagnetosphere ? 1 : 0;
    if (ref.attribute === 'solarFlux') return this.toNumber(terraforming.luminosity?.solarFlux);
    if (ref.attribute === 'density') {
      const massKg = this.toNumber(params.mass);
      const radiusKm = this.toNumber(params.radius);
      const radiusM = radiusKm * 1000;
      const volumeM3 = (4 / 3) * Math.PI * radiusM * radiusM * radiusM;
      return volumeM3 > 0 ? this.toNumber(massKg / volumeM3) : 0;
    }
    return this.toNumber(params[ref.attribute]);
  }

  resolveArtificialValue(ref) {
    if (ref.attribute === 'storedCount') return this.getStoredArtificialWorldCount();
    return 0;
  }

  getStoredArtificialWorldCount() {
    const statuses = spaceManager.artificialWorldStatuses || {};
    let count = 0;
    for (const seed in statuses) {
      if (statuses[seed] && statuses[seed].stored) count += 1;
    }
    return count;
  }

  resolveWorldArchetypeOption(ref) {
    const options = this.getCelestialAttributeOptions(ref.attribute);
    const selected = options.find(option => option.id === ref.option) || options[0];
    const artificial = spaceManager.currentArtificialKey !== null;
    const challenge = this.isCurrentAtlasChallengeWorld();
    const random = spaceManager.currentRandomSeed !== null && !challenge;
    const story = !artificial && !random && !challenge;
    if (selected.id === 'artificial') return artificial ? 1 : 0;
    if (selected.id === 'natural') return artificial ? 0 : 1;
    if (selected.id === 'story') return story ? 1 : 0;
    if (selected.id === 'random') return random ? 1 : 0;
    if (selected.id === 'challenge') return challenge ? 1 : 0;
    return 0;
  }

  resolveCelestialOptionMatch(ref, currentValue) {
    const options = this.getCelestialAttributeOptions(ref.attribute);
    const selected = options.find(option => option.id === ref.option) || options[0];
    return selected && currentValue === selected.value ? 1 : 0;
  }

  getCelestialAttributeOptions(attribute) {
    if (attribute === 'worldArchetype') {
      return [
        { id: 'artificial', label: this.getScriptVariableText('celestial.archetypes.artificial', 'Artificial'), value: 1 },
        { id: 'random', label: this.getScriptVariableText('celestial.archetypes.random', 'Random'), value: 2 },
        { id: 'natural', label: this.getScriptVariableText('celestial.archetypes.natural', 'Natural'), value: 3 },
        { id: 'story', label: this.getScriptVariableText('celestial.archetypes.story', 'Story'), value: 4 },
        { id: 'challenge', label: this.getScriptVariableText('celestial.archetypes.challenge', 'Challenge'), value: 5 }
      ];
    }
    if (attribute === 'worldType') {
      return [
        { id: 'mars-like', label: this.getScriptVariableText('celestial.worldTypes.marsLike', 'Mars-like'), value: 1 },
        { id: 'cold-desert', label: this.getScriptVariableText('celestial.worldTypes.desert', 'Desert'), value: 2 },
        { id: 'icy-moon', label: this.getScriptVariableText('celestial.worldTypes.waterRich', 'Water-rich'), value: 3 },
        { id: 'titan-like', label: this.getScriptVariableText('celestial.worldTypes.titanLike', 'Titan-like'), value: 4 },
        { id: 'carbon-planet', label: this.getScriptVariableText('celestial.worldTypes.carbon', 'Carbon'), value: 5 },
        { id: 'desiccated-desert', label: this.getScriptVariableText('celestial.worldTypes.desiccatedDesert', 'Desiccated Desert'), value: 6 },
        { id: 'super-earth', label: this.getScriptVariableText('celestial.worldTypes.superEarth', 'Super-Earth'), value: 7 },
        { id: 'chthonian', label: this.getScriptVariableText('celestial.worldTypes.chthonian', 'Chthonian'), value: 8 },
        { id: 'venus-like', label: this.getScriptVariableText('celestial.worldTypes.venusLike', 'Venus-like'), value: 9 },
        { id: 'rogue', label: this.getScriptVariableText('celestial.worldTypes.rogue', 'Rogue'), value: 10 },
        { id: 'ammonia-rich', label: this.getScriptVariableText('celestial.worldTypes.ammoniaRich', 'Ammonia-rich'), value: 11 },
        { id: 'molten', label: this.getScriptVariableText('celestial.worldTypes.molten', 'Molten'), value: 12 },
        { id: 'jupiter-like', label: this.getScriptVariableText('celestial.worldTypes.jupiterLike', 'Jupiter-like'), value: 13 },
        { id: 'shell', label: this.getScriptVariableText('celestial.worldTypes.shellWorld', 'Shell World'), value: 14 },
        { id: 'ring', label: this.getScriptVariableText('celestial.worldTypes.ringworld', 'Ringworld'), value: 15 },
        { id: 'disk', label: this.getScriptVariableText('celestial.worldTypes.diskWorld', 'Disk World'), value: 16 }
      ];
    }
    return [];
  }

  getTerraformingRequirementOptions() {
    const requirements = terraformingRequirements || {};
    const options = [];
    for (const requirementId in requirements) {
      options.push({
        id: requirementId,
        label: t(
          `catalogs.terraformingRequirements.${requirementId}.displayName`,
          {},
          this.formatIdLabel(requirementId)
        )
      });
    }
    return options;
  }

  getReferenceOptions(ref) {
    if (!ref) return [];
    if (ref.source === 'celestial') return this.getCelestialAttributeOptions(ref.attribute);
    return [];
  }

  isCurrentAtlasChallengeWorld() {
    const original = spaceManager.getCurrentWorldOriginal ? spaceManager.getCurrentWorldOriginal() : null;
    const seedKey = currentPlanetParameters.rwgMeta?.specialSeedKey
      || currentPlanetParameters.specialSeedKey
      || original?.rwgMeta?.specialSeedKey
      || original?.merged?.rwgMeta?.specialSeedKey
      || original?.override?.rwgMeta?.specialSeedKey
      || '';
    return !!seedKey;
  }

  getCurrentWorldTypeValue() {
    const typeKey = this.getCurrentWorldTypeKey();
    const typeValues = {
      'mars-like': 1,
      'cold-desert': 2,
      'icy-moon': 3,
      'titan-like': 4,
      'carbon-planet': 5,
      'desiccated-desert': 6,
      'super-earth': 7,
      chthonian: 8,
      'venus-like': 9,
      rogue: 10,
      'ammonia-rich': 11,
      molten: 12,
      'jupiter-like': 13,
      shell: 14,
      ring: 15,
      disk: 16
    };
    return typeValues[typeKey] || 0;
  }

  getCurrentWorldTypeKey() {
    const classification = currentPlanetParameters.classification || {};
    const direct = classification.type || classification.archetype || '';
    if (direct) return direct;
    const original = spaceManager.getCurrentWorldOriginal ? spaceManager.getCurrentWorldOriginal() : null;
    const originalType = original?.classification?.type
      || original?.classification?.archetype
      || original?.merged?.classification?.type
      || original?.merged?.classification?.archetype
      || original?.override?.classification?.type
      || original?.override?.classification?.archetype
      || original?.archetype
      || '';
    if (originalType) return originalType;
    return this.getStoryWorldTypeKey(spaceManager.currentPlanetKey);
  }

  getStoryWorldTypeKey(planetKey) {
    const storyTypes = {
      mars: 'mars-like',
      titan: 'titan-like',
      callisto: 'icy-moon',
      ganymede: 'icy-moon',
      vega2: 'mars-like',
      venus: 'venus-like',
      umbra: 'rogue',
      solisPrime: 'mars-like',
      gabbag: 'mars-like',
      tartarus: 'venus-like',
      hades: 'mars-like',
      poseidon: 'icy-moon',
      styx: 'mars-like',
      zeus: 'jupiter-like'
    };
    return storyTypes[planetKey] || '';
  }

  resolveHazardValue(ref) {
    const hazard = this.getHazard(ref.target);
    if (!hazard) return 0;
    if (ref.attribute === 'active') return this.isHazardActive(ref.target, hazard) ? 1 : 0;
    if (ref.attribute === 'unclearedPercent' || ref.attribute === 'coveragePercent') return this.resolveHazardUnclearedPercent(ref.target, hazard);
    if (ref.attribute === 'clearedPercent') return Math.max(0, Math.min(100, 100 - this.resolveHazardUnclearedPercent(ref.target, hazard)));
    return 0;
  }

  isHazardActive(hazardId, hazard) {
    if (!hazardManager.hasHazardParameters(hazardId)) return false;
    return !this.isHazardCleared(hazardId, hazard);
  }

  isHazardCleared(hazardId, hazard) {
    if (hazardId === 'hazardousBiomass') return hazard.isCleared(terraforming, hazardManager.parameters.hazardousBiomass);
    if (hazardId === 'hazardousMachinery') return hazard.isCleared(terraforming, hazardManager.parameters.hazardousMachinery);
    if (hazardId === 'garbage') return hazard.isCleared(terraforming, hazardManager.parameters.garbage);
    if (hazardId === 'kessler') return hazard.isCleared(terraforming, hazardManager.parameters.kessler);
    if (hazardId === 'pulsar') return hazard.isCleared(terraforming, hazardManager.parameters.pulsar);
    return true;
  }

  resolveHazardUnclearedPercent(hazardId, hazard) {
    if (!hazardManager.hasHazardParameters(hazardId)) return 0;
    if (hazardId === 'hazardousBiomass') return this.toPercent(hazardManager.getHazardousBiomassControl());
    if (hazardId === 'hazardousMachinery') return this.resolveHazardousMachineryUnclearedPercent(hazard);
    if (hazardId === 'garbage') return this.resolveGarbageUnclearedPercent();
    if (hazardId === 'kessler') return this.resolveResourceRemainingPercent(resources.special.orbitalDebris);
    if (hazardId === 'pulsar') return this.toPercent(hazard.getHazardStrength(terraforming, hazardManager.parameters.pulsar));
    return 0;
  }

  resolveHazardousMachineryUnclearedPercent(hazard) {
    const status = hazard.getCurrentPenaltyValues(terraforming, hazardManager.parameters.hazardousMachinery);
    return this.toPercent(status.currentCoverageShare);
  }

  resolveGarbageUnclearedPercent() {
    const parameters = hazardManager.parameters.garbage || {};
    const surfaceResources = parameters.surfaceResources || {};
    const clearedCategories = hazardManager.getGarbageClearedCategories ? hazardManager.getGarbageClearedCategories() : {};
    let totalCurrent = 0;
    let totalInitial = 0;
    Object.keys(surfaceResources).forEach(resourceKey => {
      const resource = resources.surface?.[resourceKey];
      const initial = this.toNumber(resource?.initialValue);
      const current = clearedCategories[resourceKey] ? 0 : this.toNumber(resource?.value);
      totalInitial += initial;
      totalCurrent += Math.max(0, Math.min(current, initial));
    });
    return totalInitial > 0 ? (totalCurrent / totalInitial) * 100 : 0;
  }

  resolveResourceRemainingPercent(resource) {
    const initial = this.toNumber(resource?.initialValue);
    if (initial <= 0) return 0;
    return Math.max(0, Math.min(100, (this.toNumber(resource?.value) / initial) * 100));
  }

  toPercent(value) {
    return Math.max(0, Math.min(100, this.toNumber(value) * 100));
  }

  resolveResearchValue(ref) {
    const research = researchManager.getResearchById(ref.target);
    if (!research) return 0;
    if (ref.attribute === 'unlocked') return research.unlocked ? 1 : 0;
    if (ref.attribute === 'completed') return research.isResearched || research.timesResearched > 0 ? 1 : 0;
    if (ref.attribute === 'enabledForAutomation') return automationManager.researchAutomation?.isAutoResearchEnabled(ref.target) ? 1 : 0;
    if (ref.attribute === 'hiddenByUser') return research.hiddenByUser ? 1 : 0;
    if (ref.attribute === 'priority') return this.toNumber(automationManager.researchAutomation?.getAutoResearchPriority(ref.target));
    if (ref.attribute === 'cost') return this.toNumber(researchManager.calculateResearchTotalCost(research));
    if (ref.attribute === 'canAfford') return canAffordResearch(research) ? 1 : 0;
    if (ref.attribute === 'isAdvanced') return research.isAdvanced ? 1 : 0;
    return 0;
  }

  resolveResourceValue(ref) {
    const resourceId = this.getResolvedResourceTargetId(ref.category, ref.target, ref.option);
    const resource = resources[ref.category]?.[resourceId];
    if (!resource) return 0;
    if (ref.attribute === 'value') return this.toNumber(resource.value);
    if (ref.attribute === 'available') return this.resolveAvailableResourceValue(ref.category, resourceId, resource);
    if (ref.attribute === 'cap') return this.toNumber(resource.cap);
    if (ref.attribute === 'fillPercent') return resource.cap > 0 ? (this.toNumber(resource.value) / this.toNumber(resource.cap)) * 100 : 0;
    if (ref.attribute === 'productionRate') return this.toNumber(resource.productionRate);
    if (ref.attribute === 'consumptionRate') return this.toNumber(resource.consumptionRate);
    if (ref.attribute === 'netRate') return this.toNumber(resource.productionRate) - this.toNumber(resource.consumptionRate);
    if (ref.attribute === 'pressurePa' && ref.category === 'atmospheric') {
      return this.toNumber(terraforming.atmosphericPressureCache.pressureByKey[resourceId]);
    }
    if (ref.attribute === 'totalAmount') return this.resolveSpecialResourceTotalAmount(ref.category, resourceId, resource);
    if (ref.attribute === 'coverage') return this.resolveSurfaceResourceCoverage(ref.category, resourceId);
    return 0;
  }

  resolveSpecialResourceTotalAmount(categoryId, resourceId, resource) {
    if (categoryId !== 'special' || resourceId !== 'spaceships') return this.toNumber(resource.value);
    const unassignedShips = this.toNumber(resource.value);
    const assignedShips = this.toNumber(projectManager.getAssignedSpaceships());
    return unassignedShips + assignedShips;
  }

  getSurfaceResourceCoverageKey(categoryId, targetId) {
    if (categoryId !== 'surface') return '';
    const config = defaultPlanetResources.surface[targetId]?.zonalConfig;
    const keys = Array.isArray(config?.coverageKeys) ? config.coverageKeys : [];
    return keys[0] || '';
  }

  resolveSurfaceResourceCoverage(categoryId, targetId) {
    const coverageKey = this.getSurfaceResourceCoverageKey(categoryId, targetId);
    if (!coverageKey) return 0;
    return this.toNumber(calculateAverageCoverage(terraforming, coverageKey));
  }

  resolveAvailableResourceValue(categoryId, resourceId, resource) {
    if (categoryId === 'surface' && resourceId === 'land') {
      if (resource.getAvailableAmount) return this.toNumber(resource.getAvailableAmount());
      return this.toNumber(resource.value) - this.toNumber(resource.reserved);
    }
    return this.toNumber(resource.value);
  }

  resolveProjectProgressPercent(project) {
    if (project.getSurfaceGravityRatio) {
      return Math.max(0, Math.min(100, this.toNumber(project.getSurfaceGravityRatio()) * 100));
    }
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

  getResourceCategoryLabel(categoryId) {
    return t(
      `ui.resources.categories.${categoryId}`,
      null,
      this.formatIdLabel(categoryId)
    );
  }

  getResourceLabel(categoryId, resourceId, resource) {
    const fallback = resource
      ? (resource.displayName || resource.name || this.formatIdLabel(resourceId))
      : this.formatIdLabel(resourceId);
    const name = t(`catalogs.resources.${categoryId}.${resourceId}.name`, null, fallback);
    return t(`catalogs.resources.${categoryId}.${resourceId}.displayName`, null, name);
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
    if (!ref || ref.constructor !== Object) return this.getScriptVariableText('common.value', 'Value');
    if (ref.source === 'constant') return `${ref.constant ?? 0}`;
    const source = this.sources.find(item => item.id === ref.source);
    if (ref.source === 'celestial') {
      const attributes = this.getCelestialAttributes();
      const attribute = attributes.find(item => item.id === ref.attribute);
      const options = this.getReferenceOptions(ref);
      const option = options.find(item => item.id === ref.option);
      return this.joinReferenceLabels(source?.label, attribute?.label, option?.label);
    }
    if (ref.source === 'hazards') {
      const targets = this.getTargets(ref.source, ref.category);
      const target = targets.find(item => item.id === ref.target);
      const attributes = this.getAttributes(ref.source, ref.category, ref.target);
      const attribute = attributes.find(item => item.id === ref.attribute);
      return this.joinReferenceLabels(source?.label, target?.label, attribute?.label);
    }
    const categories = this.getCategories(ref.source);
    const category = categories.find(item => item.id === ref.category);
    const targets = this.getTargets(ref.source, ref.category);
    const target = targets.find(item => item.id === ref.target);
    if (ref.source === 'resources' && ref.category === 'surface') {
      const options = this.getSurfaceResourceOptions(ref.target);
      const resolvedOptionId = ref.option || this.getResolvedResourceTargetId(ref.category, ref.target, ref.option);
      const option = options.find(item => item.id === resolvedOptionId);
      const attributes = this.getAttributes(ref.source, ref.category, ref.target, resolvedOptionId);
      const attribute = attributes.find(item => item.id === ref.attribute);
      return this.joinReferenceLabels(source?.label, category?.label, target?.label, option?.label, attribute?.label);
    }
    const attributes = this.getAttributes(ref.source, ref.category, ref.target, ref.option);
    const attribute = attributes.find(item => item.id === ref.attribute);
    const options = this.getReferenceOptions(ref);
    const option = options.find(item => item.id === ref.option);
    return this.joinReferenceLabels(source?.label, category?.label, target?.label, attribute?.label, option?.label);
  }

  joinReferenceLabels() {
    const labels = [];
    for (let index = 0; index < arguments.length; index += 1) {
      const value = arguments[index];
      if (!value) continue;
      const text = String(value).trim();
      if (!text) continue;
      if (labels.length > 0 && labels[labels.length - 1] === text) continue;
      labels.push(text);
    }
    return labels.join(' / ');
  }

  formatResolvedValue(ref, value) {
    const attributes = this.getAttributes(ref.source, ref.category, ref.target, ref.option);
    const attribute = attributes.find(item => item.id === ref.attribute);
    const valueLabels = attribute?.valueLabels;
    if (valueLabels) {
      const label = valueLabels[value];
      if (label) return `${label} (${formatNumber(value)})`;
    }
    return formatNumber(value);
  }

  toNumber(value) {
    if (value === Infinity) return 1e300;
    if (value === -Infinity) return -1e300;
    if (value && value.constructor === BigInt) return Number(value);
    if (value && value.constructor === String) {
      const parsed = parseFlexibleNumber(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
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
