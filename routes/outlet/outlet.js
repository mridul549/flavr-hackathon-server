const express          = require('express');
const router           = express.Router();
const checkAuth        = require('../../middlewares/check-auth');
const outletController = require('../../controllers/outlet/outletController');

// GET Methods
router.get('/menu_size', checkAuth, outletController.getMenuSize)
router.get('/', checkAuth, outletController.getOutlet)
router.get('/all', outletController.getAllOutlets)
router.get('/city', outletController.getAllOutletsByCity)

// POST Methods
router.post('/add', checkAuth, outletController.addOutlet);

// PATCH Methods
router.patch('/update/:outletid', checkAuth, outletController.updateOutlet);
router.patch('/update/image/:outletid', checkAuth, outletController.updateImage)

// DELETE Methods
router.delete('/delete', checkAuth, outletController.deleteOutlet);
router.delete('/delete/image', checkAuth, outletController.deleteOutletImage)

module.exports = router;