const express         = require('express');
const router          = express.Router();
const userController = require('../../controllers/user/userController')
const checkAuth       = require('../../middlewares/check-auth') 

// Auth
router.post('/signup', userController.signup);
router.post('/login', userController.login);

module.exports = router;