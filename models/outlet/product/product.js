const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const checkAuth = require('../middlewares/check-auth');

router.use('/category', require('./category/category'));

module.exports = router;