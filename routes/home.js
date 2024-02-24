const express = require('express');
const router = express.Router();

router.use('/owner', require('./owner/owner'));
router.use('/user', require('./user/user'));
router.use('/mail', require('../mail/mailRoutes'))

module.exports = router;