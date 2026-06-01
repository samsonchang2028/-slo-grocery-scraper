UPDATE products
  SET name = initcap(
      trim(
        regexp_replace(name,
  '\s*-?\s*\d+(\.\d+)?\s*(oz|lb|g|kg|ml|fl
  oz|ct|ea|pack|count)?\s*$', '', 'i')
      )
    )
  WHERE name ~ '\d'
    AND NOT EXISTS (
      SELECT 1 FROM products p2
      WHERE p2.id != products.id
        AND initcap(trim(
              regexp_replace(p2.name,
  '\s*-?\s*\d+(\.\d+)?\s*(oz|lb|g|kg|ml|fl
  oz|ct|ea|pack|count)?\s*$', '', 'i')
            )) =
            initcap(trim(
              regexp_replace(products.name,
  '\s*-?\s*\d+(\.\d+)?\s*(oz|lb|g|kg|ml|fl
  oz|ct|ea|pack|count)?\s*$', '', 'i')
            ))
    );

  Run the category update separately (that one doesn't touch the
  unique name column so it won't conflict):

  UPDATE products SET category =
    CASE
      WHEN name ~*
  '(milk|cheese|yogurt|butter|cream|egg|dairy|oat milk|lactose)'
   THEN 'Dairy'
      WHEN name ~*
  '(chicken|beef|pork|salmon|tuna|turkey|steak|ground|sausage|ba
  con|shrimp|fish|meat)' THEN 'Meat & Seafood'
      WHEN name ~*
  '(apple|banana|orange|berry|berries|peach|grape|mango|avocado|
  lemon|lime|strawberry|blueberry)' THEN 'Fruit'
      WHEN name ~*
  '(lettuce|spinach|kale|broccoli|carrot|tomato|onion|garlic|pep
  per|celery|cucumber|zucchini|potato)' THEN 'Vegetables'
      WHEN name ~*
  '(bread|baguette|bagel|muffin|tortilla|roll|bun|sourdough|whea
  t|grain|einkorn)' THEN 'Bakery'
      WHEN name ~*
  '(pasta|rice|noodle|quinoa|oat|cereal|flour|penne|fusilli|basm
  ati)' THEN 'Grains & Pasta'
      WHEN name ~*
  '(juice|water|soda|coffee|tea|drink|beverage|kombucha|lemonade
  )' THEN 'Beverages'
      WHEN name ~*
  '(chip|cracker|cookie|snack|pretzel|popcorn|granola|bar|chocol
  ate)' THEN 'Snacks'
      WHEN name ~* '(soap|shampoo|detergent|paper
  towel|toilet|tissue|cleaning|toothpaste)' THEN 'Household'
      ELSE 'Other'
    END;
