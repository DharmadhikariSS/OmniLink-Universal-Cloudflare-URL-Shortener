# ⚡ OmniLink - All-Rounder URL Shortener

An ultra-clean, full-featured modern URL shortener designed for personal ownership: **100% free forever**, **zero limitations**, **universal protocol support** (HTTP/S, magnet URIs, deep links, mailto, phone numbers, app schemes), **passcode-protected links**, **downloadable QR codes**, and **rich click analytics**.

Designed with **Dub.co-inspired minimalist SaaS aesthetics** with high-contrast monochrome, subtle emerald accents, and an instant Light / Dark mode toggle.

---

## 🌟 Key Features

1. **100% Free Forever & Zero Limitations**
   - No monthly link caps, no paywalls, no link expiration unless you choose to set one.
   - Deployable to Cloudflare Pages + Cloudflare D1 for 100,000 requests/day free forever on the global edge.
2. **Universal Protocol Support**
   - Works with **ANY** web address or URI scheme:
     - Standard: `https://`, `http://`
     - P2P / Torrents: `magnet:?xt=urn:...`
     - Direct Contact: `mailto:hello@example.com`, `tel:+123456789`
     - Messaging Deep Links: `tg://resolve?domain=...`, `whatsapp://send?phone=...`
     - Custom App Schemes & IP addresses with custom ports.
3. **Admin Security**
   - Protected with a Master Admin Passcode.
   - Short links are 100% publicly resolvable by anyone on the internet, while dashboard creation, link management, and click analytics are securely private to you.
4. **Interactive QR Code Studio**
   - In-browser dynamic QR Code generation with customizable accent colors (Classic Black, Emerald Green, Indigo, Crimson).
   - High-res PNG & vector SVG downloads.
5. **Passcode-Protected Short Links**
   - Create private links that require a visitor to enter a secret PIN on a clean unlock gate before redirecting.
6. **Self-Destruct & Limits**
   - Optional expiration date and time.
   - Optional maximum click limits (e.g. auto-expire after 50 clicks).
7. **UTM Campaign Builder**
   - Attach `utm_source`, `utm_medium`, and `utm_campaign` tags with one-click live preview.
8. **Real-Time Click Analytics & Insights**
   - Interactive 7-day click timeline chart.
   - Geographic country breakdown (using Cloudflare edge geo headers).
   - Top referrers (Direct, Twitter/X, Reddit, LinkedIn, Google, etc.).
   - Devices & operating system breakdown.
   - Real-time click log.
9. **Bulk Shortening & 1-Click CSV Export**
   - Shorten dozens of links at once.
   - Export all links, destination targets, and click counts to a CSV spreadsheet.
10. **Dual-Mode Architecture**
    - **Local Mode**: Runs locally with zero dependencies using Node 22 native `node:sqlite`.
    - **Cloudflare Edge Mode**: Deploys as a Cloudflare Pages Function on global edge workers with Cloudflare D1 SQL.

---

## 🚀 Quick Start (Local Development)

The local development server has **zero external npm dependencies** and uses Node.js 22's built-in SQLite engine and HTTP server.

```bash
# Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- On first launch, you will be prompted to set your **Master Admin Passcode**.
- Once set, you can immediately begin creating short links, generating QR codes, and tracking clicks!

---

## ☁️ Deploying Free to Cloudflare Pages & D1

Cloudflare Pages provides global edge hosting with sub-15ms redirect speeds and 100,000 free requests per day.

### Step 1: Login to Wrangler
```bash
npx wrangler login
```

### Step 2: Create your free Cloudflare D1 Database
```bash
npx wrangler d1 create omnilink-db
```
*Copy the `database_id` output by Wrangler and paste it into `wrangler.toml`:*
```toml
[[d1_databases]]
binding = "DB"
database_name = "omnilink-db"
database_id = "YOUR_DATABASE_ID"
```

### Step 3: Initialize Database Schema
```bash
npm run d1:init
```

### Step 4: Deploy
```bash
npm run deploy
```

Once deployed, Cloudflare will give you a free `*.pages.dev` URL (e.g. `https://omnilink.pages.dev`). You can also attach any custom domain for free in your Cloudflare dashboard!

---

## 📁 Project Structure

```
├── functions/               # Cloudflare Pages Functions (Edge Runtime)
│   ├── [slug].js            # Edge dynamic redirect router & click recorder
│   ├── _utils.js            # Cryptographic hashing, user-agent parser, URL validator
│   └── api/
│       ├── auth.js          # Master admin passcode authentication
│       ├── export.js        # CSV export endpoint
│       ├── verify-gate.js   # Passcode gate verification
│       ├── links/
│       │   ├── index.js     # List & create short links (single & bulk)
│       │   └── [id].js      # Edit, delete, and toggle status
│       └── analytics/
│           └── [id].js      # Aggregated metrics, timeline, and geo breakdown
├── public/                  # Frontend Application Assets
│   ├── index.html           # Minimalist SaaS dashboard UI
│   ├── style.css            # Dark/Light theme design system
│   ├── app.js               # Client application logic & chart rendering
│   ├── qr-code.js           # Self-contained QR code generator engine
│   └── gate.html            # Visitor passcode unlock gate
├── schema.sql               # SQLite / D1 database table definitions
├── local-server.js          # Zero-dependency local Node.js server
├── wrangler.toml            # Cloudflare Pages & D1 configuration
└── package.json             # Project scripts and metadata
```

---

## 🛡️ Admin Passcode & Security

- To set or change your Admin Passcode, click the **Lock** icon in the top-right navigation bar of the dashboard.
- If you deploy to Cloudflare, you can optionally set an `ADMIN_KEY` environment variable in the Cloudflare Pages settings to lock the dashboard globally.

---

## 🧪 Testing

Run automated tests to verify the local server, database operations, redirects, protocol handling, and analytics:

```bash
npm test
```
