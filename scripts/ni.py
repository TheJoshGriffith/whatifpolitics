"""Northern Ireland group behaviour.

The GB polls behind groupVoting don't cover Northern Ireland, so they have no figures for the DUP,
Sinn Féin, the SDLP, the UUP, Alliance or the TUV. Left alone, every group in an NI seat would get
the same mix of those parties and NI seats would never change. Instead each NI area gets its own
party shares per group (Constituency.groupVotingOverride) from the Northern Ireland Life and Times
Survey (scripts/polls/ni_nilt.md), for the dimensions it covers: age, sex and age x sex.
"""
import re
from historic import tables, num

NILT_ROWS = {
  "Democratic Unionist Party (DUP)": "dup", "Sinn Fein": "sf", "Ulster Unionist Party (UUP)": "uup",
  "Social Democratic and Labour Party (SDLP)": "sdlp", "Alliance Party": "apni", "Green Party": "green", "Other Party": "other",
  "I voted to leave": "leave", "I voted to remain": "remain",
}
# Which survey describes which event. NILT has asked about the general election vote only once (2020,
# about December 2019); otherwise we use party support in the election year.
EVENT_SOURCE = {
  "ge2010": ("NILT 2010 POLPART2", "nilt-2010"), "ge2015": ("NILT 2015 POLPART2", "nilt-2015"),
  "ge2017": ("NILT 2017 POLPART2", "nilt-2017"), "ge2019": ("NILT 2020 VOTEGE19", "nilt-2020"),
  "ge2024": ("NILT 2024 POLPART2", "nilt-2024"), "eu2016": ("NILT 2016 BREXVOTE", "nilt-2016"),
}
NILT_AGE = [("18-24", 18, 24), ("25-34", 25, 34), ("35-44", 35, 44), ("45-54", 45, 54), ("55-64", 55, 64), ("65+", 65, 89)]

SOURCES = [
  {"id": "nilt-2010", "name": "Northern Ireland Life and Times Survey 2010: political party support (POLPART2)", "publisher": "ARK (Queen's University Belfast and Ulster University)",
   "url": "https://www.ark.ac.uk/nilt/2010/Political_Attitudes/POLPART2.html", "year": 2010,
   "note": "About 1,200 adults in Northern Ireland. Which party people support, by age and sex. Used for how Northern Ireland groups differ in 2010."},
  {"id": "nilt-2015", "name": "Northern Ireland Life and Times Survey 2015: political party support (POLPART2)", "publisher": "ARK (Queen's University Belfast and Ulster University)",
   "url": "https://www.ark.ac.uk/nilt/2015/Political_Attitudes/POLPART2.html", "year": 2015,
   "note": "Party support by age and sex in Northern Ireland, used for the 2015 election."},
  {"id": "nilt-2016", "name": "Northern Ireland Life and Times Survey 2016: how you voted in the EU referendum (BREXVOTE)", "publisher": "ARK (Queen's University Belfast and Ulster University)",
   "url": "https://www.ark.ac.uk/nilt/2016/Political_Attitudes/BREXVOTE.html", "year": 2016,
   "note": "Remain and Leave by age and sex among Northern Ireland voters, used for Northern Ireland's count in the EU referendum."},
  {"id": "nilt-2017", "name": "Northern Ireland Life and Times Survey 2017: political party support (POLPART2)", "publisher": "ARK (Queen's University Belfast and Ulster University)",
   "url": "https://www.ark.ac.uk/nilt/2017/Political_Attitudes/POLPART2.html", "year": 2017,
   "note": "Party support by age and sex in Northern Ireland, used for the 2017 election."},
  {"id": "nilt-2020", "name": "Northern Ireland Life and Times Survey 2020: vote at the 2019 general election (VOTEGE19)", "publisher": "ARK (Queen's University Belfast and Ulster University)",
   "url": "https://ark.ac.uk/nilt/2020/Political_Attitudes/VOTEGE19.html", "year": 2020,
   "note": "How Northern Ireland voters remember voting in December 2019, by age and sex. Too few 18–24s to report, so they're given the 25–34 figures."},
  {"id": "nilt-2024", "name": "Northern Ireland Life and Times Survey 2024: political party support (POLPART2)", "publisher": "ARK (Queen's University Belfast and Ulster University)",
   "url": "https://www.ark.ac.uk/nilt/2024/Political_Attitudes/POLPART2.html", "year": 2024,
   "note": "Party support by age and sex in Northern Ireland in 2024, used for the 2024 election."},
  {"id": "nisra-census-ni", "name": "Census 2011 key statistics by Assembly Area, and mid-2021 population estimates by 2024 Assembly Area", "publisher": "NISRA",
   "url": "https://data.nisra.gov.uk/", "year": 2022,
   "note": "Ages and sexes in each Northern Ireland seat (tables KS101NI and KS102NI for the 2010–2019 seats, MYE01T013 for the 2024 seats, which is based on Census 2021). Gives each Northern Ireland seat its own age and sex mix."},
]


def nilt(key):
  """{"Sex"|"Age"|"Religion": {column: {party id: share}}}; columns marked * are left out."""
  out = {}
  for heading, header, rows in tables("ni_nilt.md"):
    if not heading.startswith(key + ":"):
      continue
    section = heading.split(":")[1].strip()
    cols = {}
    for j, col in enumerate(header[1:], start=1):
      if any(r[j] == "*" for r in rows):
        continue
      vals = {NILT_ROWS[r[0]]: num(r[j]) for r in rows if r[0] in NILT_ROWS}
      tot = sum(vals.values())
      cols[col] = {p: v / tot for p, v in vals.items()}
    out[section] = cols
  assert out, key
  return out


def _ages(label):
  """'18–24' -> (18, 24), '70+' -> (70, 89), '18-19' -> (18, 19)."""
  m = re.search(r"(\d+)\s*[–-]\s*(\d+)", label)
  if m:
    return int(m.group(1)), int(m.group(2))
  m = re.search(r"(\d+)\+", label)
  return int(m.group(1)), 89


def _age_mix(cols, lo, hi):
  """Average NILT age bands over [lo, hi], weighted by years of overlap. Bands too small to report are skipped
  (if that leaves nothing, the nearest reported band is used)."""
  acc, wsum = {}, 0.0
  for band, a, b in NILT_AGE:
    w = max(0, min(hi, b) - max(lo, a) + 1)
    if w and band in cols:
      for p, v in cols[band].items():
        acc[p] = acc.get(p, 0) + v * w
      wsum += w
  if wsum == 0:
    band = min((x for x in NILT_AGE if x[0] in cols), key=lambda x: abs(x[1] - lo))[0]
    return dict(cols[band])
  return {p: v / wsum for p, v in acc.items()}


def _expand(shares, party_ids):
  """NILT party ids -> the event's parties: every party NILT doesn't list gets the 'Other party' share (like
  'other' and 'ind' in the GB polls), and Green does too when the survey has no Green row."""
  out = {}
  for p in party_ids:
    v = shares.get(p, shares.get("other"))
    if v is not None:
      # A 0% in a ~200-person sub-sample isn't really zero; a small floor keeps the fit well behaved.
      out[p] = round(max(v, 0.005), 4)
  return out


def _is_ni(c):
  return c["region"] == "Northern Ireland"


def overrides(ev):
  """{dimension: {group: {party: share}}} for Northern Ireland in this event."""
  key, _ = EVENT_SOURCE[ev["id"]]
  tab = nilt(key)
  ni_areas = [c for c in ev["constituencies"] if _is_ni(c)]
  party_ids = [p["id"] for p in ev["parties"] if any(c["votes"].get(p["id"]) for c in ni_areas)]
  sex = {"male": tab["Sex"]["Male"], "female": tab["Sex"]["Female"]}
  allp = {p: (sex["male"].get(p, 0) + sex["female"].get(p, 0)) / 2 for p in set(sex["male"]) | set(sex["female"])}
  out = {}
  for d in ev["dimensions"]:
    groups = {}
    if d["id"] == "sex":
      groups = {g["id"]: sex[g["id"]] for g in d["groups"]}
    elif d["id"] == "age":
      groups = {g["id"]: _age_mix(tab["Age"], *_ages(g["label"])) for g in d["groups"]}
    elif d["id"] == "agesex":
      # NILT doesn't cross age with sex, so combine the two: share(p | sex, age) ∝ share(p | sex) x share(p | age) / share(p).
      for g in d["groups"]:
        s = sex["male" if g["id"].startswith("m") else "female"]
        a = _age_mix(tab["Age"], *_ages(g["label"]))
        raw = {p: s.get(p, 0) * a.get(p, 0) / allp[p] for p in allp if allp[p] > 0}
        tot = sum(raw.values())
        groups[g["id"]] = {p: v / tot for p, v in raw.items()}
    if groups:
      out[d["id"]] = {g: _expand(sh, party_ids) for g, sh in groups.items()}
  return out


def attach(ev):
  """Set groupVotingOverride on every Northern Ireland area of the event. Returns (areas, dimensions)."""
  if ev["id"] not in EVENT_SOURCE:
    return 0, []
  ov = overrides(ev)
  n = 0
  for c in ev["constituencies"]:
    if _is_ni(c):
      c["groupVotingOverride"] = ov
      n += 1
  return n, sorted(ov)
