function createPopup(title, text, buttonText) {
  window.popupActive = true; // Flag that a popup is active
  game.scene.pause('mainScene');
  // Create the overlay div
  const overlay = document.createElement('div');
  overlay.classList.add('popup-overlay');

  // Create the pop-up window
  const popupWindow = document.createElement('div');
  popupWindow.classList.add('popup-window');

  // Create the title element
  const popupTitle = document.createElement('h2');
  popupTitle.classList.add('popup-title');
  popupTitle.textContent = title;

  // Create the text container (for left-justified text)
  const textContainer = document.createElement('div');
  textContainer.classList.add('popup-text-container');

  // Create the text element
  const popupText = document.createElement('p');
  popupText.classList.add('popup-text');

  // Create the close button
  const closeButton = document.createElement('button');
  closeButton.classList.add('popup-close-button');
  closeButton.textContent = buttonText;
  closeButton.style.display = 'none'; // Hide the button initially

  // Close button event listener
  closeButton.addEventListener('click', () => {
    document.body.removeChild(overlay); // Remove the pop-up
    window.popupActive = false; // Clear popup flag
    game.scene.resume('mainScene');  // Resume the 'mainScene' scene
  });

  // Append the text and button to the text container
  textContainer.appendChild(popupText);
  textContainer.appendChild(closeButton);

  // Append title and text container to the pop-up window
  popupWindow.appendChild(popupTitle);
  popupWindow.appendChild(textContainer);

  // Append the pop-up window to the overlay
  overlay.appendChild(popupWindow);

  // Append the overlay to the body
  document.body.appendChild(overlay);

  // Typing animation for the text
  let index = 0;

  function typeLetter() {
    if (index < text.length) {
      // Check for line break characters and handle them as a line break
      if (text[index] === '\n' || text.slice(index, index + 4) === '<br>') {
        popupText.innerHTML += '<br>'; // Add a line break in HTML
        index += (text[index] === '\n') ? 1 : 4; // Skip \n or <br> in the text
      } else {
        popupText.innerHTML += text[index]; // Use innerHTML to support <br>
        index++;
      }
      
      // Check if the current character is a period or a line break for extra delay
      let delay = (text[index - 1] === '.' || text[index - 1] === '\n' || text.slice(index - 4, index) === '<br>') ? 500 : 50; // 500 ms for periods and line breaks, 50 ms for other characters
      setTimeout(typeLetter, delay);
    } else {
      // Show the close button after the text is fully displayed
      closeButton.style.display = 'block';
    }
  }

  typeLetter(); // Start typing the text
}
