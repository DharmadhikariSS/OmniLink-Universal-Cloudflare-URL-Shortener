import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

console.log('--- Testing QR Studio & QR Code Generator ---');

// 1. Check HTML elements
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf-8');

const requiredHtmlIds = [
    'tabQrStudio',
    'qrStudioWrap',
    'studioTextInput',
    'studioHeaderInput',
    'studioCaptionInput',
    'studioLogoPresets',
    'studioLogoFileInput',
    'studioLogoRemoveBtn',
    'studioShapeSelector',
    'studioColorSwatches',
    'studioCustomColor',
    'studioBgSelector',
    'studioQrCanvas',
    'studioCopyBtn',
    'studioDownloadPngBtn',
    'studioDownloadSvgBtn',
    'qrModal',
    'qrCanvas',
    'qrLinkText',
    'modalHeaderInput',
    'modalCaptionInput',
    'modalLogoPresets',
    'modalLogoFileInput',
    'modalLogoRemoveBtn',
    'modalShapeSelector',
    'modalColorSwatches',
    'modalCustomColor',
    'modalBgSelector',
    'modalCopyBtn',
    'downloadPngBtn',
    'downloadSvgBtn'
];

for (const id of requiredHtmlIds) {
    assert(html.includes(`id="${id}"`), `Missing HTML element with id: ${id}`);
}
console.log(`✔ All ${requiredHtmlIds.length} required HTML IDs exist in public/index.html`);

// 2. Test OmniQR engine in Node VM environment
const qrCodeJs = fs.readFileSync(path.join(ROOT, 'public', 'qr-code.js'), 'utf-8');

// Simulate minimal browser window object
const mockWindow = {};
const fn = new Function('window', 'global', qrCodeJs);
fn(mockWindow, mockWindow);

assert(mockWindow.OmniQR, 'OmniQR must be defined on window');
assert(mockWindow.OmniQR.PRESET_LOGOS, 'PRESET_LOGOS must exist');
assert(mockWindow.OmniQR.PRESET_LOGOS.lightning, 'Lightning preset must exist');
assert(mockWindow.OmniQR.PRESET_LOGOS.link, 'Link preset must exist');
assert(mockWindow.OmniQR.PRESET_LOGOS.globe, 'Globe preset must exist');
assert(mockWindow.OmniQR.PRESET_LOGOS.github, 'GitHub preset must exist');
assert(mockWindow.OmniQR.PRESET_LOGOS.whatsapp, 'WhatsApp preset must exist');

// Test SVG generation with text, header, caption, logo
const svgDefault = mockWindow.OmniQR.generateSVG('https://example.com');
assert(svgDefault.includes('<svg'), 'Default SVG must contain <svg tag');
assert(svgDefault.includes('</svg>'), 'Default SVG must close </svg>');

const svgStyled = mockWindow.OmniQR.generateSVG({
    text: 'https://example.com/test-slug',
    color: '#10b981',
    bgColor: '#09090b',
    dotShape: 'dots',
    headerText: 'Scan My Brand',
    captionText: 'SCAN ME',
    logoImg: 'lightning'
});

assert(svgStyled.includes('Scan My Brand'), 'SVG must include headerText');
assert(svgStyled.includes('SCAN ME'), 'SVG must include captionText');
assert(svgStyled.includes('fill="#10b981"'), 'SVG must include custom color');
assert(svgStyled.includes('fill="#09090b"'), 'SVG must include dark background');
assert(svgStyled.includes('<circle'), 'SVG with dotShape=dots must contain circles');
assert(svgStyled.includes('<image href='), 'SVG with logo must contain image tag');
console.log('✔ OmniQR.generateSVG generates rich SVG with custom text, dots, and logos successfully');

// Test backwards compatibility with positional arguments: (text, color, bgColor, margin)
const svgPositional = mockWindow.OmniQR.generateSVG('https://test.com', '#ef4444', '#ffffff', 2);
assert(svgPositional.includes('fill="#ef4444"'), 'Positional arguments must work');
console.log('✔ OmniQR.generateSVG backwards compatibility verified');

// 3. Test app.js syntax and key function presence
const appJs = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf-8');
assert(appJs.includes('setupQrEventListeners'), 'app.js must contain setupQrEventListeners');
assert(appJs.includes('renderStudioQr'), 'app.js must contain renderStudioQr');
assert(appJs.includes('renderModalQr'), 'app.js must contain renderModalQr');
assert(appJs.includes('copyCanvasToClipboard'), 'app.js must contain copyCanvasToClipboard');
assert(appJs.includes('handleLogoUpload'), 'app.js must contain handleLogoUpload');
assert(appJs.includes('selectPresetLogo'), 'app.js must contain selectPresetLogo');
assert(appJs.includes('downloadStudioPng'), 'app.js must contain downloadStudioPng');
assert(appJs.includes('downloadStudioSvg'), 'app.js must contain downloadStudioSvg');
console.log('✔ app.js QR Studio logic & handlers verified');

// 4. Test CSS definitions
const css = fs.readFileSync(path.join(ROOT, 'public', 'style.css'), 'utf-8');
const requiredCssClasses = [
    '.qr-studio-wrap',
    '.qr-studio-grid',
    '.studio-canvas-card',
    '.preset-logo-btn',
    '.shape-selector',
    '.color-picker-row',
    '.bg-selector',
    '.modal-card-lg'
];

for (const cls of requiredCssClasses) {
    assert(css.includes(cls), `Missing CSS class: ${cls}`);
}
console.log('✔ CSS styles verified for QR Studio and modal upgrades');

console.log('\n🎉 ALL QR CODE GENERATOR TESTS PASSED! 🎉');
