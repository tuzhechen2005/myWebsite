#!/usr/bin/env bash
# encode-intro.sh (run in reel-src/): web copies of the kinetic reel for the entry page for site/assets/reel/: 1600x900 (~1.3 Mbps) and 960x540 (~0.6 Mbps), 2-pass
set -e
mkdir -p ../site/assets/reel
enc() { # w h vbit abit out
  ffmpeg -v error -y -framerate 30 -i out/frames_k/f%05d.jpg -vf "scale=$1:$2:flags=lanczos" -c:v libx264 -preset slow -profile:v high -b:v $3 -pass 1 -passlogfile out/pi -an -f null /dev/null
  ffmpeg -v error -y -framerate 30 -i out/frames_k/f%05d.jpg -i assets/kinetic.m4a -map 0:v -map 1:a -vf "scale=$1:$2:flags=lanczos" -c:v libx264 -preset slow -profile:v high -b:v $3 -pass 2 -passlogfile out/pi -pix_fmt yuv420p -c:a aac -b:a $4 -shortest -movflags +faststart $5
  rm -f out/pi*
}
enc 1600 900 1300k 128k ../site/assets/reel/work-reel-26.mp4
enc 960 540 600k 96k ../site/assets/reel/work-reel-26-540.mp4
