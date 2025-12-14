/**
 * Enhanced TCO Calculator Scraper for React SPA
 *
 * Handles custom UI components and multi-step navigation
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { chromium, Page } from '@playwright/test'
import { writeFileSync } from 'fs'
import { join } from 'path'

const BASE_URL = 'https://tcovrachtwagen.org/simulation'
const OUTPUT_DIR = join(process.cwd(), 'original-tco-reference')

interface ScrapedData {
  vehicleTypes: any[]
  steps: any[]
  calculations: any[]
  parameters: any[]
}

async function scrapeOriginalTCO() {
  console.log('🚀 Starting enhanced TCO scraper for React SPA...')

  const browser = await chromium.launch({ headless: false, slowMo: 500 })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })
  const page = await context.newPage()

  const data: ScrapedData = {
    vehicleTypes: [],
    steps: [],
    calculations: [],
    parameters: [],
  }

  try {
    console.log('📱 Navigating to:', BASE_URL)
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // Take initial screenshot
    await page.screenshot({
      path: join(OUTPUT_DIR, 'screenshots', '00-initial.png'),
      fullPage: true,
    })

    // ==== STEP 1: VOERTUIG (Vehicle Selection) ====
    console.log('\n📋 STEP 1: VOERTUIG')
    await scrapeVehicleStep(page, data)

    // Select first vehicle to continue
    console.log('🚗 Selecting first vehicle (Kleine bakwagen)...')
    await page.click('.vehicleType:first-child')
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: join(OUTPUT_DIR, 'screenshots', '01-after-vehicle-selection.png'),
      fullPage: true,
    })

    // ==== STEP 2: SCHAAL (Scale/Driving Area) ====
    console.log('\n📋 STEP 2: SCHAAL')
    await scrapeSchaalStep(page, data)

    // Click next/continue button if available
    const nextButton = page.locator(
      'button:has-text("Volgende"), button:has-text("Verder"), #arrowNext'
    )
    if ((await nextButton.count()) > 0) {
      console.log('➡️  Proceeding to next step...')
      await nextButton.first().click()
      await page.waitForTimeout(1500)
    }

    await page.screenshot({
      path: join(OUTPUT_DIR, 'screenshots', '02-schaal.png'),
      fullPage: true,
    })

    // ==== STEP 3: PARAMETERS ====
    console.log('\n📋 STEP 3: PARAMETERS')
    await scrapeParametersStep(page, data)

    await page.screenshot({
      path: join(OUTPUT_DIR, 'screenshots', '03-parameters.png'),
      fullPage: true,
    })

    // Try to proceed to results
    const resultsButton = page.locator(
      'button:has-text("Resultaten"), button:has-text("Bekijk"), #arrowNext'
    )
    if ((await resultsButton.count()) > 0) {
      console.log('➡️  Proceeding to results...')
      await resultsButton.first().click()
      await page.waitForTimeout(2000)
    }

    // ==== STEP 4: RESULTATEN (Results) ====
    console.log('\n📋 STEP 4: RESULTATEN')
    await scrapeResultsStep(page, data)

    await page.screenshot({
      path: join(OUTPUT_DIR, 'screenshots', '04-results.png'),
      fullPage: true,
    })

    // Save all collected data
    console.log('\n💾 Saving collected data...')
    saveData(data)

    console.log('\n✅ Scraping completed successfully!')
    console.log(`📊 Vehicle types: ${data.vehicleTypes.length}`)
    console.log(`📊 Steps scraped: ${data.steps.length}`)
    console.log(`📊 Parameters: ${data.parameters.length}`)
  } catch (error) {
    console.error('❌ Error during scraping:', error)

    // Take error screenshot
    await page.screenshot({
      path: join(OUTPUT_DIR, 'screenshots', 'error.png'),
      fullPage: true,
    })

    throw error
  } finally {
    await browser.close()
  }
}

async function scrapeVehicleStep(page: Page, data: ScrapedData) {
  const title = await page.locator('h1').first().textContent()
  console.log(`  📝 Title: ${title}`)

  // Extract vehicle types
  const vehicles = await page.evaluate(() => {
    const vehicleElements = document.querySelectorAll('.vehicleType')
    return Array.from(vehicleElements).map((el: any) => {
      const name = el.querySelector('div')?.textContent?.trim()
      const weight = el.querySelector('.typeSubText')?.textContent?.trim()
      const image = el.querySelector('img')?.src
      return { name, weight, image }
    })
  })

  console.log(`  🚗 Found ${vehicles.length} vehicle types:`)
  vehicles.forEach((v, i) => console.log(`     ${i + 1}. ${v.name} (${v.weight})`))

  data.vehicleTypes = vehicles
  data.steps.push({
    step: 1,
    name: 'VOERTUIG',
    title,
    vehicles,
  })
}

async function scrapeSchaalStep(page: Page, data: ScrapedData) {
  const title = await page.locator('h1').first().textContent()
  console.log(`  📝 Title: ${title}`)

  // Look for scale/area options
  const options = await page.evaluate(() => {
    const results: any[] = []

    // Check for radio buttons, cards, or other interactive elements
    const radioButtons = document.querySelectorAll('input[type="radio"]')
    radioButtons.forEach((radio: any) => {
      const label =
        radio.labels?.[0]?.textContent?.trim() || radio.closest('label')?.textContent?.trim()
      results.push({
        type: 'radio',
        name: radio.name,
        value: radio.value,
        label,
        checked: radio.checked,
      })
    })

    // Check for clickable cards or buttons
    const cards = document.querySelectorAll('[class*="card"], [class*="option"], [class*="choice"]')
    cards.forEach((card: any) => {
      results.push({
        type: 'card',
        text: card.textContent?.trim(),
        className: card.className,
      })
    })

    return results
  })

  console.log(`  📍 Found ${options.length} options`)
  options.forEach((opt, i) => console.log(`     ${i + 1}. ${opt.label || opt.text}`))

  data.steps.push({
    step: 2,
    name: 'SCHAAL',
    title,
    options,
  })
}

async function scrapeParametersStep(page: Page, data: ScrapedData) {
  const title = await page.locator('h1').first().textContent()
  console.log(`  📝 Title: ${title}`)

  // Check for tabs (React tabs pattern)
  const tabs = await page.evaluate(() => {
    const tabElements = document.querySelectorAll('.react-tabs__tab')
    return Array.from(tabElements).map((tab: any) => tab.textContent?.trim())
  })

  if (tabs.length > 0) {
    console.log(`  📑 Found ${tabs.length} tabs:`)
    tabs.forEach((tab, i) => console.log(`     ${i + 1}. ${tab}`))
  }

  // Extract all input fields in the current view
  const parameters = await page.evaluate(() => {
    const inputs: any[] = []

    // Text inputs and number inputs
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach((el: any) => {
      const parent = el.closest('div, td, label')
      const label =
        parent?.querySelector('label')?.textContent?.trim() ||
        el.getAttribute('placeholder') ||
        el.name ||
        'Unknown'

      inputs.push({
        type: el.type,
        name: el.name || el.id,
        label,
        value: el.value,
        placeholder: el.placeholder,
        min: el.min,
        max: el.max,
        step: el.step,
      })
    })

    // Range sliders
    document.querySelectorAll('input[type="range"]').forEach((el: any) => {
      const parent = el.closest('div, td, label')
      const label = parent?.textContent?.trim() || el.name || 'Unknown range'

      inputs.push({
        type: 'range',
        name: el.name || el.id,
        label,
        value: el.value,
        min: el.min,
        max: el.max,
        step: el.step,
      })
    })

    // Select dropdowns
    document.querySelectorAll('select').forEach((el: any) => {
      const parent = el.closest('div, td, label')
      const label =
        parent?.querySelector('label')?.textContent?.trim() || el.name || 'Unknown select'

      const options = Array.from(el.options).map((opt: any) => ({
        value: opt.value,
        text: opt.textContent?.trim(),
      }))

      inputs.push({
        type: 'select',
        name: el.name || el.id,
        label,
        value: el.value,
        options,
      })
    })

    // Checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach((el: any) => {
      const label =
        el.labels?.[0]?.textContent?.trim() || el.closest('label')?.textContent?.trim() || el.name

      inputs.push({
        type: 'checkbox',
        name: el.name || el.id,
        label,
        checked: el.checked,
      })
    })

    return inputs
  })

  console.log(`  🔢 Found ${parameters.length} parameters`)
  parameters.forEach((p, i) =>
    console.log(`     ${i + 1}. ${p.label} (${p.type}) = ${p.value || p.checked}`)
  )

  data.parameters = parameters
  data.steps.push({
    step: 3,
    name: 'PARAMETERS',
    title,
    tabs,
    parameters,
  })

  // If there are tabs, try to click through each one to capture all parameters
  if (tabs.length > 0) {
    console.log('  📑 Clicking through tabs to capture all parameters...')

    for (let i = 0; i < tabs.length; i++) {
      console.log(`     Tab ${i + 1}: ${tabs[i]}`)

      await page.click(`.react-tabs__tab:nth-child(${i + 1})`)
      await page.waitForTimeout(500)

      const tabParams = await page.evaluate(() => {
        const inputs: any[] = []
        document.querySelectorAll('input, select, textarea').forEach((el: any) => {
          inputs.push({
            type: el.type,
            name: el.name || el.id,
            value: el.value || el.checked,
            label: el.placeholder || el.name,
          })
        })
        return inputs
      })

      console.log(`        Found ${tabParams.length} fields in this tab`)

      // Merge into main parameters array (avoid duplicates)
      tabParams.forEach((tp) => {
        if (!data.parameters.find((p) => p.name === tp.name)) {
          data.parameters.push(tp)
        }
      })
    }
  }
}

async function scrapeResultsStep(page: Page, data: ScrapedData) {
  const title = await page.locator('h1').first().textContent()
  console.log(`  📝 Title: ${title}`)

  // Extract calculation results
  const calculations = await page.evaluate(() => {
    const results: any[] = []

    // Look for tables with results
    document.querySelectorAll('table').forEach((table: any) => {
      const rows: any[] = []
      table.querySelectorAll('tr').forEach((tr: any) => {
        const cells = Array.from(tr.querySelectorAll('td, th')).map((cell: any) =>
          cell.textContent?.trim()
        )
        if (cells.length > 0) {
          rows.push(cells)
        }
      })

      if (rows.length > 0) {
        results.push({ type: 'table', rows })
      }
    })

    // Look for highlighted values (costs, totals, etc.)
    document
      .querySelectorAll('.highlight, [class*="total"], [class*="cost"], [class*="price"]')
      .forEach((el: any) => {
        results.push({
          type: 'highlight',
          className: el.className,
          text: el.textContent?.trim(),
        })
      })

    // Look for charts/visualizations
    const charts = document.querySelectorAll('canvas, svg[class*="chart"], [class*="graph"]')
    if (charts.length > 0) {
      results.push({
        type: 'visualization',
        count: charts.length,
        note: 'Charts detected but content not extracted',
      })
    }

    return results
  })

  console.log(`  💰 Found ${calculations.length} result elements`)

  data.calculations = calculations
  data.steps.push({
    step: 4,
    name: 'RESULTATEN',
    title,
    calculations,
  })
}

function saveData(data: ScrapedData) {
  // Save comprehensive data
  writeFileSync(
    join(OUTPUT_DIR, 'documentation', 'complete-scrape.json'),
    JSON.stringify(data, null, 2),
    'utf-8'
  )

  // Save vehicle types separately
  writeFileSync(
    join(OUTPUT_DIR, 'parameters', 'vehicle-types.json'),
    JSON.stringify(data.vehicleTypes, null, 2),
    'utf-8'
  )

  // Save parameters separately
  writeFileSync(
    join(OUTPUT_DIR, 'parameters', 'all-parameters.json'),
    JSON.stringify(data.parameters, null, 2),
    'utf-8'
  )

  // Save calculations separately
  writeFileSync(
    join(OUTPUT_DIR, 'calculations', 'results-data.json'),
    JSON.stringify(data.calculations, null, 2),
    'utf-8'
  )

  // Generate detailed markdown report
  const report = generateReport(data)
  writeFileSync(join(OUTPUT_DIR, 'documentation', 'COMPLETE-ANALYSIS.md'), report, 'utf-8')

  console.log('📁 Files saved:')
  console.log('  - complete-scrape.json')
  console.log('  - vehicle-types.json')
  console.log('  - all-parameters.json')
  console.log('  - results-data.json')
  console.log('  - COMPLETE-ANALYSIS.md')
}

function generateReport(data: ScrapedData): string {
  let md = '# Original TCO Calculator - Complete Analysis\n\n'
  md += `**Scraped**: ${new Date().toISOString()}\n\n`
  md += `---\n\n`

  // Vehicle Types
  md += `## 1. Vehicle Types (${data.vehicleTypes.length})\n\n`
  md += `| # | Name | Weight Class | Image |\n`
  md += `|---|------|--------------|-------|\n`
  data.vehicleTypes.forEach((v, i) => {
    md += `| ${i + 1} | ${v.name} | ${v.weight} | ${v.image ? '✅' : '❌'} |\n`
  })
  md += `\n`

  // Steps
  data.steps.forEach((step, i) => {
    md += `## ${step.step}. ${step.name}\n\n`
    md += `**Title**: ${step.title}\n\n`

    if (step.vehicles) {
      md += `**Vehicles**: ${step.vehicles.length}\n\n`
    }

    if (step.options) {
      md += `**Options** (${step.options.length}):\n`
      step.options.forEach((opt: any, j: number) => {
        md += `${j + 1}. ${opt.label || opt.text} (${opt.type})\n`
      })
      md += `\n`
    }

    if (step.tabs) {
      md += `**Tabs** (${step.tabs.length}):\n`
      step.tabs.forEach((tab: string, j: number) => {
        md += `${j + 1}. ${tab}\n`
      })
      md += `\n`
    }

    if (step.parameters) {
      md += `**Parameters** (${step.parameters.length}):\n`
      step.parameters.forEach((p: any, j: number) => {
        md += `${j + 1}. **${p.label}** (${p.type})\n`
        md += `   - Name: \`${p.name}\`\n`
        md += `   - Default: ${p.value || p.checked || '-'}\n`
        if (p.min) md += `   - Min: ${p.min}\n`
        if (p.max) md += `   - Max: ${p.max}\n`
        if (p.options) md += `   - Options: ${p.options.length}\n`
        md += `\n`
      })
    }

    md += `---\n\n`
  })

  // Parameters Summary
  md += `## All Parameters Summary\n\n`
  md += `Total unique parameters found: **${data.parameters.length}**\n\n`
  md += `| # | Label | Type | Name | Default | Range |\n`
  md += `|---|-------|------|------|---------|-------|\n`
  data.parameters.forEach((p, i) => {
    const range = p.min && p.max ? `${p.min} - ${p.max}` : '-'
    md += `| ${i + 1} | ${p.label} | ${p.type} | ${p.name} | ${p.value || p.checked || '-'} | ${range} |\n`
  })
  md += `\n`

  // Calculations
  if (data.calculations.length > 0) {
    md += `## Calculation Results\n\n`
    md += `Found ${data.calculations.length} result elements.\n\n`
  }

  return md
}

// Run the enhanced scraper
scrapeOriginalTCO()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
