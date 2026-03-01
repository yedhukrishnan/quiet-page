/* ============================================
   QuietPage — App Logic
   Google Fonts API + Canvas Rendering
   ============================================ */

// --- Google Fonts API Key ---
// Get yours free at: https://console.cloud.google.com/apis/credentials
// Enable "Web Fonts Developer API" and restrict the key to HTTP referrers
const GOOGLE_FONTS_API_KEY = 'AIzaSyDrmjA3kI6EAkesUvc-qi6IYREzcac5CuY';  // Paste your API key here

// --- Output Configuration (extensible) ---
const OUTPUT_CONFIG = {
  width: 480,
  height: 800,
  format: 'bmp',
  padding: 40,
  lineHeightMultiplier: 1.6,
};

// --- Featured / Curated Fonts ---
const FEATURED_FONTS = [
  { family: 'Literata', category: 'serif', featured: true },
  { family: 'Libre Baskerville', category: 'serif', featured: true },
  { family: 'Playfair Display', category: 'serif', featured: true },
  { family: 'Nunito', category: 'sans-serif', featured: true },
  { family: 'Raleway', category: 'sans-serif', featured: true },
  { family: 'Atkinson Hyperlegible', category: 'sans-serif', featured: true },
  { family: 'Dancing Script', category: 'handwriting', featured: true },
  { family: 'Caveat', category: 'handwriting', featured: true },
  { family: 'Courier Prime', category: 'monospace', featured: true },
  { family: 'OpenDyslexic', category: 'sans-serif', featured: true, local: true },
];

// --- DOM References ---
const quoteInput = document.getElementById('quoteInput');
const fontPicker = document.getElementById('fontPicker');
const fontPickerTrigger = document.getElementById('fontPickerTrigger');
const fontPickerLabel = document.getElementById('fontPickerLabel');
const fontPickerDropdown = document.getElementById('fontPickerDropdown');
const fontSearch = document.getElementById('fontSearch');
const fontCategories = document.getElementById('fontCategories');
const fontList = document.getElementById('fontList');
const fontStatus = document.getElementById('fontStatus');
const alignmentGroup = document.getElementById('alignmentGroup');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const downloadBtn = document.getElementById('downloadBtn');
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const borderGroup = document.getElementById('borderGroup');
const footerInput = document.getElementById('footerInput');
const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');

// --- Export canvas for raw 1x BMP rendering ---
const exportCanvas = document.createElement('canvas');
const exportCtx = exportCanvas.getContext('2d');

// --- State ---
let currentAlignment = 'center';
let currentBorder = 'none';
let isBold = false;
let isItalic = false;
let currentFont = FEATURED_FONTS[0]; // default: Literata
let allFonts = [];           // full catalog after API fetch
let filteredFonts = [];      // current search+filter results
let currentCategory = 'all';
let loadedFontLinks = {};    // track loaded <link> tags to avoid duplicates

// --- Initialize ---
function init() {
  const { width, height } = OUTPUT_CONFIG;

  // Set visual CSS size for the preview canvas
  canvas.style.width = '100%';
  canvas.style.maxWidth = width + 'px';
  // Scale actual resolution for retina displays
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // Set export canvas to exact physical dimensions (480x800)
  exportCanvas.width = width;
  exportCanvas.height = height;

  // Bind events
  quoteInput.addEventListener('input', render);
  fontSizeSlider.addEventListener('input', onFontSizeChange);
  downloadBtn.addEventListener('click', downloadBMP);

  // Font picker toggle
  fontPickerTrigger.addEventListener('click', toggleFontPicker);

  // Search input
  fontSearch.addEventListener('input', () => {
    filterFonts();
    renderFontList();
  });

  // Prevent clicks inside dropdown from closing it
  fontPickerDropdown.addEventListener('mousedown', (e) => {
    e.preventDefault(); // prevent blur
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!fontPicker.contains(e.target)) {
      closeFontPicker();
    }
  });

  // Category filter buttons
  fontCategories.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      fontCategories.querySelector('.active').classList.remove('active');
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      filterFonts();
      renderFontList();
    });
  });

  // Alignment buttons
  alignmentGroup.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      alignmentGroup.querySelector('.active').classList.remove('active');
      btn.classList.add('active');
      currentAlignment = btn.dataset.align;
      render();
    });
  });

  // Bold / Italic toggle buttons
  boldBtn.addEventListener('click', () => {
    isBold = !isBold;
    boldBtn.classList.toggle('active', isBold);
    ensureFontLoaded();
  });

  italicBtn.addEventListener('click', () => {
    isItalic = !isItalic;
    italicBtn.classList.toggle('active', isItalic);
    ensureFontLoaded();
  });

  // Border buttons
  borderGroup.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      borderGroup.querySelector('.active').classList.remove('active');
      btn.classList.add('active');
      currentBorder = btn.dataset.border;
      render();
    });
  });

  // Footer input
  footerInput.addEventListener('input', render);

  // Load fonts catalog, then do initial render
  loadFontsCatalog().then(() => {
    ensureFontLoaded();
  });
}

// --- Font Picker Open/Close ---
function toggleFontPicker() {
  if (fontPicker.classList.contains('open')) {
    closeFontPicker();
  } else {
    openFontPicker();
  }
}

function openFontPicker() {
  fontPicker.classList.add('open');
  fontSearch.value = '';
  filterFonts();
  renderFontList();
  // Focus search after a tick so dropdown is visible
  setTimeout(() => fontSearch.focus(), 50);
}

function closeFontPicker() {
  fontPicker.classList.remove('open');
}

// --- Load Google Fonts Catalog ---
async function loadFontsCatalog() {
  // Start with featured fonts
  allFonts = [...FEATURED_FONTS];
  filterFonts();
  renderFontList();

  if (!GOOGLE_FONTS_API_KEY) {
    fontStatus.textContent = 'Add API key in app.js for 1,700+ fonts';
    fontStatus.classList.add('visible');
    return;
  }

  try {
    fontStatus.textContent = 'Loading fonts…';
    fontStatus.classList.add('visible');

    const res = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&sort=popularity`
    );

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const featuredNames = new Set(FEATURED_FONTS.map(f => f.family));

    // Merge API fonts, excluding duplicates of featured fonts
    const apiFonts = data.items
      .filter(f => !featuredNames.has(f.family))
      .map(f => ({
        family: f.family,
        category: f.category,
        featured: false,
      }));

    allFonts = [...FEATURED_FONTS, ...apiFonts];
    filterFonts();
    renderFontList();
    fontStatus.classList.remove('visible');
  } catch (err) {
    console.warn('Google Fonts API fetch failed, using curated fonts:', err.message);
    fontStatus.textContent = 'Using curated fonts (API unavailable)';
    fontStatus.classList.add('visible');
  }
}

// --- Filter Fonts by Search + Category ---
function filterFonts() {
  const query = fontSearch.value.trim().toLowerCase();

  filteredFonts = allFonts.filter(f => {
    // Category filter
    if (currentCategory !== 'all' && f.category !== currentCategory) return false;
    // Search filter
    if (query && !f.family.toLowerCase().includes(query)) return false;
    return true;
  });
}

// --- Render Font List in Dropdown ---
function renderFontList() {
  fontList.innerHTML = '';

  if (filteredFonts.length === 0) {
    fontStatus.textContent = 'No fonts match your search';
    fontStatus.classList.add('visible');
    return;
  }

  // If no search query, separate featured from others
  const query = fontSearch.value.trim().toLowerCase();
  const featured = filteredFonts.filter(f => f.featured);
  const others = filteredFonts.filter(f => !f.featured);

  if (featured.length > 0 && !query) {
    const label = document.createElement('div');
    label.className = 'font-group-label';
    label.textContent = '★ Featured';
    fontList.appendChild(label);

    featured.forEach(f => fontList.appendChild(createFontItem(f)));
  }

  if (others.length > 0 && !query) {
    const label = document.createElement('div');
    label.className = 'font-group-label';
    label.textContent = 'All Fonts';
    fontList.appendChild(label);
  }

  const fontsToRender = query ? filteredFonts : others;
  // Limit visible items for performance (render more on scroll)
  const limit = Math.min(fontsToRender.length, 100);
  for (let i = 0; i < limit; i++) {
    fontList.appendChild(createFontItem(fontsToRender[i]));
  }

  if (fontsToRender.length > limit) {
    fontStatus.textContent = `${fontsToRender.length - limit} more — type to search`;
    fontStatus.classList.add('visible');
  } else {
    fontStatus.classList.remove('visible');
  }
}

function createFontItem(font) {
  const btn = document.createElement('button');
  btn.className = 'font-item';
  if (font.family === currentFont.family) {
    btn.classList.add('active');
  }

  let html = '';
  if (font.featured) {
    html += '<span class="font-item-star">★</span> ';
  }
  html += `<span class="font-item-name">${font.family}</span>`;
  html += `<span class="font-item-category">${font.category}</span>`;
  btn.innerHTML = html;

  btn.addEventListener('click', () => selectFont(font));
  return btn;
}

// --- Select a Font ---
async function selectFont(font) {
  currentFont = font;
  fontPickerLabel.textContent = font.family;
  closeFontPicker();

  // Load the font stylesheet, wait for it, then ensure font is loaded
  await loadFontStylesheet(font.family, font.local);
  ensureFontLoaded();
}

// --- Dynamically Load a Google Font ---
function loadFontStylesheet(family, isLocal) {
  if (isLocal || loadedFontLinks[family]) return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@0,400;0,700;1,400;1,700&display=swap`;
    link.onload = () => resolve();
    link.onerror = () => resolve(); // resolve even on error to not block
    document.head.appendChild(link);
    loadedFontLinks[family] = true;
  });
}

// --- Font Size Change ---
function onFontSizeChange() {
  fontSizeValue.textContent = fontSizeSlider.value + 'px';
  render();
}

// --- Ensure font is loaded before rendering ---
function ensureFontLoaded() {
  const family = currentFont.family;
  const weight = isBold ? '700' : '400';
  const style = isItalic ? 'italic' : 'normal';
  const fontSpec = `${style} ${weight} 48px "${family}"`;

  // Render immediately (with fallback font if needed)
  render();

  // Then ensure the real font is loaded and re-render
  if (document.fonts && document.fonts.load) {
    document.fonts.load(fontSpec).then(() => {
      render();
    }).catch(() => {
      // Font load failed, fallback render already done
    });
  }
}

// --- Build CSS Font String ---
function buildFontString(fontSize, fontFamily) {
  const style = isItalic ? 'italic' : 'normal';
  const weight = isBold ? '700' : '400';
  return `${style} ${weight} ${fontSize}px "${fontFamily}", Georgia, serif`;
}

// --- Text Wrapping ---
function wrapText(targetCtx, text, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      const metrics = targetCtx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

// --- Border Drawing ---
function drawBorder(ctx, style, width, height, padding) {
  if (style === 'none') return;

  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';

  const inset = padding * 0.5;

  if (style === 'simple') {
    ctx.lineWidth = Math.round(width * 0.004);
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  } else if (style === 'double') {
    const lineW = Math.round(width * 0.003);
    const gap = lineW * 3;
    ctx.lineWidth = lineW;
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.strokeRect(inset + gap, inset + gap, width - (inset + gap) * 2, height - (inset + gap) * 2);
  } else if (style === 'ornament') {
    const lineW = Math.round(width * 0.003);
    const gap = lineW * 3;
    ctx.lineWidth = lineW;
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.strokeRect(inset + gap, inset + gap, width - (inset + gap) * 2, height - (inset + gap) * 2);
    const cornerSize = gap * 2;
    const corners = [
      [inset, inset],
      [width - inset, inset],
      [inset, height - inset],
      [width - inset, height - inset],
    ];
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - cornerSize);
      ctx.lineTo(cx + cornerSize, cy);
      ctx.lineTo(cx, cy + cornerSize);
      ctx.lineTo(cx - cornerSize, cy);
      ctx.closePath();
      ctx.fill();
    }
    const dotR = lineW * 2;
    const midPoints = [
      [width / 2, inset],
      [width / 2, height - inset],
      [inset, height / 2],
      [width - inset, height / 2],
    ];
    for (const [mx, my] of midPoints) {
      ctx.beginPath();
      ctx.arc(mx, my, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --- Canvas Rendering (optimized for Native Clarity) ---
function render() {
  const { width, height, padding, lineHeightMultiplier } = OUTPUT_CONFIG;

  // 1. Render exactly at 480x800 target resolution for optimum crisp font hinting
  exportCtx.fillStyle = '#FFFFFF';
  exportCtx.fillRect(0, 0, width, height);
  drawBorder(exportCtx, currentBorder, width, height, padding);

  const fontSize = parseInt(fontSizeSlider.value, 10);
  const lineHeight = Math.round(fontSize * lineHeightMultiplier);

  let text = quoteInput.value;
  if (!text.trim()) {
    text = 'The only thing that you absolutely have to know, is the location of the library.\n\n— Albert Einstein';
  }

  const footerText = footerInput.value.trim();
  let footerHeight = 0;
  const footerFontSize = 16;
  if (footerText) {
    footerHeight = footerFontSize * 3;
  }

  exportCtx.font = buildFontString(fontSize, currentFont.family);
  exportCtx.fillStyle = '#000000';
  exportCtx.textBaseline = 'top';

  const maxWidth = width - padding * 2;
  let xPos;
  if (currentAlignment === 'left') {
    exportCtx.textAlign = 'left';
    xPos = padding;
  } else if (currentAlignment === 'right') {
    exportCtx.textAlign = 'right';
    xPos = width - padding;
  } else {
    exportCtx.textAlign = 'center';
    xPos = width / 2;
  }

  // Wrap text using the 1x pixel dimensions so it matches the export
  const lines = wrapText(exportCtx, text, maxWidth);
  const totalTextHeight = lines.length * lineHeight;
  const availableHeight = height - footerHeight;
  let yStart = Math.max(padding, (availableHeight - totalTextHeight) / 2);

  for (let i = 0; i < lines.length; i++) {
    exportCtx.fillText(lines[i], xPos, yStart + i * lineHeight);
  }

  if (footerText) {
    exportCtx.font = `normal 400 ${footerFontSize}px "Atkinson Hyperlegible", Arial, sans-serif`;
    exportCtx.textAlign = 'center';
    exportCtx.textBaseline = 'bottom';
    exportCtx.fillStyle = '#555555';
    exportCtx.fillText(footerText, width / 2, height - padding * 0.6);
  }

  // 2. Render independently to the preview canvas for Retina displays
  const dpr = window.devicePixelRatio || 1;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(dpr, dpr);
  drawBorder(ctx, currentBorder, width, height, padding);

  ctx.font = buildFontString(fontSize, currentFont.family);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';
  ctx.textAlign = exportCtx.textAlign;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], xPos, yStart + i * lineHeight);
  }

  if (footerText) {
    ctx.font = `normal 400 ${footerFontSize}px "Atkinson Hyperlegible", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#555555';
    ctx.fillText(footerText, width / 2, height - padding * 0.6);
  }
  ctx.restore();
}

// --- BMP Encoder (24-bit uncompressed, grayscale) ---
function encodeBMP() {
  const { width, height } = OUTPUT_CONFIG;

  const imageData = exportCtx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 14 + 40 + pixelDataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // File Header (14 bytes)
  view.setUint8(0, 0x42);  // 'B'
  view.setUint8(1, 0x4D);  // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true);

  // DIB Header (BITMAPINFOHEADER, 40 bytes)
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelDataSize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Pixel Data (bottom-up, BGR, grayscale)
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const gray = Math.round(0.299 * pixels[srcIdx] + 0.587 * pixels[srcIdx + 1] + 0.114 * pixels[srcIdx + 2]);
      view.setUint8(offset++, gray); // B
      view.setUint8(offset++, gray); // G
      view.setUint8(offset++, gray); // R
    }
    const rowPadding = rowSize - width * 3;
    for (let p = 0; p < rowPadding; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

// --- Download ---
function downloadBMP() {
  const blob = encodeBMP();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quote-screen.bmp';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', init);
