#!/bin/sh
set -eu
[ "${CI:-}" = true ] && [ "${GITHUB_ACTIONS:-}" = true ] && [ "${DB_DATABASE:-}" = simeyo_android_ci ] || { echo 'Android acceptance requires its disposable GitHub CI database.' >&2; exit 1; }
mkdir -p .local/android-ci
state=$(CDPATH= cd .local/android-ci && pwd)
sdk=${ANDROID_SDK_ROOT:-${ANDROID_HOME:?Android SDK is required}}
export PATH="$sdk/platform-tools:$sdk/emulator:$sdk/cmdline-tools/latest/bin:$PATH"
sdkmanager 'system-images;android-35;google_apis;x86_64' >/dev/null
echo no | avdmanager create avd --force --name simeyo_ci --package 'system-images;android-35;google_apis;x86_64' --device pixel_6 >/dev/null
emulator -avd simeyo_ci -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect >"$state/emulator.log" 2>&1 &
emulator_pid=$!
api_pid= metro_pid=
cleanup() {
  [ -z "$metro_pid" ] || kill "$metro_pid" 2>/dev/null || true
  [ -z "$api_pid" ] || kill "$api_pid" 2>/dev/null || true
  kill "$emulator_pid" 2>/dev/null || true
}
trap cleanup EXIT
booted=false
for attempt in $(seq 1 120); do
  if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; then booted=true; break; fi
  sleep 2
done
[ "$booted" = true ] || { echo 'Android emulator boot timed out.' >&2; exit 1; }
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell input keyevent 82
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk >/dev/null
(cd apps/api/public && php -S 0.0.0.0:8000 ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php) >"$state/api.log" 2>&1 &
api_pid=$!
(cd apps/mobile && npx expo start --localhost --port 8081) >"$state/metro.log" 2>&1 &
metro_pid=$!
ready=false
for attempt in $(seq 1 90); do
  if curl --silent --fail http://localhost:8081/status | grep -q packager-status:running && curl --silent --fail http://localhost:8000/api/v1/health >/dev/null; then ready=true; break; fi
  sleep 2
done
[ "$ready" = true ] || { echo 'Emulator backend/Metro did not become ready.' >&2; exit 1; }
adb logcat -c
adb shell am start -W -a android.intent.action.VIEW -d 'exp+simeyo://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081' app.simeyo.mobile >/dev/null
python3 infrastructure/scripts/verify-android-emulator.py
