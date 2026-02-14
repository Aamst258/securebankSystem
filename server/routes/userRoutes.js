
const express = require('express');
const { getUserProfile, updateUserProfile, getUserActivity } = require('../controllers/userController');

const router = express.Router();

router.get('/:userId', getUserProfile);
router.put('/:userId', updateUserProfile);
router.get('/:userId/activity', getUserActivity);

module.exports = router;
