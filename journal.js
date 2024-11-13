let journalEntriesData = []; // Array to store journal entries

function addJournalEntry(text) {
  const journalEntries = document.getElementById('journal-entries');
  const entry = document.createElement('p');
  journalEntries.appendChild(entry); // Append the empty paragraph first

  journalEntriesData.push(text); // Store the journal entry in the array

  let index = 0;

  function typeLetter() {
    if (index < text.length) {
      if (text[index] === '\n') {
        entry.appendChild(document.createElement('br')); // Add a line break element for \n
      } else {
        entry.textContent += text[index]; // Add the current letter
      }
      index++;

      let delay = (text[index - 1] === '.' || text[index - 1] === '\n') ? 250 : 50;
      setTimeout(typeLetter, delay);
    } else {
      journalEntries.scrollTop = journalEntries.scrollHeight; // Scroll to the latest entry

      // Dispatch a custom event to signal that typing is complete
      const event = new Event('journalTypedComplete');
      journalEntries.dispatchEvent(event);
    }
  }

  typeLetter();
}

function loadJournalEntries(entries) {
  const journalEntries = document.getElementById('journal-entries');
  journalEntries.innerHTML = ''; // Clear existing journal entries

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
}

/**
 * Clears all entries from the journal display and data array.
 */
function clearJournal() {
  const journalEntries = document.getElementById('journal-entries');
  journalEntries.innerHTML = ''; // Remove all entries from the display
  journalEntriesData = []; // Clear the stored data array
}
