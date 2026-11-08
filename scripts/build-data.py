"""Build src/data/*.json from the 2024 results CSV and published poll tables.
Run: python3 scripts/build-data.py
All poll numbers are copied from the sources cited in sources.json."""
import csv, json, os
HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, "..", "src", "data")

PARTIES = [  # left-to-right in the chamber chart
  ("green","Green Party","Green","#02A95B"),
  ("lab","Labour","Lab","#E4003B"),
  ("snp","Scottish National Party","SNP","#FDF38E"),
  ("pc","Plaid Cymru","PC","#005B54"),
  ("sf","Sinn Féin","SF","#326760"),
  ("sdlp","SDLP","SDLP","#2AA82C"),
  ("ld","Liberal Democrats","LD","#FAA61A"),
  ("apni","Alliance","APNI","#F6CB2F"),
  ("ind","Independents","Ind","#C0B8A8"),
  ("other","Other parties","Oth","#9CA3AF"),
  ("spk","The Speaker","Spk","#4B5563"),
  ("uup","Ulster Unionist Party","UUP","#48A5EE"),
  ("dup","Democratic Unionist Party","DUP","#D46A4C"),
  ("tuv","Traditional Unionist Voice","TUV","#0C3A6A"),
  ("con","Conservatives","Con","#0087DC"),
  ("reform","Reform UK","Ref","#12B6CF"),
]
COLMAP = {"Lab":"lab","Con":"con","RUK":"reform","LD":"ld","Green":"green","SNP":"snp","PC":"pc",
          "SF":"sf","DUP":"dup","APNI":"apni","SDLP":"sdlp","UUP":"uup","TUV":"tuv","WPB":"other",
          }

def load_ge(fname, colmap):
  seats_by = {}
  with open(os.path.join(HERE, fname)) as f:
    for r in csv.DictReader(f):
      s = seats_by.setdefault(r["ons_code"], {"id": r["ons_code"], "name": r["constituency_name"],
          "region": r["english_region"] or r["country"], "electorate": int(r["electorate"]),
          "valid": int(r["valid_vote_count"]), "cands": []})
      s["cands"].append(r)
  seats = []
  for s in seats_by.values():
    votes = {}
    inds = []
    for r in s["cands"]:
      v = int(r["vote_count"])
      if r["is_standing_as_commons_speaker"] == "1": pid = "spk"
      elif r["party_abbreviation"] == "": inds.append(v); continue
      else: pid = colmap.get(r["party_abbreviation"], "other")
      votes[pid] = votes.get(pid, 0) + v
    # Biggest independent counts as "ind"; any other independents are lumped into "other".
    inds.sort(reverse=True)
    if inds:
      votes["ind"] = inds[0]
      if len(inds) > 1: votes["other"] = votes.get("other", 0) + sum(inds[1:])
    votes = {k: v for k, v in votes.items() if v}
    assert sum(votes.values()) == s.pop("valid"), s["name"]
    s.pop("cands")
    s["votes"] = votes
    seats.append(s)
  seats.sort(key=lambda s: s["name"])
  return seats

seats = load_ge("ge2024_candidacies_full.csv", COLMAP)

# YouGov "How Britain voted in the 2024 general election" full results (42,119 GB adults, 5-8 July 2024).
# Rows: con, lab, ld, snp, pc, reform, green, other. n = weighted sample of voters in the group.
YG_ORDER = ["con","lab","ld","snp","pc","reform","green","other"]
def yg(n, *vals, turnout=None, tsrc=None):
  shares = {p: v/100 for p, v in zip(YG_ORDER, vals)}
  shares["ind"] = shares["other"]  # independents seeded like "other"
  g = {"voterWeight": n, "shares": shares, "turnout": turnout}
  return g
def ipsos(n, con, lab, ld, ref, grn, nat, oth, turnout=None):
  shares = {"con": con/100, "lab": lab/100, "ld": ld/100, "reform": ref/100, "green": grn/100,
            "snp": nat/100, "pc": nat/100, "other": oth/100, "ind": oth/100}
  return {"voterWeight": n, "shares": shares, "turnout": turnout}
groupVoting = {
 "age": {"source": "yougov-2024", "turnoutSource": "ipsos-2024", "groups": {
   "18-24": yg(4390, 8,41,16,3,1,9,18,4, turnout=0.37),
   "25-29": yg(2252, 8,45,16,2,1,10,12,5),
   "30-39": yg(6730, 12,46,13,3,1,11,10,4),
   "40-49": yg(8448, 17,42,13,2,0,14,7,4),
   "50-59": yg(6742, 24,34,11,3,1,19,5,4),
   "60-69": yg(7308, 33,28,11,3,1,18,4,3),
   "70+":   yg(6250, 46,20,11,2,1,15,3,2),
 }},
 "sex": {"source": "yougov-2024", "groups": {
   # weights = sum of YouGov age-by-gender weighted samples
   "female": yg(2174+8863+5310+5387, 26,35,13,2,1,12,8,3),
   "male":   yg(2216+8567+5099+4504, 23,34,12,3,1,17,6,4),
 }},
 "class": {"source": "yougov-2024", "turnoutSource": "ipsos-2024", "groups": {
   "AB": yg(11807, 27,36,15,2,1,10,7,3, turnout=0.67),
   "C1": yg(12222, 23,36,13,3,1,13,8,3, turnout=0.57),
   "C2": yg(8835, 24,32,11,3,1,20,6,4, turnout=0.50),
   "DE": yg(9255, 23,34,10,3,1,19,6,4, turnout=0.45),
 }},
 "tenure": {"source": "yougov-2024", "turnoutSource": "ipsos-2024", "groups": {
   "outright": yg(13095, 37,25,12,2,1,16,4,3, turnout=0.71),
   "mortgage": yg(11514, 21,39,13,2,1,14,6,3, turnout=0.60),
   "private":  yg(5954, 12,42,14,2,1,13,12,4, turnout=0.37),
   "social":   yg(4310, 14,42,9,4,0,21,7,4, turnout=0.37),
   "family":   yg(4493, 15,40,14,3,1,11,12,4),
 }},
 "work": {"source": "yougov-2024", "groups": {
   "working":    yg(24287, 20,39,13,2,1,14,8,4),
   "student":    yg(2042, 7,40,19,3,1,6,19,5),
   "retired":    yg(10070, 41,23,11,3,1,16,3,3),
   "notworking": yg(4473, 15,39,12,4,1,17,9,4),
 }},
 "ethnicity": {"source": "ipsos-2024", "turnoutSource": "ipsos-2024", "groups": {
   # Ipsos slide 33 "Voting by Ethnic Group" (% of voters): Con, Lab, LD, Reform, Green, SNP/Plaid, Ind/other.
   # Voter mix = Census 2021 population share x Ipsos turnout (White 56%, ethnic minority 43%).
   "white": ipsos(0.817*0.56, 26,33,13,16,7,4,3, turnout=0.56),
   "asian": ipsos(0.093*0.43, 18,39,8,3,11,1,20),
   "black": ipsos(0.040*0.43, 16,68,6,1,8,1,1),
   "mixed": ipsos(0.050*0.43, 14,50,11,6,13,2,2),
 }},
 "agesex": {"source": "yougov-2024", "groups": {
   "m18": yg(2216, 10,40,16,3,1,12,12,6), "f18": yg(2174, 6,42,16,3,0,6,23,3),
   "m25": yg(8567, 14,43,13,3,0,15,8,4), "f25": yg(8863, 15,45,14,2,1,10,10,4),
   "m50": yg(5099, 23,32,11,3,1,22,5,4), "f50": yg(5310, 29,32,11,3,1,16,5,3),
   "m65": yg(4504, 41,21,10,3,1,19,3,3), "f65": yg(5387, 42,23,12,2,1,13,3,3),
 }},
 "brexit": {"source": "yougov-2024", "groups": {
   # Voter mix approximated from the 2016 referendum result (Remain 48.1%, Leave 51.9%).
   "remain": yg(48.1, 16,47,17,4,1,3,8,3),
   "leave":  yg(51.9, 37,19,7,1,0,28,3,4),
 }},
 "income": {"source": "yougov-2024", "groups": {
   "u20": yg(6547, 24,33,11,3,1,17,8,4), "20to30": yg(5665, 26,32,11,3,1,17,6,4),
   "30to50": yg(8127, 25,34,12,3,1,15,7,4), "50to70": yg(4768, 20,40,13,3,0,14,7,3),
   "70plus": yg(6078, 22,40,16,2,1,10,6,3),
 }},
 "education": {"source": "yougov-2024", "turnoutSource": "ipsos-2024", "groups": {
   "low":    yg(11286, 31,28,9,2,1,23,4,3),
   "mid":    yg(16571, 26,32,12,3,1,16,7,4),
   "degree": yg(14261, 18,42,15,3,1,8,9,4, turnout=0.61),
 }},
}
for d in groupVoting.values():
  tot = sum(g["voterWeight"] for g in d["groups"].values())
  for g in d["groups"].values():
    g["voterShare"] = round(g.pop("voterWeight") / tot, 5)

dimensions = [
 {"id":"age","label":"Age","groups":[
   {"id":"18-24","label":"18–24","emoji":"🛹"},{"id":"25-29","label":"25–29","emoji":"🥑"},
   {"id":"30-39","label":"30–39","emoji":"🧸"},{"id":"40-49","label":"40–49","emoji":"🚗"},
   {"id":"50-59","label":"50–59","emoji":"⛳"},{"id":"60-69","label":"60–69","emoji":"🌷"},
   {"id":"70+","label":"70+","emoji":"🫖"}]},
 {"id":"sex","label":"Sex","groups":[{"id":"female","label":"Women","emoji":"👩"},{"id":"male","label":"Men","emoji":"👨"}]},
 {"id":"class","label":"Social grade","groups":[
   {"id":"AB","label":"AB (managerial & professional)","emoji":"💼"},
   {"id":"C1","label":"C1 (supervisory & clerical)","emoji":"🖇️"},
   {"id":"C2","label":"C2 (skilled manual)","emoji":"🔧"},
   {"id":"DE","label":"DE (semi/unskilled, not working)","emoji":"🧤"}]},
 {"id":"tenure","label":"Housing","groups":[
   {"id":"outright","label":"Own it outright","emoji":"🏡"},
   {"id":"mortgage","label":"Paying a mortgage","emoji":"🏦"},
   {"id":"private","label":"Private renters","emoji":"🔑"},
   {"id":"social","label":"Social renters","emoji":"🏢"},
   {"id":"family","label":"Living with family/friends","emoji":"🛏️"}]},
 {"id":"work","label":"Work","groups":[
   {"id":"working","label":"Working","emoji":"💻"},
   {"id":"student","label":"Students","emoji":"📖"},
   {"id":"retired","label":"Retired","emoji":"🎣"},
   {"id":"notworking","label":"Not working","emoji":"🛋️"}]},
 {"id":"ethnicity","label":"Ethnicity","groups":[
   {"id":"white","label":"White","emoji":"🔵"},
   {"id":"asian","label":"Asian","emoji":"🟢"},
   {"id":"black","label":"Black","emoji":"🟣"},
   {"id":"mixed","label":"Mixed & other","emoji":"🟠"}]},
 {"id":"agesex","label":"Age × sex","groups":[
   {"id":"m18","label":"Men 18–24","emoji":"🧢"},{"id":"f18","label":"Women 18–24","emoji":"🎧"},
   {"id":"m25","label":"Men 25–49","emoji":"🧔"},{"id":"f25","label":"Women 25–49","emoji":"👩‍💼"},
   {"id":"m50","label":"Men 50–64","emoji":"🏌️"},{"id":"f50","label":"Women 50–64","emoji":"🌻"},
   {"id":"m65","label":"Men 65+","emoji":"👴"},{"id":"f65","label":"Women 65+","emoji":"👵"}]},
 {"id":"brexit","label":"Brexit vote","groups":[
   {"id":"remain","label":"Voted Remain","emoji":"🇪🇺"},{"id":"leave","label":"Voted Leave","emoji":"🇬🇧"}]},
 {"id":"income","label":"Income","groups":[
   {"id":"u20","label":"Under £20k","emoji":"🪙"},{"id":"20to30","label":"£20–30k","emoji":"💷"},
   {"id":"30to50","label":"£30–50k","emoji":"💳"},{"id":"50to70","label":"£50–70k","emoji":"🚙"},
   {"id":"70plus","label":"£70k+","emoji":"🛥️"}]},
 {"id":"education","label":"Education","groups":[
   {"id":"low","label":"GCSE or below","emoji":"📒"},
   {"id":"mid","label":"A-level / vocational","emoji":"📚"},
   {"id":"degree","label":"Degree or above","emoji":"🎓"}]},
]

sources = [
 {"id":"ge2024-results","name":"UK general election 2024: results by constituency","publisher":"House of Commons Library / UK Parliament",
  "url":"https://electionresults.parliament.uk/general-elections/6","year":2024,
  "note":"Every candidate's votes in all 650 seats. We group them by party (Workers Party and small parties go into 'Other parties')."},
 {"id":"yougov-2024","name":"How Britain voted in the 2024 general election","publisher":"YouGov",
  "url":"https://yougov.com/en-gb/articles/49978-how-britain-voted-in-the-2024-general-election","year":2024,
  "tablesUrl":"https://ygo-assets-websites-editorial-emea.yougov.net/documents/How_Britian_voted_2024_HEAD.pdf",
  "note":"42,119 adults polled 5–8 July 2024. Gives the vote share of each party by age, sex, social grade and education, and how big each group was among voters."},
 {"id":"ipsos-2024","name":"How Britain voted in the 2024 election","publisher":"Ipsos",
  "url":"https://www.ipsos.com/en-uk/uk-opinion-polls/how-britain-voted-in-the-2024-election","year":2024,
  "note":"17,394 adults, 5–8 July 2024. Our source for how White, Asian, Black and Mixed voters split (Ipsos warns the minority sub-group samples are small), plus turnout estimates for the fun facts, e.g. only 37% of 18–24s."},
 {"id":"ons-census-ethnicity","name":"Ethnic group, England and Wales: Census 2021","publisher":"Office for National Statistics",
  "url":"https://www.ons.gov.uk/peoplepopulationandcommunity/culturalidentity/ethnicity/bulletins/ethnicgroupenglandandwales/census2021","year":2022,
  "note":"Population by ethnic group (White 81.7%, Asian 9.3%, Black 4.0%, Mixed 2.9%, Other 2.1%). Combined with Ipsos turnout to size each group among voters."},
 {"id":"ec-eu-ref-2016","name":"EU referendum results","publisher":"Electoral Commission",
  "url":"https://www.electoralcommission.org.uk/research-reports-and-data/our-reports-and-data-past-elections-and-referendums/eu-referendum/results-and-turnout-eu-referendum","year":2016,
  "note":"Remain 48.1%, Leave 51.9%. Used as a rough guide to how many 2024 voters were Remainers vs Leavers (people who didn't vote in 2016 are folded in)."},
 {"id":"ippr-half-of-us","name":"Half of us: turnout patterns at the 2024 general election","publisher":"IPPR",
  "url":"https://www.ippr.org/articles/half-of-us","year":2024,
  "note":"Background on who didn't vote: just 52.8% of the voting-age population turned out."},
]

EVENTS = []
def add_event(ev):
  EVENTS.append(ev)
  with open(os.path.join(OUT, "events", ev["id"] + ".json"), "w") as f:
    json.dump(ev, f, ensure_ascii=False, separators=(",", ":"))
def party_list(rows):
  return [{"id":i,"name":n,"short":sh,"colour":c} for i,n,sh,c in rows]

os.makedirs(os.path.join(OUT, "events"), exist_ok=True)
add_event({"id":"ge2024","label":"2024 general election","short":"GE 2024","year":2024,"kind":"general",
  "date":"2024-07-04","blurb":"Starmer's landslide on a 60% turnout. Reform got 14% of the vote and 5 seats.",
  "resultsSource":"ge2024-results","parties":party_list(PARTIES),"constituencies":seats,
  "dimensions":dimensions,"groupVoting":groupVoting})

import importlib.util
spec = importlib.util.spec_from_file_location("historic", os.path.join(HERE, "historic.py"))
if os.path.exists(spec.origin):
  historic = importlib.util.module_from_spec(spec); spec.loader.exec_module(historic)
  historic.build(globals())

order = sorted(EVENTS, key=lambda e: -e["year"])
with open(os.path.join(OUT, "events", "index.ts"), "w") as f:
  f.write("// Generated by scripts/build-data.py. Do not edit.\n")
  f.write('import type { ElectionEvent } from "@/lib/types";\n')
  for e in order: f.write(f'import {e["id"]} from "./{e["id"]}.json";\n')
  f.write("\nexport const events = [" + ", ".join(e["id"] for e in order) + "] as unknown as ElectionEvent[];\n")
with open(os.path.join(OUT, "sources.json"), "w") as f:
  json.dump({"placeholder": False, "sources": sources}, f, ensure_ascii=False, indent=1)
from collections import Counter
for e in order:
  print(e["id"], len(e["constituencies"]), Counter(max(s["votes"], key=s["votes"].get) for s in e["constituencies"]).most_common(6))
