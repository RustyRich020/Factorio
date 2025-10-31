Param([string]$Changes="./test/sample_changes.jsonl")
$env:CHANGELOG_FILE = (Resolve-Path $Changes)
npm run start
