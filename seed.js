// Idempotent demo data. Runs at start-up only when SEED_DEMO=true.
const bcrypt = require('bcrypt');
const User = require('./models/userModel');
const Product = require('./models/productSchema');

const DEMO_PASSWORD = 'Demo@12345';
const address = { houseNumber: 12, streetNumber: 4, city: 'Udupi', zipcode: '576104', state: 'Karnataka', category: 'Home' };
const P = (name, category, price, stock, brand, rating, description, tags) => ({ name, category, price, stock, brand, rating, description, tags, images: [] });

const PRODUCTS = [
    P('Nordic 3-Seater Sofa', 'living-room', 24999, 14, 'Fjord', 4.6, 'Linen-blend sofa with solid birch legs and removable covers.', ['sofa', 'seating', 'linen']),
    P('Oak Coffee Table', 'living-room', 6499, 30, 'Fjord', 4.4, 'Round coffee table in solid oak with a matte finish.', ['table', 'oak', 'minimal']),
    P('Arc Floor Lamp', 'lighting', 3299, 42, 'Lumen', 4.5, 'Adjustable arc lamp with warm dimmable LED.', ['lamp', 'led', 'lighting']),
    P('Cloud Duvet Set (Queen)', 'bedroom', 2799, 60, 'Slumber', 4.7, 'Breathable cotton percale duvet with two pillow covers.', ['bedding', 'cotton']),
    P('Walnut Bookshelf', 'storage', 11999, 18, 'Fjord', 4.3, 'Five-tier open bookshelf with a walnut veneer.', ['shelf', 'storage', 'walnut']),
    P('Stackable Dining Chair (Set of 2)', 'dining', 5599, 40, 'Hearth', 4.2, 'Light, stackable chairs in powder-coated steel and ash.', ['chair', 'dining']),
    P('Extendable Dining Table', 'dining', 18999, 9, 'Hearth', 4.6, 'Seats four, extends to eight with a hidden leaf.', ['table', 'dining', 'extendable']),
    P('Ceramic Table Lamp', 'lighting', 1899, 55, 'Lumen', 4.1, 'Hand-glazed ceramic base with a linen shade.', ['lamp', 'ceramic']),
    P('Woven Jute Rug 5x8', 'decor', 4299, 25, 'Hearth', 4.3, 'Natural jute rug, low pile, easy to clean.', ['rug', 'jute', 'natural']),
    P('Wall Mirror, Brass Frame', 'decor', 3799, 33, 'Lumen', 4.5, 'Round mirror with a slim brushed-brass frame.', ['mirror', 'brass']),
    P('Modular Wardrobe', 'bedroom', 27999, 7, 'Slumber', 4.4, 'Two-door wardrobe with soft-close hinges and internal drawers.', ['wardrobe', 'storage']),
    P('Pendant Light, Rattan', 'lighting', 2499, 48, 'Lumen', 4.2, 'Hand-woven rattan pendant for a warm, airy feel.', ['pendant', 'rattan', 'lighting'])
];

async function seedDemoData() {
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    if (!(await User.findOne({ email: 'demo-admin@desire.dev' }))) {
        await User.create({ name: 'Demo Admin', email: 'demo-admin@desire.dev', password: hash, mobilNumber: '9000000001', address, role: 'admin' });
    }
    if (!(await User.findOne({ email: 'demo-user@desire.dev' }))) {
        await User.create({ name: 'Demo Shopper', email: 'demo-user@desire.dev', password: hash, mobilNumber: '9000000002', address, role: 'user' });
    }
    const before = await Product.countDocuments();
    if (before === 0) await Product.insertMany(PRODUCTS);
    console.log(`Demo data ready (SEED_DEMO=true): products before=${before}, now=${await Product.countDocuments()}, db=${Product.db.name}, collection=${Product.collection.name}`);
}

module.exports = { seedDemoData };
