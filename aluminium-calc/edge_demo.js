'use strict';
const m = require('./src/core/measurement/measurementEngine');

console.log('=== EDGE CASES — Live Demo ===\n');

// 1. Numeric type input (not string)
console.log('1. Numeric input (not string)');
console.log('   parseToUnits(12.5)     =>', m.parseToUnits(12.5),   '  expected: 200');
console.log('   parseToUnits(0)        =>', m.parseToUnits(0),      '  expected: 0\n');

// 2. Half-sut precision (smallest possible unit)
console.log('2. Half-sut precision (1 unit = 0.5 sut)');
console.log('   parseToUnits("0.5 sut") =>', m.parseToUnits('0.5 sut'), '  expected: 1');
console.log('   unitsToSut(1)           =>', m.unitsToSut(1),  '  expected: 0 inch 0.5 sut\n');

// 3. Very large measurement
console.log('3. Large — 20 feet 11 inches 7.5 sut');
const big = m.parseToUnits('20 feet 11 inches 7.5 sut');
console.log('   units    =>', big);
console.log('   fraction =>', m.unitsToFraction(big));
console.log('   sut      =>', m.unitsToSut(big), '\n');

// 4. Rounding on divide (201 / 2 = 100.5 → rounds to 101)
console.log('4. Rounding: divide(201, 2)');
console.log('   exact  = 100.5');
console.log('   result =>', m.divide(201, 2), '  expected: 101 (rounds UP)\n');

// 5. Subtract to zero
console.log('5. Subtract to zero');
console.log('   subtract(198, 198) =>', m.subtract(198, 198), '  expected: 0\n');

// 6. Multiply by 0.5 (half inch = 8 units)
console.log('6. multiply(16, 0.5)  — half an inch');
console.log('   result =>', m.multiply(16, 0.5), '  expected: 8\n');

// 7. Null / empty / garbage
console.log('7. Invalid inputs → null');
console.log('   parseToUnits(null)      =>', m.parseToUnits(null));
console.log('   parseToUnits("")        =>', m.parseToUnits(''));
console.log('   parseToUnits(undefined) =>', m.parseToUnits(undefined), '\n');

// 8. Divide by zero throws
console.log('8. divide(192, 0) → throws');
try { m.divide(192, 0); } catch(e) { console.log('   Caught:', e.message, '\n'); }

// 9. Float units passed to unitsToFraction → throws
console.log('9. unitsToFraction(12.7) → throws');
try { m.unitsToFraction(12.7); } catch(e) { console.log('   Caught:', e.message, '\n'); }
