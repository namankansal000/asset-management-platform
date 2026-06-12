const express = require('express');
const router = express.Router();
const { bookings, assets } = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Admin Only: Compile metrics summary datasets
router.get('/summary', verifyToken, isAdmin, (req, res) => {
  // analytics.js
const activeAssets = assets.filter(a => !a.isArchived);
const totalAssetsCount = activeAssets.reduce((acc, curr) => acc + curr.totalQuantity, 0);
const availableAssetsCount = activeAssets.reduce((acc, curr) => acc + curr.availableQuantity, 0);
  
  const activeBookings = bookings.filter(b => b.status === 'Issued' || b.status === 'Approved').length;
  
  // Calculate overdue metrics
  const today = new Date();
  const overdueReturns = bookings.filter(b => b.status === 'Issued' && b.dueDate && new Date(b.dueDate) < today).length;

  // Simple tracking metrics array mapping frequency
  const frequencyMap = {};
  bookings.forEach(b => {
    frequencyMap[b.assetName] = (frequencyMap[b.assetName] || 0) + b.quantity;
  });

  res.json({
    summaryCards: {
      totalInventory: totalAssetsCount,
      availableInventory: availableAssetsCount,
      activeAllocations: activeBookings,
      overdueAlerts: overdueReturns
    },
    popularityChartData: frequencyMap
  });
});

module.exports = router;