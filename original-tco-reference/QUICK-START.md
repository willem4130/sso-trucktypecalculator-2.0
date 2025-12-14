# Quick Start Guide - TCO Calculator Analysis

**Want the TL;DR?** Read this first, then dive into detailed docs as needed.

---

## What We Did

Scraped **https://tcovrachtwagen.org/simulation** to document the original TCO calculator and compare with our enhanced version.

---

## Key Findings (5-Minute Read)

### ✅ What Matches

| Feature         | Original                           | Ours                                  | Status     |
| --------------- | ---------------------------------- | ------------------------------------- | ---------- |
| Vehicle types   | 6 types (7.5-50 ton)               | 6 types (exact match)                 | ✅ Match   |
| Driving areas   | 4 areas (LOKAAL to INTERNATIONAAL) | 4 areas (Regionaal to Internationaal) | 🔄 Similar |
| TCO calculation | 4-step flow                        | 4-step flow                           | ✅ Match   |
| Multi-fuel      | Diesel, BEV, FCEV, H2ICE           | Diesel, BEV, FCEV, H2ICE              | ✅ Match   |

### 🎯 What We Enhanced

**UI/UX**: Consumer cards → Professional BI tables (Tableau/PowerBI style)
**Analytics**: Basic results → 8+ interactive charts + KPI cards + radar charts
**Exports**: Unknown → PDF (7 sections) + Excel (7 sheets) with custom selection
**Dashboard**: No → CFO Dashboard (CAPEX/OPEX, cash flow, break-even)
**Live Preview**: Unknown → Real-time TCO sidebar + parameter sensitivity
**Filtering**: No → Multi-select fuel types + 3-state column sorting
**Map**: Simple table → Interactive GeoJSON with infrastructure analysis

### ⚠️ Key Gap

**Missing LOKAAL**: Original has LOKAAL area (20,000 km/year, 75 km/day), we start at Regionaal (42,000 km/year)

**Decision needed**: Add LOKAAL or justify Regionaal as modern minimum?

---

## Files to Read (Priority Order)

1. **SUMMARY.md** ← You are here! (5-minute overview)
2. **COMPARISON.md** ⭐ (30-minute deep dive, all features compared)
3. **README.md** (15-minute usage guide)
4. **screenshots/** (Visual reference for each step)

---

## Next Steps

### 1. Run Manual Scraper (10-15 min) - HIGH PRIORITY

```bash
npm run scrape:manual
```

**Why**: Automated scraper got vehicle types + driving areas, but parameters require manual navigation.

**What you'll do**:

- Browser opens to original calculator
- You manually click through each step
- Script prompts you to press ENTER after each action
- Automatically captures screenshots + data
- Generates complete parameter documentation

**Output**: `documentation/manual-scrape.json` + `MANUAL-SCRAPE-REPORT.md`

### 2. Review Comparison Doc (30 min)

```bash
# Open in your editor
code original-tco-reference/documentation/COMPARISON.md
```

**Focus on**:

- Section 2: Driving Areas (LOKAAL gap)
- Section 3: Parameters (pending manual scrape)
- Section 6: Overall Assessment
- Section 7: Next Steps

### 3. Make LOKAAL Decision (Team Discussion)

**Option A**: Add LOKAAL (20k km/year)

- Pros: Perfect parity with original
- Cons: Extra area to maintain

**Option B**: Keep Regionaal as minimum (42k km/year)

- Pros: Simpler, modern logistics rarely < 40k km/year
- Cons: Slight mismatch with original

### 4. Verify Calculations (30 min)

**Test**: Same inputs → Both calculators → Compare TCO

Example test case:

- Vehicle: Kleine Bakwagen
- Area: Regionaal (or equivalent)
- Fuel: Diesel
- Default parameters
- Compare: Total TCO, TCO/km, Annual costs

**Expected**: Results should match within ~5% (or document why different)

---

## Directory Overview

```
original-tco-reference/
├── QUICK-START.md        ← You are here (5 min)
├── SUMMARY.md            ← Full summary report (15 min)
├── README.md             ← Complete guide (20 min)
├── documentation/
│   └── COMPARISON.md     ⭐ Feature comparison (30 min)
├── screenshots/          ← Visual reference
└── parameters/
    └── vehicle-types.json ← 6 vehicles captured
```

---

## Quick Reference

**Original Calculator**: https://tcovrachtwagen.org/simulation
**Our Calculator**: https://sso-trucktypecalculator-2-0.vercel.app

**Vehicle Types**: 6 (Kleine/Medium/Grote Bakwagen, Bouwvoertuig, Lichte/Zware Trekker)
**Driving Areas**: 4 (LOKAAL, REGIONAAL, NATIONAAL, INTERNATIONAAL)
**Tech Stack**: React (original) vs. Next.js 16 (ours)

**Scripts**:

- `npm run scrape:original` - Automated scraper (✅ done)
- `npm run scrape:manual` - Manual scraper (⏳ run this next!)

---

## FAQs

**Q: Do we need to match the original exactly?**
A: Core features (vehicles, areas, calculations) should match. UI/UX and analytics can be enhanced.

**Q: What's the #1 priority now?**
A: Run `npm run scrape:manual` to capture ALL parameters so we can verify calculation accuracy.

**Q: Should we add LOKAAL?**
A: Team decision. Pro: Perfect parity. Con: Extra maintenance. Modern logistics often > 20k km/year anyway.

**Q: Are our calculations accurate?**
A: Need to verify after manual scrape. Test with same inputs on both calculators.

**Q: What about our enhancements (CFO Dashboard, exports, etc.)?**
A: Keep them! They're our competitive advantage. Just ensure core TCO matches original.

---

**Last Updated**: 2025-12-14
**Status**: Automated scraping ✅ | Manual scraping ⏳ | Comparison ready ✅

**Next Action**: Run `npm run scrape:manual` (10-15 min)
