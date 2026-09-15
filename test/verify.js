// Automated Verification Test for OmniLink URL Shortener
import http from 'node:http';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: {
                ...headers
            }
        };

        if (body) {
            options.headers['Content-Type'] = 'application/json';
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let json = null;
                try {
                    json = JSON.parse(data);
                } catch (e) {}
                resolve({ status: res.statusCode, headers: res.headers, text: data, json });
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- Starting OmniLink Verification Tests ---');

    // 1. Static site check
    console.log('1. Checking dashboard HTML serving...');
    const indexRes = await request('GET', '/');
    assert.strictEqual(indexRes.status, 200);
    assert(indexRes.text.includes('OmniLink'));
    console.log('✔ Dashboard loaded successfully.');

    // 2. Auth check & setup
    console.log('2. Checking admin auth endpoints...');
    const authStatus = await request('GET', '/api/auth');
    assert.strictEqual(authStatus.status, 200);
    console.log('Auth configured status:', authStatus.json.isConfigured);

    let adminToken = 'master-secret-123';
    if (!authStatus.json.isConfigured) {
        const setupRes = await request('POST', '/api/auth', { action: 'setup', newPassword: adminToken });
        assert.strictEqual(setupRes.status, 200);
        assert(setupRes.json.success);
        console.log('✔ Admin passcode setup verified.');
    } else {
        const verifyRes = await request('POST', '/api/auth', { action: 'verify', password: adminToken });
        if (!verifyRes.json.success) {
            // Already has password in local db, test with whatever is set or continue
            console.log('Existing password found, proceeding with tests.');
        }
    }

    const authHeaders = { 'Authorization': `Bearer ${adminToken}`, 'x-admin-key': adminToken };

    // 3. Create a normal web link
    console.log('3. Testing standard URL shortening...');
    const createRes = await request('POST', '/api/links', {
        target_url: 'https://github.com/google',
        custom_slug: 'github-google',
        title: 'Google on GitHub'
    }, authHeaders);
    assert(createRes.status === 201 || createRes.status === 409, `Expected 201 or 409, got ${createRes.status}`);
    console.log('✔ Standard URL shortener verified.');

    // 4. Test universal protocol support (magnet, mailto, etc.)
    console.log('4. Testing universal protocol support (magnet URI)...');
    const magnetSlug = 'test-magnet-' + Date.now().toString().slice(-4);
    const magnetUrl = 'magnet:?xt=urn:btih:d6b0636f33333333333333333333333333333333&dn=Ubuntu';
    const magnetRes = await request('POST', '/api/links', {
        target_url: magnetUrl,
        custom_slug: magnetSlug,
        title: 'Ubuntu Magnet Torrent'
    }, authHeaders);
    assert.strictEqual(magnetRes.status, 201);
    console.log('✔ Magnet URI shortening verified.');

    // 5. Test redirect response
    console.log('5. Testing edge redirect resolution for custom slug...');
    const redirectRes = await request('GET', `/${magnetSlug}`);
    assert.strictEqual(redirectRes.status, 302);
    assert.strictEqual(redirectRes.headers['location'], magnetUrl);
    console.log('✔ Redirect resolved with HTTP 302 and exact Location header.');

    // 6. Test password-protected link
    console.log('6. Testing passcode-protected link...');
    const passSlug = 'secret-doc-' + Date.now().toString().slice(-4);
    const passRes = await request('POST', '/api/links', {
        target_url: 'https://private-docs.internal/file.pdf',
        custom_slug: passSlug,
        password: 'secure-pin-4321',
        title: 'Top Secret Document'
    }, authHeaders);
    assert.strictEqual(passRes.status, 201);

    // Visiting without auth should redirect to gate.html
    const gateRedirect = await request('GET', `/${passSlug}`);
    assert.strictEqual(gateRedirect.status, 302);
    assert(gateRedirect.headers['location'].includes('/gate.html?slug='));
    console.log('✔ Unauthenticated visitor properly redirected to passcode gate.');

    // Verify passcode via API
    const verifyGate = await request('POST', '/api/verify-gate', {
        slug: passSlug,
        password: 'secure-pin-4321'
    });
    assert.strictEqual(verifyGate.status, 200);
    assert.strictEqual(verifyGate.json.target_url, 'https://private-docs.internal/file.pdf');
    console.log('✔ Passcode gate unlock verified.');

    // 7. Test CSV export
    console.log('7. Testing CSV export endpoint...');
    const exportRes = await request('GET', '/api/export', null, authHeaders);
    assert.strictEqual(exportRes.status, 200);
    assert(exportRes.text.includes('Short Slug,Short URL,Target URL'));
    console.log('✔ CSV export verified.');

    // 8. Test Analytics endpoint
    console.log('8. Testing click analytics tracking...');
    // Give async click tracking a brief moment
    await new Promise(r => setTimeout(r, 200));
    const analyticsRes = await request('GET', '/api/analytics/all', null, authHeaders);
    assert.strictEqual(analyticsRes.status, 200);
    assert(analyticsRes.json.total_clicks >= 1);
    console.log('✔ Click analytics aggregation verified.');

    console.log('\n======================================================');
    console.log('🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
}

runTests().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});
