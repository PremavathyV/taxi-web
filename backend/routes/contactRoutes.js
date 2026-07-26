/**
 * routes/contactRoutes.js
 * Public:    POST   /api/contacts
 * Protected: GET    /api/contacts
 *            GET    /api/contacts/:id
 *            PATCH  /api/contacts/:id
 *            DELETE /api/contacts/:id
 */

const express = require('express');
const router  = express.Router();

const {
  submitContact, getAllContacts,
  getContactById, updateContact, deleteContact,
} = require('../controllers/contactController');

const { protect } = require('../middleware/auth');

// Public – customer submits form
router.post('/', submitContact);

// Protected – admin only
router.use(protect);
router.get('/',       getAllContacts);
router.get('/:id',    getContactById);
router.patch('/:id',  updateContact);
router.delete('/:id', deleteContact);

module.exports = router;
