const { z } = require('zod');

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(72); // bcrypt ignores bytes past 72
// Stored as text: a Number would lose leading zeros and cannot hold a "+" country code.
const mobileSchema = z.coerce.string().trim().regex(/^\+?\d{10,15}$/, 'Mobile number must be 10 to 15 digits');

const addressSchema = z.object({
    houseNumber: z.number().int().positive(),
    streetNumber: z.number().int().positive(),
    landmark: z.string().trim().optional(),
    city: z.string().trim().min(1),
    zipcode: z.string().trim().min(3).max(12),
    state: z.string().trim().min(1),
    category: z.string().trim().optional() // 'Home', 'Work', ...
});

const schemas = {
    // NOTE: there is deliberately no `role` field. The role is decided on the server,
    // otherwise anyone could register themselves as an admin.
    signup: z.object({
        name: z.string().trim().min(1).max(100),
        email: emailSchema,
        password: passwordSchema,
        mobilNumber: mobileSchema,
        address: addressSchema,
        adminSecret: z.string().max(200).optional() // only works when ADMIN_SIGNUP_SECRET is configured
    }),
    login: z.object({
        email: emailSchema,
        password: z.string().min(1).max(72)
    }),
    otpRequest: z.object({
        email: emailSchema
    }),
    otpVerify: z.object({
        email: emailSchema,
        otp: z.coerce.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits')
    })
};

// Returns { success: true, data } or { success: false, errors: [{ path, message }] }.
// FIX: the old version returned the ZodError object on failure, which is truthy, so callers'
// `if (isParsed)` check passed for invalid input and validation never blocked anything.
function inputValidation(body, context) {
    const schema = schemas[context];
    if (!schema) throw new Error(`Unknown validation context: ${context}`);
    const result = schema.safeParse(body);
    if (result.success) return { success: true, data: result.data };
    return {
        success: false,
        errors: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    };
}

module.exports = inputValidation;
