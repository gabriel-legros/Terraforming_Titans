var activeModSession = window.electronMods
  ? window.electronMods.getSession()
  : {
      schemaVersion: 1,
      fingerprint: '',
      mods: [],
      patches: {},
      replacements: [],
      conflicts: [],
      errors: []
    };

const MOD_PATCH_DELETE = {};

function isModPatchObject(value) {
  return !!value && Object.prototype.toString.call(value) === '[object Object]';
}

function decodeModPatchNumber(value) {
  if (value === 'Infinity') {
    return Infinity;
  }
  if (value === '-Infinity') {
    return -Infinity;
  }
  if (value === 'NaN') {
    return NaN;
  }
  throw new Error(`Unsupported mod patch number ${value}.`);
}

function applyModPatchValue(currentValue, patchValue) {
  if (isModPatchObject(patchValue) && patchValue.$delete === true) {
    return MOD_PATCH_DELETE;
  }
  if (isModPatchObject(patchValue) && Object.prototype.hasOwnProperty.call(patchValue, '$number')) {
    return decodeModPatchNumber(patchValue.$number);
  }
  if (isModPatchObject(patchValue) && Object.prototype.hasOwnProperty.call(patchValue, '$replace')) {
    return applyModPatchValue(undefined, patchValue.$replace);
  }
  if (Array.isArray(patchValue)) {
    return patchValue.map(value => applyModPatchValue(undefined, value));
  }
  if (!isModPatchObject(patchValue)) {
    return patchValue;
  }

  const output = isModPatchObject(currentValue) ? currentValue : {};
  for (const key in patchValue) {
    const nextValue = applyModPatchValue(output[key], patchValue[key]);
    if (nextValue === MOD_PATCH_DELETE) {
      delete output[key];
    } else {
      output[key] = nextValue;
    }
  }
  return output;
}

function applyModPatchObject(target, patchData) {
  const patchBody = isModPatchObject(patchData.entries) ? patchData.entries : patchData;
  if (Object.prototype.hasOwnProperty.call(patchBody, '$replace')) {
    const replacement = applyModPatchValue(undefined, patchBody.$replace);
    Object.keys(target).forEach(key => delete target[key]);
    Object.assign(target, replacement);
    return;
  }
  applyModPatchValue(target, patchBody);
}

function getModPatchTarget(targetId) {
  switch (targetId) {
    case 'parameters.planetResources':
      return window.defaultPlanetResources;
    case 'parameters.planets':
      return planetParameters;
    case 'parameters.specialSeeds':
      return specialSeedDefinitions;
    case 'parameters.life':
      return lifeParameters;
    case 'parameters.buildings':
      return buildingsParameters;
    case 'parameters.colonies':
      return colonyParameters;
    case 'parameters.orbitals':
      return followersOrbitalParameters;
    case 'parameters.projects':
      return projectParameters;
    case 'parameters.skills':
      return skillParameters;
    case 'parameters.terraformingRequirements':
      return terraformingRequirements;
  }
  throw new Error(`Unsupported mod patch target ${targetId}.`);
}

function applyModStage(targetId) {
  const targetPatches = activeModSession.patches[targetId] || [];
  for (let i = 0; i < targetPatches.length; i += 1) {
    const patch = targetPatches[i];
    if (targetId === 'language.current') {
      setLanguageData(patch.data);
    } else {
      applyModPatchObject(getModPatchTarget(targetId), patch.data);
    }
  }
}

if (activeModSession.mods.length || activeModSession.errors.length) {
  const activeIds = activeModSession.mods.map(mod => mod.id).join(', ') || 'none';
  console.log(`[Mods] Active: ${activeIds}; validation errors: ${activeModSession.errors.length}.`);
}
