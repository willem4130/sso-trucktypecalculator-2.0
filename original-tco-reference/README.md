# Original TCO Calculator - Reference Documentation

This directory contains comprehensive documentation and data scraped from the original TCO calculator at https://tcovrachtwagen.org/simulation.

**Purpose**: Document the original calculator to ensure our enhanced implementation (SCEX Software Optimization v2.0) maintains feature parity while adding professional BI enhancements.

---

## Directory Structure

```
original-tco-reference/
├── README.md                 # This file
├── parameters/               # Parameter definitions and defaults
│   ├── vehicle-types.json    # 6 vehicle types with weight classes
│   └── all-parameters.json   # All input parameters (after manual scrape)
├── calculations/             # Calculation logic and formulas
│   ├── results-data.json     # Extracted calculation results
│   └── extracted-results.json
├── screenshots/              # Visual captures of each step
│   ├── 00-initial.png        # Initial page load
│   ├── 01-after-vehicle-selection.png
│   ├── 02-schaal.png         # Driving area selection
│   ├── 03-parameters.png     # Parameter input
│   └── 04-results.png        # Results/TCO output
├── documentation/            # Analysis and reports
│   ├── COMPARISON.md         # ⭐ Full comparison: Original vs. Our Implementation
│   ├── complete-scrape.json  # Raw scraped data (automated)
│   ├── manual-scrape.json    # Raw scraped data (manual-assisted)
│   ├── COMPLETE-ANALYSIS.md  # Automated scrape analysis
│   ├── MANUAL-SCRAPE-REPORT.md  # Manual scrape report
│   ├── steps.json            # Step-by-step breakdown
│   └── technical-info.json   # Framework, tech stack info
└── ui-structure/             # UI patterns and component structure

```

---

## What We've Captured (Automated Scraping)

### ✅ Vehicle Types (6 types)

| #   | Name            | Weight Class | Image URL            |
| --- | --------------- | ------------ | -------------------- |
| 1   | KLEINE BAKWAGEN | 7.5 - 12 ton | kleine_bakwagen.webp |
| 2   | MEDIUM BAKWAGEN | 12 - 18 ton  | medium_bakwagen.webp |
| 3   | GROTE BAKWAGEN  | 18 - 26 ton  | grote_bakwagen.webp  |
| 4   | BOUWVOERTUIG    | 18 - 26 ton  | bouw.webp            |
| 5   | LICHTE TREKKER  | 26 - 40 ton  | lichte_trekker.webp  |
| 6   | ZWARE TREKKER   | 40 - 50 ton  | zware_trekker.webp   |

**Source**: `parameters/vehicle-types.json`

### ✅ Driving Areas (4 areas)

| #   | Name           | Annual Distance | Daily Distance |
| --- | -------------- | --------------- | -------------- |
| 1   | LOKAAL         | 20,000 km/year  | 75 km/day      |
| 2   | REGIONAAL      | 42,000 km/year  | 158 km/day     |
| 3   | NATIONAAL      | 78,000 km/year  | 294 km/day     |
| 4   | INTERNATIONAAL | 104,000 km/year | 392 km/day     |

**Source**: Extracted from table in `documentation/complete-scrape.json`

### ✅ Technical Stack

- **Framework**: React (vanilla)
- **UI Components**: react-tabs (for tabbed parameter interface)
- **Styling**: Custom CSS with CSS variables
- **Charts**: Canvas/SVG (library unknown)
- **Build**: Single bundle.js (Webpack/Rollup likely)

**Source**: `documentation/technical-info.json`

### ⚠️ Parameters (Incomplete)

The automated scraper could not capture parameter fields because they require manual navigation through the React SPA. **Solution**: Run manual-assisted scraper.

### ⚠️ Calculations (Partial)

Result structure detected but detailed formulas not extracted. **Solution**: Run manual-assisted scraper and analyze results step.

---

## How to Complete the Documentation

### Run Manual-Assisted Scraper

The automated scraper captured the basic structure, but the original calculator requires manual interaction to fully capture parameters and results.

**To complete the documentation:**

```bash
npm run scrape:manual
```

**What it does:**

1. Opens a browser to https://tcovrachtwagen.org/simulation
2. Prompts you to manually navigate through each step
3. Automatically captures screenshots and data after each interaction
4. Extracts ALL input fields, tabs, tables, and calculations
5. Generates comprehensive JSON and Markdown reports

**Expected time**: 10-15 minutes of manual clicking through the calculator

**Output files:**

- `documentation/manual-scrape.json` - Complete raw data
- `documentation/MANUAL-SCRAPE-REPORT.md` - Detailed analysis
- Additional screenshots in `screenshots/` directory

---

## Key Documents

### 🌟 COMPARISON.md (⭐ START HERE)

**File**: `documentation/COMPARISON.md`

**What it covers**:

- Feature-by-feature comparison: Original vs. Our Implementation
- What we match (vehicle types, driving areas, TCO flow)
- What we enhanced (Professional BI design, advanced analytics, exports)
- What we need to verify (parameters, calculation formulas)
- Key gaps and recommendations
- Roadmap for "ultimate version"

**Status**: ✅ Complete (based on automated scraping)
**Next step**: Update after manual scraping to add parameter-level comparison

### 📊 COMPLETE-ANALYSIS.md

**File**: `documentation/COMPLETE-ANALYSIS.md`

**What it covers**:

- Step-by-step breakdown of automated scrape
- Vehicle types, driving areas, UI structure
- All captured input fields and buttons
- Technical stack analysis

**Status**: ✅ Complete (automated scraping)

### 🎯 MANUAL-SCRAPE-REPORT.md

**File**: `documentation/MANUAL-SCRAPE-REPORT.md`

**What it covers**:

- Complete parameter list with defaults, min/max values
- All tab names and field groupings
- Detailed calculation results and formulas
- Step-by-step screenshots with annotations

**Status**: ⏳ Pending (run `npm run scrape:manual` to generate)

---

## Usage Guidelines

### For Developers

1. **Before adding new features**: Check `COMPARISON.md` to see if the original has something similar
2. **When modifying calculations**: Verify against original formulas (after manual scrape)
3. **For UI/UX decisions**: Review screenshots to understand original patterns, then enhance with BI design principles
4. **Adding parameters**: Cross-reference `parameters/all-parameters.json` to ensure compatibility

### For Product Managers

1. **Feature parity**: Use `COMPARISON.md` to verify we support all original features
2. **Enhancement justification**: Document why our enhancements (BI design, exports, analytics) add value
3. **Gap analysis**: Review "What We Need to Verify" section for areas requiring attention
4. **Competitive positioning**: Use comparison to explain how we're "the same but professional-grade"

### For QA/Testing

1. **Test cases**: Use original calculator flow to create test scenarios
2. **Calculation verification**: Compare outputs with same inputs between original and our version
3. **Edge cases**: Test extreme parameter values to ensure our validation matches original
4. **Cross-browser**: Original works on Chrome/Firefox/Safari - ensure we do too

---

## Key Findings from Automated Scraping

### ✅ What Matches

- **Vehicle count**: 6 types (exact match)
- **Weight classes**: Exact match for all 6 vehicles
- **Driving area concept**: 4 areas with distance-based categorization
- **Fuel types**: Diesel, BEV, FCEV, H2ICE (inferred)
- **Multi-step flow**: 4 steps (Vehicle → Driving Area → Parameters → Results)

### 🎯 What We Enhanced

- **Professional BI Design**: Tableau/PowerBI-inspired vs. consumer-friendly cards
- **Advanced Sorting/Filtering**: 3-state sorting, multi-select fuel filters
- **Live TCO Preview**: Real-time sidebar updates vs. static form
- **Parameter Sensitivity**: Top 3 cost drivers analysis
- **Interactive Map**: GeoJSON Netherlands map vs. simple table
- **Infrastructure Analysis**: Charging/H2 station availability + readiness scoring
- **CFO Dashboard**: CAPEX/OPEX, cash flow, break-even analysis
- **Comprehensive Exports**: PDF (7 sections) + Excel (7 sheets) with custom selection
- **Radar Charts**: Multi-dimensional comparison
- **View Modes**: Progressive disclosure (Overzicht/Analyse/Expert)

### ⚠️ Key Gaps

- **Missing LOKAAL**: Original has LOKAAL (20k km/year), we start at Regionaal (42k km/year)
- **Parameter verification needed**: Must complete manual scrape to compare all fields
- **Calculation logic**: Need to extract TCO formulas to ensure accuracy match

### 📋 Next Steps

1. **High Priority**: Run `npm run scrape:manual` to capture parameters
2. **Verification**: Compare TCO calculations with same inputs
3. **Decision**: Add LOKAAL driving area to match original completely?
4. **Enhancement**: Document formula improvements (if any) over original

---

## Technical Notes

### Scraping Scripts

**Automated Scraper** (`scripts/scrape-original-tco-enhanced.ts`):

- ✅ Captures vehicle types, driving areas, basic structure
- ✅ Takes screenshots at each automated step
- ✅ Extracts HTML, buttons, tables
- ❌ Cannot navigate through React SPA interactions

**Manual-Assisted Scraper** (`scripts/scrape-manual-assisted.ts`):

- ✅ Prompts for manual navigation
- ✅ Captures data after each user interaction
- ✅ Extracts ALL parameters including tabs
- ✅ Comprehensive results analysis
- ✅ Interactive Q&A for additional captures

### Data Formats

**JSON Files**:

- Raw scraped data for programmatic analysis
- Includes: inputs, structure, calculations, screenshots
- Easy to parse for automated comparisons

**Markdown Files**:

- Human-readable reports and analysis
- Tables, headings, organized sections
- Easy to review and share with team

### Screenshot Naming Convention

```
00-initial.png                    # Initial page load
01-after-vehicle-selection.png    # After clicking vehicle
02-schaal.png                     # Driving area step
03-parameters.png                 # Parameter input step
04-results.png                    # Results/TCO output
parameters-tab-1-{name}.png       # Individual parameter tabs
```

---

## FAQ

**Q: Why did we scrape the original calculator?**
A: To ensure our enhanced version maintains feature parity with the original while adding professional BI capabilities. We want to be "the same but better," not a completely different tool.

**Q: Do we need to match everything exactly?**
A: Core functionality (vehicles, areas, TCO formulas) should match. UI/UX, analytics, and exports can be enhanced beyond the original.

**Q: What if the original has features we don't?**
A: Document them in COMPARISON.md and decide: (1) Add to our roadmap, (2) Skip if not valuable, (3) Replace with better alternative.

**Q: Can we change the original's approach?**
A: Yes, if justified. For example: we changed LOKAAL → Regionaal because modern logistics rarely operates at 20k km/year. Document reasoning in COMPARISON.md.

**Q: How do we verify calculation accuracy?**
A: After manual scraping, test both calculators with identical inputs and compare TCO outputs. Document any differences.

---

## Maintenance

**Update this documentation when:**

- Original calculator changes (new features, updated formulas)
- We add/modify features that affect comparison
- Manual scraping is completed
- New insights are discovered

**How to re-scrape:**

```bash
# Automated (basic structure)
npm run scrape:original

# Manual-assisted (complete parameters)
npm run scrape:manual
```

---

**Last Updated**: 2025-12-14
**Version**: 1.0
**Status**: Automated scraping complete. Manual scraping pending.
**Maintainer**: Willem van den Berg <willem@scex.nl>

---

## Quick Reference

**Original Calculator**: https://tcovrachtwagen.org/simulation
**Our Implementation**: https://sso-trucktypecalculator-2-0.vercel.app
**Comparison Doc**: `documentation/COMPARISON.md` ⭐
**Vehicle Data**: `parameters/vehicle-types.json`
**Scraped Data**: `documentation/complete-scrape.json`

**Scripts**:

- `npm run scrape:original` - Automated scraping
- `npm run scrape:manual` - Manual-assisted scraping (RECOMMENDED for complete data)
