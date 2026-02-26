/* ============================================
   Quote Sleep Screen Generator — App Logic
   ============================================ */

// --- Output Configuration (extensible) ---
const OUTPUT_CONFIG = {
  width: 480,
  height: 800,
  format: 'bmp',
  padding: 40,
  lineHeightMultiplier: 1.6,
  supersampleScale: 3,
};

// --- Font Definitions (diverse categories) ---
const FONTS = [
  // Serif — classic book fonts
  { name: 'Literata', family: '"Literata", Georgia, serif', label: 'Literata — Serif, e-reading', category: 'Serif' },
  { name: 'Libre Baskerville', family: '"Libre Baskerville", Georgia, serif', label: 'Libre Baskerville — Serif, classic', category: 'Serif' },
  { name: 'Playfair Display', family: '"Playfair Display", Georgia, serif', label: 'Playfair Display — Serif, dramatic', category: 'Serif' },

  // Sans-serif — clean and modern
  { name: 'Nunito', family: '"Nunito", "Helvetica Neue", sans-serif', label: 'Nunito — Sans-serif, rounded', category: 'Sans-serif' },
  { name: 'Raleway', family: '"Raleway", "Helvetica Neue", sans-serif', label: 'Raleway — Sans-serif, elegant', category: 'Sans-serif' },
  { name: 'Atkinson Hyperlegible', family: '"Atkinson Hyperlegible", Arial, sans-serif', label: 'Atkinson Hyperlegible — Accessible', category: 'Sans-serif' },

  // Cursive & Handwriting
  { name: 'Dancing Script', family: '"Dancing Script", cursive', label: 'Dancing Script — Cursive, flowing', category: 'Cursive' },
  { name: 'Caveat', family: '"Caveat", cursive', label: 'Caveat — Handwriting, casual', category: 'Handwriting' },

  // Monospace — typewriter feel
  { name: 'Courier Prime', family: '"Courier Prime", "Courier New", monospace', label: 'Courier Prime — Monospace, typewriter', category: 'Monospace' },

  // Dyslexia-friendly
  { name: 'OpenDyslexic', family: '"Open Dyslexic", "OpenDyslexic", Comic Sans MS, sans-serif', label: 'OpenDyslexic — Dyslexia-friendly', category: 'Accessibility' },
];

// --- DOM References ---
const quoteInput = document.getElementById('quoteInput');
const fontSelect = document.getElementById('fontSelect');
const alignmentGroup = document.getElementById('alignmentGroup');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const downloadBtn = document.getElementById('downloadBtn');
const boldBtn = document.getElementById('boldBtn');
const italicBtn = document.getElementById('italicBtn');
const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');

// --- Offscreen canvas for supersampled rendering ---
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d');

// --- State ---
let currentAlignment = 'center';
let isBold = false;
let isItalic = false;

// --- Initialize ---
function init() {
  const { width, height, supersampleScale } = OUTPUT_CONFIG;

  // Set output canvas dimensions
  canvas.width = width;
  canvas.height = height;

  // Set offscreen canvas to supersampled dimensions
  offscreenCanvas.width = width * supersampleScale;
  offscreenCanvas.height = height * supersampleScale;

  // Populate font dropdown with categories
  let currentCategory = '';
  FONTS.forEach((font, i) => {
    // Add optgroup for categories
    if (font.category !== currentCategory) {
      currentCategory = font.category;
    }
    const option = document.createElement('option');
    option.value = i;
    option.textContent = font.label;
    option.style.fontFamily = font.family;
    fontSelect.appendChild(option);
  });

  // Bind events
  quoteInput.addEventListener('input', render);
  fontSelect.addEventListener('change', render);
  fontSizeSlider.addEventListener('input', onFontSizeChange);
  downloadBtn.addEventListener('click', downloadBMP);

  // Alignment buttons
  alignmentGroup.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      alignmentGroup.querySelector('.active').classList.remove('active');
      btn.classList.add('active');
      currentAlignment = btn.dataset.align;
      render();
    });
  });

  // Bold / Italic toggle buttons (independent toggles, not mutually exclusive)
  boldBtn.addEventListener('click', () => {
    isBold = !isBold;
    boldBtn.classList.toggle('active', isBold);
    render();
  });

  italicBtn.addEventListener('click', () => {
    isItalic = !isItalic;
    italicBtn.classList.toggle('active', isItalic);
    render();
  });

  // Initial render
  render();
}

function onFontSizeChange() {
  fontSizeValue.textContent = fontSizeSlider.value + 'px';
  render();
}

// --- Build CSS Font String ---
function buildFontString(fontSize, fontFamily) {
  const style = isItalic ? 'italic' : 'normal';
  const weight = isBold ? '700' : '400';
  return `${style} ${weight} ${fontSize}px ${fontFamily}`;
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

// --- Canvas Rendering (with supersampling) ---
function render() {
  const { width, height, padding, lineHeightMultiplier, supersampleScale } = OUTPUT_CONFIG;
  const S = supersampleScale;

  // --- Step 1: Render text at high resolution on offscreen canvas ---
  const hiWidth = width * S;
  const hiHeight = height * S;
  const hiPadding = padding * S;

  // Clear offscreen to white
  offCtx.fillStyle = '#FFFFFF';
  offCtx.fillRect(0, 0, hiWidth, hiHeight);

  // Get settings
  const fontIndex = parseInt(fontSelect.value, 10);
  const font = FONTS[fontIndex];
  const fontSize = parseInt(fontSizeSlider.value, 10);
  const hiFontSize = fontSize * S;
  const hiLineHeight = Math.round(hiFontSize * lineHeightMultiplier);

  // Get text (use placeholder if empty)
  let text = quoteInput.value;
  if (!text.trim()) {
    text = 'The only thing that you absolutely have to know, is the location of the library.\n\n— Albert Einstein';
  }

  // Set font on offscreen context (scaled up) with bold/italic
  offCtx.font = buildFontString(hiFontSize, font.family);
  offCtx.fillStyle = '#000000';
  offCtx.textBaseline = 'top';

  // Set alignment
  const hiMaxWidth = hiWidth - hiPadding * 2;
  let xPos;
  if (currentAlignment === 'left') {
    offCtx.textAlign = 'left';
    xPos = hiPadding;
  } else if (currentAlignment === 'right') {
    offCtx.textAlign = 'right';
    xPos = hiWidth - hiPadding;
  } else {
    offCtx.textAlign = 'center';
    xPos = hiWidth / 2;
  }

  // Wrap text using offscreen context for accurate measurement
  const lines = wrapText(offCtx, text, hiMaxWidth);
  const totalTextHeight = lines.length * hiLineHeight;

  // Vertically center
  let yStart = Math.max(hiPadding, (hiHeight - totalTextHeight) / 2);

  // Draw lines on offscreen canvas
  for (let i = 0; i < lines.length; i++) {
    offCtx.fillText(lines[i], xPos, yStart + i * hiLineHeight);
  }

  // --- Step 2: Downscale to preview canvas ---
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(offscreenCanvas, 0, 0, hiWidth, hiHeight, 0, 0, width, height);
}

// --- BMP Encoder (24-bit uncompressed, grayscale) ---
function encodeBMP() {
  const { width, height } = OUTPUT_CONFIG;

  // Read from the preview canvas (supersampled + downscaled)
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // BMP row padding: each row must be a multiple of 4 bytes
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 14 + 40 + pixelDataSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // --- File Header (14 bytes) ---
  view.setUint8(0, 0x42);  // 'B'
  view.setUint8(1, 0x4D);  // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true);

  // --- DIB Header (BITMAPINFOHEADER, 40 bytes) ---
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

  // --- Pixel Data (bottom-up, BGR, grayscale) ---
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
