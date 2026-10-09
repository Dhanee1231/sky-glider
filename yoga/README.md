# Yoga Coach · Coach Sunny

A beginner yoga & stretching coach for a grown-up and a child. It's a static web app with no build step and is served from `/sky-glider/yoga/`.

- `index.html`, `style.css`, `app.js` hold the UI and screens.
- `poses.js` holds 19 poses (figure keyframes, cues, mistakes, modifications, muscles), the 4-week Journey, and the routines.
- `figure.js` is the cartoon figure (forward kinematics) and the animated demo timeline.
- `rules.js` holds the posture rules (joint angles and alignment) for 13 camera-checkable poses.
- `camera.js` handles on-device pose tracking with MediaPipe Pose Landmarker (lite). The video is never uploaded or stored.
- `store.js` handles localStorage progress for each profile: sessions, poses, muscles, badges, and flex log.
- `coach.js` covers the Web Speech voice, captions, synthesized sounds, and confetti.
- `vendor/` holds the vendored @mediapipe/tasks-vision 1.1.0 and the pose_landmarker_lite model (Apache-2.0). See vendor/NOTICE.txt.
- `sw.js` is the offline cache `yoga-coach-v1`. It only handles requests in this folder and only touches `yoga-coach-*` caches.

## v2 (October 2026)
- **Natural coach voice**: every scripted line (pose cues, steps, stories, breathing, counts, corrections, encouragement) is pre-recorded with the open-source Kokoro-82M neural TTS (Apache-2.0) in two voices (Sunny, female; Sam, male). Clips live in `media/voice/<voice>/` (Opus, mono, ~32 kbps) with an `index.json`; `voice.js` splits a line into sentences, maps each to a clip (`speechtext.js`, FNV hash of the normalized sentence) and plays them in a queue with synced captions. Music/sound effects duck while the coach talks. Lines without a clip fall back to the browser's best natural/enhanced voice. All fixed lines live in `lines.js`; regenerate with `tools/build-catalog.mjs` + `tools/gen_tts.py`.
- **Real-person demos**: `media.js` + `media/video` (7 looping clips) and `media/photo` (8 photos with a slow zoom). 🎥 Real / 🎨 Animated toggle on every demo; default is saved in Settings. Credits: `media/CREDITS.md` and the in-app Credits screen.
- **New animated coach**: shaded, proportioned figure with tapered limbs, clothing, breathing motion, ease-in-out cubic keyframes with follow-through, a room background and mat, rendered at up to 3× pixel density.
- **Light / Dark / Auto** appearance saved per profile; accessible accent tokens (all text/button pairs ≥ 4.5:1).
- **Coaching flow**: optional warm-up and cool-down, "Up next" rest screens, "five more seconds" cue, end-session confirmation, auto-pause when the phone locks, screen kept awake during sessions, back button in the header.
- **Camera coaching**: one clear fix at a time (large banner), praise while steady, 3-2-1 countdown before the timer, framing outline when you step out of view, side-view tip.
- Service worker cache `yoga-coach-v2` (reuses the v1 model files; media and voice clips cached on demand). Progress stays in `yogaCoach.v1`.
