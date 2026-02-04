-- AT RESTAURANT - Complete Supabase Database Schema
-- This is a comprehensive schema file that creates all necessary tables and structures
-- Run this in your Supabase SQL editor to set up the complete database
-- 
-- IMPORTANT: This schema does NOT include RLS policies to avoid connection issues
-- The application will work with full database access

-- ============================================================================
-- EXTENSIONS AND TYPES
-- ============================================================================

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom enum type for order status
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
-- Stores additional user information beyond what Supabase auth provides
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    -- Location preferences for delivery
    default_latitude DECIMAL(10, 8),
    default_longitude DECIMAL(11, 8),
    default_address TEXT,
    location_permissions_granted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table for organizing menu items
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT, -- Emoji for category display
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu items table
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    -- Soft deletion support
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table with location support
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- Custom format: ORD-XXXXX
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    status order_status DEFAULT 'pending',
    notes TEXT,
    -- Location data for delivery
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    delivery_address TEXT,
    location_method VARCHAR(20) DEFAULT 'manual' CHECK (location_method IN ('gps', 'manual', 'none')),
    location_accuracy DECIMAL(8, 2),
    location_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table (junction table between orders and menu items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE RESTRICT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order status logs table for tracking order progress
CREATE TABLE IF NOT EXISTS public.order_status_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    status order_status NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Menu items indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_menu_items_deleted_at ON public.menu_items(deleted_at);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_location ON public.orders(delivery_latitude, delivery_longitude);
CREATE INDEX IF NOT EXISTS idx_orders_location_method ON public.orders(location_method);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);

-- Order status logs indexes
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order_id ON public.order_status_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_created_at ON public.order_status_logs(created_at DESC);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin);
CREATE INDEX IF NOT EXISTS idx_users_location ON public.users(default_latitude, default_longitude);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON public.categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_menu_items_updated_at ON public.menu_items;
CREATE TRIGGER update_menu_items_updated_at 
    BEFORE UPDATE ON public.menu_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LOCATION FUNCTIONS
-- ============================================================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL(10,8), 
    lon1 DECIMAL(11,8), 
    lat2 DECIMAL(10,8), 
    lon2 DECIMAL(11,8)
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
    distance DECIMAL;
BEGIN
    -- Convert degrees to radians
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    
    -- Haversine formula
    a := SIN(dLat/2) * SIN(dLat/2) + 
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
         SIN(dLon/2) * SIN(dLon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    distance := R * c;
    
    RETURN distance;
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby orders (for delivery optimization)
CREATE OR REPLACE FUNCTION get_nearby_orders(
    center_lat DECIMAL(10,8),
    center_lon DECIMAL(11,8),
    radius_km DECIMAL(10,2) DEFAULT 5.0,
    order_status_filter TEXT DEFAULT 'pending'
) RETURNS TABLE (
    order_id TEXT,
    customer_name TEXT,
    delivery_address TEXT,
    distance_km DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.customer_name,
        o.delivery_address,
        calculate_distance(center_lat, center_lon, o.delivery_latitude, o.delivery_longitude) as distance,
        o.created_at
    FROM public.orders o
    WHERE o.delivery_latitude IS NOT NULL 
      AND o.delivery_longitude IS NOT NULL
      AND o.status = order_status_filter::order_status
      AND calculate_distance(center_lat, center_lon, o.delivery_latitude, o.delivery_longitude) <= radius_km
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MENU MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to soft delete menu items (preserves order history)
CREATE OR REPLACE FUNCTION soft_delete_menu_item(item_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.menu_items 
    SET deleted_at = NOW(), is_available = FALSE
    WHERE id = item_id AND deleted_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to restore soft deleted menu items
CREATE OR REPLACE FUNCTION restore_menu_item(item_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.menu_items 
    SET deleted_at = NULL, is_available = TRUE
    WHERE id = item_id AND deleted_at IS NOT NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to safely delete menu items (checks for existing orders)
CREATE OR REPLACE FUNCTION safe_delete_menu_item(item_id UUID)
RETURNS JSON AS $$
DECLARE
    order_count INTEGER;
    result JSON;
BEGIN
    -- Check if there are any orders with this menu item
    SELECT COUNT(*) INTO order_count
    FROM public.order_items 
    WHERE menu_item_id = item_id;
    
    IF order_count > 0 THEN
        -- Cannot delete, return error with count
        result := json_build_object(
            'success', false,
            'message', 'Cannot delete menu item: ' || order_count || ' orders reference this item',
            'order_count', order_count,
            'suggestion', 'Use soft deletion instead'
        );
    ELSE
        -- Safe to delete
        DELETE FROM public.menu_items WHERE id = item_id;
        result := json_build_object(
            'success', true,
            'message', 'Menu item deleted successfully'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get order count for a menu item
CREATE OR REPLACE FUNCTION get_menu_item_order_count(item_id UUID)
RETURNS INTEGER AS $$
DECLARE
    order_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO order_count
    FROM public.order_items 
    WHERE menu_item_id = item_id;
    
    RETURN order_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for active (non-deleted) menu items
CREATE OR REPLACE VIEW public.active_menu_items AS
SELECT * FROM public.menu_items 
WHERE deleted_at IS NULL;

-- View for orders with location data (for admin dashboard)
CREATE OR REPLACE VIEW public.orders_with_location AS
SELECT 
    o.*,
    CASE 
        WHEN o.delivery_latitude IS NOT NULL AND o.delivery_longitude IS NOT NULL 
        THEN CONCAT(o.delivery_latitude, ',', o.delivery_longitude)
        ELSE NULL 
    END as coordinates,
    CASE 
        WHEN o.delivery_latitude IS NOT NULL AND o.delivery_longitude IS NOT NULL 
        THEN 'https://www.google.com/maps?q=' || o.delivery_latitude || ',' || o.delivery_longitude
        ELSE NULL 
    END as google_maps_link
FROM public.orders o;

-- ============================================================================
-- PERMISSIONS (NO RLS POLICIES)
-- ============================================================================

-- Grant full access to anonymous users (no authentication required)
GRANT ALL ON public.users TO anon;
GRANT ALL ON public.categories TO anon;
GRANT ALL ON public.menu_items TO anon;
GRANT ALL ON public.orders TO anon;
GRANT ALL ON public.order_items TO anon;
GRANT ALL ON public.order_status_logs TO anon;

-- Grant full access to authenticated users
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.menu_items TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;
GRANT ALL ON public.order_status_logs TO authenticated;

-- Grant access to views
GRANT SELECT ON public.active_menu_items TO anon, authenticated;
GRANT SELECT ON public.orders_with_location TO anon, authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert sample categories
INSERT INTO public.categories (name, description, emoji, sort_order) VALUES
('Appetizers', 'Start your meal with our delicious appetizers', '🥗', 1),
('Main Courses', 'Our signature main dishes', '🍽️', 2),
('Desserts', 'Sweet endings to your meal', '🍰', 3),
('Beverages', 'Refreshing drinks', '🥤', 4)
ON CONFLICT DO NOTHING;

-- Insert sample menu items
INSERT INTO public.menu_items (category_id, name, description, price, sort_order) 
SELECT 
    c.id,
    items.name,
    items.description,
    items.price,
    items.sort_order
FROM (
    VALUES 
    -- Appetizers
    ('Appetizers', 'Caesar Salad', 'Fresh romaine lettuce with parmesan cheese and croutons', 12.99, 1),
    ('Appetizers', 'Garlic Bread', 'Toasted bread with garlic butter and herbs', 8.99, 2),
    ('Appetizers', 'Buffalo Wings', 'Spicy chicken wings with blue cheese dip', 14.99, 3),
    ('Appetizers', 'Mozzarella Sticks', 'Crispy breaded mozzarella with marinara sauce', 10.99, 4),
    
    -- Main Courses
    ('Main Courses', 'Grilled Salmon', 'Fresh Atlantic salmon with herbs and lemon', 24.99, 1),
    ('Main Courses', 'Beef Tenderloin', 'Premium cut with garlic mashed potatoes', 32.99, 2),
    ('Main Courses', 'Pasta Primavera', 'Fresh vegetables with homemade pasta', 18.99, 3),
    ('Main Courses', 'Chicken Parmesan', 'Breaded chicken with marinara and mozzarella', 22.99, 4),
    ('Main Courses', 'BBQ Ribs', 'Slow-cooked ribs with our signature BBQ sauce', 26.99, 5),
    ('Main Courses', 'Vegetarian Pizza', 'Fresh vegetables on our homemade pizza dough', 16.99, 6),
    
    -- Desserts
    ('Desserts', 'Chocolate Cake', 'Rich chocolate cake with vanilla ice cream', 9.99, 1),
    ('Desserts', 'Tiramisu', 'Classic Italian dessert with coffee and mascarpone', 8.99, 2),
    ('Desserts', 'Cheesecake', 'New York style cheesecake with berry compote', 7.99, 3),
    ('Desserts', 'Ice Cream Sundae', 'Three scoops with your choice of toppings', 6.99, 4),
    
    -- Beverages
    ('Beverages', 'Coffee', 'Freshly brewed coffee', 3.99, 1),
    ('Beverages', 'Fresh Juice', 'Orange, apple, or cranberry juice', 4.99, 2),
    ('Beverages', 'Soft Drinks', 'Coca-Cola, Pepsi, Sprite, etc.', 2.99, 3),
    ('Beverages', 'Iced Tea', 'Refreshing iced tea with lemon', 3.49, 4),
    ('Beverages', 'Milkshake', 'Vanilla, chocolate, or strawberry', 5.99, 5)
) AS items(category_name, name, description, price, sort_order)
JOIN public.categories c ON c.name = items.category_name
ON CONFLICT DO NOTHING;

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for orders table (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_logs;

-- Enable row level security for realtime (but keep policies permissive)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for realtime subscriptions
CREATE POLICY "Allow all operations on orders" ON public.orders FOR ALL USING (true);
CREATE POLICY "Allow all operations on order_status_logs" ON public.order_status_logs FOR ALL USING (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

-- Table comments
COMMENT ON TABLE public.users IS 'Extended user information beyond Supabase auth';
COMMENT ON TABLE public.categories IS 'Menu categories for organizing items';
COMMENT ON TABLE public.menu_items IS 'Restaurant menu items with pricing and availability';
COMMENT ON TABLE public.orders IS 'Customer orders with delivery location support';
COMMENT ON TABLE public.order_items IS 'Individual items within each order';
COMMENT ON TABLE public.order_status_logs IS 'Audit trail for order status changes';

-- Column comments for location fields
COMMENT ON COLUMN public.orders.delivery_latitude IS 'GPS latitude for delivery location';
COMMENT ON COLUMN public.orders.delivery_longitude IS 'GPS longitude for delivery location';
COMMENT ON COLUMN public.orders.delivery_address IS 'Human-readable delivery address';
COMMENT ON COLUMN public.orders.location_method IS 'How location was obtained: gps, manual, or none';
COMMENT ON COLUMN public.orders.location_accuracy IS 'GPS accuracy in meters (if available)';
COMMENT ON COLUMN public.orders.location_timestamp IS 'When location was captured';

COMMENT ON COLUMN public.users.default_latitude IS 'User default delivery latitude';
COMMENT ON COLUMN public.users.default_longitude IS 'User default delivery longitude';
COMMENT ON COLUMN public.users.default_address IS 'User default delivery address';
COMMENT ON COLUMN public.users.location_permissions_granted IS 'Whether user granted location permissions';
COMMENT ON COLUMN public.users.is_admin IS 'Whether user has admin privileges';

COMMENT ON COLUMN public.menu_items.deleted_at IS 'Soft deletion timestamp (NULL = active)';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
    'AT RESTAURANT database setup completed successfully!' as message,
    (SELECT COUNT(*) FROM public.categories) as categories_created,
    (SELECT COUNT(*) FROM public.menu_items) as menu_items_created,
    'All tables, indexes, functions, and sample data have been created.' as info;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Example queries you can run after setup:

-- 1. View all menu items with categories
SELECT 
    mi.name as item_name,
    mi.price,
    c.name as category_name,
    mi.is_available
FROM public.menu_items mi
JOIN public.categories c ON mi.category_id = c.id
WHERE mi.deleted_at IS NULL
ORDER BY c.sort_order, mi.sort_order;

-- 2. Find nearby orders (example coordinates for Faisalabad, Pakistan)
SELECT * FROM get_nearby_orders(31.4504, 73.1350, 10.0, 'pending');

-- 3. Get order count for a menu item
SELECT get_menu_item_order_count('your-menu-item-id-here');

-- 4. Soft delete a menu item
SELECT soft_delete_menu_item('your-menu-item-id-here');

-- 5. Make a user admin (replace with actual email)
UPDATE public.users SET is_admin = TRUE WHERE email = 'your-email@example.com';

-- 6. View orders with location data
SELECT * FROM public.orders_with_location WHERE delivery_latitude IS NOT NULL;
*/