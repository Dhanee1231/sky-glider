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
