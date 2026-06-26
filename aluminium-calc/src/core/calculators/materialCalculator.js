/**
 * materialCalculator.js
 * =====================================================================
 * Module 5: Material Calculator
 * Calculates total quantities, weights, and areas based on the cut list.
 * =====================================================================
 */

'use strict';

/**
 * Converts internal units (1/16th of an inch) to decimal feet.
 * @param {number} units 
 * @returns {number} length in feet
 */
function unitsToFeet(units) {
  return units / (16 * 12);
}

/**
 * Converts internal units to decimal square feet (for area calculation).
 * @param {number} widthUnits 
 * @param {number} heightUnits 
 * @returns {number} area in sq ft
 */
function areaSqFt(widthUnits, heightUnits) {
  return unitsToFeet(widthUnits) * unitsToFeet(heightUnits);
}

/**
 * Calculates required material quantities from an array of calculated products (e.g. project mode).
 * @param {Array<Object>} calcResults - Array of outputs from the product calculator
 * @param {Object} ratesData - Object containing sections, glassRates, hardwareItems (from DB)
 * @param {number} [wastagePercent=10] - Percentage to add for cutting waste
 * @returns {Object} material requirements summary
 */
function calculateMaterials(calcResults, ratesData, wastagePercent = 10) {
  // If a single result object is passed instead of an array, wrap it in an array for backwards compatibility
  if (!Array.isArray(calcResults)) {
    calcResults = [calcResults];
  }

  const { sections, hardwareItems } = ratesData;
  const wastageMultiplier = 1 + (wastagePercent / 100);

  // 1. Aluminium Sections
  const aluminiumReq = {};
  
  // Initialize with 0
  sections.forEach(s => {
    aluminiumReq[s.name] = {
      name: s.name,
      label: s.label,
      totalLengthFt: 0,
      totalWeightKg: 0,
      stockLengthsNeeded: 0
    };
  });

  // Variables for totals across all windows
  let totalGlassAreaSqFt = 0;
  let totalWindowAreaSqFt = 0;
  const hardwareReq = {};

  // Accumulate from all calcResults
  calcResults.forEach(calcResult => {
    const { sections: cutList, dimensions, glassConfig, hardwareConfig, inputs } = calcResult;

    // A. Sum lengths from cut list
    cutList.forEach(cut => {
      if (aluminiumReq[cut.sectionKey]) {
        const lengthFt = unitsToFeet(cut.cutSize.units) * cut.qty;
        aluminiumReq[cut.sectionKey].totalLengthFt += lengthFt;
      }
    });

    // B. Calculate total glass area for this window
    if (glassConfig && glassConfig.length > 0) {
      glassConfig.forEach(g => {
        const wUnits = dimensions[g.width_key]?.units || 0;
        const hUnits = dimensions[g.height_key]?.units || 0;
        totalGlassAreaSqFt += areaSqFt(wUnits, hUnits) * g.qty;
      });
    }

    // C. Calculate total window perimeter and glass perimeter (internal units)
    let totalGlassPerimeterUnits = 0;
    if (glassConfig && glassConfig.length > 0) {
      glassConfig.forEach(g => {
        const wUnits = dimensions[g.width_key]?.units || 0;
        const hUnits = dimensions[g.height_key]?.units || 0;
        totalGlassPerimeterUnits += (wUnits + hUnits) * 2;
      });
    }

    const windowW = inputs.width || 0;
    const windowH = inputs.height || 0;
    const totalWindowPerimeterUnits = (windowW + windowH) * 2;
    totalWindowAreaSqFt += areaSqFt(windowW, windowH);

    // D. Hardware & Accessories
    if (hardwareConfig && hardwareConfig.length > 0) {
      hardwareConfig.forEach(hw => {
        let reqQty = hw.qty; // Default static qty or multiplier
        let itemUnit = 'piece';

        if (hw.qty_type === 'glass_perimeter') {
          // reqQty acts as a multiplier (e.g. qty: 1 means 1 * glass perimeter)
          reqQty = unitsToFeet(totalGlassPerimeterUnits) * hw.qty;
          itemUnit = 'per_foot';
        } else if (hw.qty_type === 'window_perimeter') {
          reqQty = unitsToFeet(totalWindowPerimeterUnits) * hw.qty;
          itemUnit = 'per_foot';
        } else if (hw.qty_type === 'per_shutter') {
          // Assume 2 shutters for 2-track sliding window, so reqQty * 2
          reqQty = hw.qty * 2;
        }
        
        // Add to aggregated hardware requirements
        const hwKey = hw.key || hw.name;
        if (!hardwareReq[hwKey]) {
          const dbHardware = hardwareItems?.find(i => i.name === hwKey || i.id === hwKey) || {};
          hardwareReq[hwKey] = {
            name: hwKey,
            label: dbHardware.label || hwKey.replace(/_/g, ' '),
            unit: dbHardware.unit || itemUnit,
            qty: 0
          };
        }
        hardwareReq[hwKey].qty += reqQty;
      });
    }
  });

  // Calculate weights and stock lengths based on aggregated Aluminium Requirements
  Object.values(aluminiumReq).forEach(req => {
    const sectionData = sections.find(s => s.name === req.name);
    if (sectionData && req.totalLengthFt > 0) {
      // Add wastage
      const lengthWithWastage = req.totalLengthFt * wastageMultiplier;
      // Calculate weight by (Total Length / Stock Length) * Weight per Bar
      const stockLengthFt = sectionData.stock_length_ft || 16; 
      req.totalWeightKg = (lengthWithWastage / stockLengthFt) * (sectionData.weight_per_bar || 0);
      
      // Stock lengths needed (round up)
      req.stockLengthsNeeded = Math.ceil(lengthWithWastage / stockLengthFt);
    }
  });

  // Filter out sections that aren't used
  const usedAluminium = Object.values(aluminiumReq).filter(req => req.totalLengthFt > 0);
  const usedHardware = Object.values(hardwareReq).filter(req => req.qty > 0);

  return {
    aluminium: usedAluminium,
    glass: {
      totalAreaSqFt: totalGlassAreaSqFt
    },
    hardware: usedHardware,
    totals: {
      windowAreaSqFt: totalWindowAreaSqFt
    }
  };
}

module.exports = {
  unitsToFeet,
  areaSqFt,
  calculateMaterials
};
