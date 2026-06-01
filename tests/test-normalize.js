// test-normalize.js
import { extractUnit, canonicalizeName, normalize } from '../utils/normalize.js';

const testNames = [
  'Organic Valley Organic Dha Omega 3 Whole Milk',
  'First Street 2% Reduced Fat Milk 1 Gallon',
  'Lucerne Whole Milk 1/2 Gallon',
  // Eggs — should canonicalize to "eggs"
  'First Street Eggs Cage Free Large - 12 Each',
  'Nellies Eggs Brown Large Free Range - 12 Each',
  'Sprouts Cage Free Large Grade A Eggs',
  'Vital Farms Pasture Raised Large Grade A Eggs - 12 Each',
  'First Street Eggs Grade AA Large - 30 Each',
  // Egg products — should NOT canonicalize
  'Anthonys Egg Noodles Extra Wide - 12 Ounce',
  'Minh Egg Rolls Chicken - 16 Each',
  'Just Crack An Egg Classic Breakfast Scramble Kit - 3 Ounce',
  'Chocolate Truffle Eggs',
];

for (const name of testNames) {
  const normalized = normalize(name);
  const canonical = canonicalizeName(normalized);
  const unit = extractUnit(name);
  console.log(`IN:  ${name}`);
  console.log(`OUT: "${canonical}" | unit: ${unit}`);
  console.log('---');
}
