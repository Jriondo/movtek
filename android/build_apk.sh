#!/bin/bash
# Genera el APK de UNA empresa.
#   Uso: bash android/build_apk.sh <slug> "<NOMBRE EMPRESA>" [BASE_URL]
# Requiere: JDK 17+, Android SDK (ANDROID_SDK_ROOT), ImageMagick (convert).
set -e

SLUG="$1"; NAME="$2"; BASE="${3:-https://movtek.vercel.app}"
if [ -z "$SLUG" ] || [ -z "$NAME" ]; then echo "Uso: build_apk.sh <slug> \"<NOMBRE>\" [BASE_URL]"; exit 1; fi

HERE="$(cd "$(dirname "$0")" && pwd)"      # .../android
ROOT="$(cd "$HERE/.." && pwd)"             # raíz del repo
OUT="$ROOT/public/apk"
mkdir -p "$OUT"

# Ícono desde el logo de la empresa (servido por el sitio).
LOGO="/tmp/logo_$SLUG.png"
curl -fsSL "$BASE/api/logo?slug=$SLUG" -o "$LOGO"
for pair in "mdpi 48" "hdpi 72" "xhdpi 96" "xxhdpi 144" "xxxhdpi 192"; do
  dens=$(echo $pair | cut -d' ' -f1); sz=$(echo $pair | cut -d' ' -f2)
  mkdir -p "$HERE/app/src/main/res/mipmap-$dens"
  convert "$LOGO" -resize $((sz*82/100))x$((sz*82/100)) -background white -gravity center -extent ${sz}x${sz} \
    "$HERE/app/src/main/res/mipmap-$dens/ic_launcher.png"
  cp "$HERE/app/src/main/res/mipmap-$dens/ic_launcher.png" "$HERE/app/src/main/res/mipmap-$dens/ic_launcher_round.png"
done

IDSUFFIX=$(echo "$SLUG" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')
HOSTNAME=$(echo "$BASE" | sed -E 's#https?://##; s#/.*##')
cd "$HERE"
./gradlew --no-daemon :app:assembleRelease \
  -PappId="com.movtek.$IDSUFFIX" \
  -PappName="$NAME" \
  -PstartUrl="$BASE/e/$SLUG/app" \
  -PhostName="$HOSTNAME" -q
cp app/build/outputs/apk/release/app-release.apk "$OUT/$SLUG.apk"
echo "OK: public/apk/$SLUG.apk"
