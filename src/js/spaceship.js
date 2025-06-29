function assignSpaceshipsToProject(project, count) {
    const availableSpaceships = Math.floor(resources.special.spaceships.value); // Round down to ensure whole values
    project.assignedSpaceships = project.assignedSpaceships || 0;
  
    // Calculate the new spaceship assignment, keeping it within valid bounds
    const adjustedCount = Math.max(-project.assignedSpaceships, Math.min(count, availableSpaceships));
    project.assignedSpaceships += adjustedCount;
  
    // Update resources and the UI
    resources.special.spaceships.value -= adjustedCount;
  }