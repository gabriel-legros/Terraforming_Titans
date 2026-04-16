var activeLanguageCode = 'en';
var activeLanguageData = {};

function isLanguageObject(value) {
  return !!value && Object.prototype.toString.call(value) === '[object Object]';
}

function mergeLanguageData(base, extra) {
  if (!isLanguageObject(base)) {
    return isLanguageObject(extra) ? mergeLanguageData({}, extra) : extra;
  }
  const merged = { ...base };
  if (!isLanguageObject(extra)) {
    return merged;
  }
  for (const key in extra) {
    const currentValue = merged[key];
    const nextValue = extra[key];
    if (isLanguageObject(currentValue) && isLanguageObject(nextValue)) {
      merged[key] = mergeLanguageData(currentValue, nextValue);
      continue;
    }
    merged[key] = nextValue;
  }
  return merged;
}

function setLanguageData(data) {
  activeLanguageData = mergeLanguageData(activeLanguageData, data || {});
  if (activeLanguageData.meta && activeLanguageData.meta.code) {
    activeLanguageCode = activeLanguageData.meta.code;
  }
  return activeLanguageData;
}

function getLanguageNode(path) {
  if (!path) {
    return null;
  }
  const parts = String(path).split('.');
  let node = activeLanguageData;
  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (!node || !Object.prototype.hasOwnProperty.call(node, part)) {
      return null;
    }
    node = node[part];
  }
  return node;
}

function escapeLanguageToken(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function interpolateLanguageText(text, vars) {
  let output = String(text);
  if (!vars) {
    return output;
  }
  for (const key in vars) {
    const pattern = new RegExp('\\{' + escapeLanguageToken(key) + '\\}', 'g');
    output = output.replace(pattern, String(vars[key]));
  }
  return output;
}

function t(path, vars, fallback) {
  const localized = getLanguageNode(path);
  if (typeof localized === 'string') {
    return interpolateLanguageText(localized, vars);
  }
  if (fallback !== undefined) {
    return interpolateLanguageText(fallback, vars);
  }
  return String(path || '');
}

function collectLanguageNodes(root, selector) {
  const nodes = [];
  if (!root) {
    return nodes;
  }
  if (root.matches && root.matches(selector)) {
    nodes.push(root);
  }
  const descendants = root.querySelectorAll ? root.querySelectorAll(selector) : [];
  for (let i = 0; i < descendants.length; i += 1) {
    nodes.push(descendants[i]);
  }
  return nodes;
}

function applyLanguageAttribute(root, selector, attributeName, getter, setter) {
  const nodes = collectLanguageNodes(root, selector);
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const key = getter(node);
    if (!key) {
      continue;
    }
    const fallback = setter === 'textContent'
      ? node.textContent
      : node.getAttribute(attributeName) || '';
    const value = t(key, null, fallback);
    if (setter === 'textContent') {
      node.textContent = value;
      continue;
    }
    node.setAttribute(attributeName, value);
  }
}

function applyLanguageToDom(root) {
  const scope = root || document;
  if (!scope) {
    return;
  }

  if (scope === document) {
    const titleText = getLanguageNode('meta.documentTitle');
    if (typeof titleText === 'string') {
      document.title = titleText;
    }
    if (document.documentElement) {
      document.documentElement.lang = activeLanguageCode || 'en';
    }
  }

  applyLanguageAttribute(scope, '[data-i18n]', '', node => node.dataset.i18n, 'textContent');
  applyLanguageAttribute(scope, '[data-i18n-title]', 'title', node => node.dataset.i18nTitle, 'attribute');
  applyLanguageAttribute(scope, '[data-i18n-placeholder]', 'placeholder', node => node.dataset.i18nPlaceholder, 'attribute');
  applyLanguageAttribute(scope, '[data-i18n-aria-label]', 'aria-label', node => node.dataset.i18nAriaLabel, 'attribute');
}

function applyLocalizedEntryFields(targetEntries, localizedEntries, fields) {
  if (!localizedEntries) {
    return;
  }
  for (const key in localizedEntries) {
    const target = targetEntries[key];
    if (!target) {
      continue;
    }
    const localized = localizedEntries[key];
    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i];
      if (localized[field] !== undefined) {
        target[field] = localized[field];
      }
    }
  }
}

function applyLocalizedResourceFields(resourceGroups, localizedGroups) {
  if (!localizedGroups) {
    return;
  }
  for (const category in localizedGroups) {
    const targetGroup = resourceGroups[category];
    const localizedGroup = localizedGroups[category];
    if (!targetGroup) {
      continue;
    }
    applyLocalizedEntryFields(targetGroup, localizedGroup, ['name', 'displayName', 'description']);
  }
}

function applyLocalizedResourcePhaseGroupFields(phaseGroups, localizedGroups) {
  if (!phaseGroups || !localizedGroups) {
    return;
  }
  for (const key in localizedGroups) {
    const targetGroup = phaseGroups[key];
    const localizedGroup = localizedGroups[key];
    if (!targetGroup || !localizedGroup) {
      continue;
    }
    if (localizedGroup.name !== undefined) {
      targetGroup.name = localizedGroup.name;
    }
    if (Array.isArray(localizedGroup.options) && Array.isArray(targetGroup.options)) {
      for (let i = 0; i < localizedGroup.options.length && i < targetGroup.options.length; i += 1) {
        const localizedOption = localizedGroup.options[i];
        const targetOption = targetGroup.options[i];
        if (!localizedOption || !targetOption) {
          continue;
        }
        if (localizedOption.label !== undefined) {
          targetOption.label = localizedOption.label;
        }
      }
    }
  }
}

function applyLocalizedLifeFields(localizedLife) {
  if (!localizedLife) {
    return;
  }
  let targetLifeParameters;
  try {
    targetLifeParameters = lifeParameters;
  } catch (error) {
    return;
  }
  for (const key in localizedLife) {
    const target = targetLifeParameters[key];
    const localizedEntry = localizedLife[key];
    if (!target || !localizedEntry) {
      continue;
    }
    if (localizedEntry.displayName !== undefined) {
      target.displayName = localizedEntry.displayName;
    }
  }
}

function applyLocalizedOrbitalFields(localizedOrbitals) {
  if (!localizedOrbitals) {
    return;
  }
  let orbitals;
  try {
    orbitals = followersOrbitalParameters.orbitals;
  } catch (error) {
    return;
  }
  if (!Array.isArray(orbitals)) {
    return;
  }
  for (let i = 0; i < orbitals.length; i += 1) {
    const orbital = orbitals[i];
    const localizedEntry = localizedOrbitals[orbital.id];
    if (!localizedEntry) {
      continue;
    }
    if (localizedEntry.label !== undefined) {
      orbital.label = localizedEntry.label;
    }
  }
}

function applyLocalizedFactionFields(localizedFactions) {
  if (!localizedFactions) {
    return;
  }
  let factions;
  try {
    factions = galaxyFactionParameters;
  } catch (error) {
    return;
  }
  if (!Array.isArray(factions)) {
    return;
  }
  for (let i = 0; i < factions.length; i += 1) {
    const faction = factions[i];
    const localizedEntry = localizedFactions[faction.id];
    if (!localizedEntry) {
      continue;
    }
    if (localizedEntry.name !== undefined) {
      faction.name = localizedEntry.name;
    }
  }
}

function applyLocalizedPlanetFields(localizedPlanets) {
  if (!localizedPlanets) {
    return;
  }
  applyLocalizedEntryFields(planetParameters, localizedPlanets, ['name', 'description', 'displayName']);
  applyLocalizedEntryFields(planetOverrides, localizedPlanets, ['name', 'description', 'displayName']);
  if (localizedPlanets.default) {
    applyLocalizedEntryFields({ default: defaultPlanetParameters }, localizedPlanets, ['name', 'description', 'displayName']);
  }
  for (const key in localizedPlanets) {
    const localizedPlanet = localizedPlanets[key];
    if (!localizedPlanet) {
      continue;
    }
    const targets = [];
    if (key === 'default') {
      targets.push(defaultPlanetParameters);
    }
    if (planetOverrides[key]) {
      targets.push(planetOverrides[key]);
    }
    if (planetParameters[key]) {
      targets.push(planetParameters[key]);
    }
    for (let i = 0; i < targets.length; i += 1) {
      const target = targets[i];
      if (!target) {
        continue;
      }
      if (localizedPlanet.star) {
        if (!target.star) {
          target.star = {};
        }
        if (localizedPlanet.star.name !== undefined) {
          target.star.name = localizedPlanet.star.name;
        }
      }
      if (localizedPlanet.parentBody) {
        if (!target.celestialParameters) {
          target.celestialParameters = {};
        }
        if (!target.celestialParameters.parentBody) {
          target.celestialParameters.parentBody = {};
        }
        if (localizedPlanet.parentBody.name !== undefined) {
          target.celestialParameters.parentBody.name = localizedPlanet.parentBody.name;
        }
      }
      if (localizedPlanet.hazards) {
        for (const hazardKey in localizedPlanet.hazards) {
          const localizedHazard = localizedPlanet.hazards[hazardKey];
          const targetHazard = target.hazards && target.hazards[hazardKey];
          if (!localizedHazard || !targetHazard) {
            continue;
          }
          if (localizedHazard.description !== undefined) {
            targetHazard.description = localizedHazard.description;
          }
        }
      }
    }
  }
}

function applyLocalizedResearchFields(localizedResearch) {
  if (!localizedResearch) {
    return;
  }
  for (const category in localizedResearch) {
    const researchList = researchParameters[category];
    const localizedCategory = localizedResearch[category];
    if (!researchList || !localizedCategory) {
      continue;
    }
    for (let i = 0; i < researchList.length; i += 1) {
      const research = researchList[i];
      const localizedEntry = localizedCategory[research.id];
      if (!localizedEntry) {
        continue;
      }
      if (localizedEntry.name !== undefined) {
        research.name = localizedEntry.name;
      }
      if (localizedEntry.description !== undefined) {
        research.description = localizedEntry.description;
      }
    }
  }
}

function applyLocalizedSkillFields(localizedSkills) {
  if (!localizedSkills) {
    return;
  }
  for (const key in localizedSkills) {
    const skill = skillParameters[key];
    const localizedSkill = localizedSkills[key];
    if (!skill || !localizedSkill) {
      continue;
    }
    if (localizedSkill.name !== undefined) {
      skill.name = localizedSkill.name;
    }
    if (localizedSkill.description !== undefined) {
      skill.description = localizedSkill.description;
    }
    if (localizedSkill.effectName !== undefined && skill.effect) {
      skill.effect.name = localizedSkill.effectName;
    }
    if (Array.isArray(localizedSkill.effectNames) && Array.isArray(skill.effects)) {
      for (let i = 0; i < localizedSkill.effectNames.length && i < skill.effects.length; i += 1) {
        if (localizedSkill.effectNames[i] !== undefined) {
          skill.effects[i].name = localizedSkill.effectNames[i];
        }
      }
    }
  }
}

function applyLocalizedBuildingFields(localizedBuildings) {
  if (!localizedBuildings) {
    return;
  }
  for (const key in localizedBuildings) {
    const building = buildingsParameters[key];
    const localizedBuilding = localizedBuildings[key];
    if (!building || !localizedBuilding) {
      continue;
    }
    if (localizedBuilding.name !== undefined) {
      building.name = localizedBuilding.name;
    }
    if (localizedBuilding.description !== undefined) {
      building.description = localizedBuilding.description;
    }
    if (localizedBuilding.displayName !== undefined) {
      building.displayName = localizedBuilding.displayName;
    }
    if (localizedBuilding.recipes && building.recipes) {
      for (const recipeKey in localizedBuilding.recipes) {
        const recipe = building.recipes[recipeKey];
        const localizedRecipe = localizedBuilding.recipes[recipeKey];
        if (!recipe || !localizedRecipe) {
          continue;
        }
        if (localizedRecipe.shortName !== undefined) {
          recipe.shortName = localizedRecipe.shortName;
        }
        if (localizedRecipe.displayName !== undefined) {
          recipe.displayName = localizedRecipe.displayName;
        }
      }
    }
  }
}

function applyLocalizedProjectFields(localizedProjects) {
  if (!localizedProjects) {
    return;
  }
  for (const key in localizedProjects) {
    const project = projectParameters[key];
    const localizedProject = localizedProjects[key];
    if (!project || !localizedProject) {
      continue;
    }
    if (localizedProject.name !== undefined) {
      project.name = localizedProject.name;
    }
    if (localizedProject.description !== undefined) {
      project.description = localizedProject.description;
    }
    if (localizedProject.displayName !== undefined) {
      project.displayName = localizedProject.displayName;
    }
    const attributes = project.attributes || null;
    const localizedAttributes = localizedProject.attributes || null;
    if (attributes && localizedAttributes) {
      if (attributes.expansionRecipes && localizedAttributes.expansionRecipes) {
        for (const recipeKey in localizedAttributes.expansionRecipes) {
          const recipe = attributes.expansionRecipes[recipeKey];
          const localizedRecipe = localizedAttributes.expansionRecipes[recipeKey];
          if (recipe && localizedRecipe && localizedRecipe.label !== undefined) {
            recipe.label = localizedRecipe.label;
          }
        }
      }
      if (attributes.lifterStripRecipe && localizedAttributes.lifterStripRecipe && localizedAttributes.lifterStripRecipe.label !== undefined) {
        attributes.lifterStripRecipe.label = localizedAttributes.lifterStripRecipe.label;
      }
      if (attributes.lifterHarvestRecipes && localizedAttributes.lifterHarvestRecipes) {
        for (const recipeKey in localizedAttributes.lifterHarvestRecipes) {
          const recipe = attributes.lifterHarvestRecipes[recipeKey];
          const localizedRecipe = localizedAttributes.lifterHarvestRecipes[recipeKey];
          if (recipe && localizedRecipe && localizedRecipe.label !== undefined) {
            recipe.label = localizedRecipe.label;
          }
        }
      }
    }
  }
}

function applyLocalizedTerraformingRequirementFields(localizedRequirements) {
  if (!localizedRequirements) {
    return;
  }
  let targetRequirements;
  try {
    targetRequirements = terraformingRequirements;
  } catch (error) {
    return;
  }
  for (const key in localizedRequirements) {
    const requirement = targetRequirements[key];
    const localizedRequirement = localizedRequirements[key];
    if (!requirement || !localizedRequirement) {
      continue;
    }
    if (localizedRequirement.displayName !== undefined) {
      requirement.displayName = localizedRequirement.displayName;
    }
    if (localizedRequirement.lore !== undefined) {
      requirement.lore = localizedRequirement.lore;
    }
    const localizedProcesses = localizedRequirement.lifeDesign?.processes;
    const targetProcesses = requirement.lifeDesign?.metabolism?.processes;
    if (localizedProcesses && targetProcesses) {
      for (const processKey in localizedProcesses) {
        const process = targetProcesses[processKey];
        const localizedProcess = localizedProcesses[processKey];
        if (!process || !localizedProcess) {
          continue;
        }
        if (localizedProcess.displayName !== undefined) {
          process.displayName = localizedProcess.displayName;
        }
      }
    }
    const localizedOtherRequirements = localizedRequirement.otherRequirements;
    const targetOtherRequirements = requirement.otherRequirements;
    if (localizedOtherRequirements && Array.isArray(targetOtherRequirements)) {
      for (let i = 0; i < targetOtherRequirements.length; i += 1) {
        const otherRequirement = targetOtherRequirements[i];
        const localizationKey = otherRequirement.projectId || otherRequirement.key || `${i}`;
        const localizedOtherRequirement = localizedOtherRequirements[localizationKey];
        if (!localizedOtherRequirement) {
          continue;
        }
        if (localizedOtherRequirement.label !== undefined) {
          otherRequirement.label = localizedOtherRequirement.label;
        }
        if (localizedOtherRequirement.targetText !== undefined) {
          otherRequirement.targetText = localizedOtherRequirement.targetText;
        }
      }
    }
  }
}

function languageTextToLines(text) {
  if (Array.isArray(text)) {
    return text.slice();
  }
  if (typeof text === 'string') {
    return text.split('\n');
  }
  return [];
}

function applyLocalizedStoryFields(localizedStory) {
  if (!localizedStory) {
    return;
  }
  const localizedChapters = localizedStory.chapters || {};
  for (let i = 0; i < progressData.chapters.length; i += 1) {
    const chapter = progressData.chapters[i];
    const localizedChapter = localizedChapters[chapter.id];
    if (!localizedChapter) {
      continue;
    }
    if (localizedChapter.narrative !== undefined) {
      chapter.narrative = localizedChapter.narrative;
      chapter.narrativeLines = languageTextToLines(localizedChapter.narrative);
    }
    if (chapter.parameters && localizedChapter.text !== undefined) {
      chapter.parameters.text = localizedChapter.text;
      chapter.parameters.textLines = languageTextToLines(localizedChapter.text);
    }
  }

  const localizedProjects = localizedStory.projects || {};
  for (const key in localizedProjects) {
    const project = progressData.storyProjects[key];
    const localizedProject = localizedProjects[key];
    if (!project || !localizedProject) {
      continue;
    }
    if (localizedProject.name !== undefined) {
      project.name = localizedProject.name;
    }
    if (localizedProject.description !== undefined) {
      project.description = localizedProject.description;
    }
    if (Array.isArray(localizedProject.storySteps)) {
      project.attributes.storySteps = localizedProject.storySteps.slice();
      project.attributes.storyStepLines = localizedProject.storySteps.map(languageTextToLines);
    }
  }
}

function applyLanguageToGameData() {
  const catalogs = activeLanguageData.catalogs || {};
  applyLocalizedBuildingFields(catalogs.buildings);
  applyLocalizedProjectFields(catalogs.projects);
  applyLocalizedTerraformingRequirementFields(catalogs.terraformingRequirements);
  applyLocalizedEntryFields(colonyParameters, catalogs.colonies, ['name', 'description', 'displayName']);
  applyLocalizedSkillFields(catalogs.skills);
  applyLocalizedResearchFields(catalogs.research);
  applyLocalizedResourceFields(window.defaultPlanetResources, catalogs.resources);
  applyLocalizedResourcePhaseGroupFields(resourcePhaseGroups, catalogs.resourcePhaseGroups);
  applyLocalizedPlanetFields(catalogs.planets);
  applyLocalizedLifeFields(catalogs.life);
  applyLocalizedOrbitalFields(catalogs.orbitals);
  applyLocalizedFactionFields(catalogs.factions);
  applyLocalizedStoryFields(catalogs.story);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    applyLanguageToDom();
  });
} else {
  applyLanguageToDom();
}
