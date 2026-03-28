const express = require('express');
const router = express.Router();

const { registerUser, loginUser, getUsers, getUserById } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', protect, getUsers);
router.get('/:id', protect, getUserById);

module.exports = router;