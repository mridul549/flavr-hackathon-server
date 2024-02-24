const express         = require('express');
const router          = express.Router();
const ownerController = require('../../controllers/owner/ownerController')
const checkAuth = require('../../middlewares/check-auth');

// AUTH routes
router.post('/signup', ownerController.signup);
router.post('/login', ownerController.login);

module.exports = router;