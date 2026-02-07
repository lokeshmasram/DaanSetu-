const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require("./routes/auth");
const donationRoutes = require("./routes/donations");
const ngoRoutes = require("./routes/ngos");
const adminRoutes = require("./routes/admin");
const volunteerRoutes = require("./routes/volunteers");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/ngos", ngoRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/volunteers", volunteerRoutes);

// Serve static files after API routes
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // NGO room joining
  socket.on("join-ngo-room", (ngoId) => {
    socket.join(`ngo-${ngoId}`);
    console.log(`NGO ${ngoId} joined their room`);
  });

  // Donor room joining
  socket.on("join-donor-room", (donorId) => {
    socket.join(`donor-${donorId}`);
    console.log(`Donor ${donorId} joined their room`);
  });

  // Volunteer room joining
  socket.on("join-volunteer-room", (volunteerId) => {
    socket.join(`volunteer-${volunteerId}`);
    console.log(`Volunteer ${volunteerId} joined their room`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Make io available to routes
app.set("io", io);

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Serve other pages
app.get("/donor-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "donor-dashboard.html"));
});

app.get("/ngo-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "ngo-dashboard.html"));
});

app.get("/admin-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
});

app.get("/volunteer-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "volunteer-dashboard.html"));
});

app.get("/donation-details", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "donation-details.html"));
});

// Admin detail view routes
app.get("/admin/view-donations", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-detail-view.html"));
});

app.get("/admin/view-users", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-detail-view.html"));
});

app.get("/admin/view-donors", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-detail-view.html"));
});

app.get("/admin/view-volunteers", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-detail-view.html"));
});

app.get("/admin/view-ngos", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-detail-view.html"));
});

// Donor detail view routes
app.get("/donor/view-all", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "donor-detail-view.html"));
});

app.get("/donor/view-completed", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "donor-detail-view.html"));
});

app.get("/donor/view-pending", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "donor-detail-view.html"));
});

app.get("/donor/view-cancelled", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "donor-detail-view.html"));
});

app.get("/donor/view-ngos-helped", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "donor-detail-view.html"));
});

// NGO detail view routes
app.get("/ngo/view-accepted", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "ngo-detail-view.html"));
});

app.get("/ngo/view-completed", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "ngo-detail-view.html"));
});

app.get("/ngo/view-pending", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "ngo-detail-view.html"));
});

// Volunteer detail view routes
app.get("/volunteer/view-all", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "volunteer-detail-view.html"));
});

app.get("/volunteer/view-completed", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "volunteer-detail-view.html"));
});

app.get("/volunteer/view-active", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "volunteer-detail-view.html"));
});

app.get("/volunteer/view-ngos-helped", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "volunteer-detail-view.html"));
});

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3001;

// Try listening on a port, and if it's in use, try the next one up to a limit
function listenWithFallback(startPort, maxAttempts = 5) {
  let attempt = 0;

  function tryPort(port) {
    attempt += 1;
    server.listen(port)
      .on('listening', () => {
        console.log(`DaanSetu server running on port ${port}`);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`Port ${port} in use. Trying next port...`);
          if (attempt < maxAttempts) {
            tryPort(port + 1);
          } else {
            console.error(`All ports in range ${startPort}-${port} are in use. Exiting.`);
            console.error('Tip: set PORT environment variable to an available port or stop the process using the port.');
            process.exit(1);
          }
        } else {
          console.error('Server failed to start:', err);
          process.exit(1);
        }
      });
  }

  tryPort(startPort);
}

listenWithFallback(DEFAULT_PORT, 6);
