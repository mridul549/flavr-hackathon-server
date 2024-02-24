const express = require('express');
const router = express.Router();
const checkAuth = require('../../../middlewares/check-auth')
const productController = require('../../../controllers/outlet/product/productController');

router.use('/category', require('./category/category'));

router.post('/add', checkAuth, productController.addProduct);

module.exports = router;