/**
 * Step-by-Step TCO Scraper
 *
 * This script opens the browser and lets you navigate manually.
 * Press SPACE to capture current state, ESC to finish.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { chromium, Page } from '@playwright/test'
import { writeFileSync } from 'fs'
import { join } from 'path'
import * as readline from 'readline'

const BASE_URL = 'https://tcovrachtwagen.org/simulation'
const OUTPUT_DIR = join(process.cwd(), 'original-tco-reference')

interface CapturedStep {
  stepNumber: number
  stepName: string
  timestamp: string
  url: string
  screenshot: string
  title: string
  inputs: any[]
  structure: any
  allText: string
}

async function scrapeStepByStep() {
  console.log('🚀 Step-by-Step TCO Scraper')
  console.log('═'.repeat(70))
  console.log('\n📖 INSTRUCTIONS:')
  console.log('   1. Browser will open to the TCO calculator')
  console.log('   2. Navigate through each step manually')
  console.log('   3. When ready to capture a step, come back to terminal')
  console.log('   4. Press ENTER in terminal to capture current state')
  console.log('   5. Repeat until you finish all steps')
  console.log('   6. Type "done" and press ENTER when finished\n')
  console.log('═'.repeat(70))

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  })

  const page = await context.newPage()

  const allSteps: CapturedStep[] = []
  let stepCounter = 0

  try {
    console.log(`\n📱 Opening browser to: ${BASE_URL}\n`)
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    console.log('✅ Browser is ready!')
    console.log('\n' + '─'.repeat(70))
    console.log('Navigate to the first view you want to capture...')
    console.log('Then press ENTER in this terminal to capture it.')
    console.log('─'.repeat(70) + '\n')

    // Use a simpler approach - wait for user input with process.stdin
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    let capturing = true

    const promptCapture = () => {
      return new Promise<string>((resolve) => {
        rl.question('\n👉 Press ENTER to capture, or type "done" to finish: ', (answer: string) => {
          resolve(answer.trim().toLowerCase())
        })
      })
    }

    while (capturing) {
      const answer = await promptCapture()

      if (answer === 'done' || answer === 'exit' || answer === 'quit') {
        capturing = false
        console.log('\n✅ Finishing up...')
        break
      }

      // Capture current state
      stepCounter++
      console.log(`\n📸 Capturing Step ${stepCounter}...`)

      const stepData = await captureCurrentState(page, stepCounter)
      allSteps.push(stepData)

      console.log(`✅ Step ${stepCounter} captured successfully!`)
      console.log(`   📄 Title: ${stepData.title}`)
      console.log(`   🔢 Inputs: ${stepData.inputs.length}`)
      console.log(`   📸 Screenshot: ${stepData.screenshot}`)

      if (stepData.inputs.length > 0) {
        console.log(`\n   Found inputs:`)
        stepData.inputs.slice(0, 5).forEach((inp: any, i: number) => {
          console.log(`   ${i + 1}. ${inp.label || inp.name} (${inp.type})`)
        })
        if (stepData.inputs.length > 5) {
          console.log(`   ... and ${stepData.inputs.length - 5} more`)
        }
      }

      console.log('\n' + '─'.repeat(70))
      console.log('Navigate to the next view, then press ENTER to capture.')
      console.log('Or type "done" when you have captured all steps.')
      console.log('─'.repeat(70))
    }

    rl.close()

    // Save all data
    console.log('\n💾 Saving collected data...')
    saveData(allSteps)

    console.log('\n✅ All done!')
    console.log(`📊 Captured ${allSteps.length} steps`)
    console.log(`📁 Data saved to: ${OUTPUT_DIR}`)
  } catch (error) {
    console.error('\n❌ Error:', error)
    throw error
  } finally {
    await browser.close()
  }
}

async function captureCurrentState(page: Page, stepNumber: number): Promise<CapturedStep> {
  const url = page.url()
  const timestamp = new Date().toISOString()

  // Get page title
  const title = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    const h2 = document.querySelector('h2')
    return h1?.textContent?.trim() || h2?.textContent?.trim() || 'Unknown'
  })

  // Screenshot
  const screenshotName = `manual-${String(stepNumber).padStart(2, '0')}-${title.replace(/\s+/g, '-').toLowerCase()}.png`
  await page.screenshot({
    path: join(OUTPUT_DIR, 'screenshots', screenshotName),
    fullPage: true,
  })

  // Extract all inputs
  const inputs = await page.evaluate(() => {
    const fields: any[] = []

    // All input types
    document.querySelectorAll('input').forEach((el: any) => {
      const parent = el.closest('div, td, label, form')
      const labelEl = el.labels?.[0] || parent?.querySelector('label')
      const label =
        labelEl?.textContent?.trim() ||
        el.getAttribute('aria-label') ||
        el.placeholder ||
        el.name ||
        'Unknown'

      fields.push({
        type: el.type,
        name: el.name || el.id,
        label: label,
        value: el.value || el.checked,
        placeholder: el.placeholder,
        min: el.min,
        max: el.max,
        step: el.step,
        required: el.required,
        disabled: el.disabled,
        className: el.className,
      })
    })

    // Selects
    document.querySelectorAll('select').forEach((el: any) => {
      const parent = el.closest('div, td, label, form')
      const labelEl = el.labels?.[0] || parent?.querySelector('label')
      const label = labelEl?.textContent?.trim() || el.name || 'Unknown'

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
        disabled: el.disabled,
      })
    })

    // Textareas
    document.querySelectorAll('textarea').forEach((el: any) => {
      const parent = el.closest('div, td, label, form')
      const labelEl = el.labels?.[0] || parent?.querySelector('label')
      const label = labelEl?.textContent?.trim() || el.name || 'Unknown'

      fields.push({
        type: 'textarea',
        name: el.name || el.id,
        label,
        value: el.value,
        placeholder: el.placeholder,
        required: el.required,
      })
    })

    return fields
  })

  // Extract page structure
  const structure = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map((h: any) => ({
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

    const tabs = Array.from(document.querySelectorAll('.react-tabs__tab')).map((tab: any) => ({
      text: tab.textContent?.trim(),
      selected: tab.classList.contains('react-tabs__tab--selected'),
    }))

    return { headings, buttons, tables, tabs }
  })

  // Get all visible text
  const allText = await page.evaluate(() => {
    return document.body.innerText
  })

  return {
    stepNumber,
    stepName: title,
    timestamp,
    url,
    screenshot: screenshotName,
    title,
    inputs,
    structure,
    allText: allText.substring(0, 10000), // Limit length
  }
}

function saveData(steps: CapturedStep[]) {
  // Save complete data
  writeFileSync(
    join(OUTPUT_DIR, 'documentation', 'manual-scrape-detailed.json'),
    JSON.stringify(steps, null, 2),
    'utf-8'
  )

  // Extract all unique parameters
  const allParameters: any[] = []
  steps.forEach((step) => {
    step.inputs.forEach((input) => {
      if (input.name && !allParameters.find((p) => p.name === input.name)) {
        allParameters.push({
          ...input,
          foundInStep: step.stepNumber,
          foundInTitle: step.title,
        })
      }
    })
  })

  writeFileSync(
    join(OUTPUT_DIR, 'parameters', 'all-parameters-manual.json'),
    JSON.stringify(allParameters, null, 2),
    'utf-8'
  )

  // Generate detailed report
  const report = generateReport(steps, allParameters)
  writeFileSync(join(OUTPUT_DIR, 'documentation', 'MANUAL-SCRAPE-DETAILED.md'), report, 'utf-8')

  console.log(`   ✅ manual-scrape-detailed.json (${steps.length} steps)`)
  console.log(`   ✅ all-parameters-manual.json (${allParameters.length} parameters)`)
  console.log(`   ✅ MANUAL-SCRAPE-DETAILED.md`)
}

function generateReport(steps: CapturedStep[], allParameters: any[]): string {
  let md = '# Manual Scraping Report - Detailed\n\n'
  md += `**Scraped**: ${new Date().toISOString()}\n\n`
  md += `**Total Steps**: ${steps.length}\n\n`
  md += `**Total Unique Parameters**: ${allParameters.length}\n\n`
  md += `---\n\n`

  md += `## Table of Contents\n\n`
  steps.forEach((step, i) => {
    md += `${i + 1}. [${step.title}](#step-${step.stepNumber}-${step.title.replace(/\s+/g, '-').toLowerCase()})\n`
  })
  md += `\n---\n\n`

  // Document each step
  steps.forEach((step) => {
    md += `## Step ${step.stepNumber}: ${step.title}\n\n`
    md += `**URL**: ${step.url}\n\n`
    md += `**Screenshot**: \`${step.screenshot}\`\n\n`
    md += `**Captured**: ${step.timestamp}\n\n`

    if (step.structure.headings?.length > 0) {
      md += `### Headings\n\n`
      step.structure.headings.forEach((h: any) => {
        md += `- **${h.tag}**: ${h.text}\n`
      })
      md += `\n`
    }

    if (step.structure.tabs?.length > 0) {
      md += `### Tabs (${step.structure.tabs.length})\n\n`
      step.structure.tabs.forEach((tab: any, i: number) => {
        md += `${i + 1}. ${tab.text} ${tab.selected ? '**[Active]**' : ''}\n`
      })
      md += `\n`
    }

    if (step.inputs.length > 0) {
      md += `### Input Fields (${step.inputs.length})\n\n`
      md += `| # | Label | Type | Name | Value | Min | Max | Required |\n`
      md += `|---|-------|------|------|-------|-----|-----|----------|\n`
      step.inputs.forEach((input: any, i: number) => {
        const value = typeof input.value === 'object' ? JSON.stringify(input.value) : input.value
        md += `| ${i + 1} | ${input.label || '-'} | ${input.type} | ${input.name || '-'} | ${value || '-'} | ${input.min || '-'} | ${input.max || '-'} | ${input.required ? 'Yes' : 'No'} |\n`
      })
      md += `\n`
    }

    if (step.structure.tables?.length > 0) {
      md += `### Tables (${step.structure.tables.length})\n\n`
      step.structure.tables.forEach((table: any, i: number) => {
        md += `**Table ${i + 1}**:\n\n`
        if (table.rows.length > 0) {
          table.rows.slice(0, 10).forEach((row: string[]) => {
            md += `| ${row.join(' | ')} |\n`
          })
          if (table.rows.length > 10) {
            md += `\n... ${table.rows.length - 10} more rows\n`
          }
        }
        md += `\n`
      })
    }

    if (step.structure.buttons?.length > 0) {
      md += `### Buttons (${step.structure.buttons.length})\n\n`
      step.structure.buttons.forEach((btn: any) => {
        md += `- **${btn.text}** (${btn.type}) ${btn.disabled ? '[Disabled]' : ''}\n`
      })
      md += `\n`
    }

    md += `---\n\n`
  })

  // All parameters summary
  md += `## All Parameters Summary\n\n`
  md += `Total unique parameters: **${allParameters.length}**\n\n`
  md += `| # | Label | Type | Name | Default | Min | Max | Found In |\n`
  md += `|---|-------|------|------|---------|-----|-----|----------|\n`
  allParameters.forEach((p, i) => {
    const value = typeof p.value === 'object' ? JSON.stringify(p.value) : p.value
    md += `| ${i + 1} | ${p.label || '-'} | ${p.type} | ${p.name} | ${value || '-'} | ${p.min || '-'} | ${p.max || '-'} | Step ${p.foundInStep}: ${p.foundInTitle} |\n`
  })
  md += `\n`

  return md
}

// Run the scraper
scrapeStepByStep()
  .then(() => {
    console.log('\n🎉 Thank you! All data captured successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
