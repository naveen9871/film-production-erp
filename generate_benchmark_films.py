"""
generate_benchmark_films.py
Generates the 200-film Indian cinema benchmark used for cost-estimation evaluation.
Mix: 50 High (≥ ₹100 Cr), 90 Medium (₹20–100 Cr), 60 Low (< ₹20 Cr).
The first 100 rows are the mid-semester hand-entered set. The second 100 add
released films whose totals are rounded trade figures. Entity counts for the
added rows come from a genre/scale profile plus a title-seeded jitter, not
from shoot days. Department splits are estimated ratios that sum to the
reported total. See BENCHMARK_PROVENANCE.md.
"""

import csv, math, os, json

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

# Second hundred. Compact fields only:
# (title, year, language, genre, budget_cat, shoot_days, reported_total_cr)
# Entity counts and department splits are filled by expand_additional().
ADDITIONAL = [
    # ── HIGH (25) ────────────────────────────────────────────────────────
    ("Padmaavat", 2018, "Hindi", "Historical/Drama", "High", 175, 215),
    ("Bajirao Mastani", 2015, "Hindi", "Historical/Romance", "High", 165, 145),
    ("Krrish 3", 2013, "Hindi", "Sci-Fi/Action", "High", 150, 130),
    ("Thugs of Hindostan", 2018, "Hindi", "Action/Adventure", "High", 160, 300),
    ("Zero", 2018, "Hindi", "Drama/Romance", "High", 140, 200),
    ("Sooryavanshi", 2021, "Hindi", "Action", "High", 130, 160),
    ("83", 2021, "Hindi", "Sports/Biopic", "High", 125, 240),
    ("Samrat Prithviraj", 2022, "Hindi", "Historical/Action", "High", 140, 200),
    ("Shamshera", 2022, "Hindi", "Action/Period", "High", 150, 150),
    ("Laal Singh Chaddha", 2022, "Hindi", "Drama", "High", 120, 180),
    ("Adipurush", 2023, "Hindi", "Mythology/Epic", "High", 180, 500),
    ("Tiger 3", 2023, "Hindi", "Action/Spy", "High", 150, 300),
    ("Fighter", 2024, "Hindi", "Action", "High", 140, 250),
    ("Bade Miyan Chote Miyan", 2024, "Hindi", "Action", "High", 145, 350),
    ("Maidaan", 2024, "Hindi", "Sports/Drama", "High", 170, 235),
    ("Singham Again", 2024, "Hindi", "Action", "High", 140, 350),
    ("Indian 2", 2024, "Tamil", "Action", "High", 160, 250),
    ("Leo", 2023, "Tamil", "Action/Thriller", "High", 120, 300),
    ("Jailer", 2023, "Tamil", "Action/Comedy", "High", 100, 200),
    ("Devara: Part 1", 2024, "Telugu", "Action", "High", 165, 300),
    ("Tanhaji", 2020, "Hindi", "Historical/Action", "High", 130, 150),
    ("Race 3", 2018, "Hindi", "Action", "High", 95, 150),
    ("Dilwale", 2015, "Hindi", "Action/Romance", "High", 120, 125),
    ("Shivaay", 2016, "Hindi", "Action", "High", 140, 110),
    ("Chennai Express", 2013, "Hindi", "Action/Comedy", "High", 100, 120),

    # ── MEDIUM (45) ──────────────────────────────────────────────────────
    ("Zindagi Na Milegi Dobara", 2011, "Hindi", "Romance/Adventure", "Medium", 80, 55),
    ("Rockstar", 2011, "Hindi", "Drama/Romance", "Medium", 70, 35),
    ("Yeh Jawaani Hai Deewani", 2013, "Hindi", "Romance", "Medium", 75, 50),
    ("Tamasha", 2015, "Hindi", "Drama/Romance", "Medium", 65, 40),
    ("Ae Dil Hai Mushkil", 2016, "Hindi", "Romance/Drama", "Medium", 80, 75),
    ("Dear Zindagi", 2016, "Hindi", "Drama", "Medium", 50, 35),
    ("Pink", 2016, "Hindi", "Drama/Legal", "Medium", 40, 22),
    ("Airlift", 2016, "Hindi", "Thriller", "Medium", 60, 35),
    ("Fan", 2016, "Hindi", "Thriller", "Medium", 75, 85),
    ("Raees", 2017, "Hindi", "Crime/Action", "Medium", 90, 95),
    ("Toilet: Ek Prem Katha", 2017, "Hindi", "Comedy/Drama", "Medium", 50, 24),
    ("Hindi Medium", 2017, "Hindi", "Comedy", "Medium", 40, 20),
    ("Badhaai Ho", 2018, "Hindi", "Comedy/Drama", "Medium", 42, 22),
    ("Kalank", 2019, "Hindi", "Romance/Drama", "Medium", 95, 90),
    ("Super 30", 2019, "Hindi", "Drama/Biopic", "Medium", 65, 45),
    ("Chhichhore", 2019, "Hindi", "Drama/Comedy", "Medium", 55, 40),
    ("Batla House", 2019, "Hindi", "Action/Drama", "Medium", 50, 35),
    ("Dream Girl", 2019, "Hindi", "Comedy", "Medium", 40, 28),
    ("Kabir Singh", 2019, "Hindi", "Romance/Drama", "Medium", 70, 60),
    ("Dabangg 3", 2019, "Hindi", "Action", "Medium", 65, 90),
    ("Malang", 2020, "Hindi", "Thriller", "Medium", 50, 40),
    ("Baaghi 3", 2020, "Hindi", "Action", "Medium", 70, 80),
    ("Thappad", 2020, "Hindi", "Drama", "Medium", 35, 22),
    ("Gunjan Saxena", 2020, "Hindi", "Biopic", "Medium", 50, 30),
    ("Ludo", 2020, "Hindi", "Comedy/Anthology", "Medium", 45, 30),
    ("Atrangi Re", 2021, "Hindi", "Romance", "Medium", 55, 45),
    ("Chandigarh Kare Aashiqui", 2021, "Hindi", "Romance/Comedy", "Medium", 40, 25),
    ("Jersey (Hindi)", 2022, "Hindi", "Sports/Drama", "Medium", 70, 70),
    ("Sam Bahadur", 2023, "Hindi", "Biopic", "Medium", 75, 70),
    ("12th Fail", 2023, "Hindi", "Drama/Biopic", "Medium", 45, 20),
    ("Crew", 2024, "Hindi", "Comedy/Heist", "Medium", 50, 70),
    ("Stree 2", 2024, "Hindi", "Horror/Comedy", "Medium", 55, 60),
    ("Bhool Bhulaiyaa 3", 2024, "Hindi", "Horror/Comedy", "Medium", 65, 90),
    ("Munjya", 2024, "Hindi", "Horror/Comedy", "Medium", 35, 30),
    ("Shaitaan", 2024, "Hindi", "Horror", "Medium", 35, 35),
    ("Kill", 2024, "Hindi", "Action/Thriller", "Medium", 35, 20),
    ("Amar Singh Chamkila", 2024, "Hindi", "Biopic", "Medium", 45, 30),
    ("The Goat Life", 2024, "Malayalam", "Survival/Drama", "Medium", 100, 85),
    ("Manjummel Boys", 2024, "Malayalam", "Survival/Thriller", "Medium", 40, 20),
    ("Aavesham", 2024, "Malayalam", "Action/Comedy", "Medium", 40, 25),
    ("Bramayugam", 2024, "Malayalam", "Horror", "Medium", 40, 20),
    ("Amaran", 2024, "Tamil", "Military/Biopic", "Medium", 70, 70),
    ("Maharaja", 2024, "Tamil", "Action/Thriller", "Medium", 40, 30),
    ("Hanu-Man", 2024, "Telugu", "Superhero", "Medium", 80, 40),
    ("Lucky Baskhar", 2024, "Telugu", "Crime/Drama", "Medium", 50, 40),

    # ── LOW (30) ─────────────────────────────────────────────────────────
    ("The Lunchbox", 2013, "Hindi", "Drama", "Low", 28, 8),
    ("Titli", 2014, "Hindi", "Drama", "Low", 25, 2),
    ("Ankhon Dekhi", 2014, "Hindi", "Drama", "Low", 22, 4),
    ("Margarita with a Straw", 2015, "Hindi", "Drama", "Low", 30, 8),
    ("Nil Battey Sannata", 2016, "Hindi", "Drama", "Low", 25, 5),
    ("Aligarh", 2016, "Hindi", "Drama", "Low", 25, 6),
    ("Dhanak", 2016, "Hindi", "Drama", "Low", 28, 4),
    ("Lipstick Under My Burkha", 2017, "Hindi", "Drama", "Low", 30, 7),
    ("A Death in the Gunj", 2017, "Hindi", "Drama", "Low", 25, 5),
    ("Mukti Bhawan", 2017, "Hindi", "Drama", "Low", 20, 3),
    ("Tumhari Sulu", 2017, "Hindi", "Comedy", "Low", 35, 15),
    ("Mukkabaaz", 2018, "Hindi", "Sports/Drama", "Low", 40, 8),
    ("Tumbbad", 2018, "Hindi", "Horror/Fantasy", "Low", 55, 12),
    ("Sir", 2018, "Hindi", "Drama", "Low", 22, 5),
    ("Super Deluxe", 2019, "Tamil", "Anthology", "Low", 45, 15),
    ("Bulbbul", 2020, "Hindi", "Horror", "Low", 25, 8),
    ("C U Soon", 2020, "Malayalam", "Thriller", "Low", 12, 3),
    ("The Great Indian Kitchen", 2021, "Malayalam", "Drama", "Low", 22, 3),
    ("Nayattu", 2021, "Malayalam", "Thriller", "Low", 28, 5),
    ("Karnan", 2021, "Tamil", "Drama", "Low", 40, 12),
    ("Sarpatta Parambarai", 2021, "Tamil", "Sports/Drama", "Low", 48, 18),
    ("Mandela", 2021, "Tamil", "Comedy/Drama", "Low", 28, 5),
    ("Minnal Murali", 2021, "Malayalam", "Superhero", "Low", 50, 18),
    ("Jhund", 2022, "Hindi", "Sports/Drama", "Low", 45, 18),
    ("Pada", 2022, "Malayalam", "Drama", "Low", 30, 6),
    ("Kaathal - The Core", 2023, "Malayalam", "Drama", "Low", 25, 8),
    ("Aattam", 2024, "Malayalam", "Drama", "Low", 18, 2),
    ("Laapataa Ladies", 2024, "Hindi", "Comedy/Drama", "Low", 32, 10),
    ("All We Imagine as Light", 2024, "Malayalam/Hindi", "Drama", "Low", 40, 10),
    ("Angamaly Diaries", 2017, "Malayalam", "Comedy/Drama", "Low", 28, 3),
]


def genre_family(genre):
    g = genre.lower()
    if any(k in g for k in ("sci-fi", "myth", "epic", "superhero", "fantasy")):
        return "spectacle"
    if any(k in g for k in ("historical", "period")):
        return "historical"
    if any(k in g for k in ("action", "thriller", "crime", "spy", "military", "survival")):
        return "action"
    if any(k in g for k in ("sport", "biopic")):
        return "biopic"
    if "horror" in g:
        return "horror"
    if any(k in g for k in ("comedy", "romance")):
        return "comedy"
    return "drama"


# Typical entity counts by budget tier and genre family. Shoot days are not
# an input: two films in the same cell differ only by a title-seeded jitter.
ENTITY_PROFILES = {
    ("High", "spectacle"): (42, 48, 155, 100, 75),
    ("High", "historical"): (45, 52, 150, 120, 60),
    ("High", "action"): (30, 40, 105, 72, 52),
    ("High", "biopic"): (22, 30, 70, 48, 34),
    ("High", "drama"): (20, 28, 65, 45, 32),
    ("High", "comedy"): (18, 32, 70, 50, 34),
    ("High", "horror"): (16, 22, 55, 40, 30),
    ("Medium", "spectacle"): (16, 22, 55, 36, 24),
    ("Medium", "historical"): (18, 24, 60, 45, 20),
    ("Medium", "action"): (16, 20, 42, 28, 18),
    ("Medium", "biopic"): (14, 16, 32, 22, 12),
    ("Medium", "drama"): (10, 14, 22, 15, 8),
    ("Medium", "comedy"): (8, 14, 20, 14, 7),
    ("Medium", "horror"): (8, 10, 20, 14, 10),
    ("Low", "spectacle"): (10, 12, 24, 14, 10),
    ("Low", "historical"): (8, 10, 16, 12, 6),
    ("Low", "action"): (8, 10, 16, 10, 6),
    ("Low", "biopic"): (8, 10, 14, 10, 5),
    ("Low", "drama"): (5, 7, 10, 7, 3),
    ("Low", "comedy"): (6, 8, 12, 8, 4),
    ("Low", "horror"): (6, 6, 12, 8, 5),
}


def title_jitter(title, salt, base):
    """±15% integer jitter, stable for a given title. Independent of shoot days."""
    import zlib
    h = zlib.crc32(f"{title}:{salt}".encode()) % 1000
    factor = 0.85 + (h / 999) * 0.30
    return max(1, int(round(base * factor)))


def department_split(total, genre):
    """Integer department crores that sum to the reported total."""
    g = genre.lower()
    if any(k in g for k in ("sci-fi", "myth", "epic", "superhero", "fantasy", "action")):
        ratios = (0.34, 0.28, 0.20, 0.10, 0.08)
    elif any(k in g for k in ("historical", "period")):
        ratios = (0.40, 0.12, 0.22, 0.10, 0.16)
    elif "horror" in g:
        ratios = (0.36, 0.14, 0.22, 0.14, 0.14)
    elif any(k in g for k in ("sport", "biopic", "military")):
        ratios = (0.42, 0.08, 0.26, 0.12, 0.12)
    else:
        ratios = (0.46, 0.06, 0.24, 0.12, 0.12)
    raw = [total * r for r in ratios]
    parts = [int(x) for x in raw]
    remainder = int(total) - sum(parts)
    order = sorted(range(5), key=lambda i: (raw[i] - parts[i]), reverse=True)
    for i in range(remainder):
        parts[order[i % 5]] += 1
    return parts


def expand_additional(spec):
    title, year, lang, genre, bcat, days, total = spec
    family = genre_family(genre)
    profile = ENTITY_PROFILES[(bcat, family)]
    counts = tuple(title_jitter(title, i, n) for i, n in enumerate(profile))
    depts = department_split(total, genre)
    return (title, year, lang, genre, bcat, days, *counts, total, *depts)


FILMS.extend(expand_additional(spec) for spec in ADDITIONAL)
_titles = [f[0] for f in FILMS]
if len(_titles) != len(set(_titles)):
    raise SystemExit("duplicate film title in benchmark")
if len(FILMS) != 200:
    raise SystemExit(f"expected 200 films, got {len(FILMS)}")

# ── Load Deployed Random Forest Model & Rate Card for Real Estimation ──────
FOREST_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "services", "shoot_day_forest.json")
with open(FOREST_PATH) as f:
    FOREST = json.load(f)

def predict_shoot_days(features):
    """Evaluates the deployed 50-tree Random Forest inference model on extracted features."""
    preds = []
    for tree in FOREST["trees"]:
        node = tree
        while not node.get("leaf", False):
            if features[node["feature"]] <= node["threshold"]:
                node = node["left"]
            else:
                node = node["right"]
        preds.append(node["value"])
    return sum(preds) / len(preds)

def derive_scale(days):
    """Same thresholds as DeriveProductionScale in backend/services/cost_estimator.go."""
    if days >= 150:
        return "Large"
    elif days >= 60:
        return "Medium"
    else:
        return "Small"

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

for fi, f in enumerate(FILMS):
    (title, year, lang, genre, bcat, days,
     chars, locs, props, costumes, equip,
     act_total, act_cast, act_vfx, act_locs, act_equip, act_art) = f

    # 1. Predict shoot days using the real deployed Random Forest model
    features = [chars, locs, props, costumes, equip]
    pred_days = predict_shoot_days(features)

    # 2. Derive scale and VFX requirements from genre and schedule
    scale = derive_scale(pred_days)
    is_vfx_heavy = any(k in genre for k in ["Action", "Epic", "Sci-Fi", "Fantasy", "War", "Military"])

    # 3. Real Bottom-Up Rate Card Cost Engine (matches Go services/cost_estimator.go & budget_engine.go)
    if scale == "Large":
        n_leads = min(3.0, max(1.0, chars * 0.10))
        n_supp = chars * 0.35
        n_bg = max(0.0, chars - n_leads - n_supp)
        cast_lakhs = (n_leads * 1200.0) + (n_supp * 60.0) + (n_bg * 0.05 * pred_days * 0.2)
        atl_other_cr = 25.0

        loc_lakhs = (pred_days * 4.5) + (locs * 3.5)
        equip_lakhs = pred_days * 8.5
        art_lakhs = (props * 1.8) + (costumes * 2.5) + (pred_days * 2.5)
        vfx_cr = 65.0 if is_vfx_heavy else 22.0

    elif scale == "Medium":
        n_leads = min(2.0, max(1.0, chars * 0.12))
        n_supp = chars * 0.35
        n_bg = max(0.0, chars - n_leads - n_supp)
        lead_rate = 250.0 if is_vfx_heavy else 150.0
        cast_lakhs = (n_leads * lead_rate) + (n_supp * 18.0) + (n_bg * 0.04 * pred_days * 0.2)
        atl_other_cr = 6.0 if is_vfx_heavy else 3.5

        loc_lakhs = (pred_days * 1.8) + (locs * 1.2)
        equip_lakhs = pred_days * (4.0 if is_vfx_heavy else 2.5)
        art_lakhs = (props * 0.5) + (costumes * 0.8) + (pred_days * 0.8)
        vfx_cr = 10.0 if is_vfx_heavy else 3.0

    else:  # Small / Low
        n_leads = min(2.0, max(1.0, chars * 0.15))
        n_supp = chars * 0.40
        n_bg = max(0.0, chars - n_leads - n_supp)
        cast_lakhs = (n_leads * 18.0) + (n_supp * 2.5) + (n_bg * 0.02 * pred_days * 0.15)
        atl_other_cr = 0.8

        loc_lakhs = (pred_days * 0.5) + (locs * 0.3)
        equip_lakhs = pred_days * 0.8
        art_lakhs = (props * 0.08) + (costumes * 0.12) + (pred_days * 0.15)
        vfx_cr = 1.0 if is_vfx_heavy else 0.2

    # Cast ATL (18% fringe) + Story/Director ATL
    est_cast = round(((cast_lakhs * 1.18) / 100.0) + atl_other_cr, 1)
    est_locs = round((loc_lakhs * 1.05) / 100.0, 1)
    est_equip = round((equip_lakhs * 1.08) / 100.0, 1)
    est_art = round((art_lakhs * 1.10) / 100.0, 1)
    est_vfx = round(vfx_cr, 1)

    # BTL Subtotal and 10% BTL Contingency
    btl_cr = est_locs + est_equip + est_art + est_vfx
    contingency_cr = round(btl_cr * 0.10, 1)

    est_total = round(est_cast + btl_cr + contingency_cr, 1)

    # Compute Absolute Percentage Error against real reported total budget
    mape = round(abs(est_total - act_total) / act_total * 100.0, 1)

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

# Copy to backend/handlers/benchmark_films.csv so Go backend picks it up directly
BACKEND_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "handlers", "benchmark_films.csv")
with open(BACKEND_CSV, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(HEADER)
    w.writerows(rows)

# ── Summary stats ─────────────────────────────────────────────────────────
all_mape = [r[-1] for r in rows]
print(f"Generated {len(rows)} films → {OUTPUT} and {BACKEND_CSV}")
print(f"Real System Overall avg MAPE: {sum(all_mape)/len(all_mape):.1f}%")
for cat in ["High", "Medium", "Low"]:
    cat_mapes = [r[-1] for r in rows if r[5] == cat]
    print(f"  {cat:6s} ({len(cat_mapes)} films): {sum(cat_mapes)/len(cat_mapes):.1f}%")
