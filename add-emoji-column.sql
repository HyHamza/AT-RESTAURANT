-- Add emoji column to existing categories table
-- Run this in your Supabase SQL editor

ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS emoji TEXT;

-- Update existing categories with default emojis
UPDATE public.categories 
SET emoji = CASE 
    WHEN LOWER(name) LIKE '%appetizer%' OR LOWER(name) LIKE '%starter%' OR LOWER(name) LIKE '%salad%' THEN '🥗'
    WHEN LOWER(name) LIKE '%main%' OR LOWER(name) LIKE '%course%' OR LOWER(name) LIKE '%entree%' THEN '🍽️'
    WHEN LOWER(name) LIKE '%dessert%' OR LOWER(name) LIKE '%sweet%' OR LOWER(name) LIKE '%cake%' THEN '🍰'
    WHEN LOWER(name) LIKE '%beverage%' OR LOWER(name) LIKE '%drink%' OR LOWER(name) LIKE '%juice%' THEN '🥤'
    WHEN LOWER(name) LIKE '%pizza%' THEN '🍕'
    WHEN LOWER(name) LIKE '%burger%' THEN '🍔'
    WHEN LOWER(name) LIKE '%chicken%' OR LOWER(name) LIKE '%meat%' THEN '🍗'
    WHEN LOWER(name) LIKE '%sandwich%' OR LOWER(name) LIKE '%sub%' THEN '🥪'
    WHEN LOWER(name) LIKE '%pasta%' THEN '🍝'
    WHEN LOWER(name) LIKE '%coffee%' THEN '☕'
    WHEN LOWER(name) LIKE '%ice cream%' THEN '🍦'
    WHEN LOWER(name) LIKE '%soup%' THEN '🍲'
    WHEN LOWER(name) LIKE '%seafood%' OR LOWER(name) LIKE '%fish%' THEN '🐟'
    WHEN LOWER(name) LIKE '%vegetarian%' OR LOWER(name) LIKE '%vegan%' THEN '🥬'
    WHEN LOWER(name) LIKE '%breakfast%' THEN '🍳'
    WHEN LOWER(name) LIKE '%snack%' THEN '🍿'
    ELSE '🍴'
END
WHERE emoji IS NULL;

-- Verify the update
SELECT id, name, emoji FROM public.categories ORDER BY sort_order;