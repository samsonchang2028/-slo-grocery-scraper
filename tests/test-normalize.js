// test-normalize.js
import { extractUnit, canonicalizeName, normalize } from '../utils/normalize.js';
  
  const testNames = [
    'Organic Valley Organic Dha Omega 3 Whole Milk',
    'Clover Sonoma Organic Pasture Raised A2 Whole Milk',
    'Alexandre Family Farms Organic A2a2 4 Whole Milk',
    'First Street 2% Reduced Fat Milk 1 Gallon',
    'Horizon Organic Whole Milk Half Gallon',
    'Silk Oat Yeah Oat Milk 64 fl oz',
    'Lucerne Whole Milk 1/2 Gallon',
  ];
  
  for (const name of testNames) {
    const normalized = normalize(name);
    const canonical = canonicalizeName(normalized);
    const unit = extractUnit(name);
    console.log(`IN:  ${name}`);
    console.log(`OUT: "${canonical}" | unit: ${unit}`);
    console.log('---');
  }