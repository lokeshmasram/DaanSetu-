from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from datetime import datetime

# Create a new Document
doc = Document()

# Set up styles
style = doc.styles['Normal']
font = style.font
font.name = 'Calibri'
font.size = Pt(11)

# Title
title = doc.add_heading('Daan-Setu Project', 0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title_format = title.runs[0]
title_format.font.size = Pt(24)
title_format.font.bold = True
title_format.font.color.rgb = RGBColor(0, 102, 204)

# Subtitle
subtitle = doc.add_heading('Comprehensive Documentation', level=2)
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
subtitle_run = subtitle.runs[0]
subtitle_run.font.size = Pt(16)
subtitle_run.font.color.rgb = RGBColor(70, 70, 70)

# Date
date_para = doc.add_paragraph(f'Generated on: {datetime.now().strftime("%B %d, %Y")}')
date_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
date_run = date_para.runs[0]
date_run.font.italic = True
date_run.font.size = Pt(10)

doc.add_paragraph()

# ==================== EXECUTIVE SUMMARY ====================
doc.add_heading('1. Executive Summary', level=1)
doc.add_paragraph(
    'Daan-Setu is a comprehensive digital platform designed to facilitate charitable giving, '
    'voluntary service, and social impact tracking. The platform bridges donors, non-governmental '
    'organizations (NGOs), and volunteers to create a seamless ecosystem for charitable activities. '
    'It provides transparency, real-time tracking, and impact measurement for all stakeholders.'
)

# ==================== PROJECT OVERVIEW ====================
doc.add_heading('2. Project Overview', level=1)

doc.add_heading('2.1 Project Name and Purpose', level=2)
doc.add_paragraph(
    'Project Name: Daan-Setu (दान-सेतु)\n'
    'Literal Meaning: "Donation Bridge" in Hindi/Sanskrit\n'
    'Purpose: To create a transparent, user-friendly platform that connects donors with verified NGOs '
    'and enables volunteers to track and manage charitable contributions in real-time.'
)

doc.add_heading('2.2 Need for This Website', level=2)
needs = [
    'Transparency in Charity: Many donors lack trust in traditional charity channels. Daan-Setu provides '
    'complete transparency showing where donations go and their impact.',
    
    'NGO Verification: Ensures that only legitimate, registered NGOs can access the platform, preventing '
    'fraud and building donor confidence.',
    
    'Impact Tracking: Donors want to see the tangible results of their contributions. The platform tracks '
    'and displays real-time statistics and impact metrics.',
    
    'Volunteer Coordination: Enables NGOs to recruit, manage, and coordinate volunteers efficiently.',
    
    'Donation Management: Simplifies the donation process with multiple payment options and comprehensive '
    'donation history tracking.',
    
    'Digital Records: Maintains secure, immutable records of all transactions and activities for compliance '
    'and auditing purposes.',
    
    'Accessibility: Provides a 24/7 accessible platform for donors to contribute from anywhere at any time.',
]

for i, need in enumerate(needs, 1):
    doc.add_paragraph(need, style='List Bullet')

doc.add_heading('2.3 Why This Website is Essential', level=2)
doc.add_paragraph(
    'The website is essential in today\'s digital era because:\n'
)
reasons = [
    'Increases Donor Confidence: Transparency and tracking build trust in the charity ecosystem.',
    'Reduces Fraud: NGO verification and auditing systems prevent misuse of funds.',
    'Maximizes Impact: By connecting donors directly with vetted NGOs, it ensures funds reach intended beneficiaries.',
    'Enables Social Change: Creates a platform for mass participation in social welfare activities.',
    'Supports SDG Goals: Aligns with United Nations Sustainable Development Goals by promoting charitable giving.',
    'Digital Transformation: Modernizes the traditional charity sector with technology.',
]

for reason in reasons:
    doc.add_paragraph(reason, style='List Bullet')

# ==================== FEATURES ====================
doc.add_heading('3. Core Features', level=1)

doc.add_heading('3.1 Donor Dashboard', level=2)
donor_features = [
    'View all available NGOs and their detailed information',
    'Browse donation categories and ongoing campaigns',
    'Make donations with instant confirmation',
    'Track donation history and impact statistics',
    'View receipts and tax documents for donations',
    'Manage profile and preferences',
    'Receive impact updates from supported NGOs',
]
for feature in donor_features:
    doc.add_paragraph(feature, style='List Bullet')

doc.add_heading('3.2 NGO Dashboard', level=2)
ngo_features = [
    'Complete NGO profile management and verification tracking',
    'Real-time donation and volunteer statistics',
    'Campaign creation and management',
    'Volunteer management and task assignment',
    'Impact reporting and success story sharing',
    'Financial reporting and audit trails',
    'Admin review and approval workflows',
]
for feature in ngo_features:
    doc.add_paragraph(feature, style='List Bullet')

doc.add_heading('3.3 Volunteer Dashboard', level=2)
volunteer_features = [
    'Browse available volunteer opportunities',
    'Apply for volunteer positions and track applications',
    'View assigned tasks and activities',
    'Track volunteer hours and contributions',
    'View personal impact and badges/achievements',
    'Communicate with NGOs',
]
for feature in volunteer_features:
    doc.add_paragraph(feature, style='List Bullet')

doc.add_heading('3.4 Admin Dashboard', level=2)
admin_features = [
    'Monitor all platform activities in real-time',
    'Verify and approve NGO registrations',
    'View comprehensive statistics and analytics',
    'Manage user accounts and permissions',
    'Handle complaints and disputes',
    'Generate reports and audits',
    'Manage platform settings and configurations',
]
for feature in admin_features:
    doc.add_paragraph(feature, style='List Bullet')

doc.add_heading('3.5 Authentication & Security', level=2)
security_features = [
    'Email-based authentication with password reset functionality',
    'Role-based access control (Donor, NGO, Volunteer, Admin)',
    'Firebase Authentication for secure credential management',
    'Rate limiting to prevent abuse',
    'Secure password hashing and storage',
]
for feature in security_features:
    doc.add_paragraph(feature, style='List Bullet')

# ==================== TECHNOLOGY STACK ====================
doc.add_heading('4. Technology Stack', level=1)

doc.add_heading('4.1 Frontend Technologies', level=2)
frontend_table = doc.add_table(rows=1, cols=3)
frontend_table.style = 'Light Grid Accent 1'
hdr_cells = frontend_table.rows[0].cells
hdr_cells[0].text = 'Technology'
hdr_cells[1].text = 'Purpose'
hdr_cells[2].text = 'Used For'

frontend_data = [
    ['HTML5', 'Markup Language', 'Semantic structure of web pages'],
    ['CSS3', 'Styling', 'Responsive design and visual appeal'],
    ['JavaScript', 'Client-side Logic', 'Dynamic interactions and DOM manipulation'],
    ['Google Maps API', 'Location Services', 'Displaying NGO locations and donation maps'],
    ['Bootstrap/Custom CSS', 'UI Framework', 'Responsive grid layout and components'],
]

for row_data in frontend_data:
    row_cells = frontend_table.add_row().cells
    row_cells[0].text = row_data[0]
    row_cells[1].text = row_data[1]
    row_cells[2].text = row_data[2]

doc.add_heading('4.2 Backend Technologies', level=2)
backend_table = doc.add_table(rows=1, cols=3)
backend_table.style = 'Light Grid Accent 1'
hdr_cells = backend_table.rows[0].cells
hdr_cells[0].text = 'Technology'
hdr_cells[1].text = 'Purpose'
hdr_cells[2].text = 'Implementation'

backend_data = [
    ['Node.js', 'Runtime Environment', 'Server-side JavaScript execution'],
    ['Express.js', 'Web Framework', 'REST API development and routing'],
    ['Firebase Firestore', 'NoSQL Database', 'Real-time data storage and syncing'],
    ['Firebase Auth', 'Authentication', 'User authentication and authorization'],
    ['Firebase Realtime DB', 'Messaging', 'Real-time notifications and updates'],
    ['Nodemailer', 'Email Service', 'Sending transactional emails'],
]

for row_data in backend_data:
    row_cells = backend_table.add_row().cells
    row_cells[0].text = row_data[0]
    row_cells[1].text = row_data[1]
    row_cells[2].text = row_data[2]

doc.add_heading('4.3 Deployment & Infrastructure', level=2)
deployment_table = doc.add_table(rows=1, cols=2)
deployment_table.style = 'Light Grid Accent 1'
hdr_cells = deployment_table.rows[0].cells
hdr_cells[0].text = 'Component'
hdr_cells[1].text = 'Details'

deployment_data = [
    ['Web Server', 'Node.js Server (Port 3000)'],
    ['Database', 'Google Firebase Cloud Firestore'],
    ['Authentication', 'Firebase Authentication'],
    ['File Storage', 'Firebase Cloud Storage (if applicable)'],
    ['Hosting', 'Can be deployed on Heroku, AWS, or Google Cloud'],
]

for row_data in deployment_data:
    row_cells = deployment_table.add_row().cells
    row_cells[0].text = row_data[0]
    row_cells[1].text = row_data[1]

# ==================== SYSTEM ARCHITECTURE ====================
doc.add_heading('5. System Architecture', level=1)

doc.add_heading('5.1 Architecture Overview', level=2)
doc.add_paragraph(
    'Daan-Setu follows a three-tier architecture:\n'
)

tiers = [
    ('Presentation Layer (Frontend)', 'HTML, CSS, JavaScript files served to users\' browsers'),
    ('Application Layer (Backend)', 'Node.js/Express server handling business logic and API requests'),
    ('Data Layer (Database)', 'Firebase Firestore storing all application data'),
]

for tier_name, description in tiers:
    p = doc.add_paragraph()
    p.add_run(f'{tier_name}: ').bold = True
    p.add_run(description)

doc.add_heading('5.2 Data Flow', level=2)
dataflow_points = [
    'User submits form → Frontend validates data → Sends AJAX request to backend',
    'Backend receives request → Authenticates user → Validates business rules',
    'Backend processes request → Interacts with Firebase → Returns response',
    'Frontend receives response → Updates DOM → Provides user feedback',
]

for point in dataflow_points:
    doc.add_paragraph(point, style='List Bullet')

# ==================== FOLDER STRUCTURE ====================
doc.add_heading('6. Project Folder Structure', level=1)

structure_text = """
CODE/
├── config/
│   └── firebase.js                 # Firebase configuration and initialization
├── public/                          # Frontend static files
│   ├── HTML Files                   # index.html, admin-dashboard.html, etc.
│   ├── CSS Files                    # styles.css, dashboard-styles.css
│   ├── JavaScript Files             # app.js, admin-dashboard.js, etc.
│   ├── google-maps-config.js        # Google Maps API configuration
│   └── load-maps.js                 # Map loading utilities
├── routes/                          # Express route handlers
│   ├── admin.js                     # Admin-specific routes
│   ├── auth.js                      # Authentication routes (login, register, password reset)
│   ├── donations.js                 # Donation management routes
│   ├── ngos.js                      # NGO management routes
│   └── volunteers.js                # Volunteer management routes
├── utils/                           # Utility functions
│   ├── email.js                     # Email sending utilities
│   ├── password.js                  # Password hashing and reset logic
│   └── rateLimit.js                 # Rate limiting middleware
├── scripts/                         # Database scripts
│   ├── create_pending_ngo.js        # Script for creating test NGO records
│   └── get_activities.js            # Activity retrieval utilities
├── server.js                        # Main Express server entry point
└── package.json                     # Project dependencies and metadata
"""

code_block = doc.add_paragraph(structure_text)
code_block_format = code_block.paragraph_format
code_block_format.left_indent = Inches(0.5)
code_block.style = 'List Paragraph'

# ==================== KEY MODULES ====================
doc.add_heading('7. Key Modules and Their Functions', level=1)

doc.add_heading('7.1 Authentication (routes/auth.js)', level=2)
auth_functions = [
    'User Registration: Accepts user details, validates, creates Firebase account',
    'User Login: Authenticates credentials, creates session/token',
    'Password Reset: Sends reset email with secure token links',
    'Email Verification: Confirms user email addresses',
    'Logout: Clears user sessions',
]
for func in auth_functions:
    doc.add_paragraph(func, style='List Bullet')

doc.add_heading('7.2 Donations (routes/donations.js)', level=2)
donation_functions = [
    'Create Donation: Records new donation to database',
    'Get Donation History: Retrieves user\'s past donations',
    'Get Donation Details: Fetches specific donation information',
    'Cancel Donation: Marks donation as cancelled (if applicable)',
    'Calculate Statistics: Aggregates donation data for impact display',
]
for func in donation_functions:
    doc.add_paragraph(func, style='List Bullet')

doc.add_heading('7.3 NGOs (routes/ngos.js)', level=2)
ngo_functions = [
    'Create NGO Profile: Registers new NGO with verification details',
    'Get NGOs: Lists all approved NGOs',
    'Get NGO Details: Fetches specific NGO information',
    'Update NGO Stats: Updates real-time statistics',
    'Verify NGO: Admin endpoint to approve/reject NGO registrations',
    'Update NGO Status: Changes operational status of NGO',
]
for func in ngo_functions:
    doc.add_paragraph(func, style='List Bullet')

doc.add_heading('7.4 Volunteers (routes/volunteers.js)', level=2)
volunteer_functions = [
    'Create Volunteer Profile: Registers new volunteer',
    'Apply for Activity: Submits application for volunteer opportunity',
    'Get Activities: Lists available volunteer opportunities',
    'Update Activity Status: Changes activity status (pending, approved, completed)',
    'Track Hours: Records volunteer hours worked',
]
for func in volunteer_functions:
    doc.add_paragraph(func, style='List Bullet')

doc.add_heading('7.5 Admin Functions (routes/admin.js)', level=2)
admin_functions = [
    'Dashboard Statistics: Aggregates platform-wide metrics',
    'Manage Users: View, approve, reject, or suspend users',
    'Manage NGOs: Verify, approve, or reject NGO applications',
    'View Reports: Access comprehensive analytics and reports',
    'Handle Complaints: Manage user complaints and disputes',
    'Generate Audit Logs: Create trails of all administrative actions',
]
for func in admin_functions:
    doc.add_paragraph(func, style='List Bullet')

# ==================== DATABASE SCHEMA ====================
doc.add_heading('8. Database Schema (Firebase Firestore)', level=1)

doc.add_heading('8.1 Collections Overview', level=2)

collections_data = {
    'users': {
        'description': 'Stores user account information',
        'fields': ['uid (unique ID)', 'email', 'fullName', 'phone', 'userType (Donor/NGO/Volunteer/Admin)',
                   'createdAt', 'status', 'profilePicture']
    },
    'ngos': {
        'description': 'Stores NGO profile and verification data',
        'fields': ['ngoId', 'name', 'registrationNumber', 'category', 'description', 'location',
                   'contactEmail', 'phone', 'verificationStatus', 'createdAt', 'statistics']
    },
    'donations': {
        'description': 'Records all donation transactions',
        'fields': ['donationId', 'donorId', 'ngoId', 'amount', 'date', 'paymentMethod',
                   'status', 'notes', 'taxReceiptUrl']
    },
    'volunteers': {
        'description': 'Stores volunteer information and activity tracking',
        'fields': ['volunteerId', 'userId', 'ngoId', 'hoursWorked', 'activitiesCompleted',
                   'joinDate', 'status']
    },
    'activities': {
        'description': 'Lists volunteer activities and opportunities',
        'fields': ['activityId', 'ngoId', 'title', 'description', 'requiredVolunteers',
                   'startDate', 'endDate', 'status']
    },
    'statistics': {
        'description': 'Aggregated metrics and KPIs',
        'fields': ['totalDonations', 'totalDonors', 'totalNGOs', 'totalVolunteers',
                   'totalVolunteerHours', 'lastUpdated']
    },
}

for collection, details in collections_data.items():
    p = doc.add_paragraph()
    p.add_run(f'{collection}: ').bold = True
    p.add_run(f'{details["description"]}\n')
    p.add_run('Fields: ').italic = True
    p.add_run(', '.join(details['fields']))

# ==================== SECURITY FEATURES ====================
doc.add_heading('9. Security & Compliance Features', level=1)

doc.add_heading('9.1 Authentication & Authorization', level=2)
security_points = [
    'Firebase Authentication: Uses Google\'s secure authentication service',
    'Role-Based Access Control: Different dashboards for Donor, NGO, Volunteer, Admin',
    'Session Management: Secure session handling with tokens',
    'Password Security: Passwords hashed using bcrypt',
]
for point in security_points:
    doc.add_paragraph(point, style='List Bullet')

doc.add_heading('9.2 Data Protection', level=2)
data_protection = [
    'Firestore Rules: Firebase Security Rules for fine-grained access control',
    'HTTPS/TLS: Encrypted communication over HTTPS',
    'Data Validation: Input validation on both client and server',
    'Rate Limiting: Prevents brute force attacks and abuse',
]
for point in data_protection:
    doc.add_paragraph(point, style='List Bullet')

doc.add_heading('9.3 Audit & Compliance', level=2)
compliance = [
    'Audit Trails: All administrative actions logged and tracked',
    'NGO Verification: Verification checks before NGO can operate',
    'Transaction Records: Complete donation history for tax purposes',
    'Data Retention: Complies with data protection regulations',
]
for point in compliance:
    doc.add_paragraph(point, style='List Bullet')

# ==================== KEY WORKFLOWS ====================
doc.add_heading('10. Key Workflows', level=1)

doc.add_heading('10.1 Donor Donation Workflow', level=2)
workflow_steps = [
    '1. Donor logs into the dashboard',
    '2. Browses available NGOs and campaigns',
    '3. Selects an NGO and enters donation amount',
    '4. Completes payment process',
    '5. Receives donation confirmation and receipt',
    '6. Can track donation impact in real-time',
]
for step in workflow_steps:
    doc.add_paragraph(step, style='List Bullet')

doc.add_heading('10.2 NGO Verification Workflow', level=2)
ngo_workflow = [
    '1. NGO submits registration application',
    '2. System verifies registration number against database',
    '3. Admin reviews application details',
    '4. Admin approves or rejects application',
    '5. If approved, NGO can activate dashboard',
    '6. NGO can start receiving donations and managing volunteers',
]
for step in ngo_workflow:
    doc.add_paragraph(step, style='List Bullet')

doc.add_heading('10.3 Volunteer Application Workflow', level=2)
volunteer_workflow = [
    '1. Volunteer creates account and completes profile',
    '2. Browses volunteer opportunities on NGO dashboards',
    '3. Applies for volunteer activity',
    '4. NGO reviews and approves/rejects application',
    '5. Volunteer starts activity and logs hours',
    '6. Activity completion triggers impact tracking',
]
for step in volunteer_workflow:
    doc.add_paragraph(step, style='List Bullet')

# ==================== DEPENDENCIES ====================
doc.add_heading('11. Project Dependencies', level=1)

dep_table = doc.add_table(rows=1, cols=3)
dep_table.style = 'Light Grid Accent 1'
hdr_cells = dep_table.rows[0].cells
hdr_cells[0].text = 'Package'
hdr_cells[1].text = 'Version'
hdr_cells[2].text = 'Purpose'

dependencies = [
    ['express', 'Latest', 'Web framework for Node.js'],
    ['firebase-admin', 'Latest', 'Firebase backend SDK'],
    ['nodemailer', 'Latest', 'Email sending service'],
    ['bcryptjs', 'Latest', 'Password hashing'],
    ['validator', 'Latest', 'Data validation'],
    ['cors', 'Latest', 'Cross-origin resource sharing'],
    ['dotenv', 'Latest', 'Environment variable management'],
]

for row_data in dependencies:
    row_cells = dep_table.add_row().cells
    row_cells[0].text = row_data[0]
    row_cells[1].text = row_data[1]
    row_cells[2].text = row_data[2]

# ==================== HOW TO RUN ====================
doc.add_heading('12. Setup & Deployment Instructions', level=1)

doc.add_heading('12.1 Prerequisites', level=2)
prerequisites = [
    'Node.js v14 or higher',
    'npm (Node Package Manager)',
    'Firebase Project Account',
    'Google Maps API Key',
    'Email service credentials (Nodemailer)',
]
for item in prerequisites:
    doc.add_paragraph(item, style='List Bullet')

doc.add_heading('12.2 Installation Steps', level=2)
installation_code = """
1. Clone the repository to your local machine
2. Navigate to the project directory: cd CODE
3. Install dependencies: npm install
4. Configure Firebase:
   - Create firebase.js in the config folder with your credentials
   - Add GOOGLE_MAPS_API_KEY to environment variables
5. Set up environment variables in .env file:
   - FIREBASE_PROJECT_ID
   - FIREBASE_PRIVATE_KEY
   - FIREBASE_CLIENT_EMAIL
   - GOOGLE_MAPS_API_KEY
   - EMAIL_USER, EMAIL_PASSWORD (for Nodemailer)
6. Start the server: npm start
7. Access the application at http://localhost:3000
"""

code_para = doc.add_paragraph(installation_code)
code_para_format = code_para.paragraph_format
code_para_format.left_indent = Inches(0.5)

# ==================== FUTURE ENHANCEMENTS ====================
doc.add_heading('13. Future Enhancement Opportunities', level=1)

enhancements = [
    'Mobile Application: Develop iOS and Android apps for better accessibility',
    'Payment Gateway Integration: Add multiple payment options (Stripe, Razorpay)',
    'AI-Powered Recommendations: Suggest NGOs based on donor interests',
    'Blockchain Integration: For enhanced transparency and immutable records',
    'Analytics Dashboard: Advanced analytics with predictive modeling',
    'Gamification: Badges, leaderboards, and achievement system for donors',
    'Multi-language Support: Extend to multiple languages for wider reach',
    'Video Verification: Video-based NGO verification for enhanced trust',
    'Machine Learning: Fraud detection and anomaly detection systems',
]

for enhancement in enhancements:
    doc.add_paragraph(enhancement, style='List Bullet')

# ==================== CONCLUSION ====================
doc.add_heading('14. Conclusion', level=1)

conclusion_text = (
    'Daan-Setu represents a modern approach to charitable giving in the digital age. By combining '
    'transparent records, real-time tracking, and secure transactions, the platform builds trust '
    'between donors, NGOs, and volunteers. The use of contemporary web technologies ensures scalability, '
    'security, and reliability. As the platform evolves, it has the potential to become a leading '
    'platform for transparent charitable giving in the region, driving social impact and positive change.'
)

doc.add_paragraph(conclusion_text)

# ==================== APPENDIX ====================
doc.add_heading('15. Appendix: Technology Explanations', level=1)

doc.add_heading('15.1 Firebase', level=2)
doc.add_paragraph(
    'Firebase is a comprehensive backend-as-a-service (BaaS) platform by Google that provides: '
    'Real-time database (Firestore), User authentication, Cloud hosting, File storage, and Analytics. '
    'For Daan-Setu, Firebase handles data persistence, user authentication, and real-time updates.'
)

doc.add_heading('15.2 Node.js & Express', level=2)
doc.add_paragraph(
    'Node.js is a JavaScript runtime that allows running JavaScript on the server side. Express.js is '
    'a lightweight web framework for Node.js that simplifies building REST APIs and web applications. '
    'Together, they provide the backend infrastructure for Daan-Setu.'
)

doc.add_heading('15.3 RESTful API', level=2)
doc.add_paragraph(
    'REST (Representational State Transfer) is an architectural style for designing web services. '
    'RESTful APIs use standard HTTP methods (GET, POST, PUT, DELETE) to perform operations on resources. '
    'Daan-Setu uses RESTful APIs to communicate between the frontend and backend.'
)

doc.add_heading('15.4 Google Maps API', level=2)
doc.add_paragraph(
    'The Google Maps API allows embedding maps and location services in web applications. '
    'Daan-Setu uses it to display NGO locations and create geographic visualizations of charitable impact.'
)

doc.add_heading('15.5 Firestore vs Traditional Databases', level=2)
doc.add_paragraph(
    'Firestore is a NoSQL (Not Only SQL) database, different from traditional SQL databases like MySQL. '
    'It stores data in flexible, scalable document collections rather than rigid tables. This is more suitable '
    'for modern applications requiring real-time synchronization and flexible data structures.'
)

# ==================== DOCUMENT INFO ====================
doc.add_page_break()

# Footer-like section
doc.add_heading('Document Information', level=2)

info_table = doc.add_table(rows=1, cols=2)
info_table.style = 'Light Grid Accent 1'
hdr_cells = info_table.rows[0].cells
hdr_cells[0].text = 'Attribute'
hdr_cells[1].text = 'Details'

info_data = [
    ['Project Name', 'Daan-Setu (Donation Bridge)'],
    ['Document Type', 'Comprehensive Project Documentation'],
    ['Created Date', datetime.now().strftime('%B %d, %Y')],
    ['Version', '1.0'],
    ['Status', 'Complete'],
    ['Primary Language', 'JavaScript (Node.js, HTML, CSS)'],
    ['Backend', 'Node.js with Express.js'],
    ['Database', 'Google Firebase Firestore'],
    ['Frontend Framework', 'Vanilla JavaScript with HTML/CSS'],
]

for row_data in info_data:
    row_cells = info_table.add_row().cells
    row_cells[0].text = row_data[0]
    row_cells[1].text = row_data[1]

# Save the document
output_path = r'c:\Projests\Daan-Setu Project\Daan-Setu Project\CODE\Daan-Setu_Complete_Documentation.docx'
doc.save(output_path)
print(f"✓ Document successfully created at: {output_path}")
print(f"✓ Total pages: {len(doc.paragraphs) // 10 + 1} (approximate)")
print("✓ All sections included with comprehensive information")
