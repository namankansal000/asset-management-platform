const express = require('express');
const router = express.Router();
// Destructure commitToDisk along with your data pools
const { bookings, assets, commitToDisk } = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// NEW ROUTE: REAL-TIME INVENTORY PRE-FLIGHT CHECK
router.get('/check-availability', verifyToken, (req, res) => {
  const { assetId, startDate, endDate } = req.query;

  if (!assetId || !startDate || !endDate) {
    return res.status(400).json({ error: "Missing parameters for availability check." });
  }

  const asset = assets.find(a => a.id === assetId);
  if (!asset) return res.status(404).json({ error: "Asset not found." });

  let checkDate = new Date(startDate);
  const finalDate = new Date(endDate);
  
  let minAvailable = asset.totalQuantity;
  let hasPending = false;

  // Loop through every day in the requested range to find the bottleneck
  while (checkDate <= finalDate) {
    const dStr = checkDate.toISOString().split('T')[0];
    let allocatedOnDay = 0;
    let pendingOnDay = 0;

    bookings.filter(b => b.assetId === assetId).forEach(b => {
      if (dStr >= b.startDate && dStr <= b.endDate) {
        if (b.status === 'Approved' || b.status === 'Issued') {
          allocatedOnDay += b.quantity;
        } else if (b.status === 'Pending') {
          pendingOnDay += b.quantity;
        }
      }
    });

    const availableToday = asset.totalQuantity - allocatedOnDay;
    if (availableToday < minAvailable) {
      minAvailable = availableToday; // Track the lowest available stock day
    }
    if (pendingOnDay > 0) hasPending = true;

    checkDate.setDate(checkDate.getDate() + 1);
  }

  res.json({
    available: Math.max(0, minAvailable),
    hasPendingRequests: hasPending,
    total: asset.totalQuantity
  });
});

// 1. POST: CONSUMER CALENDAR RESERVATION REQUEST
router.post('/request', verifyToken, (req, res) => {
  const { assetId, quantity, startDate, endDate } = req.body;

  if (!assetId || !quantity || !startDate || !endDate) {
    return res.status(400).json({ error: "Incomplete configuration metrics. Dates and quantities must be specified." });
  }

  const asset = assets.find(a => a.id === assetId);
  if (!asset) return res.status(404).json({ error: "Target asset missing from registry system." });

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({ error: "Requested asset count allocation must be a positive integer." });
  }

  // Double-check requested calendar window availability
  const activeBookings = bookings.filter(b => b.assetId === assetId && (b.status === 'Approved' || b.status === 'Issued'));
  let checkDate = new Date(startDate);
  const finalDate = new Date(endDate);

  while (checkDate <= finalDate) {
    const dStr = checkDate.toISOString().split('T')[0];
    let allocatedOnDay = 0;

    activeBookings.forEach(b => {
      if (dStr >= b.startDate && dStr <= b.endDate) {
        allocatedOnDay += b.quantity;
      }
    });

    if (asset.totalQuantity - allocatedOnDay < parsedQty) {
      return res.status(400).json({ error: `Inventory Exhaustion: Insufficient pool depth on target date: ${dStr}` });
    }
    checkDate.setDate(checkDate.getDate() + 1);
  }

  const newBooking = {
    id: 'b_' + Date.now(),
    userId: req.user.id,
    userName: req.user.name,
    assetId,
    assetName: asset.name,
    quantity: parsedQty,
    startDate,
    endDate,
    status: 'Pending',
    createdAt: new Date()
  };

  bookings.push(newBooking); // Proxy auto-saves array pushes
  res.status(201).json(newBooking);
});

// 2. GET: CONSUMER PROFILE PERSONAL REQUEST TIMELINES
router.get('/my-bookings', verifyToken, (req, res) => {
  const userReservations = bookings.filter(b => b.userId === req.user.id);
  res.json(userReservations);
});

// 3. GET: SYSTEM-WIDE ACTIVE ACTION LOGS (ADMIN ONLY)
router.get('/all', verifyToken, isAdmin, (req, res) => {
  res.json(bookings);
});

/// 4. PATCH: ADMINISTRATIVE REQUEST EVALUATION OVERRIDE
router.patch('/:id/approval', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const { action, message } = req.body; // 👈 Expects an optional custom string notice

  const booking = bookings.find(b => b.id === id);
  if (!booking) return res.status(404).json({ error: "Target booking tracking reference not found." });

  if (booking.status !== 'Pending') {
    return res.status(400).json({ error: "Workflow conflict: Resource item transaction window has already closed." });
  }

  if (action === 'Approve') {
    const asset = assets.find(a => a.id === booking.assetId);
    if (!asset) return res.status(404).json({ error: "Associated inventory item could not be resolved." });

    const activeBookings = bookings.filter(b => 
      b.assetId === booking.assetId && b.id !== id && (b.status === 'Approved' || b.status === 'Issued')
    );

    let checkDate = new Date(booking.startDate);
    const finalDate = new Date(booking.endDate);

    while (checkDate <= finalDate) {
      const dStr = checkDate.toISOString().split('T')[0];
      let allocatedOnDay = 0;

      activeBookings.forEach(b => {
        if (dStr >= b.startDate && dStr <= b.endDate) {
          allocatedOnDay += b.quantity;
        }
      });

      if (asset.totalQuantity - allocatedOnDay < booking.quantity) {
        return res.status(400).json({ 
          error: `Inventory Depletion: Cannot approve request. Only ${asset.totalQuantity - allocatedOnDay} units of "${asset.name}" remain available for date: ${dStr}` 
        });
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    booking.status = 'Approved';
  } else {
    booking.status = 'Rejected';
    if (message) {
      booking.adminMessage = message; // 💾 Log the custom rejection reason
    }
  }

  commitToDisk(); 
  res.json({ message: `Reservation marked as ${booking.status}.`, booking });
});

// 5. PATCH: CONFIRM HANDOVER PICKUP
// Add this to routes/bookings.js
router.patch('/:id/issue', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id);

  if (!booking) return res.status(404).json({ error: "Booking ID not found." });
  
  if (booking.status !== 'Approved') {
    return res.status(400).json({ error: "This booking is not approved for pickup." });
  }

  booking.status = 'Issued';
  commitToDisk();
  
  res.json({ success: true, message: "Gear issued successfully!" });
});

// 6. PATCH: RECEIVE PHYSICAL REPOSITORY RETURNS
router.patch('/:id/return', verifyToken, isAdmin, (req, res) => {
  const { id } = req.params;
  const booking = bookings.find(b => b.id === id);
  if (!booking) return res.status(404).json({ error: "Booking trace reference broken." });

  booking.status = 'Returned';
  booking.returnedAt = new Date();
  
  commitToDisk(); // 💾 Commit status property modification to storage
  res.json({ message: "Equipment asset returned to active stock pool safely.", booking });
});

module.exports = router;