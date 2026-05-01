#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ERRORS=0

# ── 1. JSON syntax ────────────────────────────────────────────────────────────
echo "→ Checking JSON syntax..."
while IFS= read -r -d '' file; do
  rel="${file#"$ROOT/"}"
  if ! python3 -c "import json,sys; json.load(open(sys.argv[1]))" "$file" 2>/dev/null; then
    echo "  FAIL (invalid JSON): $rel"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ok: $rel"
  fi
done < <(find "$ROOT" -name "*.json" -not -path "*/.git/*" -print0)

# ── 2. SKILL.md frontmatter ───────────────────────────────────────────────────
echo ""
echo "→ Checking SKILL.md frontmatter..."
while IFS= read -r -d '' file; do
  rel="${file#"$ROOT/"}"
  for field in name description license; do
    if ! grep -qE "^${field}:" "$file"; then
      echo "  FAIL (missing frontmatter field '${field}'): $rel"
      ERRORS=$((ERRORS + 1))
    fi
  done
  # Check frontmatter delimiters exist
  if ! awk '/^---/{c++} c==2{found=1; exit} END{exit !found}' "$file"; then
    echo "  FAIL (frontmatter not closed with ---): $rel"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ok: $rel"
  fi
done < <(find "$ROOT" -name "SKILL.md" -not -path "*/.git/*" -print0)

# ── 3. HTML well-formedness ───────────────────────────────────────────────────
echo ""
echo "→ Checking HTML well-formedness..."
while IFS= read -r -d '' file; do
  rel="${file#"$ROOT/"}"
  fail=0
  for marker in "<!DOCTYPE" "<html" "<head" "<body" "</html>"; do
    if ! grep -qi "$marker" "$file"; then
      echo "  FAIL (missing '${marker}'): $rel"
      ERRORS=$((ERRORS + 1))
      fail=1
    fi
  done
  # Basic parse check via Python
  if ! python3 - "$file" 2>/dev/null <<'PYEOF'
import sys
from html.parser import HTMLParser

class StrictParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []
        self.void = {"area","base","br","col","embed","hr","img","input",
                     "link","meta","param","source","track","wbr"}
    def handle_starttag(self, tag, attrs):
        if tag.lower() not in self.void:
            self.stack.append(tag.lower())
    def handle_endtag(self, tag):
        t = tag.lower()
        if t in self.void:
            return
        if self.stack and self.stack[-1] == t:
            self.stack.pop()
        else:
            self.errors.append(f"unexpected closing tag </{t}>")

parser = StrictParser()
with open(sys.argv[1], encoding="utf-8", errors="replace") as f:
    parser.feed(f.read())
if parser.errors or parser.stack:
    for e in parser.errors:
        print(e)
    if parser.stack:
        print(f"unclosed tags: {parser.stack}")
    sys.exit(1)
PYEOF
  then
    if [ "$fail" -eq 0 ]; then
      echo "  FAIL (malformed HTML): $rel"
      ERRORS=$((ERRORS + 1))
    fi
  else
    if [ "$fail" -eq 0 ]; then
      echo "  ok: $rel"
    fi
  fi
done < <(find "$ROOT" -name "*.html" -not -path "*/.git/*" -print0)

# ── Result ────────────────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "✗  $ERRORS error(s) found."
  exit 1
else
  echo "✓  All checks passed."
fi
