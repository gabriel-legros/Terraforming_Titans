#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAX_SAMPLES_PER_FILE = 3;
const TOP_FILE_LIMIT = 25;

const CATEGORIES = [
  'dom-static',
  'ui-runtime',
  'catalog-data',
  'story-exempt',
  'ignore',
];

const catalogPropertyPattern = /\b(name|displayName|description|title|label|tooltip|text|message|warning|placeholder|confirmLabel|cancelLabel|disabledSource|shortName)\s*:\s*(["'`])([^"'`]*[A-Za-z][^"'`]*)\2/g;
const runtimeAssignmentPattern = /\b(textContent|innerText|innerHTML|title|placeholder|ariaLabel)\s*=\s*(["'`])([^"'`]*[A-Za-z][^"'`]*)\2/g;
const runtimeCallPattern = /\b(createTextNode|alert|confirm|prompt)\(\s*(["'`])([^"'`]*[A-Za-z][^"'`]*)\2/g;
const htmlTextPattern = />\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*</g;
const htmlAttributePattern = /\b(title|placeholder|aria-label)="([^"]*[A-Za-z][^"]*)"/g;

const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  'vendor',
  'LICENSES',
  'test_saves',
  '__tests__',
]);

const ignoredFiles = new Set([
  'src/js/lang/current-language.js',
  'src/js/lang/localization.js',
]);

const debugOnlyFiles = new Set([
  'src/js/planet-visualizer/debug.js',
  'src/js/debug-runtime-monitor.js',
]);

function relativePath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function shouldScanFile(relativeFile) {
  if (ignoredFiles.has(relativeFile)) {
    return false;
  }
  if (relativeFile === 'index.html') {
    return true;
  }
  return relativeFile.startsWith('src/js/') && relativeFile.endsWith('.js');
}

function listFiles(directory) {
  const results = [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const fullPath = path.join(directory, entry.name);
    const rel = relativePath(fullPath);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name) || ignoredDirectories.has(rel)) {
        continue;
      }
      results.push(...listFiles(fullPath));
      continue;
    }
    if (entry.isFile() && shouldScanFile(rel)) {
      results.push(fullPath);
    }
  }
  return results;
}

function isStoryFile(relativeFile) {
  return relativeFile.startsWith('src/js/story/') || relativeFile === 'src/js/progress-data.js';
}

function stripLineComment(line) {
  const commentIndex = line.indexOf('//');
  if (commentIndex < 0) {
    return line;
  }
  const before = line.slice(0, commentIndex);
  const quoteCount = (before.match(/["'`]/g) || []).length;
  return quoteCount % 2 === 0 ? before : line;
}

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function isSymbolOrNumber(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return true;
  }
  const withoutTemplateExpressions = normalized
    .replace(/\$\{[^}]*\}/g, '')
    .replace(/\\u(?:\{[0-9A-Fa-f]+\}|[0-9A-Fa-f]{4})/g, '')
    .trim();
  if (!/[A-Za-z]/.test(withoutTemplateExpressions)) {
    return true;
  }
  if (!/[A-Za-z]/.test(normalized)) {
    return true;
  }
  if (/^[+-]?\d+(?:\.\d+)?\s*[A-Za-zµ²³/]+$/.test(normalized)) {
    return true;
  }
  if (/^x\d+$/i.test(normalized)) {
    return true;
  }
  const unitTokens = withoutTemplateExpressions.replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
  if (unitTokens.length > 0 && unitTokens.every((token) => /^(AU|R⊕|Rₑ|km|W\/m²|m\/s²|K|Pa|kPa|mSv\/day|ha|g|x|land)$/i.test(token))) {
    return true;
  }
  if (/^[A-Z0-9_ .:+\-*/%/<>!=?()[\]{}|&;#.,]+$/.test(normalized) && normalized.length <= 12) {
    return true;
  }
  if (/^#[0-9A-Fa-f]{3,8}$/.test(normalized)) {
    return true;
  }
  if (/^[a-z0-9_-]+\.(js|css|html|json|png|webp|wav)$/i.test(normalized)) {
    return true;
  }
  if (/^https?:\/\//i.test(normalized)) {
    return true;
  }
  return false;
}

const specialSeedOverrideText = new Set([
  'WolfysNightmare',
  'Uranus',
  'Sol',
  'Hermes',
  'Helios',
  'TOI-3693 b',
  'TOI-3693',
  'TheRealPoseidon',
  'Nereid',
  'Sculkia-1c',
  'Sculkia-1',
  'EarthOverrun',
  'Sun',
  'Titania',
  'The pulsar emits periodic radiation bursts across the system.',
  'Intense solar flares generate periodic radiation bursts across the system. The hazard can be cleared by moving the world beyond 1 AU.',
]);

function isAlreadyLocalized(line) {
  return /\bt\(|\bget[A-Za-z0-9_]*Text\(|\bdata-i18n\b|\bdata-i18n-title\b|\bdata-i18n-placeholder\b|\bdata-i18n-aria-label\b|Key:\s*['"]catalogs\./.test(line);
}

function isInternalOrNonPlayerLine(line) {
  return /\b(console|throw new Error|className|classList|querySelector|addEventListener|removeEventListener|dataset|localStorage|sessionStorage)\b/.test(line)
    || /\bsuper\(\{\s*description:/.test(line)
    || /\bdescription:\s*["']Manages\b/.test(line)
    || /\bsource:\s*getStorySource\b/.test(line)
    || /\b(id|key|value|type|category|source|path|token|className)\s*:\s*["'][A-Za-z0-9_.:/# -]+["']/.test(line);
}

function isIgnoredCandidate(relativeFile, line, text, contextLine) {
  if (text === 'unassignedShips') {
    return true;
  }
  if (relativeFile === 'src/js/terraforming/atmospheric-density.js' && /\bname:\s*['"]/.test(line)) {
    return true;
  }
  if (relativeFile === 'src/js/special-seeds.js' && specialSeedOverrideText.has(normalizeText(text))) {
    return true;
  }
  if (debugOnlyFiles.has(relativeFile)) {
    return true;
  }
  if (isSymbolOrNumber(text)) {
    return true;
  }
  if (isAlreadyLocalized(line) || (contextLine && isAlreadyLocalized(contextLine))) {
    return true;
  }
  if (isInternalOrNonPlayerLine(line)) {
    return true;
  }
  return false;
}

function addFinding(report, relativeFile, lineNumber, category, line, text) {
  report.counts[category] += 1;
  if (!report.files[relativeFile]) {
    report.files[relativeFile] = {
      counts: {},
      samples: {},
    };
  }
  const fileEntry = report.files[relativeFile];
  fileEntry.counts[category] = (fileEntry.counts[category] || 0) + 1;
  if (!fileEntry.samples[category]) {
    fileEntry.samples[category] = [];
  }
  if (fileEntry.samples[category].length < MAX_SAMPLES_PER_FILE) {
    fileEntry.samples[category].push({
      line: lineNumber,
      text: normalizeText(text),
      source: normalizeText(line).slice(0, 180),
    });
  }
}

function classifyCandidate(report, relativeFile, lineNumber, desiredCategory, line, text, contextLine) {
  if (isStoryFile(relativeFile)) {
    addFinding(report, relativeFile, lineNumber, 'story-exempt', line, text);
    return;
  }
  if (isIgnoredCandidate(relativeFile, line, text, contextLine)) {
    addFinding(report, relativeFile, lineNumber, 'ignore', line, text);
    return;
  }
  addFinding(report, relativeFile, lineNumber, desiredCategory, line, text);
}

function scanJavaScriptFile(report, relativeFile, content) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const line = stripLineComment(lines[i]);
    const contextLine = [
      stripLineComment(lines[i - 3] || ''),
      stripLineComment(lines[i - 2] || ''),
      stripLineComment(lines[i - 1] || ''),
      line,
      stripLineComment(lines[i + 1] || ''),
      stripLineComment(lines[i + 2] || ''),
      stripLineComment(lines[i + 3] || ''),
    ].join(' ');
    const runtimePatterns = [runtimeAssignmentPattern, runtimeCallPattern];
    for (let patternIndex = 0; patternIndex < runtimePatterns.length; patternIndex += 1) {
      const pattern = runtimePatterns[patternIndex];
      pattern.lastIndex = 0;
      let match = pattern.exec(line);
      while (match) {
        classifyCandidate(report, relativeFile, lineNumber, 'ui-runtime', line, match[3], contextLine);
        match = pattern.exec(line);
      }
    }

    catalogPropertyPattern.lastIndex = 0;
    let catalogMatch = catalogPropertyPattern.exec(line);
    while (catalogMatch) {
      classifyCandidate(report, relativeFile, lineNumber, 'catalog-data', line, catalogMatch[3], contextLine);
      catalogMatch = catalogPropertyPattern.exec(line);
    }
  }
}

function scanHtmlFile(report, relativeFile, content) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const line = lines[i];
    if (isAlreadyLocalized(line)) {
      continue;
    }

    htmlTextPattern.lastIndex = 0;
    let textMatch = htmlTextPattern.exec(line);
    while (textMatch) {
      classifyCandidate(report, relativeFile, lineNumber, 'dom-static', line, textMatch[1]);
      textMatch = htmlTextPattern.exec(line);
    }

    htmlAttributePattern.lastIndex = 0;
    let attributeMatch = htmlAttributePattern.exec(line);
    while (attributeMatch) {
      classifyCandidate(report, relativeFile, lineNumber, 'dom-static', line, attributeMatch[2]);
      attributeMatch = htmlAttributePattern.exec(line);
    }
  }
}

function createReport() {
  return {
    counts: CATEGORIES.reduce((counts, category) => {
      counts[category] = 0;
      return counts;
    }, {}),
    files: {},
  };
}

function printSummary(report) {
  console.log('Localization audit summary');
  console.log('==========================');
  for (let i = 0; i < CATEGORIES.length; i += 1) {
    const category = CATEGORIES[i];
    console.log(`${category.padEnd(14)} ${String(report.counts[category]).padStart(5)}`);
  }

  const actionableCategories = ['dom-static', 'ui-runtime', 'catalog-data'];
  const actionableFiles = Object.entries(report.files)
    .map(([file, entry]) => {
      const actionableCount = actionableCategories.reduce((sum, category) => sum + (entry.counts[category] || 0), 0);
      return { file, entry, actionableCount };
    })
    .filter(item => item.actionableCount > 0)
    .sort((a, b) => b.actionableCount - a.actionableCount || a.file.localeCompare(b.file));

  console.log('');
  console.log(`Top actionable files (first ${TOP_FILE_LIMIT})`);
  console.log('-----------------------------------');
  for (let i = 0; i < Math.min(TOP_FILE_LIMIT, actionableFiles.length); i += 1) {
    const item = actionableFiles[i];
    const parts = actionableCategories
      .filter(category => item.entry.counts[category])
      .map(category => `${category}:${item.entry.counts[category]}`);
    console.log(`${String(item.actionableCount).padStart(5)} ${item.file} (${parts.join(', ')})`);
    for (let c = 0; c < actionableCategories.length; c += 1) {
      const category = actionableCategories[c];
      const samples = item.entry.samples[category] || [];
      for (let s = 0; s < samples.length; s += 1) {
        const sample = samples[s];
        console.log(`      ${category} ${sample.line}: ${sample.source}`);
      }
    }
  }
}

function printJson(report) {
  const output = {
    counts: report.counts,
    files: report.files,
  };
  console.log(JSON.stringify(output, null, 2));
}

function main() {
  const report = createReport();
  const files = listFiles(ROOT);
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const relativeFile = relativePath(file);
    const content = fs.readFileSync(file, 'utf8');
    if (relativeFile === 'index.html') {
      scanHtmlFile(report, relativeFile, content);
      continue;
    }
    scanJavaScriptFile(report, relativeFile, content);
  }

  if (process.argv.includes('--json')) {
    printJson(report);
    return;
  }
  printSummary(report);
}

main();
