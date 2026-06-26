/**
 * formulaEngine.js
 * =====================================================================
 * Aluminium Fabrication Calculator — Formula Engine
 * =====================================================================
 *
 * RESPONSIBILITY
 * ─────────────────────────────────────────────────────────────────────
 *   - Accept formula strings from the DB (never hardcoded)
 *   - Evaluate them safely with a variable context (all values in
 *     internal units — integers)
 *   - Return integer results (rounded to nearest unit)
 *   - Resolve chains of dependent formulas in correct order
 *
 * USES mathjs — NOT eval()
 *
 * PUBLIC API
 * ─────────────────────────────────────────────────────────────────────
 *   evaluate(formula, context)             → integer units
 *   validateFormula(formula, context)      → { valid, error, missingVars }
 *   extractVariables(formula)              → string[]
 *   resolveFormulas(formulaMap, context)   → { [name]: integer }
 *
 * EXAMPLE FORMULAS (come from DB, never hardcoded here)
 * ─────────────────────────────────────────────────────────────────────
 *   frame_top      = "width"
 *   frame_side     = "height"
 *   shutter_width  = "((width / 2) + overlap) - deduction"
 *   glass_width    = "shutter_width - (bead_left + bead_right)"
 *   glass_height   = "shutter_height - (bead_top + bead_bottom)"
 *
 * =====================================================================
 */

'use strict';

const { create, all } = require('mathjs');

// ─── Create a restricted mathjs instance ─────────────────────────────────────
// Only arithmetic operations are needed — no trig, stats, etc.
// This limits the attack surface if formulas ever come from untrusted input.

const math = create(all);

// Disable functions that have no place in fabrication formulas
// NOTE: do NOT override 'evaluate' or 'parse' — mathjs uses them internally
math.import({
  import:    function() { throw new Error('Function import is disabled'); },
  createUnit:function() { throw new Error('Function createUnit is disabled'); },
  simplify:  function() { throw new Error('Function simplify is disabled'); },
  derivative:function() { throw new Error('Function derivative is disabled'); },
}, { override: true });

// ─── Known mathjs built-ins to exclude from variable extraction ───────────────
const MATHJS_BUILTINS = new Set([
  'e', 'pi', 'i', 'Infinity', 'NaN', 'true', 'false', 'null',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sqrt', 'cbrt', 'exp', 'log', 'log2', 'log10',
  'abs', 'ceil', 'floor', 'round', 'sign', 'min', 'max',
  'mod', 'pow', 'gcd', 'lcm', 'factorial',
]);

// ─── evaluate ────────────────────────────────────────────────────────────────

/**
 * Evaluates a formula string against a variable context.
 *
 * @param  {string} formula   e.g. "((width / 2) + overlap) - deduction"
 * @param  {Object} context   e.g. { width: 868, overlap: 16, deduction: 8 }
 *                            All values must be finite numbers (internal units).
 * @returns {number}          Integer result in internal units
 * @throws  {Error}           On undefined variable, bad formula, or non-numeric result
 */
function evaluate(formula, context = {}) {
  // ── Input guards ────────────────────────────────────────────────────────
  if (!formula || typeof formula !== 'string' || formula.trim() === '') {
    throw new Error('Formula must be a non-empty string');
  }
  if (typeof context !== 'object' || context === null) {
    throw new Error('Context must be a plain object');
  }

  // ── Validate context values ──────────────────────────────────────────────
  for (const [key, value] of Object.entries(context)) {
    if (typeof value !== 'number' || !isFinite(value)) {
      throw new Error(
        `Context variable "${key}" must be a finite number, got: ${JSON.stringify(value)}`
      );
    }
  }

  const trimmed = formula.trim();

  // ── Parse-time syntax check (before evaluation) ───────────────────────────
  // This catches formulas that mathjs silently tolerates but are semantically
  // wrong (e.g. "width +++ overlap" parsed as unary chains).
  try {
    const node = math.parse(trimmed);
    // Dry-run with all-zero dummy context to catch type errors early
    const dummyScope = {};
    for (const key of Object.keys(context)) dummyScope[key] = 0;
    // Also supply any symbols in the formula that aren't in context as 0
    node.traverse(n => {
      if (n.type === 'SymbolNode' && !MATHJS_BUILTINS.has(n.name)) {
        if (!(n.name in dummyScope)) dummyScope[n.name] = 0;
      }
    });
    const dryResult = node.evaluate(dummyScope);
    if (typeof dryResult !== 'number' || !isFinite(dryResult)) {
      throw new Error(`Formula "${trimmed}" does not evaluate to a number`);
    }
  } catch (parseErr) {
    // If parse itself failed, it's a syntax error
    if (!parseErr.message.startsWith('Formula')) {
      throw new Error(`Formula error in "${trimmed}": ${parseErr.message}`);
    }
    throw parseErr;
  }

  // ── Evaluate with real context ────────────────────────────────────────────
  try {
    const scope  = { ...context };
    const result = math.evaluate(trimmed, scope);

    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error(
        `Formula "${trimmed}" returned a non-numeric result: ${result}`
      );
    }

    return Math.round(result);

  } catch (err) {
    // ── Improve error message for undefined variables ──────────────────────
    const undefMatch = err.message.match(/Undefined symbol\s+(\w+)/i);
    if (undefMatch) {
      throw new Error(
        `Undefined variable "${undefMatch[1]}" in formula: "${trimmed}"`
      );
    }
    // ── Re-throw all other errors with formula context ────────────────────
    throw new Error(`Formula error in "${trimmed}": ${err.message}`);
  }
}

// ─── extractVariables ─────────────────────────────────────────────────────────

/**
 * Parses a formula string and returns all user-defined variable names.
 * Excludes mathjs built-in constants and functions.
 *
 * @param  {string} formula
 * @returns {string[]}  Sorted array of variable names
 * @throws  {Error}     On invalid formula syntax
 */
function extractVariables(formula) {
  if (!formula || typeof formula !== 'string' || formula.trim() === '') {
    throw new Error('Formula must be a non-empty string');
  }

  try {
    const node      = math.parse(formula.trim());
    const variables = new Set();

    node.traverse(function (node) {
      // SymbolNode: a named reference that is NOT a function call
      if (node.type === 'SymbolNode' && !MATHJS_BUILTINS.has(node.name)) {
        variables.add(node.name);
      }
    });

    return [...variables].sort();

  } catch (err) {
    throw new Error(
      `Cannot parse formula "${formula}": ${err.message}`
    );
  }
}

// ─── validateFormula ──────────────────────────────────────────────────────────

/**
 * Checks whether a formula is valid and all its variables are present
 * in the provided context.
 *
 * @param  {string} formula
 * @param  {Object} context  Variable context (values don't need to be real —
 *                           dummy integers are fine for validation)
 * @returns {{ valid: boolean, error: string|null, missingVars: string[] }}
 */
function validateFormula(formula, context = {}) {
  // ── Syntax check: can mathjs parse it? ────────────────────────────────────
  let variables;
  try {
    variables = extractVariables(formula);
  } catch (err) {
    return { valid: false, error: err.message, missingVars: [] };
  }

  // ── Check all referenced variables exist in context ───────────────────────
  const contextKeys  = new Set(Object.keys(context));
  const missingVars  = variables.filter(v => !contextKeys.has(v));

  if (missingVars.length > 0) {
    return {
      valid      : false,
      error      : `Missing variables: ${missingVars.join(', ')}`,
      missingVars,
    };
  }

  // ── Try a real evaluation ──────────────────────────────────────────────────
  try {
    evaluate(formula, context);
    return { valid: true, error: null, missingVars: [] };
  } catch (err) {
    return { valid: false, error: err.message, missingVars: [] };
  }
}

// ─── resolveFormulas ──────────────────────────────────────────────────────────

/**
 * Evaluates a map of named formulas in dependency order.
 * Each formula's result is added to the context so dependent formulas
 * can reference it (e.g. glass_width depends on shutter_width).
 *
 * @param  {Object.<string,string>} formulaMap
 *           e.g. {
 *             shutter_width : "((width / 2) + overlap) - deduction",
 *             glass_width   : "shutter_width - (bead_left + bead_right)"
 *           }
 * @param  {Object} baseContext
 *           e.g. { width: 868, overlap: 16, deduction: 8, bead_left: 16, bead_right: 16 }
 * @returns {Object.<string,number>}  Resolved results for every formula name
 * @throws  {Error}  On circular dependency or genuinely missing base variable
 */
function resolveFormulas(formulaMap, baseContext = {}) {
  if (typeof formulaMap !== 'object' || formulaMap === null) {
    throw new Error('formulaMap must be a plain object');
  }

  const results = {};                         // computed outputs
  const context = { ...baseContext };         // grows as formulas resolve
  const pending = { ...formulaMap };          // formulas yet to resolve

  // Max passes = number of formulas (a valid DAG resolves in at most N passes)
  let maxPasses = Object.keys(pending).length;

  while (Object.keys(pending).length > 0) {
    if (maxPasses-- < 0) {
      // We've done more passes than there are formulas — circular dependency
      const stuck = Object.keys(pending).join(', ');
      throw new Error(
        `Cannot resolve formula(s): [${stuck}] — ` +
        `check for missing base variables or circular dependencies`
      );
    }

    let resolvedThisPass = false;

    for (const [name, formula] of Object.entries(pending)) {
      // ── Check if all required variables are available BEFORE evaluating ──
      let vars;
      try { vars = extractVariables(formula); } catch (_) { vars = []; }

      const allAvailable = vars.every(v => v in context);
      if (!allAvailable) continue; // wait for a future pass

      try {
        const result    = evaluate(formula, context);
        results[name]   = result;
        context[name]   = result;   // expose for dependent formulas
        delete pending[name];
        resolvedThisPass = true;
      } catch (err) {
        // Any evaluation error is fatal at this point (all vars are present)
        throw err;
      }
    }

    // If nothing resolved this pass and items remain, we're stuck
    if (!resolvedThisPass && Object.keys(pending).length > 0) {
      const stuck = Object.keys(pending).join(', ');
      throw new Error(
        `Cannot resolve formula(s): [${stuck}] — ` +
        `check for missing base variables or circular dependencies`
      );
    }
  }

  return results;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  evaluate,
  extractVariables,
  validateFormula,
  resolveFormulas,
};
