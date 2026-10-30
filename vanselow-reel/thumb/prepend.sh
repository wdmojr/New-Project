#!/usr/bin/env bash
# Prepend the thumbnail card: 1.5 s hold, then a 0.7 s dissolve into the film's clean first frame;
# the film (and its audio) starts once the dissolve completes. Also embeds the card as cover art.
# Usage: thumb/prepend.sh <in.mp4> <thumb.png> <out.mp4>   (run from vanselow-reel/)
set -euo pipefail
IN=$1; TH=$2; OUT=$3
HOLD=1.5; FADE=0.7
JPG=${TH%.png}.jpg
ffmpeg -v error -y -i "$TH" -q:v 2 "$JPG"
ffmpeg -v error -y -loop 1 -framerate 60 -t $(echo "$HOLD + $FADE" | bc) -i "$TH" -i "$IN" -i "$JPG" \
  -filter_complex "[0:v]format=yuv420p,setsar=1,fps=60,settb=1/60[t];[1:v]format=yuv420p,setsar=1,fps=60,tpad=start_duration=$FADE:start_mode=clone,settb=1/60[f];[t][f]xfade=transition=fade:duration=$FADE:offset=$HOLD[v];[1:a]adelay=$(echo "($HOLD + $FADE) * 1000 / 1" | bc):all=1[a]" \
  -map "[v]" -map "[a]" -map 2 -c:v:0 libx264 -preset slow -crf 16 -pix_fmt yuv420p -r 60 -c:a aac -b:a 192k \
  -c:v:1 copy -disposition:v:1 attached_pic -movflags +faststart "$OUT"
