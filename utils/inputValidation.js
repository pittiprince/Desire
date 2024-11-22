const { z } = require('zod')
const inputValidaton = (body,context) =>{
       // Address schema
       const addressSchema = z.object({
        houseNumber: z.number().int().positive(),
        streetNumber: z.number().int().positive(),
        landmark: z.string().optional(),
        city: z.string(),
        zipcode: z.string(),
        state: z.string(),
        category: z.string().optional(), // Optional field for 'Home', 'Work', etc.
    });

    // User schema
    const userSchema = z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string(),
        mobilNumber: z.number().int().positive(),
        address: addressSchema,
        role: z.enum(['admin', 'user']), // Enum for 'admin' or 'user'
    });

    const loginSchema = z.object({
        email: z.string().email(),
        password: z.string(),
    });

    const schema = context === 'signup' ? userSchema : loginSchema;

    const isparsed = userSchema.safeParse(body)
    if(isparsed.success){
        return true
    }else if(isparsed.error){
        return isparsed.error
    }
}

module.exports=inputValidaton;