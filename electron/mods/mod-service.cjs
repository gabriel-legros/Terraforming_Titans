const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MOD_MANIFEST_FILE = 'terraforming-titans.mod.json';
const SUPPORTED_PATCH_TARGETS = new Set([
  'language.current',
  'parameters.planetResources',
  'parameters.planets',
  'parameters.specialSeeds',
  'parameters.life',
  'parameters.buildings',
  'parameters.colonies',
  'parameters.orbitals',
  'parameters.projects',
  'parameters.skills',
  'parameters.terraformingRequirements'
]);
const ALLOWED_REPLACEMENT_ROOTS = ['src/js/', 'src/css/', 'assets/'];
const PROTECTED_GAME_PATHS = new Set([
  'index.html',
  'package.json',
  'src/js/build-target.js',
  'src/js/game-version.js'
]);
const PROTECTED_GAME_PREFIXES = [
  'electron/',
  'vendor/',
  'src/js/modding/'
];
const DANGEROUS_PATCH_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function normalizeRelativePath(value, label) {
  const normalized = String(value || '').replace(/\\/g, '/');
  if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    throw new Error(`${label} must be a relative path.`);
  }
  const parts = normalized.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.includes('\0'))) {
    throw new Error(`${label} contains an invalid path segment.`);
  }
  return parts.join('/');
}

function isPathInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function resolveDeclaredFile(modRoot, relativePath, label) {
  const normalized = normalizeRelativePath(relativePath, label);
  const candidatePath = path.resolve(modRoot, ...normalized.split('/'));
  if (!fs.existsSync(candidatePath) || !fs.statSync(candidatePath).isFile()) {
    throw new Error(`${label} does not exist: ${normalized}`);
  }
  const realRoot = fs.realpathSync(modRoot);
  const realCandidate = fs.realpathSync(candidatePath);
  if (!isPathInside(realRoot, realCandidate)) {
    throw new Error(`${label} resolves outside the mod folder.`);
  }
  return { normalized, filePath: realCandidate };
}

function validatePatchKeys(value, location = 'patch') {
  if (!value || typeof value !== 'object') {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => validatePatchKeys(entry, `${location}[${index}]`));
    return;
  }
  Object.keys(value).forEach(key => {
    if (DANGEROUS_PATCH_KEYS.has(key)) {
      throw new Error(`${location} contains forbidden key ${key}.`);
    }
    validatePatchKeys(value[key], `${location}.${key}`);
  });
}

function isProtectedGamePath(gamePath) {
  return PROTECTED_GAME_PATHS.has(gamePath)
    || PROTECTED_GAME_PREFIXES.some(prefix => gamePath.startsWith(prefix));
}

function validateReplacementGamePath(value) {
  const gamePath = normalizeRelativePath(value, 'Replacement gamePath');
  if (!ALLOWED_REPLACEMENT_ROOTS.some(prefix => gamePath.startsWith(prefix))) {
    throw new Error(`Replacement path is outside the moddable renderer roots: ${gamePath}`);
  }
  if (isProtectedGamePath(gamePath)) {
    throw new Error(`Replacement path is protected: ${gamePath}`);
  }
  return gamePath;
}

function readJsonFile(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function validateManifest(manifest, folderName) {
  if (!manifest || Object.prototype.toString.call(manifest) !== '[object Object]') {
    throw new Error('Manifest root must be an object.');
  }
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported manifest schemaVersion ${manifest.schemaVersion}.`);
  }
  if (!/^[a-z0-9][a-z0-9._-]{2,79}$/.test(manifest.id || '')) {
    throw new Error('Manifest id must be 3-80 lowercase letters, numbers, dots, underscores, or hyphens.');
  }
  if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
    throw new Error('Manifest name is required.');
  }
  if (typeof manifest.version !== 'string' || !manifest.version.trim()) {
    throw new Error('Manifest version is required.');
  }
  const content = manifest.content || {};
  if (!Array.isArray(content.patches || [])) {
    throw new Error('Manifest content.patches must be an array.');
  }
  if (!Array.isArray(content.replacements || [])) {
    throw new Error('Manifest content.replacements must be an array.');
  }
  if ((content.scripts && content.scripts.length) || (content.styles && content.styles.length)) {
    throw new Error('Extension scripts and additive styles are not available in the local loader yet.');
  }
  return {
    id: manifest.id,
    name: manifest.name.trim(),
    version: manifest.version.trim(),
    loadOrder: Number.isFinite(manifest.loadOrder) ? manifest.loadOrder : 0,
    folderName,
    content
  };
}

function discoverModFolders(modsRoot) {
  if (!fs.existsSync(modsRoot)) {
    return [];
  }
  return fs.readdirSync(modsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.'))
    .map(entry => path.join(modsRoot, entry.name));
}

function getLocalModRoots(appRoot, userDataPath, isPackaged) {
  const roots = [];
  const configuredRoot = process.env.TERRAFORMING_TITANS_MODS_DIR;
  if (configuredRoot) {
    roots.push(path.resolve(configuredRoot));
  }
  roots.push(path.join(userDataPath, 'mods', 'local'));
  if (!isPackaged) {
    roots.push(path.join(appRoot, 'local-mods'));
  }
  return [...new Set(roots.map(root => path.resolve(root)))];
}

function loadLocalMod(modRoot, hash) {
  const manifestPath = path.join(modRoot, MOD_MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing ${MOD_MANIFEST_FILE}.`);
  }
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = validateManifest(JSON.parse(manifestBytes.toString('utf8')), path.basename(modRoot));
  const patches = [];
  const replacements = [];

  hash.update(manifest.id);
  hash.update(manifest.version);
  hash.update(manifestBytes);

  manifest.content.patches.forEach((patchDefinition, index) => {
    if (!patchDefinition || !SUPPORTED_PATCH_TARGETS.has(patchDefinition.target)) {
      throw new Error(`Patch ${index + 1} has unsupported target ${patchDefinition && patchDefinition.target}.`);
    }
    const declaredFile = resolveDeclaredFile(modRoot, patchDefinition.file, `Patch ${index + 1} file`);
    const data = readJsonFile(declaredFile.filePath, `Patch ${index + 1}`);
    if (Object.prototype.toString.call(data) !== '[object Object]') {
      throw new Error(`Patch ${index + 1} root must be an object.`);
    }
    validatePatchKeys(data);
    const bytes = fs.readFileSync(declaredFile.filePath);
    hash.update(patchDefinition.target);
    hash.update(bytes);
    patches.push({ target: patchDefinition.target, file: declaredFile.normalized, data });
  });

  manifest.content.replacements.forEach((replacementDefinition, index) => {
    const gamePath = validateReplacementGamePath(replacementDefinition.gamePath);
    const declaredFile = resolveDeclaredFile(modRoot, replacementDefinition.file, `Replacement ${index + 1} file`);
    const bytes = fs.readFileSync(declaredFile.filePath);
    hash.update(gamePath);
    hash.update(bytes);
    replacements.push({ gamePath, file: declaredFile.normalized, filePath: declaredFile.filePath });
  });

  return { ...manifest, patches, replacements };
}

function createLocalModService({ appRoot, userDataPath, isPackaged }) {
  fs.mkdirSync(path.join(userDataPath, 'mods', 'local'), { recursive: true });
  const localRoots = getLocalModRoots(appRoot, userDataPath, isPackaged);
  const discoveredFolders = localRoots.flatMap(discoverModFolders);
  const errors = [];
  const loadedMods = [];

  discoveredFolders.forEach(modRoot => {
    const preliminaryHash = crypto.createHash('sha256');
    try {
      const mod = loadLocalMod(modRoot, preliminaryHash);
      mod.contentHash = preliminaryHash.digest('hex');
      loadedMods.push(mod);
    } catch (error) {
      errors.push({ folder: path.basename(modRoot), message: error.message });
    }
  });

  loadedMods.sort((a, b) => a.loadOrder - b.loadOrder || a.id.localeCompare(b.id));
  const ids = new Set();
  const activeMods = [];
  loadedMods.forEach(mod => {
    if (ids.has(mod.id)) {
      errors.push({ folder: mod.folderName, message: `Duplicate mod id ${mod.id}.` });
      return;
    }
    ids.add(mod.id);
    activeMods.push(mod);
  });

  const patches = {};
  const replacements = new Map();
  const conflicts = [];
  const sessionHash = crypto.createHash('sha256');
  activeMods.forEach(mod => {
    sessionHash.update(mod.id);
    sessionHash.update(mod.version);
    sessionHash.update(mod.contentHash);
    mod.patches.forEach(patch => {
      if (!patches[patch.target]) {
        patches[patch.target] = [];
      }
      patches[patch.target].push({ modId: mod.id, data: patch.data });
    });
    mod.replacements.forEach(replacement => {
      const previous = replacements.get(replacement.gamePath);
      if (previous) {
        conflicts.push({ gamePath: replacement.gamePath, winner: mod.id, replaced: previous.modId });
      }
      replacements.set(replacement.gamePath, { modId: mod.id, filePath: replacement.filePath });
    });
  });

  const publicSession = {
    schemaVersion: 1,
    fingerprint: activeMods.length ? sessionHash.digest('hex') : '',
    mods: activeMods.map(mod => ({
      id: mod.id,
      name: mod.name,
      version: mod.version,
      contentHash: mod.contentHash
    })),
    patches,
    replacements: [...replacements.entries()].map(([gamePath, replacement]) => ({
      gamePath,
      modId: replacement.modId
    })),
    conflicts,
    errors
  };

  function resolveGameFile(gamePath) {
    const normalized = normalizeRelativePath(gamePath, 'Game path');
    const replacement = !isProtectedGamePath(normalized) && replacements.get(normalized);
    if (replacement) {
      return replacement.filePath;
    }
    const basePath = path.resolve(appRoot, ...normalized.split('/'));
    if (!isPathInside(appRoot, basePath) || !fs.existsSync(basePath) || !fs.statSync(basePath).isFile()) {
      return null;
    }
    return basePath;
  }

  return { publicSession, resolveGameFile };
}

module.exports = { createLocalModService };
