// Automated Verification Test for OmniLink URL Shortener
import http from 'node:http';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = 'http://localhost:3000';

let spawnedServer = null;

function request(method, reqPath, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(reqPath, BASE_URL);
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

async function ensureServerRunning() {
    try {
        await request('GET', '/');
        console.log('✔ Connected to existing local server.');
    } catch (e) {
        console.log('Starting local server for automated tests...');
        const serverPath = path.join(__dirname, '..', 'local-server.js');
        spawnedServer = spawn(process.execPath, [serverPath], {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Wait up to 5 seconds for server to start
        let ready = false;
        for (let i = 0; i < 25; i++) {
            await new Promise(r => setTimeout(r, 200));
            try {
                await request('GET', '/');
                ready = true;
                break;
            } catch (err) {}
        }

        if (!ready) {
            throw new Error('Failed to start local server within 5 seconds.');
        }
        console.log('✔ Local server started and ready.');
    }
}

async function runTests() {
    console.log('--- Starting OmniLink Verification Tests ---');

    await ensureServerRunning();

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
            console.log('Existing password found, proceeding with tests.');
        }
    }

    const authHeaders = { 'Authorization': `Bearer ${adminToken}`, 'x-admin-key': adminToken };

    // 2b. Test Fail-Closed Auth Protection
    console.log('2b. Testing fail-closed authentication protection...');
    const unauthLinks = await request('GET', '/api/links');
    assert.strictEqual(unauthLinks.status, 401, 'Unauthenticated GET /api/links must return 401');
    const wrongAuthLinks = await request('GET', '/api/links', null, { 'Authorization': 'Bearer wrong-passcode' });
    assert.strictEqual(wrongAuthLinks.status, 401, 'Wrong auth GET /api/links must return 401');
    const unauthPost = await request('POST', '/api/links', { target_url: 'https://evil.com' });
    assert.strictEqual(unauthPost.status, 401, 'Unauthenticated POST /api/links must return 401');
    console.log('✔ Fail-closed admin authentication verified.');

    // 3. Test Security: Path Traversal Protection
    console.log('3. Testing path traversal protection in local static serving...');
    const traversalRes = await request('GET', '/../package.json');
    assert(traversalRes.status === 404, `Expected 404 for path traversal, got ${traversalRes.status}`);
    assert(!traversalRes.text.includes('omnilink-url-shortener'), 'package.json should not be served via directory traversal');
    console.log('✔ Path traversal protection verified.');

    // 4. Test Security: XSS & Dangerous Schemes Blocked
    console.log('4. Testing dangerous scheme rejection (XSS prevention)...');
    const xssRes = await request('POST', '/api/links', {
        target_url: 'javascript:alert(document.domain)',
        custom_slug: 'xss-test'
    }, authHeaders);
    assert.strictEqual(xssRes.status, 400, 'javascript: scheme must be rejected with 400');
    console.log('✔ Dangerous schemes blocked successfully.');

    // 5. Test Security: Reserved Slugs Blocked
    console.log('5. Testing reserved slug protection...');
    const reservedRes = await request('POST', '/api/links', {
        target_url: 'https://example.com',
        custom_slug: 'api'
    }, authHeaders);
    assert.strictEqual(reservedRes.status, 400, 'Reserved slug "api" must be rejected with 400');
    console.log('✔ Reserved slugs protection verified.');

    // 6. Create a normal web link
    console.log('6. Testing standard URL shortening...');
    const createRes = await request('POST', '/api/links', {
        target_url: 'https://github.com/google',
        custom_slug: 'github-google',
        title: 'Google on GitHub'
    }, authHeaders);
    assert(createRes.status === 201 || createRes.status === 409, `Expected 201 or 409, got ${createRes.status}`);
    console.log('✔ Standard URL shortener verified.');

    // 7. Test universal protocol support (magnet, mailto, etc.)
    console.log('7. Testing universal protocol support (magnet URI)...');
    const magnetSlug = 'test-magnet-' + Date.now().toString().slice(-4);
    const magnetUrl = 'magnet:?xt=urn:btih:d6b0636f33333333333333333333333333333333&dn=Ubuntu';
    const magnetRes = await request('POST', '/api/links', {
        target_url: magnetUrl,
        custom_slug: magnetSlug,
        title: 'Ubuntu Magnet Torrent'
    }, authHeaders);
    assert.strictEqual(magnetRes.status, 201);
    console.log('✔ Magnet URI shortening verified.');

    // 8. Test redirect response
    console.log('8. Testing edge redirect resolution for custom slug...');
    const redirectRes = await request('GET', `/${magnetSlug}`);
    assert.strictEqual(redirectRes.status, 302);
    assert.strictEqual(redirectRes.headers['location'], magnetUrl);
    assert(redirectRes.text.includes('Redirecting to Application'), 'External protocol redirect includes HTML fallback body');
    console.log('✔ Redirect resolved with HTTP 302 and exact Location header.');

    // 9. Test password-protected link & gate enforcement
    console.log('9. Testing passcode-protected link & gate verification...');
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

    // Verify passcode via API (should unlock and record click)
    const verifyGate = await request('POST', '/api/verify-gate', {
        slug: passSlug,
        password: 'secure-pin-4321'
    });
    assert.strictEqual(verifyGate.status, 200);
    assert.strictEqual(verifyGate.json.target_url, 'https://private-docs.internal/file.pdf');
    console.log('✔ Passcode gate unlock verified.');

    // Test paused link on gate
    const toggleRes = await request('PATCH', `/api/links/${passRes.json.link.id}`, { is_active: 0 }, authHeaders);
    assert.strictEqual(toggleRes.status, 200);
    const verifyPaused = await request('POST', '/api/verify-gate', {
        slug: passSlug,
        password: 'secure-pin-4321'
    });
    assert.strictEqual(verifyPaused.status, 410, 'Gate must return 410 when link is paused');
    console.log('✔ Inactive/paused status strictly enforced on passcode gate.');

    // 10. Test CSV export with formula injection sanitization
    console.log('10. Testing CSV export with formula sanitization...');
    const formulaSlug = 'formula-' + Date.now().toString().slice(-4);
    await request('POST', '/api/links', {
        target_url: 'https://safe.com',
        custom_slug: formulaSlug,
        title: '=1+1'
    }, authHeaders);

    const exportRes = await request('GET', '/api/export', null, authHeaders);
    assert.strictEqual(exportRes.status, 200);
    assert(exportRes.text.includes("''=1+1") || exportRes.text.includes("'=1+1"), 'Formula injection should be sanitized with leading quote');
    console.log('✔ CSV export and formula sanitization verified.');

    // 11. Test Analytics endpoint
    console.log('11. Testing click analytics tracking...');
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
}).finally(() => {
    if (spawnedServer) {
        spawnedServer.kill();
    }
});
