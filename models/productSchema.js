const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true // Add an index for faster search on product names
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true,
        index: true // Add an index for faster filtering by category
    },
    tags: {
        type: [String], // Array of tags for search
        index: true // Add an index for efficient tag searches
    },
    images: {
        type: [String] // Array of image URLs
    },
    brand: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 0,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Create a text index for full-text search on multiple fields
ProductSchema.index({
    name: "text",
    description: "text",
    tags: "text"
});

const ProductModel = mongoose.model('Product', ProductSchema);

module.exports = ProductModel;
