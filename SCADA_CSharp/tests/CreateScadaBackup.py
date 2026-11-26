from pathlib import Path
from datetime import datetime, timezone, timedelta
import hashlib
import json
import re
import shutil

root = Path(__file__).resolve().parent.parent
stamp = datetime.now(timezone(timedelta(hours=7))).strftime('%Y%m%d_%H%M%S')
backup = root / 'backups' / ('SCADA_CSharp_' + stamp)
stage = root / 'outputs' / ('SCADA_CSharp_git_' + stamp)
backup.mkdir(parents=True, exist_ok=False)
stage.mkdir(parents=True, exist_ok=False)

def copy_source(destination):
    shutil.copy2(root / 'CanScadaVienTreoBC.sln', destination)
    shutil.copytree(root / 'CanScadaVienTreoBC', destination / 'CanScadaVienTreoBC',
                    ignore=shutil.ignore_patterns('bin', 'obj', '.vs'))
    if (root / 'icons').exists():
        shutil.copytree(root / 'icons', destination / 'icons')
    (destination / 'tests').mkdir()
    for item in (root / 'tests').iterdir():
        if item.is_file() and item.suffix.lower() in ('.cs', '.cjs', '.py', '.ps1', '.txt'):
            shutil.copy2(item, destination / 'tests' / item.name)
    (destination / 'outputs').mkdir()
    shutil.copytree(root / 'outputs' / 'LuuCanBatch_V2_deploy',
                    destination / 'outputs' / 'LuuCanBatch_V2_deploy',
                    ignore=shutil.ignore_patterns('.clasp.json'))

copy_source(backup)
# Record the exact local source snapshot, including private settings/signing key.
manifest = {}
for item in backup.rglob('*'):
    if item.is_file():
        manifest[str(item.relative_to(backup)).replace('\\', '/')] = hashlib.sha256(item.read_bytes()).hexdigest()
(backup / 'SHA256.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
for relative, expected in manifest.items():
    assert hashlib.sha256((backup / relative).read_bytes()).hexdigest() == expected

# Derive the public Git snapshot from the verified local backup, not moving originals.
for item in backup.iterdir():
    if item.name == 'SHA256.json':
        continue
    if item.is_dir():
        shutil.copytree(item, stage / item.name,
                        ignore=shutil.ignore_patterns('*.pfx', '*.user', '*.suo', '.clasp.json'))
    else:
        shutil.copy2(item, stage / item.name)

service = stage / 'CanScadaVienTreoBC' / 'Services' / 'GoogleSheetApiService.cs'
text = service.read_text(encoding='utf-8-sig')
secrets = []
for field, replacement in [('_readToken', 'CONFIGURE_READ_TOKEN'), ('_writeToken', 'CONFIGURE_WRITE_TOKEN')]:
    pattern = r'(private readonly string ' + field + r'\s*=\s*)"([^"\r\n]*)"'
    matches = re.findall(pattern, text)
    assert len(matches) == 1, field
    secrets.extend(value for _, value in matches if value)
    text = re.sub(pattern, lambda match: match.group(1) + '"' + replacement + '"', text)
service.write_text(text, encoding='utf-8-sig')
for script in (stage / 'outputs').rglob('*.js'):
    text = script.read_text(encoding='utf-8-sig')
    pattern = r'(const API_TOKEN\s*=\s*)"([^"\r\n]*)"'
    secrets.extend(value for _, value in re.findall(pattern, text) if value)
    text = re.sub(pattern, lambda match: match.group(1) + '"CONFIGURE_API_TOKEN"', text)
    script.write_text(text, encoding='utf-8')

for item in stage.rglob('*'):
    if item.is_file():
        assert item.suffix.lower() not in ('.pfx', '.user', '.suo', '.exe', '.dll'), item.name
        if item.suffix.lower() in ('.cs', '.js', '.cjs', '.config', '.txt', '.ps1', '.json', '.py'):
            text = item.read_text(encoding='utf-8-sig')
            assert all(value not in text for value in set(secrets)), 'Secret found in ' + str(item.relative_to(stage))

(stage / '.gitignore').write_text('''[Bb]in/
[Oo]bj/
.vs/
packages/
backups/
*.pfx
*.user
*.suo
*.exe
*.dll
.clasp.json
tests/ep-plan-bin/
outputs/*_before_update*/
''', encoding='utf-8')
print(json.dumps({'backup': str(backup), 'git_stage': str(stage), 'verified_files': len(manifest)}, ensure_ascii=True))
