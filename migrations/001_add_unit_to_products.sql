-- Migration: add unit column to products and update unique constraint
-- Run this in the Supabase SQL editor before the next scrape.

-- 1. Drop the old unique constraint on name alone
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key;

-- 2. Add the unit column (nullable — products without a size stay null)
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT;

-- 3. New unique constraint on (name, unit) — treats NULL as distinct per SQL standard,
--    so we use a partial unique index to also enforce uniqueness among null-unit rows.
CREATE UNIQUE INDEX IF NOT EXISTS products_name_unit_key
    ON products (lower(name), unit)
    WHERE unit IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_name_null_unit_key
    ON products (lower(name))
    WHERE unit IS NULL;

-- 4. (Optional) Clean up old duplicate milk rows that differ only by brand.
--    Run this only if you want to wipe existing messy data and start fresh.
--    WARNING: this deletes all existing products and their price history.
--
-- TRUNCATE prices, products RESTART IDENTITY CASCADE;
