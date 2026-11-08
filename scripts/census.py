"""Seat-level voter mixes from the Census.

For each seat and dimension we work out how over- or under-represented each group is locally
compared with Great Britain as a whole (local share / national share), then scale the national
voter mix by that: voterShare_g x index_g, renormalised. So a seat with twice the national share
of 20-24s gets twice the national share of 20-24 voters, and national turnout differences between
groups are kept.

Census 2021 on 2024 boundaries: ralphascott/UKGE24_wpc_census_summaries (Nomis / ONS / Scotland's
Census). Census 2011 on 2010 boundaries: the parlitools R package (census_11). Scotland 2021 only
has age, sex and ethnicity; Northern Ireland has nothing, so those seats keep the national mix.
"""
import csv, os

HERE = os.path.dirname(os.path.abspath(__file__))


def _f(x):
  try:
    v = float(x)
    return v if v == v else None
  except (TypeError, ValueError):
    return None


def _rows(fname):
  return list(csv.DictReader(open(os.path.join(HERE, "census", fname))))


def groups21(r):
  """Census 2021 row -> {dimension: {group: local amount}} (any scale within a dimension)."""
  g = lambda k: _f(r.get(k))
  out = {}
  a = {k: g("c21Age" + k) for k in ["16to19","20to24","25to29","30to34","35to39","40to44","45to49","50to54","55to59","60to64","65to69","70to74","75to79","80to84","85plus"]}
  if all(v is not None for v in a.values()):
    out["age"] = {"18-24": a["16to19"] / 2 + a["20to24"], "25-29": a["25to29"], "30-39": a["30to34"] + a["35to39"],
                  "40-49": a["40to44"] + a["45to49"], "50-59": a["50to54"] + a["55to59"], "60-69": a["60to64"] + a["65to69"],
                  "70+": a["70to74"] + a["75to79"] + a["80to84"] + a["85plus"]}
  if g("c21Female") is not None:
    out["sex"] = {"female": g("c21Female"), "male": g("c21Male")}
  h = [g("c21House" + k) for k in ["Outright","Mortgage","SocialLA","SocialOther","PrivateLandlord","PrivateOther"]]
  if all(v is not None for v in h):
    out["tenure"] = {"outright": h[0], "mortgage": h[1], "social": h[2] + h[3], "private": h[4] + h[5]}
  e = [g("c21Ethnicity" + k) for k in ["White","Asian","Black","Mixed","Other"]]
  if all(v is not None for v in e):
    out["ethnicity"] = {"white": e[0], "asian": e[1], "black": e[2], "mixed": e[3] + e[4]}
  n = {k: g("c21NSSEC" + k) for k in ["HigherManager","HigherProfessional","LowerManager","Intermediate","SmallEmployer","LowerSupervisor","SemiRoutine","Routine","NeverWorked","LongtermUnemployed"]}
  if all(v is not None for v in n.values()):
    out["class"] = _class(n["HigherManager"], n["HigherProfessional"], n["LowerManager"], n["Intermediate"], n["SmallEmployer"],
                          n["LowerSupervisor"], n["SemiRoutine"], n["Routine"], n["NeverWorked"], n["LongtermUnemployed"])
  q = {k: g("c21Qual" + k) for k in ["None","Level1","Level2","Apprentice","Level3","Level4","Other"]}
  if all(v is not None for v in q.values()):
    out["education"] = {"low": q["None"] + q["Level1"] + q["Level2"] + q["Apprentice"] + q["Other"], "mid": q["Level3"], "degree": q["Level4"]}
  w = {k: g("c21" + k) for k in ["Employed","SelfEmployedwithEmployees","SelfEmployedwithoutEmployees","Unemployed","EmployedFTStudent","UnemployedFTStudent",
                                 "InactiveRetired","InactiveFTStudent","InactiveLookingAfterHome","InactiveLongTermSick","InactiveOther"]}
  if all(v is not None for v in w.values()):
    out["work"] = {"working": w["Employed"] + w["SelfEmployedwithEmployees"] + w["SelfEmployedwithoutEmployees"],
                   "student": w["EmployedFTStudent"] + w["UnemployedFTStudent"] + w["InactiveFTStudent"],
                   "retired": w["InactiveRetired"],
                   "notworking": w["Unemployed"] + w["InactiveLookingAfterHome"] + w["InactiveLongTermSick"] + w["InactiveOther"]}
  return out


def _class(hm, hp, lm, inter, small, sup, semi, rout, never, ltu):
  """Approximate market-research social grades from NS-SeC (students left out):
  AB = managerial & professional, C1 = intermediate, C2 = small employers + lower supervisory/technical,
  DE = semi-routine, routine, never worked and long-term unemployed."""
  return {"AB": hm + hp + lm, "C1": inter, "C2": small + sup, "DE": semi + rout + never + ltu}


def groups11(r):
  g = lambda k: _f(r.get(k))
  out = {}
  a = {k: g("age_" + k) for k in ["18_to_19","20_to_24","25_to_29","30_to_44","45_to_59","60_to_64","65_to_74","75_to_84","85_to_89","90_plus"]}
  if all(v is not None for v in a.values()):
    o75 = a["75_to_84"] + a["85_to_89"] + a["90_plus"]
    # Bands the polls use, spreading Census bands evenly by year of age where they straddle.
    out["age"] = {"18-19": a["18_to_19"], "20-24": a["20_to_24"], "25-29": a["25_to_29"],
                  "30-39": a["30_to_44"] * 10 / 15, "40-49": a["30_to_44"] * 5 / 15 + a["45_to_59"] * 5 / 15,
                  "50-59": a["45_to_59"] * 10 / 15, "60-69": a["60_to_64"] + a["65_to_74"] / 2, "70+": a["65_to_74"] / 2 + o75}
    out["age_ipsos"] = {"18-24": a["18_to_19"] + a["20_to_24"], "25-34": a["25_to_29"] + a["30_to_44"] / 3,
                        "35-44": a["30_to_44"] * 2 / 3, "45-54": a["45_to_59"] * 2 / 3, "55-64": a["45_to_59"] / 3 + a["60_to_64"],
                        "65+": a["65_to_74"] + o75}
  if g("female") is not None:
    out["sex"] = {"female": g("female"), "male": g("male")}
  h = [g("house_" + k) for k in ["outright","mortgage","shared","social_la","social_other","private_landlord","private_other","rent_free"]]
  if all(v is not None for v in h):
    out["tenure"] = {"outright": h[0], "mortgage": h[1] + h[2], "social": h[3] + h[4], "private": h[5] + h[6] + h[7]}
  e = [g("ethnicity_" + k) for k in ["white","mixed","asian","black","other"]]
  if all(v is not None for v in e):
    out["ethnicity"] = {"white": e[0], "bme": e[1] + e[2] + e[3] + e[4]}
  n = [g("nssec" + k) for k in ["higher_manager","higher_professional","lower_manager","intermediate","small_employer","lower_supervisor","semi_routine","routine","never_worked","longterm_unemployed"]]
  if all(v is not None for v in n):
    out["class"] = _class(*n)
  q = {k: g("qual_" + k) for k in ["none","level_1","level_2","apprentice","level_3","level_4","other"]}
  if all(v is not None for v in q.values()):
    out["education"] = {"low": q["none"] + q["level_1"] + q["level_2"] + q["apprentice"] + q["other"], "mid": q["level_3"], "degree": q["level_4"]}
  w = {k: g(k) for k in ["employed_full_time","employed_part_time","self_employed","unemployed","economically_active_student","retired",
                          "economically_inactive_student","looking_after_home","long_term_sick","economic_inactive_other"]}
  if all(v is not None for v in w.values()):
    # Census counts working students as working; the polls put them under "student".
    out["work"] = {"fulltime": w["employed_full_time"] + w["self_employed"], "parttime": w["employed_part_time"],
                   "student": w["economically_active_student"] + w["economically_inactive_student"], "retired": w["retired"],
                   "unemployed": w["unemployed"], "notworking": w["looking_after_home"] + w["long_term_sick"] + w["economic_inactive_other"]}
  return out


def local_mixes(year):
  """{seat id: {dimension: {group: local amount}}} plus population weights."""
  if year >= 2024:
    rows = _rows("census21_wpc2024.csv")
    return {r["ONSConstID"]: (groups21(r), _f(r["c21Population"]) or 0) for r in rows}
  rows = _rows("census11_wpc2010.csv")
  return {r["ons_const_id"]: (groups11(r), _f(r["population"]) or 0) for r in rows}


def attach(ev):
  """Add groupShares (a per-seat voter mix) to every seat of a general election we have Census data for."""
  year = ev["year"]
  data = local_mixes(year)
  dims = {d["id"]: [g["id"] for g in d["groups"]] for d in ev["dimensions"]}
  # Census dimension feeding each event dimension.
  src = {k: k for k in dims}
  if year < 2017 and "age" in dims:
    src["age"] = "age_ipsos"
  # National (GB) average of each local amount, weighted by population.
  nat = {}
  for local, pop in data.values():
    for d, gs in local.items():
      for g, v in gs.items():
        t = nat.setdefault(d, {}).setdefault(g, [0.0, 0.0])
        t[0] += v * pop
        t[1] += pop
  natmean = {d: {g: s / w for g, (s, w) in gs.items()} for d, gs in nat.items()}
  used = {}
  matched = 0
  for c in ev["constituencies"]:
    entry = data.get(c["id"])
    if not entry:
      continue
    matched += 1
    local, _ = entry
    shares = {}
    for d, groups in dims.items():
      sd = src.get(d)
      if sd not in local:
        continue
      lv, nv = local[sd], natmean[sd]
      gv = ev["groupVoting"][d]["groups"]
      # Index each group by local/national share; groups the Census doesn't cover (e.g. "living with family") stay at 1.
      lsum = sum(lv.get(g, 0) for g in groups if g in lv)
      nsum = sum(nv.get(g, 0) for g in groups if g in nv)
      w = {}
      for g in groups:
        idx = (lv[g] / lsum) / (nv[g] / nsum) if g in lv and nv.get(g) and lsum > 0 else 1.0
        w[g] = gv[g]["voterShare"] * idx
      tot = sum(w.values())
      if tot <= 0:
        continue
      shares[d] = {g: round(v / tot, 5) for g, v in w.items()}
      used[d] = used.get(d, 0) + 1
    if shares:
      c["groupShares"] = shares
  return matched, used
