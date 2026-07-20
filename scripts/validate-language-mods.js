#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repositoryRoot = path.resolve(__dirname, '..');
const localizationPath = path.join(repositoryRoot, 'src', 'js', 'lang', 'localization.js');
const sourcePaths = [
  path.join(repositoryRoot, 'src', 'js', 'lang', 'current-language.js'),
  path.join(repositoryRoot, 'src', 'js', 'lang', 'story-language.js'),
];
const languageDefinitions = [
  { slug: 'french', code: 'fr', name: 'AI-French-translation' },
  { slug: 'italian', code: 'it', name: 'AI-Italian-translation' },
  { slug: 'german', code: 'de', name: 'AI-German-translation' },
  { slug: 'spanish', code: 'es', name: 'AI-Spanish-translation' },
  { slug: 'chinese', code: 'zh-Hans', name: 'AI-Chinese-translation' },
  { slug: 'korean', code: 'ko', name: 'AI-Korean-translation' },
  { slug: 'japanese', code: 'ja', name: 'AI-Japanese-translation' },
];
const protectedPattern = /\{[A-Za-z0-9_.-]+\}|\$[A-Z][A-Z0-9_]*\$|<\/?span(?:\s[^>]*)?>|\b[A-Za-z][A-Za-z0-9]*\.btb\b|https?:\/\/[^\s]+/g;

function readSourceLanguage() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(localizationPath, 'utf8'), context, {
    filename: localizationPath,
    timeout: 5000,
  });
  sourcePaths.forEach(sourcePath => {
    vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, {
      filename: sourcePath,
      timeout: 5000,
    });
  });
  return context.activeLanguageData;
}

function protectedTokens(value) {
  return value.match(protectedPattern) || [];
}

function verifyLanguage(source, translated, definition, pathParts = [], stats = { strings: 0, unchanged: 0 }) {
  const keyPath = pathParts.join('.');
  if (typeof source === 'string') {
    if (typeof translated !== 'string') {
      throw new Error(`${definition.slug}: ${keyPath} is no longer a string.`);
    }
    if (keyPath === 'meta.code' && translated !== definition.code) {
      throw new Error(`${definition.slug}: meta.code must be ${definition.code}.`);
    }
    if (JSON.stringify(protectedTokens(source)) !== JSON.stringify(protectedTokens(translated))) {
      throw new Error(`${definition.slug}: ${keyPath} changed a protected runtime token.`);
    }
    stats.strings += 1;
    if (source && source === translated) {
      stats.unchanged += 1;
    }
    return stats;
  }
  if (Array.isArray(source)) {
    if (!Array.isArray(translated) || translated.length !== source.length) {
      throw new Error(`${definition.slug}: ${keyPath} changed array shape.`);
    }
    source.forEach((entry, index) => verifyLanguage(entry, translated[index], definition, pathParts.concat(String(index)), stats));
    return stats;
  }
  if (!translated || Array.isArray(translated) || typeof translated !== 'object') {
    throw new Error(`${definition.slug}: ${keyPath || 'root'} is no longer an object.`);
  }
  const sourceKeys = Object.keys(source);
  const translatedKeys = Object.keys(translated);
  if (JSON.stringify(sourceKeys) !== JSON.stringify(translatedKeys)) {
    throw new Error(`${definition.slug}: ${keyPath || 'root'} changed object keys.`);
  }
  sourceKeys.forEach(key => verifyLanguage(source[key], translated[key], definition, pathParts.concat(key), stats));
  return stats;
}

function verifyPreview(previewPath, definition) {
  const bytes = fs.readFileSync(previewPath);
  if (bytes.length >= 1024 * 1024) {
    throw new Error(`${definition.slug}: preview.png must be smaller than 1 MB.`);
  }
  const pngSignature = '89504e470d0a1a0a';
  if (bytes.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error(`${definition.slug}: preview.png is not a PNG.`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== 1024 || height !== 1024) {
    throw new Error(`${definition.slug}: preview.png must be 1024x1024.`);
  }
  return bytes.length;
}

function main() {
  const sourceLanguage = readSourceLanguage();
  languageDefinitions.forEach(definition => {
    const modRoot = path.join(repositoryRoot, 'examples', 'local-mods', `ai-${definition.slug}-translation`);
    const manifestPath = path.join(modRoot, 'terraforming-titans.mod.json');
    const patchPath = path.join(modRoot, 'patches', 'language.json');
    const previewPath = path.join(modRoot, 'preview.png');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.id !== `ai-${definition.slug}-translation` || manifest.name !== definition.name) {
      throw new Error(`${definition.slug}: manifest id or name is incorrect.`);
    }
    if (manifest.content.patches.length !== 1
      || manifest.content.patches[0].target !== 'language.current'
      || manifest.content.patches[0].file !== 'patches/language.json') {
      throw new Error(`${definition.slug}: language patch declaration is incorrect.`);
    }
    const translated = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
    const stats = verifyLanguage(sourceLanguage, translated, definition);
    const previewBytes = verifyPreview(previewPath, definition);
    console.log(`${definition.name}: ${stats.strings} strings, ${stats.unchanged} intentionally unchanged, ${previewBytes} byte preview`);
  });
}

main();
