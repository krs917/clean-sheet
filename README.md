# Clean Sheet — player cards

Static site. No server, no build step. Host it free on GitHub Pages.

```
clean-sheet/
├── index.html                  ← the card builder (self-contained)
├── card-export.js              ← used by the builder's export buttons
├── assets/player-photo.jpg     ← default photo shown before an upload
└── cards/
    ├── sam-rivera-2027.html    ← one file per player (exported from the builder)
    └── sam-rivera-2027.png     ← that player's link-preview image
```

## Put it online

1. Create a repo named `clean-sheet` on GitHub (public).
2. Upload these files, keeping the folder structure above. GitHub's web uploader accepts drag-and-drop of the whole folder.
3. Settings → Pages → Source: **Deploy from a branch**, Branch: `main`, folder `/ (root)` → Save.
4. Wait ~60 seconds. The site is live at `https://<your-username>.github.io/clean-sheet/`.

## Add a player

1. Open `https://<your-username>.github.io/clean-sheet/` and click **Edit card**.
2. Upload a photo and fill in the fields. Set **Site URL** to your Pages address (`https://<your-username>.github.io/clean-sheet`) — it's what the share link and QR code point at.
3. Click **Download card file** and **Download link preview**. You get two files, e.g. `sam-rivera-2027.html` and `sam-rivera-2027.png`.
4. Commit both into `cards/`.
5. The card is live at `https://<your-username>.github.io/clean-sheet/cards/sam-rivera-2027.html`.

Text that link to anyone: iMessage, WhatsApp, Slack and Twitter read the tags baked into the file and show the player's name, position, class year and the preview image. The photo is embedded in the HTML, so the card also works if someone saves the file.

## Notes

- Editing in the builder saves to that browser only. The exported file is the shareable artifact.
- Highlight links: YouTube and Vimeo embed and play inside the card. Hudl doesn't allow embedding — for Hudl, the film tab needs to become an outbound link instead.
- Preview images are read fresh by each platform but cached hard afterwards. If you re-export a player's PNG, add `?v=2` to the link you send, or rename the file.
- Custom domain (e.g. `cards.example.com`) works: Settings → Pages → Custom domain, then update Site URL and re-export the player files so the baked-in URLs match.
