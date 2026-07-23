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
  'parameters.research',
  'parameters.skills',
  'parameters.terraforming',
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
  '__mods__/',
  'electron/',
  'vendor/',
  'src/js/modding/'
];
const DANGEROUS_PATCH_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SUPPORTED_SCRIPT_STAGES = new Set(['constructors']);
const JAVASCRIPT_EXTENSIONS = new Set(['.js']);
const STYLESHEET_EXTENSIONS = new Set(['.css']);
const SUPPORTED_ASSET_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mp3',
  '.mp4',
  '.ogg',
  '.otf',
  '.png',
  '.svg',
  '.ttf',
  '.wav',
  '.webm',
  '.webp',
  '.woff',
  '.woff2'
]);
const MOD_STYLES_MARKER = '<!-- MOD_CONTENT_STYLES -->';
const MOD_CONSTRUCTORS_MARKER = '<!-- MOD_CONTENT_CONSTRUCTORS -->';

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

function validateFileExtension(file, extensions, label) {
  const extension = path.extname(file).toLowerCase();
  if (!extensions.has(extension)) {
    throw new Error(`${label} has unsupported extension ${extension || '(none)'}.`);
  }
}

function validateContentArrays(content) {
  if (!Array.isArray(content.patches || [])) {
    throw new Error('Manifest content.patches must be an array.');
  }
  if (!Array.isArray(content.replacements || [])) {
    throw new Error('Manifest content.replacements must be an array.');
  }
  if (!Array.isArray(content.scripts || [])) {
    throw new Error('Manifest content.scripts must be an array.');
  }
  if (!Array.isArray(content.styles || [])) {
    throw new Error('Manifest content.styles must be an array.');
  }
  if (!Array.isArray(content.assets || [])) {
    throw new Error('Manifest content.assets must be an array.');
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
  validateContentArrays(content);
  return {
    id: manifest.id,
    name: manifest.name.trim(),
    version: manifest.version.trim(),
    loadOrder: Number.isFinite(manifest.loadOrder) ? manifest.loadOrder : 0,
    folderName,
    content: {
      ...content,
      patches: content.patches || [],
      replacements: content.replacements || [],
      scripts: content.scripts || [],
      styles: content.styles || [],
      assets: content.assets || []
    }
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

function loadMod(modRoot, hash, source) {
  const manifestPath = path.join(modRoot, MOD_MANIFEST_FILE);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing ${MOD_MANIFEST_FILE}.`);
  }
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = validateManifest(JSON.parse(manifestBytes.toString('utf8')), path.basename(modRoot));
  const patches = [];
  const replacements = [];
  const scripts = [];
  const styles = [];
  const assets = [];

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

  manifest.content.scripts.forEach((scriptDefinition, index) => {
    if (!scriptDefinition || Object.prototype.toString.call(scriptDefinition) !== '[object Object]') {
      throw new Error(`Script ${index + 1} must be an object.`);
    }
    const stage = String(scriptDefinition.stage || '');
    if (!SUPPORTED_SCRIPT_STAGES.has(stage)) {
      throw new Error(`Script ${index + 1} has unsupported stage ${stage || '(none)'}.`);
    }
    const declaredFile = resolveDeclaredFile(modRoot, scriptDefinition.file, `Script ${index + 1} file`);
    validateFileExtension(declaredFile.normalized, JAVASCRIPT_EXTENSIONS, `Script ${index + 1}`);
    const bytes = fs.readFileSync(declaredFile.filePath);
    hash.update('script');
    hash.update(stage);
    hash.update(declaredFile.normalized);
    hash.update(bytes);
    scripts.push({ stage, file: declaredFile.normalized, filePath: declaredFile.filePath });
  });

  manifest.content.styles.forEach((styleFile, index) => {
    const declaredFile = resolveDeclaredFile(modRoot, styleFile, `Style ${index + 1} file`);
    validateFileExtension(declaredFile.normalized, STYLESHEET_EXTENSIONS, `Style ${index + 1}`);
    const bytes = fs.readFileSync(declaredFile.filePath);
    hash.update('style');
    hash.update(declaredFile.normalized);
    hash.update(bytes);
    styles.push({ file: declaredFile.normalized, filePath: declaredFile.filePath });
  });

  manifest.content.assets.forEach((assetFile, index) => {
    const declaredFile = resolveDeclaredFile(modRoot, assetFile, `Asset ${index + 1} file`);
    validateFileExtension(declaredFile.normalized, SUPPORTED_ASSET_EXTENSIONS, `Asset ${index + 1}`);
    const bytes = fs.readFileSync(declaredFile.filePath);
    hash.update('asset');
    hash.update(declaredFile.normalized);
    hash.update(bytes);
    assets.push({ file: declaredFile.normalized, filePath: declaredFile.filePath });
  });

  return { ...manifest, ...source, patches, replacements, scripts, styles, assets };
}

function createModCatalog({ appRoot, userDataPath, isPackaged, workshopMods = [] }) {
  fs.mkdirSync(path.join(userDataPath, 'mods', 'local'), { recursive: true });
  const localRoots = getLocalModRoots(appRoot, userDataPath, isPackaged);
  const discoveredMods = localRoots.flatMap(root => discoverModFolders(root).map(modRoot => ({
    modRoot,
    source: 'local',
    workshopId: ''
  })));
  workshopMods.forEach(workshopMod => {
    discoveredMods.push({
      modRoot: workshopMod.folder,
      source: 'workshop',
      workshopId: workshopMod.workshopId
    });
  });
  const entries = [];

  discoveredMods.forEach(discoveredMod => {
    const preliminaryHash = crypto.createHash('sha256');
    try {
      const mod = loadMod(discoveredMod.modRoot, preliminaryHash, {
        source: discoveredMod.source,
        workshopId: discoveredMod.workshopId,
        modRoot: discoveredMod.modRoot
      });
      mod.contentHash = preliminaryHash.digest('hex');
      mod.valid = true;
      mod.validationError = '';
      entries.push(mod);
    } catch (error) {
      entries.push({
        id: '',
        name: path.basename(discoveredMod.modRoot),
        version: '',
        loadOrder: 0,
        folderName: path.basename(discoveredMod.modRoot),
        source: discoveredMod.source,
        workshopId: discoveredMod.workshopId,
        modRoot: discoveredMod.modRoot,
        contentHash: '',
        patches: [],
        replacements: [],
        scripts: [],
        styles: [],
        assets: [],
        valid: false,
        validationError: error.message
      });
    }
  });

  entries.sort((a, b) => a.loadOrder - b.loadOrder
    || a.id.localeCompare(b.id)
    || a.source.localeCompare(b.source)
    || a.workshopId.localeCompare(b.workshopId, 'en', { numeric: true })
    || a.folderName.localeCompare(b.folderName));
  const instanceIds = new Map();
  entries.forEach(mod => {
    const localIdentity = mod.id || mod.folderName;
    const baseId = mod.source === 'workshop'
      ? `workshop:${mod.workshopId}`
      : `local:${localIdentity}`;
    const occurrence = (instanceIds.get(baseId) || 0) + 1;
    instanceIds.set(baseId, occurrence);
    mod.instanceId = occurrence === 1 ? baseId : `${baseId}:${occurrence}`;
  });

  const publicItems = entries.map(mod => ({
    instanceId: mod.instanceId,
    id: mod.id,
    name: mod.name,
    version: mod.version,
    loadOrder: mod.loadOrder,
    folderName: mod.folderName,
    source: mod.source,
    workshopId: mod.workshopId,
    contentHash: mod.contentHash,
    valid: mod.valid,
    validationError: mod.validationError,
    patchTargets: [...new Set(mod.patches.map(patch => patch.target))],
    replacementPaths: mod.replacements.map(replacement => replacement.gamePath),
    scriptFiles: mod.scripts.map(script => script.file),
    styleFiles: mod.styles.map(style => style.file),
    assetFiles: mod.assets.map(asset => asset.file)
  }));

  return { entries, publicItems };
}

function createModService({ appRoot, mods, workshopStatus }) {
  const errors = [];
  const ids = new Set();
  const activeMods = [];
  mods.forEach(mod => {
    if (!mod.valid) {
      return;
    }
    if (ids.has(mod.id)) {
      errors.push({
        folder: mod.folderName,
        source: mod.source,
        workshopId: mod.workshopId,
        message: `Duplicate mod id ${mod.id}.`
      });
      return;
    }
    ids.add(mod.id);
    activeMods.push(mod);
  });

  const patches = {};
  const replacements = new Map();
  const modFiles = new Map();
  const constructorScripts = [];
  const styles = [];
  const conflicts = [];
  const sessionHash = crypto.createHash('sha256');
  activeMods.forEach((mod, modIndex) => {
    sessionHash.update(mod.source);
    sessionHash.update(mod.workshopId);
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
    const contentFiles = [...mod.scripts, ...mod.styles, ...mod.assets];
    contentFiles.forEach(contentFile => {
      const virtualPath = `__mods__/${modIndex}/${contentFile.file}`;
      modFiles.set(virtualPath, contentFile.filePath);
      contentFile.virtualPath = virtualPath;
    });
    mod.scripts.forEach(script => {
      if (script.stage === 'constructors') {
        constructorScripts.push({ modId: mod.id, file: script.file, virtualPath: script.virtualPath });
      }
    });
    mod.styles.forEach(style => {
      styles.push({ modId: mod.id, file: style.file, virtualPath: style.virtualPath });
    });
  });

  const publicSession = {
    schemaVersion: 1,
    fingerprint: activeMods.length ? sessionHash.digest('hex') : '',
    mods: activeMods.map(mod => ({
      id: mod.id,
      name: mod.name,
      version: mod.version,
      contentHash: mod.contentHash,
      source: mod.source,
      workshopId: mod.workshopId,
      scripts: mod.scripts.map(script => ({
        file: script.file,
        stage: script.stage,
        url: toVirtualUrl(script.virtualPath)
      })),
      styles: mod.styles.map(style => ({
        file: style.file,
        url: toVirtualUrl(style.virtualPath)
      })),
      assets: mod.assets.map(asset => ({
        file: asset.file,
        url: toVirtualUrl(asset.virtualPath)
      }))
    })),
    patches,
    replacements: [...replacements.entries()].map(([gamePath, replacement]) => ({
      gamePath,
      modId: replacement.modId
    })),
    conflicts,
    errors,
    workshop: workshopStatus || {
      enabled: false,
      initialized: false,
      error: '',
      items: []
    }
  };

  function resolveGameFile(gamePath) {
    const normalized = normalizeRelativePath(gamePath, 'Game path');
    const modFile = modFiles.get(normalized);
    if (modFile) {
      return modFile;
    }
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

  function escapeHtmlAttribute(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function toVirtualUrl(virtualPath) {
    return `/${virtualPath.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
  }

  function injectModContent(indexHtml) {
    if (!indexHtml.includes(MOD_STYLES_MARKER) || !indexHtml.includes(MOD_CONSTRUCTORS_MARKER)) {
      throw new Error('The game index is missing required mod content markers.');
    }
    const styleTags = styles.map(style => (
      `<link rel="stylesheet" href="${escapeHtmlAttribute(toVirtualUrl(style.virtualPath))}" data-mod-id="${escapeHtmlAttribute(style.modId)}">`
    )).join('\n    ');
    const scriptTags = constructorScripts.map(script => (
      `<script src="${escapeHtmlAttribute(toVirtualUrl(script.virtualPath))}" data-mod-id="${escapeHtmlAttribute(script.modId)}"></script>`
    )).join('\n    ');
    return indexHtml
      .replace(MOD_STYLES_MARKER, `${MOD_STYLES_MARKER}${styleTags ? `\n    ${styleTags}` : ''}`)
      .replace(MOD_CONSTRUCTORS_MARKER, `${MOD_CONSTRUCTORS_MARKER}${scriptTags ? `\n    ${scriptTags}` : ''}`);
  }

  return { publicSession, resolveGameFile, injectModContent };
}

module.exports = { createModCatalog, createModService };
