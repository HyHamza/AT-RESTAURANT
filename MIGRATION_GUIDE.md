# Database Migration Guide - Offline Ordering System

## Overview

This guide explains how to safely add the offline ordering features to your existing database without affecting current data.

---

## 📋 What This Migration Adds

### New Tables
1. **user_locations** - Store multiple delivery addresses per user
2. **pwa_installations** - Track PWA installations for analytics

### Enhanced Existing Tables
1. **users** - Add PWA discount eligibility fields
2. **orders** - Add location tracking and discount fields

### Additional Features
- Indexes for performance optimization
- Helper functions for common operations
- Analytics views for reporting
- Triggers for automatic timestamp updates

---

## ⚠️ Pre-Migration Checklist

Before running the migration, ensure:

- [ ] You have a backup of your database
- [ ] You have admin access to Supabase SQL Editor
- [ ] Your application is in maintenance mode (optional but recommended)
- [ ] You've reviewed the migration script: `schema-offline-ordering-migration.sql`

---

## 🚀 Migration Steps

### Step 1: Backup Your Database

**In Supabase Dashboard:**
1. Go to Database → Backups
2. Click "Create Backup"
3. Wait for backup to complete
4. Note the backup timestamp

**Alternative (using pg_dump):**
```bash
pg_dump -h your-db-host -U postgres -d your-database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Review the Migration Script

Open `schema-offline-ordering-migration.sql` and review:
- All `CREATE TABLE` statements
- All `ALTER TABLE` statements
- All indexes and triggers
- Helper functions and views

**Key Points:**
- Uses `IF NOT EXISTS` - safe to run multiple times
- Uses `ADD COLUMN IF NOT EXISTS` - won't fail if columns exist
- No data deletion - only additions
- Includes rollback script (commented out)

### Step 3: Run the Migration

**In Supabase SQL Editor:**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Copy the entire contents of `schema-offline-ordering-migration.sql`
5. Paste into the SQL Editor
6. Click "Run" or press Ctrl+Enter

**Expected Output:**
```
NOTICE: ========================================
NOTICE: OFFLINE ORDERING MIGRATION COMPLETE!
NOTICE: ========================================
NOTICE: New features added:
NOTICE: 1. ✓ user_locations table created
NOTICE: 2. ✓ Location fields added to orders
NOTICE: 3. ✓ Discount fields added to orders
NOTICE: 4. ✓ PWA fields added to users
NOTICE: 5. ✓ Indexes created for performance
NOTICE: 6. ✓ Helper functions created
NOTICE: 7. ✓ Analytics views created
NOTICE: ========================================
```

### Step 4: Verify the Migration

Run the verification queries included at the end of the migration script:

**Query 1: Check if user_locations table exists**
```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_locations'
) as user_locations_exists;
```
Expected: `true`

**Query 2: Check new columns in orders table**
```sql
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
```
Expected: 7 rows returned

**Query 3: Check new columns in users table**
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name IN (
    'pwa_installed',
    'pwa_discount_eligible',
    'pwa_installed_at'
);
```
Expected: 3 rows returned

**Query 4: Check indexes**
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('user_locations', 'orders', 'users')
AND (indexname LIKE '%location%' OR indexname LIKE '%pwa%');
```
Expected: Multiple indexes returned

**Query 5: Count data**
```sql
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.orders) as total_orders,
    (SELECT COUNT(*) FROM public.user_locations) as total_locations;
```
Expected: Your existing counts (locations will be 0 initially)

### Step 5: Test the New Features

**Test 1: Insert a test location**
```sql
INSERT INTO public.user_locations (
    user_id,
    address_line1,
    city,
    latitude,
    longitude,
    is_primary
) VALUES (
    (SELECT id FROM public.users LIMIT 1), -- Use an existing user ID
    '123 Test Street',
    'Test City',
    40.7128,
    -74.0060,
    true
);
```

**Test 2: Query the location**
```sql
SELECT * FROM public.user_locations;
```

**Test 3: Use helper function**
```sql
SELECT * FROM get_user_last_location(
    (SELECT id FROM public.users LIMIT 1)
);
```

**Test 4: Check analytics views**
```sql
SELECT * FROM public.pwa_discount_analytics;
SELECT * FROM public.location_usage_stats;
```

### Step 6: Update Application Configuration

After successful migration:

1. Deploy the new application code with offline ordering features
2. Clear application cache if needed
3. Test the offline ordering flow
4. Monitor for any errors

---

## 🔄 Rollback Procedure

If you need to undo the migration, use the rollback script included at the end of `schema-offline-ordering-migration.sql`.

**⚠️ WARNING: This will delete all new tables and columns!**

**Steps:**
1. Uncomment the rollback script section
2. Run it in Supabase SQL Editor
3. Restore from backup if needed

**Rollback Script:**
```sql
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
```

---

## 📊 Post-Migration Monitoring

### Check Database Size
```sql
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size;
```

### Check Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Monitor Query Performance
```sql
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%user_locations%'
ORDER BY total_time DESC
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Issue: "relation already exists"

**Cause:** Table or column already exists

**Solution:** This is normal if running the script multiple times. The script uses `IF NOT EXISTS` clauses, so it's safe to continue.

### Issue: "permission denied"

**Cause:** Insufficient database permissions

**Solution:** Ensure you're running as a superuser or have the necessary permissions:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### Issue: "foreign key constraint violation"

**Cause:** Referenced table doesn't exist

**Solution:** Ensure the base schema is properly set up. Run the main `schema.sql` first if this is a fresh database.

### Issue: Migration takes too long

**Cause:** Large existing dataset

**Solution:** 
1. Run during low-traffic hours
2. Consider running in batches
3. Monitor with:
```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

---

## 📈 Performance Optimization

After migration, consider these optimizations:

### Analyze Tables
```sql
ANALYZE public.user_locations;
ANALYZE public.orders;
ANALYZE public.users;
```

### Vacuum Tables
```sql
VACUUM ANALYZE public.user_locations;
VACUUM ANALYZE public.orders;
VACUUM ANALYZE public.users;
```

### Update Statistics
```sql
SELECT pg_stat_reset();
```

---

## ✅ Migration Checklist

- [ ] Database backup created
- [ ] Migration script reviewed
- [ ] Migration executed successfully
- [ ] Verification queries passed
- [ ] Test data inserted successfully
- [ ] Helper functions tested
- [ ] Analytics views working
- [ ] Application code deployed
- [ ] End-to-end testing completed
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Team notified

---

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase logs in Dashboard → Logs
3. Check application logs for errors
4. Verify network connectivity
5. Ensure Supabase project is active

---

## 📚 Additional Resources

- **Complete Documentation**: `docs/OFFLINE_ORDERING_SYSTEM.md`
- **Implementation Guide**: `OFFLINE_ORDERING_IMPLEMENTATION_SUMMARY.md`
- **Quick Start**: `OFFLINE_ORDERING_QUICK_START.md`
- **Main Schema**: `schema.sql`
- **Migration Script**: `schema-offline-ordering-migration.sql`

---

## 🎉 Success!

Once all verification steps pass, your database is ready for the offline ordering system!

**Next Steps:**
1. Deploy the updated application code
2. Test offline order placement
3. Monitor sync performance
4. Collect user feedback

---

**Migration Version**: 1.0
**Last Updated**: 2026-02-14
**Estimated Duration**: 2-5 minutes (depending on database size)
