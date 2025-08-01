const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Import routes
const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const ngoRoutes = require('./routes/ngos');
const adminRoutes = require('./routes/admin');
const volunteerRoutes = require('./routes/volunteers');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/volunteers', volunteerRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-ngo-room', (ngoId) => {
    socket.join(`ngo-${ngoId}`);
    console.log(`NGO ${ngoId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve other pages
app.get('/donor-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'donor-dashboard.html'));
});

app.get('/ngo-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ngo-dashboard.html'));
});

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/volunteer-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'volunteer-dashboard.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`DaanSetu server running on port ${PORT}`);
}); 