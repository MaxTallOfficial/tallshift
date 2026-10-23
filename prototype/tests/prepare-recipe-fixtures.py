"""Prepare local-only, disposable build fixtures from the actual A001 export.
Does not install dependencies or start a server. Run from any directory.
"""
from pathlib import Path
import json
import shutil

prototype = Path(__file__).resolve().parents[1]
source = prototype / 'recipe-exports/state-relay'
qa = prototype / '.qa'


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


for target in ('vite', 'next'):
    fixture = qa / target
    app = fixture / ('src' if target == 'vite' else 'app')
    app.mkdir(parents=True, exist_ok=True)
    destination = app / 'recipes/state-relay'
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(source, destination)

vite = qa / 'vite'
write_json(vite / 'package.json', {
    'name': 'a001-vite-fixture', 'private': True, 'type': 'module',
    'scripts': {'build': 'tsc --noEmit && vite build'},
})
write_json(vite / 'tsconfig.json', {
    'compilerOptions': {
        'target': 'ES2022', 'lib': ['ES2022', 'DOM', 'DOM.Iterable'],
        'module': 'ESNext', 'moduleResolution': 'Bundler', 'jsx': 'react-jsx',
        'strict': True, 'skipLibCheck': True, 'noEmit': True, 'types': ['vite/client'],
    },
    'include': ['src'],
})
(vite / 'index.html').write_text('<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n')
(vite / 'src/main.tsx').write_text("import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport SelectedExample from './recipes/state-relay/SelectedExample';\ncreateRoot(document.getElementById('root')!).render(<StrictMode><SelectedExample /></StrictMode>);\n")

next_fixture = qa / 'next'
write_json(next_fixture / 'package.json', {
    'name': 'a001-next-fixture', 'private': True, 'type': 'module',
    'scripts': {'build': 'next build'},
    'dependencies': {'next': '16.4.2', 'react': '19.3.1', 'react-dom': '19.3.1'},
    'devDependencies': {'typescript': '7.0.2', '@types/react': '19.3.0', '@types/react-dom': '19.3.0', '@types/node': '24.10.1'},
})
write_json(next_fixture / 'tsconfig.json', {
    'compilerOptions': {
        'target': 'ES2017', 'lib': ['dom', 'dom.iterable', 'esnext'],
        'allowJs': True, 'skipLibCheck': True, 'strict': True, 'noEmit': True,
        'incremental': True, 'module': 'esnext', 'esModuleInterop': True,
        'moduleResolution': 'bundler', 'resolveJsonModule': True,
        'isolatedModules': True, 'jsx': 'react-jsx', 'plugins': [{'name': 'next'}],
    },
    'include': ['next-env.d.ts', '.next/types/**/*.ts', '.next/dev/types/**/*.ts', '**/*.mts', '**/*.ts', '**/*.tsx'],
    'exclude': ['node_modules'],
})
(next_fixture / 'next.config.mjs').write_text("import path from 'node:path';\nimport { fileURLToPath } from 'node:url';\nexport default { turbopack: { root: path.dirname(fileURLToPath(import.meta.url)) } };\n")
(next_fixture / 'app/layout.tsx').write_text("import type { ReactNode } from 'react';\nexport default function Layout({children}: {children: ReactNode}) { return <html lang='ru'><body>{children}</body></html>; }\n")
(next_fixture / 'app/page.tsx').write_text("import SelectedExample from './recipes/state-relay/SelectedExample';\nexport default function Page() { return <main><SelectedExample /></main>; }\n")
print('Prepared A001 fixtures in prototype/.qa/vite and prototype/.qa/next')
