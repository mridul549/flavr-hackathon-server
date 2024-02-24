const express = require('express');
const router = express.Router();
const categoryIconController = require('../../../../controllers/outlet/product/category/categoryIconController')

router.get('/', categoryIconController.getAllIcons)
router.post('/add', categoryIconController.addIcon)

module.exports = router;