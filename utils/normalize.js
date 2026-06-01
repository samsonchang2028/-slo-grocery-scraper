/**
 * Cleans and standardizes a raw product name string.
 * Pure function — no side effects, no I/O.
 *
 * Transformation pipeline (applied in order):
 *   1. Trim leading/trailing whitespace
 *   2. Convert to lowercase
 *   3. Remove characters that are not alphanumeric, spaces, or hyphens
 *   4. Collapse multiple consecutive spaces into one
 *   5. Trim again (in case step 3 left leading/trailing spaces)
 *
 * Idempotent: normalize(normalize(x)) === normalize(x) for all valid inputs.
 *
 * @param {string} raw - Raw product name string
 * @returns {string} Cleaned, normalized product name
 */
export function normalize(raw) {
    return raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 \-]/g, '')
        .replace(/ {2,}/g, ' ')
        .trim();
}

/**
 * Parses a price string into a numeric value rounded to 2 decimal places.
 * Strips all non-numeric characters except '.' before parsing.
 *
 * @param {string} raw - Raw price string, e.g. "$3.99", "3.99", "12.5"
 * @returns {number|null} Parsed price as a number, or null if unparseable
 */
export function parsePrice(raw) {
    if (typeof raw !== 'string') return null;
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const n = parseFloat(cleaned);
    if (isNaN(n)) return null;
    return Math.round(n * 100) / 100;
}

// Ordered from most specific to least so "half gallon" matches before "gallon"
const UNIT_PATTERNS = [
    [/\b(half\s*gal(?:lon)?|1\/2\s*gal(?:lon)?|0\.5\s*gal(?:lon)?)\b/i, '1/2 gal'],
    [/(?<![0-9\/])\b(2\s*gal(?:lon)?s?)\b/i, '2 gal'],
    [/\b(1\s*gal(?:lon)?|one\s*gal(?:lon)?)\b/i, '1 gal'],
    [/\b(\d+(?:\.\d+)?\s*gal(?:lon)?s?)\b/i, (m) => `${m[1].replace(/\s+/g, ' ').toLowerCase()}`],
    [/\b(64\s*fl?\s*oz)\b/i,            '64 oz'],
    [/\b(32\s*fl?\s*oz)\b/i,            '32 oz'],
    [/\b(16\s*fl?\s*oz)\b/i,            '16 oz'],
    [/\b(\d+)\s*fl?\s*oz\b/i,           (m) => `${m[1]} oz`],
    [/\b(\d+(?:\.\d+)?)\s*lb s?\b/i,    (m) => `${m[1]} lb`],
    [/\b(\d+(?:\.\d+)?)\s*kg\b/i,       (m) => `${m[1]} kg`],
    [/\b(\d+)\s*ct\b/i,                 (m) => `${m[1]} ct`],
    [/\b(\d+)\s*count\b/i,              (m) => `${m[1]} ct`],
    [/\b(\d+)\s*pack\b/i,               (m) => `${m[1]} pk`],
];

/**
 * Extracts a canonical unit/size string from a raw product name.
 * Returns null if no recognizable unit is found.
 *
 * @param {string} raw - Raw product name, e.g. "Organic Valley Whole Milk 1 Gallon"
 * @returns {string|null} e.g. "1 gal", "1/2 gal", "64 oz", null
 */
export function extractUnit(raw) {
    if (typeof raw !== 'string') return null;
    for (const [pattern, label] of UNIT_PATTERNS) {
        const m = raw.match(pattern);
        if (m) return typeof label === 'function' ? label(m) : label;
    }
    return null;
}

// Maps keywords found in a normalized name to a canonical product name.
// Checked in order — first match wins.
const CANONICAL_RULES = [
    [/\boat\s*milk\b/,          'oat milk'],
    [/\balmond\s*milk\b/,       'almond milk'],
    [/\bsoy\s*milk\b/,          'soy milk'],
    [/\bcoconut\s*milk\b/,      'coconut milk'],
    [/\b2\s*%\s*milk\b/,        '2% milk'],
    [/\breduced\s*fat\s*milk\b/, '2% milk'],
    [/\b1\s*%\s*milk\b/,        '1% milk'],
    [/\blow\s*fat\s*milk\b/,    '1% milk'],
    [/\bskim\s*milk\b/,         'skim milk'],
    [/\bnonfat\s*milk\b/,       'skim milk'],
    [/\bfat\s*free\s*milk\b/,   'skim milk'],
    [/\bwhole\s*milk\b/,        'whole milk'],
    [/\bchicken\s*breast\b/,    'chicken breast'],
    [/\bground\s*beef\b/,       'ground beef'],
    [/\bcheddar\s*cheese\b/,    'cheddar cheese'],
    [/\bgreek\s*yogurt\b/,      'greek yogurt'],
    [/\borange\s*juice\b/,      'orange juice'],
    [/\bbaby\s*spinach\b/,      'baby spinach'],
    [/\bcanned\s*tomato/,       'canned tomatoes'],
];

/**
 * Maps a normalized product name to a canonical generic name, stripping brand
 * names and modifiers. Falls back to the input if no rule matches.
 *
 * @param {string} normalized - Already-normalized product name
 * @returns {string} Canonical name, e.g. "whole milk", "2% milk"
 */
export function canonicalizeName(normalized) {
    for (const [pattern, canonical] of CANONICAL_RULES) {
        if (pattern.test(normalized)) return canonical;
    }
    return normalized;
}
