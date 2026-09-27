# Renders the voice-over, one clip per story beat, with the open Kokoro model.
import json, sys, soundfile as sf
from kokoro_onnx import Kokoro
DIR = sys.argv[1]
VOICE = sys.argv[2] if len(sys.argv) > 2 else 'bf_isabella'
LINES = {
    'home':   'Summer holidays coming up? KidRota plans every week of them.',
    'grid':   'Any gaps in your childcare show up in red, so nothing slips through.',
    'day':    'Tap a gap, then pick Gran, the holiday club, or a playdate.',
    'filled': 'Done. The week updates straight away.',
    'list':   'See every day, for every child, in one simple list.',
    'share':  'Then share the plan with the other parent, in a couple of taps.',
    'end':    'KidRota. School holiday childcare, sorted.',
}
k = Kokoro(f'{DIR}/kokoro/kokoro.onnx', f'{DIR}/kokoro/voices.bin')
out = {}
for key, text in LINES.items():
    samples, rate = k.create(text, voice=VOICE, speed=1.05, lang='en-gb')
    sf.write(f'{DIR}/vo/{key}.wav', samples, rate)
    out[key] = len(samples) / rate
json.dump(out, open(f'{DIR}/vo/durations.json', 'w'), indent=1)
print(VOICE, out)
