-- ============================================================================
-- OFFLINE ORDERING SYSTEM - DATABASE MIGRATION
-- ============================================================================
-- This migration adds support for:
-- 1. User locations (multiple delivery addresses)
-- 2. Enhanced order tracking with location data
-- 3. PWA discount fields (if not already added)
--
-- IMPORTANT: Run this on your EXISTING database
-- This is safe to run - it only ADDS new columns and tables
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD PWA DISCOUNT FIELDS TO USERS TABLE (if not exists)
-- ============================================================================

-- Add PWA discount columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pwa_installed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pwa_installed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pwa_discount_eligible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pwa_discount_activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pwa_install_device_info TEXT;

-- ============================================================================
-- STEP 2: CREATE USER LOCATIONS TABLE
-- ============================================================================

-- User locations table for storing multiple delivery addresses
CREATE TABLE IF NOT EXISTS public.user_locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_primary BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: ADD LOCATION AND DISCOUNT FIELDS TO ORDERS TABLE (if not exists)
-- ============================================================================

-- Add location fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS location_method VARCHAR(20) DEFAULT 'manual' CHECK (location_method IN ('gps', 'manual', 'none')),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(8, 2),
ADD COLUMN IF NOT EXISTS location_timestamp TIMESTAMP WITH TIME ZONE;

-- Add discount fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pwa_discount_applied BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- User locations indexes
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON public.user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_primary ON public.user_locations(user_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_user_locations_last_used ON public.user_locations(user_id, last_used_at DESC);

-- Orders location indexes
CREATE INDEX IF NOT EXISTS idx_orders_location ON public.orders(delivery_latitude, delivery_longitude);
CREATE INDEX IF NOT EXISTS idx_orders_location_method ON public.orders(location_method);
CREATE INDEX IF NOT EXISTS idx_orders_pwa_discount ON public.orders(pwa_discount_applied);

-- Users PWA discount indexes
CREATE INDEX IF NOT EXISTS idx_users_pwa_discount ON public.users(pwa_discount_eligible);

-- ============================================================================
-- STEP 5: CREATE TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Trigger for user_locations updated_at
DROP TRIGGER IF EXISTS update_user_locations_updated_at ON public.user_locations;
CREATE TRIGGER update_user_locations_updated_at 
    BEFORE UPDATE ON public.user_locations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: CREATE PWA INSTALLATIONS TRACKING TABLE (if not exists)
-- ============================================================================

-- PWA installations tracking table (for analytics and fraud prevention)
CREATE TABLE IF NOT EXISTS public.pwa_installations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    device_info TEXT,
    user_agent TEXT,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discount_claimed BOOLEAN DEFAULT FALSE,
    discount_claimed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    UNIQUE(user_id, session_id)
);

-- PWA installations indexes
CREATE INDEX IF NOT EXISTS idx_pwa_installations_user_id ON public.pwa_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_installations_session_id ON public.pwa_installations(session_id);

-- ============================================================================
-- STEP 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant access to new tables
GRANT ALL ON public.user_locations TO anon, authenticated;
GRANT ALL ON public.pwa_installations TO anon, authenticated;

-- ============================================================================
-- STEP 8: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

-- Table comments
COMMENT ON TABLE public.user_locations IS 'Stores multiple delivery addresses per user for quick selection';
COMMENT ON TABLE public.pwa_installations IS 'Tracks PWA installations and discount claims for fraud prevention';

-- Column comments for user_locations
COMMENT ON COLUMN public.user_locations.address_line1 IS 'Primary address line (street address)';
COMMENT ON COLUMN public.user_locations.address_line2 IS 'Secondary address line (apartment, floor, etc.)';
COMMENT ON COLUMN public.user_locations.is_primary IS 'Whether this is the user default/primary address';
COMMENT ON COLUMN public.user_locations.last_used_at IS 'Last time this address was used for an order';

-- Column comments for orders location fields
COMMENT ON COLUMN public.orders.delivery_latitude IS 'GPS latitude for delivery location';
COMMENT ON COLUMN public.orders.delivery_longitude IS 'GPS longitude for delivery location';
COMMENT ON COLUMN public.orders.delivery_address IS 'Human-readable delivery address';
COMMENT ON COLUMN public.orders.location_method IS 'How location was obtained: gps, manual, or none';
COMMENT ON COLUMN public.orders.location_accuracy IS 'GPS accuracy in meters (if available)';
COMMENT ON COLUMN public.orders.location_timestamp IS 'When location was captured';

-- Column comments for orders discount fields
COMMENT ON COLUMN public.orders.discount_type IS 'Type of discount applied (e.g., pwa_discount, promo_code)';
COMMENT ON COLUMN public.orders.discount_amount IS 'Discount amount in currency';
COMMENT ON COLUMN public.orders.discount_percentage IS 'Discount percentage applied';
COMMENT ON COLUMN public.orders.original_amount IS 'Original order amount before discount';
COMMENT ON COLUMN public.orders.pwa_discount_applied IS 'Whether PWA discount was applied to this order';

-- Column comments for users PWA fields
COMMENT ON COLUMN public.users.pwa_installed IS 'Whether user has installed the PWA';
COMMENT ON COLUMN public.users.pwa_discount_eligible IS 'Whether user is eligible for 10% PWA discount';

-- ============================================================================
-- STEP 9: CREATE HELPER FUNCTIONS (Optional but recommended)
-- ============================================================================

-- Function to get user's last used location
CREATE OR REPLACE FUNCTION get_user_last_location(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ul.id,
        ul.address_line1,
        ul.address_line2,
        ul.city,
        ul.postal_code,
        ul.latitude,
        ul.longitude,
        ul.is_primary
    FROM public.user_locations ul
    WHERE ul.user_id = p_user_id
    ORDER BY ul.last_used_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to update location last_used_at
CREATE OR REPLACE FUNCTION update_location_last_used(p_location_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_locations
    SET last_used_at = NOW()
    WHERE id = p_location_id;
END;
$$ LANGUAGE plpgsql;

-- Function to set location as primary
CREATE OR REPLACE FUNCTION set_primary_location(p_user_id UUID, p_location_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Unset all primary locations for this user
    UPDATE public.user_locations
    SET is_primary = FALSE
    WHERE user_id = p_user_id;
    
    -- Set this location as primary
    UPDATE public.user_locations
    SET is_primary = TRUE
    WHERE id = p_location_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 10: CREATE ANALYTICS VIEWS (Optional)
-- ============================================================================

-- View for location usage statistics
CREATE OR REPLACE VIEW public.location_usage_stats AS
SELECT 
    ul.user_id,
    COUNT(*) as total_locations,
    COUNT(CASE WHEN ul.is_primary THEN 1 END) as primary_locations,
    MAX(ul.last_used_at) as most_recent_use
FROM public.user_locations ul
GROUP BY ul.user_id;

-- View for PWA discount analytics
CREATE OR REPLACE VIEW public.pwa_discount_analytics AS
SELECT 
    COUNT(DISTINCT id) as total_pwa_users,
    COUNT(DISTINCT CASE WHEN pwa_discount_eligible THEN id END) as discount_eligible_users,
    COUNT(DISTINCT CASE WHEN pwa_installed THEN id END) as total_installations,
    ROUND(
        COUNT(DISTINCT CASE WHEN pwa_discount_eligible THEN id END)::DECIMAL / 
        NULLIF(COUNT(DISTINCT id), 0) * 100, 
        2
    ) as discount_activation_rate
FROM public.users;

-- View for PWA discount usage in orders
CREATE OR REPLACE VIEW public.pwa_discount_order_stats AS
SELECT 
    COUNT(*) as total_orders_with_discount,
    SUM(discount_amount) as total_discount_given,
    AVG(discount_amount) as avg_discount_per_order,
    SUM(total_amount) as total_revenue_with_discount,
    SUM(original_amount) as total_original_amount
FROM public.orders
WHERE pwa_discount_applied = TRUE;

-- Grant access to views
GRANT SELECT ON public.location_usage_stats TO anon, authenticated;
GRANT SELECT ON public.pwa_discount_analytics TO anon, authenticated;
GRANT SELECT ON public.pwa_discount_order_stats TO anon, authenticated;

-- ============================================================================
-- STEP 11: DATA MIGRATION (Optional - Update existing orders)
-- ============================================================================

-- Update existing orders to set original_amount if null
UPDATE public.orders
SET original_amount = total_amount
WHERE original_amount IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify the migration was successful:

-- 1. Check if user_locations table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_locations'
) as user_locations_exists;

-- 2. Check if new columns were added to orders
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
AND column_name IN (
    'delivery_latitude', 
    'delivery_longitude', 
    'delivery_address',
    'location_method',
    'discount_type',
    'discount_amount',
    'pwa_discount_applied'
);

-- 3. Check if new columns were added to users
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN (
    'pwa_installed',
    'pwa_discount_eligible',
    'pwa_installed_at'
);

-- 4. Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('user_locations', 'orders', 'users')
AND indexname LIKE '%location%' OR indexname LIKE '%pwa%';

-- 5. Count existing data
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.orders) as total_orders,
    (SELECT COUNT(*) FROM public.user_locations) as total_locations;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'OFFLINE ORDERING MIGRATION COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'New features added:';
    RAISE NOTICE '1. ✓ user_locations table created';
    RAISE NOTICE '2. ✓ Location fields added to orders';
    RAISE NOTICE '3. ✓ Discount fields added to orders';
    RAISE NOTICE '4. ✓ PWA fields added to users';
    RAISE NOTICE '5. ✓ Indexes created for performance';
    RAISE NOTICE '6. ✓ Helper functions created';
    RAISE NOTICE '7. ✓ Analytics views created';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Run the verification queries above to confirm.';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT (Use only if you need to undo this migration)
-- ============================================================================

/*
-- CAUTION: This will remove all new tables and columns
-- Only run this if you need to completely undo the migration

-- Drop views
DROP VIEW IF EXISTS public.location_usage_stats;
DROP VIEW IF EXISTS public.pwa_discount_analytics;
DROP VIEW IF EXISTS public.pwa_discount_order_stats;

-- Drop functions
DROP FUNCTION IF EXISTS get_user_last_location(UUID);
DROP FUNCTION IF EXISTS update_location_last_used(UUID);
DROP FUNCTION IF EXISTS set_primary_location(UUID, UUID);

-- Drop tables
DROP TABLE IF EXISTS public.pwa_installations;
DROP TABLE IF EXISTS public.user_locations;

-- Remove columns from orders
ALTER TABLE public.orders
DROP COLUMN IF EXISTS delivery_latitude,
DROP COLUMN IF EXISTS delivery_longitude,
DROP COLUMN IF EXISTS delivery_address,
DROP COLUMN IF EXISTS location_method,
DROP COLUMN IF EXISTS location_accuracy,
DROP COLUMN IF EXISTS location_timestamp,
DROP COLUMN IF EXISTS discount_type,
DROP COLUMN IF EXISTS discount_amount,
DROP COLUMN IF EXISTS discount_percentage,
DROP COLUMN IF EXISTS original_amount,
DROP COLUMN IF EXISTS pwa_discount_applied;

-- Remove columns from users
ALTER TABLE public.users
DROP COLUMN IF EXISTS pwa_installed,
DROP COLUMN IF EXISTS pwa_installed_at,
DROP COLUMN IF EXISTS pwa_discount_eligible,
DROP COLUMN IF EXISTS pwa_discount_activated_at,
DROP COLUMN IF EXISTS pwa_install_device_info;
*/
