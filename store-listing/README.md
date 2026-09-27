# Play Store listing images

| File | Play Console slot | Size |
|---|---|---|
| `icon-512.png` | App icon | 512 × 512 |
| `feature-graphic-1024x500.png` | Feature graphic | 1024 × 500 |
| `phone-1` … `phone-7` | Phone screenshots, in upload order | 1080 × 1920 |
| `kidrota-demo-landscape.mp4` | Promo video — upload to YouTube, paste the link | 1920 × 1080, 31 s |
| `kidrota-demo-portrait.mp4` | Shorts / Reels / TikTok | 1080 × 1920, 31 s |
| `voice-samples/` | The voice-over line in six voices, for choosing one | — |

The screenshots and videos are real captures of the app running on demo data (two
children, three holidays), framed with a caption.

The videos carry a voice-over made with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx)
(an open-weights text-to-speech model, voice `bf_isabella`) and a backing track that
`music.py` synthesises from scratch, so there is no third-party music to license.
The music ducks automatically under the voice.

## Regenerating

After UI changes, from `store-listing/generator/`:

```bash
npm i --no-save playwright sharp ffmpeg-static
(cd ../.. && npx vite --port 5173) &   # the app's dev server
node capture.mjs light && node capture.mjs dark   # raw screens → shots/
node compose.mjs                                  # framed images → store-listing/
pip install kokoro-onnx soundfile numpy
mkdir -p kokoro vo && U=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
curl -sSL -o kokoro/kokoro.onnx $U/kokoro-v1.0.onnx && curl -sSL -o kokoro/voices.bin $U/voices-v1.0.bin
python3 voiceover.py . bf_isabella                   # voice lines → vo/  (swap the voice here)
node record.mjs                                   # walkthrough, each scene held for its line → video/
node compose-video.mjs                            # framed videos → store-listing/
```

`seed.mjs` holds the demo plan, loaded through the app's own backup import.
Captions live in the `slides` table in `compose.mjs` and `CAPTIONS` in
`compose-video.mjs`; the spoken script is `LINES` in `voiceover.py`; the video's
taps and pauses are the steps in `record.mjs`. Re-run `voiceover.py` before
`record.mjs` whenever the script changes, as scene lengths follow the voice.
