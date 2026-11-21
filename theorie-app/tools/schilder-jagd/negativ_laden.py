"""Gemeinfreie Alltagsfotos (CC0 / Public Domain, Openverse) als Gegenbeispiele für die Klasse "nichts"."""
import json, os, time, urllib.parse, urllib.request
S = os.path.dirname(os.path.abspath(__file__))
Z = f"{S}/negativ"
UA = {"User-Agent": "SpurSchildTest/1.0 (negatives, cc0 only)"}
SUCHEN = ["city street", "street germany", "town square", "building facade", "apartment building", "house front",
          "shop window", "parking lot", "parked car", "traffic", "highway", "country road", "village", "sidewalk",
          "bicycle", "bus", "train station", "railway", "bridge", "construction site", "fence", "brick wall",
          "graffiti", "park trees", "forest path", "garden", "clouds sky", "night city", "rainy street", "snow street",
          "window", "door", "balcony", "gas station", "playground", "church", "market", "harbor", "field", "roof"]
meta = {}
def hole(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
for q in SUCHEN:
    try:
        d = json.loads(hole("https://api.openverse.org/v1/images/?" + urllib.parse.urlencode({"q": q, "page_size": 20, "license": "cc0,pdm", "source": "flickr"})))
    except Exception as e:
        print("Suche", q, e, flush=True); time.sleep(5); continue
    n = 0
    for r in d.get("results", []):
        ziel = f"{Z}/{r['id'][:10]}.jpg"
        if os.path.exists(ziel):
            continue
        try:
            open(ziel, "wb").write(hole(r["url"]))
            meta[ziel] = {"titel": r.get("title"), "lizenz": r.get("license"), "quelle": r.get("foreign_landing_url")}
            n += 1
        except Exception as e:
            pass
        time.sleep(0.2)
    print(q, n, flush=True)
    time.sleep(1.2)
json.dump(meta, open(f"{Z}/meta.json", "w"), ensure_ascii=False, indent=1)
print("fertig", len(os.listdir(Z)))
