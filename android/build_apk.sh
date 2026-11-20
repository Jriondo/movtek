#!/bin/bash
set -e
SLUG="$1"; NAME="$2"
APK=/home/user/apk
curl -s "https://movtek.vercel.app/api/logo?slug=$SLUG" -o /tmp/logo_$SLUG.png
for pair in "mdpi 48" "hdpi 72" "xhdpi 96" "xxhdpi 144" "xxxhdpi 192"; do
  dens=$(echo $pair | cut -d' ' -f1); sz=$(echo $pair | cut -d' ' -f2)
  mkdir -p "$APK/app/src/main/res/mipmap-$dens"
  convert /tmp/logo_$SLUG.png -resize $((sz*82/100))x$((sz*82/100)) -background white -gravity center -extent ${sz}x${sz} "$APK/app/src/main/res/mipmap-$dens/ic_launcher.png"
  cp "$APK/app/src/main/res/mipmap-$dens/ic_launcher.png" "$APK/app/src/main/res/mipmap-$dens/ic_launcher_round.png"
done
IDSUFFIX=$(echo "$SLUG" | tr -cd 'a-z0-9')
cd $APK
export ANDROID_HOME=/opt/android-sdk; export ANDROID_SDK_ROOT=/opt/android-sdk
PH=$(echo "$HTTPS_PROXY" | sed -E 's#https?://##; s#/.*##'); PHOST=${PH%:*}; PPORT=${PH##*:}
export GRADLE_OPTS="-Dhttps.proxyHost=$PHOST -Dhttps.proxyPort=$PPORT -Dhttp.proxyHost=$PHOST -Dhttp.proxyPort=$PPORT"
/opt/gradle/bin/gradle --no-daemon :app:assembleRelease -PappId=com.movtek.$IDSUFFIX -PappName="$NAME" -PstartUrl="https://movtek.vercel.app/e/$SLUG/app" -q 2>&1 | grep -iE "BUILD|FAIL|error:" || true
mkdir -p /home/user/movtek/public/apk
cp app/build/outputs/apk/release/app-release.apk /home/user/movtek/public/apk/$SLUG.apk
echo "✅ APK $SLUG -> public/apk/$SLUG.apk ($(du -h /home/user/movtek/public/apk/$SLUG.apk | cut -f1))"
