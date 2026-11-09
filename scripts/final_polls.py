"""Final pre-election polls (scripts/polls/final_polls.md) plus each vote's real result, for the
polling accuracy page. Writes src/data/final-polls.json. Results are worked out from the event data:
Great Britain only for general elections (GB polls don't cover Northern Ireland), the whole area for
referendums."""
import json, os

HERE = os.path.dirname(__file__)
# Events built from the results database carry no date.
POLLING_DAY = {"ge2010": "2010-05-06", "ge2015": "2015-05-07", "ge2017": "2017-06-08", "ge2019": "2019-12-12"}


def parse():
  out, cur, lines = {}, None, open(os.path.join(HERE, "polls", "final_polls.md")).read().split("\n")
  i = 0
  while i < len(lines):
    l = lines[i]
    if l.startswith("## "):
      cur = {"id": l[3:].strip(), "url": None, "polls": []}
      out[cur["id"]] = cur
    elif cur and l.startswith("- URL:"):
      cur["url"] = l.split(":", 1)[1].strip()
    elif cur and l.startswith("| End"):
      hdr = [c.strip() for c in l.strip("|").split("|")]
      i += 2
      while i < len(lines) and lines[i].startswith("|"):
        row = dict(zip(hdr, [c.strip() for c in lines[i].strip("|").split("|")]))
        shares = {k: float(v) for k, v in row.items() if k not in ("End", "Pollster", "Client", "Sample") and v not in ("", "?")}
        cur["polls"].append({"end": row["End"], "pollster": row["Pollster"], "client": row["Client"] or None,
                             "sample": int(row["Sample"]) if row["Sample"] else None, "shares": shares})
        i += 1
      continue
    i += 1
  return out


def build(G):
  votes = parse()
  events = {e["id"]: e for e in G["EVENTS"]}
  out = []
  for vid, v in votes.items():
    e = events[vid]
    tot = {}
    for c in e["constituencies"]:
      if e["kind"] == "general" and c["region"] == "Northern Ireland": continue
      for p, n in c["votes"].items(): tot[p] = tot.get(p, 0) + n
    s = sum(tot.values())
    cols = sorted({k for p in v["polls"] for k in p["shares"] if k != "und"})
    result = {p: round(100 * tot.get(p, 0) / s, 2) for p in cols}
    assert all(result[p] > 0 for p in cols), (vid, result)
    out.append({"eventId": vid, "label": e["label"], "short": e["short"], "date": e["date"] or POLLING_DAY[vid], "kind": e["kind"],
                "url": v["url"], "parties": cols, "result": result, "polls": v["polls"]})
    print("  final polls:", vid, len(v["polls"]), result)
  out.sort(key=lambda x: x["date"])
  with open(os.path.join(G["OUT"], "final-polls.json"), "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
