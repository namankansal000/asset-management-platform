const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// User Registration Route 
// routes/auth.js

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, adminKey } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });

    const userExists = users.find(u => u.email === email);
    if (userExists) return res.status(400).json({ error: 'User already exists.' });

    // 🔒 SECURITY GATEKEEPER
    let assignedRole = 'consumer';
    if (role === 'pending_admin') {
      // In production, use process.env.ADMIN_KEY
      if (adminKey !== 'IITR_COUNCIL_2026') {
        return res.status(403).json({ error: "Invalid Authorization Key." });
      }
      assignedRole = 'pending_admin';
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: 'u_' + Date.now(),
      name,
      email,
      password: hashedPassword,
      role: assignedRole
    };

    users.push(newUser);
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// User Login Route 
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) return res.status(400).json({ error: 'Invalid email or password.' });

  // Generate JWT secure session token containing role privileges [cite: 39, 40, 42]
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, role: user.role, name: user.name });
});

module.exports = router;