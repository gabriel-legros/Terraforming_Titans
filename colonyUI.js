// Helper function to create a need box with dynamic fill and color
function createNeedBox(needName, value, id) {
    const needBox = document.createElement('div');
    needBox.classList.add('need-box');
    needBox.style.width = '150px'; // Set the width for all boxes
    needBox.style.height = '30px';
    needBox.style.border = '1px solid #ccc';
    needBox.style.position = 'relative';
    needBox.style.overflow = 'hidden';
    needBox.style.display = 'inline-block'; // Ensure boxes are inline
    needBox.id = id; // Assign a unique ID to the box
  
    // Create a background to display the text in a readable manner
    const textContainer = document.createElement('div');
    textContainer.style.position = 'absolute';
    textContainer.style.width = '100%';
    textContainer.style.height = '100%';
    textContainer.style.zIndex = '1';
    textContainer.style.textAlign = 'center';
    textContainer.style.lineHeight = '30px';
    textContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'; // Semi-transparent background for readability
    textContainer.style.color = 'black'; // Text color for visibility
    textContainer.innerHTML = `<span>${needName}: ${(value * 100).toFixed(0)}%</span>`;
  
    // Create the fill element
    const fillElement = document.createElement('div');
    fillElement.classList.add('need-fill');
    fillElement.style.width = `${value === 0 ? 100 : value * 100}%`; // Fill fully with red if value is 0
    fillElement.style.height = '100%';
    fillElement.style.backgroundColor = getNeedColor(value);
    fillElement.style.position = 'absolute';
    fillElement.style.top = '0';
    fillElement.style.left = '0';
    fillElement.style.zIndex = '0'; // Ensure it's behind the text container
  
    // Append both the fill and text elements to the need box
    needBox.appendChild(fillElement);
    needBox.appendChild(textContainer);
  
    return needBox;
  }

// Helper function to determine the color based on the value
function getNeedColor(value) {
    if (value === 1) {
      return 'green';
    } else if (value > 0 && value < 1) {
      return 'yellow';
    } else {
      return 'red';
    }
  }