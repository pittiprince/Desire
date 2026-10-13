const { z } = require('zod');

const fields = {
    name: z.string().trim().min(1, 'Name is required').max(200),
    description: z.string().trim().min(1, 'Description is required').max(5000),
    price: z.number().positive('Price must be a positive number'),
    stock: z.number().int('Stock must be a whole number').nonnegative('Stock must be a non-negative integer'),
    category: z.string().trim().min(1, 'Category is required').max(100),
    tags: z.array(z.string().trim().min(1).max(50)).max(30),
    images: z.array(z.string().url()).max(20),
    brand: z.string().trim().min(1, 'Brand is required').max(100),
    rating: z.number().min(0).max(5)
};

// createdAt / updatedAt are managed by the database (timestamps), never by the client.
const addSchema = z.object({
    name: fields.name,
    description: fields.description,
    price: fields.price,
    stock: fields.stock,
    category: fields.category,
    brand: fields.brand,
    tags: fields.tags.optional(),
    images: fields.images.optional(),
    rating: fields.rating.optional()
});

// Every field optional, but at least one must be sent. Unknown keys are stripped, so only
// these whitelisted fields can ever reach the database.
const updateSchema = z.object({
    name: fields.name.optional(),
    description: fields.description.optional(),
    price: fields.price.optional(),
    stock: fields.stock.optional(),
    category: fields.category.optional(),
    brand: fields.brand.optional(),
    tags: fields.tags.optional(),
    images: fields.images.optional(),
    rating: fields.rating.optional()
}).refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to update' });

// SYNCHRONOUS on purpose. The old version was `async` and AddProduct did not await it, so the
// returned Promise (always truthy) made validation a no-op.
// Returns { success: true, data } or { success: false, errors: [{ path, message }] }.
function ProductValidation(body, context) {
    const schema = context === 'AddProduct' ? addSchema : updateSchema;
    const result = schema.safeParse(body);
    if (result.success) return { success: true, data: result.data };
    return {
        success: false,
        errors: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    };
}

module.exports = ProductValidation;
