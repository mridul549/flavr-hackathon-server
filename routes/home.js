const express = require('express');
const router = express.Router();

router.use('/owner', require('./owner/owner'));
router.use('/user', require('./user/user'));
router.use('/mail', require('../mail/mailRoutes'))
router.use('/product', require('./outlet/product/index'));
router.use('/outlet', require('./outlet/outlet'));

module.exports = router;