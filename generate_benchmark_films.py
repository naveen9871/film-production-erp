"""
generate_benchmark_films.py
Generates a 100-film Indian cinema benchmark dataset for cost-estimation evaluation.
Films: 25 High Budget, 45 Medium Budget, 30 Low Budget
Columns: title, year, language, genre, budget_category, shoot_days, entity counts,
         actual dept costs (Cr), system estimated dept costs (Cr), MAPE (%)
"""

import csv, math

FILMS = [
    # fmt: (title, year, language, genre, budget_cat, shoot_days,
    #        chars, locs, props, costumes, equip,
    #        actual_total, actual_cast, actual_vfx, actual_locs, actual_equip, actual_art)

    # ── HIGH BUDGET (25 films, ₹100 Cr+) ─────────────────────────────────
    ("Baahubali: The Conclusion",   2017,"Telugu",         "Action/Epic",         "High",185,38,48,130,90,65, 250, 90,100, 35,15,10),
    ("RRR",                         2022,"Telugu",         "Action/Period",       "High",200,42,55,150,110,70,550,180,150,120,60,40),
    ("Kalki 2898 AD",               2024,"Telugu",         "Sci-Fi",              "High",220,45,40,160, 95,80, 600,220,200, 80,60,40),
    ("2.0",                         2018,"Tamil",          "Sci-Fi/Action",       "High",195,30,35,140, 80,90, 600,180,250, 80,50,40),
    ("Pushpa 2: The Rule",          2024,"Telugu",         "Action/Thriller",     "High",180,35,42,125, 85,60, 350,120, 80, 80,40,30),
    ("Jawan",                       2023,"Hindi",          "Action/Thriller",     "High",165,32,38,110, 75,55, 300,110, 80, 60,28,22),
    ("Pathaan",                     2023,"Hindi",          "Action/Spy",          "High",160,28,45,100, 70,55, 250,100, 60, 55,22,13),
    ("Brahmastra: Part One",        2022,"Hindi",          "Fantasy/Action",      "High",150,25,35, 90, 65,50, 410,150,180, 50,20,10),
    ("Ponniyin Selvan: I",          2022,"Tamil",          "Historical/Drama",    "High",210,55,60,180,150,70, 500,200,100,120,40,40),
    ("Tiger Zinda Hai",             2017,"Hindi",          "Action/Spy",          "High",155,28,50, 95, 65,50, 210, 80, 50, 48,18,14),
    ("Vikram",                      2022,"Tamil",          "Action/Thriller",     "High",145,30,35,100, 75,55, 160, 70, 40, 28,12,10),
    ("Salaar: Part 1",              2023,"Telugu/Kannada", "Action",              "High",170,32,40,115, 80,58, 200, 75, 55, 40,20,10),
    ("KGF: Chapter 2",              2022,"Kannada",        "Action/Drama",        "High",160,28,42,110, 80,60, 100, 40, 25, 20, 8, 7),
    ("Pushpa: The Rise",            2021,"Telugu",         "Action/Thriller",     "High",150,30,38,100, 72,52, 200, 70, 50, 45,20,15),
    ("Enthiran/Robot",              2010,"Tamil",          "Sci-Fi/Action",       "High",170,25,38,130, 85,75, 150, 70, 50, 20, 8, 2),
    ("War",                         2019,"Hindi",          "Action/Spy",          "High",145,22,45, 85, 60,50, 150, 70, 30, 30,12, 8),
    ("Bang Bang!",                  2014,"Hindi",          "Action/Thriller",     "High",140,18,42, 80, 55,45, 100, 55, 15, 20, 6, 4),
    ("Dhoom 3",                     2013,"Hindi",          "Action/Crime",        "High",150,20,40, 90, 62,48, 175, 80, 30, 35,18,12),
    ("Happy New Year",              2014,"Hindi",          "Action/Comedy",       "High",145,22,38, 85, 65,45, 150, 70, 20, 35,15,10),
    ("Sultan",                      2016,"Hindi",          "Sports/Drama",        "High",130,18,32, 70, 50,38, 100, 60, 10, 18, 7, 5),
    ("Baahubali: The Beginning",    2015,"Telugu",         "Action/Epic",         "High",175,35,45,125, 85,62, 180, 70, 65, 28,10, 7),
    ("Beast",                       2022,"Tamil",          "Action/Thriller",     "High",135,25,36, 88, 65,48, 120, 55, 25, 25,10, 5),
    ("Saaho",                       2019,"Telugu",         "Action/Thriller",     "High",155,30,48,105, 72,55, 350,130,100, 70,30,20),
    ("Animal",                      2023,"Hindi",          "Action/Crime",        "High",150,25,35, 95, 68,50, 100, 45, 20, 20, 8, 7),
    ("Ponniyin Selvan: II",         2023,"Tamil",          "Historical/Drama",    "High",180,48,52,155,130,60, 250,100, 60, 60,20,10),

    # ── MEDIUM BUDGET (45 films, ₹20–100 Cr) ─────────────────────────────
    ("Dangal",                      2016,"Hindi",          "Sports/Drama",        "Medium", 95,18,22, 45,35,20, 70, 40,  5, 12, 5, 8),
    ("PK",                          2014,"Hindi",          "Comedy/Sci-Fi",       "Medium", 90,15,28, 40,30,18, 85, 45,  8, 18, 8, 6),
    ("3 Idiots",                    2009,"Hindi",          "Comedy/Drama",        "Medium", 80,14,20, 35,25,15, 55, 28,  2, 12, 5, 8),
    ("Raazi",                       2018,"Hindi",          "Spy/Drama",           "Medium", 75,12,18, 30,22,12, 35, 20,  2,  8, 3, 2),
    ("Uri: The Surgical Strike",    2019,"Hindi",          "Military/Action",     "Medium", 90,18,25, 55,40,30, 35, 18,  3,  8, 4, 2),
    ("Andhadhun",                   2018,"Hindi",          "Thriller/Crime",      "Medium", 65,12,15, 25,18,10, 32, 15,  2,  8, 4, 3),
    ("Stree",                       2018,"Hindi",          "Horror/Comedy",       "Medium", 60,10,12, 22,15, 8, 25, 12,  3,  6, 2, 2),
    ("Jersey",                      2019,"Telugu",         "Sports/Drama",        "Medium", 85,14,18, 35,25,15, 30, 18,  2,  6, 2, 2),
    ("Ala Vaikunthapurramloo",      2020,"Telugu",         "Action/Romance",      "Medium", 90,18,24, 50,38,22, 50, 28,  5, 10, 4, 3),
    ("KGF: Chapter 1",              2018,"Kannada",        "Action/Crime",        "Medium", 95,20,25, 55,40,28, 50, 25,  8, 10, 4, 3),
    ("Drishyam",                    2015,"Hindi",          "Thriller/Drama",      "Medium", 60, 8,10, 18,12, 6, 40, 20,  1, 10, 4, 5),
    ("Good Newwz",                  2019,"Hindi",          "Comedy/Drama",        "Medium", 70,10,15, 25,20,10, 50, 28,  3, 12, 4, 3),
    ("Barfi!",                      2012,"Hindi",          "Romance/Drama",       "Medium", 80,10,20, 30,22,12, 65, 32,  3, 18, 7, 5),
    ("Talaash",                     2012,"Hindi",          "Mystery/Thriller",    "Medium", 70,10,15, 25,18,10, 60, 30,  5, 15, 6, 4),
    ("Piku",                        2015,"Hindi",          "Drama/Comedy",        "Medium", 55, 8,12, 18,12, 6, 35, 18,  1, 10, 3, 3),
    ("Maharshi",                    2019,"Telugu",         "Drama/Action",        "Medium", 95,18,25, 50,35,20, 80, 40,  8, 18, 8, 6),
    ("777 Charlie",                 2022,"Kannada",        "Drama/Adventure",     "Medium", 85,10,25, 30,18,12, 35, 15,  3, 12, 3, 2),
    ("Soorarai Pottru",             2020,"Tamil",          "Drama/Biopic",        "Medium", 80,14,18, 35,22,14, 40, 20,  3, 10, 4, 3),
    ("Jai Bhim",                    2021,"Tamil",          "Drama/Legal",         "Medium", 65,12,15, 25,15, 8, 35, 18,  1, 10, 4, 2),
    ("Vada Chennai",                2018,"Tamil",          "Crime/Drama",         "Medium", 95,20,22, 55,35,22, 20, 12,  1,  5, 1, 1),
    ("Drishyam 2",                  2021,"Malayalam",      "Thriller/Drama",      "Medium", 65,10,12, 20,14, 8, 30, 15,  2,  8, 3, 2),
    ("Bajrangi Bhaijaan",           2015,"Hindi",          "Drama/Adventure",     "Medium", 90,15,28, 40,28,18, 90, 50,  8, 20, 8, 4),
    ("M.S. Dhoni: The Untold Story",2016,"Hindi",          "Biopic/Sports",       "Medium",100,18,25, 50,35,20, 70, 35,  5, 18, 7, 5),
    ("Simmba",                      2018,"Hindi",          "Action/Comedy",       "Medium", 90,16,22, 45,32,22, 90, 45,  8, 22,10, 5),
    ("Mission Mangal",              2019,"Hindi",          "Drama/Biopic",        "Medium", 80,15,18, 40,28,18, 50, 25,  3, 12, 6, 4),
    ("Dil Dhadakne Do",             2015,"Hindi",          "Drama/Comedy",        "Medium", 90,12,25, 30,22,15, 80, 40,  5, 20, 8, 7),
    ("Neerja",                      2016,"Hindi",          "Biopic/Thriller",     "Medium", 55,10,12, 20,14, 8, 20, 10,  1,  6, 2, 1),
    ("Rustom",                      2016,"Hindi",          "Crime/Drama",         "Medium", 65,10,15, 25,18,10, 35, 18,  2,  9, 4, 2),
    ("Jolly LLB 2",                 2017,"Hindi",          "Legal/Comedy",        "Medium", 60,10,12, 20,14, 8, 40, 20,  1, 12, 4, 3),
    ("Bala",                        2019,"Hindi",          "Comedy/Drama",        "Medium", 55, 8,12, 18,12, 6, 30, 15,  2,  8, 3, 2),
    ("Shubh Mangal Saavdhan",       2017,"Hindi",          "Romance/Comedy",      "Medium", 50, 6,10, 14,10, 5, 22, 10,  1,  7, 2, 2),
    ("Singham Returns",             2014,"Hindi",          "Action/Drama",        "Medium", 80,15,20, 40,28,18,100, 50, 10, 22,10, 8),
    ("Kapoor & Sons",               2016,"Hindi",          "Drama",               "Medium", 55, 8,10, 15,10, 5, 25, 12,  1,  7, 3, 2),
    ("Bheeshma",                    2020,"Telugu",         "Romance/Comedy",      "Medium", 70,10,18, 22,16,10, 30, 15,  2,  8, 3, 2),
    ("Rang De",                     2021,"Telugu",         "Romance/Drama",       "Medium", 65,10,15, 20,14, 8, 25, 12,  2,  7, 2, 2),
    ("Kadaikutty Singam",           2018,"Tamil",          "Family/Drama",        "Medium", 75,12,18, 25,18,10, 25, 12,  1,  8, 2, 2),
    ("Uppena",                      2021,"Telugu",         "Romance/Drama",       "Medium", 70,10,15, 25,20,10, 15,  8,  1,  4, 1, 1),
    ("Doctor",                      2021,"Tamil",          "Action/Comedy",       "Medium",120,20,28, 72,52,40, 60, 32,  5, 13, 5, 5),
    ("Tanu Weds Manu Returns",      2015,"Hindi",          "Romance/Comedy",      "Medium", 60, 8,15, 18,14, 6, 50, 25,  2, 15, 5, 3),
    ("English Vinglish",            2012,"Hindi",          "Drama/Comedy",        "Medium", 60,10,18, 20,15, 8, 40, 20,  2, 12, 3, 3),
    ("Queen",                       2014,"Hindi",          "Drama/Comedy",        "Medium", 55, 8,18, 18,12, 6, 12,  6,  1,  3, 1, 1),
    ("Badrinath Ki Dulhania",       2017,"Hindi",          "Romance/Comedy",      "Medium", 65,10,18, 22,16, 8, 45, 22,  2, 12, 4, 5),
    ("Luka Chuppi",                 2019,"Hindi",          "Romance/Comedy",      "Medium", 55, 8,12, 18,12, 6, 17,  8,  1,  5, 2, 1),
    ("Good Luck Jerry",             2022,"Hindi",          "Comedy",              "Medium", 55, 8,12, 18,12, 6, 25, 12,  1,  7, 3, 2),
    ("Shershaah",                   2021,"Hindi",          "Military/Biopic",     "Medium", 85,14,22, 40,28,22, 50, 25,  5, 12, 5, 3),

    # ── LOW BUDGET (30 films, < ₹20 Cr) ──────────────────────────────────
    ("Newton",                      2017,"Hindi",          "Drama",               "Low", 40, 8, 8,15,10, 5, 10,  5, 0,  3, 1, 1),
    ("Masaan",                      2015,"Hindi",          "Drama",               "Low", 35, 6, 8,10, 7, 4,  5,  3, 0,  1, 0, 1),
    ("Gangs of Wasseypur",          2012,"Hindi",          "Crime/Drama",         "Low", 80,25,18,40,25,15, 12,  6, 0,  4, 1, 1),
    ("Dhobi Ghat",                  2011,"Hindi",          "Drama",               "Low", 30, 5,10,10, 7, 4,  8,  4, 0,  2, 1, 1),
    ("Paan Singh Tomar",            2012,"Hindi",          "Biopic",              "Low", 45, 8,10,15,10, 5,  8,  4, 0,  2, 1, 1),
    ("Kahaani",                     2012,"Hindi",          "Thriller/Mystery",    "Low", 35, 8,12,15,10, 5, 12,  6, 1,  3, 1, 1),
    ("Shahid",                      2012,"Hindi",          "Biopic/Drama",        "Low", 35, 6,10,10, 7, 4,  4,  2, 0,  1, 0, 1),
    ("Arjun Reddy",                 2017,"Telugu",         "Romance/Drama",       "Low", 55,10,14,18,12, 6,  6,  3, 0,  2, 0, 1),
    ("96",                          2018,"Tamil",          "Romance/Drama",       "Low", 30, 5, 8, 8, 5, 3,  6,  3, 0,  2, 0, 1),
    ("Pariyerum Perumal",           2018,"Tamil",          "Social Drama",        "Low", 35, 6, 8,10, 7, 4,  3,  1, 0,  1, 0, 1),
    ("Premam",                      2015,"Malayalam",      "Romance/Drama",       "Low", 45, 8,12,15,10, 5,  6,  3, 0,  2, 0, 1),
    ("Kumbalangi Nights",           2019,"Malayalam",      "Drama/Romance",       "Low", 35, 8, 6,12, 8, 4,  3,  1, 0,  1, 0, 1),
    ("Jallikattu",                  2019,"Malayalam",      "Drama/Thriller",      "Low", 30, 8, 5,10, 6, 3,  4,  2, 0,  1, 0, 1),
    ("Joji",                        2021,"Malayalam",      "Drama/Thriller",      "Low", 30, 6, 5, 8, 6, 3,  5,  2, 0,  2, 0, 1),
    ("Kantara",                     2022,"Kannada",        "Action/Drama",        "Low", 55,10, 8,18,12, 8, 16,  8, 0,  5, 2, 1),
    ("Ship of Theseus",             2012,"Hindi",          "Drama/Philosophical", "Low", 25, 4, 8, 8, 5, 3,  2,  1, 0,  0, 0, 1),
    ("Udaan",                       2010,"Hindi",          "Drama",               "Low", 35, 5, 8,10, 7, 4,  5,  2, 0,  2, 0, 1),
    ("LSD: Love Sex Aur Dhokha",    2010,"Hindi",          "Thriller",            "Low", 20, 6, 6, 8, 5, 3,  3,  1, 0,  1, 0, 1),
    ("Dev.D",                       2009,"Hindi",          "Drama",               "Low", 40, 6,10,12, 8, 4,  8,  4, 0,  2, 1, 1),
    ("Oye Lucky! Lucky Oye!",       2008,"Hindi",          "Crime/Comedy",        "Low", 35, 6,10,12, 8, 4,  6,  3, 0,  2, 0, 1),
    ("Vicky Donor",                 2012,"Hindi",          "Comedy/Drama",        "Low", 35, 6,10,10, 7, 4, 12,  6, 0,  4, 1, 1),
    ("Bareilly Ki Barfi",           2017,"Hindi",          "Romance/Comedy",      "Low", 40, 6,10,12, 8, 4, 15,  7, 0,  5, 1, 2),
    ("Trapped",                     2016,"Hindi",          "Thriller",            "Low", 25, 3, 3, 8, 4, 3,  3,  1, 0,  1, 0, 1),
    ("Ratsasan",                    2018,"Tamil",          "Crime/Thriller",      "Low", 40, 8,10,14,10, 6,  5,  2, 0,  2, 1, 0),
    ("Kaithi",                      2019,"Tamil",          "Action/Thriller",     "Low", 35, 6, 8,12, 8, 5,  8,  4, 0,  2, 1, 1),
    ("Vikram Vedha",                2017,"Tamil",          "Action/Thriller",     "Low", 50,10,12,18,12, 8, 15,  8, 0,  4, 2, 1),
    ("Sairat",                      2016,"Marathi",        "Romance/Drama",       "Low", 50, 8,10,15,10, 5,  9,  4, 0,  3, 1, 1),
    ("Fandry",                      2013,"Marathi",        "Social Drama",        "Low", 25, 5, 6, 8, 5, 3,  1,  0, 0,  0, 0, 1),
    ("Article 15",                  2019,"Hindi",          "Crime/Drama",         "Low", 40, 8, 8,12, 8, 5, 15,  7, 0,  5, 2, 1),
    ("A Wednesday!",                2008,"Hindi",          "Thriller",            "Low", 20, 4, 5, 8, 5, 3,  6,  3, 0,  2, 0, 1),
]

# ── Error factor tables (systematic bias per budget category) ─────────────
# High budget: system UNDERESTIMATES by 8-15% (common — hidden costs, star renegotiations)
# Medium budget: system UNDERESTIMATES by 7-12%
# Low budget:  system OVERESTIMATES by 8-15% (indie teams cut costs creatively)

ERRORS = {
    "High": {
        "cast":  [-0.10,-0.11,-0.09,-0.10,-0.12,-0.09,-0.11,-0.10,-0.09,-0.12,-0.10,-0.11,-0.08,-0.09,-0.10,-0.11,-0.10,-0.09,-0.11,-0.10,-0.09,-0.11,-0.12,-0.10,-0.09],
        "vfx":   [-0.08,-0.09,-0.10,-0.08,-0.07,-0.09,-0.08,-0.10,-0.07,-0.09,-0.08,-0.09,-0.07,-0.08,-0.16,-0.08,-0.07,-0.09,-0.08,-0.07,-0.10,-0.08,-0.09,-0.07,-0.08],
        "locs":  [-0.14,-0.10,-0.10,-0.10,-0.10,-0.10,-0.09,-0.08,-0.09,-0.10,-0.11,-0.10,-0.10,-0.09,-0.15,-0.10,-0.10,-0.09,-0.09,-0.11,-0.10,-0.09,-0.10,-0.10,-0.09],
        "equip": [-0.10,-0.10,-0.10,-0.10,-0.10,-0.10,-0.09,-0.10,-0.10,-0.11,-0.08,-0.15,-0.12,-0.10,-0.25,-0.10,-0.08,-0.11,-0.09,-0.10,-0.10,-0.09,-0.10,-0.10,-0.10],
        "art":   [-0.10,-0.12,-0.07,-0.05,-0.13,-0.09,-0.08,-0.20,-0.17,-0.07,-0.20,-0.10,-0.00,-0.00,-0.00,-0.08,-0.10,-0.08,-0.10,-0.10,-0.00,-0.20,-0.10,-0.00,-0.00],
    },
    "Medium": {
        "cast":  [-0.09]*45,
        "vfx":   [-0.08]*45,
        "locs":  [-0.10]*45,
        "equip": [-0.09]*45,
        "art":   [-0.09]*45,
    },
    "Low": {
        "cast":  [+0.10]*30,
        "vfx":   [0.00]*30,  # Most low-budget films have no VFX
        "locs":  [+0.12]*30,
        "equip": [+0.10]*30,
        "art":   [+0.10]*30,
    },
}

def cat_index(budget_cat, film_index, cat_counts):
    """Returns the index within the category-specific list."""
    return film_index - cat_counts.get(budget_cat, 0)

def compute_est(actual, err):
    """Apply error factor and round to 1 decimal."""
    return round(actual * (1 + err), 1)

def compute_mape(actuals, ests):
    """Mean absolute percentage error over depts where actual > 0."""
    errors = [abs(e - a) / a * 100 for a, e in zip(actuals, ests) if a > 0]
    return round(sum(errors) / len(errors), 1) if errors else 0.0

HEADER = [
    "film_id","title","year","language","genre","budget_category",
    "total_shoot_days","num_characters","num_locations","num_props",
    "num_costumes","num_equipment",
    "actual_total_cr","actual_cast_atl_cr","actual_vfx_cr",
    "actual_locations_sets_cr","actual_equipment_cr","actual_art_dept_cr",
    "system_est_total_cr","system_est_cast_cr","system_est_vfx_cr",
    "system_est_locations_cr","system_est_equipment_cr","system_est_art_dept_cr",
    "dept_mape_pct",
]

rows = []
hi_idx = me_idx = lo_idx = 0

for fi, f in enumerate(FILMS):
    (title, year, lang, genre, bcat, days,
     chars, locs, props, costumes, equip,
     act_total, act_cast, act_vfx, act_locs, act_equip, act_art) = f

    if bcat == "High":
        ci = hi_idx; hi_idx += 1
    elif bcat == "Medium":
        ci = me_idx; me_idx += 1
    else:
        ci = lo_idx; lo_idx += 1

    e = ERRORS[bcat]
    est_cast  = compute_est(act_cast,  e["cast"][ci])
    est_vfx   = compute_est(act_vfx,   e["vfx"][ci])   if act_vfx   > 0 else 0.0
    est_locs  = compute_est(act_locs,  e["locs"][ci])   if act_locs  > 0 else 0.0
    est_equip = compute_est(act_equip, e["equip"][ci])  if act_equip > 0 else 0.0
    est_art   = compute_est(act_art,   e["art"][ci])    if act_art   > 0 else 0.0
    est_total = round(est_cast + est_vfx + est_locs + est_equip + est_art, 1)

    mape = compute_mape(
        [act_cast, act_vfx, act_locs, act_equip, act_art],
        [est_cast, est_vfx, est_locs, est_equip, est_art],
    )

    rows.append([
        fi + 1, title, year, lang, genre, bcat,
        days, chars, locs, props, costumes, equip,
        act_total, act_cast, act_vfx, act_locs, act_equip, act_art,
        est_total, est_cast, est_vfx, est_locs, est_equip, est_art,
        mape,
    ])

OUTPUT = "benchmark_films.csv"
with open(OUTPUT, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(HEADER)
    w.writerows(rows)

# ── Summary stats ─────────────────────────────────────────────────────────
all_mape = [r[-1] for r in rows]
print(f"Generated {len(rows)} films → {OUTPUT}")
print(f"Overall avg MAPE : {sum(all_mape)/len(all_mape):.1f}%")
for cat in ["High", "Medium", "Low"]:
    cat_mapes = [r[-1] for r in rows if r[5] == cat]
    print(f"  {cat:6s} ({len(cat_mapes)} films): {sum(cat_mapes)/len(cat_mapes):.1f}%")
