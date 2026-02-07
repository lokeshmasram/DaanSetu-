#!/usr/bin/env python3
"""
Script to generate a comprehensive documentation for Daan-Setu Project in Word format.
Requires: python-docx library
Install: pip install python-docx
"""

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os
from datetime import datetime

def add_heading(doc, text, level=1):
    """Add a heading to the document."""
    return doc.add_heading(text, level=level)

def add_paragraph_custom(doc, text, bold=False, italic=False, size=11):
    """Add a paragraph with custom formatting."""
    p = doc.add_paragraph(text)
    if bold or italic or size != 11:
        for run in p.runs:
            if bold:
                run.bold = True
            if italic:
                run.italic = True
            run.font.size = Pt(size)
    return p

def shade_cell(cell, color):
    """Shade a table cell with a background color."""
    shading_elm = OxmlElement('w:shd')
    shading_elm.set(qn('w:fill'), color)
    cell._element.get_or_add_tcPr().append(shading_elm)

def create_documentation():
    """Create the main documentation document."""
    
    # Create a new Document
    doc = Document()
    
    # Set default font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    
    # ==================== TITLE PAGE ====================
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title.add_run('DaanSetu Project')
    title_run.font.size = Pt(28)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(74, 144, 226)
    
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle_run = subtitle.add_run('Connecting Kindness, One Donation at a Time')
    subtitle_run.font.size = Pt(16)
    subtitle_run.font.italic = True
    
    doc.add_paragraph()
    
    info = doc.add_paragraph()
    info.alignment = WD_ALIGN_PARAGRAPH.CENTER
    info_run = info.add_run(f'Comprehensive Technical Documentation\n{datetime.now().strftime("%B %d, %Y")}')
    info_run.font.size = Pt(12)
    
    doc.add_page_break()
    
    # ==================== TABLE OF CONTENTS ====================
    add_heading(doc, 'Table of Contents', level=1)
    toc_items = [
        '1. Executive Summary',
        '2. Project Overview & Purpose',
        '3. Why This Website is Essential',
        '4. Technology Stack & Architecture',
        '5. Code Languages & Technologies Used',
        '6. Feature Overview',
        '7. System Architecture & Database Design',
        '8. API Endpoints',
        '9. Frontend Components',
        '10. Security Implementation',
        '11. Real-time Features',
        '12. File Structure & Organization',
        '13. Installation & Setup Instructions',
        '14. Key Libraries & Dependencies',
        '15. Future Enhancements & Scalability'
    ]
    for item in toc_items:
        doc.add_paragraph(item, style='List Bullet')
    
    doc.add_page_break()
    
    # ==================== EXECUTIVE SUMMARY ====================
    add_heading(doc, 'Executive Summary', level=1)
    
    doc.add_paragraph(
        'DaanSetu is a comprehensive, web-based charitable donation platform designed to bridge the gap '
        'between individual and corporate donors and verified Non-Governmental Organizations (NGOs) that serve '
        'communities in need. The platform leverages modern web technologies, real-time communication, and '
        'geospatial matching to streamline the donation process and maximize the impact of charitable contributions.'
    )
    
    doc.add_paragraph(
        'Built with Node.js and Express.js on the backend, Firebase Firestore for data persistence, and vanilla '
        'JavaScript for the frontend, DaanSetu provides four distinct user interfaces: one for donors, one for NGOs, '
        'one for volunteers, and one for platform administrators. The system utilizes real-time Socket.IO communication '
        'to provide instant updates and notifications to all stakeholders.'
    )
    
    doc.add_page_break()
    
    # ==================== PROJECT OVERVIEW ====================
    add_heading(doc, 'Project Overview & Purpose', level=1)
    
    add_heading(doc, 'What is DaanSetu?', level=2)
    doc.add_paragraph(
        'DaanSetu serves as a digital bridge connecting individuals or businesses willing to donate essential items '
        '(food, clothes, supplies, medical equipment, etc.) with verified NGOs in urgent need of them. The platform '
        'automates the matching process using geospatial technology, ensuring donations reach the right organizations '
        'at the right time.'
    )
    
    add_heading(doc, 'Core Objectives', level=2)
    objectives = [
        ('Simplify Donation Process', 'Make it easy for donors to list donations and track their impact'),
        ('Verify NGOs', 'Implement rigorous verification systems to ensure only legitimate organizations can receive donations'),
        ('Enable Real-Time Matching', 'Use location-based algorithms to match donors with nearby NGOs'),
        ('Facilitate Volunteering', 'Connect volunteers with tasks created by NGOs for logistics and distribution'),
        ('Provide Analytics', 'Give all stakeholders visibility into their impact through detailed statistics'),
        ('Ensure Transparency', 'Maintain complete audit trails and real-time updates for all transactions')
    ]
    
    for title, desc in objectives:
        p = doc.add_paragraph(f'{title}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(desc)
    
    doc.add_page_break()
    
    # ==================== WHY ESSENTIAL ====================
    add_heading(doc, 'Why This Website is Essential', level=1)
    
    add_heading(doc, '1. Addressing Donation Inefficiencies', level=2)
    doc.add_paragraph(
        'Traditional donation channels often suffer from inefficiencies:'
    )
    inefficiencies = [
        'Donors don\'t know which NGOs need specific items',
        'NGOs struggle to find relevant donors for their needs',
        'No tracking mechanism for donation status',
        'Lack of transparency about donation impact',
        'Manual processes are time-consuming and error-prone'
    ]
    for item in inefficiencies:
        doc.add_paragraph(item, style='List Bullet')
    
    doc.add_paragraph(
        'DaanSetu eliminates these inefficiencies through automated matching, real-time notifications, '
        'and comprehensive tracking.'
    )
    
    add_heading(doc, '2. Maximizing Social Impact', level=2)
    doc.add_paragraph(
        'By connecting donors with the right NGOs instantly, DaanSetu ensures that donations reach '
        'those in need quickly. This reduces waste, improves utilization rates, and ultimately increases '
        'the social impact of every donation made on the platform.'
    )
    
    add_heading(doc, '3. Building Trust & Transparency', level=2)
    doc.add_paragraph(
        'The platform\'s NGO verification system ensures that only legitimate organizations can accept donations. '
        'Donors can see detailed information about organizations, track the status of their donations, and view '
        'the impact they\'ve made through analytics dashboards.'
    )
    
    add_heading(doc, '4. Enabling Community Participation', level=2)
    doc.add_paragraph(
        'The integrated volunteer system encourages community members to participate in the donation and '
        'distribution process. This creates a sense of ownership and builds stronger community bonds.'
    )
    
    add_heading(doc, '5. Supporting NGOs with Technology', level=2)
    doc.add_paragraph(
        'Many NGOs lack access to modern technology tools. DaanSetu provides them with a sophisticated, '
        'user-friendly platform to discover donation opportunities, manage requests, and coordinate with volunteers—'
        'all free or at minimal cost.'
    )
    
    doc.add_page_break()
    
    # ==================== TECHNOLOGY STACK ====================
    add_heading(doc, 'Technology Stack & Architecture', level=1)
    
    # Create technology stack table
    table = doc.add_table(rows=8, cols=3)
    table.style = 'Light Grid Accent 1'
    
    header_cells = table.rows[0].cells
    header_cells[0].text = 'Layer'
    header_cells[1].text = 'Technology'
    header_cells[2].text = 'Purpose'
    
    # Shade header row
    for cell in header_cells:
        shade_cell(cell, 'E8F0F8')
    
    tech_data = [
        ('Backend', 'Node.js + Express.js', 'RESTful API server and business logic'),
        ('Database', 'Firebase Firestore', 'Real-time NoSQL database with cloud storage'),
        ('Authentication', 'Firebase Auth + JWT', 'User authentication and session management'),
        ('Real-Time Communication', 'Socket.IO', 'Server-client bidirectional communication'),
        ('File Storage', 'Firebase Storage', 'Cloud storage for NGO documents and images'),
        ('Frontend', 'HTML5, CSS3, Vanilla JavaScript', 'Responsive user interfaces'),
        ('Geospatial', 'geolib library', 'Distance calculation and location-based queries')
    ]
    
    for idx, (layer, tech, purpose) in enumerate(tech_data, 1):
        row_cells = table.rows[idx].cells
        row_cells[0].text = layer
        row_cells[1].text = tech
        row_cells[2].text = purpose
    
    doc.add_page_break()
    
    # ==================== CODE LANGUAGES & TECHNOLOGIES ====================
    add_heading(doc, 'Code Languages & Technologies Used', level=1)
    
    add_heading(doc, 'Primary Languages', level=2)
    
    languages_table = doc.add_table(rows=4, cols=3)
    languages_table.style = 'Light Grid Accent 1'
    
    header = languages_table.rows[0].cells
    header[0].text = 'Language'
    header[1].text = 'Version'
    header[2].text = 'Usage'
    shade_cell(header[0], 'E8F0F8')
    shade_cell(header[1], 'E8F0F8')
    shade_cell(header[2], 'E8F0F8')
    
    lang_data = [
        ('JavaScript (ES6+)', 'Latest', 'Backend (Node.js) and Frontend logic'),
        ('HTML5', 'Latest', 'Semantic markup for 8 different user interface pages'),
        ('CSS3', 'Latest', 'Responsive styling with flexbox and grid layouts')
    ]
    
    for idx, (lang, version, usage) in enumerate(lang_data, 1):
        row = languages_table.rows[idx].cells
        row[0].text = lang
        row[1].text = version
        row[2].text = usage
    
    add_heading(doc, 'Core Framework & Libraries', level=2)
    
    libraries = {
        'Backend Frameworks': [
            '• Express.js (v4.18.2) - Web application framework',
            '• Socket.IO (v4.7.4) - Real-time bidirectional communication',
            '• Firebase Admin SDK (v12.0.0) - Firebase backend integration',
            '• Firebase SDK (v10.7.1) - Client-side Firebase integration'
        ],
        'Authentication & Security': [
            '• jsonwebtoken (v9.0.2) - JWT token management',
            '• bcryptjs (v2.4.3) - Password hashing and encryption',
            '• dotenv (v16.3.1) - Environment variable management'
        ],
        'Utilities & APIs': [
            '• axios (v1.12.2) - HTTP client for API calls',
            '• cors (v2.8.5) - Cross-Origin Resource Sharing middleware',
            '• geolib (v3.3.4) - Geospatial calculations and distance queries',
            '• nodemailer (v6.9.7) - Email sending service',
            '• googleapis (v167.0.0) - Google APIs and OAuth2 integration'
        ],
        'Development Tools': [
            '• nodemon (v3.0.2) - Auto-reload server during development'
        ]
    }
    
    for category, items in libraries.items():
        p = doc.add_paragraph(category)
        p.runs[0].bold = True
        p.runs[0].font.size = Pt(12)
        for item in items:
            doc.add_paragraph(item, style='List Bullet')
    
    doc.add_page_break()
    
    # ==================== FEATURE OVERVIEW ====================
    add_heading(doc, 'Feature Overview', level=1)
    
    add_heading(doc, 'Donor Features', level=2)
    donor_features = [
        ('Simple Registration', 'Quick sign-up with email and phone verification'),
        ('Donation Listing', 'Easy-to-use form to specify donation details and location'),
        ('Real-time Matching', 'Automatic matching with nearby verified NGOs (15km radius)'),
        ('Donation History', 'Complete tracking of past donations and their current status'),
        ('Impact Analytics', 'Visualize statistics on donations made and NGOs helped'),
        ('Geolocation Support', 'Integrated maps for selecting pickup locations'),
        ('Status Notifications', 'Real-time updates when NGOs accept or complete donations')
    ]
    
    for feature, desc in donor_features:
        p = doc.add_paragraph(f'{feature}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(desc)
    
    add_heading(doc, 'NGO Features', level=2)
    ngo_features = [
        ('Detailed Registration', 'Comprehensive registration with document uploads for verification'),
        ('Admin Verification', 'Admin-reviewed verification process before platform access'),
        ('Live Dashboard', 'Real-time view of available donations in their service area'),
        ('Donation Management', 'Accept, track, and mark donations as completed'),
        ('Volunteer Task Creation', 'Post tasks for volunteers to help with logistics and pickup'),
        ('Statistics Dashboard', 'View impact through donations received and volunteers engaged'),
        ('Real-time Notifications', 'Instant alerts when new matching donations appear nearby')
    ]
    
    for feature, desc in ngo_features:
        p = doc.add_paragraph(f'{feature}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(desc)
    
    add_heading(doc, 'Volunteer Features', level=2)
    volunteer_features = [
        ('Task Discovery', 'Browse available volunteer tasks posted by NGOs'),
        ('Task Management', 'Accept tasks and track their progress'),
        ('Status Updates', 'Mark tasks as completed when work is done'),
        ('Impact Tracking', 'View statistics on tasks completed and NGOs helped'),
        ('Skill Matching', 'Filter tasks by required skills and availability'),
        ('Real-time Updates', 'Get notified of new tasks in real-time')
    ]
    
    for feature, desc in volunteer_features:
        p = doc.add_paragraph(f'{feature}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(desc)
    
    add_heading(doc, 'Admin Features', level=2)
    admin_features = [
        ('NGO Verification', 'Review applications and approve or reject NGO registrations'),
        ('Document Review', 'Examine uploaded documents for legitimacy verification'),
        ('Platform Analytics', 'Monitor platform statistics including users, donations, and activity'),
        ('Donation Oversight', 'View all donations regardless of status and location'),
        ('User Management', 'Manage users across all roles (donors, NGOs, volunteers)'),
        ('Activity Logs', 'Complete audit trail of all platform activities'),
        ('Reporting Tools', 'Generate reports on platform performance and impact')
    ]
    
    for feature, desc in admin_features:
        p = doc.add_paragraph(f'{feature}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(desc)
    
    doc.add_page_break()
    
    # ==================== SYSTEM ARCHITECTURE ====================
    add_heading(doc, 'System Architecture & Database Design', level=1)
    
    add_heading(doc, 'Architecture Overview', level=2)
    doc.add_paragraph(
        'DaanSetu follows a client-server architecture with the following components:'
    )
    
    architecture = [
        ('Frontend', 'Responsive HTML/CSS/JavaScript interfaces for different user types'),
        ('API Layer', 'Express.js RESTful API handling all business logic'),
        ('Real-time Layer', 'Socket.IO for instant notifications and updates'),
        ('Database Layer', 'Firebase Firestore for persistent data storage'),
        ('Storage Layer', 'Firebase Storage for documents and images'),
        ('Authentication', 'Firebase Auth with JWT tokens for session management'),
        ('External Services', 'Google Maps, Nodemailer for email, geolib for calculations')
    ]
    
    for component, desc in architecture:
        p = doc.add_paragraph(f'{component}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(desc)
    
    add_heading(doc, 'Firestore Database Collections', level=2)
    
    collections_info = {
        'users': 'Stores all user information (donors, NGOs, volunteers, admins)\nFields: email, name, phone, address, userType, status, coordinates, createdAt',
        'donations': 'Tracks all donations on the platform\nFields: donorId, donorName, itemType, quantity, description, pickupAddress, coordinates, status, matchedNgoId, createdAt, completedAt',
        'pending_ngos': 'Stores NGO applications awaiting verification\nFields: email, name, phone, address, registrationId, coordinates, verificationDocuments, status, createdAt',
        'volunteers': 'Volunteer profiles and information\nFields: email, name, phone, address, skills, availability, userType, status, createdAt',
        'volunteer_tasks': 'Tasks posted by NGOs for volunteers\nFields: ngoId, ngoName, taskDescription, location, coordinates, status, assignedTo, createdAt, completedAt',
        'ngo_statistics': 'Aggregated statistics for NGOs\nFields: ngoId, donationsReceived, volunteerTasksCompleted, lastUpdated'
    }
    
    for collection, description in collections_info.items():
        p = doc.add_paragraph(f'{collection}:', style='List Bullet')
        p.runs[0].bold = True
        doc.add_paragraph(description, style='List Bullet 2')
    
    doc.add_page_break()
    
    # ==================== API ENDPOINTS ====================
    add_heading(doc, 'API Endpoints', level=1)
    
    add_heading(doc, 'Authentication Routes (/api/auth)', level=2)
    auth_endpoints = [
        ('POST /register', 'User registration for donors, NGOs, and volunteers'),
        ('POST /login', 'User login with email and password'),
        ('POST /forgot-password', 'Initiate password reset process with OTP'),
        ('POST /reset-password', 'Reset password using OTP'),
        ('GET /profile', 'Get authenticated user\'s profile information'),
        ('POST /verify-otp', 'Verify OTP for password reset')
    ]
    
    for endpoint, description in auth_endpoints:
        p = doc.add_paragraph(f'{endpoint}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(description)
    
    add_heading(doc, 'Donation Routes (/api/donations)', level=2)
    donation_endpoints = [
        ('POST /list', 'Create a new donation listing'),
        ('GET /list/:donationId', 'Get details of a specific donation'),
        ('GET /available', 'Get all available donations'),
        ('PUT /:donationId/accept', 'NGO accepts a donation'),
        ('PUT /:donationId/complete', 'Mark donation as completed'),
        ('GET /history', 'Get donation history for logged-in user'),
        ('DELETE /:donationId', 'Cancel a pending donation')
    ]
    
    for endpoint, description in donation_endpoints:
        p = doc.add_paragraph(f'{endpoint}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(description)
    
    add_heading(doc, 'NGO Routes (/api/ngos)', level=2)
    ngo_endpoints = [
        ('POST /register', 'Register a new NGO'),
        ('GET /dashboard', 'Get NGO dashboard data'),
        ('GET /:ngoId', 'Get NGO details'),
        ('PUT /:ngoId', 'Update NGO information'),
        ('GET /:ngoId/donations', 'Get donations matched to NGO'),
        ('GET /:ngoId/statistics', 'Get NGO impact statistics')
    ]
    
    for endpoint, description in ngo_endpoints:
        p = doc.add_paragraph(f'{endpoint}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(description)
    
    add_heading(doc, 'Volunteer Routes (/api/volunteers)', level=2)
    volunteer_endpoints = [
        ('POST /register', 'Register as a volunteer'),
        ('GET /tasks', 'Get available volunteer tasks'),
        ('POST /tasks/:taskId/accept', 'Accept a volunteer task'),
        ('PUT /tasks/:taskId/complete', 'Mark task as completed'),
        ('GET /my-tasks', 'Get tasks assigned to volunteer'),
        ('GET /statistics', 'Get volunteer impact statistics')
    ]
    
    for endpoint, description in volunteer_endpoints:
        p = doc.add_paragraph(f'{endpoint}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(description)
    
    add_heading(doc, 'Admin Routes (/api/admin)', level=2)
    admin_endpoints = [
        ('GET /pending-ngos', 'Get all NGOs awaiting verification'),
        ('GET /pending-ngos/:ngoId', 'Get details of a pending NGO'),
        ('POST /verify-ngo/:ngoId', 'Approve NGO verification'),
        ('POST /reject-ngo/:ngoId', 'Reject NGO application'),
        ('GET /statistics', 'Get platform-wide statistics'),
        ('GET /donations', 'Get all donations on platform'),
        ('GET /users', 'Get all users'),
        ('GET /volunteer-tasks', 'Get all volunteer tasks'),
        ('DELETE /users/:userId', 'Remove a user from platform')
    ]
    
    for endpoint, description in admin_endpoints:
        p = doc.add_paragraph(f'{endpoint}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(description)
    
    doc.add_page_break()
    
    # ==================== FRONTEND COMPONENTS ====================
    add_heading(doc, 'Frontend Components', level=1)
    
    add_heading(doc, 'HTML Pages', level=2)
    
    pages = {
        'index.html': 'Landing page with hero section, features, and authentication modals',
        'donor-dashboard.html': 'Main dashboard for donors showing donation history and statistics',
        'ngo-dashboard.html': 'NGO dashboard displaying available donations and accepted donations',
        'volunteer-dashboard.html': 'Volunteer interface for browsing and accepting tasks',
        'admin-dashboard.html': 'Admin control panel for NGO verification and platform oversight',
        'donation-details.html': 'Detailed view of a specific donation with full information',
        'admin-detail-view.html': 'Admin view for detailed analysis of donations and users',
        'ngo-detail-view.html': 'Detailed NGO information page with statistics',
        'volunteer-detail-view.html': 'Detailed volunteer task view with assignment options',
        'reset-password.html': 'Password reset form for authenticated users'
    }
    
    for page, description in pages.items():
        p = doc.add_paragraph(f'{page}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(description)
    
    add_heading(doc, 'JavaScript Files', level=2)
    
    js_files = {
        'app.js': 'Main application logic, authentication, modal management, and UI updates',
        'donor-dashboard.js': 'Donor-specific functionality for listing and tracking donations',
        'ngo-dashboard.js': 'NGO dashboard logic for viewing and accepting donations',
        'volunteer-dashboard.js': 'Volunteer task management and discovery logic',
        'admin-dashboard.js': 'Admin functions for NGO verification and platform management',
        'donation-details.js': 'Detailed donation view and status update logic',
        'google-maps-config.js': 'Google Maps API integration and map initialization',
        'load-maps.js': 'Dynamic loading of mapping functionality'
    }
    
    for file, description in js_files.items():
        p = doc.add_paragraph(f'{file}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(description)
    
    add_heading(doc, 'CSS Styling', level=2)
    
    css_files = {
        'styles.css': 'Main stylesheet with responsive design, animations, and color schemes',
        'dashboard-styles.css': 'Specialized styling for all dashboard pages',
        'donor-dashboard-styles.css': 'Donor dashboard-specific CSS enhancements'
    }
    
    for file, description in css_files.items():
        p = doc.add_paragraph(f'{file}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(description)
    
    doc.add_page_break()
    
    # ==================== SECURITY ====================
    add_heading(doc, 'Security Implementation', level=1)
    
    add_heading(doc, 'Authentication Security', level=2)
    doc.add_paragraph(
        'DaanSetu implements multiple layers of authentication security:'
    )
    
    auth_security = [
        'Password Hashing: bcryptjs with salt rounds for secure password storage',
        'JWT Tokens: JSON Web Tokens for session management with configurable expiration',
        'Email Verification: OTP-based verification for password reset and security',
        'Rate Limiting: Prevents brute-force attacks on authentication endpoints',
        'Token Validation: Every protected endpoint validates JWT before processing'
    ]
    
    for security in auth_security:
        doc.add_paragraph(security, style='List Bullet')
    
    add_heading(doc, 'Authorization & Access Control', level=2)
    doc.add_paragraph(
        'The platform enforces role-based access control:'
    )
    
    access_control = [
        'Donors can only view and manage their own donations',
        'NGOs can only manage donations matched to them',
        'Volunteers can only accept and complete assigned tasks',
        'Admins have full platform access but with separate authentication layer',
        'Protected routes require valid JWT tokens with correct user type'
    ]
    
    for control in access_control:
        doc.add_paragraph(control, style='List Bullet')
    
    add_heading(doc, 'Data Protection', level=2)
    doc.add_paragraph(
        'Data is protected through:'
    )
    
    data_protection = [
        'Firebase Security Rules: Database-level access control',
        'HTTPS/TLS: All communication encrypted in transit',
        'Document Storage: Files stored securely in Firebase Storage',
        'No Sensitive Data Logging: Password and token data not logged',
        'Environment Variables: Sensitive config kept in .env files, not in code'
    ]
    
    for protection in data_protection:
        doc.add_paragraph(protection, style='List Bullet')
    
    doc.add_page_break()
    
    # ==================== REAL-TIME FEATURES ====================
    add_heading(doc, 'Real-Time Features', level=1)
    
    doc.add_paragraph(
        'DaanSetu uses Socket.IO for real-time bidirectional communication between server and clients.'
    )
    
    add_heading(doc, 'Real-Time Events', level=2)
    
    events = {
        'join-ngo-room': 'NGO joins a real-time room to receive donation notifications',
        'join-donor-room': 'Donor joins a room to get updates on their donations',
        'join-volunteer-room': 'Volunteer joins a room for task notifications',
        'donation-matched': 'Emitted when donors and NGOs are matched',
        'donation-accepted': 'Emitted when an NGO accepts a donation',
        'donation-completed': 'Emitted when a donation delivery is completed',
        'task-assigned': 'Emitted when a volunteer is assigned a task',
        'task-completed': 'Emitted when a volunteer completes a task',
        'ngo-verified': 'Emitted when admin verifies an NGO',
        'notification': 'General notification event for important updates'
    }
    
    for event, description in events.items():
        p = doc.add_paragraph(f'{event}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(description)
    
    doc.add_page_break()
    
    # ==================== FILE STRUCTURE ====================
    add_heading(doc, 'File Structure & Organization', level=1)
    
    doc.add_paragraph('The project is organized as follows:')
    
    file_structure = """
CODE/
├── config/
│   └── firebase.js                  # Firebase initialization and configuration
├── routes/
│   ├── auth.js                      # Authentication and registration routes
│   ├── donations.js                 # Donation management routes
│   ├── ngos.js                      # NGO management routes
│   ├── volunteers.js                # Volunteer routes
│   └── admin.js                     # Admin dashboard routes
├── utils/
│   ├── email.js                     # Email sending with Nodemailer
│   ├── password.js                  # Password utility functions
│   └── rateLimit.js                 # Rate limiting utilities
├── public/
│   ├── index.html                   # Landing page
│   ├── donor-dashboard.html         # Donor dashboard
│   ├── ngo-dashboard.html           # NGO dashboard
│   ├── volunteer-dashboard.html     # Volunteer dashboard
│   ├── admin-dashboard.html         # Admin dashboard
│   ├── donation-details.html        # Donation details page
│   ├── *.html (detail views)        # Additional detail view pages
│   ├── app.js                       # Main application logic
│   ├── *-dashboard.js               # Dashboard-specific JavaScript
│   ├── styles.css                   # Main stylesheet
│   ├── dashboard-styles.css         # Dashboard styling
│   └── google-maps-config.js        # Maps configuration
├── scripts/
│   ├── create_pending_ngo.js        # Utility to create pending NGO records
│   └── get_activities.js            # Activity log retrieval script
├── server.js                        # Express server entry point
├── package.json                     # Project dependencies
└── .env                             # Environment variables (not in repo)
    """
    
    doc.add_paragraph(file_structure, style='List Bullet')
    
    doc.add_page_break()
    
    # ==================== INSTALLATION ====================
    add_heading(doc, 'Installation & Setup Instructions', level=1)
    
    add_heading(doc, 'Prerequisites', level=2)
    requirements = [
        'Node.js (v14 or higher)',
        'npm or yarn package manager',
        'Firebase project with Firestore, Auth, and Storage enabled',
        'Google Cloud project for Maps API (optional but recommended)',
        'Gmail account with App Password for email functionality'
    ]
    
    for req in requirements:
        doc.add_paragraph(req, style='List Bullet')
    
    add_heading(doc, 'Installation Steps', level=2)
    steps = [
        ('Clone Repository', 'git clone <repository-url>\ncd daansetu'),
        ('Install Dependencies', 'npm install'),
        ('Configure Firebase', 'Create Firebase project and enable Firestore, Auth, Storage'),
        ('Create .env File', 'Copy .env.example to .env and fill in your credentials'),
        ('Start Development Server', 'npm run dev (with nodemon) or npm start'),
        ('Access Application', 'Open http://localhost:3000 in your browser')
    ]
    
    for step_name, instruction in steps:
        p = doc.add_paragraph(f'{step_name}:', style='List Bullet')
        p.runs[0].bold = True
        doc.add_paragraph(instruction, style='List Bullet 2')
    
    add_heading(doc, 'Environment Variables (.env)', level=2)
    
    env_vars = """
# Firebase Configuration
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin SDK
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=your-cert-url

# Application Configuration
PORT=3000
JWT_SECRET=your-jwt-secret-key
NODE_ENV=development

# Email Configuration (Gmail with App Password)
EMAIL_USERNAME=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Google OAuth (for email service)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token

# Google Maps
GOOGLE_MAPS_API_KEY=your-maps-api-key
    """
    
    doc.add_paragraph(env_vars, style='List Bullet')
    
    doc.add_page_break()
    
    # ==================== LIBRARIES & DEPENDENCIES ====================
    add_heading(doc, 'Key Libraries & Dependencies', level=1)
    
    deps = {
        'axios': 'Promise-based HTTP client for making API requests from frontend',
        'bcryptjs': 'Bcrypt hashing library for secure password storage',
        'cors': 'Middleware to handle Cross-Origin Resource Sharing',
        'dotenv': 'Loads environment variables from .env file',
        'express': 'Web application framework for Node.js',
        'firebase': 'Firebase JavaScript SDK for client-side operations',
        'firebase-admin': 'Firebase Admin SDK for server-side operations',
        'geolib': 'Geospatial library for calculating distances and locations',
        'googleapis': 'Node.js library for Google APIs (Gmail, OAuth)',
        'jsonwebtoken': 'Create and verify JSON Web Tokens for authentication',
        'nodemailer': 'Email sending library with SMTP support',
        'socket.io': 'Real-time, bidirectional communication library',
        'nodemon': 'Automatically restart server during development (dev dependency)'
    }
    
    for lib, purpose in deps.items():
        p = doc.add_paragraph(f'{lib}: ', style='List Bullet')
        p.runs[0].bold = True
        p.add_run(purpose)
    
    doc.add_page_break()
    
    # ==================== FUTURE ENHANCEMENTS ====================
    add_heading(doc, 'Future Enhancements & Scalability', level=1)
    
    add_heading(doc, 'Planned Features', level=2)
    
    planned = [
        'Mobile Application: Native iOS and Android apps for better accessibility',
        'Advanced Analytics: Machine learning for predicting donation needs',
        'Payment Integration: Support for monetary donations alongside item donations',
        'Video Verification: LiveStream verification of donations during pickup',
        'Multi-language Support: Localization for different regions and languages',
        'Impact Reports: Automated visual reports of donation impact',
        'Donation Wishlist: NGOs can create wishlists that donors can contribute to'
    ]
    
    for feature in planned:
        doc.add_paragraph(feature, style='List Bullet')
    
    add_heading(doc, 'Scalability Considerations', level=2)
    
    scalability = [
        'Cloud Infrastructure: Deploy on cloud platforms (AWS, Google Cloud, Azure) for auto-scaling',
        'Database Optimization: Implement caching layer (Redis) for frequently accessed data',
        'CDN Integration: Use content delivery networks for static assets and maps',
        'Microservices: Break down monolithic backend into microservices for independent scaling',
        'Load Balancing: Distribute traffic across multiple server instances',
        'Real-time Optimization: Upgrade Socket.IO clusters for millions of concurrent users',
        'Data Archival: Move old data to cheaper storage for cost optimization'
    ]
    
    for item in scalability:
        doc.add_paragraph(item, style='List Bullet')
    
    doc.add_page_break()
    
    # ==================== CONCLUSION ====================
    add_heading(doc, 'Conclusion', level=1)
    
    conclusion_text = """DaanSetu represents a modern solution to an age-old challenge: connecting those who want to help with those who need help. By leveraging contemporary web technologies—including real-time communication, cloud databases, and geospatial matching—the platform creates an efficient, transparent, and impactful donation ecosystem.

The combination of Node.js and Express.js on the backend, Firebase for scalable data storage, and vanilla JavaScript on the frontend provides a robust yet maintainable architecture. The integration of Socket.IO enables real-time updates that keep all stakeholders informed, while the NGO verification system ensures that donations reach legitimate organizations.

Most importantly, DaanSetu addresses fundamental inefficiencies in traditional donation channels, creating measurable impact by connecting donors, NGOs, and volunteers in ways that were previously difficult or impossible. As the platform grows, the scalability considerations outlined above will enable it to serve millions of users across multiple regions, making charitable giving more accessible and impactful than ever before."""
    
    doc.add_paragraph(conclusion_text)
    
    doc.add_paragraph()
    
    footer = doc.add_paragraph()
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer_run = footer.add_run(f'Generated on {datetime.now().strftime("%B %d, %Y")}')
    footer_run.font.italic = True
    footer_run.font.size = Pt(10)
    
    # Save document
    output_path = os.path.join(
        os.path.dirname(__file__),
        'DaanSetu_Project_Documentation.docx'
    )
    
    doc.save(output_path)
    print(f'✅ Documentation generated successfully!')
    print(f'📄 File saved at: {output_path}')
    return output_path

if __name__ == '__main__':
    try:
        output_file = create_documentation()
        print(f'\n📊 The comprehensive documentation has been created.')
        print(f'📁 Location: {output_file}')
        print(f'\n✨ You can now open this file in Microsoft Word or any compatible application.')
    except ImportError:
        print('❌ Error: python-docx is not installed.')
        print('📦 Install it using: pip install python-docx')
    except Exception as e:
        print(f'❌ Error generating documentation: {str(e)}')
