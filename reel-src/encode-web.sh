#!/usr/bin/env bash
# web copy of the showreel: 1600x900, light denoise (paper grain/JPEG noise), 2-pass H.264 1.1 Mbps, AAC 128k, faststart
set -e
VF="hqdn3d=1.5:1.5:4:4,scale=1600:900:flags=lanczos"
ffmpeg -v error -y -framerate 24 -i out/frames/f%05d.jpg -vf "$VF" -c:v libx264 -preset slow -profile:v high -b:v 1100k -pass 1 -passlogfile out/pw -an -f null /dev/null
ffmpeg -v error -y -framerate 24 -i out/frames/f%05d.jpg -i assets/score.m4a -map 0:v -map 1:a -vf "$VF" -c:v libx264 -preset slow -profile:v high -b:v 1100k -pass 2 -passlogfile out/pw -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart ../site/assets/showreel/paper-sea.mp4
rm -f out/pw*
