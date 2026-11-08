"""Historic general elections (2010, 2015, 2017, 2019).

Called from build-data.py. Results come from the Commons Library election results database
(scripts/ge<year>_candidacies_full.csv). Poll breakdowns are parsed straight out of the
transcribed tables in scripts/polls/*.md, so no number is retyped by hand.
"""
import os, re

HERE = os.path.dirname(__file__)
POLLS = os.path.join(HERE, "polls")


def num(x):
  x = x.strip().rstrip("%").replace("+", "")
  if x in ("*", ""):
    return 0.0
  return float(x)


def tables(md):
  """Yield (heading, header, rows) for each markdown table in a file."""
  lines = open(os.path.join(POLLS, md)).read().split("\n")
  heading = ""
  i = 0
  while i < len(lines):
    l = lines[i]
    if l.startswith("#"):
      heading = l.strip("# ").strip()
    if l.startswith("|") and i + 1 < len(lines) and lines[i + 1].startswith("|---"):
      header = [c.strip() for c in l.strip().strip("|").split("|")]
      rows = []
      i += 2
      while i < len(lines) and lines[i].startswith("|"):
        rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
        i += 1
      yield heading, header, rows
      continue
    i += 1


def ipsos_table(md):
  """Ipsos 'How Britain voted' table -> {section: {group: {column: value}}}."""
  for heading, header, rows in tables(md):
    if not heading.startswith("1. Ipsos"):
      continue
    out, section = {}, "All"
    for r in rows:
      label = r[0].strip("*").strip()
      if r[0].startswith("**") or r[0].startswith("***"):
        if len(r) > 1 and all(c == "" for c in r[1:]):
          section = label
          continue
      out.setdefault(section, {})[label] = dict(zip(header[1:], r[1:]))
    return out
  raise ValueError("no Ipsos table in " + md)


def yougov_columns(md):
  """YouGov full-results tables (parties as rows) -> {column: {row: value}} across all pages."""
  out = {}
  for heading, header, rows in tables(md):
    if header[0] != "Row":
      continue
    for r in rows:
      for col, v in zip(header[1:], r[1:]):
        out.setdefault(col, {})[r[0]] = v
  return out


# --- party lists --------------------------------------------------------------------------
BASE = [
  ("green","Green Party","Green","#02A95B"), ("lab","Labour","Lab","#E4003B"),
  ("snp","Scottish National Party","SNP","#FDF38E"), ("pc","Plaid Cymru","PC","#005B54"),
  ("sf","Sinn Féin","SF","#326760"), ("sdlp","SDLP","SDLP","#2AA82C"),
  ("ld","Liberal Democrats","LD","#FAA61A"), ("apni","Alliance","APNI","#F6CB2F"),
  ("ind","Independents","Ind","#C0B8A8"), ("other","Other parties","Oth","#9CA3AF"),
  ("spk","The Speaker","Spk","#4B5563"), ("uup","Ulster Unionist Party","UUP","#48A5EE"),
  ("dup","Democratic Unionist Party","DUP","#D46A4C"), ("con","Conservatives","Con","#0087DC"),
]
UKIP = ("ukip", "UKIP", "UKIP", "#70147A")
BRX = ("brexit", "Brexit Party", "BXP", "#12B6CF")
BNP = ("bnp", "BNP", "BNP", "#2E3B74")
COLMAP_BASE = {"Lab":"lab","Con":"con","LD":"ld","Green":"green","SNP":"snp","PC":"pc","SF":"sf",
  "DUP":"dup","APNI":"apni","SDLP":"sdlp","UUP":"uup"}


def ipsos_groups(tab, section, labels, shares_cols, voter_weight):
  """Build groupVoting groups from an Ipsos section.
  labels: {our_id: ipsos_row_label}; shares_cols: {party_id: column}; voter_weight(gid, row) -> weight."""
  groups = {}
  for gid, lab in labels.items():
    row = tab[section][lab]
    shares = {p: num(row[c]) / 100 for p, c in shares_cols.items()}
    t = next((v for k, v in row.items() if k.lower().startswith("turn") and "chg" not in k.lower() and "±" not in k), None)
    turnout = num(t) / 100 if t else None
    groups[gid] = {"voterWeight": voter_weight(gid, turnout), "shares": shares, "turnout": turnout}
  return groups


def finish(gv):
  for d in gv.values():
    tot = sum(g["voterWeight"] for g in d["groups"].values())
    for g in d["groups"].values():
      g["voterShare"] = round(g.pop("voterWeight") / tot, 5)
  return gv


def build(G):
  load_ge, add_event, party_list = G["load_ge"], G["add_event"], G["party_list"]
  sources = G["sources"]

  # Ipsos 2010 published weighted counts of voters for each group. Dividing by each group's
  # turnout gives the adult population mix, which we reuse to size groups in later years
  # where Ipsos didn't publish group sizes.
  t10 = ipsos_table("polls_2010.md")
  counts10 = {
    ("Gender","Male"):3228, ("Gender","Female"):3310,
    ("Age","18-24"):527, ("Age","25-34"):901, ("Age","35-44"):1259, ("Age","45-54"):1169, ("Age","55-64"):1100, ("Age","65+"):1565,
    ("Men by Age","18-24"):302, ("Men by Age","25-34"):463, ("Men by Age","35-54"):1203, ("Men by Age","55+"):1252,
    ("Women by Age","18-24"):225, ("Women by Age","25-34"):438, ("Women by Age","35-54"):1225, ("Women by Age","55+"):1413,
    ("Social Class","AB"):2014, ("Social Class","C1"):1890, ("Social Class","C2"):1205, ("Social Class","DE"):1317,
    ("Housing Tenure","Owned"):2001, ("Housing Tenure","Mortgage"):2976, ("Housing Tenure","Social renter"):942, ("Housing Tenure","Private renter"):516,
  }
  pop = {k: c / (num(t10[k[0]][k[1]]["Turn- out %"]) / 100) for k, c in counts10.items()}
  # Census 2011 (England & Wales): 86% White, 14% other ethnic groups.
  pop[("Ethnic group","White")] = 0.86
  pop[("Ethnic group","All BME")] = 0.14
  pop[("Ethnic group","All non-white")] = 0.14

  SEX = {"female":"Female","male":"Male"}
  AGE6 = {"18-24":"18-24","25-34":"25-34","35-44":"35-44","45-54":"45-54","55-64":"55-64","65+":"65+"}
  CLASS = {"AB":"AB","C1":"C1","C2":"C2","DE":"DE"}
  TENURE = {"outright":"Owned","mortgage":"Mortgage","social":"Social renter","private":"Private renter"}
  ETH = lambda bme: {"white":"White","bme":bme}
  AGESEX = {"m18":("Men by Age","18-24"),"m25":("Men by Age","25-34"),"m35":("Men by Age","35-54"),"m55":("Men by Age","55+"),
            "f18":("Women by Age","18-24"),"f25":("Women by Age","25-34"),"f35":("Women by Age","35-54"),"f55":("Women by Age","55+")}

  def ipsos_dims(md, shares_cols, include, use_counts=False, bme_label="All BME", source="", src_year=None):
    tab = ipsos_table(md)
    gv, dims = {}, []
    def w(section, label):
      def f(gid, turnout):
        if use_counts and (section, label) in counts10:
          return counts10[(section, label)]
        return pop[(section, label)] * (turnout or 0.6)
      return f
    spec = {
      "sex": ("Gender", SEX), "age": ("Age", AGE6), "class": ("Social Class", CLASS),
      "tenure": ("Housing Tenure" if "Housing Tenure" in tab else next(k for k in tab if "tenure" in k.lower()), TENURE),
      "ethnicity": ("Ethnic group", ETH(bme_label)),
    }
    for dim in include:
      if dim == "agesex":
        groups = {}
        for gid, (sec, lab) in AGESEX.items():
          row = tab[sec][lab]
          t = next((v for k, v in row.items() if k.lower().startswith("turn") and "chg" not in k.lower()), None)
          turnout = num(t) / 100 if t else None
          weight = counts10[(sec, lab)] if use_counts else pop[(sec, lab)] * (turnout or 0.6)
          groups[gid] = {"voterWeight": weight, "shares": {p: num(row[c]) / 100 for p, c in shares_cols.items()}, "turnout": turnout}
        gv["agesex"] = {"source": source, "turnoutSource": source, "groups": groups}
        continue
      section, labels = spec[dim]
      groups = {}
      for gid, lab in labels.items():
        key_section = "Housing Tenure" if dim == "tenure" else section
        groups[gid] = ipsos_groups(tab, section, {gid: lab}, shares_cols, w(key_section, lab))[gid]
      gv[dim] = {"source": source, "turnoutSource": source, "groups": groups}
    return gv

  DIM = {
    "sex": {"id":"sex","label":"Sex","groups":[{"id":"female","label":"Women","emoji":"👩"},{"id":"male","label":"Men","emoji":"👨"}]},
    "age": {"id":"age","label":"Age","groups":[{"id":"18-24","label":"18–24","emoji":"🛹"},{"id":"25-34","label":"25–34","emoji":"☕"},
      {"id":"35-44","label":"35–44","emoji":"🧸"},{"id":"45-54","label":"45–54","emoji":"🚗"},{"id":"55-64","label":"55–64","emoji":"⛳"},{"id":"65+","label":"65+","emoji":"🫖"}]},
    "class": {"id":"class","label":"Social grade","groups":[{"id":"AB","label":"AB (managerial & professional)","emoji":"💼"},
      {"id":"C1","label":"C1 (supervisory & clerical)","emoji":"🖇️"},{"id":"C2","label":"C2 (skilled manual)","emoji":"🔧"},
      {"id":"DE","label":"DE (semi/unskilled, not working)","emoji":"🧤"}]},
    "tenure": {"id":"tenure","label":"Housing","groups":[{"id":"outright","label":"Own it outright","emoji":"🏡"},
      {"id":"mortgage","label":"Paying a mortgage","emoji":"🏦"},{"id":"private","label":"Private renters","emoji":"🔑"},
      {"id":"social","label":"Social renters","emoji":"🏢"}]},
    "ethnicity": {"id":"ethnicity","label":"Ethnicity","groups":[{"id":"white","label":"White","emoji":"🔵"},
      {"id":"bme","label":"Ethnic minorities","emoji":"🟢"}]},
    "agesex": {"id":"agesex","label":"Age × sex","groups":[
      {"id":"m18","label":"Men 18–24","emoji":"🧢"},{"id":"f18","label":"Women 18–24","emoji":"🎧"},
      {"id":"m25","label":"Men 25–34","emoji":"🧔"},{"id":"f25","label":"Women 25–34","emoji":"👩‍💼"},
      {"id":"m35","label":"Men 35–54","emoji":"🏌️"},{"id":"f35","label":"Women 35–54","emoji":"🌻"},
      {"id":"m55","label":"Men 55+","emoji":"👴"},{"id":"f55","label":"Women 55+","emoji":"👵"}]},
  }

  sources += [
    {"id":"ge-results-db","name":"UK general election results 2010–2019","publisher":"House of Commons Library / UK Parliament",
     "url":"https://electionresults.parliament.uk/","year":2024,
     "note":"Every candidate's votes in every seat at the 2010, 2015, 2017 and 2019 general elections."},
    {"id":"ipsos-2010","name":"How Britain voted in 2010","publisher":"Ipsos","url":"https://www.ipsos.com/en-uk/how-britain-voted-2010","year":2010,
     "note":"10,211 adults over the campaign. Con/Lab/LD/Other shares and turnout by sex, age, class, housing and ethnicity, plus group sizes."},
    {"id":"ipsos-2015","name":"How Britain voted in 2015","publisher":"Ipsos","url":"https://www.ipsos.com/en-uk/how-britain-voted-2015","year":2015,
     "note":"9,149 adults. Con/Lab/LD/UKIP/Green shares and turnout by sex, age, class, housing and ethnicity. Group sizes estimated from Ipsos's 2010 profile."},
    {"id":"ipsos-2017","name":"How Britain voted in the 2017 election","publisher":"Ipsos","url":"https://www.ipsos.com/en-uk/how-britain-voted-2017-election","year":2017,
     "note":"7,505 adults. We use it for housing and ethnicity (Con/Lab/LD/UKIP/Other) and turnout."},
    {"id":"ipsos-2019","name":"How Britain voted in the 2019 election","publisher":"Ipsos","url":"https://www.ipsos.com/en-uk/how-britain-voted-2019-election","year":2019,
     "note":"27,951 adults. We use it for housing and ethnicity (Con/Lab/LD/Other) and turnout."},
    {"id":"yougov-2017","name":"How Britain voted at the 2017 general election","publisher":"YouGov",
     "url":"https://yougov.com/en-gb/articles/18384-how-britain-voted-2017-general-election","year":2017,
     "tablesUrl":"https://ygo-assets-websites-editorial-emea.yougov.net/documents/InternalResults_170613_2017Election_Demographics_W_mbyPEzo.pdf",
     "note":"52,615 adults. Full party shares and turnout by age, sex, social grade, education, work and the newspaper people read."},
    {"id":"yougov-2019","name":"How Britain voted in the 2019 general election","publisher":"YouGov",
     "url":"https://yougov.com/en-gb/articles/26925-how-britain-voted-2019-general-election","year":2019,
     "tablesUrl":"https://ygo-assets-websites-editorial-emea.yougov.net/documents/Results_HowBritainVoted_2019_w.pdf",
     "note":"41,995 adults. Full party shares by age, sex, social grade, education, work, income and Brexit vote. No turnout, so group sizes use YouGov's 2017 turnout."},
    {"id":"ons-census-2011-ethnicity","name":"Ethnicity and national identity in England and Wales: 2011","publisher":"Office for National Statistics",
     "url":"https://www.ons.gov.uk/peoplepopulationandcommunity/culturalidentity/ethnicity/articles/ethnicityandnationalidentityinenglandandwales/2012-12-11","year":2012,
     "note":"86% of people identified as White in 2011. Used with Ipsos turnout to size ethnic groups among voters, 2010–2019."},
  ]

  def results_event(year, gid, colmap, parties, blurb, dims, gv):
    seats = load_ge(f"ge{year}_candidacies_full.csv", colmap)
    add_event({"id": gid, "label": f"{year} general election", "short": f"GE {year}", "year": year, "kind": "general",
      "date": "", "blurb": blurb, "resultsSource": "ge-results-db", "parties": party_list(parties),
      "constituencies": seats, "dimensions": [DIM[d] if isinstance(d, str) else d for d in dims], "groupVoting": finish(gv)})

  # ---- 2010: Ipsos only (Con/Lab/LD/Other) -----------------------------------------------
  oth = "Oth %"
  c10 = {"con":"Con %","lab":"Lab %","ld":"LD %","other":oth,"ind":oth,"ukip":oth,"bnp":oth,"green":oth,"snp":oth,"pc":oth}
  gv10 = ipsos_dims("polls_2010.md", c10, ["sex","age","agesex","class","tenure","ethnicity"], use_counts=True,
                    bme_label="All non-white", source="ipsos-2010")
  gv10["ethnicity"]["turnoutSource"] = "ipsos-2010"
  results_event(2010, "ge2010", {**COLMAP_BASE, "UKIP":"ukip", "BNP":"bnp"},
    BASE + [BNP, UKIP],
    "Hung parliament! Cameron and Clegg form the coalition in the Downing Street rose garden.",
    ["age","sex","agesex","class","tenure","ethnicity"], gv10)

  # ---- 2015: Ipsos (Con/Lab/LD/UKIP/Green/Other) -----------------------------------------
  c15 = {"con":"Con %","lab":"Lab %","ld":"LD %","ukip":"UKIP %","green":"Green","other":"Oth","ind":"Oth","snp":"Oth","pc":"Oth"}
  gv15 = ipsos_dims("polls_2015.md", c15, ["sex","age","agesex","class","tenure","ethnicity"], source="ipsos-2015")
  results_event(2015, "ge2015", {**COLMAP_BASE, "UKIP":"ukip"}, BASE + [UKIP],
    "The polls said hung parliament; Cameron won a surprise majority. The SNP took 56 of 59 Scottish seats.",
    ["age","sex","agesex","class","tenure","ethnicity"], gv15)

  # ---- 2017 & 2019: YouGov (full parties, group sizes) + Ipsos for housing/ethnicity --------
  def yg_dims(md, partymap, dims, turnout_cols=None):
    cols = yougov_columns(md)
    gv = {}
    for dim, (src, groups) in dims.items():
      out = {}
      for gid, col in groups.items():
        c = cols[col]
        voted = num(c["Voted"]) / 100 if "Voted" in c else None
        if voted is None and turnout_cols:
          voted = num(turnout_cols[col]["Voted"]) / 100 if col in turnout_cols else None
        n = num(c.get("Weighted Sample") or c.get("Weighted sample"))
        shares = {p: num(c[row]) / 100 for p, row in partymap.items()}
        out[gid] = {"voterWeight": n * (voted if voted is not None else 1), "shares": shares,
                    "turnout": num(c["Voted"]) / 100 if "Voted" in c else None}
      gv[dim] = {"source": src, "groups": out}
    return gv

  YG_AGE = {"18-19":"18-19","20-24":"20-24","25-29":"25-29","30-39":"30-39","40-49":"40-49","50-59":"50-59","60-69":"60-69","70+":"70+"}
  DIM_YGAGE = {"id":"age","label":"Age","groups":[{"id":"18-19","label":"18–19","emoji":"🎒"},{"id":"20-24","label":"20–24","emoji":"🛹"},
    {"id":"25-29","label":"25–29","emoji":"🥑"},{"id":"30-39","label":"30–39","emoji":"🧸"},{"id":"40-49","label":"40–49","emoji":"🚗"},
    {"id":"50-59","label":"50–59","emoji":"⛳"},{"id":"60-69","label":"60–69","emoji":"🌷"},{"id":"70+","label":"70+","emoji":"🫖"}]}
  DIM_EDU = {"id":"education","label":"Education","groups":[{"id":"low","label":"GCSE or below","emoji":"📒"},
    {"id":"mid","label":"A-level / vocational","emoji":"📚"},{"id":"degree","label":"Degree or above","emoji":"🎓"}]}
  EDU = {"low":"Low (GCSE or below)","mid":"Medium","degree":"High (Degree or above)"}

  yg17 = yougov_columns("polls_2017.md")
  p17 = {"con":"Conservative","lab":"Labour","ld":"Liberal Democrat","snp":"SNP","pc":"Plaid Cymru","ukip":"UKIP","green":"Green","other":"Other","ind":"Other"}
  DIM_PAPER = {"id":"paper","label":"Newspaper","groups":[
    {"id":"sun","label":"The Sun","emoji":"☀️"},{"id":"mail","label":"Daily Mail","emoji":"📰"},{"id":"express","label":"Daily Express","emoji":"🚂"},
    {"id":"telegraph","label":"Telegraph","emoji":"📯"},{"id":"times","label":"The Times","emoji":"🕰️"},{"id":"ft","label":"Financial Times","emoji":"💹"},
    {"id":"guardian","label":"Guardian","emoji":"🥗"},{"id":"independent","label":"Independent","emoji":"🗞️"},
    {"id":"mirror","label":"Daily Mirror","emoji":"🪞"},{"id":"star","label":"Daily Star","emoji":"⭐"}]}
  PAPER = {"sun":"Sun","mail":"Daily Mail","express":"Daily Express","telegraph":"Daily Telegraph","times":"Times","ft":"Financial Times",
           "guardian":"Guardian","independent":"Independent","mirror":"Daily Mirror","star":"Daily Star"}
  DIM_WORK17 = {"id":"work","label":"Work","groups":[{"id":"fulltime","label":"Full-time workers","emoji":"💻"},
    {"id":"parttime","label":"Part-time workers","emoji":"⏰"},{"id":"student","label":"Students","emoji":"📖"},
    {"id":"retired","label":"Retired","emoji":"🎣"},{"id":"unemployed","label":"Unemployed","emoji":"📋"},{"id":"notworking","label":"Not working","emoji":"🛋️"}]}
  gv17 = yg_dims("polls_2017.md", p17, {
    "age": ("yougov-2017", YG_AGE), "sex": ("yougov-2017", {"female":"Female","male":"Male"}),
    "class": ("yougov-2017", CLASS), "education": ("yougov-2017", EDU),
    "work": ("yougov-2017", {"fulltime":"Full time","parttime":"Part Time","student":"Student","retired":"Retired","unemployed":"Unemployed","notworking":"Not working"}),
    "paper": ("yougov-2017", PAPER),
  })
  c17 = {"con":"Con","lab":"Lab","ld":"LD","ukip":"UKIP","other":"Other","ind":"Other","green":"Other","snp":"Other","pc":"Other"}
  gv17.update(ipsos_dims("polls_2017.md", c17, ["tenure","ethnicity"], source="ipsos-2017"))
  results_event(2017, "ge2017", {**COLMAP_BASE, "UKIP":"ukip"}, BASE + [UKIP],
    "May called a snap election to boost her majority and lost it. Corbyn's Labour surged with young voters.",
    [DIM_YGAGE, "sex", "class", DIM_EDU, DIM_WORK17, "tenure", "ethnicity", DIM_PAPER], gv17)

  p19 = {"con":"Conservative","lab":"Labour","ld":"Liberal Democrat","snp":"SNP","pc":"Plaid Cymru","brexit":"Brexit Party","green":"Green","other":"Other","ind":"Other"}
  # YouGov 2019 has no turnout; size groups using YouGov 2017 turnout for the same groups.
  t17 = {col: {"Voted": v.get("Voted")} for col, v in yg17.items() if v.get("Voted")}
  t17["Full Time"] = t17["Full time"]; t17["Part Time (8 hours or more)"] = t17["Part Time"]
  t17["Full time student"] = t17["Student"]
  DIM_AGESEX19 = {"id":"agesex","label":"Age × sex","groups":[
    {"id":"m18","label":"Men 18–24","emoji":"🧢"},{"id":"f18","label":"Women 18–24","emoji":"🎧"},
    {"id":"m25","label":"Men 25–49","emoji":"🧔"},{"id":"f25","label":"Women 25–49","emoji":"👩‍💼"},
    {"id":"m50","label":"Men 50–64","emoji":"🏌️"},{"id":"f50","label":"Women 50–64","emoji":"🌻"},
    {"id":"m65","label":"Men 65+","emoji":"👴"},{"id":"f65","label":"Women 65+","emoji":"👵"}]}
  DIM_BREXIT = {"id":"brexit","label":"Brexit vote","groups":[{"id":"remain","label":"Voted Remain","emoji":"🇪🇺"},{"id":"leave","label":"Voted Leave","emoji":"🇬🇧"}]}
  DIM_INCOME19 = {"id":"income","label":"Income","groups":[{"id":"u20","label":"Under £20k","emoji":"🪙"},{"id":"20to40","label":"£20–40k","emoji":"💷"},
    {"id":"40to70","label":"£40–70k","emoji":"🚙"},{"id":"70plus","label":"£70k+","emoji":"🛥️"}]}
  DIM_WORK19 = {"id":"work","label":"Work","groups":[{"id":"fulltime","label":"Full-time workers","emoji":"💻"},
    {"id":"parttime","label":"Part-time workers","emoji":"⏰"},{"id":"student","label":"Students","emoji":"📖"},
    {"id":"retired","label":"Retired","emoji":"🎣"},{"id":"unemployed","label":"Unemployed","emoji":"📋"},{"id":"notworking","label":"Not working","emoji":"🛋️"}]}
  gv19 = yg_dims("polls_2019.md", p19, {
    "age": ("yougov-2019", YG_AGE), "sex": ("yougov-2019", {"female":"Female","male":"Male"}),
    "agesex": ("yougov-2019", {"m18":"Male 18-24","f18":"Female 18-24","m25":"Male 25-49","f25":"Female 25-49",
                               "m50":"Male 50-64","f50":"Female 50-64","m65":"Male 65+","f65":"Female 65+"}),
    "class": ("yougov-2019", CLASS), "education": ("yougov-2019", EDU),
    "work": ("yougov-2019", {"fulltime":"Full Time","parttime":"Part Time (8 hours or more)","student":"Full time student","retired":"Retired","unemployed":"Unemployed","notworking":"Not working"}),
    "income": ("yougov-2019", {"u20":"Under 20,000","20to40":"20,000 - 39,999","40to70":"40,000 - 69,999","70plus":"70,000+"}),
    "brexit": ("yougov-2019", {"remain":"Remain","leave":"Leave"}),
  }, turnout_cols=t17)
  c19 = {"con":"Con %","lab":"Lab %","ld":"LD %","other":"Other %","ind":"Other %","brexit":"Other %","green":"Other %","snp":"Other %","pc":"Other %"}
  gv19.update(ipsos_dims("polls_2019.md", c19, ["tenure","ethnicity"], source="ipsos-2019"))
  results_event(2019, "ge2019", {**COLMAP_BASE, "BRX":"brexit"}, BASE + [BRX],
    "\"Get Brexit Done.\" Johnson wins an 80-seat majority and the Red Wall turns blue.",
    [DIM_YGAGE, "sex", DIM_AGESEX19, "class", DIM_EDU, DIM_WORK19, DIM_INCOME19, DIM_BREXIT, "tenure", "ethnicity"], gv19)


def referendums(G):
  add_event, sources = G["add_event"], G["sources"]
  import csv

  def group_table(md, heading_prefix):
    """Rows of the first table under a heading that starts with heading_prefix -> {first col: row dict}."""
    for heading, header, rows in tables(md):
      if heading.startswith(heading_prefix):
        return {r[0] if header[0] != "Group" or header[1] != "Category" else r[1]: dict(zip(header, r)) for r in rows}
    raise ValueError(heading_prefix)

  def ref_groups(tab, mapping, yes_col, no_col, base_col, ids, turnout=None):
    out = {}
    for gid, label in mapping.items():
      r = tab[label]
      out[gid] = {"voterWeight": num(r[base_col]),
                  "shares": {ids[0]: num(r[yes_col]) / 100, ids[1]: num(r[no_col]) / 100},
                  "turnout": (turnout or {}).get(gid)}
    return out

  # ---------------- 2016 EU referendum ----------------
  areas = []
  with open(os.path.join(POLLS, "eu2016_areas.csv")) as f:
    for r in csv.DictReader(f):
      areas.append({"id": r["area_code"], "name": r["area"], "region": r["region"], "electorate": int(r["electorate"]),
                    "votes": {"remain": int(r["remain"]), "leave": int(r["leave"])}})
  assert sum(a["votes"]["remain"] for a in areas) == 16141241
  assert sum(a["votes"]["leave"] for a in areas) == 17410742

  yg = {}
  for heading, header, rows in tables("eu2016_polls.md"):
    if heading.startswith("2. YouGov"):
      for r in rows:
        yg[(r[0], r[1])] = dict(zip(header, r))
  ash = {}
  for heading, header, rows in tables("eu2016_polls.md"):
    if heading.startswith("Tenure") or heading.startswith("Ethnicity"):
      for r in rows:
        ash[r[0]] = dict(zip(header, r))
  ip = {}
  for heading, header, rows in tables("eu2016_polls.md"):
    if heading.startswith("3. Ipsos"):
      for r in rows:
        ip[r[0]] = dict(zip(header, r))
  ipt = lambda label: num(ip[label]["Turnout all adults %"]) / 100

  IDS = ("remain", "leave")
  def ygd(mapping, turnout=None):
    tab = {k[1]: v for k, v in yg.items() if k[1] in mapping.values() and k[0] != "Total"}
    return ref_groups(tab, mapping, "Remain %", "Leave %", "Weighted base", IDS, turnout)
  gv = {
    "age": {"source": "yougov-eu2016", "turnoutSource": "ipsos-eu2016",
            "groups": ygd({"18-24":"18-24","25-49":"25-49","50-64":"50-64","65+":"65+"}, {"18-24": ipt("18-24")})},
    "sex": {"source": "yougov-eu2016", "turnoutSource": "ipsos-eu2016",
            "groups": ygd({"female":"Female","male":"Male"}, {"female": ipt("Female"), "male": ipt("Male")})},
    "agesex": {"source": "yougov-eu2016", "groups": ygd({"m18":"Male 18-24","f18":"Female 18-24","m25":"Male 25-49","f25":"Female 25-49",
                                                          "m50":"Male 50-64","f50":"Female 50-64","m65":"Male 65+","f65":"Female 65+"})},
    "class": {"source": "yougov-eu2016", "turnoutSource": "ipsos-eu2016",
              "groups": ygd({"AB":"AB","C1":"C1","C2":"C2","DE":"DE"}, {g: ipt(g) for g in ("AB","C1","C2","DE")})},
    "education": {"source": "yougov-eu2016", "groups": ygd({"low":"GCSE or lower","alevel":"A level or equivalent","higher":"Higher below degree",
                                                             "degree":"Degree","other":"Other or don't know"})},
    "income": {"source": "yougov-eu2016", "groups": ygd({"u20":"< £20,000","20to40":"£20,000-39,999","40to60":"£40,000-59,999","60plus":"£60,000+"})},
    "party2015": {"source": "yougov-eu2016", "groups": ygd({"con":"Con","lab":"Lab","ld":"Lib Dem","ukip":"UKIP","green":"Green","other":"Other","dnv":"Did not vote"})},
    "tenure": {"source": "ashcroft-eu2016", "groups": ref_groups(ash, {"outright":"Owned outright","mortgage":"Owned with mortgage",
               "council":"Rent from council","ha":"Rent from HA","private":"Other rent"}, "Remain %", "Leave %", "Weighted base", IDS)},
    "ethnicity": {"source": "ashcroft-eu2016", "groups": ref_groups(ash, {"white":"White","asian":"Asian","black":"Black","mixed":"Mixed",
               "chinese":"Chinese","other":"Other"}, "Remain %", "Leave %", "Weighted base", IDS)},
  }
  dims = [
    {"id":"age","label":"Age","groups":[{"id":"18-24","label":"18–24","emoji":"🛹"},{"id":"25-49","label":"25–49","emoji":"☕"},
      {"id":"50-64","label":"50–64","emoji":"⛳"},{"id":"65+","label":"65+","emoji":"🫖"}]},
    {"id":"sex","label":"Sex","groups":[{"id":"female","label":"Women","emoji":"👩"},{"id":"male","label":"Men","emoji":"👨"}]},
    {"id":"agesex","label":"Age × sex","groups":[{"id":"m18","label":"Men 18–24","emoji":"🧢"},{"id":"f18","label":"Women 18–24","emoji":"🎧"},
      {"id":"m25","label":"Men 25–49","emoji":"🧔"},{"id":"f25","label":"Women 25–49","emoji":"👩‍💼"},{"id":"m50","label":"Men 50–64","emoji":"🏌️"},
      {"id":"f50","label":"Women 50–64","emoji":"🌻"},{"id":"m65","label":"Men 65+","emoji":"👴"},{"id":"f65","label":"Women 65+","emoji":"👵"}]},
    {"id":"class","label":"Social grade","groups":[{"id":"AB","label":"AB (managerial & professional)","emoji":"💼"},
      {"id":"C1","label":"C1 (supervisory & clerical)","emoji":"🖇️"},{"id":"C2","label":"C2 (skilled manual)","emoji":"🔧"},
      {"id":"DE","label":"DE (semi/unskilled, not working)","emoji":"🧤"}]},
    {"id":"education","label":"Education","groups":[{"id":"low","label":"GCSE or lower","emoji":"📒"},{"id":"alevel","label":"A level","emoji":"📚"},
      {"id":"higher","label":"Higher, below degree","emoji":"📐"},{"id":"degree","label":"Degree","emoji":"🎓"},{"id":"other","label":"Other / not sure","emoji":"❔"}]},
    {"id":"income","label":"Income","groups":[{"id":"u20","label":"Under £20k","emoji":"🪙"},{"id":"20to40","label":"£20–40k","emoji":"💷"},
      {"id":"40to60","label":"£40–60k","emoji":"🚙"},{"id":"60plus","label":"£60k+","emoji":"🛥️"}]},
    {"id":"party2015","label":"2015 vote","groups":[{"id":"con","label":"Conservative","emoji":"🔵"},{"id":"lab","label":"Labour","emoji":"🔴"},
      {"id":"ld","label":"Lib Dem","emoji":"🟠"},{"id":"ukip","label":"UKIP","emoji":"🟣"},{"id":"green","label":"Green","emoji":"🟢"},
      {"id":"other","label":"Other","emoji":"⚪"},{"id":"dnv","label":"Didn't vote in 2015","emoji":"🛋️"}]},
    {"id":"tenure","label":"Housing","groups":[{"id":"outright","label":"Own it outright","emoji":"🏡"},{"id":"mortgage","label":"Paying a mortgage","emoji":"🏦"},
      {"id":"council","label":"Council tenants","emoji":"🏢"},{"id":"ha","label":"Housing association","emoji":"🏘️"},{"id":"private","label":"Private renters","emoji":"🔑"}]},
    {"id":"ethnicity","label":"Ethnicity","groups":[{"id":"white","label":"White","emoji":"🔵"},{"id":"asian","label":"Asian","emoji":"🟢"},
      {"id":"black","label":"Black","emoji":"🟣"},{"id":"mixed","label":"Mixed","emoji":"🟠"},{"id":"chinese","label":"Chinese","emoji":"🟡"},
      {"id":"other","label":"Other","emoji":"⚪"}]},
  ]
  add_event({"id":"eu2016","label":"2016 EU referendum","short":"Brexit 2016","year":2016,"kind":"referendum","date":"2016-06-23",
    "blurb":"Leave won 51.9% to 48.1% on a 72% turnout. Counted in 382 local areas.",
    "resultsSource":"ec-eu2016","parties":[{"id":"remain","name":"Remain","short":"Remain","colour":"#2B6CB0"},
                                           {"id":"leave","name":"Leave","short":"Leave","colour":"#C53030"}],
    "constituencies":areas,"dimensions":dims,"groupVoting":finish(gv)})

  # ---------------- 2014 Scottish independence referendum ----------------
  councils = []
  with open(os.path.join(POLLS, "indyref2014_areas.csv")) as f:
    for r in csv.DictReader(f):
      councils.append({"id": "sc-" + re.sub(r"[^a-z]+", "-", r["council"].lower()).strip("-"), "name": r["council"], "region": "Scotland",
                       "electorate": int(r["electorate"]), "votes": {"yes": int(r["yes"]), "no": int(r["no"])}})
  assert sum(c["votes"]["yes"] for c in councils) == 1617989
  ashs = {}
  for heading, header, rows in tables("indyref2014_polls.md"):
    if heading.startswith("Page 3") or heading.startswith("Page 4"):
      for r in rows:
        ashs[r[0]] = dict(zip(header, r))
  IDS2 = ("yes", "no")
  ar = lambda m, t=None: ref_groups(ashs, m, "Yes %", "No %", "Base", IDS2, t)
  gv2 = {
    "age": {"source":"ashcroft-indyref","turnoutSource":"icm-indyref","groups": ar({"16-17":"16-17","18-24":"18-24","25-34":"25-34","35-44":"35-44",
             "45-54":"45-54","55-64":"55-64","65+":"65+"}, {"16-17":0.75,"18-24":0.54,"25-34":0.72})},
    "sex": {"source":"ashcroft-indyref","groups": ar({"female":"Female","male":"Male"})},
    "class": {"source":"ashcroft-indyref","groups": ar({"AB":"AB","C1":"C1","C2":"C2","DE":"DE"})},
    "classsex": {"source":"ashcroft-indyref","groups": ar({"mAB":"AB Male","fAB":"AB Female","mC1":"C1 Male","fC1":"C1 Female",
             "mC2":"C2 Male","fC2":"C2 Female","mDE":"DE Male","fDE":"DE Female"})},
    "party": {"source":"ashcroft-indyref","groups": ar({"con":"Westminster: Con","lab":"Westminster: Lab","snp":"Westminster: SNP","ld":"Westminster: LibDem"})},
  }
  dims2 = [
    {"id":"age","label":"Age","groups":[{"id":"16-17","label":"16–17","emoji":"🎒"},{"id":"18-24","label":"18–24","emoji":"🛹"},
      {"id":"25-34","label":"25–34","emoji":"☕"},{"id":"35-44","label":"35–44","emoji":"🧸"},{"id":"45-54","label":"45–54","emoji":"🚗"},
      {"id":"55-64","label":"55–64","emoji":"⛳"},{"id":"65+","label":"65+","emoji":"🫖"}]},
    {"id":"sex","label":"Sex","groups":[{"id":"female","label":"Women","emoji":"👩"},{"id":"male","label":"Men","emoji":"👨"}]},
    {"id":"class","label":"Social grade","groups":[{"id":"AB","label":"AB (managerial & professional)","emoji":"💼"},
      {"id":"C1","label":"C1 (supervisory & clerical)","emoji":"🖇️"},{"id":"C2","label":"C2 (skilled manual)","emoji":"🔧"},
      {"id":"DE","label":"DE (semi/unskilled, not working)","emoji":"🧤"}]},
    {"id":"classsex","label":"Grade × sex","groups":[{"id":"mAB","label":"AB men","emoji":"💼"},{"id":"fAB","label":"AB women","emoji":"👩‍💼"},
      {"id":"mC1","label":"C1 men","emoji":"🖇️"},{"id":"fC1","label":"C1 women","emoji":"📎"},{"id":"mC2","label":"C2 men","emoji":"🔧"},
      {"id":"fC2","label":"C2 women","emoji":"🪛"},{"id":"mDE","label":"DE men","emoji":"🧤"},{"id":"fDE","label":"DE women","emoji":"🧺"}]},
    {"id":"party","label":"Westminster vote","groups":[{"id":"con","label":"Conservative","emoji":"🔵"},{"id":"lab","label":"Labour","emoji":"🔴"},
      {"id":"snp","label":"SNP","emoji":"🟡"},{"id":"ld","label":"Lib Dem","emoji":"🟠"}]},
  ]
  add_event({"id":"indyref2014","label":"2014 Scottish independence referendum","short":"Indyref 2014","year":2014,"kind":"referendum",
    "date":"2014-09-18","blurb":"Scotland voted No to independence, 55.3% to 44.7%, on an 85% turnout. 16- and 17-year-olds could vote.",
    "resultsSource":"indyref-results","parties":[{"id":"yes","name":"Yes","short":"Yes","colour":"#2B6CB0"},{"id":"no","name":"No","short":"No","colour":"#C53030"}],
    "constituencies":councils,"dimensions":dims2,"groupVoting":finish(gv2)})

  sources += [
    {"id":"ec-eu2016","name":"EU referendum results by counting area","publisher":"Electoral Commission",
     "url":"https://www.electoralcommission.org.uk/research-reports-and-data/our-reports-and-data-past-elections-and-referendums/eu-referendum/results-and-turnout-eu-referendum","year":2016,
     "note":"Remain and Leave votes in all 382 counting areas (Remain 16,141,241; Leave 17,410,742)."},
    {"id":"yougov-eu2016","name":"How Britain voted (EU referendum)","publisher":"YouGov","url":"https://yougov.com/en-gb/articles/15796-how-britain-voted","year":2016,
     "tablesUrl":"https://d3nkl3psvxxpe9.cloudfront.net/documents/EUFinalCall_Reweighted.pdf",
     "note":"5,455 adults on 23–24 June 2016. Remain/Leave split and each group's share of voters by age, sex, social grade, education, income and 2015 vote."},
    {"id":"ashcroft-eu2016","name":"How the United Kingdom voted on Thursday… and why","publisher":"Lord Ashcroft Polls",
     "url":"https://lordashcroftpolls.com/2016/06/how-the-united-kingdom-voted-and-why/","year":2016,
     "note":"12,369 referendum voters. Our source for housing and ethnicity."},
    {"id":"ipsos-eu2016","name":"How Britain voted in the 2016 EU referendum","publisher":"Ipsos","url":"https://www.ipsos.com/en-uk/how-britain-voted-2016-eu-referendum","year":2016,
     "note":"Turnout estimates by group, e.g. 53% of 18–24s."},
    {"id":"indyref-results","name":"Scottish independence referendum: results by council area","publisher":"Chief Counting Officer / Electoral Commission",
     "url":"https://www.electoralcommission.org.uk/research-reports-and-data/our-reports-and-data-past-elections-and-referendums/scottish-independence-referendum","year":2014,
     "note":"Yes and No votes in all 32 council areas (Yes 1,617,989; No 2,001,926)."},
    {"id":"ashcroft-indyref","name":"How Scotland voted, and why","publisher":"Lord Ashcroft Polls","url":"https://lordashcroftpolls.com/2014/09/scotland-voted/","year":2014,
     "note":"2,046 referendum voters. Yes/No by age (including 16–17s), sex, social grade and Westminster vote."},
    {"id":"icm-indyref","name":"So how many 16 and 17 year olds voted?","publisher":"What Scotland Thinks (ICM for the Electoral Commission)",
     "url":"https://www.whatscotlandthinks.org/2014/12/many-16-17-year-olds-voted/","year":2014,
     "note":"Self-reported turnout by age, e.g. 75% of 16–17s."},
  ]
