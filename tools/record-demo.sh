#!/bin/bash
# Quay video demo có tiếng: Xvfb + PulseAudio ảo + Chrome kiosk + ffmpeg
OUT=${OUT:-$(pwd)/demo-out}; mkdir -p "$OUT"
PAGE=${1:-tiktok}; DUR=${2:-32}
cd "$(dirname "$0")/.."
node server.js > /tmp/srv.log 2>&1 & SRV=$!
export DISPLAY=:99
Xvfb :99 -screen 0 720x1280x24 >/dev/null 2>&1 & XV=$!
sleep 1
pulseaudio -D --exit-idle-time=-1 2>/dev/null; sleep 1
pactl load-module module-null-sink sink_name=rec >/dev/null 2>&1; pactl set-default-sink rec
google-chrome --no-sandbox --no-first-run --disable-gpu --test-type --lang=vi --disable-features=Translate,TranslateUI --disable-infobars --autoplay-policy=no-user-gesture-required --kiosk \
  --window-position=0,0 --window-size=720,1280 --user-data-dir=/tmp/chr-rec http://localhost:3000/$PAGE >/dev/null 2>&1 & CH=$!
sleep 5
( sleep 15; curl -s "localhost:3000/test/$PAGE/gift?name=H%E1%BA%A3i%20%C4%90%C4%83ng&gift=S%C6%B0%20t%E1%BB%AD&coins=299" >/dev/null ) &
ffmpeg -v error -y -f x11grab -video_size 720x1280 -framerate 30 -i :99 -f pulse -i rec.monitor -t $DUR \
  -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p -c:a aac -b:a 128k $OUT/demo-$PAGE.mp4
kill $CH $SRV $XV 2>/dev/null
pulseaudio -k 2>/dev/null
echo "xong: $OUT/demo-$PAGE.mp4"
