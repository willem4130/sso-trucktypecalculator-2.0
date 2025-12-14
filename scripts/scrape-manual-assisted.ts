/**
 * Manual-Assisted TCO Scraper
 *
 * This script helps you manually navigate through the TCO calculator
 * while automatically capturing screenshots and data at each step.
 *
 * INSTRUCTIONS:
 * 1. Run this script
 * 2. Browser will open to the TCO calculator
 * 3. Follow the console prompts to navigate through each step
 * 4. Press ENTER in the terminal after each action
 * 5. Script will automatically capture data and screenshots
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { chromium, Page } from '@playwright/test'
import { writeFileSync } from 'fs'
import { join } from 'path'
import * as readline from 'readline'

const BASE_URL = 'https://tcovrachtwagen.org/simulation'
const OUTPUT_DIR = join(process.cwd(), 'original-tco-reference')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve)
  })
}

interface CapturedData {
  timestamp: string
  steps: any[]
  parameters: any[]
  calculations: any[]
  screenshots: string[]
}

async function manualAssistedScrape() {
  console.log('🚀 Manual-Assisted TCO Scraper')
  console.log('='.repeat(60))
  console.log('\nThis script will help you navigate through the TCO calculator')
  console.log('and automatically capture data at each step.\n')

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })

  const page = await context.newPage()

  const data: CapturedData = {
    timestamp: new Date().toISOString(),
    steps: [],
    parameters: [],
    calculations: [],
    screenshots: [],
  }

  let stepNumber = 0

  try {
    console.log(`📱 Navigating to: ${BASE_URL}`)
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    await askQuestion('\n✅ Page loaded. Press ENTER to start...')

    // Helper function to capture current state
    async function captureCurrentState(stepName: string) {
      stepNumber++
      console.log(`\n📸 Capturing ${stepName}...`)

      const screenshotPath = `${String(stepNumber).padStart(2, '0')}-${stepName}.png`
      await page.screenshot({
        path: join(OUTPUT_DIR, 'screenshots', screenshotPath),
        fullPage: true,
      })
      data.screenshots.push(screenshotPath)

      // Extract all visible text
      const allText = await page.evaluate(() => {
        return document.body.innerText
      })

      // Extract all input fields
      const inputs = await page.evaluate(() => {
        const fields: any[] = []

        // All input types
        document.querySelectorAll('input').forEach((el: any) => {
          const label =
            el.labels?.[0]?.textContent?.trim() ||
            el.getAttribute('aria-label') ||
            el.placeholder ||
            el.name ||
            ''

          fields.push({
            type: el.type,
            name: el.name || el.id,
            label,
            value: el.value || el.checked,
            placeholder: el.placeholder,
            min: el.min,
            max: el.max,
            step: el.step,
            required: el.required,
          })
        })

        // All selects
        document.querySelectorAll('select').forEach((el: any) => {
          const label = el.labels?.[0]?.textContent?.trim() || el.name || ''

          const options = Array.from(el.options).map((opt: any) => ({
            value: opt.value,
            text: opt.textContent?.trim(),
            selected: opt.selected,
          }))

          fields.push({
            type: 'select',
            name: el.name || el.id,
            label,
            value: el.value,
            options,
            required: el.required,
          })
        })

        return fields
      })

      // Extract visible structure
      const structure = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map((h: any) => ({
          tag: h.tagName,
          text: h.textContent?.trim(),
        }))

        const buttons = Array.from(document.querySelectorAll('button')).map((b: any) => ({
          text: b.textContent?.trim(),
          type: b.type,
          disabled: b.disabled,
          className: b.className,
        }))

        const tables = Array.from(document.querySelectorAll('table')).map((table: any) => {
          const rows = Array.from(table.querySelectorAll('tr')).map((tr: any) =>
            Array.from(tr.querySelectorAll('td, th')).map((cell: any) => cell.textContent?.trim())
          )
          return { rows }
        })

        return { headings, buttons, tables }
      })

      const stepData = {
        stepNumber,
        stepName,
        url: page.url(),
        screenshot: screenshotPath,
        allText: allText.substring(0, 5000), // Limit text length
        inputs,
        structure,
        timestamp: new Date().toISOString(),
      }

      data.steps.push(stepData)

      // Merge unique inputs into parameters array
      inputs.forEach((input) => {
        if (input.name && !data.parameters.find((p: any) => p.name === input.name)) {
          data.parameters.push(input)
        }
      })

      console.log(`  ✅ Captured ${inputs.length} input fields`)
      console.log(`  ✅ Screenshot: ${screenshotPath}`)

      return stepData
    }

    // === STEP 1: Initial page ===
    await captureCurrentState('initial')
    console.log('\n📋 STEP 1: Vehicle Selection')
    console.log('ACTION: Please select a vehicle (e.g., Kleine bakwagen)')
    await askQuestion('Press ENTER after selecting a vehicle...')

    // === STEP 2: After vehicle selection ===
    await page.waitForTimeout(1000)
    await captureCurrentState('after-vehicle-selection')
    console.log('\n📋 STEP 2: Driving Area Selection')
    console.log('ACTION: Please select a driving area (e.g., LOKAAL or REGIONAAL)')
    await askQuestion('Press ENTER after selecting a driving area...')

    // === STEP 3: After driving area ===
    await page.waitForTimeout(1000)
    await captureCurrentState('after-area-selection')
    console.log('\n📋 STEP 3: Parameters')
    console.log('This step may have multiple tabs. Let me capture the current view...')

    // Check for tabs
    const tabsExist = await page.locator('.react-tabs__tab').count()
    if (tabsExist > 0) {
      console.log(`\n  Found ${tabsExist} tabs. Capturing each tab...`)

      for (let i = 0; i < tabsExist; i++) {
        const tabName = await page.locator(`.react-tabs__tab:nth-child(${i + 1})`).textContent()
        console.log(`\n  📑 Tab ${i + 1}: ${tabName}`)

        await page.click(`.react-tabs__tab:nth-child(${i + 1})`)
        await page.waitForTimeout(500)

        await captureCurrentState(`parameters-tab-${i + 1}-${tabName?.replace(/\s+/g, '-')}`)
      }
    }

    console.log('\nACTION: Review the parameters. When ready to see results, click Next/Verder.')
    await askQuestion('Press ENTER after navigating to results...')

    // === STEP 4: Results ===
    await page.waitForTimeout(1500)
    const resultsData = await captureCurrentState('results')

    // Extract calculations and charts
    const calculations = await page.evaluate(() => {
      const data: any = {
        tables: [],
        charts: [],
        highlights: [],
        costs: [],
      }

      // Extract all tables
      document.querySelectorAll('table').forEach((table: any) => {
        const rows = Array.from(table.querySelectorAll('tr')).map((tr: any) =>
          Array.from(tr.querySelectorAll('td, th')).map((cell: any) => cell.textContent?.trim())
        )
        data.tables.push({ rows })
      })

      // Look for cost/price/total elements
      const costElements = document.querySelectorAll(
        '[class*="cost"], [class*="price"], [class*="total"], [class*="tco"]'
      )
      costElements.forEach((el: any) => {
        data.costs.push({
          className: el.className,
          text: el.textContent?.trim(),
        })
      })

      // Look for highlighted/important values
      const highlights = document.querySelectorAll(
        '.highlight, [class*="result"], [class*="summary"]'
      )
      highlights.forEach((el: any) => {
        data.highlights.push({
          className: el.className,
          text: el.textContent?.trim(),
        })
      })

      return data
    })

    data.calculations.push(calculations)

    console.log('\n✅ Results captured!')
    console.log(`  - Tables: ${calculations.tables.length}`)
    console.log(`  - Costs: ${calculations.costs.length}`)
    console.log(`  - Highlights: ${calculations.highlights.length}`)

    // Final review
    console.log('\n📸 Do you want to capture any additional views?')
    console.log('(You can navigate to other tabs, change settings, etc.)')
    const more = await askQuestion('Type "yes" to capture more, or press ENTER to finish: ')

    if (more.toLowerCase() === 'yes' || more.toLowerCase() === 'y') {
      let captureMore = true
      while (captureMore) {
        const stepName = await askQuestion(
          'Enter a name for this capture (or press ENTER to finish): '
        )
        if (!stepName) {
          captureMore = false
        } else {
          await page.waitForTimeout(500)
          await captureCurrentState(stepName)
        }
      }
    }

    // Save all data
    console.log('\n💾 Saving all collected data...')

    writeFileSync(
      join(OUTPUT_DIR, 'documentation', 'manual-scrape.json'),
      JSON.stringify(data, null, 2),
      'utf-8'
    )

    // Generate detailed report
    const report = generateDetailedReport(data)
    writeFileSync(join(OUTPUT_DIR, 'documentation', 'MANUAL-SCRAPE-REPORT.md'), report, 'utf-8')

    console.log('\n✅ All data saved!')
    console.log(`📁 Files created:`)
    console.log(`  - manual-scrape.json`)
    console.log(`  - MANUAL-SCRAPE-REPORT.md`)
    console.log(`  - ${data.screenshots.length} screenshots`)
  } catch (error) {
    console.error('\n❌ Error:', error)
    throw error
  } finally {
    rl.close()
    await browser.close()
  }
}

function generateDetailedReport(data: CapturedData): string {
  let md = '# Manual Scrape Report - Original TCO Calculator\n\n'
  md += `**Scraped**: ${data.timestamp}\n\n`
  md += `**Total Steps Captured**: ${data.steps.length}\n\n`
  md += `**Total Screenshots**: ${data.screenshots.length}\n\n`
  md += `**Total Unique Parameters**: ${data.parameters.length}\n\n`
  md += `---\n\n`

  // Document each step
  data.steps.forEach((step, idx) => {
    md += `## ${step.stepNumber}. ${step.stepName}\n\n`
    md += `**URL**: ${step.url}\n\n`
    md += `**Screenshot**: \`${step.screenshot}\`\n\n`

    if (step.structure?.headings?.length > 0) {
      md += `### Headings\n\n`
      step.structure.headings.forEach((h: any) => {
        md += `- **${h.tag}**: ${h.text}\n`
      })
      md += `\n`
    }

    if (step.inputs?.length > 0) {
      md += `### Input Fields (${step.inputs.length})\n\n`
      md += `| Label | Type | Name | Value | Min | Max | Required |\n`
      md += `|-------|------|------|-------|-----|-----|----------|\n`
      step.inputs.forEach((input: any) => {
        md += `| ${input.label || '-'} | ${input.type} | ${input.name} | ${input.value || '-'} | ${input.min || '-'} | ${input.max || '-'} | ${input.required ? 'Yes' : 'No'} |\n`
      })
      md += `\n`
    }

    if (step.structure?.tables?.length > 0) {
      md += `### Tables\n\n`
      step.structure.tables.forEach((table: any, i: number) => {
        md += `**Table ${i + 1}**:\n\n`
        table.rows.forEach((row: string[]) => {
          md += `| ${row.join(' | ')} |\n`
        })
        md += `\n`
      })
    }

    if (step.structure?.buttons?.length > 0) {
      md += `### Buttons (${step.structure.buttons.length})\n\n`
      step.structure.buttons.forEach((btn: any) => {
        md += `- **${btn.text}** (${btn.type}) ${btn.disabled ? '[Disabled]' : ''}\n`
      })
      md += `\n`
    }

    md += `---\n\n`
  })

  // All parameters summary
  md += `## Complete Parameters List\n\n`
  md += `Found **${data.parameters.length}** unique parameters:\n\n`
  md += `| # | Label | Type | Name | Default | Min | Max | Options |\n`
  md += `|---|-------|------|------|---------|-----|-----|--------|\n`
  data.parameters.forEach((p: any, i: number) => {
    const optCount = p.options ? p.options.length : '-'
    md += `| ${i + 1} | ${p.label || '-'} | ${p.type} | ${p.name} | ${p.value || '-'} | ${p.min || '-'} | ${p.max || '-'} | ${optCount} |\n`
  })
  md += `\n`

  // Calculations summary
  if (data.calculations.length > 0) {
    md += `## Calculations & Results\n\n`
    data.calculations.forEach((calc: any, i: number) => {
      if (calc.tables?.length > 0) {
        md += `### Result Tables (${calc.tables.length})\n\n`
      }
      if (calc.costs?.length > 0) {
        md += `### Cost Elements (${calc.costs.length})\n\n`
        calc.costs.slice(0, 20).forEach((cost: any) => {
          md += `- ${cost.text}\n`
        })
        md += `\n`
      }
    })
  }

  return md
}

// Run the manual-assisted scraper
manualAssistedScrape()
  .then(() => {
    console.log('\n🎉 All done! Thank you for your assistance.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
