/**
 * Comprehensive TCO Calculator Scraper
 *
 * This script scrapes https://tcovrachtwagen.org/simulation to document:
 * - All parameters and input fields
 * - Calculation logic and formulas
 * - UI structure and flow
 * - Default values and validation rules
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const BASE_URL = 'https://tcovrachtwagen.org/simulation'
const OUTPUT_DIR = join(process.cwd(), 'original-tco-reference')

interface InputField {
  name: string
  label: string
  type: string
  value: string | number
  placeholder?: string
  min?: string
  max?: string
  step?: string
  required: boolean
  disabled: boolean
  options?: { value: string; label: string }[]
}

interface StepData {
  stepNumber: number
  stepTitle: string
  url: string
  inputs: InputField[]
  buttons: { text: string; type: string; disabled: boolean }[]
  calculations?: any[]
  htmlSnapshot: string
}

async function scrapeOriginalTCO() {
  console.log('🚀 Starting comprehensive TCO scraper...')

  const browser = await chromium.launch({ headless: false }) // Use headless: true for production
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  })
  const page = await context.newPage()

  const allSteps: StepData[] = []
  const allScripts: string[] = []

  try {
    console.log('📱 Navigating to:', BASE_URL)
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // Wait for any animations

    // Take initial screenshot
    await page.screenshot({
      path: join(OUTPUT_DIR, 'screenshots', '00-initial-load.png'),
      fullPage: true,
    })

    // Extract all JavaScript to analyze calculation logic
    console.log('📜 Extracting JavaScript sources...')
    const scripts = await page.evaluate(() => {
      const scriptElements = Array.from(document.querySelectorAll('script'))
      return scriptElements.map((script) => script.src || script.textContent).filter(Boolean)
    })
    allScripts.push(...scripts)

    // Detect framework
    const framework = await page.evaluate(() => {
      const win = window as any
      if (win.React || document.querySelector('[data-reactroot]')) return 'React'
      if (win.Vue || document.querySelector('[data-v-]')) return 'Vue'
      if (win.angular) return 'Angular'
      return 'Unknown/Vanilla'
    })
    console.log('🔧 Detected framework:', framework)

    // Try to detect if it's a multi-step form
    const stepIndicators = await page
      .locator('[class*="step"], [class*="progress"], [role="progressbar"]')
      .count()
    console.log('📍 Found step indicators:', stepIndicators)

    // Scrape current page state
    let currentStep = 1
    let hasNextStep = true

    while (hasNextStep && currentStep <= 10) {
      // Max 10 steps to prevent infinite loop
      console.log(`\n📋 Scraping Step ${currentStep}...`)

      const stepData = await scrapeCurrentStep(page, currentStep)
      allSteps.push(stepData)

      // Take screenshot
      await page.screenshot({
        path: join(OUTPUT_DIR, 'screenshots', `step-${String(currentStep).padStart(2, '0')}.png`),
        fullPage: true,
      })

      // Try to find and click "Next" or "Volgende" button
      const nextButton = page
        .locator(
          'button:has-text("Volgende"), button:has-text("Next"), button:has-text("Verder"), button[type="submit"]'
        )
        .first()
      const nextButtonExists = (await nextButton.count()) > 0

      if (nextButtonExists) {
        const isDisabled = await nextButton.isDisabled()

        if (!isDisabled) {
          console.log('➡️  Clicking next button...')
          await nextButton.click()
          await page.waitForTimeout(1500) // Wait for navigation/animation
          currentStep++
        } else {
          console.log('⚠️  Next button is disabled - may need to fill required fields')

          // Try to fill in some default values to proceed
          await fillRequiredFields(page)
          await page.waitForTimeout(500)

          const stillDisabled = await nextButton.isDisabled()
          if (!stillDisabled) {
            await nextButton.click()
            await page.waitForTimeout(1500)
            currentStep++
          } else {
            console.log('❌ Cannot proceed - button still disabled')
            hasNextStep = false
          }
        }
      } else {
        console.log('✅ No next button found - likely final step')
        hasNextStep = false
      }

      // Check if URL changed (might be SPA navigation)
      const currentUrl = page.url()
      if (currentUrl !== BASE_URL) {
        console.log('🔄 URL changed to:', currentUrl)
      }
    }

    // Extract any visible calculation results
    console.log('\n💰 Extracting calculation results...')
    const calculationResults = await page.evaluate(() => {
      const results: any[] = []

      // Look for currency values
      const currencyElements = document.querySelectorAll(
        '[class*="price"], [class*="cost"], [class*="total"], [class*="amount"]'
      )
      currencyElements.forEach((el) => {
        results.push({
          type: 'currency',
          label: el.textContent?.trim(),
          className: el.className,
        })
      })

      // Look for percentage values
      const percentageElements = document.querySelectorAll('[class*="percent"], [class*="ratio"]')
      percentageElements.forEach((el) => {
        results.push({
          type: 'percentage',
          label: el.textContent?.trim(),
          className: el.className,
        })
      })

      return results
    })

    // Save all collected data
    console.log('\n💾 Saving collected data...')

    // Save step-by-step data
    writeFileSync(
      join(OUTPUT_DIR, 'documentation', 'steps.json'),
      JSON.stringify(allSteps, null, 2),
      'utf-8'
    )

    // Save JavaScript sources for analysis
    writeFileSync(
      join(OUTPUT_DIR, 'documentation', 'javascript-sources.json'),
      JSON.stringify(allScripts, null, 2),
      'utf-8'
    )

    // Save calculation results
    writeFileSync(
      join(OUTPUT_DIR, 'calculations', 'extracted-results.json'),
      JSON.stringify(calculationResults, null, 2),
      'utf-8'
    )

    // Save framework info
    writeFileSync(
      join(OUTPUT_DIR, 'documentation', 'technical-info.json'),
      JSON.stringify(
        {
          framework,
          baseUrl: BASE_URL,
          totalSteps: allSteps.length,
          scrapedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    )

    // Generate summary markdown
    const summary = generateSummary(allSteps, framework, calculationResults)
    writeFileSync(join(OUTPUT_DIR, 'documentation', 'SUMMARY.md'), summary, 'utf-8')

    console.log('\n✅ Scraping completed successfully!')
    console.log(`📊 Total steps scraped: ${allSteps.length}`)
    console.log(`📁 Results saved to: ${OUTPUT_DIR}`)
  } catch (error) {
    console.error('❌ Error during scraping:', error)
    throw error
  } finally {
    await browser.close()
  }
}

async function scrapeCurrentStep(page: any, stepNumber: number): Promise<StepData> {
  // Get current URL
  const url = page.url()

  // Try to find step title
  const stepTitle = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    const h2 = document.querySelector('h2')
    const title = document.querySelector('[class*="title"], [class*="heading"]')
    return (
      h1?.textContent?.trim() ||
      h2?.textContent?.trim() ||
      title?.textContent?.trim() ||
      'Unknown Step'
    )
  })

  console.log(`  📝 Step title: ${stepTitle}`)

  // Extract all input fields
  const inputs = await page.evaluate(() => {
    const allInputs: any[] = []

    // Text inputs, number inputs
    document.querySelectorAll('input, textarea').forEach((el: any) => {
      const label =
        el.labels?.[0]?.textContent?.trim() ||
        el.getAttribute('aria-label') ||
        el.getAttribute('placeholder') ||
        el.name ||
        'Unknown'

      allInputs.push({
        name: el.name || el.id || '',
        label,
        type: el.type || 'text',
        value: el.value,
        placeholder: el.placeholder,
        min: el.min,
        max: el.max,
        step: el.step,
        required: el.required,
        disabled: el.disabled,
      })
    })

    // Select dropdowns
    document.querySelectorAll('select').forEach((el: any) => {
      const label =
        el.labels?.[0]?.textContent?.trim() || el.getAttribute('aria-label') || el.name || 'Unknown'

      const options = Array.from(el.options).map((opt: any) => ({
        value: opt.value,
        label: opt.textContent?.trim(),
      }))

      allInputs.push({
        name: el.name || el.id || '',
        label,
        type: 'select',
        value: el.value,
        required: el.required,
        disabled: el.disabled,
        options,
      })
    })

    // Radio buttons
    const radioGroups = new Map()
    document.querySelectorAll('input[type="radio"]').forEach((el: any) => {
      const groupName = el.name
      if (!radioGroups.has(groupName)) {
        const label =
          el.labels?.[0]?.textContent?.trim() ||
          el.closest('label')?.textContent?.trim() ||
          groupName

        radioGroups.set(groupName, {
          name: groupName,
          label,
          type: 'radio',
          value: el.checked ? el.value : '',
          required: el.required,
          disabled: el.disabled,
          options: [],
        })
      }

      radioGroups.get(groupName).options.push({
        value: el.value,
        label: el.labels?.[0]?.textContent?.trim() || el.value,
      })
    })

    allInputs.push(...Array.from(radioGroups.values()))

    // Checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach((el: any) => {
      const label =
        el.labels?.[0]?.textContent?.trim() ||
        el.closest('label')?.textContent?.trim() ||
        el.name ||
        'Unknown'

      allInputs.push({
        name: el.name || el.id || '',
        label,
        type: 'checkbox',
        value: el.checked,
        required: el.required,
        disabled: el.disabled,
      })
    })

    return allInputs
  })

  console.log(`  🔢 Found ${inputs.length} input fields`)

  // Extract buttons
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map((btn: any) => ({
      text: btn.textContent?.trim(),
      type: btn.type,
      disabled: btn.disabled,
    }))
  })

  console.log(`  🔘 Found ${buttons.length} buttons`)

  // Get HTML snapshot
  const htmlSnapshot = await page.content()

  return {
    stepNumber,
    stepTitle,
    url,
    inputs,
    buttons,
    htmlSnapshot,
  }
}

async function fillRequiredFields(page: any) {
  console.log('  🔧 Attempting to fill required fields with defaults...')

  await page.evaluate(() => {
    // Fill required text/number inputs with placeholder or reasonable default
    document.querySelectorAll('input[required]').forEach((el: any) => {
      if (el.type === 'text' && !el.value) {
        el.value = el.placeholder || 'Test'
      } else if (el.type === 'number' && !el.value) {
        el.value = el.min || el.placeholder || '100'
      } else if (el.type === 'email' && !el.value) {
        el.value = 'test@example.com'
      }

      // Trigger change event
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // Select first option in required selects
    document.querySelectorAll('select[required]').forEach((el: any) => {
      if (!el.value && el.options.length > 0) {
        el.selectedIndex = el.options[0].value ? 0 : 1
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    // Check first radio in required groups
    const requiredRadioGroups = new Set()
    document.querySelectorAll('input[type="radio"][required]').forEach((el: any) => {
      requiredRadioGroups.add(el.name)
    })

    requiredRadioGroups.forEach((groupName) => {
      const firstRadio = document.querySelector(`input[type="radio"][name="${groupName}"]`) as any
      if (firstRadio && !firstRadio.checked) {
        firstRadio.checked = true
        firstRadio.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
  })
}

function generateSummary(steps: StepData[], framework: string, calculations: any[]): string {
  let md = '# Original TCO Calculator - Scraping Summary\n\n'
  md += `**Scraped on**: ${new Date().toISOString()}\n\n`
  md += `**Framework**: ${framework}\n\n`
  md += `**Total Steps**: ${steps.length}\n\n`
  md += `---\n\n`

  steps.forEach((step, idx) => {
    md += `## Step ${step.stepNumber}: ${step.stepTitle}\n\n`
    md += `**URL**: ${step.url}\n\n`

    if (step.inputs.length > 0) {
      md += `### Input Fields (${step.inputs.length})\n\n`
      md += `| Label | Name | Type | Default Value | Required | Min | Max |\n`
      md += `|-------|------|------|---------------|----------|-----|-----|\n`

      step.inputs.forEach((input) => {
        md += `| ${input.label} | ${input.name} | ${input.type} | ${input.value || '-'} | ${input.required ? 'Yes' : 'No'} | ${input.min || '-'} | ${input.max || '-'} |\n`
      })
      md += `\n`
    }

    if (step.buttons.length > 0) {
      md += `### Buttons (${step.buttons.length})\n\n`
      step.buttons.forEach((btn) => {
        md += `- **${btn.text}** (${btn.type}) ${btn.disabled ? '[Disabled]' : ''}\n`
      })
      md += `\n`
    }

    md += `---\n\n`
  })

  if (calculations.length > 0) {
    md += `## Calculation Results\n\n`
    calculations.forEach((calc) => {
      md += `- **${calc.type}**: ${calc.label}\n`
    })
    md += `\n`
  }

  md += `## Next Steps\n\n`
  md += `1. Review extracted parameters in \`parameters/\`\n`
  md += `2. Analyze calculation logic in \`calculations/\`\n`
  md += `3. Compare with our implementation\n`
  md += `4. Identify gaps and enhancements\n`

  return md
}

// Run the scraper
scrapeOriginalTCO()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
