Scroll-scrubbed intro frames go here as frame-0001.jpg, frame-0002.jpg, …

Extract from a source clip (one-time, local — not a site build step):
  ffmpeg -i input.mp4 -vf "fps=24,scale=1600:-1" -q:v 4 assets/intro/frame-%04d.jpg

Then in js/intro.js set FRAME_COUNT to the number of frames produced.
Until then intro.js draws a procedural placeholder animation.
