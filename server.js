const express = require('express');
const cors = require('cors');
const path = require('path');

// 1. Database and Middleware Imports (Moved to the very top)
const { users, commitToDisk } = require('./db');
const { authenticateToken } = require('./middleware/auth');

// 2. Route Imports
const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const bookingRoutes = require('./routes/bookings');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = 2026; // Target competition year

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve Static Frontend Assets from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// API Route Assemblies
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/analytics', analyticsRoutes);


// ---------------------------------------------------------
// USER MANAGEMENT ROUTES (Faculty Only)
// ---------------------------------------------------------

// 1. Get all pending admins
app.get('/api/users/pending-admins', authenticateToken, (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: "Forbidden" });
  
  const pendingAdmins = users.filter(u => u.role === 'pending_admin');
  res.json(pendingAdmins);
});

// 2. Approve or Reject the request
app.patch('/api/users/:id/resolve-role', authenticateToken, (req, res) => {
  if (req.user.role !== 'faculty') return res.status(403).json({ error: "Forbidden" });
  
  const { action } = req.body;
  const userId = req.params.id;

  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (action === 'approve') {
    user.role = 'admin'; 
  } else {
    user.role = 'consumer';
  }
  
  // Trigger the manual save to JSON file
  commitToDisk(); 
  
  res.json({ success: true, newRole: user.role });
});


// ---------------------------------------------------------
// FALLBACK WILDCARD ROUTING (Must remain at the bottom)
// ---------------------------------------------------------
// Fallback wildcard routing to keep user session on refresh
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Launch Application Server Listener
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Server deployed running smoothly on Port: ${PORT}  `);
  console.log(`====================================================`);
});