"""Sum Claude Code token usage per session from local transcripts (read-only).

Usage: python3 -I token_usage.py <projects_dir> <since_iso>
Groups main transcripts with their subagent transcripts.
"""
import json
import os
import sys
from datetime import datetime, timezone

root = sys.argv[1]
since = datetime.fromisoformat(sys.argv[2]).timestamp()
rows = {}

for dirpath, _dirs, files in os.walk(root):
    if "Vibelock" not in dirpath:
        continue
    for name in files:
        if not name.endswith(".jsonl"):
            continue
        path = os.path.join(dirpath, name)
        if os.path.getmtime(path) < since:
            continue
        rel = os.path.relpath(path, root)
        parts = rel.split(os.sep)
        project = parts[0].split("worktrees-")[-1][:34]
        # main session id: file name, or parent dir when inside subagents/
        if "subagents" in parts:
            session = parts[parts.index("subagents") - 1]
            kind = "sub"
        else:
            session = name[:-6]
            kind = "main"
        key = (project, session[:8])
        r = rows.setdefault(key, {"in": 0, "cw": 0, "cr": 0, "out": 0, "turns": 0, "subs": 0})
        if kind == "sub":
            r["subs"] += 1
        seen = set()
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                try:
                    ev = json.loads(line)
                except ValueError:
                    continue
                msg = ev.get("message") or {}
                usage = msg.get("usage")
                if ev.get("type") != "assistant" or not usage:
                    continue
                mid = msg.get("id") or ev.get("uuid")
                if mid in seen:
                    continue
                seen.add(mid)
                r["in"] += usage.get("input_tokens", 0) or 0
                r["cw"] += usage.get("cache_creation_input_tokens", 0) or 0
                r["cr"] += usage.get("cache_read_input_tokens", 0) or 0
                r["out"] += usage.get("output_tokens", 0) or 0
                r["turns"] += 1

def m(x):
    return f"{x / 1e6:7.2f}"

print(f"{'worktree':34} {'session':8} {'calls':>6} {'subs':>4} {'input':>7} {'cacheW':>7} {'cacheR':>8} {'output':>7}  (millions)")
tot = {"in": 0, "cw": 0, "cr": 0, "out": 0, "turns": 0}
for (proj, sess), r in sorted(rows.items(), key=lambda kv: -(kv[1]["cr"] + kv[1]["cw"])):
    if r["turns"] == 0:
        continue
    print(f"{proj:34} {sess:8} {r['turns']:6d} {r['subs']:4d} {m(r['in'])} {m(r['cw'])} {m(r['cr']):>8} {m(r['out'])}")
    for k in tot:
        tot[k] += r[k]
print(f"{'TOTAL':34} {'':8} {tot['turns']:6d} {'':4} {m(tot['in'])} {m(tot['cw'])} {m(tot['cr']):>8} {m(tot['out'])}")
