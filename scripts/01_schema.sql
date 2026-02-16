-- =====================================================
-- INSTITUTE COMMUNITY APP - COMPLETE DATABASE SCHEMA
-- For Supabase (PostgreSQL)
-- =====================================================
-- This schema supports the IIT Ropar Institute Community App
-- Features: User Management, Buy & Sell, Lost & Found, Blogs,
-- Communities, Notices, Maps, Events, Quick Links, Feed
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For map coordinates

-- =====================================================
-- ENUMS (Custom Types)
-- =====================================================

-- User role types
CREATE TYPE user_role AS ENUM (
    'student',
    'faculty',
    'staff',
    'alumni',
    'guest'
);

-- User status
CREATE TYPE user_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'archived'
);

-- Blog category types
CREATE TYPE blog_category AS ENUM (
    'placement',
    'internship',
    'faculty_insight',
    'alumni_experience',
    'research',
    'general'
);

-- Blog status
CREATE TYPE content_status AS ENUM (
    'draft',
    'published',
    'archived',
    'flagged'
);

-- Item condition for marketplace
CREATE TYPE item_condition AS ENUM (
    'new',
    'like_new',
    'good',
    'fair',
    'poor'
);

-- Transaction status
CREATE TYPE transaction_status AS ENUM (
    'available',
    'reserved',
    'sold',
    'cancelled'
);

-- Lost & Found status
CREATE TYPE lost_found_status AS ENUM (
    'lost',
    'found',
    'claimed',
    'returned'
);

-- Notice priority
CREATE TYPE notice_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);

-- Event type
CREATE TYPE event_type AS ENUM (
    'ismp',
    'workshop',
    'seminar',
    'competition',
    'cultural',
    'sports',
    'club_activity',
    'general'
);

-- Building/Location type
CREATE TYPE location_type AS ENUM (
    'academic',
    'hostel',
    'administrative',
    'recreational',
    'mess',
    'medical',
    'sports',
    'other'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users Table (Central user management)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL for guests (no login)
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    status user_status DEFAULT 'active',
    
    -- Profile information
    profile_picture_url TEXT,
    phone_number VARCHAR(20),
    bio TEXT,
    
    -- Role-specific fields
    enrollment_number VARCHAR(50), -- For students
    employee_id VARCHAR(50), -- For faculty/staff
    graduation_year INTEGER, -- For students/alumni
    department VARCHAR(100),
    batch VARCHAR(20), -- For students
    designation VARCHAR(100), -- For faculty/staff
    
    -- Alumni specific
    current_organization VARCHAR(255), -- For alumni
    current_position VARCHAR(255), -- For alumni
    industry VARCHAR(100), -- For alumni
    location VARCHAR(255), -- Current location for alumni
    linkedin_url TEXT,
    
    -- Guest specific
    guest_purpose VARCHAR(255), -- Why visiting
    guest_valid_until TIMESTAMP, -- Access expiry for guests
    
    -- Settings & preferences
    notification_preferences JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expiry TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_enrollment ON users(enrollment_number);
CREATE INDEX idx_users_employee_id ON users(employee_id);

-- =====================================================
-- BLOGS & CONTENT
-- =====================================================

-- Blog Posts Table
CREATE TABLE blog_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT, -- Short summary
    featured_image_url TEXT,
    
    -- Categorization
    category blog_category NOT NULL,
    tags TEXT[], -- Array of tags
    
    -- For placement/internship blogs
    company_name VARCHAR(255),
    role_applied VARCHAR(255),
    interview_round VARCHAR(100), -- 'online_assessment', 'technical', 'hr', etc.
    
    -- Status & visibility
    status content_status DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    
    -- SEO
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Publishing
    published_at TIMESTAMP,
    scheduled_publish_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    archived_at TIMESTAMP
);

CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_company ON blog_posts(company_name);

-- Blog Comments Table
CREATE TABLE blog_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE, -- For nested comments
    
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Engagement
    like_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_blog_comments_post ON blog_comments(blog_post_id);
CREATE INDEX idx_blog_comments_user ON blog_comments(user_id);
CREATE INDEX idx_blog_comments_parent ON blog_comments(parent_comment_id);

-- Blog Likes Table
CREATE TABLE blog_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blog_post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(blog_post_id, user_id)
);

CREATE INDEX idx_blog_likes_post ON blog_likes(blog_post_id);
CREATE INDEX idx_blog_likes_user ON blog_likes(user_id);

-- =====================================================
-- BUY & SELL MARKETPLACE
-- =====================================================

-- Marketplace Items Table
CREATE TABLE marketplace_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Item details
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'books', 'electronics', 'furniture', etc.
    subcategory VARCHAR(100),
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    is_negotiable BOOLEAN DEFAULT TRUE,
    
    -- Condition & availability
    condition item_condition NOT NULL,
    status transaction_status DEFAULT 'available',
    quantity INTEGER DEFAULT 1,
    
    -- Media
    images TEXT[], -- Array of image URLs
    
    -- Location
    pickup_location VARCHAR(255),
    delivery_available BOOLEAN DEFAULT FALSE,
    
    -- Engagement
    view_count INTEGER DEFAULT 0,
    favorite_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    sold_at TIMESTAMP,
    archived_at TIMESTAMP,
    expires_at TIMESTAMP -- Auto-archive after certain period
);

CREATE INDEX idx_marketplace_items_seller ON marketplace_items(seller_id);
CREATE INDEX idx_marketplace_items_category ON marketplace_items(category);
CREATE INDEX idx_marketplace_items_status ON marketplace_items(status);
CREATE INDEX idx_marketplace_items_price ON marketplace_items(price);

-- Marketplace Inquiries Table
CREATE TABLE marketplace_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    message TEXT NOT NULL,
    offered_price DECIMAL(10, 2),
    
    is_read BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_marketplace_inquiries_item ON marketplace_inquiries(item_id);
CREATE INDEX idx_marketplace_inquiries_buyer ON marketplace_inquiries(buyer_id);
CREATE INDEX idx_marketplace_inquiries_seller ON marketplace_inquiries(seller_id);

-- Marketplace Favorites Table
CREATE TABLE marketplace_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_id, user_id)
);

CREATE INDEX idx_marketplace_favorites_item ON marketplace_favorites(item_id);
CREATE INDEX idx_marketplace_favorites_user ON marketplace_favorites(user_id);

-- =====================================================
-- LOST & FOUND
-- =====================================================

-- Lost & Found Items Table
CREATE TABLE lost_found_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claimer_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Person who claimed
    
    -- Item details
    item_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'electronics', 'documents', 'accessories', etc.
    
    -- Status
    status lost_found_status NOT NULL,
    
    -- Location & time
    location_lost_found VARCHAR(255) NOT NULL,
    date_lost_found DATE NOT NULL,
    time_lost_found TIME,
    
    -- Contact & verification
    contact_info VARCHAR(255), -- Optional contact details
    verification_questions JSONB, -- Security questions for claiming
    
    -- Media
    images TEXT[], -- Array of image URLs
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    claimed_at TIMESTAMP,
    returned_at TIMESTAMP
);

CREATE INDEX idx_lost_found_items_reporter ON lost_found_items(reporter_id);
CREATE INDEX idx_lost_found_items_status ON lost_found_items(status);
CREATE INDEX idx_lost_found_items_category ON lost_found_items(category);
CREATE INDEX idx_lost_found_items_date ON lost_found_items(date_lost_found);

-- Lost & Found Claims Table
CREATE TABLE lost_found_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES lost_found_items(id) ON DELETE CASCADE,
    claimer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    description TEXT NOT NULL, -- Why they think it's theirs
    verification_answers JSONB, -- Answers to security questions
    contact_info VARCHAR(255),
    
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lost_found_claims_item ON lost_found_claims(item_id);
CREATE INDEX idx_lost_found_claims_claimer ON lost_found_claims(claimer_id);

-- =====================================================
-- COMMUNITIES & GROUPS
-- =====================================================

-- Communities Table (Interest-based groups)
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    cover_image_url TEXT,
    
    -- Settings
    is_public BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    allow_posts BOOLEAN DEFAULT TRUE,
    
    -- Stats
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    archived_at TIMESTAMP
);

CREATE INDEX idx_communities_slug ON communities(slug);
CREATE INDEX idx_communities_creator ON communities(creator_id);
CREATE INDEX idx_communities_is_public ON communities(is_public);

-- Community Members Table
CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'moderator', 'member'
    
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_community_members_user ON community_members(user_id);

-- Community Posts Table
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title VARCHAR(500),
    content TEXT NOT NULL,
    media_urls TEXT[], -- Images/videos
    
    -- Engagement
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    
    is_pinned BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_community_posts_community ON community_posts(community_id);
CREATE INDEX idx_community_posts_author ON community_posts(author_id);
CREATE INDEX idx_community_posts_created ON community_posts(created_at);

-- Community Post Comments Table
CREATE TABLE community_post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES community_post_comments(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_community_post_comments_post ON community_post_comments(post_id);
CREATE INDEX idx_community_post_comments_user ON community_post_comments(user_id);

-- =====================================================
-- NOTICES & ANNOUNCEMENTS
-- =====================================================

-- Notices Table
CREATE TABLE notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    
    -- Categorization
    category VARCHAR(100) NOT NULL, -- 'academic', 'administrative', 'placement', etc.
    priority notice_priority DEFAULT 'medium',
    tags TEXT[],
    
    -- Targeting (who can see this)
    target_roles user_role[], -- ['student', 'faculty'] etc.
    target_departments TEXT[], -- ['CSE', 'ECE'] etc.
    target_batches TEXT[], -- ['2021', '2022'] etc.
    
    -- Media
    attachments TEXT[], -- Array of file URLs
    
    -- Visibility
    is_active BOOLEAN DEFAULT TRUE,
    is_pinned BOOLEAN DEFAULT FALSE,
    
    -- Engagement
    view_count INTEGER DEFAULT 0,
    
    -- Metadata
    valid_from TIMESTAMP DEFAULT NOW(),
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notices_posted_by ON notices(posted_by);
CREATE INDEX idx_notices_category ON notices(category);
CREATE INDEX idx_notices_priority ON notices(priority);
CREATE INDEX idx_notices_is_active ON notices(is_active);
CREATE INDEX idx_notices_valid_until ON notices(valid_until);

-- Notice Views Table (Track who viewed)
CREATE TABLE notice_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(notice_id, user_id)
);

CREATE INDEX idx_notice_views_notice ON notice_views(notice_id);
CREATE INDEX idx_notice_views_user ON notice_views(user_id);

-- =====================================================
-- CAMPUS MAPS & NAVIGATION
-- =====================================================

-- Buildings/Locations Table
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50), -- Building code (e.g., 'SAB', 'LH1')
    description TEXT,
    type location_type NOT NULL,
    
    -- Coordinates
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    coordinates GEOGRAPHY(POINT, 4326), -- PostGIS point
    
    -- Media
    images TEXT[],
    icon_url TEXT,
    
    -- Details
    floor_count INTEGER,
    has_indoor_map BOOLEAN DEFAULT FALSE,
    facilities TEXT[], -- ['wifi', 'ac', 'labs', 'classrooms']
    
    -- Operational
    is_accessible BOOLEAN DEFAULT TRUE,
    opening_time TIME,
    closing_time TIME,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_code ON locations(code);
CREATE INDEX idx_locations_coordinates ON locations USING GIST(coordinates);

-- Indoor Maps Table (For complex buildings like SAB)
CREATE TABLE indoor_maps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    
    floor_number INTEGER NOT NULL,
    floor_name VARCHAR(100), -- 'Ground Floor', 'First Floor', etc.
    map_image_url TEXT NOT NULL, -- SVG or image of floor plan
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(location_id, floor_number)
);

CREATE INDEX idx_indoor_maps_location ON indoor_maps(location_id);

-- Points of Interest (Within buildings)
CREATE TABLE points_of_interest (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    indoor_map_id UUID REFERENCES indoor_maps(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'classroom', 'lab', 'office', 'restroom', etc.
    
    -- For indoor POIs
    floor_number INTEGER,
    room_number VARCHAR(50),
    
    -- Coordinates (for outdoor POIs) or relative position (for indoor)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    x_position DECIMAL(10, 2), -- Relative X position on floor map
    y_position DECIMAL(10, 2), -- Relative Y position on floor map
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_poi_location ON points_of_interest(location_id);
CREATE INDEX idx_poi_indoor_map ON points_of_interest(indoor_map_id);

-- Navigation Routes (Pre-calculated paths between locations)
CREATE TABLE navigation_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    
    distance_meters DECIMAL(10, 2),
    estimated_time_minutes INTEGER,
    path_coordinates JSONB, -- Array of coordinates for the route
    description TEXT, -- Direction instructions
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(from_location_id, to_location_id)
);

CREATE INDEX idx_navigation_routes_from ON navigation_routes(from_location_id);
CREATE INDEX idx_navigation_routes_to ON navigation_routes(to_location_id);

-- =====================================================
-- EVENTS & ACTIVITIES
-- =====================================================

-- Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    type event_type NOT NULL,
    
    -- Timing
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    registration_start TIMESTAMP,
    registration_end TIMESTAMP,
    
    -- Location
    location_id UUID REFERENCES locations(id),
    venue_name VARCHAR(255), -- If not in locations table
    venue_details TEXT,
    
    -- Media
    poster_url TEXT,
    images TEXT[],
    
    -- Registration & capacity
    requires_registration BOOLEAN DEFAULT FALSE,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    registration_fee DECIMAL(10, 2) DEFAULT 0,
    
    -- Targeting
    target_roles user_role[],
    target_departments TEXT[],
    target_batches TEXT[],
    
    -- External links
    registration_link TEXT,
    meeting_link TEXT,
    
    -- Engagement
    view_count INTEGER DEFAULT 0,
    interested_count INTEGER DEFAULT 0,
    
    -- Status
    is_published BOOLEAN DEFAULT TRUE,
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT,
    
    -- Associated club/body
    organizing_body VARCHAR(255), -- 'Softcom', 'Cultural Society', etc.
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_location ON events(location_id);

-- Event Registrations Table
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    registration_data JSONB, -- Custom form data
    payment_status VARCHAR(50) DEFAULT 'pending',
    attendance_status VARCHAR(50) DEFAULT 'registered', -- 'registered', 'attended', 'no_show'
    
    registered_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_user ON event_registrations(user_id);

-- Event Interested Table (Users who marked interested)
CREATE TABLE event_interested (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_interested_event ON event_interested(event_id);
CREATE INDEX idx_event_interested_user ON event_interested(user_id);

-- =====================================================
-- CLUBS, BODIES & ORGANIZATIONS
-- =====================================================

-- Clubs/Bodies Table
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'technical', 'cultural', 'sports', etc.
    
    -- Media
    logo_url TEXT,
    cover_image_url TEXT,
    
    -- Contact
    email VARCHAR(255),
    social_links JSONB, -- {instagram: '', linkedin: '', etc.}
    
    -- Stats
    member_count INTEGER DEFAULT 0,
    event_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    founded_year INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_clubs_slug ON clubs(slug);
CREATE INDEX idx_clubs_category ON clubs(category);
CREATE INDEX idx_clubs_is_active ON clubs(is_active);

-- Club Members Table
CREATE TABLE club_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    position VARCHAR(100), -- 'coordinator', 'member', 'volunteer', etc.
    year VARCHAR(20), -- Academic year of tenure
    
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    
    UNIQUE(club_id, user_id, year)
);

CREATE INDEX idx_club_members_club ON club_members(club_id);
CREATE INDEX idx_club_members_user ON club_members(user_id);

-- =====================================================
-- QUICK LINKS
-- =====================================================

-- Quick Links Table (Portal links, external resources)
CREATE TABLE quick_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Link info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    icon_url TEXT,
    
    -- Categorization
    category VARCHAR(100) NOT NULL, -- 'academic', 'administrative', 'library', etc.
    subcategory VARCHAR(100),
    
    -- Targeting
    target_roles user_role[], -- Who can see this link
    
    -- Display
    display_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Engagement
    click_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quick_links_category ON quick_links(category);
CREATE INDEX idx_quick_links_is_active ON quick_links(is_active);
CREATE INDEX idx_quick_links_display_order ON quick_links(display_order);

-- =====================================================
-- FEED & ACTIVITY STREAM
-- =====================================================

-- Feed Posts Table (Unified feed from various sources)
CREATE TABLE feed_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL,
    media_urls TEXT[],
    
    -- Post type reference (polymorphic)
    source_type VARCHAR(50), -- 'blog', 'event', 'notice', 'community_post', 'general'
    source_id UUID, -- Reference to the original item
    
    -- Engagement
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Visibility
    is_public BOOLEAN DEFAULT TRUE,
    target_roles user_role[],
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feed_posts_author ON feed_posts(author_id);
CREATE INDEX idx_feed_posts_source ON feed_posts(source_type, source_id);
CREATE INDEX idx_feed_posts_created ON feed_posts(created_at DESC);

-- Feed Likes Table
CREATE TABLE feed_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_feed_likes_post ON feed_likes(post_id);
CREATE INDEX idx_feed_likes_user ON feed_likes(user_id);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'comment', 'like', 'event', 'notice', etc.
    
    -- Reference to related entity
    entity_type VARCHAR(50), -- 'blog', 'event', 'marketplace_item', etc.
    entity_id UUID,
    
    -- Action URL
    action_url TEXT,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- MESSAGING (Optional - for direct messaging between users)
-- =====================================================

-- Conversations Table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- For group conversations
    name VARCHAR(255),
    type VARCHAR(50) DEFAULT 'direct', -- 'direct' or 'group'
    
    last_message_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Conversation Participants Table
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Participant settings
    is_muted BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMP,
    
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    media_urls TEXT[],
    
    -- Message metadata
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- =====================================================
-- ANALYTICS & TRACKING (Optional - for admin insights)
-- =====================================================

-- User Activity Log
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(100) NOT NULL, -- 'login', 'view_blog', 'create_post', etc.
    entity_type VARCHAR(50),
    entity_id UUID,
    
    metadata JSONB, -- Additional context
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- =====================================================
-- REPORTS & MODERATION
-- =====================================================

-- Reports Table (For flagging inappropriate content)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- What is being reported
    entity_type VARCHAR(50) NOT NULL, -- 'blog', 'comment', 'user', 'marketplace_item', etc.
    entity_id UUID NOT NULL,
    
    reason VARCHAR(100) NOT NULL, -- 'spam', 'harassment', 'inappropriate', etc.
    description TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    moderator_notes TEXT,
    action_taken VARCHAR(255), -- What action was taken
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_entity ON reports(entity_type, entity_id);
CREATE INDEX idx_reports_status ON reports(status);

-- =====================================================
-- FEEDBACK & SUGGESTIONS
-- =====================================================

-- Feedback Table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    category VARCHAR(100) NOT NULL, -- 'bug', 'feature_request', 'improvement', 'general'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Priority & status
    status VARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'under_review', 'planned', 'implemented', 'rejected'
    priority VARCHAR(50) DEFAULT 'medium',
    
    -- Admin response
    admin_response TEXT,
    responded_by UUID REFERENCES users(id),
    responded_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_feedback_status ON feedback(status);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_items_updated_at BEFORE UPDATE ON marketplace_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lost_found_items_updated_at BEFORE UPDATE ON lost_found_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON notices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quick_links_updated_at BEFORE UPDATE ON quick_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update counter caches
CREATE OR REPLACE FUNCTION increment_counter()
RETURNS TRIGGER AS $$
BEGIN
    -- Blog post like count
    IF TG_TABLE_NAME = 'blog_likes' THEN
        UPDATE blog_posts SET like_count = like_count + 1 WHERE id = NEW.blog_post_id;
    END IF;
    
    -- Community member count
    IF TG_TABLE_NAME = 'community_members' THEN
        UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    END IF;
    
    -- Event interested count
    IF TG_TABLE_NAME = 'event_interested' THEN
        UPDATE events SET interested_count = interested_count + 1 WHERE id = NEW.event_id;
    END IF;
    
    -- Marketplace favorites
    IF TG_TABLE_NAME = 'marketplace_favorites' THEN
        UPDATE marketplace_items SET favorite_count = favorite_count + 1 WHERE id = NEW.item_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION decrement_counter()
RETURNS TRIGGER AS $$
BEGIN
    -- Blog post like count
    IF TG_TABLE_NAME = 'blog_likes' THEN
        UPDATE blog_posts SET like_count = like_count - 1 WHERE id = OLD.blog_post_id;
    END IF;
    
    -- Community member count
    IF TG_TABLE_NAME = 'community_members' THEN
        UPDATE communities SET member_count = member_count - 1 WHERE id = OLD.community_id;
    END IF;
    
    -- Event interested count
    IF TG_TABLE_NAME = 'event_interested' THEN
        UPDATE events SET interested_count = interested_count - 1 WHERE id = OLD.event_id;
    END IF;
    
    -- Marketplace favorites
    IF TG_TABLE_NAME = 'marketplace_favorites' THEN
        UPDATE marketplace_items SET favorite_count = favorite_count - 1 WHERE id = OLD.item_id;
    END IF;
    
    RETURN OLD;
END;
$$ language 'plpgsql';

-- Apply counter triggers
CREATE TRIGGER blog_likes_insert AFTER INSERT ON blog_likes FOR EACH ROW EXECUTE FUNCTION increment_counter();
CREATE TRIGGER blog_likes_delete AFTER DELETE ON blog_likes FOR EACH ROW EXECUTE FUNCTION decrement_counter();
CREATE TRIGGER community_members_insert AFTER INSERT ON community_members FOR EACH ROW EXECUTE FUNCTION increment_counter();
CREATE TRIGGER community_members_delete AFTER DELETE ON community_members FOR EACH ROW EXECUTE FUNCTION decrement_counter();
CREATE TRIGGER event_interested_insert AFTER INSERT ON event_interested FOR EACH ROW EXECUTE FUNCTION increment_counter();
CREATE TRIGGER event_interested_delete AFTER DELETE ON event_interested FOR EACH ROW EXECUTE FUNCTION decrement_counter();
CREATE TRIGGER marketplace_favorites_insert AFTER INSERT ON marketplace_favorites FOR EACH ROW EXECUTE FUNCTION increment_counter();
CREATE TRIGGER marketplace_favorites_delete AFTER DELETE ON marketplace_favorites FOR EACH ROW EXECUTE FUNCTION decrement_counter();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================
-- Note: Enable RLS and create policies based on your auth setup
-- This is a template - adjust according to your authentication system

-- Example: Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Example policies (you'll need to adjust these based on your auth.uid())
-- SELECT policy: Users can view published blog posts
-- CREATE POLICY "Public blog posts are viewable by everyone" 
--     ON blog_posts FOR SELECT 
--     USING (status = 'published');

-- INSERT policy: Users can only create their own blog posts
-- CREATE POLICY "Users can create their own blog posts" 
--     ON blog_posts FOR INSERT 
--     WITH CHECK (auth.uid() = author_id);

-- UPDATE policy: Users can only update their own blog posts
-- CREATE POLICY "Users can update their own blog posts" 
--     ON blog_posts FOR UPDATE 
--     USING (auth.uid() = author_id);

-- =====================================================
-- INITIAL DATA / SEED DATA (Optional)
-- =====================================================

-- You can add seed data here for testing
-- Example: Insert default categories, some sample quick links, etc.

-- =====================================================
-- VIEWS (Optional - for common queries)
-- =====================================================

-- View for active marketplace items
CREATE VIEW active_marketplace_items AS
SELECT 
    mi.*,
    u.full_name as seller_name,
    u.phone_number as seller_phone,
    u.email as seller_email
FROM marketplace_items mi
JOIN users u ON mi.seller_id = u.id
WHERE mi.status = 'available' 
  AND (mi.expires_at IS NULL OR mi.expires_at > NOW());

-- View for upcoming events
CREATE VIEW upcoming_events AS
SELECT 
    e.*,
    u.full_name as organizer_name,
    l.name as location_name,
    l.code as location_code
FROM events e
JOIN users u ON e.organizer_id = u.id
LEFT JOIN locations l ON e.location_id = l.id
WHERE e.is_published = TRUE 
  AND e.is_cancelled = FALSE
  AND e.start_time > NOW()
ORDER BY e.start_time;

-- View for active lost items
CREATE VIEW active_lost_items AS
SELECT 
    lfi.*,
    u.full_name as reporter_name,
    u.phone_number as reporter_phone
FROM lost_found_items lfi
JOIN users u ON lfi.reporter_id = u.id
WHERE lfi.status IN ('lost', 'found')
ORDER BY lfi.created_at DESC;

-- View for recent blog posts
CREATE VIEW recent_blog_posts AS
SELECT 
    bp.*,
    u.full_name as author_name,
    u.role as author_role,
    u.profile_picture_url as author_avatar
FROM blog_posts bp
JOIN users u ON bp.author_id = u.id
WHERE bp.status = 'published'
ORDER BY bp.published_at DESC;

-- =====================================================
-- FULL TEXT SEARCH INDEXES (For better search)
-- =====================================================

-- Add full text search to blog posts
ALTER TABLE blog_posts ADD COLUMN search_vector tsvector;

CREATE INDEX blog_posts_search_idx ON blog_posts USING GIN(search_vector);

CREATE OR REPLACE FUNCTION blog_posts_search_trigger() 
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.excerpt, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blog_posts_search_update 
    BEFORE INSERT OR UPDATE ON blog_posts
    FOR EACH ROW EXECUTE FUNCTION blog_posts_search_trigger();

-- Add full text search to marketplace items
ALTER TABLE marketplace_items ADD COLUMN search_vector tsvector;

CREATE INDEX marketplace_items_search_idx ON marketplace_items USING GIN(search_vector);

CREATE OR REPLACE FUNCTION marketplace_items_search_trigger() 
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketplace_items_search_update 
    BEFORE INSERT OR UPDATE ON marketplace_items
    FOR EACH ROW EXECUTE FUNCTION marketplace_items_search_trigger();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'Central user table for students, faculty, staff, alumni, and guests';
COMMENT ON TABLE blog_posts IS 'Blog posts for placements, internships, faculty insights, and alumni experiences';
COMMENT ON TABLE marketplace_items IS 'Buy & Sell marketplace items';
COMMENT ON TABLE lost_found_items IS 'Lost & Found item tracking';
COMMENT ON TABLE communities IS 'Interest-based communities and groups';
COMMENT ON TABLE notices IS 'General notices and announcements';
COMMENT ON TABLE locations IS 'Campus buildings and locations with GPS coordinates';
COMMENT ON TABLE indoor_maps IS 'Floor plans for complex buildings';
COMMENT ON TABLE events IS 'Campus events, ISMP activities, workshops, etc.';
COMMENT ON TABLE clubs IS 'College clubs and bodies (Softcom, Cultural, Sports, etc.)';
COMMENT ON TABLE quick_links IS 'Quick access links to portals and external resources';
COMMENT ON TABLE feed_posts IS 'Unified activity feed showing updates from various sources';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- This schema provides a comprehensive foundation for the
-- Institute Community App with all features mentioned in the
-- DEP idea document.
-- 
-- Next Steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Configure Row Level Security policies based on your auth setup
-- 3. Set up Supabase Auth for user authentication
-- 4. Configure Storage buckets for images and files
-- 5. Set up real-time subscriptions for live features
-- 6. Create API routes/functions for complex operations
-- =====================================================
