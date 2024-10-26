function autoBuild(buildings){
    const population = resources.colony.colonists.value;
    for (const buildingName in buildings) {
        const building = buildings[buildingName];
        if(building.autoBuildEnabled){
            if(building.count < (building.autoBuildPercent*population / 100)){
                building.build();
            }
        }
    }
}