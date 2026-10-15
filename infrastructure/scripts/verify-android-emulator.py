"""Real installed-app acceptance using Android's accessibility tree and adb."""
import json
import os
import re
import subprocess
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

if os.environ.get('CI') != 'true' or os.environ.get('GITHUB_ACTIONS') != 'true' or os.environ.get('DB_DATABASE') != 'simeyo_android_ci':
    raise RuntimeError('Only the disposable Android CI fixture is allowed.')

directory = Path('.local/android-ci')
package = 'app.simeyo.mobile'


def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=30, stderr=subprocess.DEVNULL)


def nodes():
    adb('shell', 'uiautomator', 'dump', '/sdcard/simeyo-window.xml')
    return ET.fromstring(adb('shell', 'cat', '/sdcard/simeyo-window.xml')).iter('node')


def find(label, timeout=60, editable=False):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        try:
            current = list(nodes())
            if any(node.get('text') == "Pixel Launcher isn't responding" for node in current):
                # Dismiss only the stock launcher's ANR; never hide a Simeyo app failure.
                for node in current:
                    if node.get('text') == 'Close app':
                        tap_node(node)
            for node in current:
                if label in (node.get('text'), node.get('content-desc')) and (not editable or node.get('class', '').endswith('EditText')):
                    return node
            # The first development-client launch can display its onboarding dialog.
            for node in current:
                if node.get('text') in ('Got it', 'Continue', 'Allow', 'While using the app', 'Open'):
                    tap_node(node)
        except (subprocess.SubprocessError, ET.ParseError):
            pass
        time.sleep(2)
    screenshot('native-failure.png')
    # Exclude input values and never persist the raw login hierarchy.
    try:
        print('Visible non-input labels:', json.dumps([{'class': node.get('class'), 'text': node.get('text'), 'description': node.get('content-desc')} for node in nodes() if not node.get('class', '').endswith('EditText')][:35]))
    except (subprocess.SubprocessError, ET.ParseError):
        pass
    raise RuntimeError(f'Android accessibility element not found: {label}')


def tap_node(node):
    bounds = [int(value) for value in re.findall(r'\d+', node.get('bounds', ''))]
    if len(bounds) != 4:
        raise RuntimeError('Invalid accessibility bounds.')
    adb('shell', 'input', 'tap', str((bounds[0] + bounds[2]) // 2), str((bounds[1] + bounds[3]) // 2))


def tap(label):
    tap_node(find(label))


def enter(label, value):
    tap_node(find(label, editable=True))
    # CI fixture values contain only adb input-safe characters; no shell interpolation.
    if not re.fullmatch(r'[A-Za-z0-9@._-]+', value):
        raise RuntimeError('Unsupported fixture input.')
    adb('shell', 'input', 'text', value)
    adb('shell', 'input', 'keyevent', '4')


def screenshot(name):
    (directory / name).write_bytes(adb('exec-out', 'screencap', '-p'))


find('Email', 180)
enter('Email', 'nadia@example.test')
enter('Kata sandi', os.environ['DEMO_PASSWORD'])
tap('Masuk')
find('Untukmu', 90)
find('Kampus')
find('Beranda')
screenshot('native-feed.png')

# Relaunch the real process: the session must survive via native SecureStore.
adb('shell', 'am', 'force-stop', package)
adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', 'exp+simeyo://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081', package)
find('Untukmu', 90)
tap('Cerita')
story = f'AndroidEmulatorAcceptance{int(time.time())}'
enter('Tulis cerita', story)
tap('Bagikan')
time.sleep(2)
tap('Beranda')
find('Untukmu')
find(story)
screenshot('native-post.png')

tap('Profil')
find('Nadia Putri')
tap('Pengaturan')
find('Tampilan')
tap('Gelap')
screenshot('native-dark-settings.png')
# Logout is below the preference controls; scroll only within the app.
for _ in range(8):
    try:
        tap_node(find('Keluar', 1))
        break
    except RuntimeError:
        width, height = map(int, re.findall(r'(\d+)x(\d+)', adb('shell', 'wm', 'size').decode())[-1])
        adb('shell', 'input', 'swipe', str(width // 2), str(height * 4 // 5), str(width // 2), str(height // 4), '350')
else:
    raise RuntimeError('Native logout control was not reachable.')
find('Email')
adb('shell', 'am', 'force-stop', package)
adb('shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', 'exp+simeyo://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081', package)
find('Email', 90)

# Independently confirm that the native composer persisted its post in PostgreSQL/API.
def api(path, payload=None, token=None):
    headers = {'Accept': 'application/json', 'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    request = urllib.request.Request(f'http://127.0.0.1:8000/api/v1/{path}', data=None if payload is None else json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(request, timeout=20) as response:
        return None if response.status == 204 else json.load(response)


token = api('auth/native/login', {'email': 'nadia@example.test', 'password': os.environ['DEMO_PASSWORD'], 'device_name': 'CI persistence verifier'})['data']['token']
try:
    if not any(post['body'] == story for post in api('feed?feed=campus', token=token)['data']):
        raise RuntimeError('Native-composed story missing from persisted API feed.')
finally:
    api('auth/native/logout', {}, token)

report = {'scope': 'Installed Android API 35 emulator, development client with Metro and isolated PostgreSQL', 'passed': ['native login', 'native tabs/feed', 'SecureStore session across process restart', 'native composer persisted through API', 'native profile', 'dark theme selection', 'logout remains logged out across restart'], 'not_tested': ['physical device', 'release signing', 'push providers', 'iOS']}
(directory / 'acceptance.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print('Installed Android acceptance passed: login, tabs/feed, persisted session/post, profile/theme and logout restart.')
