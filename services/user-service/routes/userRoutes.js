const express = require('express');
const router = express.Router();

const { registerUser, loginUser, getUsers, getUserById, forgotPassword, resetPassword } = require('../controllers/userController');
const { addAddress, getMyAddresses, getMyAddressById } = require('../controllers/addressController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/addresses', protect, addAddress);
router.get('/addresses', protect, getMyAddresses);
router.get('/addresses/:id', protect, getMyAddressById);
router.get('/', protect, getUsers);
router.get('/:id', protect, getUserById);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:token', resetPassword);
module.exports = router;