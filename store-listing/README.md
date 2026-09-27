# Play Store listing images

| File | Play Console slot | Size |
|---|---|---|
| `icon-512.png` | App icon | 512 × 512 |
| `feature-graphic-1024x500.png` | Feature graphic | 1024 × 500 |
| `phone-1` … `phone-7` | Phone screenshots, in upload order | 1080 × 1920 |

The screenshots are real captures of the app running on demo data (two
children, three holidays), framed with a caption.

## Regenerating

After UI changes, from `store-listing/generator/`:

```bash
npm i --no-save playwright sharp
(cd ../.. && npx vite --port 5173) &   # the app's dev server
node capture.mjs light && node capture.mjs dark   # raw screens → shots/
node compose.mjs                                  # framed images → store-listing/
```

`seed.mjs` holds the demo plan, loaded through the app's own backup import.
Captions live in the `slides` table at the top of `compose.mjs`.
