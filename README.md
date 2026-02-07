# DaanSetu - Connecting Kindness, One Donation at a Time

DaanSetu is a comprehensive NGO platform that connects donors with verified NGOs for bulk donations (food, clothes, supplies) and includes a volunteer sign-up system. The platform facilitates real-time matching, geospatial queries, and efficient donation management.

## 🌟 Features

### For Donors
- **Simple Registration**: Quick sign-up process for donors
- **Donation Listing**: Easy-to-use form to list donations with details
- **Real-time Matching**: Automatic matching with nearby verified NGOs
- **Donation History**: Track all past donations and their status
- **Impact Analytics**: View statistics on donations made and NGOs helped

### For NGOs
- **Detailed Registration**: Comprehensive registration with document uploads
- **Verification System**: Admin-reviewed verification process
- **Live Dashboard**: Real-time view of available donations in their area
- **Donation Management**: Accept, track, and complete donations
- **Volunteer Task Creation**: Post tasks for volunteers to help with logistics

### For Volunteers
- **Task Discovery**: Browse and accept available volunteer tasks
- **Task Management**: Track accepted tasks and mark them complete
- **Impact Tracking**: View statistics on tasks completed and NGOs helped
- **Real-time Updates**: Get notified of new tasks and updates

### For Admins
- **NGO Verification**: Review and approve/reject NGO applications
- **Platform Analytics**: Monitor platform statistics and activity
- **Donation Oversight**: View all donations and their status
- **User Management**: Manage all users and their roles

## 🚀 Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth, JWT
- **Real-time Communication**: Socket.IO
- **File Storage**: Firebase Storage
- **Geospatial Queries**: geolib library
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Styling**: Custom CSS with responsive design

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js (v14 or higher)
- npm or yarn
- Firebase project with Firestore, Auth, and Storage enabled
- Firebase service account credentials

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd daansetu
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project
   - Enable Firestore, Authentication, and Storage
   - Download your service account key
   - Create a `.env` file in the root directory

4. **Configure environment variables**
   Create a `.env` file with the following variables:
   ```env
   PORT=3000
   FIREBASE_API_KEY=your-api-key
   FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=123456789
   FIREBASE_APP_ID=your-app-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="your-private-key"
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_CLIENT_CERT_URL=your-cert-url
   JWT_SECRET=your-jwt-secret
   ```

### 6. **Set up Google Maps API (for impact map feature)**

   a. Get a Google Maps API key:
      - Go to [Google Cloud Console](https://console.cloud.google.com/)
      - Create a new project
      - Enable the "Maps JavaScript API"
      - Create an API key (restrict it to your domain for production)

   b. Set the API key in your browser (during development):
      - Open the browser console (F12)
      - Run: `setGoogleMapsKey('YOUR_API_KEY')`
      - Or manually set: `localStorage.setItem('G_MAPS_KEY', 'YOUR_API_KEY'); location.reload();`
      - The page will reload and maps will be available

   c. For production, add your API key to the backend configuration

7. **Start the development server**
   ```bash
   npm run dev
   ```

8. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
daansetu/
├── config/
│   └── firebase.js          # Firebase configuration
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── donations.js         # Donation management routes
│   ├── ngos.js              # NGO-specific routes
│   ├── admin.js             # Admin routes
│   └── volunteers.js        # Volunteer routes
├── public/
│   ├── index.html           # Landing page
│   ├── styles.css           # Main styles
│   ├── dashboard-styles.css # Dashboard styles
│   ├── app.js               # Main application logic
│   ├── ngo-dashboard.html   # NGO dashboard
│   ├── ngo-dashboard.js     # NGO dashboard logic
│   ├── donor-dashboard.html # Donor dashboard
│   ├── donor-dashboard.js   # Donor dashboard logic
│   ├── admin-dashboard.html # Admin dashboard
│   ├── admin-dashboard.js   # Admin dashboard logic
│   ├── volunteer-dashboard.html # Volunteer dashboard
│   └── volunteer-dashboard.js   # Volunteer dashboard logic
├── server.js                # Main server file
├── package.json             # Project dependencies
└── README.md               # Project documentation
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Donations
- `POST /api/donations/list` - Create new donation
- `GET /api/donations/available` - Get available donations for NGOs
- `POST /api/donations/:id/accept` - Accept donation
- `POST /api/donations/:id/complete` - Complete donation
- `GET /api/donations/history` - Get donation history

### NGOs
- `POST /api/ngos/register` - NGO registration with documents
- `GET /api/ngos/status` - Get NGO verification status
- `PUT /api/ngos/coordinates` - Update NGO coordinates

### Admin
- `GET /api/admin/pending-ngos` - Get pending NGO applications
- `POST /api/admin/verify-ngo/:id` - Approve/reject NGO
- `GET /api/admin/statistics` - Get platform statistics
- `GET /api/admin/donations` - Get all donations

### Volunteers
- `POST /api/volunteers/register` - Volunteer registration
- `GET /api/volunteers/tasks` - Get available tasks
- `POST /api/volunteers/tasks/:id/accept` - Accept task
- `POST /api/volunteers/tasks/:id/complete` - Complete task
- `GET /api/volunteers/history` - Get task history
- `POST /api/volunteers/create-task` - Create volunteer task (NGOs)

## 🔐 Authentication & Authorization

The application uses JWT tokens for authentication and role-based access control:

- **Donors**: Can create donations and view their history
- **NGOs**: Can view available donations, accept them, and create volunteer tasks
- **Volunteers**: Can view and accept volunteer tasks
- **Admins**: Can verify NGOs and view platform analytics

## 🌍 Geospatial Features

- **15km Radius Matching**: Donations are matched with NGOs within a 15km radius
- **Real-time Updates**: Socket.IO provides instant notifications
- **Location-based Services**: Uses geolib for distance calculations

## 📱 Real-time Features

- **Live Notifications**: Instant updates for new donations, acceptances, and completions
- **Socket.IO Integration**: Real-time communication between clients and server
- **Room-based Messaging**: NGOs receive notifications in their dedicated rooms

## 🎨 UI/UX Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Modern Interface**: Clean, intuitive design with smooth animations
- **Accessibility**: Keyboard navigation and screen reader support
- **Loading States**: Proper loading indicators and error handling
- **Toast Notifications**: User-friendly notification system

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Environment Variables for Production
Make sure to set all required environment variables in your production environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Firebase for providing the backend infrastructure
- Socket.IO for real-time communication
- Font Awesome for icons
- The open-source community for various libraries and tools

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**DaanSetu** - Making the world a better place, one donation at a time. 🌟 