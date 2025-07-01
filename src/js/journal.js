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
function addJournalEntry(text, eventId = null, source = null) {
  journalQueue.push({ text, eventId, source });
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
  const { text, eventId, source } = journalQueue.shift();
  journalCurrentEventId = eventId;
  const journalEntries = document.getElementById('journal-entries');
  const entry = document.createElement('p');
  journalEntries.appendChild(entry); // Append the empty paragraph first

  const srcObj = source || (eventId ? { type: 'chapter', id: eventId } : null);
  journalEntriesData.push(text); // Store the journal entry in the array
  journalHistoryData.push(text); // Also keep it in the full history
  journalEntrySources.push(srcObj);
  journalHistorySources.push(srcObj);

  let index = 0;

  function typeLetter() {
    if (index < text.length) {
      if (text[index] === '\n') {
        entry.appendChild(document.createElement('br')); // Add a line break element for \n
      } else {
        entry.appendChild(document.createTextNode(text[index])); // Add the current letter as a text node
      }
      index++;

      let delay = (text[index - 1] === '.' || text[index - 1] === '\n') ? 250 : 50;
      setTimeout(typeLetter, delay);
    } else {
      if (!journalUserScrolling) {
        journalEntries.scrollTop = journalEntries.scrollHeight; // Scroll to the latest entry
      }

      console.log("Journal typing complete, dispatching storyJournalFinishedTyping event.");
      const storyEvent = new CustomEvent('storyJournalFinishedTyping', { detail: { eventId: journalCurrentEventId } });
      document.dispatchEvent(storyEvent);

      // Start next entry if queued
      processNextJournalEntry();
    }
  }

  typeLetter();

  if (journalCollapsed) {
    journalUnread = true;
    updateJournalAlert();
  }
}

function loadJournalEntries(entries, history = null, entrySources = null, historySourcesParam = null) {
  const journalEntries = document.getElementById('journal-entries');
  journalEntries.innerHTML = ''; // Clear existing journal entries
  journalQueue = [];
  journalTyping = false;
  journalCurrentEventId = null;

  // Iterate over the saved entries and append them
  entries.forEach(entryText => {
    const entry = document.createElement('p');
    const lines = entryText.split('\n'); // Split the text by newlines
    lines.forEach((line, index) => {
      entry.appendChild(document.createTextNode(line));
      if (index < lines.length - 1) {
        entry.appendChild(document.createElement('br')); // Add a line break for each new line
      }
    });
    journalEntries.appendChild(entry);
  });

  if (!journalUserScrolling) {
    journalEntries.scrollTop = journalEntries.scrollHeight; // Scroll to the latest entry
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
}

/**
 * Clears all entries from the journal display and data array.
 */
function clearJournal() {
  const journalEntries = document.getElementById('journal-entries');
  journalEntries.innerHTML = ''; // Remove all entries from the display
  journalEntriesData = []; // Clear the stored data array but keep history
  journalEntrySources = [];
  journalQueue = [];
  journalTyping = false;
  journalCurrentEventId = null;
  journalUserScrolling = false;
  journalEntries.scrollTop = 0;
}

function updateJournalAlert() {
  const alertEl = document.getElementById('journal-alert');
  if (alertEl) {
    alertEl.style.display = journalUnread ? 'inline' : 'none';
  }
}

function toggleJournal() {
  const journal = document.getElementById('journal');
  const button = document.getElementById('toggle-journal-button');
  journalCollapsed = !journalCollapsed;
  if (journalCollapsed) {
    journal.classList.add('collapsed');
    if (button) button.textContent = 'Show Journal';
  } else {
    journal.classList.remove('collapsed');
    if (button) button.textContent = 'Hide Journal';
    journalUnread = false;
    updateJournalAlert();
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
    const lines = text.split('\n');
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
      return ch.title ? `${ch.title}:\n${ch.narrative}` : ch.narrative;
    }
  } else if (source.type === 'project') {
    const proj = progressData && progressData.storyProjects && progressData.storyProjects[source.id];
    const steps = proj && proj.attributes && proj.attributes.storySteps;
    if (steps && steps[source.step] !== undefined) {
      return steps[source.step];
    }
  }
  return '';
}

function mapSourcesToText(sources) {
  return (sources || []).map(getJournalTextFromSource);
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggle-journal-button');
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleJournal);
  }
  const historyButton = document.getElementById('show-history-button');
  if (historyButton) {
    historyButton.addEventListener('click', showJournalHistory);
  }
  const entriesDiv = document.getElementById('journal-entries');
  if (entriesDiv) {
    entriesDiv.addEventListener('scroll', () => {
      const atBottom = entriesDiv.scrollHeight - entriesDiv.scrollTop <= entriesDiv.clientHeight + 5;
      journalUserScrolling = !atBottom;
    });
  }
});
