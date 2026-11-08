"""Make scripts/census/census11_la.csv: Census 2011 by local authority on the 2016 counting areas.

One-off prep script. Run with the folder holding the raw downloads:
  python3 scripts/census/make_la_extract.py <raw dir>

Raw files (all Census 2011, copied from public GitHub repos that mirror ONS / Nomis / NRS tables):
  ages.csv, sex.csv, ethnic_groups.csv  dxe4/demographics data/ (ONS Census 2011 UK tables KS102UK, KS101UK, KS201UK)
  qualifications.csv, social_grade.csv  0emerald/GB-Hyperlinks_N-S-Divide 19CorrelationMatrices/ (Nomis, GB local authorities)
  tenure.csv                            anetobradley/energy_flex .../data/census/tenure-households-lad.csv (Nomis KS402EW, England & Wales)
Scotland has no tenure here; it keeps the national housing mix.
"""
import csv, os, sys

RAW = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "census11_la.csv")
# Councils that got new codes between the 2011 Census and the 2016 referendum (same boundaries).
RECODE = {"E07000097": "E07000242", "E07000100": "E07000240", "E07000101": "E07000243", "E07000104": "E07000241",
          "E08000020": "E08000037", "E06000048": "E06000057"}


def n(x):
  return float(x.replace(",", "")) if x.strip() not in ("", "-") else 0.0


def ons(fname, ncols):
  """ONS UK tables: 'Area code' then numbers (with thousands commas). Returns {code: [numbers]}."""
  out = {}
  for r in csv.reader(open(os.path.join(RAW, fname))):
    code = (r[0] if r else "").strip()
    if len(code) == 9 and code[0] in "EWS" and code[1:3] in ("06", "07", "08", "09", "12"):
      out[RECODE.get(code, code)] = [n(x) for x in r[1:1 + ncols]]
  return out


def nomis(fname):
  """Nomis tables: date, geography, geography code, [Rural Urban], values. Returns {code: (name, {col: value})}."""
  rows = list(csv.reader(open(os.path.join(RAW, fname))))
  head = rows[0]
  out = {}
  for r in rows[1:]:
    if len(r) < 4:
      continue
    if "Rural Urban" in head and r[head.index("Rural Urban")] != "Total":
      continue
    code = RECODE.get(r[2], r[2])
    out[code] = (r[1], {h: n(v) for h, v in zip(head, r) if "measures" in h})
  return out


age = ons("ages.csv", 17)       # All, 0-4, 5-7, 8-9, 10-14, 15, 16-17, 18-19, 20-24, 25-29, 30-44, 45-59, 60-64, 65-74, 75-84, 85-89, 90+
sex = ons("sex.csv", 3)         # All, Males, Females
eth = ons("ethnic_groups.csv", 11)  # All, White, Gypsy/Traveller, Mixed, Indian, Pakistani, Bangladeshi, Chinese, Other Asian, Black, Other
qual = nomis("qualifications.csv")
sg = nomis("social_grade.csv")
ten = nomis("tenure.csv")


def col(d, key):
  return next(v for k, v in d.items() if key in k)


cols = ["area_code", "name", "population", "male", "female",
        "age_16_to_17", "age_18_to_19", "age_20_to_24", "age_25_to_29", "age_30_to_44", "age_45_to_59", "age_60_to_64", "age_65_to_74", "age_75_plus",
        "sg_AB", "sg_C1", "sg_C2", "sg_DE",
        "qual_none", "qual_level_1", "qual_level_2", "qual_apprentice", "qual_level_3", "qual_level_4", "qual_other",
        "house_outright", "house_mortgage", "house_council", "house_ha", "house_private",
        "eth_white", "eth_mixed", "eth_asian", "eth_chinese", "eth_black", "eth_other"]
rows = []
for code, (name, s) in sorted(sg.items()):
  if code not in age:
    continue
  a, x, e = age[code], sex[code], eth[code]
  row = {"area_code": code, "name": name, "population": a[0], "male": x[1], "female": x[2],
         "age_16_to_17": a[6], "age_18_to_19": a[7], "age_20_to_24": a[8], "age_25_to_29": a[9], "age_30_to_44": a[10],
         "age_45_to_59": a[11], "age_60_to_64": a[12], "age_65_to_74": a[13], "age_75_plus": a[14] + a[15] + a[16],
         "sg_AB": col(s, "grade AB"), "sg_C1": col(s, "grade C1"), "sg_C2": col(s, "grade C2"), "sg_DE": col(s, "grade DE"),
         "eth_white": e[1] + e[2], "eth_mixed": e[3], "eth_asian": e[4] + e[5] + e[6] + e[8], "eth_chinese": e[7], "eth_black": e[9], "eth_other": e[10]}
  if code in qual:
    q = qual[code][1]
    row.update({"qual_none": col(q, "No qualifications"), "qual_level_1": col(q, "Level 1"), "qual_level_2": col(q, "Level 2"),
                "qual_apprentice": col(q, "Apprenticeship"), "qual_level_3": col(q, "Level 3"), "qual_level_4": col(q, "Level 4"),
                "qual_other": col(q, "Other qualifications")})
  if code in ten:
    t = ten[code][1]
    row.update({"house_outright": col(t, "Owned outright"), "house_mortgage": col(t, "mortgage") + col(t, "Shared ownership"),
                "house_council": col(t, "Rented from council"), "house_ha": col(t, "Other social rented"),
                "house_private": col(t, "Private rented: Total") + col(t, "Living rent free")})
  rows.append(row)
with open(OUT, "w", newline="") as f:
  w = csv.DictWriter(f, fieldnames=cols)
  w.writeheader()
  for r in rows:
    w.writerow({k: (int(v) if isinstance(v, float) else v) for k, v in r.items()})
print(len(rows), "areas;", sum(1 for r in rows if "house_outright" in r), "with tenure;", sum(1 for r in rows if "qual_none" in r), "with qualifications")
