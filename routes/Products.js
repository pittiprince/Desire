const express = require('express');
const Product = express.Router();
const ProductController = require('../controllers/ProductController')
const isAdmin = require('../middlewares/isAdmin')

//admin accessed route to create/add products
Product.post('/admin/add',isAdmin,ProductController.AddProduct)

//admin accessed route to update the existing product
Product.post('/admin/update',isAdmin,ProductController.UpdateProduct)

//admin accessed route to delete the existing product
Product.post('/admin/Delete',isAdmin,ProductController.DeleteProduct)



module.exports = Product;