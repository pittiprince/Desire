const express = require('express');
const Product = express.Router();
const ProductController = require('../controllers/ProductController');
const isAdmin = require('../middlewares/isAdmin');
const asyncHandler = require('../utils/asyncHandler');

// ---- admin routes (token of a user whose role is admin) ----

//admin accessed route to create/add products
Product.post('/admin/add', isAdmin, asyncHandler(ProductController.AddProduct));

//admin accessed route to update the existing product (legacy: id in the `objectid` header or body)
Product.post('/admin/update', isAdmin, asyncHandler(ProductController.UpdateProduct));

//admin accessed route to delete the existing product (legacy: id in the `objectid` header or body)
Product.post('/admin/Delete', isAdmin, asyncHandler(ProductController.DeleteProduct));

// REST style versions of the two routes above
Product.patch('/admin/:id', isAdmin, asyncHandler(ProductController.UpdateProduct));
Product.delete('/admin/:id', isAdmin, asyncHandler(ProductController.DeleteProduct));

// ---- public routes ----

// GET /Products?page=1&limit=12&q=sofa&category=living-room
Product.get('/', asyncHandler(ProductController.ListProducts));

// GET /Products/:id
Product.get('/:id', asyncHandler(ProductController.GetProduct));

module.exports = Product;
