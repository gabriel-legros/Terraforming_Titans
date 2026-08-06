const GRAPHENE_PRINTER_RECIPE = {
  label: '',
  outputCategory: 'spaceStorage',
  outputKey: 'metal',
  baseOutput: 500_000_000_000,
  inputs: {
    spaceStorage: {
      graphite: 500_000_000_000
    },
    space: {
      energy: 400_000_000_000_000_000
    }
  }
};

class GraphenePrinterProject extends SuperalloyGigafoundryProject {
  getText(path, vars, fallback = '') {
    return t(`ui.projects.graphenePrinter.${path}`, vars, fallback);
  }

  getInputResourceKey() {
    return 'graphite';
  }

  getOutputResourceKey() {
    return 'metal';
  }

  getRecipe() {
    GRAPHENE_PRINTER_RECIPE.label = this.getText('recipeLabel', null, 'Metal (Graphene)');
    return GRAPHENE_PRINTER_RECIPE;
  }

  getControlTitleText() {
    return this.getText('title', null, 'Graphene Printer Controls');
  }

  getTotalUnitsLabelText() {
    return this.getText('totalPrinters', null, 'Total Printers');
  }

  getRunToggleText() {
    return this.getText('runPrinters', null, 'Run printers');
  }

  getPrimaryRateText() {
    return `${formatNumber(this.lastSpaceEnergyPerSecond, true, 3)} space energy/s, ${formatNumber(this.lastInputPerSecond, true, 3)} space graphite/s`;
  }

  getExpansionRateText(rate) {
    return this.getText(
      'expansionRate',
      { value: formatNumber(rate, true, 3) },
      `${formatNumber(rate, true, 3)} printers/s`
    );
  }

  getRecipeWgcMultiplier() {
    return 1;
  }

  getOperationNoteText() {
    const parameter = formatNumber(this.getAlchemyParameter(), true, 3);
    return this.getText(
      'operationNote',
      {
        parameter,
        spaceGraphite: formatNumber(GRAPHENE_PRINTER_RECIPE.inputs.spaceStorage.graphite, true),
        spaceEnergy: formatNumber(GRAPHENE_PRINTER_RECIPE.inputs.space.energy, true),
        output: formatNumber(GRAPHENE_PRINTER_RECIPE.baseOutput, true)
      },
      `Runs graphene batches at Assigned x ${parameter}/s. Each batch consumes ${formatNumber(GRAPHENE_PRINTER_RECIPE.inputs.spaceStorage.graphite, true)} space graphite and ${formatNumber(GRAPHENE_PRINTER_RECIPE.inputs.space.energy, true)} space energy for ${formatNumber(GRAPHENE_PRINTER_RECIPE.baseOutput, true)} space metal.`
    );
  }
}

registerProjectConstructor('GraphenePrinterProject', GraphenePrinterProject);
