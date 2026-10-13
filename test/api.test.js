process.env.JWT_SECRET_KEY = 'test-jwt-secret';
process.env.ADMIN_SIGNUP_SECRET = 'let-me-be-admin';
process.env.AUTH_RATE_LIMIT = '1000'; // the real defaults would block a long test run
process.env.OTP_RATE_LIMIT = '1000';
process.env.OTP_RESEND_COOLDOWN_MS = '0';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const request = require('supertest');

// ---- swap the database models and the SMS / email senders for fakes BEFORE the app is loaded ----
const fake = require('./helpers/fakeModels');
const sent = { sms: [], email: [], failNext: false };

function stub(relativePath, exports) {
    const resolved = require.resolve(path.join(__dirname, '..', relativePath));
    require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
}
stub('models/userModel.js', fake.user);
stub('models/otp-model.js', fake.otp);
stub('models/productSchema.js', fake.product);
stub('utils/sms.js', async (number, message) => {
    if (sent.failNext) { sent.failNext = false; throw new Error('provider down'); }
    sent.sms.push({ number, message });
});
stub('utils/mailer.js', async (email, name, otp) => {
    if (sent.failNext) { sent.failNext = false; throw new Error('smtp down'); }
    sent.email.push({ email, name, otp });
});

const createApp = require('../createApp');
const inputValidation = require('../utils/inputValidation');
const app = createApp();

const bearer = (token) => ({ Authorization: `Bearer ${token}` });
const signupBody = (email, extra = {}) => ({
    name: 'Test Person',
    email,
    password: 'correct-horse-9',
    mobilNumber: '9876543210',
    address: { houseNumber: 12, streetNumber: 4, city: 'Udupi', zipcode: '576101', state: 'Karnataka' },
    ...extra
});
const lastOtp = () => sent.email.at(-1).otp;

async function signUp(email, extra) {
    return request(app).post('/user/signup').send(signupBody(email, extra));
}
async function loginToken(email) {
    const res = await request(app).post('/user/signin/password').send({ email, password: 'correct-horse-9' }).expect(200);
    return res.body.token;
}
async function adminToken(email = 'admin@shop.com') {
    await signUp(email, { adminSecret: process.env.ADMIN_SIGNUP_SECRET }).then((r) => assert.equal(r.status, 201));
    return loginToken(email);
}

const product = (extra = {}) => ({
    name: 'Oak table', description: 'A sturdy oak table', price: 12999, stock: 5, category: 'furniture', brand: 'Desire', ...extra
});

beforeEach(() => {
    Object.values(fake).forEach((model) => model.reset());
    sent.sms = []; sent.email = []; sent.failNext = false;
    process.env.OTP_RESEND_COOLDOWN_MS = '0';
});

// ---------------------------------------------------------------- validation util

test('REGRESSION: inputValidation reports failure instead of returning a truthy error object', () => {
    const bad = inputValidation({ email: 'nope' }, 'signup');
    assert.equal(bad.success, false);
    assert.ok(bad.errors.length > 0);
    const good = inputValidation(signupBody('A@B.com'), 'signup');
    assert.equal(good.success, true);
    assert.equal(good.data.email, 'a@b.com');
    // login only needs email + password (the old code always validated against the full signup schema)
    assert.equal(inputValidation({ email: 'a@b.com', password: 'x' }, 'login').success, true);
});

// ---------------------------------------------------------------- signup / login

test('health check answers 200', async () => {
    await request(app).get('/health').expect(200, { ok: true });
});

test('signup rejects invalid input', async () => {
    await request(app).post('/user/signup').send({ email: 'nope' }).expect(400);
    await signUp('a@b.com', { password: 'short' }).then((r) => assert.equal(r.status, 400));
    await signUp('a@b.com', { mobilNumber: '123' }).then((r) => assert.equal(r.status, 400));
});

test('REGRESSION: a client cannot make itself an admin by sending role: "admin"', async () => {
    const res = await signUp('sneaky@x.com', { role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.body.role, 'user');
    assert.equal(fake.user._rows()[0].role, 'user');

    const token = await loginToken('sneaky@x.com');
    await request(app).post('/Products/admin/add').set(bearer(token)).send(product()).expect(403);
});

test('admin signup needs the server-side secret', async () => {
    await signUp('a1@x.com', { adminSecret: 'wrong' }).then((r) => assert.equal(r.status, 403));
    const ok = await signUp('a2@x.com', { adminSecret: process.env.ADMIN_SIGNUP_SECRET });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.role, 'admin');
});

test('duplicate signup answers 409 (emails are case-insensitive)', async () => {
    await signUp('dup@x.com').then((r) => assert.equal(r.status, 201));
    await signUp('DUP@x.com').then((r) => assert.equal(r.status, 409));
});

test('password login works, rejects wrong credentials and returns an expiring token', async () => {
    await signUp('u@x.com');
    await request(app).post('/user/signin/password').send({ email: 'u@x.com', password: 'wrong-wrong-1' }).expect(401);
    await request(app).post('/user/signin/password').send({ email: 'ghost@x.com', password: 'whatever-1' }).expect(401);
    await request(app).post('/user/signin/password').send({ email: 'u@x.com' }).expect(400);

    const payload = jwt.verify(await loginToken('u@x.com'), process.env.JWT_SECRET_KEY);
    assert.equal(payload.role, 'user');
    assert.ok(payload.exp > payload.iat, 'token should expire');
});

// ---------------------------------------------------------------- OTP

test('REGRESSION: SMS OTP can be requested (it used to always answer "Invalid email format")', async () => {
    await signUp('u@x.com');
    await request(app).post('/user/signin/otp').send({ email: 'u@x.com' }).expect(200);
    assert.equal(sent.sms.length, 1);
    assert.equal(sent.sms[0].number, '9876543210');
    assert.match(sent.sms[0].message, /\b\d{6}\b/);
    await request(app).post('/user/signin/otp').send({ email: 'not-an-email' }).expect(400);
});

test('REGRESSION: a correct OTP logs the user in with a JWT, and works only once', async () => {
    await signUp('u@x.com');
    await request(app).post('/user/signin/otp-email').send({ email: 'u@x.com' }).expect(200);
    const otp = lastOtp();
    assert.match(otp, /^\d{6}$/);
    assert.notEqual(fake.otp._rows()[0].otp, otp, 'the OTP must be stored hashed, not in plain text');

    const ok = await request(app).post('/user/signin/otp-verify').send({ email: 'u@x.com', otp }).expect(200);
    const payload = jwt.verify(ok.body.token, process.env.JWT_SECRET_KEY);
    assert.equal(payload.email, 'u@x.com');

    await request(app).post('/user/signin/otp-verify').send({ email: 'u@x.com', otp }).expect(400); // already used
});

test('OTP: wrong codes are rejected and the code is locked after 5 wrong attempts', async () => {
    await signUp('u@x.com');
    await request(app).post('/user/signin/otp-email').send({ email: 'u@x.com' }).expect(200);
    const otp = lastOtp();
    const wrong = otp === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
        await request(app).post('/user/signin/otp-verify').send({ email: 'u@x.com', otp: wrong }).expect(400);
    }
    // even the right code no longer works once the attempts are used up
    await request(app).post('/user/signin/otp-verify').send({ email: 'u@x.com', otp }).expect(429);
});

test('OTP request does not reveal whether an email is registered', async () => {
    const res = await request(app).post('/user/signin/otp-email').send({ email: 'ghost@x.com' }).expect(200);
    assert.match(res.body.msg, /If an account exists/);
    assert.equal(sent.email.length, 0);
});

test('OTP: a second request inside the cooldown is refused', async () => {
    await signUp('u@x.com');
    process.env.OTP_RESEND_COOLDOWN_MS = '60000';
    await request(app).post('/user/signin/otp-email').send({ email: 'u@x.com' }).expect(200);
    await request(app).post('/user/signin/otp-email').send({ email: 'u@x.com' }).expect(429);
    assert.equal(sent.email.length, 1);
});

test('OTP: when delivery fails the API says so and keeps no code', async () => {
    await signUp('u@x.com');
    sent.failNext = true;
    await request(app).post('/user/signin/otp-email').send({ email: 'u@x.com' }).expect(502);
    assert.equal(fake.otp._rows().length, 0);
});

// ---------------------------------------------------------------- products

test('product admin routes need a token whose owner is an admin', async () => {
    await request(app).post('/Products/admin/add').send(product()).expect(401);
    await request(app).post('/Products/admin/add').set(bearer('garbage')).send(product()).expect(401);

    await signUp('u@x.com');
    await request(app).post('/Products/admin/add').set(bearer(await loginToken('u@x.com'))).send(product()).expect(403);
});

test('a demoted admin loses access immediately (role is checked in the database)', async () => {
    const token = await adminToken();
    await request(app).post('/Products/admin/add').set(bearer(token)).send(product()).expect(201);
    fake.user._rows().find((u) => u.email === 'admin@shop.com').role = 'user';
    await request(app).post('/Products/admin/add').set(bearer(token)).send(product()).expect(403);
});

test('REGRESSION: adding a product validates the body', async () => {
    const token = await adminToken();
    await request(app).post('/Products/admin/add').set(bearer(token)).send({ name: 'No price' }).expect(400);
    await request(app).post('/Products/admin/add').set(bearer(token)).send(product({ price: -5 })).expect(400);
    await request(app).post('/Products/admin/add').set(bearer(token)).send(product({ stock: 1.5 })).expect(400);
    assert.equal(fake.product._rows().length, 0);

    const ok = await request(app).post('/Products/admin/add').set(bearer(token)).send(product()).expect(201);
    assert.equal(ok.body.product.name, 'Oak table');
});

test('update works through the legacy header route and the REST route, and only touches whitelisted fields', async () => {
    const token = await adminToken();
    const { body } = await request(app).post('/Products/admin/add').set(bearer(token)).send(product());
    const id = body.product._id;

    await request(app).post('/Products/admin/update').set(bearer(token)).send({ price: 100 }).expect(400); // no id
    await request(app).post('/Products/admin/update').set(bearer(token)).set('objectid', id).send({}).expect(400); // nothing to update
    await request(app).post('/Products/admin/update').set(bearer(token)).set('objectid', 'a'.repeat(24)).send({ price: 1 }).expect(404);

    await request(app).post('/Products/admin/update').set(bearer(token)).set('objectid', id).send({ price: 100 }).expect(200);
    const patched = await request(app).patch(`/Products/admin/${id}`).set(bearer(token))
        .send({ stock: 9, createdAt: '1999-01-01', isFeatured: true, _id: 'hacked' }).expect(200);

    assert.equal(patched.body.product.price, 100);
    assert.equal(patched.body.product.stock, 9);
    assert.equal(String(patched.body.product._id), id);          // _id untouched
    assert.equal(patched.body.product.isFeatured, undefined);     // unknown fields are dropped
    assert.notEqual(String(patched.body.product.createdAt).slice(0, 4), "1999"); // createdAt not overwritten by the client
});

test('delete works through the legacy route and the REST route', async () => {
    const token = await adminToken();
    const first = await request(app).post('/Products/admin/add').set(bearer(token)).send(product({ name: 'A' }));
    const second = await request(app).post('/Products/admin/add').set(bearer(token)).send(product({ name: 'B' }));

    await request(app).post('/Products/admin/Delete').set(bearer(token)).expect(400);
    await request(app).post('/Products/admin/Delete').set(bearer(token)).set('objectid', first.body.product._id).expect(200);
    await request(app).delete(`/Products/admin/${second.body.product._id}`).set(bearer(token)).expect(200);
    await request(app).delete(`/Products/admin/${second.body.product._id}`).set(bearer(token)).expect(404);
    assert.equal(fake.product._rows().length, 0);
});

test('public product browsing: list, search, filter, paginate, get by id', async () => {
    const token = await adminToken();
    const make = (extra) => request(app).post('/Products/admin/add').set(bearer(token)).send(product(extra));
    await make({ name: 'Oak table', category: 'furniture' });
    await make({ name: 'Linen sofa', category: 'furniture' });
    const lamp = await make({ name: 'Brass lamp', description: 'warm light', category: 'lighting' });

    const all = await request(app).get('/Products').expect(200);
    assert.equal(all.body.total, 3);

    const page = await request(app).get('/Products?limit=2&page=2').expect(200);
    assert.equal(page.body.products.length, 1);
    assert.equal(page.body.pages, 2);

    const found = await request(app).get('/Products?q=sofa').expect(200);
    assert.deepEqual(found.body.products.map((p) => p.name), ['Linen sofa']);

    const lighting = await request(app).get('/Products?category=lighting').expect(200);
    assert.equal(lighting.body.total, 1);

    await request(app).get('/Products?limit=1000').expect(400);
    await request(app).get(`/Products/${lamp.body.product._id}`).expect(200);
    await request(app).get(`/Products/${'b'.repeat(24)}`).expect(404);
    await request(app).get('/Products/not-an-id').expect(400);
});
