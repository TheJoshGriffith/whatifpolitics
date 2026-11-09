"""'Polls now': the 2024 general election moved to today's polls.

Polls: Westminster voting intention polls as listed on Wikipedia ("Opinion polling for the next
United Kingdom general election"): to July 2026 from the scraped copy in github.com/alanjones2/alanjones2.github.io
(archive/ukcharts/voting-intentions/2026.csv, kept as scripts/polls/voting_intention_2026.csv), and the
newest rows transcribed from the page (scripts/polls/voting_intention_2026_autumn.csv).
Method: average every poll in the last POLL_DAYS days of the file (GB and UK polls alike), then move
each party's vote in every GB seat by the same ratio as its national share changed since 2024
(proportional swing), keeping each seat's turnout. Northern Ireland seats keep their 2024 votes.
Each group's party shares get the same ratios, so the slices still work.
"""
import copy, csv, datetime, os, re

HERE = os.path.dirname(__file__)
POLL_DAYS = 14
# Wikipedia's table to 29 July 2026 (scraped copy on GitHub), then 29 Sep - 14 Oct 2026 transcribed
# from the page itself on 9 Nov 2026 (the newest polls listed then).
POLL_FILES = ["voting_intention_2026.csv", "voting_intention_2026_autumn.csv"]
COLS = {"Labour": "lab", "Conservative": "con", "Reform": "reform", "Liberal Democrats": "ld", "Green": "green",
        "SNP": "snp", "Plaid Cymru": "pc", "RB": "_other", "Others": "_other"}
NI_PARTIES = {"dup", "sf", "sdlp", "uup", "apni", "tuv"}


def lead_number(x):
  m = re.match(r"\s*(\d+(?:\.\d+)?)", x or "")
  return float(m.group(1)) if m else 0.0


def poll_average():
  polls = []
  rows = []
  for name in POLL_FILES:
    with open(os.path.join(HERE, "polls", name)) as f:
      rows += list(csv.DictReader(f))
  for r in rows:
      if not r.get("Date") or "MRP" in r["Pollster"]: continue  # MRPs: weeks of fieldwork, a different method
      d = datetime.date.fromisoformat(r["Date"])
      shares = {}
      for col, pid in COLS.items():
        shares[pid] = shares.get(pid, 0) + lead_number(r[col])
      polls.append((d, re.sub(r"\[.*?\]", "", r["Pollster"]).strip(), shares))
  last = max(d for d, _, _ in polls)
  recent = []
  for d, who, shares in polls:
    if (last - d).days >= POLL_DAYS: continue
    tot = sum(shares.values())
    assert 95 <= tot <= 105, (d, who, tot)  # rounded figures; anything further off is a parsing slip
    recent.append((d, who, {p: x / tot for p, x in shares.items()}))
  avg = {k: sum(p[2][k] for p in recent) / len(recent) for k in recent[0][2]}
  return avg, recent, last


def build(G):
  base = next(e for e in G["EVENTS"] if e["id"] == "ge2024")
  avg, recent, last = poll_average()
  ev = copy.deepcopy(base)
  is_ni = lambda c: c["region"] == "Northern Ireland"
  gb = {}
  for c in ev["constituencies"]:
    if is_ni(c): continue
    for p, n in c["votes"].items(): gb[p] = gb.get(p, 0) + n
  total = sum(gb.values())
  named = {p for p in COLS.values() if p != "_other"}
  others_2024 = sum(n for p, n in gb.items() if p not in named)
  ratio = {p: avg[p] / (gb[p] / total) for p in named}
  # Independents and small parties keep their local votes. If the polls' "others" (which now
  # include new parties with no 2024 record) add up to more than that, the extra is spread evenly
  # across GB seats as "other"; if less, local others shrink to fit.
  base_other = others_2024 / total
  extra = max(0.0, avg["_other"] - base_other)
  ratio_other = min(1.0, avg["_other"] / base_other)
  r = lambda p: ratio.get(p, 1.0 if p in NI_PARTIES else ratio_other)
  for c in ev["constituencies"]:
    if is_ni(c): continue
    t = sum(c["votes"].values())
    moved = {p: n * r(p) for p, n in c["votes"].items()}
    moved["other"] = moved.get("other", 0) + extra * t / (1 - extra)
    k = t / sum(moved.values())
    c["votes"] = {p: round(n * k) for p, n in moved.items() if round(n * k) > 0}
  for dim in ev["groupVoting"].values():
    for g in dim["groups"].values():
      s = {p: x * r(p) for p, x in g["shares"].items()}
      tot = sum(s.values())
      g["shares"] = {p: round(x / tot, 5) for p, x in s.items()}
  first = min(p[0] for p in recent)
  pct = lambda p: f"{avg[p] * 100:.0f}%"
  ev.update({
    "id": "pollsnow", "label": f"polling projection ({last.strftime('%B %Y')})", "short": "Polls now",
    "year": last.year, "date": last.isoformat(), "resultsSource": "voting-intention",
    "projection": {"polls": len(recent), "from": first.isoformat(), "to": last.isoformat(),
                   "pollsters": sorted({p[1] for p in recent}),
                   "shares": {p: round(x, 4) for p, x in avg.items()}},
    "blurb": (f"Not an election: what the polls would mean if they came true tomorrow. An average of {len(recent)} polls "
              f"from {first.day} {first.strftime('%B')} to {last.day} {last.strftime('%B %Y')} (Reform {pct('reform')}, "
              f"Labour {pct('lab')}, Conservatives {pct('con')}, Greens {pct('green')}, Lib Dems {pct('ld')}), "
              "applied to every seat's 2024 result."),
  })
  ev.pop("map", None)  # attach_map adds it back
  G["add_event"](ev)
  G["sources"].append({"id": "voting-intention", "name": "Opinion polling for the next United Kingdom general election",
    "publisher": "Wikipedia, compiling the British Polling Council members' published polls",
    "url": "https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_United_Kingdom_general_election", "year": last.year,
    "note": f"Westminster voting intention. We average the {len(recent)} polls in the {POLL_DAYS} days to {last.isoformat()} "
            f"({', '.join(sorted({p[1] for p in recent}))}), from Wikipedia's table (transcribed 9 November 2026; earlier polls via the scraped copy in github.com/alanjones2/alanjones2.github.io). MRP polls are left out."})
  print("  polls now:", len(recent), "polls to", last, {p: round(x * 100, 1) for p, x in avg.items()})
