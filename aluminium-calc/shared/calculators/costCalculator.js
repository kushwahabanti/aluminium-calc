/**
 * costCalculator.js
 * =====================================================================
 * Module 6: Cost & Profit Calculator
 * Calculates costs for materials and applies profit margins.
 * =====================================================================
 */

'use strict';

/**
 * Calculates itemized costs based on materials and rates.
 * @param {Object} materials - Output from materialCalculator.calculateMaterials
 * @param {Object} ratesData - Object containing sections, glassRates, hardwareItems (from DB)
 * @param {Object} selectedGlassRate - The specific glass rate object chosen by user
 * @returns {Object} cost breakdown
 */
function calculateCosts(materials, ratesData, selectedGlassRate) {
  const { sections, hardwareItems } = ratesData;
  let totalAluminiumCost = 0;
  let totalGlassCost = 0;
  let totalHardwareCost = 0;

  // 1. Aluminium Costs
  const globalAluminiumRate = ratesData.globalAluminiumRate || 180;
  let totalAluminiumWeightKg = 0;

  const aluminiumCosts = materials.aluminium.map(req => {
    // Individual cost based on global rate for transparency
    const cost = req.totalWeightKg * globalAluminiumRate;
    totalAluminiumWeightKg += req.totalWeightKg;
    return {
      name: req.name,
      label: req.label,
      weightKg: req.totalWeightKg,
      ratePerKg: globalAluminiumRate,
      cost: cost
    };
  });
  
  totalAluminiumCost = totalAluminiumWeightKg * globalAluminiumRate;

  // 2. Glass Cost
  const glassRate = selectedGlassRate ? selectedGlassRate.rate_per_sqft : 0;
  totalGlassCost = materials.glass.totalAreaSqFt * glassRate;

  // 3. Hardware Costs
  const hardwareCosts = materials.hardware.map(req => {
    const hwData = hardwareItems.find(h => h.name === req.name);
    const ratePerPiece = hwData ? hwData.rate_per_piece : 0;
    const cost = req.qty * ratePerPiece;
    totalHardwareCost += cost;
    return {
      name: req.name,
      label: req.label,
      qty: req.qty,
      rate: ratePerPiece,
      unit: req.unit,
      cost: cost
    };
  });

  const totalMaterialCost = totalAluminiumCost + totalGlassCost + totalHardwareCost;

  return {
    itemized: {
      aluminium: aluminiumCosts,
      glass: {
        areaSqFt: materials.glass.areaSqFt,
        ratePerSqFt: glassRate,
        cost: totalGlassCost
      },
      hardware: hardwareCosts
    },
    totals: {
      aluminium: totalAluminiumCost,
      totalAluminiumWeightKg,
      glass: totalGlassCost,
      hardware: totalHardwareCost,
      materialOnly: totalMaterialCost
    }
  };
}

/**
 * Calculates selling price and net profit based on individual window sqft rates.
 * @param {number} totalMaterialCost 
 * @param {Array} projectList - List of windows with dimensions and customRate
 * @param {Array} windowResults - Results from calculator containing area for each window
 * @returns {Object} pricing details
 */
function calculatePricing(totalMaterialCost, projectList, windowResults) {
  let sellingPrice = 0;
  let totalAreaSqFt = 0;

  projectList.forEach((proj, idx) => {
    const wRes = windowResults[idx]; // Arrays align exactly
    if (wRes && wRes.inputs) {
      // inputs.width and inputs.height are in 1/16th of an inch (192 units per foot)
      const windowW = wRes.inputs.width || 0;
      const windowH = wRes.inputs.height || 0;
      const area = (windowW / 192) * (windowH / 192) * proj.qty;
      const rate = proj.customRate || 0;
      sellingPrice += area * rate;
      totalAreaSqFt += area;
    }
  });

  const netProfit = sellingPrice - totalMaterialCost;
  const marginPct = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;

  return {
    makingCost: totalMaterialCost,
    sellingPrice: sellingPrice,
    netProfit: netProfit,
    marginPct: marginPct,
    areaSqFt: totalAreaSqFt,
  };
}

export { calculateCosts, calculatePricing };
