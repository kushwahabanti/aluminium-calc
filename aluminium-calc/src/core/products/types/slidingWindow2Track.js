'use strict';

module.exports = {

  // ─── IDENTITY ───────────────────────────────────────────
  id:          'sliding-window-2track',
  name:        '2 Track Sliding Window',
  description: 'Standard 2 track aluminium sliding window',

  // ─── INPUTS UI MUST ASK ─────────────────────────────────
  inputs: [
    { key: 'width',    label: 'Overall Width',  required: true },
    { key: 'height',   label: 'Overall Height', required: true },
  ],

  // ─── DEDUCTIONS (all in internal units, 1 inch = 16) ────
  deductions: {
    handle_ded:        24,   // 1½"
    interlock_ded:     24,   // 1½"
    eff_width_ded:      4,   // ¼"
    shutter_inner_ded: 50,   // 3⅛"
    glass_add:         10,   // +⅝"
    glass_height_ded:  50,   // 3⅛"
  },

  // ─── FORMULAS ───────────────────────────────────────────
  // evaluated in order — each result available as variable for next
  formulas: [
    { key: 'top_track',      formula: 'width'                        },
    { key: 'bottom_track',   formula: 'width'                        },
    { key: 'side_track',     formula: 'height'                       },
    { key: 'handle',         formula: 'height - handle_ded'          },
    { key: 'interlock',      formula: 'height - interlock_ded'       },
    { key: 'shutter_width',  formula: '(width - eff_width_ded) / 2'  },
    { key: 'shutter_top',    formula: 'shutter_width - shutter_inner_ded' },
    { key: 'bearing_bottom', formula: 'shutter_width - shutter_inner_ded' },
    { key: 'glass_width',    formula: 'bearing_bottom + glass_add'   },
    { key: 'glass_height',   formula: 'handle - glass_height_ded'    },
  ],

  // ─── SECTIONS (aluminium cut pieces) ────────────────────
  // qty = pieces per window
  // formula_key = which formula result gives the cut size
  sections: [
    { key: 'top_track',      label: 'Top Track',      formula_key: 'top_track',      qty: 1 },
    { key: 'bottom_track',   label: 'Bottom Track',   formula_key: 'bottom_track',   qty: 1 },
    { key: 'side_track',     label: 'Side Track',     formula_key: 'side_track',     qty: 2 },
    { key: 'handle',         label: 'Handle',         formula_key: 'handle',         qty: 2 },
    { key: 'interlock',      label: 'Interlock',      formula_key: 'interlock',      qty: 2 },
    { key: 'shutter_top',    label: 'Shutter Top',    formula_key: 'shutter_top',    qty: 2 },
    { key: 'bearing_bottom', label: 'Bearing Bottom', formula_key: 'bearing_bottom', qty: 2 },
  ],

  // ─── GLASS ──────────────────────────────────────────────
  glass: [
    {
      key:            'main_glass',
      label:          'Main Glass',
      width_key:      'glass_width',
      height_key:     'glass_height',
      qty:            2,
    }
  ],

  // ─── HARDWARE (cost only, no cut size) ──────────────────
  hardware: [
    { key: 'roller',        label: 'Roller',        qty: 4,   qty_type: 'fixed'            },
    { key: 'lock',          label: 'Lock',          qty: 1,   qty_type: 'fixed'            },
    { key: 'rubber_gasket', label: 'Rubber Gasket', qty: 1,   qty_type: 'glass_perimeter'  },
    { key: 'woolpile',      label: 'Woolpile',      qty: 4,   qty_type: 'window_perimeter' },
  ],

  // ─── OUTPUT SECTIONS (for display + PDF) ────────────────
  outputSections: ['sections', 'glass', 'hardware', 'cost', 'profit'],
};
