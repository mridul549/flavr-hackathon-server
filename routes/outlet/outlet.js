const express          = require('express');
const router           = express.Router();
const checkAuth        = require('../../middlewares/check-auth');
const outletController = require('../../controllers/outlet/outletController');

// POST Methods
router.post('/addOutlet', checkAuth, outletController.addOutlet);

module.exports = router;