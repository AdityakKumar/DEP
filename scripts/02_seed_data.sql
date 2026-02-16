-- =====================================================
-- SEED DATA FOR INSTITUTE COMMUNITY APP
-- =====================================================
-- This file contains sample/initial data for testing and development
-- Run this AFTER running 01_schema.sql
-- =====================================================

-- =====================================================
-- SAMPLE USERS (Password: 'password123' - hashed)
-- =====================================================
-- Note: Replace password_hash with actual bcrypt hashes in production

-- Sample Students
INSERT INTO users (email, full_name, role, enrollment_number, department, batch, graduation_year, is_verified) VALUES
('2021csb1001@iitrpr.ac.in', 'Harsh Rai', 'student', '2021CSB1001', 'Computer Science', '2021', 2025, TRUE),
('2021csb1002@iitrpr.ac.in', 'Priya Sharma', 'student', '2021CSB1002', 'Computer Science', '2021', 2025, TRUE),
('2022eeb1001@iitrpr.ac.in', 'Rahul Kumar', 'student', '2022EEB1001', 'Electrical Engineering', '2022', 2026, TRUE),
('2023meb1001@iitrpr.ac.in', 'Anjali Singh', 'student', '2023MEB1001', 'Mechanical Engineering', '2023', 2027, TRUE);

-- Sample Faculty
INSERT INTO users (email, full_name, role, employee_id, department, designation, is_verified) VALUES
('prof.sodhi@iitrpr.ac.in', 'Prof. Sodhi', 'faculty', 'FAC001', 'Computer Science', 'Professor', TRUE),
('prof.venkatesh@iitrpr.ac.in', 'Prof. Tamarapalli Venkatesh', 'faculty', 'FAC002', 'Computer Science', 'Professor', TRUE);

-- Sample Staff
INSERT INTO users (email, full_name, role, employee_id, department, designation, is_verified) VALUES
('admin@iitrpr.ac.in', 'Admin User', 'staff', 'STAFF001', 'Administration', 'Administrator', TRUE);

-- Sample Alumni
INSERT INTO users (email, full_name, role, enrollment_number, department, graduation_year, current_organization, current_position, industry, location, is_verified) VALUES
('alumni1@example.com', 'Rohan Mehta', 'alumni', '2018CSB1001', 'Computer Science', 2022, 'Google', 'Software Engineer', 'Technology', 'Mountain View, CA', TRUE),
('alumni2@example.com', 'Sneha Patel', 'alumni', '2017EEB1002', 'Electrical Engineering', 2021, 'Microsoft', 'Senior SDE', 'Technology', 'Redmond, WA', TRUE);

-- Sample Guest
INSERT INTO users (email, full_name, role, guest_purpose, guest_valid_until, is_verified) VALUES
('guest@example.com', 'Visitor User', 'guest', 'Inter IIT Participant', NOW() + INTERVAL '7 days', TRUE);

-- =====================================================
-- SAMPLE CLUBS & BODIES
-- =====================================================

INSERT INTO clubs (name, slug, description, category, logo_url, email, is_active, founded_year) VALUES
('SoftCom', 'softcom', 'Software Development Club of IIT Ropar. Responsible for technical projects and maintaining institute applications.', 'technical', 'https://example.com/logos/softcom.png', 'softcom@iitrpr.ac.in', TRUE, 2015),
('Cultural Society', 'cultural-society', 'Organizing cultural events and fostering artistic expression on campus.', 'cultural', 'https://example.com/logos/cultural.png', 'cultural@iitrpr.ac.in', TRUE, 2010),
('Sports Committee', 'sports-committee', 'Managing and promoting sports activities and competitions.', 'sports', 'https://example.com/logos/sports.png', 'sports@iitrpr.ac.in', TRUE, 2010),
('Technical Society', 'tech-society', 'Organizing technical workshops, hackathons, and competitions.', 'technical', 'https://example.com/logos/tech.png', 'tech@iitrpr.ac.in', TRUE, 2011);

-- Club members
INSERT INTO club_members (club_id, user_id, position, year) 
SELECT 
    (SELECT id FROM clubs WHERE slug = 'softcom'),
    (SELECT id FROM users WHERE email = '2021csb1001@iitrpr.ac.in'),
    'Coordinator',
    '2024-25';

-- =====================================================
-- SAMPLE LOCATIONS (Campus Buildings)
-- =====================================================

INSERT INTO locations (name, code, description, type, latitude, longitude, is_accessible, floor_count) VALUES
('Student Activity Building', 'SAB', 'Main student activity center with clubs, societies, and administration offices.', 'administrative', 30.9675, 76.7271, TRUE, 4),
('Lecture Hall 1', 'LH1', 'Primary lecture hall complex for academic courses.', 'academic', 30.9680, 76.7275, TRUE, 3),
('Library', 'LIB', 'Central library with extensive collection of books, journals, and study spaces.', 'academic', 30.9678, 76.7280, TRUE, 3),
('Sports Complex', 'SC', 'Indoor and outdoor sports facilities including gym, courts, and fields.', 'sports', 30.9685, 76.7265, TRUE, 2),
('Hostel Block A', 'HA', 'Student residential hostel for boys.', 'hostel', 30.9670, 76.7285, TRUE, 4),
('Main Mess', 'MESS1', 'Primary dining facility for students.', 'mess', 30.9672, 76.7283, TRUE, 1),
('Medical Center', 'MC', 'Campus healthcare facility.', 'medical', 30.9682, 76.7268, TRUE, 2);

-- Update coordinates field using PostGIS
UPDATE locations SET coordinates = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326);

-- =====================================================
-- SAMPLE QUICK LINKS
-- =====================================================

INSERT INTO quick_links (created_by, title, description, url, category, target_roles, is_featured, display_order) VALUES
((SELECT id FROM users WHERE role = 'staff' LIMIT 1), 'Academic Portal', 'Access to course registration, grades, and academic records.', 'https://academics.iitrpr.ac.in', 'academic', ARRAY['student', 'faculty']::user_role[], TRUE, 1),
((SELECT id FROM users WHERE role = 'staff' LIMIT 1), 'Library Portal', 'Online library catalog and digital resources.', 'https://library.iitrpr.ac.in', 'academic', ARRAY['student', 'faculty', 'staff']::user_role[], TRUE, 2),
((SELECT id FROM users WHERE role = 'staff' LIMIT 1), 'Placement Portal', 'Placement and internship opportunities.', 'https://placements.iitrpr.ac.in', 'academic', ARRAY['student', 'alumni']::user_role[], TRUE, 3),
((SELECT id FROM users WHERE role = 'staff' LIMIT 1), 'Hostel Portal', 'Hostel room allocation and mess management.', 'https://hostel.iitrpr.ac.in', 'administrative', ARRAY['student']::user_role[], FALSE, 4),
((SELECT id FROM users WHERE role = 'staff' LIMIT 1), 'Grievance Portal', 'Submit and track grievances and complaints.', 'https://grievance.iitrpr.ac.in', 'administrative', ARRAY['student', 'faculty', 'staff']::user_role[], FALSE, 5);

-- =====================================================
-- SAMPLE COMMUNITIES
-- =====================================================

INSERT INTO communities (creator_id, name, slug, description, is_public, requires_approval) VALUES
((SELECT id FROM users WHERE email = '2021csb1001@iitrpr.ac.in'), 'Competitive Programming', 'competitive-programming', 'Discussion and resources for competitive programming enthusiasts.', TRUE, FALSE),
((SELECT id FROM users WHERE email = '2021csb1002@iitrpr.ac.in'), 'Photography Club', 'photography', 'Share your photography work and learn from others.', TRUE, FALSE),
((SELECT id FROM users WHERE email = '2022eeb1001@iitrpr.ac.in'), 'Electronics Projects', 'electronics-projects', 'Collaborate on electronics and hardware projects.', TRUE, FALSE);

-- Add some community members
INSERT INTO community_members (community_id, user_id, role) 
SELECT 
    (SELECT id FROM communities WHERE slug = 'competitive-programming'),
    id,
    CASE 
        WHEN email = '2021csb1001@iitrpr.ac.in' THEN 'admin'
        ELSE 'member'
    END
FROM users 
WHERE role = 'student' 
LIMIT 3;

-- =====================================================
-- SAMPLE BLOG POSTS
-- =====================================================

INSERT INTO blog_posts (
    author_id, 
    title, 
    slug, 
    content, 
    excerpt, 
    category, 
    tags, 
    company_name, 
    role_applied, 
    status, 
    is_featured, 
    published_at
) VALUES
(
    (SELECT id FROM users WHERE email = '2021csb1001@iitrpr.ac.in'),
    'My Google SWE Internship Interview Experience',
    'google-swe-internship-2024',
    'I recently went through the Google Software Engineering Internship interview process for Summer 2024. Here''s my complete experience...\n\nRound 1: Online Assessment\nThe OA consisted of two coding questions. The first was a medium-level array manipulation problem, and the second involved trees and dynamic programming...\n\nRound 2: Technical Interview 1\nThe interviewer was very friendly and started with a discussion about my projects. Then we moved to a coding problem involving graph traversal...\n\nRound 3: Technical Interview 2\nThis round focused on system design fundamentals and a challenging algorithmic problem...',
    'Complete interview experience for Google SWE Internship 2024 - OA, technical rounds, and tips.',
    'internship',
    ARRAY['google', 'interview', 'internship', 'coding'],
    'Google',
    'Software Engineering Intern',
    'published',
    TRUE,
    NOW() - INTERVAL '2 days'
),
(
    (SELECT id FROM users WHERE email = 'alumni1@example.com'),
    'Life as an SDE at Google - Insights for IIT Ropar Students',
    'life-at-google-sde',
    'Having graduated from IIT Ropar in 2022, I wanted to share my journey and experiences working at Google...\n\nThe work culture at Google is very collaborative. You''re encouraged to take ownership of projects and innovate...\n\nFor students preparing for placements, focus on fundamentals. Data structures, algorithms, and system design are crucial...',
    'An alumnus shares insights about working at Google and advice for current students.',
    'alumni_experience',
    ARRAY['alumni', 'google', 'career', 'advice'],
    NULL,
    NULL,
    'published',
    TRUE,
    NOW() - INTERVAL '5 days'
),
(
    (SELECT id FROM users WHERE email = 'prof.sodhi@iitrpr.ac.in'),
    'The Impact of AI on Software Development',
    'ai-impact-on-software-development',
    'As we see rapid advancement in AI tools and agents, it''s important to understand how this is reshaping software development...\n\nAI tools like GitHub Copilot and Claude are increasing productivity significantly. However, there''s a concern about reduced deep learning and problem-solving skills...\n\nStudents should focus on understanding fundamentals rather than relying solely on AI assistance...',
    'Faculty perspective on how AI is changing software development and what students should focus on.',
    'faculty_insight',
    ARRAY['ai', 'software', 'education', 'future'],
    NULL,
    NULL,
    'published',
    TRUE,
    NOW() - INTERVAL '1 day'
);

-- =====================================================
-- SAMPLE MARKETPLACE ITEMS
-- =====================================================

INSERT INTO marketplace_items (
    seller_id,
    title,
    description,
    category,
    price,
    is_negotiable,
    condition,
    status,
    pickup_location,
    images
) VALUES
(
    (SELECT id FROM users WHERE email = '2021csb1001@iitrpr.ac.in'),
    'Data Structures and Algorithms in Java - Textbook',
    'Selling my DSA textbook. Good condition, minimal highlighting. Great for CS students.',
    'books',
    450.00,
    TRUE,
    'good',
    'available',
    'Hostel Block A, Room 201',
    ARRAY['https://example.com/items/book1.jpg']
),
(
    (SELECT id FROM users WHERE email = '2022eeb1001@iitrpr.ac.in'),
    'HP Laptop - i5 8th Gen, 8GB RAM',
    'Selling my laptop as I''m upgrading. Works perfectly, includes charger and bag.',
    'electronics',
    28000.00,
    TRUE,
    'good',
    'available',
    'Hostel Block A',
    ARRAY['https://example.com/items/laptop1.jpg', 'https://example.com/items/laptop2.jpg']
),
(
    (SELECT id FROM users WHERE email = '2021csb1002@iitrpr.ac.in'),
    'Study Table with Chair',
    'Moving out, selling my study furniture. Sturdy and in excellent condition.',
    'furniture',
    1500.00,
    TRUE,
    'like_new',
    'available',
    'Hostel Block B, Room 315',
    ARRAY['https://example.com/items/table1.jpg']
);

-- =====================================================
-- SAMPLE LOST & FOUND ITEMS
-- =====================================================

INSERT INTO lost_found_items (
    reporter_id,
    item_name,
    description,
    category,
    status,
    location_lost_found,
    date_lost_found,
    images
) VALUES
(
    (SELECT id FROM users WHERE email = '2023meb1001@iitrpr.ac.in'),
    'Black JBL Earphones',
    'Lost my black JBL wireless earphones. Has small scratch on right piece.',
    'electronics',
    'lost',
    'Near Library Building',
    CURRENT_DATE - 2,
    ARRAY['https://example.com/lostfound/earphones1.jpg']
),
(
    (SELECT id FROM users WHERE email = '2022eeb1001@iitrpr.ac.in'),
    'Student ID Card',
    'Found a student ID card near the mess. Belongs to a 2nd year CSE student.',
    'documents',
    'found',
    'Main Mess Entrance',
    CURRENT_DATE - 1,
    ARRAY['https://example.com/lostfound/idcard1.jpg']
);

-- =====================================================
-- SAMPLE NOTICES
-- =====================================================

INSERT INTO notices (
    posted_by,
    title,
    content,
    category,
    priority,
    tags,
    target_roles,
    target_departments,
    is_active,
    is_pinned,
    valid_until
) VALUES
(
    (SELECT id FROM users WHERE role = 'staff' LIMIT 1),
    'Mid-Semester Examination Schedule Released',
    'The mid-semester examination schedule for all departments has been released. Please check the academic portal for detailed timetable.\n\nExam Duration: March 15-22, 2024\n\nStudents are advised to prepare accordingly.',
    'academic',
    'high',
    ARRAY['exams', 'mid-sem', 'schedule'],
    ARRAY['student']::user_role[],
    ARRAY['Computer Science', 'Electrical Engineering', 'Mechanical Engineering'],
    TRUE,
    TRUE,
    NOW() + INTERVAL '30 days'
),
(
    (SELECT id FROM users WHERE role = 'faculty' LIMIT 1),
    'Guest Lecture on Machine Learning by IIT Bombay Professor',
    'Department of Computer Science is organizing a guest lecture on "Recent Advances in Machine Learning" by Prof. XYZ from IIT Bombay.\n\nDate: February 20, 2024\nTime: 4:00 PM\nVenue: Lecture Hall 1\n\nAll students and faculty are invited.',
    'academic',
    'medium',
    ARRAY['guest-lecture', 'machine-learning', 'event'],
    ARRAY['student', 'faculty']::user_role[],
    ARRAY['Computer Science'],
    TRUE,
    FALSE,
    NOW() + INTERVAL '15 days'
);

-- =====================================================
-- SAMPLE EVENTS
-- =====================================================

INSERT INTO events (
    organizer_id,
    title,
    slug,
    description,
    type,
    start_time,
    end_time,
    location_id,
    poster_url,
    requires_registration,
    max_participants,
    target_roles,
    is_published,
    organizing_body
) VALUES
(
    (SELECT id FROM users WHERE email = '2021csb1001@iitrpr.ac.in'),
    'HackIITR 2024 - Annual Hackathon',
    'hackiitr-2024',
    'IIT Ropar''s biggest hackathon is back! Join us for 24 hours of coding, innovation, and prizes.\n\nThemes: AI/ML, Web Development, Mobile Apps, Social Impact\n\nPrizes worth ₹2,00,000\n\nRegister now!',
    'competition',
    NOW() + INTERVAL '15 days',
    NOW() + INTERVAL '16 days',
    (SELECT id FROM locations WHERE code = 'SAB'),
    'https://example.com/events/hackiitr2024.jpg',
    TRUE,
    200,
    ARRAY['student']::user_role[],
    TRUE,
    'SoftCom'
),
(
    (SELECT id FROM users WHERE role = 'faculty' LIMIT 1),
    'ISMP Orientation - Welcome to IIT Ropar',
    'ismp-orientation-2024',
    'Welcome session for new students as part of the Induction and Student Mentorship Program (ISMP).\n\nLearn about campus facilities, academic structure, clubs, and student life.',
    'ismp',
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '5 days' + INTERVAL '2 hours',
    (SELECT id FROM locations WHERE code = 'LH1'),
    'https://example.com/events/ismp2024.jpg',
    FALSE,
    NULL,
    ARRAY['student']::user_role[],
    TRUE,
    'Academic Section'
);

-- =====================================================
-- SAMPLE FEED POSTS
-- =====================================================

INSERT INTO feed_posts (
    author_id,
    content,
    source_type,
    is_public,
    target_roles
) VALUES
(
    (SELECT id FROM users WHERE email = '2021csb1001@iitrpr.ac.in'),
    'Excited to announce that our team won first place at Inter IIT Tech Meet! 🏆 Thanks to everyone who supported us.',
    'general',
    TRUE,
    ARRAY['student', 'faculty', 'staff', 'alumni']::user_role[]
),
(
    (SELECT id FROM users WHERE email = 'alumni1@example.com'),
    'Visiting campus next week for alumni meet. Looking forward to seeing how much IIT Ropar has grown! Anyone want to meet up?',
    'general',
    TRUE,
    ARRAY['alumni', 'student', 'faculty']::user_role[]
);

-- =====================================================
-- SAMPLE NOTIFICATIONS (for testing)
-- =====================================================

INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    entity_type,
    is_read
) VALUES
(
    (SELECT id FROM users WHERE email = '2021csb1001@iitrpr.ac.in'),
    'New comment on your blog',
    'Someone commented on your blog post "My Google SWE Internship Interview Experience"',
    'comment',
    'blog',
    FALSE
),
(
    (SELECT id FROM users WHERE email = '2021csb1002@iitrpr.ac.in'),
    'New inquiry on your item',
    'Someone is interested in "Study Table with Chair"',
    'inquiry',
    'marketplace_item',
    FALSE
);

-- =====================================================
-- SEED DATA COMPLETE
-- =====================================================
-- This provides initial data for testing the Institute Community App
-- Adjust and expand as needed for your specific requirements
-- =====================================================
