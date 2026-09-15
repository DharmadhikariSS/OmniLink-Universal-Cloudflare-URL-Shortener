import { parseUserAgent, hashPassword } from './_utils.js';

export async function onRequestGet(context) {
    const { request, env, params, waitUntil, next } = context;
    const slug = params.slug ? params.slug.trim() : '';

    // Ignore reserved routes and assets
    const reserved = ['api', 'gate', 'index.html', 'style.css', 'app.js', 'gate.html', 'favicon.ico', 'robots.txt'];
    if (!slug || reserved.includes(slug.toLowerCase()) || slug.includes('.')) {
        return next();
    }

    if (!env.DB) {
        return new Response('OmniLink Database Not Configured', { status: 500 });
    }

    try {
        const link = await env.DB.prepare(
            'SELECT * FROM links WHERE slug = ?'
        ).bind(slug).first();

        if (!link) {
            return new Response(generateHtmlError('Link Not Found', `The shortened link "/${slug}" does not exist or has been removed.`), {
                status: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // Check if link is paused / inactive
        if (link.is_active === 0) {
            return new Response(generateHtmlError('Link Paused', 'This link is currently inactive or has been paused by the owner.'), {
                status: 410,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // Check expiration
        if (link.expires_at) {
            const expireTime = new Date(link.expires_at).getTime();
            if (Date.now() > expireTime) {
                return new Response(generateHtmlError('Link Expired', 'This link expired on ' + new Date(link.expires_at).toUTCString()), {
                    status: 410,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            }
        }

        // Check click limit
        if (link.max_clicks !== null && link.max_clicks > 0 && link.clicks_count >= link.max_clicks) {
            return new Response(generateHtmlError('Click Limit Reached', 'This link has reached its maximum permitted number of clicks.'), {
                status: 410,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // Check password protection
        if (link.password_hash) {
            const urlObj = new URL(request.url);
            const authParam = urlObj.searchParams.get('auth');
            let isAuthorized = false;

            if (authParam) {
                const hashedParam = await hashPassword(authParam);
                if (hashedParam === link.password_hash) {
                    isAuthorized = true;
                }
            }

            if (!isAuthorized) {
                // Redirect to the gate page
                return Response.redirect(`${urlObj.origin}/gate.html?slug=${encodeURIComponent(slug)}`, 302);
            }
        }

        // Asynchronously record click stats without delaying the redirect
        const recordClick = async () => {
            try {
                const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
                const ipHash = await hashPassword(clientIp.split(',')[0].trim());
                const userAgent = request.headers.get('user-agent') || '';
                const { device_type, os, browser } = parseUserAgent(userAgent);
                
                const cf = request.cf || {};
                const country = cf.country || request.headers.get('cf-ipcountry') || 'Unknown';
                const city = cf.city || 'Unknown';
                const rawReferrer = request.headers.get('referer') || 'Direct';
                let referrer = 'Direct';
                if (rawReferrer && rawReferrer !== 'Direct') {
                    try {
                        referrer = new URL(rawReferrer).hostname;
                    } catch (e) {
                        referrer = rawReferrer.substring(0, 50);
                    }
                }

                const clickId = crypto.randomUUID();
                const now = new Date().toISOString();

                await env.DB.batch([
                    env.DB.prepare(
                        'INSERT INTO clicks (id, link_id, timestamp, country, city, referrer, device_type, browser, os, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                    ).bind(clickId, link.id, now, country, city, referrer, device_type, browser, os, ipHash),
                    env.DB.prepare(
                        'UPDATE links SET clicks_count = clicks_count + 1 WHERE id = ?'
                    ).bind(link.id)
                ]);
            } catch (err) {
                console.error('Error recording click analytics:', err);
            }
        };

        if (waitUntil) {
            waitUntil(recordClick());
        } else {
            // In environments where waitUntil is not available
            recordClick();
        }

        // Redirect visitor to target URL
        return Response.redirect(link.target_url, 302);

    } catch (err) {
        console.error('Error redirecting slug:', err);
        return new Response('Internal Server Error: ' + err.message, { status: 500 });
    }
}

function generateHtmlError(title, message) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | OmniLink</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #09090b;
            color: #f4f4f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 16px;
            padding: 40px 32px;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.1);
            color: #ef4444;
            margin-bottom: 20px;
        }
        h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 12px; }
        p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px; }
        .btn {
            display: inline-block;
            background: #27272a;
            color: #f4f4f5;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
        }
        .btn:hover { background: #3f3f46; color: #fff; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        </div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="btn">Go to Dashboard</a>
    </div>
</body>
</html>`;
}
