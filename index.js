import 'dotenv/config';
import cron from 'node-cron';
import { scrape as scrapeSprouts } from './stores/sprouts.js';
import { scrape as scrapeSmartAndFinal } from './stores/smartandfinal.js';
import { scrape as scrapeCalFresh } from './stores/calfresh.js';
import { scrape as scrapeTraderJoes } from './stores/traderjoes.js';
import { scrape as scrapeGroceryOutlet } from './stores/groceryoutlet.js';
import { normalize, parsePrice, extractUnit, canonicalizeName } from './utils/normalize.js';
import supabase from './utils/supabase.js';

const SCRAPERS = [
    { name: 'Sprouts', scrape: scrapeSprouts, storeIdEnv: 'SPROUTS_STORE_ID' },
    { name: 'Smart & Final', scrape: scrapeSmartAndFinal, storeIdEnv: 'SMART_AND_FINAL_STORE_ID' },
    { name: 'California Fresh Market', scrape: scrapeCalFresh, storeIdEnv: 'CAL_FRESH_STORE_ID' },
    { name: "Trader Joe's", scrape: scrapeTraderJoes, storeIdEnv: 'TRADER_JOES_STORE_ID' },
    // { name: 'Grocery Outlet', scrape: scrapeGroceryOutlet, storeIdEnv: 'GROCERY_OUTLET_STORE_ID' },
];

/**
 * Main scraping orchestrator.
 * - Calls scrape() to get raw products from Sprouts
 * - Normalizes names and parses prices
 * - Upserts products table (case-insensitive dedup)
 * - Inserts price records into prices table
 * - Logs a run summary
 *
 * Requirements: 5.1–5.4, 6.1–6.3, 7.1, 10.1–10.3
 */
const CATEGORY_RULES = [
    { pattern: '(milk|cheese|yogurt|butter|cream|egg|dairy|lactose)', category: 'Dairy' },
    { pattern: '(chicken|beef|pork|salmon|tuna|turkey|steak|ground|sausage|bacon|shrimp|fish|meat)', category: 'Meat & Seafood' },
    { pattern: '(apple|banana|orange|berry|berries|peach|grape|mango|avocado|lemon|lime|strawberry|blueberry)', category: 'Fruit' },
    { pattern: '(lettuce|spinach|kale|broccoli|carrot|tomato|onion|garlic|pepper|celery|cucumber|zucchini|potato)', category: 'Vegetables' },
    { pattern: '(bread|baguette|bagel|muffin|tortilla|roll|bun|sourdough|wheat|grain|einkorn)', category: 'Bakery' },
    { pattern: '(pasta|rice|noodle|quinoa|oat|cereal|flour|penne|fusilli|basmati)', category: 'Grains & Pasta' },
    { pattern: '(juice|water|soda|coffee|tea|drink|beverage|kombucha|lemonade)', category: 'Beverages' },
    { pattern: '(chip|cracker|cookie|snack|pretzel|popcorn|granola|bar|chocolate)', category: 'Snacks' },
    { pattern: '(soap|shampoo|detergent|paper towel|toilet|tissue|cleaning|toothpaste)', category: 'Household' },
];

function classifyCategory(name) {
    for (const { pattern, category } of CATEGORY_RULES) {
        if (new RegExp(pattern, 'i').test(name)) return category;
    }
    return 'Other';
}

export async function runScrape() {
    for (const { name, scrape, storeIdEnv } of SCRAPERS) {
        const storeId = process.env[storeIdEnv];
        if (!storeId) {
            console.warn(`[scraper] Skipping ${name}: ${storeIdEnv} not set`);
            continue;
        }

        try {
            console.log(`[scraper] Starting ${name} scrape run...`);

            const rawProducts = await scrape();

            let insertedCount = 0;
            let newProductsCount = 0;

            for (const raw of rawProducts) {
                const normalizedName = canonicalizeName(normalize(raw.name));
                const unit = extractUnit(raw.name);
                const price = parsePrice(raw.price);
                const originalPrice = raw.originalPrice ? parsePrice(raw.originalPrice) : null;

                if (price === null) {
                    console.warn(`[scraper] Skipping price record for "${normalizedName}": unparseable price "${raw.price}"`);
                    continue;
                }

                if (!normalizedName) {
                    console.warn(`[scraper] Skipping product with empty name after normalization`);
                    continue;
                }

                let productId;
                let query = supabase
                    .from('products')
                    .select('id')
                    .ilike('name', normalizedName);

                query = unit ? query.eq('unit', unit) : query.is('unit', null);

                const { data: existing, error: lookupError } = await query.maybeSingle();

                if (lookupError) {
                    console.error(`[scraper] DB lookup error for "${normalizedName}" (${unit ?? 'no unit'}):`, lookupError.message);
                    continue;
                }

                if (existing) {
                    productId = existing.id;
                } else {
                    const category = classifyCategory(normalizedName);
                    const { data: inserted, error: insertError } = await supabase
                        .from('products')
                        .insert({ name: normalizedName, unit, category })
                        .select('id')
                        .single();

                    if (insertError) {
                        console.error(`[scraper] Failed to insert product "${normalizedName}" (${unit ?? 'no unit'}):`, insertError.message);
                        continue;
                    }

                    productId = inserted.id;
                    newProductsCount++;
                }

                const { error: priceError } = await supabase.from('prices').insert({
                    product_id: productId,
                    store_id: storeId,
                    price: price,
                    original_price: originalPrice,
                    scraped_at: new Date().toISOString(),
                    source_url: raw.sourceUrl,
                });

                if (priceError) {
                    console.error(`[scraper] Failed to insert price for "${normalizedName}":`, priceError.message);
                    continue;
                }

                insertedCount++;
            }

            console.log(`${name}: ${insertedCount} items scraped, ${newProductsCount} new products added`);
        } catch (err) {
            console.error(`[scraper] Unhandled error during ${name} scrape run:`, err.message);
        }
    }
}

if (process.argv.includes('--run-once')) {
    // Used by GitHub Actions — run once and exit
    runScrape().then(() => process.exit(0)).catch((err) => {
        console.error(err);
        process.exit(1);
    });
} else {
    // Run once a week — every Sunday at 06:00
    cron.schedule('0 6 * * 0', () => runScrape().catch(console.error));

    // Immediate run on startup
    runScrape().catch(console.error);
}
