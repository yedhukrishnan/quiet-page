# 📖 QuietPage

**Beautiful quote screens for your e-reader.**

QuietPage is a simple, open-source web app that generates quote images optimized for e-readers — output as 480×800 grayscale BMP files, ready to use as sleep/lock screens on your tiny e-ink devices.

![QuietPage Screenshot](https://raw.githubusercontent.com/yedhukrishnan/quiet-page/main/screenshot.png)

## ✨ Features

- **1,700+ Google Fonts** — searchable picker with category filters (Serif, Sans, Handwriting, Monospace)
- **10 curated featured fonts** — work out of the box, no API key needed
- **Live canvas preview** — see changes in real-time as you type
- **Supersampled rendering** — 3× oversampling for crisp, anti-aliased text
- **Bold & Italic** styles
- **Text alignment** — left, center, right
- **Border styles** — none, simple, double, ornate
- **Optional footer text** — add your name, device name, email, etc.
- **BMP download** — 480×800 grayscale, optimized for e-ink displays

## 🚀 Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/yedhukrishnan/quiet-page.git
   cd quote-page
   ```

2. Open `index.html` in your browser — that's it! No build tools or dependencies required.

3. *(Optional)* To unlock 1,700+ Google Fonts, add a free API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the **Web Fonts Developer API**
   - Create an API key (restrict to HTTP referrers + Fonts API only)
   - Paste it into `app.js` line 10:
     ```js
     const GOOGLE_FONTS_API_KEY = 'REPLACE_WITH_YOUR_GOOGLE_FONTS_API_KEY';
     ```

## 🤝 Contributing

Contributions are welcome! Feel free to:

- **Open an issue** for bug reports or feature requests
- **Submit a pull request** with improvements or fixes
- **Fork the project** and make it your own

### How to contribute

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 📬 Contact

**Yedhu Krishnan**
- Email: [dev@yedhu.me](mailto:dev@yedhu.me)
- GitHub: [@yedhukrishnan](https://github.com/yedhukrishnan)
