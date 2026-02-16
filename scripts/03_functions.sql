-- =====================================================
-- HELPER FUNCTIONS & STORED PROCEDURES
-- =====================================================
-- Useful database functions for the Institute Community App
-- Run this AFTER running 01_schema.sql
-- =====================================================

-- =====================================================
-- SEARCH FUNCTIONS
-- =====================================================

-- Function to search blog posts by text
CREATE OR REPLACE FUNCTION search_blogs(search_query TEXT)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    excerpt TEXT,
    author_name VARCHAR,
    category blog_category,
    published_at TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.id,
        bp.title,
        bp.excerpt,
        u.full_name as author_name,
        bp.category,
        bp.published_at,
        ts_rank(bp.search_vector, query) as rank
    FROM blog_posts bp
    JOIN users u ON bp.author_id = u.id,
    to_tsquery('english', search_query) query
    WHERE bp.search_vector @@ query
      AND bp.status = 'published'
    ORDER BY rank DESC, bp.published_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search marketplace items
CREATE OR REPLACE FUNCTION search_marketplace(search_query TEXT)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    price DECIMAL,
    category VARCHAR,
    seller_name VARCHAR,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.id,
        mi.title,
        mi.description,
        mi.price,
        mi.category,
        u.full_name as seller_name,
        ts_rank(mi.search_vector, query) as rank
    FROM marketplace_items mi
    JOIN users u ON mi.seller_id = u.id,
    to_tsquery('english', search_query) query
    WHERE mi.search_vector @@ query
      AND mi.status = 'available'
    ORDER BY rank DESC, mi.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RECOMMENDATION FUNCTIONS
-- =====================================================

-- Get recommended blog posts for a user based on their interests
CREATE OR REPLACE FUNCTION get_recommended_blogs(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    excerpt TEXT,
    author_name VARCHAR,
    category blog_category,
    published_at TIMESTAMP
) AS $$
BEGIN
    -- Simple recommendation based on user's department and role
    -- Can be enhanced with ML/collaborative filtering
    RETURN QUERY
    SELECT 
        bp.id,
        bp.title,
        bp.excerpt,
        u.full_name as author_name,
        bp.category,
        bp.published_at
    FROM blog_posts bp
    JOIN users u ON bp.author_id = u.id
    WHERE bp.status = 'published'
      AND (
          -- Same department blogs
          u.department = (SELECT department FROM users WHERE id = p_user_id)
          -- Or placement/internship blogs for students
          OR (bp.category IN ('placement', 'internship') 
              AND (SELECT role FROM users WHERE id = p_user_id) = 'student')
      )
    ORDER BY bp.published_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Get user engagement statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
    blog_posts_count INTEGER,
    marketplace_items_count INTEGER,
    community_memberships_count INTEGER,
    events_registered_count INTEGER,
    total_blog_likes INTEGER,
    total_blog_views INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM blog_posts WHERE author_id = p_user_id),
        (SELECT COUNT(*)::INTEGER FROM marketplace_items WHERE seller_id = p_user_id),
        (SELECT COUNT(*)::INTEGER FROM community_members WHERE user_id = p_user_id),
        (SELECT COUNT(*)::INTEGER FROM event_registrations WHERE user_id = p_user_id),
        (SELECT COALESCE(SUM(like_count), 0)::INTEGER FROM blog_posts WHERE author_id = p_user_id),
        (SELECT COALESCE(SUM(view_count), 0)::INTEGER FROM blog_posts WHERE author_id = p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Get platform statistics (admin dashboard)
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS TABLE (
    total_users INTEGER,
    total_students INTEGER,
    total_faculty INTEGER,
    total_alumni INTEGER,
    total_blog_posts INTEGER,
    total_marketplace_items INTEGER,
    total_events INTEGER,
    total_communities INTEGER,
    active_users_last_7_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM users),
        (SELECT COUNT(*)::INTEGER FROM users WHERE role = 'student'),
        (SELECT COUNT(*)::INTEGER FROM users WHERE role = 'faculty'),
        (SELECT COUNT(*)::INTEGER FROM users WHERE role = 'alumni'),
        (SELECT COUNT(*)::INTEGER FROM blog_posts WHERE status = 'published'),
        (SELECT COUNT(*)::INTEGER FROM marketplace_items WHERE status = 'available'),
        (SELECT COUNT(*)::INTEGER FROM events WHERE is_published = TRUE AND is_cancelled = FALSE),
        (SELECT COUNT(*)::INTEGER FROM communities),
        (SELECT COUNT(DISTINCT user_id)::INTEGER FROM activity_logs WHERE created_at > NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- Get trending blog posts (most viewed/liked in last week)
CREATE OR REPLACE FUNCTION get_trending_blogs(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    excerpt TEXT,
    author_name VARCHAR,
    category blog_category,
    view_count INTEGER,
    like_count INTEGER,
    published_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.id,
        bp.title,
        bp.excerpt,
        u.full_name as author_name,
        bp.category,
        bp.view_count,
        bp.like_count,
        bp.published_at
    FROM blog_posts bp
    JOIN users u ON bp.author_id = u.id
    WHERE bp.status = 'published'
      AND bp.published_at > NOW() - INTERVAL '30 days'
    ORDER BY (bp.view_count * 0.3 + bp.like_count * 0.7) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTIFICATION FUNCTIONS
-- =====================================================

-- Create notification helper function
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_title VARCHAR,
    p_message TEXT,
    p_type VARCHAR,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        entity_type,
        entity_id,
        action_url
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        p_type,
        p_entity_type,
        p_entity_id,
        p_action_url
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID, p_notification_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications 
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = p_user_id 
      AND id = ANY(p_notification_ids)
      AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (SELECT COUNT(*)::INTEGER FROM notifications WHERE user_id = p_user_id AND is_read = FALSE);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- LOCATION & NAVIGATION FUNCTIONS
-- =====================================================

-- Find nearest locations to a point
CREATE OR REPLACE FUNCTION find_nearby_locations(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_meters INTEGER DEFAULT 1000,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    code VARCHAR,
    type location_type,
    distance_meters DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.name,
        l.code,
        l.type,
        ST_Distance(
            l.coordinates::geography,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
        )::DECIMAL as distance_meters
    FROM locations l
    WHERE ST_DWithin(
        l.coordinates::geography,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        p_radius_meters
    )
    ORDER BY distance_meters
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get route between two locations
CREATE OR REPLACE FUNCTION get_route(
    p_from_location_id UUID,
    p_to_location_id UUID
)
RETURNS TABLE (
    distance_meters DECIMAL,
    estimated_time_minutes INTEGER,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nr.distance_meters,
        nr.estimated_time_minutes,
        nr.description
    FROM navigation_routes nr
    WHERE nr.from_location_id = p_from_location_id 
      AND nr.to_location_id = p_to_location_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMUNITY & SOCIAL FUNCTIONS
-- =====================================================

-- Check if user is member of community
CREATE OR REPLACE FUNCTION is_community_member(
    p_user_id UUID,
    p_community_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM community_members 
        WHERE user_id = p_user_id 
          AND community_id = p_community_id
    );
END;
$$ LANGUAGE plpgsql;

-- Get user's communities
CREATE OR REPLACE FUNCTION get_user_communities(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    slug VARCHAR,
    description TEXT,
    member_count INTEGER,
    user_role VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.member_count,
        cm.role as user_role
    FROM communities c
    JOIN community_members cm ON c.id = cm.community_id
    WHERE cm.user_id = p_user_id
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

-- Get community feed (recent posts)
CREATE OR REPLACE FUNCTION get_community_feed(
    p_community_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    author_id UUID,
    author_name VARCHAR,
    author_avatar TEXT,
    title VARCHAR,
    content TEXT,
    like_count INTEGER,
    comment_count INTEGER,
    is_pinned BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        cp.author_id,
        u.full_name as author_name,
        u.profile_picture_url as author_avatar,
        cp.title,
        cp.content,
        cp.like_count,
        cp.comment_count,
        cp.is_pinned,
        cp.created_at
    FROM community_posts cp
    JOIN users u ON cp.author_id = u.id
    WHERE cp.community_id = p_community_id
    ORDER BY cp.is_pinned DESC, cp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EVENT MANAGEMENT FUNCTIONS
-- =====================================================

-- Check if event is full
CREATE OR REPLACE FUNCTION is_event_full(p_event_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    max_participants INTEGER;
    current_count INTEGER;
BEGIN
    SELECT max_participants, current_participants 
    INTO max_participants, current_count
    FROM events 
    WHERE id = p_event_id;
    
    IF max_participants IS NULL THEN
        RETURN FALSE; -- No limit
    END IF;
    
    RETURN current_count >= max_participants;
END;
$$ LANGUAGE plpgsql;

-- Register for event
CREATE OR REPLACE FUNCTION register_for_event(
    p_event_id UUID,
    p_user_id UUID,
    p_registration_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    is_full BOOLEAN;
    already_registered BOOLEAN;
BEGIN
    -- Check if already registered
    SELECT EXISTS (
        SELECT 1 FROM event_registrations 
        WHERE event_id = p_event_id AND user_id = p_user_id
    ) INTO already_registered;
    
    IF already_registered THEN
        RETURN FALSE;
    END IF;
    
    -- Check if event is full
    SELECT is_event_full(p_event_id) INTO is_full;
    
    IF is_full THEN
        RETURN FALSE;
    END IF;
    
    -- Register
    INSERT INTO event_registrations (event_id, user_id, registration_data)
    VALUES (p_event_id, p_user_id, p_registration_data);
    
    -- Update event participant count
    UPDATE events 
    SET current_participants = current_participants + 1
    WHERE id = p_event_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MARKETPLACE FUNCTIONS
-- =====================================================

-- Get active items by category
CREATE OR REPLACE FUNCTION get_marketplace_items_by_category(
    p_category VARCHAR,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR,
    description TEXT,
    price DECIMAL,
    condition item_condition,
    seller_name VARCHAR,
    seller_phone VARCHAR,
    images TEXT[],
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.id,
        mi.title,
        mi.description,
        mi.price,
        mi.condition,
        u.full_name as seller_name,
        u.phone_number as seller_phone,
        mi.images,
        mi.created_at
    FROM marketplace_items mi
    JOIN users u ON mi.seller_id = u.id
    WHERE mi.category = p_category
      AND mi.status = 'available'
      AND (mi.expires_at IS NULL OR mi.expires_at > NOW())
    ORDER BY mi.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FEED GENERATION FUNCTIONS
-- =====================================================

-- Generate personalized feed for user
CREATE OR REPLACE FUNCTION get_personalized_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    author_id UUID,
    author_name VARCHAR,
    author_role user_role,
    author_avatar TEXT,
    content TEXT,
    source_type VARCHAR,
    source_id UUID,
    like_count INTEGER,
    comment_count INTEGER,
    created_at TIMESTAMP
) AS $$
DECLARE
    user_role_val user_role;
BEGIN
    -- Get user's role
    SELECT role INTO user_role_val FROM users WHERE id = p_user_id;
    
    RETURN QUERY
    SELECT 
        fp.id,
        fp.author_id,
        u.full_name as author_name,
        u.role as author_role,
        u.profile_picture_url as author_avatar,
        fp.content,
        fp.source_type,
        fp.source_id,
        fp.like_count,
        fp.comment_count,
        fp.created_at
    FROM feed_posts fp
    JOIN users u ON fp.author_id = u.id
    WHERE fp.is_public = TRUE
      AND (
          fp.target_roles IS NULL 
          OR user_role_val = ANY(fp.target_roles)
      )
    ORDER BY fp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Increment view count for any entity
CREATE OR REPLACE FUNCTION increment_view_count(
    p_table_name VARCHAR,
    p_entity_id UUID
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %I SET view_count = view_count + 1 WHERE id = $1', p_table_name)
    USING p_entity_id;
END;
$$ LANGUAGE plpgsql;

-- Get entity owner
CREATE OR REPLACE FUNCTION get_entity_owner(
    p_table_name VARCHAR,
    p_entity_id UUID
)
RETURNS UUID AS $$
DECLARE
    owner_id UUID;
    owner_column VARCHAR;
BEGIN
    -- Determine the owner column name based on table
    CASE p_table_name
        WHEN 'blog_posts' THEN owner_column := 'author_id';
        WHEN 'marketplace_items' THEN owner_column := 'seller_id';
        WHEN 'events' THEN owner_column := 'organizer_id';
        WHEN 'communities' THEN owner_column := 'creator_id';
        ELSE owner_column := 'user_id';
    END CASE;
    
    EXECUTE format('SELECT %I FROM %I WHERE id = $1', owner_column, p_table_name)
    INTO owner_id
    USING p_entity_id;
    
    RETURN owner_id;
END;
$$ LANGUAGE plpgsql;

-- Clean up old activity logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_activity_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM activity_logs 
    WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULED CLEANUP FUNCTIONS
-- =====================================================

-- Archive expired marketplace items
CREATE OR REPLACE FUNCTION archive_expired_marketplace_items()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE marketplace_items 
    SET status = 'cancelled',
        archived_at = NOW()
    WHERE expires_at < NOW() 
      AND status = 'available';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Remove expired guest accounts
CREATE OR REPLACE FUNCTION remove_expired_guests()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM users 
    WHERE role = 'guest' 
      AND guest_valid_until < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- BATCH OPERATIONS
-- =====================================================

-- Bulk mark messages as read in a conversation
CREATE OR REPLACE FUNCTION mark_conversation_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE conversation_participants
    SET last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION search_blogs IS 'Full-text search for blog posts';
COMMENT ON FUNCTION get_recommended_blogs IS 'Get personalized blog recommendations for a user';
COMMENT ON FUNCTION get_user_stats IS 'Get engagement statistics for a user';
COMMENT ON FUNCTION get_platform_stats IS 'Get overall platform statistics for admin dashboard';
COMMENT ON FUNCTION create_notification IS 'Helper function to create notifications';
COMMENT ON FUNCTION find_nearby_locations IS 'Find locations within a radius using PostGIS';
COMMENT ON FUNCTION is_community_member IS 'Check if user is a member of a community';
COMMENT ON FUNCTION register_for_event IS 'Register a user for an event with validation';
COMMENT ON FUNCTION increment_view_count IS 'Increment view count for any entity';

-- =====================================================
-- HELPER FUNCTIONS COMPLETE
-- =====================================================
-- These functions provide common operations for the app
-- Can be called from your application or via Supabase RPC
-- =====================================================
