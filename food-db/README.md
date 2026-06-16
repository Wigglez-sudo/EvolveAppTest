# Evolve — Food Packs

Optional, downloadable UK supermarket food databases for the Evolve app.

## How it works

- A GitHub Action (`.github/workflows/update-food-database.yml`) runs **monthly**
  (and on demand) and builds one JSON file per shop from
  [Open Food Facts](https://world.openfoodfacts.org), committing them here into
  `food-db/`.
- The app reads `food-db/manifest.json` to list available shops, then downloads
  **only** the shop(s) the user picks (Settings → Food packs).
- Downloaded packs are stored **on the user's device** (IndexedDB) and work
  offline. Their foods appear inside the app's normal categories (Cheese,
  Dairy, Fast food & meals, etc.), tagged with the shop name.

The app **never uploads** any personal data. These are public food lists the
app downloads — nothing more.

## Build pipeline & data quality

The workflow runs three steps in this order — **build → commit → validate**:

1. **Build** rounds-robins the four shops (one page each per lap) against Open
   Food Facts, which 503s often; a busy shop is retried next lap so it's never
   starved. It only writes foods that pass the quality bar: all four macros
   present, p/c/f each 0–100, and **kcal 0–900 per 100 g**. (900 is the physical
   max — pure fat — so anything above it is bad OFF data, e.g. a per-pack figure
   mislabelled as per-100 g, and is dropped at this stage.)
2. **Commit** pushes whatever was built. This runs **before** validation on
   purpose, so a ~55-minute build can never be thrown away by a single stray
   row. The good data is always saved.
3. **Validate** (`tools/validate-food-db.js`) then checks **every** item and
   fails the run (turns it red) if anything is off — kcal/​macros out of range,
   bad structure, etc. Because the commit already happened, a red run here is a
   *signal*, not a loss: open the committed `food-db/<shop>.json`, find the
   flagged index (the report prints e.g. `asda.json[293]`), delete that entry,
   and commit. The build's own 0–900 filter means this should essentially never
   fire, but it's a visible backstop if a new kind of bad data ever appears.

The build and validator share the same kcal/macro limits, so the build only
ever writes what the validator accepts — keep them in sync if you change either.

## Files

```
food-db/
  manifest.json     # { version, shops:[{id,name,file,count,bytes}] }
  tesco.json        # [{n,b,shop,cat,kcal,p,c,f,serve?}]  per 100 g
  sainsburys.json
  asda.json
  aldi.json
tools/
  build-openfoodfacts-uk-db.js   # builds the per-shop files
  validate-food-db.js            # sanity-checks them (fails CI on bad data)
```

## Data shape (per food)

```json
{ "n": "Mature Cheddar", "b": "Tesco", "shop": "tesco",
  "cat": "Cheese", "kcal": 416, "p": 25.4, "c": 0.1, "f": 34.9,
  "serve": { "unit": "30g slice", "grams": 30 } }
```

`cat` is always one of the app's existing categories; anything that can't be
mapped becomes `"Misc & extras"`.

## Running it manually

```bash
node tools/build-openfoodfacts-uk-db.js --test    # 5 items, 1 shop — verify the API works
node tools/build-openfoodfacts-uk-db.js           # full build
node tools/validate-food-db.js                    # validate output (hard pass/fail)
node tools/validate-food-db.js --report           # validate but don't fail — just list problems
```

> The build needs internet access to Open Food Facts, so it runs on GitHub's
> servers (or your own machine) — not on anyone's phone.
