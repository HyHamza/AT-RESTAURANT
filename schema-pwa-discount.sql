-- ============================================================================
-- PWA DISCOUNT FEATURE - Database Schema Extension
-- ============================================================================
-- Add this to your existing Supabase database to enable PWA discount tracking

-- Add PWA installation tracking columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pwa_installed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pwa_installed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pwa_discount_eligible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pwa_discount_activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pwa_install_device_info TEXT;

-- Create PWA installations tracking table (for analytics and fraud prevention)
CREATE TABLE IF NOT EXISTS public.pwa_installations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- Browser fingerprint or session ID
    device_info TEXT,
    user_agent TEXT,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discount_claimed BOOLEAN DEFAULT FALSE,
    discount_claimed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    -- Prevent duplicate claims
    UNIQUE(user_id, session_id)
);

-- Add discount tracking to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pwa_discount_applied BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_pwa_discount ON public.users(pwa_discount_eligible);
CREATE INDEX IF NOT EXISTS idx_pwa_installations_user_id ON public.pwa_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_installations_session_id ON public.pwa_installations(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_pwa_discount ON public.orders(pwa_discount_applied);

-- ============================================================================
-- FUNCTIONS FOR PWA DISCOUNT MANAGEMENT
-- ============================================================================

-- Function to activate PWA discount for a user
CREATE OR REPLACE FUNCTION activate_pwa_discount(
    p_user_id UUID,
    p_session_id TEXT,
    p_device_info TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    existing_install_count INTEGER;
    result JSON;
BEGIN
    -- Check if user already has discount activated
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = p_user_id AND pwa_discount_eligible = TRUE
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'PWA discount already activated for this user',
            'already_activated', true
        );
    END IF;
    
    -- Check for duplicate installations from same session
    SELECT COUNT(*) INTO existing_install_count
    FROM public.pwa_installations
    WHERE session_id = p_session_id AND discount_claimed = TRUE;
    
    IF existing_install_count > 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'PWA discount already claimed from this device',
            'duplicate_claim', true
        );
    END IF;
    
    -- Update user record
    UPDATE public.users
    SET 
        pwa_installed = TRUE,
        pwa_installed_at = NOW(),
        pwa_discount_eligible = TRUE,
        pwa_discount_activated_at = NOW(),
        pwa_install_device_info = p_device_info
    WHERE id = p_user_id;
    
    -- Record installation
    INSERT INTO public.pwa_installations (
        user_id,
        session_id,
        device_info,
        user_agent,
        ip_address,
        discount_claimed,
        discount_claimed_at
    ) VALUES (
        p_user_id,
        p_session_id,
        p_device_info,
        p_user_agent,
        p_ip_address,
        TRUE,
        NOW()
    )
    ON CONFLICT (user_id, session_id) 
    DO UPDATE SET
        discount_claimed = TRUE,
        discount_claimed_at = NOW();
    
    result := json_build_object(
        'success', true,
        'message', 'PWA discount activated successfully',
        'discount_percentage', 10
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is eligible for PWA discount
CREATE OR REPLACE FUNCTION check_pwa_discount_eligibility(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    is_eligible BOOLEAN;
    installed_at TIMESTAMP WITH TIME ZONE;
    result JSON;
BEGIN
    SELECT 
        pwa_discount_eligible,
        pwa_discount_activated_at
    INTO is_eligible, installed_at
    FROM public.users
    WHERE id = p_user_id;
    
    IF is_eligible IS NULL THEN
        RETURN json_build_object(
            'eligible', false,
            'message', 'User not found'
        );
    END IF;
    
    result := json_build_object(
        'eligible', is_eligible,
        'activated_at', installed_at,
        'discount_percentage', CASE WHEN is_eligible THEN 10 ELSE 0 END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate discounted price
CREATE OR REPLACE FUNCTION calculate_pwa_discount(
    p_original_amount DECIMAL(10,2),
    p_user_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    is_eligible BOOLEAN := FALSE;
    discount_percentage DECIMAL(5,2) := 10.0;
    discount_amount DECIMAL(10,2);
    final_amount DECIMAL(10,2);
BEGIN
    -- Check if user is eligible for discount
    IF p_user_id IS NOT NULL THEN
        SELECT pwa_discount_eligible INTO is_eligible
        FROM public.users
        WHERE id = p_user_id;
    END IF;
    
    IF is_eligible THEN
        discount_amount := ROUND(p_original_amount * (discount_percentage / 100), 2);
        final_amount := p_original_amount - discount_amount;
    ELSE
        discount_amount := 0;
        final_amount := p_original_amount;
    END IF;
    
    RETURN json_build_object(
        'original_amount', p_original_amount,
        'discount_percentage', CASE WHEN is_eligible THEN discount_percentage ELSE 0 END,
        'discount_amount', discount_amount,
        'final_amount', final_amount,
        'discount_applied', is_eligible
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

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

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant access to new tables and functions
GRANT ALL ON public.pwa_installations TO anon, authenticated;
GRANT SELECT ON public.pwa_discount_analytics TO anon, authenticated;
GRANT SELECT ON public.pwa_discount_order_stats TO anon, authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.pwa_installations IS 'Tracks PWA installations and discount claims for fraud prevention';
COMMENT ON COLUMN public.users.pwa_installed IS 'Whether user has installed the PWA';
COMMENT ON COLUMN public.users.pwa_discount_eligible IS 'Whether user is eligible for 10% PWA discount';
COMMENT ON COLUMN public.orders.pwa_discount_applied IS 'Whether PWA discount was applied to this order';

-- Success message
SELECT 
    'PWA Discount feature schema created successfully!' as message,
    'Users can now receive 10% discount for installing the PWA' as info;
