#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repositoryRoot = path.resolve(__dirname, '..');
const gameVersion = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')).version;
const workRoot = path.join(repositoryRoot, 'artifacts', 'translation-work');
const localizationPath = path.join(repositoryRoot, 'src', 'js', 'lang', 'localization.js');
const sourceDefinitions = [
  {
    sourcePath: path.join(repositoryRoot, 'src', 'js', 'lang', 'current-language.js'),
    patchFile: 'patches/current-language.json',
  },
  {
    sourcePath: path.join(repositoryRoot, 'src', 'js', 'lang', 'story-language.js'),
    patchFile: 'patches/story-language.json',
  },
];
const languages = {
  english: { code: 'en', id: 'english-translation', name: 'English-translation', nativeName: 'English' },
  french: { code: 'fr', id: 'ai-french-translation', name: 'AI-French-translation', nativeName: 'Français' },
  italian: { code: 'it', id: 'ai-italian-translation', name: 'AI-Italian-translation', nativeName: 'Italiano' },
  german: { code: 'de', id: 'ai-german-translation', name: 'AI-German-translation', nativeName: 'Deutsch' },
  spanish: { code: 'es', id: 'ai-spanish-translation', name: 'AI-Spanish-translation', nativeName: 'Español' },
  chinese: { code: 'zh-Hans', id: 'ai-chinese-translation', name: 'AI-Chinese-translation', nativeName: '简体中文' },
  korean: { code: 'ko', id: 'ai-korean-translation', name: 'AI-Korean-translation', nativeName: '한국어' },
  japanese: { code: 'ja', id: 'ai-japanese-translation', name: 'AI-Japanese-translation', nativeName: '日本語' },
  russian: { code: 'ru', id: 'ai-russian-translation', name: 'AI-Russian-translation', nativeName: 'Русский' },
};
const maxBatchCharacters = 100000;
const protectedPattern = /\{[A-Za-z0-9_.-]+\}|\$[A-Z][A-Z0-9_]*\$|<\/?span(?:\s[^>]*)?>|\b[A-Za-z][A-Za-z0-9]*\.btb\b|https?:\/\/[^\s]+/g;

function readSourceLanguage() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(localizationPath, 'utf8'), context, { filename: localizationPath });
  sourceDefinitions.forEach(definition => {
    vm.runInContext(fs.readFileSync(definition.sourcePath, 'utf8'), context, { filename: definition.sourcePath });
  });
  return context.activeLanguageData;
}

function readSourceLanguageParts() {
  return sourceDefinitions.map(definition => {
    const context = {};
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(localizationPath, 'utf8'), context, { filename: localizationPath });
    vm.runInContext(fs.readFileSync(definition.sourcePath, 'utf8'), context, { filename: definition.sourcePath });
    return {
      ...definition,
      data: context.activeLanguageData,
    };
  });
}

function selectLanguageShape(source, translated) {
  if (Array.isArray(source)) {
    return source.map((entry, index) => selectLanguageShape(entry, translated[index]));
  }
  if (source && typeof source === 'object') {
    const output = {};
    Object.keys(source).forEach(key => {
      output[key] = selectLanguageShape(source[key], translated[key]);
    });
    return output;
  }
  return translated;
}

function collectUniqueStrings(value, entries, seen, pathParts = []) {
  if (typeof value === 'string') {
    if (value && value !== 'en' && !seen.has(value)) {
      seen.add(value);
      entries.push({
        id: `u${String(entries.length).padStart(5, '0')}`,
        path: pathParts.join('.'),
        source: value,
        translation: '',
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectUniqueStrings(entry, entries, seen, pathParts.concat(String(index))));
    return;
  }
  Object.keys(value).forEach(key => collectUniqueStrings(value[key], entries, seen, pathParts.concat(key)));
}

function transformLanguage(value, translations, language, pathParts = []) {
  if (typeof value === 'string') {
    if (pathParts.join('.') === 'meta.code') {
      return language.code;
    }
    return value ? translations.get(value) : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => transformLanguage(entry, translations, language, pathParts.concat(String(index))));
  }
  const output = {};
  Object.keys(value).forEach(key => {
    output[key] = transformLanguage(value[key], translations, language, pathParts.concat(key));
  });
  return output;
}

function writeLanguageMod(language, languageData, sourceParts) {
  const modRoot = path.join(repositoryRoot, 'examples', 'local-mods', language.id);
  const patchRoot = path.join(modRoot, 'patches');
  const entries = [];
  collectUniqueStrings(languageData, entries, new Set());
  fs.mkdirSync(patchRoot, { recursive: true });
  const legacyPatchPath = path.join(patchRoot, 'language.json');
  if (fs.existsSync(legacyPatchPath)) {
    fs.unlinkSync(legacyPatchPath);
  }
  sourceParts.forEach(part => {
    const patchData = selectLanguageShape(part.data, languageData);
    fs.writeFileSync(path.join(modRoot, part.patchFile), `${JSON.stringify(patchData, null, 2)}\n`, 'utf8');
  });
  const manifest = {
    schemaVersion: 1,
    id: language.id,
    name: language.name,
    version: gameVersion,
    loadOrder: 1000,
    generatedFrom: 'src/js/lang/current-language.js + src/js/lang/story-language.js',
    generatedStringCount: entries.length,
    content: {
      patches: sourceParts.map(part => ({ target: 'language.current', file: part.patchFile })),
      replacements: [],
    },
  };
  fs.writeFileSync(path.join(modRoot, 'terraforming-titans.mod.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

function protectedTokens(value) {
  return value.match(protectedPattern) || [];
}

function prepare(slug, language, sourceLanguage) {
  const entries = [];
  collectUniqueStrings(sourceLanguage, entries, new Set());
  const languageRoot = path.join(workRoot, slug);
  fs.mkdirSync(languageRoot, { recursive: true });
  fs.readdirSync(languageRoot)
    .filter(filename => /^batch-\d+\.json$/.test(filename))
    .forEach(filename => fs.unlinkSync(path.join(languageRoot, filename)));
  let batches = [];
  let batch = [];
  let characters = 0;
  entries.forEach(entry => {
    const entryCharacters = entry.path.length + entry.source.length + 80;
    if (batch.length && characters + entryCharacters > maxBatchCharacters) {
      batches.push(batch);
      batch = [];
      characters = 0;
    }
    batch.push(entry);
    characters += entryCharacters;
  });
  if (batch.length) {
    batches.push(batch);
  }
  batches.forEach((batchEntries, index) => {
    const document = {
      language: language.nativeName,
      localeCode: language.code,
      instructions: 'Translate every source as a complete, fluent string. Preserve runtime tokens, speaker markers, HTML tags, blueprint filenames, URLs, line breaks, formulas, and character voice. Write only the translation fields.',
      entries: batchEntries,
    };
    const filename = `batch-${String(index + 1).padStart(2, '0')}.json`;
    fs.writeFileSync(path.join(languageRoot, filename), `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  });
  console.log(`Prepared ${entries.length} unique strings in ${batches.length} ${language.nativeName} batches.`);
}

function assemble(slug, language, sourceLanguage, sourceParts) {
  const languageRoot = path.join(workRoot, slug);
  const filenames = fs.readdirSync(languageRoot).filter(filename => /^batch-\d+\.json$/.test(filename)).sort();
  if (!filenames.length) {
    throw new Error(`No translation batches found for ${slug}.`);
  }
  const translations = new Map();
  filenames.forEach(filename => {
    const batch = JSON.parse(fs.readFileSync(path.join(languageRoot, filename), 'utf8'));
    batch.entries.forEach(entry => {
      if (!entry.translation) {
        throw new Error(`${slug}: ${filename} ${entry.id} has no translation.`);
      }
      if (JSON.stringify(protectedTokens(entry.source)) !== JSON.stringify(protectedTokens(entry.translation))) {
        throw new Error(`${slug}: ${filename} ${entry.id} changed a protected runtime token.`);
      }
      translations.set(entry.source, entry.translation);
    });
  });
  const translatedLanguage = transformLanguage(sourceLanguage, translations, language);
  writeLanguageMod(language, translatedLanguage, sourceParts);
  console.log(`Assembled ${language.name} from ${translations.size} unique translations.`);
}

function seedEnglish(language, sourceLanguage, sourceParts) {
  const englishLanguage = JSON.parse(JSON.stringify(sourceLanguage));
  englishLanguage.meta.code = language.code;
  writeLanguageMod(language, englishLanguage, sourceParts);
  console.log(`Seeded ${language.name} with English text.`);
}

function writeEnglishBase(sourceParts) {
  const baseRoot = path.join(workRoot, 'base-english');
  fs.mkdirSync(baseRoot, { recursive: true });
  const legacyBasePath = path.join(baseRoot, 'language.json');
  if (fs.existsSync(legacyBasePath)) {
    fs.unlinkSync(legacyBasePath);
  }
  sourceParts.forEach(part => {
    const filename = path.basename(part.patchFile);
    fs.writeFileSync(path.join(baseRoot, filename), `${JSON.stringify(part.data, null, 2)}\n`, 'utf8');
  });
  console.log(`Wrote English base language files to ${path.relative(repositoryRoot, baseRoot)}.`);
}

const [command, slug] = process.argv.slice(2);
const sourceLanguage = readSourceLanguage();
const sourceParts = readSourceLanguageParts();
if (command === 'seed-english-base' && !slug) {
  writeEnglishBase(sourceParts);
} else {
  const language = languages[slug];
  if (!['prepare', 'assemble', 'seed-english'].includes(command) || (!language && slug !== 'all')) {
    throw new Error('Usage: node scripts/translation-workflow.js <prepare|assemble|seed-english> <english|french|italian|german|spanish|chinese|korean|japanese|russian|all>\n       node scripts/translation-workflow.js seed-english-base');
  }
  const selectedLanguages = slug === 'all' ? Object.entries(languages) : [[slug, language]];
  selectedLanguages.forEach(([selectedSlug, selectedLanguage]) => {
    if (command === 'prepare') {
      prepare(selectedSlug, selectedLanguage, sourceLanguage);
    } else if (command === 'assemble') {
      assemble(selectedSlug, selectedLanguage, sourceLanguage, sourceParts);
    } else {
      seedEnglish(selectedLanguage, sourceLanguage, sourceParts);
    }
  });
}
