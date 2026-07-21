#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repositoryRoot = path.resolve(__dirname, '..');
const workRoot = path.join(repositoryRoot, 'artifacts', 'translation-work');
const localizationPath = path.join(repositoryRoot, 'src', 'js', 'lang', 'localization.js');
const sourcePaths = [
  path.join(repositoryRoot, 'src', 'js', 'lang', 'current-language.js'),
  path.join(repositoryRoot, 'src', 'js', 'lang', 'story-language.js'),
];
const languages = {
  french: { code: 'fr', name: 'AI-French-translation', nativeName: 'Français' },
  italian: { code: 'it', name: 'AI-Italian-translation', nativeName: 'Italiano' },
  german: { code: 'de', name: 'AI-German-translation', nativeName: 'Deutsch' },
  spanish: { code: 'es', name: 'AI-Spanish-translation', nativeName: 'Español' },
  chinese: { code: 'zh-Hans', name: 'AI-Chinese-translation', nativeName: '简体中文' },
  korean: { code: 'ko', name: 'AI-Korean-translation', nativeName: '한국어' },
  japanese: { code: 'ja', name: 'AI-Japanese-translation', nativeName: '日本語' },
};
const maxBatchCharacters = 100000;
const protectedPattern = /\{[A-Za-z0-9_.-]+\}|\$[A-Z][A-Z0-9_]*\$|<\/?span(?:\s[^>]*)?>|\b[A-Za-z][A-Za-z0-9]*\.btb\b|https?:\/\/[^\s]+/g;

function readSourceLanguage() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(localizationPath, 'utf8'), context, { filename: localizationPath });
  sourcePaths.forEach(sourcePath => {
    vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), context, { filename: sourcePath });
  });
  return context.activeLanguageData;
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

function writeLanguageMod(slug, language, languageData) {
  const modRoot = path.join(repositoryRoot, 'examples', 'local-mods', `ai-${slug}-translation`);
  const patchRoot = path.join(modRoot, 'patches');
  const entries = [];
  collectUniqueStrings(languageData, entries, new Set());
  fs.mkdirSync(patchRoot, { recursive: true });
  fs.writeFileSync(path.join(patchRoot, 'language.json'), `${JSON.stringify(languageData, null, 2)}\n`, 'utf8');
  const manifest = {
    schemaVersion: 1,
    id: `ai-${slug}-translation`,
    name: language.name,
    version: '1.0.0',
    loadOrder: 1000,
    generatedFrom: 'src/js/lang/current-language.js + src/js/lang/story-language.js',
    generatedStringCount: entries.length,
    content: {
      patches: [{ target: 'language.current', file: 'patches/language.json' }],
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

function assemble(slug, language, sourceLanguage) {
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
  writeLanguageMod(slug, language, translatedLanguage);
  console.log(`Assembled ${language.name} from ${translations.size} unique translations.`);
}

function seedEnglish(slug, language, sourceLanguage) {
  const englishLanguage = JSON.parse(JSON.stringify(sourceLanguage));
  englishLanguage.meta.code = language.code;
  writeLanguageMod(slug, language, englishLanguage);
  console.log(`Seeded ${language.name} with English text.`);
}

function writeEnglishBase(sourceLanguage) {
  const baseRoot = path.join(workRoot, 'base-english');
  fs.mkdirSync(baseRoot, { recursive: true });
  fs.writeFileSync(path.join(baseRoot, 'language.json'), `${JSON.stringify(sourceLanguage, null, 2)}\n`, 'utf8');
  console.log(`Wrote English base language file to ${path.relative(repositoryRoot, baseRoot)}.`);
}

const [command, slug] = process.argv.slice(2);
const sourceLanguage = readSourceLanguage();
if (command === 'seed-english-base' && !slug) {
  writeEnglishBase(sourceLanguage);
} else {
  const language = languages[slug];
  if (!['prepare', 'assemble', 'seed-english'].includes(command) || (!language && slug !== 'all')) {
    throw new Error('Usage: node scripts/translation-workflow.js <prepare|assemble|seed-english> <french|italian|german|spanish|chinese|korean|japanese|all>\n       node scripts/translation-workflow.js seed-english-base');
  }
  const selectedLanguages = slug === 'all' ? Object.entries(languages) : [[slug, language]];
  selectedLanguages.forEach(([selectedSlug, selectedLanguage]) => {
    if (command === 'prepare') {
      prepare(selectedSlug, selectedLanguage, sourceLanguage);
    } else if (command === 'assemble') {
      assemble(selectedSlug, selectedLanguage, sourceLanguage);
    } else {
      seedEnglish(selectedSlug, selectedLanguage, sourceLanguage);
    }
  });
}
