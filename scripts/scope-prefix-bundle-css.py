#!/usr/bin/env python3
"""
Scope-prefix the vendor deal-feed bundle CSS under .nd-excel-shell.

Rules:
- `:root { ... }` becomes `.nd-excel-shell { ... }` (token vars no longer global).
- `html { ... }` and `body { ... }` rules become `.nd-excel-shell { ... }`
  (bundle assumed full-page ownership; we only own the shell).
- `*` selector becomes `.nd-excel-shell *` (box-sizing reset scope-only).
- Top-level selectors that don't already start with .nd-excel-shell get prefixed.
- `@media`, `@keyframes`, `@font-face`, `@supports` rules pass through; their
  inner selectors get prefixed.
- Comments and blank lines pass through.

Usage:
  python3 scripts/scope-prefix-bundle-css.py src/vendor/deal-feed/styles.css > /tmp/scoped.css
"""
import re
import sys

SHELL = ".nd-excel-shell"


def scope_selector(selector):
    """Given a comma-separated selector string, return scoped version."""
    parts = [p.strip() for p in selector.split(",")]
    scoped = []
    for p in parts:
        if not p:
            continue
        if p.startswith(SHELL):
            scoped.append(p)
        elif p == ":root":
            scoped.append(SHELL)
        elif p in ("html", "body", "html, body"):
            scoped.append(SHELL)
        elif p == "*":
            scoped.append(f"{SHELL} *")
        elif p.startswith("@"):
            scoped.append(p)  # @-rules pass through
        else:
            scoped.append(f"{SHELL} {p}")
    return ", ".join(scoped)


def transform(css):
    """Process the CSS line-by-line, tracking brace depth for @-rules."""
    out = []
    i = 0
    in_at_block = False
    at_depth = 0

    # Match a selector followed by `{` (possibly multi-line via commas, but
    # bundle CSS uses single-line selectors per inspection)
    SELECTOR_RE = re.compile(r"^(\s*)([^{}/@][^{}/]*?)\s*\{")
    AT_RE = re.compile(r"^(\s*)(@(?:media|supports|keyframes|font-face)[^{]*)\{")

    lines = css.split("\n")
    while i < len(lines):
        line = lines[i]
        m_at = AT_RE.match(line)
        m_sel = SELECTOR_RE.match(line)

        if m_at:
            # @-rule opener; passes through
            out.append(line)
            in_at_block = True
            at_depth += 1
        elif m_sel and not in_at_block:
            indent, sel = m_sel.group(1), m_sel.group(2)
            rest = line[m_sel.end():]
            scoped = scope_selector(sel)
            out.append(f"{indent}{scoped} {{{rest}")
        elif m_sel and in_at_block:
            # Selector inside @media etc — still scope it
            indent, sel = m_sel.group(1), m_sel.group(2)
            rest = line[m_sel.end():]
            scoped = scope_selector(sel)
            out.append(f"{indent}{scoped} {{{rest}")
        else:
            # Track brace depth to know when we exit @-block
            if in_at_block:
                # Count braces excluding those in strings/comments (simple: regex)
                opens = line.count("{")
                closes = line.count("}")
                at_depth += opens - closes
                if at_depth <= 0:
                    in_at_block = False
                    at_depth = 0
            out.append(line)
        i += 1

    return "\n".join(out)


def main():
    if len(sys.argv) != 2:
        print("usage: scope-prefix-bundle-css.py <input.css>", file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[1], "r") as f:
        css = f.read()
    sys.stdout.write(transform(css))


if __name__ == "__main__":
    main()
