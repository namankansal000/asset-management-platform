const jwt = require('jsonwebtoken');
const JWT_SECRET = 'super_secret_campus_key_2026';

// 1. Verify Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied.' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// 2. Authenticate Token (The one your Faculty routes use)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied.' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token.' });
  }
};

// 3. Admin Check
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden.' });
  }
  next();
};

// MOVE THIS TO THE VERY BOTTOM
module.exports = { verifyToken, isAdmin, authenticateToken, JWT_SECRET };