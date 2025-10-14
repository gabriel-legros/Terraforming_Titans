let journalEntriesData = []; // Array to store entry text currently shown
let journalEntrySources = []; // Matching array of entry sources
let journalHistoryData = []; // Array to store all journal history text
let journalHistorySources = []; // Matching array of history entry sources
let journalCollapsed = false;
let journalUnread = false;

// --- New: queue management for sequential typing ---
let journalQueue = [];      // queue of pending entry objects {text, eventId, source}
let journalTyping = false;  // flag indicating an entry is currently being typed
let journalCurrentEventId = null; // id of the event whose text is typing
let journalUserScrolling = false;
let journalChapterIndex = 0;
let journalIndexVisible = false;
let journalIndexContainer = null;
let journalIndexIcon = null;
let journalEntriesContainer = null;
let journalObjectiveContainer = null;
let journalNavContainerElement = null;
let cachedJournalWorlds = null;
let journalChapterMetaById = null;
let collapsedJournalWorlds = new Set();

const storySourceCache = new Map();

function loadStoryModule(modulePath) {
  try {
    return require(modulePath);
  } catch (err) {
    return null;
  }
}

function getStorySource(getter, modulePath) {
  if (storySourceCache.has(modulePath)) {
    return storySourceCache.get(modulePath);
  }
  let source;
  try {
    source = getter();
  } catch (err) {
    if (!err || err.name !== 'ReferenceError') {
      throw err;
    }
    source = null;
  }
  const resolved = source || loadStoryModule(modulePath);
  storySourceCache.set(modulePath, resolved);
  return resolved;
}

const PRIMARY_DIRECTIVE_WORLD_ID = 'primary';
const PRIMARY_DIRECTIVE_LABEL = 'Primary Directive';
const PRIMARY_DIRECTIVE_CHAPTER_ID = 'chapter.primaryDirective';
const PRIMARY_DIRECTIVE_CHAPTER_NUMBER = 0;
const PRIMARY_DIRECTIVE_TITLE = 'Primary Directives';
const PRIMARY_DIRECTIVE_LINES = [
  'Directive 1: Establish a sustainable habitat on Mars for human colonization.',
  'Directive 2: Ensure the safety and well-being of all colonists.',
  'Directive 3: Maintain operational stability.'
];

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = cb =>
    setTimeout(() => cb(typeof performance !== 'undefined' ? performance.now() : Date.now()), 16);
}
if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = id => clearTimeout(id);
}

function joinLines(text) {
  return Array.isArray(text) ? text.join('\n') : text;
}

function getChapterNumber(id) {
  const m = /^chapter(\d+)/.exec(id);
  return m ? parseInt(m[1], 10) : null;
}

function getChapterNumberFromSource(src) {
  if (src && src.type === 'chapter') {
    const ch = (progressData && progressData.chapters || []).find(c => c.id === src.id);
    return ch && ch.chapter !== undefined ? ch.chapter : getChapterNumber(src.id);
  }
  return null;
}

function getJournalChapterGroups() {
  ensureJournalWorldData();
  const groups = [];
  let current = null;
  let currentNum = null;
  let currentWorldId = null;
  for (let i = 0; i < journalHistoryData.length; i++) {
    const src = journalHistorySources[i];
    const text = journalHistoryData[i];
    const chNum = getChapterNumberFromSource(src);
    const meta = src && src.id ? journalChapterMetaById && journalChapterMetaById.get(src.id) : null;
    const worldId = meta ? meta.worldId : null;
    if (chNum !== null) {
      if (chNum !== currentNum || worldId !== currentWorldId) {
        currentNum = chNum;
        currentWorldId = worldId;
        current = chNum >= 0 ? { chapterId: src.id, chapterNum: chNum, worldId, entries: [], sources: [] } : null;
        if (current) groups.push(current);
      }
    } else if (!current) {
      currentNum = null;
      currentWorldId = null;
      current = { chapterId: null, chapterNum: null, worldId: null, entries: [], sources: [] };
      // group without chapter number is not shown when navigating but keep for completeness
    }
    if (current) {
      current.entries.push(text);
      current.sources.push(src);
    }
  }
  return groups;
}

function ensureJournalWorldData() {
  if (cachedJournalWorlds && journalChapterMetaById) {
    return cachedJournalWorlds;
  }
  journalChapterMetaById = new Map();
  const worlds = [
    { id: 'mars', label: 'Mars', source: getStorySource(() => progressMars, './story/mars.js') },
    { id: 'titan', label: 'Titan', source: getStorySource(() => progressTitan, './story/titan.js') },
    { id: 'callisto', label: 'Callisto', source: getStorySource(() => progressCallisto, './story/callisto.js') },
    { id: 'ganymede', label: 'Ganymede', source: getStorySource(() => progressGanymede, './story/ganymede.js') },
    { id: 'vega2', label: 'Vega-2', source: getStorySource(() => progressVega2, './story/vega2.js') },
    { id: 'venus', label: 'Venus', source: getStorySource(() => progressVenus, './story/venus.js') }
  ].filter(world => world.source && Array.isArray(world.source.chapters));
  const standardWorlds = [];
  worlds.forEach(world => {
    const chapters = world.source.chapters;
    chapters.forEach(chapter => {
      if (chapter && chapter.id) {
        journalChapterMetaById.set(chapter.id, { worldId: world.id, chapter: chapter.chapter });
      }
    });
    standardWorlds.push({
      id: world.id,
      label: world.label,
      chapters
    });
  });
  const directiveChapter = { id: PRIMARY_DIRECTIVE_CHAPTER_ID, chapter: PRIMARY_DIRECTIVE_CHAPTER_NUMBER, title: PRIMARY_DIRECTIVE_TITLE };
  journalChapterMetaById.set(PRIMARY_DIRECTIVE_CHAPTER_ID, { worldId: PRIMARY_DIRECTIVE_WORLD_ID, chapter: PRIMARY_DIRECTIVE_CHAPTER_NUMBER });
  cachedJournalWorlds = [{
    id: PRIMARY_DIRECTIVE_WORLD_ID,
    label: PRIMARY_DIRECTIVE_LABEL,
    chapters: [directiveChapter]
  }].concat(standardWorlds);
  return cachedJournalWorlds;
}

function buildJournalIndex() {
  const worlds = ensureJournalWorldData();
  journalIndexContainer.innerHTML = '';
  const seenByWorld = new Map();
  const unlockedChaptersByWorld = new Map();
  journalHistorySources.forEach(source => {
    if (source && source.type === 'chapter') {
      if (journalChapterMetaById) {
        const meta = journalChapterMetaById.get(source.id);
        if (meta) {
          if (!seenByWorld.has(meta.worldId)) {
            seenByWorld.set(meta.worldId, new Set());
          }
          seenByWorld.get(meta.worldId).add(meta.chapter);
          if (!unlockedChaptersByWorld.has(meta.worldId)) {
            unlockedChaptersByWorld.set(meta.worldId, new Set());
          }
          unlockedChaptersByWorld.get(meta.worldId).add(meta.chapter);
        }
      }
    }
  });

  worlds.forEach(world => {
    const block = document.createElement('div');
    block.className = 'journal-index-world';
    if (collapsedJournalWorlds.has(world.id)) {
      block.classList.add('collapsed');
    }

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'journal-index-world-header';
    header.textContent = world.label;
    header.addEventListener('click', () => {
      block.classList.toggle('collapsed');
      if (block.classList.contains('collapsed')) {
        collapsedJournalWorlds.add(world.id);
      } else {
        collapsedJournalWorlds.delete(world.id);
      }
    });
    block.appendChild(header);

    if (world.id === PRIMARY_DIRECTIVE_WORLD_ID) {
      const directivesList = document.createElement('ul');
      directivesList.className = 'journal-index-chapters';
      PRIMARY_DIRECTIVE_LINES.forEach(line => {
        const item = document.createElement('li');
        item.className = 'journal-index-directive';
        item.textContent = line;
        directivesList.appendChild(item);
      });
      block.appendChild(directivesList);
      journalIndexContainer.appendChild(block);
      return;
    }

    const unlockedForWorld = unlockedChaptersByWorld.get(world.id);
    if (!unlockedForWorld || unlockedForWorld.size === 0) {
      return;
    }

    const list = document.createElement('ul');
    list.className = 'journal-index-chapters';

    const chaptersByNumber = [];
    world.chapters.forEach(chapter => {
      const num = chapter.chapter;
      if (num >= 0 && !chaptersByNumber.includes(num)) {
        chaptersByNumber.push(num);
      }
    });
    chaptersByNumber.sort((a, b) => a - b);

    chaptersByNumber.forEach(chapterNumber => {
      if (!unlockedForWorld.has(chapterNumber)) {
        return;
      }
      const item = document.createElement('li');
      item.className = 'journal-index-chapter';
      item.textContent = world.id === PRIMARY_DIRECTIVE_WORLD_ID ? PRIMARY_DIRECTIVE_TITLE : `Chapter ${chapterNumber}`;
      item.addEventListener('click', () => {
        jumpJournalToWorldChapter(world.id, chapterNumber);
      });
      list.appendChild(item);
    });

    block.appendChild(list);
    journalIndexContainer.appendChild(block);
  });
}

function openJournalIndex() {
  ensureJournalWorldData();
  journalIndexVisible = true;
  journalIndexIcon.classList.add('active');
  journalIndexIcon.title = 'Hide journal index';
  journalIndexContainer.classList.remove('hidden');
  journalEntriesContainer.classList.add('hidden');
  journalObjectiveContainer.classList.add('hidden');
  journalNavContainerElement.classList.add('hidden');
  buildJournalIndex();
}

function closeJournalIndex() {
  journalIndexVisible = false;
  journalIndexIcon.classList.remove('active');
  journalIndexIcon.title = 'Show journal index';
  journalIndexContainer.classList.add('hidden');
  journalEntriesContainer.classList.remove('hidden');
  journalObjectiveContainer.classList.remove('hidden');
  journalNavContainerElement.classList.remove('hidden');
}

function toggleJournalIndex() {
  if (journalIndexVisible) {
    closeJournalIndex();
    return;
  }
  openJournalIndex();
}

function jumpJournalToWorldChapter(worldId, chapterNumber) {
  if (worldId === PRIMARY_DIRECTIVE_WORLD_ID) {
    return;
  }
  closeJournalIndex();
  const groups = getJournalChapterGroups();
  const index = groups.findIndex(group => group.worldId === worldId && group.chapterNum === chapterNumber);
  if (index >= 0) {
    displayJournalChapter(index);
  }
}

function updateJournalNavArrows() {
  const prev = document.getElementById('journal-prev');
  const next = document.getElementById('journal-next');
  const groups = getJournalChapterGroups();
  // Clamp index to valid range so new games don't start at -1
  if (groups.length === 0) {
    journalChapterIndex = 0;
  } else {
    journalChapterIndex = Math.min(Math.max(journalChapterIndex, 0), groups.length - 1);
  }

  if (prev && next) {
    prev.classList.toggle('disabled', journalChapterIndex <= 0);
    next.classList.toggle('disabled', journalChapterIndex >= groups.length - 1);
  }
}

function displayJournalChapter(index) {
  const groups = getJournalChapterGroups();
  const group = groups[index];
  if (!group) return;
  loadJournalEntries(group.entries, journalHistoryData, group.sources, journalHistorySources);
  journalChapterIndex = index;
  updateJournalNavArrows();
}
function addJournalEntry(text, eventId = null, source = null) {
  let entryText = joinLines(text);

  let separator = false;
  if (source && source.type === 'project' &&
      progressData && progressData.storyProjects && progressData.storyProjects[source.id]) {
    const proj = progressData.storyProjects[source.id];
    const total = proj.attributes && Array.isArray(proj.attributes.storySteps)
      ? proj.attributes.storySteps.length : 0;
    const stepNum = (typeof source.step === 'number') ? source.step + 1 : 1;
    entryText = `${proj.name} ${stepNum}/${total}: ${entryText}`;
    separator = true;
  }

  journalQueue.push({ text: entryText, eventId, source, separator });
  if (!journalTyping) {
    processNextJournalEntry();
  }
}

function processNextJournalEntry() {
  if (journalQueue.length === 0) {
    journalTyping = false;
    journalCurrentEventId = null;
    return;
  }

  journalTyping = true;
  const { text, eventId, source, separator } = journalQueue.shift();
  journalCurrentEventId = eventId;
  const journalEntries = document.getElementById('journal-entries');
  const journalContainer = document.getElementById('journal');
  if (separator) {
    const hr = document.createElement('hr');
    hr.classList.add('journal-entry-separator');
    journalEntries.appendChild(hr);
  }

  const entry = document.createElement('p');
  journalEntries.appendChild(entry); // Append the empty paragraph first

  const srcObj = source || (eventId ? { type: 'chapter', id: eventId } : null);
  const prevGroupsLength = getJournalChapterGroups().length;
  journalEntriesData.push(text); // Store the journal entry in the array
  journalHistoryData.push(text); // Also keep it in the full history
  journalEntrySources.push(srcObj);
  journalHistorySources.push(srcObj);

  // If this entry started a new chapter, automatically move to it
  const newGroupsLength = getJournalChapterGroups().length;
  if (newGroupsLength > prevGroupsLength) {
    journalChapterIndex = newGroupsLength - 1;
  }
  updateJournalNavArrows();
  if (journalIndexVisible) {
    buildJournalIndex();
  }

  let index = 0;
  let lastTimestamp = 0;

  const typeLetter = (timestamp) => {
    if (!lastTimestamp) {
      lastTimestamp = timestamp;
    }

    let elapsed = timestamp - lastTimestamp;
    let delay = (index > 0 && (text[index - 1] === '.' || text[index - 1] === '\n')) ? 250 : 50;

    while (elapsed >= delay && index < text.length) {
      if (text[index] === '\n') {
        entry.appendChild(document.createElement('br'));
      } else {
        entry.appendChild(document.createTextNode(text[index]));
      }
      index++;
      elapsed -= delay;
      delay = (index > 0 && (text[index - 1] === '.' || text[index - 1] === '\n')) ? 250 : 50;
    }
    lastTimestamp = timestamp - elapsed;

    if (!journalUserScrolling && journalContainer) {
      journalContainer.scrollTop = journalContainer.scrollHeight;
    }

    if (index < text.length) {
      requestAnimationFrame(typeLetter);
    } else {
      if (!journalUserScrolling && journalContainer) {
        journalContainer.scrollTop = journalContainer.scrollHeight;
      }

      const storyEvent = new CustomEvent('storyJournalFinishedTyping', { detail: { eventId: journalCurrentEventId } });
      document.dispatchEvent(storyEvent);

      processNextJournalEntry();
    }
  };

  requestAnimationFrame(typeLetter);

  if (journalCollapsed) {
    journalUnread = true;
    updateJournalAlert();
  }
}

function loadJournalEntries(entries, history = null, entrySources = null, historySourcesParam = null) {
  const journalEntries = document.getElementById('journal-entries');
  const journalContainer = document.getElementById('journal');
  journalEntries.innerHTML = ''; // Clear existing journal entries
  journalQueue = [];
  journalTyping = false;
  journalCurrentEventId = null;

  // Iterate over the saved entries and append them
  entries.forEach(entryText => {
    const entry = document.createElement('p');
    const lines = joinLines(entryText).split('\n'); // Split the text by newlines
    lines.forEach((line, index) => {
      entry.appendChild(document.createTextNode(line));
      if (index < lines.length - 1) {
        entry.appendChild(document.createElement('br')); // Add a line break for each new line
      }
    });
    journalEntries.appendChild(entry);
  });

  if (!journalUserScrolling && journalContainer) {
    journalContainer.scrollTop = journalContainer.scrollHeight; // Scroll to the latest entry
  }
  journalEntriesData = entries;
  journalEntrySources = entrySources ? entrySources.slice() : new Array(entries.length).fill(null);
  if (history) {
    journalHistoryData = history.slice();
    journalHistorySources = historySourcesParam ? historySourcesParam.slice() : journalEntrySources.slice();
  } else {
    journalHistoryData = entries.slice();
    journalHistorySources = journalEntrySources.slice();
  }
  journalChapterIndex = getJournalChapterGroups().length - 1;
  updateJournalNavArrows();
  if (journalIndexVisible) {
    buildJournalIndex();
  }
}

/**
 * Clears all entries from the journal display and data array.
 */
function clearJournal() {
  const journalEntries = document.getElementById('journal-entries');
  const journalContainer = document.getElementById('journal');
  if (journalQueue && journalQueue.length) {
    journalQueue.forEach(({ text, eventId, source }) => {
      const srcObj = source || (eventId ? { type: 'chapter', id: eventId } : null);
      journalHistoryData.push(text);
      journalHistorySources.push(srcObj);
    });
  }
  journalEntries.innerHTML = ''; // Remove all entries from the display
  journalEntriesData = []; // Clear the stored data array but keep history
  journalEntrySources = [];
  journalQueue = [];
  journalTyping = false;
  journalCurrentEventId = null;
  journalUserScrolling = false;
  if (journalContainer) journalContainer.scrollTop = 0;
  journalChapterIndex = getJournalChapterGroups().length - 1;
  updateJournalNavArrows();
  if (journalIndexVisible) {
    buildJournalIndex();
  }
}

/**
 * Completely resets the journal, clearing both current entries and history.
 */
function resetJournal() {
  clearJournal();
  journalHistoryData = [];
  journalHistorySources = [];
}

function updateJournalAlert() {
  const showButton = document.getElementById('show-journal-button');
  if (showButton) {
    showButton.classList.toggle('unread', journalUnread);
  }
}

function updateShowJournalButtonPosition() {
  const showButton = document.getElementById('show-journal-button');
  const topBar = document.querySelector('.top-bar');
  if (showButton && topBar) {
    const topBarRect = topBar.getBoundingClientRect();
    showButton.style.top = `${topBarRect.bottom + 13}px`;
  }
}

function toggleJournal() {
  const journal = document.getElementById('journal');
  const showButton = document.getElementById('show-journal-button');
  journalCollapsed = !journalCollapsed;
  if (journalCollapsed) {
    if (journalIndexVisible) {
      closeJournalIndex();
    }
    journal.classList.add('collapsed');
    showButton.classList.remove('hidden');
    updateShowJournalButtonPosition();
    document.body.classList.add('journal-collapsed'); // Add class to body for CSS targeting
  } else {
    journal.classList.remove('collapsed');
    showButton.classList.add('hidden');
    journalUnread = false;
    updateJournalAlert();
    if (showButton) {
      showButton.classList.remove('unread');
    }
    document.body.classList.remove('journal-collapsed'); // Remove class from body
  }
}

function showJournalHistory() {
  const overlay = document.createElement('div');
  overlay.classList.add('history-overlay');

  const windowDiv = document.createElement('div');
  windowDiv.classList.add('history-window');

  const title = document.createElement('h2');
  title.textContent = 'Journal History';

  const entriesContainer = document.createElement('div');
  entriesContainer.classList.add('history-entries');
  journalHistoryData.forEach(text => {
    const entry = document.createElement('p');
    const lines = joinLines(text).split('\n');
    lines.forEach((line, idx) => {
      entry.appendChild(document.createTextNode(line));
      if (idx < lines.length - 1) {
        entry.appendChild(document.createElement('br'));
      }
    });
    entriesContainer.appendChild(entry);
  });

  const closeBtn = document.createElement('button');
  closeBtn.classList.add('history-close-button');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  windowDiv.appendChild(title);
  windowDiv.appendChild(entriesContainer);
  windowDiv.appendChild(closeBtn);

  overlay.appendChild(windowDiv);
  document.body.appendChild(overlay);
}

function getJournalTextFromSource(source) {
  if (!source) return '';
  if (typeof source === 'string') {
    source = { type: 'chapter', id: source };
  }
  if (source.type === 'chapter') {
    const ch = (progressData && progressData.chapters || []).find(c => c.id === source.id);
    if (ch) {
      const lines = ch.narrativeLines || [ch.narrative];
      if (ch.title) {
        return joinLines([`${ch.title}:`, ...lines]);
      }
      return joinLines(lines);
    }
  } else if (source.type === 'project') {
    const proj = progressData && progressData.storyProjects && progressData.storyProjects[source.id];
    const steps = proj && proj.attributes && (proj.attributes.storyStepLines || proj.attributes.storySteps);
    if (steps && steps[source.step] !== undefined) {
      let text = joinLines(steps[source.step]);
      if (proj && proj.name) {
        const total = Array.isArray(proj.attributes?.storySteps) ? proj.attributes.storySteps.length : (Array.isArray(proj.attributes?.storyStepLines) ? proj.attributes.storyStepLines.length : steps.length);
        const stepNum = (typeof source.step === 'number') ? source.step + 1 : 1;
        text = `${proj.name} ${stepNum}/${total}: ${text}`;
      }
      return text;
    }
  }
  return '';
}

function mapSourcesToText(sources) {
  return (sources || []).map(getJournalTextFromSource);
}

document.addEventListener('DOMContentLoaded', () => {
  journalEntriesContainer = document.getElementById('journal-entries');
  journalIndexContainer = document.getElementById('journal-index');
  journalIndexIcon = document.getElementById('journal-index-icon');
  journalObjectiveContainer = document.getElementById('current-objective');
  journalNavContainerElement = document.getElementById('journal-nav-container');
  if (journalIndexIcon) {
    journalIndexIcon.addEventListener('click', toggleJournalIndex);
  }
  const toggleIcon = document.getElementById('journal-toggle-icon');
  if (toggleIcon) {
    toggleIcon.addEventListener('click', toggleJournal);
  }
  const showButton = document.getElementById('show-journal-button');
  if (showButton) {
    showButton.addEventListener('click', toggleJournal);
  }
  document.addEventListener('dayNightCycleToggled', updateShowJournalButtonPosition);
  const prevArrow = document.getElementById('journal-prev');
  if (prevArrow) {
    prevArrow.addEventListener('click', () => {
      if (journalChapterIndex > 0) {
        displayJournalChapter(journalChapterIndex - 1);
      }
    });
  }
  const nextArrow = document.getElementById('journal-next');
  if (nextArrow) {
    nextArrow.addEventListener('click', () => {
      const groups = getJournalChapterGroups();
      if (journalChapterIndex < groups.length - 1) {
        displayJournalChapter(journalChapterIndex + 1);
      }
    });
  }
  const entriesDiv = document.getElementById('journal');
  if (entriesDiv) {
    entriesDiv.addEventListener('scroll', () => {
      const atBottom = entriesDiv.scrollHeight - entriesDiv.scrollTop <= entriesDiv.clientHeight + 5;
      journalUserScrolling = !atBottom;
    });
  }
  updateJournalNavArrows();

  // Initialize body class based on journal state
  if (journalCollapsed) {
    document.body.classList.add('journal-collapsed');
  }
});
