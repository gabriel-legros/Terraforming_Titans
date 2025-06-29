let journalEntriesData = []; // Array to store entries currently shown
let journalHistoryData = []; // Array to store all journal history
let journalCollapsed = false;
let journalUnread = false;

// --- New: queue management for sequential typing ---
let journalQueue = [];      // queue of pending entry objects {text, eventId}
let journalTyping = false;  // flag indicating an entry is currently being typed
let journalCurrentEventId = null; // id of the event whose text is typing
function addJournalEntry(text, eventId = null) {
  journalQueue.push({ text, eventId });
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
  const { text, eventId } = journalQueue.shift();
  journalCurrentEventId = eventId;
  const journalEntries = document.getElementById('journal-entries');
  const entry = document.createElement('p');
  journalEntries.appendChild(entry); // Append the empty paragraph first

  journalEntriesData.push(text); // Store the journal entry in the array
  journalHistoryData.push(text); // Also keep it in the full history

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
      journalEntries.scrollTop = journalEntries.scrollHeight; // Scroll to the latest entry

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

function loadJournalEntries(entries, history = null) {
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

  journalEntries.scrollTop = journalEntries.scrollHeight; // Scroll to the latest entry
  journalEntriesData = entries; // Restore the journalEntriesData array
  if (history) {
    journalHistoryData = history.slice();
  } else {
    journalHistoryData = entries.slice();
  }
}

/**
 * Clears all entries from the journal display and data array.
 */
function clearJournal() {
  const journalEntries = document.getElementById('journal-entries');
  journalEntries.innerHTML = ''; // Remove all entries from the display
  journalEntriesData = []; // Clear the stored data array but keep history
  journalQueue = [];
  journalTyping = false;
  journalCurrentEventId = null;
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

document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggle-journal-button');
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleJournal);
  }
  const historyButton = document.getElementById('show-history-button');
  if (historyButton) {
    historyButton.addEventListener('click', showJournalHistory);
  }
});
