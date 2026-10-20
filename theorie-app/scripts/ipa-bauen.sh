#!/bin/bash
# Baut eine unsignierte IPA zum Aufspielen mit Sideloadly (signiert dort mit der eigenen Apple-ID).
# Braucht einen Mac mit Xcode. Aufruf im Ordner theorie-app:  bash scripts/ipa-bauen.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v xcodebuild >/dev/null; then
  echo "Xcode fehlt – erst Xcode aus dem App Store installieren und einmal öffnen."
  exit 1
fi
[ -f .env ] || echo "Hinweis: keine .env gefunden – die App läuft dann ohne Server (Anmeldung, Clips, KI aus dem Lernstoff)."

npm install
npx expo prebuild -p ios --clean

cd ios
WS=$(ls -d *.xcworkspace | head -1)
SCHEMA="${WS%.xcworkspace}"
rm -rf build Payload

# Alte Pod-Mindestversionen hebt plugins/ios-pod-ziel.js beim Prebuild an.
echo "Baue die App – das dauert ein paar Minuten …"
if ! xcodebuild \
  -workspace "$WS" \
  -scheme "$SCHEMA" \
  -configuration Release \
  -sdk iphoneos \
  -destination "generic/platform=iOS" \
  -archivePath build/App.xcarchive \
  archive \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY="" > build.log 2>&1; then
  echo ""
  echo "Build fehlgeschlagen. Die Fehler:"
  grep -E "error:|\*\* ARCHIVE FAILED" build.log | sort -u | head -n 30
  echo "Ganzes Protokoll: $(pwd)/build.log"
  exit 1
fi

if ! ls build/App.xcarchive/Products/Applications/*.app >/dev/null 2>&1; then
  echo "Keine App im Archiv gefunden – Protokoll: $(pwd)/build.log"
  exit 1
fi

mkdir Payload
cp -R build/App.xcarchive/Products/Applications/*.app Payload/
rm -f ../FahrschulPro.ipa
zip -qry ../FahrschulPro.ipa Payload
rm -rf Payload

echo ""
echo "Fertig: $(cd .. && pwd)/FahrschulPro.ipa"
echo "Jetzt in Sideloadly ziehen, Apple-ID eintragen, Start drücken."
