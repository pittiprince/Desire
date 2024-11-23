const { z } = require('zod');

const ProductValidation = async (body, context) => {
    // Schema for creating a product
    const ProductZodSchema = z.object({
        name: z.string().nonempty({ message: "Name is required" }),
        description: z.string().nonempty({ message: "Description is required" }),
        price: z.number().positive({ message: "Price must be a positive number" }),
        stock: z.number().int().nonnegative({ message: "Stock must be a non-negative integer" }),
        category: z.string().nonempty({ message: "Category is required" }),
        tags: z.array(z.string()).optional(), // Optional tags
        images: z.array(z.string().url()).optional(), // Optional valid image URLs
        brand: z.string().nonempty({ message: "Brand is required" }),
        rating: z.number().min(0).max(5).optional(), // Optional rating between 0 and 5
        createdAt: z.date().optional().default(() => new Date()), // Default to current date
        updatedAt: z.date().optional().default(() => new Date())  // Default to current date
    });

    // Schema for updating a product
    const ProductUpdateZodSchema = z.object({
        name: z.string().optional(), // Optional name
        description: z.string().optional(), // Optional description
        price: z.number().positive().optional(), // Optional positive price
        stock: z.number().int().nonnegative().optional(), // Optional non-negative integer stock
        category: z.string().optional(), // Optional category
        tags: z.array(z.string()).optional(), // Optional tags
        images: z.array(z.string().url()).optional(), // Optional valid image URLs
        brand: z.string().optional(), // Optional brand
        rating: z.number().min(0).max(5).optional(), // Optional rating between 0 and 5
        createdAt: z.date().optional(), // Optional
        updatedAt: z.date().optional()  // Optional
    });

    // Determine schema based on context
    const schema = context === 'AddProduct' ? ProductZodSchema : ProductUpdateZodSchema;

    // Validate body using selected schema
    const result = schema.safeParse(body);

    if (result.success) {
        return { success: true, data: result.data };
    } else {
        return { success: false, error: result.error.errors };
    }
};

module.exports = ProductValidation;
