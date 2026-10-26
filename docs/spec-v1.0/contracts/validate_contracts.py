"""Contract-shape checks only. Requires jsonschema >=4 with Draft202012Validator.

Run from any directory: python /absolute/path/to/validate_contracts.py
This program never builds or certifies an item release, and does not write reports.
"""
from copy import deepcopy
from importlib.metadata import version
import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

HERE = Path(__file__).resolve().parent
schemas = {}
for path in sorted(HERE.glob('*.schema.json')):
    data = json.loads(path.read_text())
    Draft202012Validator.check_schema(data)
    schemas[path.name] = data
registry = Registry().with_resources((data['$id'], Resource.from_contents(data)) for data in schemas.values())
validators = {name: Draft202012Validator(data, registry=registry, format_checker=FormatChecker())
              for name, data in schemas.items()}


def read(name):
    return json.loads((HERE / name).read_text())


def check(name, value, expected_valid):
    errors = list(validators[name].iter_errors(value))
    assert (not errors) == expected_valid, (name, expected_valid, [e.message for e in errors])


def manifest_semantics(value):
    paths = [x['path'] for x in value['files']]
    assert len(set(paths)) == len(paths), 'Duplicate file path'
    assert value['entry'] in paths and value['configSchemaPath'] in paths, 'Missing entry/schema'
    if 'animation' in value:
        assert value['animation']['animationEntry'] in paths, 'Missing animation entry'
    ids = [x['itemId'] for x in value['includedItems']]
    assert len(ids) == len(set(ids)), 'Duplicate included item ID'
    assert value['itemId'] not in ids, 'Recursive self dependency'


checks = 0
fixtures = [('A001.config.schema.json', 'A001.config.example.json'),
            ('A001.share-envelope.schema.json', 'A001.share.example.json'),
            ('item-manifest.schema.json', 'A001.manifest.planned.json'),
            ('item-release.schema.json', 'A001.release.planned.json'),
            ('offer-revision.schema.json', 'offer-disabled.example.json')]
for schema_name, filename in fixtures:
    check(schema_name, read(filename), True)
    checks += 1

config = read('A001.config.example.json')
check('A001.config.schema.json', {**config, 'locale':'vi','duration':480}, True)
checks += 1
for field, value in [('state', 'success'), ('context', 'secret'), ('html', '<script>'),
                     ('locale', 'de'), ('duration', -1), ('duration', 481),
                     ('duration', 1.2), ('motion', 'fast'), ('accent', 'url(evil)'),
                     ('accent', '#123'), ('label', 'copied')]:
    mutation = {**config, field: value}
    check('A001.config.schema.json', mutation, False)
    checks += 1
for duration in (0, 480):
    check('A001.config.schema.json', {**config, 'duration': duration}, True)
    checks += 1

share = read('A001.share.example.json')
for field, value in [('state', 'success'), ('label', 'my private text'), ('locale', 'en'),
                     ('projectContext', 'read env'), ('duration', 481)]:
    mutation = deepcopy(share)
    mutation['configProjection'][field] = value
    check('A001.share-envelope.schema.json', mutation, False)
    checks += 1
for field, value in [('shareMode', 'content-and-appearance'), ('itemId', 'A002'),
                     ('accessGrantId', 'stolen')]:
    check('A001.share-envelope.schema.json', {**share, field: value}, False)
    checks += 1

manifest = read('A001.manifest.planned.json')
manifest_semantics(manifest)
checks += 1
for field, value in [('sourceDigest', 'sha256:'+'0'*64), ('artifactState', 'built'),
                     ('locales', ['ru']), ('privateObjectKey', 'secret')]:
    check('item-manifest.schema.json', {**manifest, field: value}, False)
    checks += 1
for bad_path in ('../evil.ts', '/abs.ts', 'src/../../evil.ts', 'src\\evil.ts',
                 'src//evil.ts', 'src/./evil.ts', 'C:/evil.ts'):
    mutation = deepcopy(manifest)
    mutation['files'][0]['path'] = bad_path
    check('item-manifest.schema.json', mutation, False)
    checks += 1
mutation = deepcopy(manifest)
mutation['files'].append({**mutation['files'][0], 'kind': 'style'})
try:
    manifest_semantics(mutation)
except AssertionError:
    checks += 1
else:
    raise AssertionError('Semantic validator accepted duplicate path')

release = read('A001.release.planned.json')
for stage in ('verified', 'published', 'deprecated'):
    check('item-release.schema.json', {**release, 'lifecycle': stage}, False)
    checks += 1
mutation = deepcopy(release)
mutation['verification']['status'] = 'passed'
check('item-release.schema.json', mutation, False)
checks += 1

public = {'schemaVersion':'1.0.0','itemId':'A001','itemVersion':'0.1.0-prototype',
          'slug':'state-relay','kind':'animation','access':'free',
          'title':{'ru':'Отклик состояний','en':'State Relay','vi':'Phản hồi trạng thái'},
          'description':{'ru':'Демо, не готовый релиз','en':'Demo, not a ready release','vi':'Bản thử, chưa phải bản phát hành'},
          'categorySlugs':['controls-feedback'],'posterPath':'posters/A001.webp',
          'lifecycle':'planned','verificationStatus':'planned',
          'targets':['vite-react-ts','next-app-router'],'locales':['en','ru','vi'],'limitations':[]}
check('public-item.schema.json', public, True)
checks += 1
check('public-item.schema.json', {**public, 'lifecycle':'published', 'locales':['ru','en']}, False)
checks += 1
for field in ('files', 'objectKey', 'source', 'promptBody', 'userId', 'grants'):
    check('public-item.schema.json', {**public, field: 'sensitive'}, False)
    checks += 1

offer = read('offer-disabled.example.json')
mutation = deepcopy(offer)
mutation['itemIds'].append(mutation['itemIds'][0])
check('offer-revision.schema.json', mutation, False)
checks += 1
check('offer-revision.schema.json', {**offer, 'amountMinor': None}, True)
checks += 1
check('offer-revision.schema.json', {**offer, 'saleState': 'enabled'}, False)
checks += 1
check('offer-revision.schema.json', {**offer, 'saleState': 'enabled', 'amountMinor': None}, False)
checks += 1
for field, value in [('updatePolicy', {'functionalMonths':12,'securitySupportMonths':24,'eolNoticeDays':90,'secret':'leak'}),
                     ('amountMinor', 1.5), ('amountMinor', 0), ('apiKey', 'secret')]:
    check('offer-revision.schema.json', {**offer, field: value}, False)
    checks += 1

assert manifest['itemId'] == release['itemId'] and manifest['itemVersion'] == release['itemVersion']
assert manifest['verification']['status'] == release['verification']['status'] == 'planned'
checks += 1
print(json.dumps({'scope':'schema-and-planned-fixture-validation-only',
                  'schemas':len(schemas),'checks':checks,'result':'passed',
                  'validator':'jsonschema '+version('jsonschema'),
                  'releaseVerification':'planned; not executed'}, ensure_ascii=False, indent=2))
