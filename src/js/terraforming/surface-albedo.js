// Optical coverages are resource-keyed; fractions retain the physics model's keys.
// Buried inventories and excluded resources never enter the optical mixture.
function calculateSurfaceFractions(coverages) {
  const model = terraformingParameters.climate.surfaceModel;
  const fractions = {};
  const totals = { priority: 0, volatile: 0, life: 0, deposit: 0 };
  for (const [resource, material] of Object.entries(model.materials)) {
    const coverage = Math.max(0, Math.min(1, coverages[resource] || 0));
    fractions[material.fraction] = coverage;
    totals[material.layer] += coverage;
  }
  const priorityScale = totals.priority > 1 ? 1 / totals.priority : 1;
  let remaining = Math.max(0, 1 - totals.priority * priorityScale);
  const volatileScale = totals.volatile > remaining ? remaining / totals.volatile : 1;
  remaining = Math.max(0, remaining - totals.volatile * volatileScale);
  const lifeScale = totals.life > 0 ? Math.min(1, remaining * model.biomassMaximum / totals.life) : 0;
  remaining = Math.max(0, remaining - totals.life * lifeScale);
  // Deposits are spread over the substrate. Water, ice and life hide their share.
  const depositScale = remaining / Math.max(1, totals.deposit);
  const scales = { priority: priorityScale, volatile: volatileScale, life: lifeScale, deposit: depositScale };
  for (const material of Object.values(model.materials)) {
    fractions[material.fraction] *= scales[material.layer];
  }
  return fractions;
}
