/**
 * routes/driverRoutes.js  – all protected (admin only)
 * GET    /api/drivers
 * POST   /api/drivers
 * GET    /api/drivers/:id
 * PATCH  /api/drivers/:id
 * DELETE /api/drivers/:id
 * GET    /api/drivers/:id/bookings
 */

const express = require('express');
const router  = express.Router();

const {
  getAllDrivers, getDriverById, createDriver,
  updateDriver, deleteDriver, getDriverBookings,
} = require('../controllers/driverController');

const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',    getAllDrivers);
router.post('/',   createDriver);
router.get('/:id/bookings', getDriverBookings);
router.get('/:id',    getDriverById);
router.patch('/:id',  updateDriver);
router.delete('/:id', deleteDriver);

module.exports = router;
