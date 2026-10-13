const { z } = require('zod');
const ProductValidation = require('../utils/ProductValidation');
const ProductModel = require('../models/productSchema');

const isValidId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

// The product id can come from the URL (/admin/:id), the legacy `objectid` header, or the body.
const getId = (req) => req.params.id || req.headers.objectid || (req.body && req.body.id);

const failValidation = (res, errors) => res.status(400).json({ msg: 'Invalid input', errors });

// ---------- admin ----------

exports.AddProduct = async (req, res) => {
    // FIX: validation used to be skipped (an un-awaited Promise is always truthy) and the raw body went to the DB.
    const parsed = ProductValidation(req.body, 'AddProduct');
    if (!parsed.success) return failValidation(res, parsed.errors);

    const product = await ProductModel.create(parsed.data);
    return res.status(201).json({ msg: `${product.name} product has been successfully added`, product });
};

exports.UpdateProduct = async (req, res) => {
    const id = getId(req);
    if (!isValidId(id)) {
        return res.status(400).json({ msg: 'A valid product id is required (URL, objectid header or id field)' });
    }
    const parsed = ProductValidation(req.body, 'UpdateProduct');
    if (!parsed.success) return failValidation(res, parsed.errors);

    // FIX: used to run $set: req.body (mass assignment of any field). Now only validated, whitelisted fields.
    const product = await ProductModel.findByIdAndUpdate(id, { $set: parsed.data }, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    return res.status(200).json({ msg: 'Product updated successfully', product });
};

exports.DeleteProduct = async (req, res) => {
    const id = getId(req);
    if (!isValidId(id)) {
        return res.status(400).json({ msg: 'A valid product id is required (URL, objectid header or id field)' });
    }
    const product = await ProductModel.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    return res.status(200).json({ msg: 'Product deleted successfully' });
};

// ---------- public (so the shop can be browsed without an account) ----------

const listQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    q: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(100).optional()
});

exports.ListProducts = async (req, res) => {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) {
        return failValidation(res, parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    }
    const { page, limit, q, category } = parsed.data;

    const filter = {};
    if (q) filter.$text = { $search: q };
    if (category) filter.category = category;

    const [products, total] = await Promise.all([
        ProductModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        ProductModel.countDocuments(filter)
    ]);
    return res.status(200).json({ products, page, limit, total, pages: Math.ceil(total / limit) });
};

exports.GetProduct = async (req, res) => {
    if (!isValidId(req.params.id)) return res.status(400).json({ msg: 'Invalid product id' });
    const product = await ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    return res.status(200).json({ product });
};
