# Mendi All-in-One Utility

A mobile-friendly utility web app built with plain HTML, CSS, and JavaScript. Most tools run locally in your browser; no account or backend is required.

## Included tools

- Basic Calculator
- Percentage Calculator
- Unit Converter (length, weight, temperature)
- Number Base Converter
- Text Case Converter
- Text Cleaner
- Word Counter
- JSON Formatter / Minifier
- URL Encoder / Decoder
- Base64 Encoder / Decoder
- UUID Generator
- Unix Timestamp Converter
- Countdown Timer
- Stopwatch
- Date Difference Calculator
- Age Calculator
- Local Notes
- Checklist
- QR Generator (requires internet and sends entered content to an external QR image service)
- File Type Lookup

Also includes search, categories, favourites, recent tools, dark/light theme, local storage, and a basic service worker for offline caching.

## Run locally

Open `index.html` in a browser. Some browser features, especially service workers and PWA installation, require `localhost` or HTTPS. GitHub Pages provides HTTPS.

## Publish on GitHub Pages

1. Create a public repository.
2. Upload the files while keeping the folder structure.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Choose branch `main` and folder `/ (root)`, then Save.
6. Wait for the published URL to appear.

## Notes and limitations

- This project does not include the requested Grammar Checker.
- QR generation uses `api.qrserver.com`, so QR creation requires internet and the text/URL is sent to that third-party service. Do not submit sensitive information.
- The other included text processing and calculation tools work locally.
- Notes, checklist items, favourites, and theme preference are stored in this browser on this device. Clearing browser data can erase them.
- This is a web app, not an Android APK. An APK wrapper can be added as a separate step later.
- The app is a starter MVP; test calculations and UI on your device before relying on it.
