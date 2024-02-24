const express = require('express');
const router = express.Router();
const categoryController = require('../../../../controllers/outlet/product/category/categoryController');
const checkAuth = require('../../../../middlewares/check-auth')

router.use('/icon', require('./icon'))

router.get('/', checkAuth, categoryController.getCategory)
router.post('/add', checkAuth, categoryController.addCategory)
router.patch('/update', checkAuth, categoryController.updateCategory)

module.exports = router;