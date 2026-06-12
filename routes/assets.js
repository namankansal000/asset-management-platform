const express = require('express');
const router = express.Router();
const { assets, bookings, commitToDisk } = require('../db'); 
const { verifyToken, isAdmin } = require('../middleware/auth');

// 1. GET ALL ASSETS (Dynamically calculates current real-time stock pools)
router.get('/', verifyToken, (req, res) => {
  const { search, category } = req.query;
  const d = new Date();
  const todayStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

  // Map over assets to inject dynamic real-time availability for today
  let calculatedAssets = assets
    .filter(a => !a.isArchived || req.user.role === 'admin') // HIDE FROM CONSUMERS
    .map(asset => {
    const activeTodayBookings = bookings.filter(b => 
      b.assetId === asset.id && 
      (b.status === 'Approved' || b.status === 'Issued') &&
      todayStr >= b.startDate && todayStr <= b.endDate
    );
    
    const allocatedCount = activeTodayBookings.reduce((sum, b) => sum + parseInt(b.quantity, 10), 0);
    
    return {
      ...asset,
      availableQuantity: Math.max(0, asset.totalQuantity - allocatedCount)
    };
  });
  
  // Apply filters on top of calculated array
  if (category) {
    calculatedAssets = calculatedAssets.filter(a => a.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    calculatedAssets = calculatedAssets.filter(a => 
      a.name.toLowerCase().includes(search.toLowerCase()) || 
      a.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  res.json(calculatedAssets);
});

// 2. GET: REAL-TIME DATE-BASED AVAILABILITY MATRIX
router.get('/:id/availability', verifyToken, (req, res) => {
  const { id } = req.params;
  const asset = assets.find(a => a.id === id);
  if (!asset) return res.status(404).json({ error: "Asset not found in inventory ledger." });

  const { bookings } = require('../db');
  const assetBookings = bookings ? bookings.filter(b => b.assetId === id && b.status !== 'Rejected' && b.status !== 'Returned') : [];

  const availabilityProfile = {};
  const today = new Date();

  for (let i = 0; i < 60; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dateStr = targetDate.toISOString().split('T')[0];

    let approvedAllocated = 0;
    let pendingAllocated = 0;

    assetBookings.forEach(b => {
      if (b.startDate && b.endDate && dateStr >= b.startDate && dateStr <= b.endDate) {
        const qty = parseInt(b.quantity, 10) || 0;
        if (b.status === 'Approved' || b.status === 'Issued') {
          approvedAllocated += qty;
        } else if (b.status === 'Pending') {
          pendingAllocated += qty;
        }
      }
    });

    const remainingPool = asset.totalQuantity - approvedAllocated;
    
    let status = 'green'; 
    if (remainingPool <= 0) {
      status = 'red';   
    } else if (pendingAllocated > 0) {
      status = 'yellow'; 
    }

    availabilityProfile[dateStr] = {
      status,
      availableQty: Math.max(0, remainingPool),
      pendingQty: pendingAllocated
    };
  }

  res.json(availabilityProfile);
});

// 3. POST: ADD NEW ASSET
router.post('/', verifyToken, isAdmin, (req, res) => {
  const { name, category, description, totalQuantity, imageUrl } = req.body;

  if (!name || !category || !totalQuantity) {
    return res.status(400).json({ error: "Missing required core structural parameters." });
  }

  const parsedQty = parseInt(totalQuantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: "Total quantity allocation must be a positive integer value." });
  }

  const newAsset = {
    id: 'a_' + Date.now(),
    name,
    category,
    description: description || '',
    totalQuantity: parsedQty,
    availableQuantity: parsedQty,
    imageUrl: imageUrl || ''
  };

  assets.push(newAsset); // Proxy handles save automatically on push
  res.status(201).json(newAsset);
});

// 4. PUT: SMART MODIFICATION ENGINE
router.put('/:id', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { name, totalQuantity, imageUrl, description, category } = req.body;

  const asset = assets.find(a => a.id === id);
  if (!asset) {
    return res.status(404).json({ error: "Target catalog item not found in repository." });
  }

  const currentlyCheckedOut = asset.totalQuantity - asset.availableQuantity;

  if (totalQuantity !== undefined) {
    const parsedQty = parseInt(totalQuantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      return res.status(400).json({ error: "Total stock value configuration must be a valid integer." });
    }

    if (parsedQty < currentlyCheckedOut) {
      return res.status(400).json({ 
        error: `Data Integrity Conflict: Cannot decrease total stock to ${parsedQty}. There are currently ${currentlyCheckedOut} units actively checked out.` 
      });
    }

    asset.totalQuantity = parsedQty;
    asset.availableQuantity = parsedQty - currentlyCheckedOut;
  }

  if (name) asset.name = name;
  if (imageUrl !== undefined) asset.imageUrl = imageUrl;
  if (description) asset.description = description;
  if (category) asset.category = category;

  commitToDisk(); // 💾 Commit modifications to deep object fields to JSON file
  res.json({ message: "Asset parameters modified successfully.", asset });
});

// 5. ARCHIVE: SOFT DELETE ASSET FROM CATALOG
router.delete('/:id', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const asset = assets.find(a => a.id === id);

  if (!asset) {
    return res.status(404).json({ error: "Target asset not found." });
  }
  if (asset.availableQuantity < asset.totalQuantity) {
    return res.status(400).json({ error: "Cannot archive asset. Active transactions are pending." });
  }

  // SOFT DELETE: Add a flag instead of splicing the array
  asset.isArchived = true;
  commitToDisk(); 
  
  res.json({ message: "Asset successfully archived and hidden from consumers." });
});

module.exports = router;