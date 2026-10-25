"""Run npm with the Hugeicons key in process memory; never put it in command args/files."""
import os
from pathlib import Path
import re
import subprocess
import sys

key = os.environ.get('HUGEICONS_LICENSE_KEY', '').strip()
if not key and sys.platform == 'darwin':
    result = subprocess.run(
        ['/usr/bin/security', 'find-generic-password', '-a', 'HUGEICONS_LICENSE_KEY',
         '-s', 'npm.hugeicons.com', '-w'], capture_output=True, text=True,
    )
    if result.returncode == 0:
        key = result.stdout.strip()
if not re.fullmatch(r'[A-Za-z0-9_.-]{20,500}', key):
    raise SystemExit('Hugeicons key unavailable: set HUGEICONS_LICENSE_KEY or save it in macOS Keychain.')
if not sys.argv[1:]:
    raise SystemExit('Usage: python3 prototype/scripts/npm-with-hugeicons-keychain.py <npm arguments>')
env = os.environ.copy()
env['HUGEICONS_LICENSE_KEY'] = key
env['NPM_CONFIG_USERCONFIG'] = str(Path(__file__).resolve().parent.parent / '.npmrc')
result = subprocess.run(['npm', *sys.argv[1:]], env=env, capture_output=True, text=True)
sys.stdout.write(result.stdout.replace(key, '<redacted>'))
sys.stderr.write(result.stderr.replace(key, '<redacted>'))
raise SystemExit(result.returncode)
