// Small in-memory stand-ins for the mongoose models, so the API logic can be tested without MongoDB.
// They implement only the methods the controllers use.
const crypto = require('node:crypto');

const newId = () => crypto.randomBytes(12).toString('hex');

function matches(row, filter) {
    return Object.entries(filter).every(([key, expected]) => {
        if (key === '$text') {
            const needle = String(expected.$search).toLowerCase();
            return `${row.name} ${row.description}`.toLowerCase().includes(needle);
        }
        return String(row[key]) === String(expected);
    });
}

// Query-like object: supports the chain .sort().skip().limit().lean() and can be awaited.
function query(rows) {
    let result = rows;
    const chain = {
        sort() { return chain; },
        skip(n) { result = result.slice(n); return chain; },
        limit(n) { result = result.slice(0, n); return chain; },
        lean() { return chain; },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); }
    };
    return chain;
}

function makeModel({ unique = [], defaults = () => ({}) } = {}) {
    let rows = [];
    return {
        reset() { rows = []; },
        _rows() { return rows; },
        async findOne(filter) { return rows.find((r) => matches(r, filter)) || null; },
        async findById(id) { return rows.find((r) => String(r._id) === String(id)) || null; },
        find(filter = {}) { return query(rows.filter((r) => matches(r, filter))); },
        async countDocuments(filter = {}) { return rows.filter((r) => matches(r, filter)).length; },
        async create(doc) {
            for (const field of unique) {
                if (rows.some((r) => String(r[field]) === String(doc[field]))) {
                    const err = new Error('E11000 duplicate key');
                    err.code = 11000;
                    throw err;
                }
            }
            const row = { _id: newId(), createdAt: new Date(), ...defaults(), ...doc };
            rows.push(row);
            return row;
        },
        async updateOne(filter, update) {
            const row = rows.find((r) => matches(r, filter));
            if (!row) return { matchedCount: 0 };
            if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) row[k] = (row[k] || 0) + v;
            if (update.$set) Object.assign(row, update.$set);
            return { matchedCount: 1 };
        },
        async findByIdAndUpdate(id, update) {
            const row = rows.find((r) => String(r._id) === String(id));
            if (!row) return null;
            Object.assign(row, update.$set);
            return row;
        },
        async findByIdAndDelete(id) {
            const index = rows.findIndex((r) => String(r._id) === String(id));
            return index < 0 ? null : rows.splice(index, 1)[0];
        },
        async deleteMany(filter) { rows = rows.filter((r) => !matches(r, filter)); }
    };
}

module.exports = {
    user: makeModel({ unique: ['email'], defaults: () => ({ role: 'user' }) }),
    otp: makeModel({ defaults: () => ({ attempts: 0 }) }),
    product: makeModel()
};
