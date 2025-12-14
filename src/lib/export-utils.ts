import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'

interface ResultData {
  fuelType: string
  totalCost: number
  costPerKm: number
  co2Emissions: number
  breakdown: {
    purchaseCost: number
    fuelCost: number
    maintenanceCost: number
    taxesCost: number
    insuranceCost: number
    subsidyCredit: number
    interestCost: number
    totalOperatingCost: number
  }
}

// New hierarchical export options structure (7 sections, 21 subsections)
interface ExportOptions {
  executiveSummary: {
    enabled: boolean
    coverPage: boolean
    keyFindings: boolean
    recommendations: boolean
  }
  specifications: {
    enabled: boolean
    vehicleDetails: boolean
    drivingArea: boolean
    parameters: boolean
  }
  cfoDashboard: {
    enabled: boolean
    capexOpex: boolean
    cashFlowChart: boolean
    breakEvenAnalysis: boolean
  }
  costAnalysis: {
    enabled: boolean
    comparisonTable: boolean
    comparisonChart: boolean
    costBreakdownChart: boolean
    detailedBreakdown: boolean
  }
  timeline: {
    enabled: boolean
    annualCosts: boolean
    cumulativeCashFlow: boolean
    depreciationSchedule: boolean
  }
  environmental: {
    enabled: boolean
    co2Comparison: boolean
    emissionsChart: boolean
    sustainabilityScore: boolean
  }
  insights: {
    enabled: boolean
    savings: boolean
    roi: boolean
    riskFactors: boolean
  }
}

interface ParametersData {
  purchasePrice: number
  gvw?: number
  payload?: number
  kmPerYear: number
  fuelType: 'diesel' | 'bev' | 'fcev' | 'h2ice'
  consumption: number
  motorTax?: number
  truckToll?: number
  subsidy?: number
  interestRate?: number
  depreciationYears?: number
  maintenanceCostPerKm?: number
  insurancePercentage?: number
}

interface VehicleDetails {
  name: string
  description: string | null
  defaultGvw: number | null
  defaultPayload: number | null
}

interface DrivingAreaDetails {
  name: string
  description: string | null
  defaultKmPerYear: number
}

interface ExportData {
  vehicleType: string
  drivingArea: string
  depreciationYears: number
  results: ResultData[]
  parametersData?: ParametersData
  vehicleDetails?: VehicleDetails
  drivingAreaDetails?: DrivingAreaDetails
}

const fuelTypeLabels: Record<string, string> = {
  diesel: 'Diesel',
  bev: 'BEV (Batterij Elektrisch)',
  fcev: 'FCEV (Waterstof Brandstofcel)',
  h2ice: 'H2ICE (Waterstof Verbrandings)',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Helper: Draw a bar chart in the PDF
 */
function drawBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: { label: string; value: number; color: string }[],
  title: string
) {
  const maxValue = Math.max(...data.map((d) => d.value))
  const barWidth = width / data.length - 5
  const chartHeight = height - 20

  // Title
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(title, x, y - 5)

  // Draw bars
  data.forEach((item, i) => {
    const barHeight = (item.value / maxValue) * chartHeight
    const barX = x + i * (barWidth + 5)
    const barY = y + chartHeight - barHeight

    // Bar
    const rgb = hexToRgb(item.color)
    doc.setFillColor(rgb.r, rgb.g, rgb.b)
    doc.rect(barX, barY, barWidth, barHeight, 'F')

    // Value on top
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(formatCurrency(item.value), barX + barWidth / 2, barY - 2, { align: 'center' })

    // Label at bottom
    doc.setFontSize(6)
    doc.text(item.label, barX + barWidth / 2, y + chartHeight + 8, {
      align: 'center',
      maxWidth: barWidth,
    })
  })
}

/**
 * Helper: Draw a stacked bar chart for cost breakdown
 */
function drawStackedBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: { fuelType: string; breakdown: ResultData['breakdown'] }[],
  title: string
) {
  const chartHeight = height - 25
  const barWidth = width / data.length - 10

  // Title
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(title, x, y - 5)

  // Cost categories with colors
  const categories = [
    { key: 'purchaseCost', label: 'Aanschaf', color: '#3b82f6' },
    { key: 'fuelCost', label: 'Brandstof', color: '#f29100' },
    { key: 'maintenanceCost', label: 'Onderhoud', color: '#10b981' },
    { key: 'taxesCost', label: 'Belastingen', color: '#ef4444' },
    { key: 'insuranceCost', label: 'Verzekering', color: '#8b5cf6' },
    { key: 'interestCost', label: 'Rente', color: '#f59e0b' },
  ] as const

  // Find max total for scaling
  const maxTotal = Math.max(
    ...data.map((item) => categories.reduce((sum, cat) => sum + (item.breakdown[cat.key] || 0), 0))
  )

  // Draw each fuel type's stacked bar
  data.forEach((item, i) => {
    const barX = x + i * (barWidth + 10)
    let currentY = y + chartHeight
    const scaleFactor = chartHeight / maxTotal

    // Draw stacked segments
    categories.forEach((cat) => {
      const value = item.breakdown[cat.key] || 0
      const segmentHeight = value * scaleFactor

      if (segmentHeight > 0) {
        const rgb = hexToRgb(cat.color)
        doc.setFillColor(rgb.r, rgb.g, rgb.b)
        doc.rect(barX, currentY - segmentHeight, barWidth, segmentHeight, 'F')
        currentY -= segmentHeight
      }
    })

    // Label
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(
      fuelTypeLabels[item.fuelType] || item.fuelType,
      barX + barWidth / 2,
      y + chartHeight + 8,
      {
        align: 'center',
      }
    )
  })

  // Legend
  let legendY = y + chartHeight + 15
  categories.forEach((cat, i) => {
    const legendX = x + (i % 3) * 60
    if (i % 3 === 0 && i > 0) legendY += 6

    const rgb = hexToRgb(cat.color)
    doc.setFillColor(rgb.r, rgb.g, rgb.b)
    doc.rect(legendX, legendY - 3, 4, 4, 'F')
    doc.setFontSize(7)
    doc.text(cat.label, legendX + 6, legendY)
  })
}

/**
 * Helper: Draw a line chart for cash flow projection
 */
function drawLineChart(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  data: { year: number; values: Record<string, number> }[],
  title: string,
  colors: Record<string, string>
) {
  const chartHeight = height - 30
  const chartWidth = width - 20

  // Title
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(title, x, y - 5)

  // Find max value for scaling
  const allValues = data.flatMap((d) => Object.values(d.values))
  const maxValue = Math.max(...allValues)
  const minValue = Math.min(...allValues)

  // Draw axes
  doc.setDrawColor(200, 200, 200)
  doc.line(x, y + chartHeight, x + chartWidth, y + chartHeight) // X-axis
  doc.line(x, y, x, y + chartHeight) // Y-axis

  // Draw gridlines and Y-axis labels
  const ySteps = 5
  for (let i = 0; i <= ySteps; i++) {
    const gridY = y + (chartHeight / ySteps) * i
    const value = maxValue - (maxValue / ySteps) * i

    doc.setDrawColor(240, 240, 240)
    doc.line(x, gridY, x + chartWidth, gridY)

    doc.setFontSize(6)
    doc.setTextColor(100, 100, 100)
    doc.text(`€${(value / 1000).toFixed(0)}k`, x - 2, gridY + 1, { align: 'right' })
  }

  // Draw X-axis labels
  data.forEach((point, i) => {
    const pointX = x + (chartWidth / (data.length - 1)) * i
    doc.setFontSize(6)
    doc.setTextColor(100, 100, 100)
    doc.text(`${point.year}`, pointX, y + chartHeight + 6, { align: 'center' })
  })

  // Draw lines for each fuel type
  Object.keys(data[0]?.values || {}).forEach((fuelType) => {
    const color = colors[fuelType] || '#000000'
    const rgb = hexToRgb(color)
    doc.setDrawColor(rgb.r, rgb.g, rgb.b)
    doc.setLineWidth(0.5)

    for (let i = 0; i < data.length - 1; i++) {
      const x1 = x + (chartWidth / (data.length - 1)) * i
      const y1 =
        y +
        chartHeight -
        ((data[i]!.values[fuelType]! - minValue) / (maxValue - minValue)) * chartHeight
      const x2 = x + (chartWidth / (data.length - 1)) * (i + 1)
      const y2 =
        y +
        chartHeight -
        ((data[i + 1]!.values[fuelType]! - minValue) / (maxValue - minValue)) * chartHeight

      doc.line(x1, y1, x2, y2)
    }
  })

  // Legend
  let legendX = x
  let legendY = y + chartHeight + 15
  Object.entries(colors).forEach(([fuelType, color], i) => {
    if (i > 0 && i % 2 === 0) {
      legendX = x
      legendY += 6
    } else if (i > 0) {
      legendX += 50
    }

    const rgb = hexToRgb(color)
    doc.setDrawColor(rgb.r, rgb.g, rgb.b)
    doc.setLineWidth(1)
    doc.line(legendX, legendY - 1, legendX + 8, legendY - 1)

    doc.setFontSize(7)
    doc.setTextColor(0, 0, 0)
    doc.text(fuelTypeLabels[fuelType] || fuelType, legendX + 10, legendY)
  })
}

/**
 * Helper: Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : { r: 0, g: 0, b: 0 }
}

/**
 * Export TCO analysis to PDF with comprehensive sections
 */
export function exportToPDF(data: ExportData, options: ExportOptions) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPos = 20

  // SCEX Brand Colors
  const orangeRGB = [242, 145, 0] as [number, number, number]
  const navyRGB = [8, 25, 44] as [number, number, number]

  const fuelColors: Record<string, string> = {
    diesel: '#6366f1',
    bev: '#10b981',
    fcev: '#06b6d4',
    h2ice: '#a855f7',
  }

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 20) {
      doc.addPage()
      yPos = 20
    }
  }

  // Helper function to add section header
  const addSectionHeader = (title: string) => {
    checkPageBreak(15)
    doc.setFillColor(245, 245, 245)
    doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...navyRGB)
    doc.text(title, 17, yPos)
    yPos += 10
  }

  // ============================================================================
  // SECTION 1: EXECUTIVE SUMMARY
  // ============================================================================
  if (options.executiveSummary.enabled) {
    // 1.1 Cover Page
    if (options.executiveSummary.coverPage) {
      doc.setFillColor(...orangeRGB)
      doc.rect(0, 0, pageWidth, 25, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('TCO ANALYSE RAPPORT', 15, 15)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('SCEX Software Optimization', pageWidth - 15, 15, { align: 'right' })

      // Reset and add vehicle/area info
      doc.setTextColor(...navyRGB)
      yPos = 45
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('VOERTUIGCONFIGURATIE', 15, yPos)
      yPos += 10

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Voertuig: ${data.vehicleType}`, 15, yPos)
      yPos += 7
      doc.text(`Rijgebied: ${data.drivingArea}`, 15, yPos)
      yPos += 7
      doc.text(`Afschrijvingsperiode: ${data.depreciationYears} jaar`, 15, yPos)
      yPos += 7
      doc.text(`Analysedatum: ${new Date().toLocaleDateString('nl-NL')}`, 15, yPos)
      yPos += 15
    }

    // 1.2 Key Findings & KPIs
    if (options.executiveSummary.keyFindings) {
      addSectionHeader('KERNGEGEVENS & SAMENVATTING')

      const minCost = Math.min(...data.results.map((r) => r.totalCost))
      const avgCost = data.results.reduce((sum, r) => sum + r.totalCost, 0) / data.results.length
      const minCO2 = Math.min(...data.results.map((r) => r.co2Emissions))
      const maxCost = Math.max(...data.results.map((r) => r.totalCost))
      const minCostResult = data.results.reduce((min, r) => (r.totalCost < min.totalCost ? r : min))

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Laagste TCO: ${formatCurrency(minCost)}`, 17, yPos)
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(
        `(${fuelTypeLabels[minCostResult.fuelType] || minCostResult.fuelType})`,
        17,
        yPos + 5
      )
      doc.setTextColor(...navyRGB)
      yPos += 11
      doc.setFontSize(10)
      doc.text(`Gemiddelde TCO: ${formatCurrency(avgCost)}`, 17, yPos)
      yPos += 6
      doc.text(`Laagste CO2: ${formatNumber(minCO2 / 1000, 1)} ton/jaar`, 17, yPos)
      yPos += 6
      doc.text(`Kostenspreiding: ${formatCurrency(maxCost - minCost)}`, 17, yPos)
      yPos += 12
    }

    // 1.3 Strategic Recommendations
    if (options.executiveSummary.recommendations) {
      addSectionHeader('STRATEGISCHE AANBEVELINGEN')

      const minCostResult = data.results.reduce((min, r) => (r.totalCost < min.totalCost ? r : min))
      const dieselResult = data.results.find((r) => r.fuelType === 'diesel')
      const minCO2Result = data.results.reduce((min, r) =>
        r.co2Emissions < min.co2Emissions ? r : min
      )

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `• ${fuelTypeLabels[minCostResult.fuelType]} biedt de laagste totale eigendomskosten`,
        17,
        yPos
      )
      yPos += 6

      if (dieselResult && minCostResult.fuelType !== 'diesel') {
        const savings = dieselResult.totalCost - minCostResult.totalCost
        const savingsPercent = ((savings / dieselResult.totalCost) * 100).toFixed(1)
        doc.text(
          `• Potentiële besparing: ${formatCurrency(savings)} (${savingsPercent}%) t.o.v. Diesel`,
          17,
          yPos
        )
        yPos += 6
      }

      doc.text(
        `• ${fuelTypeLabels[minCO2Result.fuelType]} heeft de laagste CO2-voetafdruk`,
        17,
        yPos
      )
      yPos += 6

      // Business recommendations based on fuel type
      const recommendations: Record<string, string> = {
        diesel: 'Bewezen technologie, laagste initiële investering, breed netwerk',
        bev: 'Laagste operationele kosten, subsidies beschikbaar, zero emissies',
        fcev: 'Toekomstbestendig, snelle tanktijden, medium range geschikt',
        h2ice: 'Waterstof zonder brandstofcel, lagere initiële kosten dan FCEV',
      }

      doc.text(
        `• ${recommendations[minCostResult.fuelType] || 'Geschikte keuze voor uw toepassing'}`,
        17,
        yPos
      )
      yPos += 12
    }
  }

  // ============================================================================
  // SECTION 2: SPECIFICATIONS
  // ============================================================================
  if (options.specifications.enabled) {
    // 2.1 Vehicle Details
    if (options.specifications.vehicleDetails && data.vehicleDetails) {
      addSectionHeader('VOERTUIGSPECIFICATIES')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Voertuigtype: ${data.vehicleDetails.name}`, 17, yPos)
      yPos += 6
      if (data.vehicleDetails.description) {
        doc.text(`Omschrijving: ${data.vehicleDetails.description}`, 17, yPos)
        yPos += 6
      }
      if (data.vehicleDetails.defaultGvw) {
        doc.text(
          `GVW (Technisch toegestaan gewicht): ${formatNumber(data.vehicleDetails.defaultGvw)} kg`,
          17,
          yPos
        )
        yPos += 6
      }
      if (data.vehicleDetails.defaultPayload) {
        doc.text(
          `Nuttig laadvermogen: ${formatNumber(data.vehicleDetails.defaultPayload)} kg`,
          17,
          yPos
        )
        yPos += 6
      }
      yPos += 6
    }

    // 2.2 Driving Area
    if (options.specifications.drivingArea && data.drivingAreaDetails) {
      addSectionHeader('RIJGEBIED INFORMATIE')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Gebied: ${data.drivingAreaDetails.name}`, 17, yPos)
      yPos += 6
      if (data.drivingAreaDetails.description) {
        doc.text(`Omschrijving: ${data.drivingAreaDetails.description}`, 17, yPos)
        yPos += 6
      }
      doc.text(
        `Standaard km/jaar: ${formatNumber(data.drivingAreaDetails.defaultKmPerYear)} km`,
        17,
        yPos
      )
      yPos += 12
    }

    // 2.3 All Parameters from Step 3
    if (options.specifications.parameters && data.parametersData) {
      addSectionHeader('BEREKENINGSPARAMETERS')

      const params = data.parametersData
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('VOERTUIGGEGEVENS', 17, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.text(`Aanschafprijs: ${formatCurrency(params.purchasePrice)}`, 17, yPos)
      yPos += 5
      if (params.gvw) {
        doc.text(`GVW: ${formatNumber(params.gvw)} kg`, 17, yPos)
        yPos += 5
      }
      if (params.payload) {
        doc.text(`Laadvermogen: ${formatNumber(params.payload)} kg`, 17, yPos)
        yPos += 5
      }
      yPos += 3

      doc.setFont('helvetica', 'bold')
      doc.text('VERBRUIKSGEGEVENS', 17, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.text(`Kilometers per jaar: ${formatNumber(params.kmPerYear)} km`, 17, yPos)
      yPos += 5
      doc.text(`Brandstoftype: ${fuelTypeLabels[params.fuelType] || params.fuelType}`, 17, yPos)
      yPos += 5
      const consumptionUnit =
        params.fuelType === 'diesel'
          ? 'L/100km'
          : params.fuelType === 'bev'
            ? 'kWh/100km'
            : 'kg/100km'
      doc.text(`Verbruik: ${formatNumber(params.consumption, 2)} ${consumptionUnit}`, 17, yPos)
      yPos += 8

      doc.setFont('helvetica', 'bold')
      doc.text('BELASTINGEN & HEFFINGEN', 17, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.text(`Motorrijtuigenbelasting: ${formatCurrency(params.motorTax || 0)}/jaar`, 17, yPos)
      yPos += 5
      doc.text(`Tol & kilometerheffing: ${formatCurrency(params.truckToll || 0)}/jaar`, 17, yPos)
      yPos += 8

      doc.setFont('helvetica', 'bold')
      doc.text('SUBSIDIES', 17, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.text(`Subsidie: ${formatCurrency(params.subsidy || 0)}`, 17, yPos)
      yPos += 8

      doc.setFont('helvetica', 'bold')
      doc.text('FINANCIËLE PARAMETERS', 17, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.text(`Rentepercentage: ${formatNumber((params.interestRate || 0) * 100, 2)}%`, 17, yPos)
      yPos += 5
      doc.text(
        `Afschrijvingsperiode: ${params.depreciationYears || data.depreciationYears} jaar`,
        17,
        yPos
      )
      yPos += 8

      doc.setFont('helvetica', 'bold')
      doc.text('EXTRA KOSTEN', 17, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')
      doc.text(`Onderhoudskosten: ${formatCurrency(params.maintenanceCostPerKm || 0)}/km`, 17, yPos)
      yPos += 5
      doc.text(
        `Verzekering: ${formatNumber((params.insurancePercentage || 0) * 100, 2)}% van aanschafprijs`,
        17,
        yPos
      )
      yPos += 12
    }
  }

  // ============================================================================
  // SECTION 3: CFO DASHBOARD
  // ============================================================================
  if (options.cfoDashboard.enabled) {
    // 3.1 CAPEX vs OPEX Comparison
    if (options.cfoDashboard.capexOpex) {
      addSectionHeader('CAPEX vs OPEX ANALYSE')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const colX = [17, 70, 110, 150] as const
      doc.text('Brandstof', colX[0]!, yPos)
      doc.text('CAPEX', colX[1]!, yPos)
      doc.text('OPEX/jaar', colX[2]!, yPos)
      doc.text('Verhouding', colX[3]!, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      data.results.forEach((result) => {
        checkPageBreak(8)
        const capex = result.breakdown.purchaseCost - (result.breakdown.subsidyCredit || 0)
        const annualOpex =
          (result.breakdown.fuelCost +
            result.breakdown.maintenanceCost +
            result.breakdown.taxesCost +
            result.breakdown.insuranceCost) /
          data.depreciationYears

        const ratio = ((capex / (capex + annualOpex * data.depreciationYears)) * 100).toFixed(0)

        doc.text(fuelTypeLabels[result.fuelType] || result.fuelType, colX[0]!, yPos)
        doc.text(formatCurrency(capex), colX[1]!, yPos)
        doc.text(formatCurrency(annualOpex), colX[2]!, yPos)
        doc.text(`${ratio}% / ${100 - parseInt(ratio)}%`, colX[3]!, yPos)
        yPos += 6
      })
      yPos += 8
    }

    // 3.2 Cash Flow Chart
    if (options.cfoDashboard.cashFlowChart) {
      checkPageBreak(90)

      // Prepare cash flow data
      const cashFlowData: { year: number; values: Record<string, number> }[] = []
      for (let year = 0; year <= data.depreciationYears; year++) {
        const values: Record<string, number> = {}
        data.results.forEach((result) => {
          const capex = result.breakdown.purchaseCost - (result.breakdown.subsidyCredit || 0)
          const annualOpex =
            (result.breakdown.fuelCost +
              result.breakdown.maintenanceCost +
              result.breakdown.taxesCost +
              result.breakdown.insuranceCost) /
            data.depreciationYears

          values[result.fuelType] = year === 0 ? capex : capex + annualOpex * year
        })
        cashFlowData.push({ year, values })
      }

      drawLineChart(
        doc,
        20,
        yPos,
        pageWidth - 40,
        80,
        cashFlowData,
        'Cumulatieve Cashflow Projectie',
        fuelColors
      )
      yPos += 95
    }

    // 3.3 Break-Even Analysis
    if (options.cfoDashboard.breakEvenAnalysis) {
      addSectionHeader('BREAK-EVEN ANALYSE')

      const dieselResult = data.results.find((r) => r.fuelType === 'diesel')
      if (dieselResult) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        data.results.forEach((result) => {
          if (result.fuelType === 'diesel') return

          checkPageBreak(15)
          const savingsPerYear =
            (dieselResult.totalCost - result.totalCost) / data.depreciationYears
          const extraCapex = result.breakdown.purchaseCost - dieselResult.breakdown.purchaseCost
          const breakEvenYears =
            savingsPerYear > 0 ? (extraCapex / savingsPerYear).toFixed(1) : 'N/A'

          doc.text(`${fuelTypeLabels[result.fuelType]}:`, 17, yPos)
          yPos += 6
          doc.setFontSize(9)
          doc.text(`  Extra CAPEX: ${formatCurrency(extraCapex)}`, 17, yPos)
          yPos += 5
          doc.text(`  Jaarlijkse besparing: ${formatCurrency(savingsPerYear)}`, 17, yPos)
          yPos += 5
          doc.text(`  Break-even periode: ${breakEvenYears} jaar`, 17, yPos)
          doc.setFontSize(10)
          yPos += 7
        })
      } else {
        doc.setFontSize(9)
        doc.text('Diesel referentie niet beschikbaar voor break-even analyse', 17, yPos)
        yPos += 10
      }
    }
  }

  // ============================================================================
  // SECTION 4: COST ANALYSIS
  // ============================================================================
  if (options.costAnalysis.enabled) {
    // 4.1 Comparison Table
    if (options.costAnalysis.comparisonTable) {
      addSectionHeader('VERGELIJKINGSTABEL')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const colX = [17, 70, 110, 150] as const
      doc.text('Brandstof', colX[0]!, yPos)
      doc.text('Totale TCO', colX[1]!, yPos)
      doc.text('Kosten/km', colX[2]!, yPos)
      doc.text('CO2 (ton/jr)', colX[3]!, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      data.results.forEach((result) => {
        checkPageBreak(8)
        doc.text(fuelTypeLabels[result.fuelType] || result.fuelType, colX[0]!, yPos)
        doc.text(formatCurrency(result.totalCost), colX[1]!, yPos)
        doc.text(formatCurrency(result.costPerKm), colX[2]!, yPos)
        doc.text(formatNumber(result.co2Emissions / 1000, 1), colX[3]!, yPos)
        yPos += 6
      })
      yPos += 8
    }

    // 4.2 Comparison Chart (Bar Chart)
    if (options.costAnalysis.comparisonChart) {
      checkPageBreak(70)
      drawBarChart(
        doc,
        20,
        yPos,
        pageWidth - 40,
        60,
        data.results.map((r) => ({
          label: fuelTypeLabels[r.fuelType] || r.fuelType,
          value: r.totalCost,
          color: fuelColors[r.fuelType] || '#000000',
        })),
        'TCO Vergelijking (Totale Kosten)'
      )
      yPos += 75
    }

    // 4.3 Cost Breakdown Chart (Stacked Bar)
    if (options.costAnalysis.costBreakdownChart) {
      checkPageBreak(95)
      drawStackedBarChart(
        doc,
        20,
        yPos,
        pageWidth - 40,
        80,
        data.results.map((r) => ({ fuelType: r.fuelType, breakdown: r.breakdown })),
        'Kostenverdeling per Brandstoftype'
      )
      yPos += 95
    }

    // 4.4 Detailed Breakdown Tables
    if (options.costAnalysis.detailedBreakdown) {
      data.results.forEach((result) => {
        checkPageBreak(70)
        doc.setFillColor(245, 245, 245)
        doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...navyRGB)
        doc.text(
          `KOSTENSPECIFICATIE - ${fuelTypeLabels[result.fuelType] || result.fuelType}`,
          17,
          yPos
        )
        yPos += 10

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const breakdown = result.breakdown
        doc.text(`Aanschafkosten: ${formatCurrency(breakdown.purchaseCost)}`, 17, yPos)
        yPos += 6
        doc.text(`Brandstofkosten: ${formatCurrency(breakdown.fuelCost)}`, 17, yPos)
        yPos += 6
        doc.text(`Onderhoudskosten: ${formatCurrency(breakdown.maintenanceCost)}`, 17, yPos)
        yPos += 6
        doc.text(`Belastingen & Heffingen: ${formatCurrency(breakdown.taxesCost)}`, 17, yPos)
        yPos += 6
        doc.text(`Verzekeringen: ${formatCurrency(breakdown.insuranceCost)}`, 17, yPos)
        yPos += 6
        doc.text(`Rentekosten: ${formatCurrency(breakdown.interestCost)}`, 17, yPos)
        yPos += 6
        if (breakdown.subsidyCredit > 0) {
          doc.setTextColor(0, 150, 0)
          doc.text(`Subsidie: -${formatCurrency(breakdown.subsidyCredit)}`, 17, yPos)
          doc.setTextColor(...navyRGB)
          yPos += 6
        }
        doc.setFont('helvetica', 'bold')
        doc.text(`TOTAAL: ${formatCurrency(result.totalCost)}`, 17, yPos)
        doc.setFont('helvetica', 'normal')
        yPos += 12
      })
    }
  }

  // ============================================================================
  // SECTION 5: TIMELINE & PROJECTION
  // ============================================================================
  if (options.timeline.enabled) {
    // 5.1 Annual Costs Table
    if (options.timeline.annualCosts) {
      addSectionHeader('JAARLIJKSE KOSTEN')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Brandstoftype', 17, yPos)
      doc.text('Jaarlijkse OPEX', 90, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      data.results.forEach((result) => {
        checkPageBreak(8)
        const annualOpex =
          (result.breakdown.fuelCost +
            result.breakdown.maintenanceCost +
            result.breakdown.taxesCost +
            result.breakdown.insuranceCost +
            result.breakdown.interestCost) /
          data.depreciationYears

        doc.text(fuelTypeLabels[result.fuelType] || result.fuelType, 17, yPos)
        doc.text(formatCurrency(annualOpex), 90, yPos)
        yPos += 6
      })
      yPos += 8
    }

    // 5.2 Cumulative Cash Flow
    if (options.timeline.cumulativeCashFlow) {
      checkPageBreak(90)

      const cashFlowData: { year: number; values: Record<string, number> }[] = []
      for (let year = 0; year <= data.depreciationYears; year++) {
        const values: Record<string, number> = {}
        data.results.forEach((result) => {
          const purchaseCost = result.breakdown.purchaseCost
          const annualOpex =
            (result.breakdown.fuelCost +
              result.breakdown.maintenanceCost +
              result.breakdown.taxesCost +
              result.breakdown.insuranceCost) /
            data.depreciationYears

          values[result.fuelType] = year === 0 ? purchaseCost : purchaseCost + annualOpex * year
        })
        cashFlowData.push({ year, values })
      }

      drawLineChart(
        doc,
        20,
        yPos,
        pageWidth - 40,
        80,
        cashFlowData,
        'Cumulatieve Cashflow Projectie',
        fuelColors
      )
      yPos += 95
    }

    // 5.3 Depreciation Schedule
    if (options.timeline.depreciationSchedule) {
      addSectionHeader('AFSCHRIJVINGSSCHEMA')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Lineaire afschrijving over ${data.depreciationYears} jaar`, 17, yPos)
      yPos += 7

      doc.setFont('helvetica', 'bold')
      doc.text('Jaar', 17, yPos)
      doc.text('Restwaarde', 60, yPos)
      doc.text('Afschrijving', 110, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      const exampleResult = data.results[0]
      if (exampleResult) {
        const purchasePrice = exampleResult.breakdown.purchaseCost
        const annualDepreciation = purchasePrice / data.depreciationYears

        for (let year = 0; year <= data.depreciationYears; year++) {
          checkPageBreak(7)
          const bookValue = purchasePrice - annualDepreciation * year
          doc.text(`${year}`, 17, yPos)
          doc.text(formatCurrency(bookValue), 60, yPos)
          doc.text(formatCurrency(annualDepreciation * year), 110, yPos)
          yPos += 6
        }
      }
      yPos += 8
    }
  }

  // ============================================================================
  // SECTION 6: ENVIRONMENTAL IMPACT
  // ============================================================================
  if (options.environmental.enabled) {
    // 6.1 CO2 Comparison
    if (options.environmental.co2Comparison) {
      addSectionHeader('CO2 VERGELIJKING')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Brandstof', 17, yPos)
      doc.text('CO2 (kg/jaar)', 70, yPos)
      doc.text('CO2 (totaal)', 120, yPos)
      yPos += 5

      doc.setFont('helvetica', 'normal')
      data.results.forEach((result) => {
        checkPageBreak(8)
        const annualCO2 = result.co2Emissions
        const totalCO2 = annualCO2 * data.depreciationYears

        doc.text(fuelTypeLabels[result.fuelType] || result.fuelType, 17, yPos)
        doc.text(formatNumber(annualCO2), 70, yPos)
        doc.text(formatNumber(totalCO2), 120, yPos)
        yPos += 6
      })
      yPos += 8
    }

    // 6.2 Emissions Chart
    if (options.environmental.emissionsChart) {
      checkPageBreak(70)
      drawBarChart(
        doc,
        20,
        yPos,
        pageWidth - 40,
        60,
        data.results.map((r) => ({
          label: fuelTypeLabels[r.fuelType] || r.fuelType,
          value: r.co2Emissions,
          color: fuelColors[r.fuelType] || '#000000',
        })),
        'CO2 Uitstoot Vergelijking (kg/jaar)'
      )
      yPos += 75
    }

    // 6.3 Sustainability Score
    if (options.environmental.sustainabilityScore) {
      addSectionHeader('DUURZAAMHEIDSCORE')

      const minCO2 = Math.min(...data.results.map((r) => r.co2Emissions))
      const maxCO2 = Math.max(...data.results.map((r) => r.co2Emissions))

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      data.results.forEach((result) => {
        checkPageBreak(12)
        // Calculate score (0-100, where 100 is best/lowest CO2)
        const score =
          maxCO2 === minCO2
            ? 100
            : Math.round(((maxCO2 - result.co2Emissions) / (maxCO2 - minCO2)) * 100)

        // Rating
        let rating = ''
        let ratingColor: [number, number, number] = navyRGB
        if (score >= 80) {
          rating = 'Excellent (A+)'
          ratingColor = [16, 185, 129] // green
        } else if (score >= 60) {
          rating = 'Goed (B)'
          ratingColor = [59, 130, 246] // blue
        } else if (score >= 40) {
          rating = 'Gemiddeld (C)'
          ratingColor = [245, 158, 11] // amber
        } else {
          rating = 'Matig (D)'
          ratingColor = [239, 68, 68] // red
        }

        doc.setTextColor(...navyRGB)
        doc.text(`${fuelTypeLabels[result.fuelType]}: `, 17, yPos)
        doc.setTextColor(...ratingColor)
        doc.text(`${score}/100 - ${rating}`, 60, yPos)
        doc.setTextColor(...navyRGB)
        yPos += 7
      })
      yPos += 8
    }
  }

  // ============================================================================
  // SECTION 7: INSIGHTS & RECOMMENDATIONS
  // ============================================================================
  if (options.insights.enabled) {
    // 7.1 Savings Analysis
    if (options.insights.savings) {
      addSectionHeader('BESPARINGSPOTENTIE')

      const minCostResult = data.results.reduce((min, r) => (r.totalCost < min.totalCost ? r : min))
      const dieselResult = data.results.find((r) => r.fuelType === 'diesel')

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Beste keuze: ${fuelTypeLabels[minCostResult.fuelType]} met TCO van ${formatCurrency(minCostResult.totalCost)}`,
        17,
        yPos
      )
      yPos += 8

      if (dieselResult) {
        doc.setFont('helvetica', 'bold')
        doc.text('Besparing t.o.v. Diesel:', 17, yPos)
        yPos += 6
        doc.setFont('helvetica', 'normal')

        data.results.forEach((result) => {
          if (result.fuelType === 'diesel') return
          checkPageBreak(7)

          const savings = dieselResult.totalCost - result.totalCost
          const savingsPercent = ((savings / dieselResult.totalCost) * 100).toFixed(1)

          if (savings > 0) {
            doc.setTextColor(0, 150, 0)
            doc.text(
              `${fuelTypeLabels[result.fuelType]}: ${formatCurrency(savings)} (${savingsPercent}%)`,
              17,
              yPos
            )
          } else {
            doc.setTextColor(239, 68, 68)
            doc.text(
              `${fuelTypeLabels[result.fuelType]}: ${formatCurrency(Math.abs(savings))} hoger (${Math.abs(parseFloat(savingsPercent))}%)`,
              17,
              yPos
            )
          }
          doc.setTextColor(...navyRGB)
          yPos += 6
        })
      }
      yPos += 8
    }

    // 7.2 ROI Calculation
    if (options.insights.roi) {
      addSectionHeader('ROI BEREKENING')

      const dieselResult = data.results.find((r) => r.fuelType === 'diesel')
      if (dieselResult) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')

        data.results.forEach((result) => {
          if (result.fuelType === 'diesel') return
          checkPageBreak(15)

          const extraCapex = result.breakdown.purchaseCost - dieselResult.breakdown.purchaseCost
          const annualSavings = (dieselResult.totalCost - result.totalCost) / data.depreciationYears
          const roi = extraCapex > 0 ? ((annualSavings / extraCapex) * 100).toFixed(1) : 'N/A'
          const paybackYears = annualSavings > 0 ? (extraCapex / annualSavings).toFixed(1) : 'N/A'

          doc.setFont('helvetica', 'bold')
          doc.text(`${fuelTypeLabels[result.fuelType]}:`, 17, yPos)
          yPos += 6
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.text(`  Extra investering: ${formatCurrency(extraCapex)}`, 17, yPos)
          yPos += 5
          doc.text(`  Jaarlijkse besparing: ${formatCurrency(annualSavings)}`, 17, yPos)
          yPos += 5
          doc.text(`  ROI: ${roi}% per jaar`, 17, yPos)
          yPos += 5
          doc.text(`  Terugverdientijd: ${paybackYears} jaar`, 17, yPos)
          doc.setFontSize(10)
          yPos += 7
        })
      } else {
        doc.setFontSize(9)
        doc.text('Diesel referentie niet beschikbaar voor ROI berekening', 17, yPos)
        yPos += 10
      }
    }

    // 7.3 Risk Factors
    if (options.insights.riskFactors) {
      addSectionHeader('RISICOFACTOREN & OVERWEGINGEN')

      const riskFactors: Record<string, string[]> = {
        diesel: [
          'Stijgende brandstofprijzen',
          'Toenemende milieuheffingen',
          'Mogelijke toegangsbeperkingen milieuzones',
        ],
        bev: [
          'Laadinfrastructuur afhankelijkheid',
          'Beperkte actieradius vs diesel',
          'Batterijvervanging na 8-10 jaar',
        ],
        fcev: [
          'Beperkte waterstoftankstations',
          'Volatiele waterstofprijzen',
          'Nieuwe technologie - minder track record',
        ],
        h2ice: [
          'Zeer beperkte waterstofinfrastructuur',
          'Experimentele technologie',
          'Onduidelijke lange termijn beschikbaarheid',
        ],
      }

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      data.results.forEach((result) => {
        checkPageBreak(20)
        doc.setFont('helvetica', 'bold')
        doc.text(`${fuelTypeLabels[result.fuelType]}:`, 17, yPos)
        yPos += 6

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const risks = riskFactors[result.fuelType] || []
        risks.forEach((risk) => {
          checkPageBreak(6)
          doc.text(`  • ${risk}`, 17, yPos)
          yPos += 5
        })
        doc.setFontSize(10)
        yPos += 5
      })
    }
  }

  // ============================================================================
  // FOOTER ON ALL PAGES
  // ============================================================================
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} | SCEX Software Optimization`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
    doc.text(`Pagina ${i} van ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' })
  }

  // Save the PDF
  const fileName = `TCO_Analyse_${data.vehicleType.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
}

/**
 * Export TCO analysis to Excel with comprehensive sections
 */
export function exportToExcel(data: ExportData, options: ExportOptions) {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Overview & KPIs
  if (options.executiveSummary.enabled || options.costAnalysis.enabled) {
    const overviewData: unknown[][] = []

    // Header
    overviewData.push(['TCO ANALYSE RAPPORT'])
    overviewData.push(['SCEX Software Optimization'])
    overviewData.push([])
    overviewData.push(['Voertuig:', data.vehicleType])
    overviewData.push(['Rijgebied:', data.drivingArea])
    overviewData.push(['Afschrijvingsperiode:', `${data.depreciationYears} jaar`])
    overviewData.push([])

    if (options.executiveSummary.enabled && options.executiveSummary.keyFindings) {
      const minCost = Math.min(...data.results.map((r) => r.totalCost))
      const avgCost = data.results.reduce((sum, r) => sum + r.totalCost, 0) / data.results.length
      const minCO2 = Math.min(...data.results.map((r) => r.co2Emissions))
      const maxCost = Math.max(...data.results.map((r) => r.totalCost))

      overviewData.push(['KERNGEGEVENS'])
      overviewData.push(['Laagste TCO:', minCost])
      overviewData.push(['Gemiddelde TCO:', avgCost])
      overviewData.push(['Laagste CO2 (kg/jaar):', minCO2])
      overviewData.push(['Kostenspreiding:', maxCost - minCost])
      overviewData.push([])
    }

    if (options.costAnalysis.enabled && options.costAnalysis.comparisonTable) {
      overviewData.push(['VERGELIJKING'])
      overviewData.push(['Brandstoftype', 'Totale TCO', 'Kosten/km', 'CO2 (kg/jaar)'])
      data.results.forEach((result) => {
        overviewData.push([
          fuelTypeLabels[result.fuelType] || result.fuelType,
          result.totalCost,
          result.costPerKm,
          result.co2Emissions,
        ])
      })
    }

    const ws = XLSX.utils.aoa_to_sheet(overviewData)
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, ws, 'Overzicht')
  }

  // Sheet 2: Parameters (if enabled)
  if (options.specifications.enabled && options.specifications.parameters && data.parametersData) {
    const paramsData: unknown[][] = []
    paramsData.push(['BEREKENINGSPARAMETERS'])
    paramsData.push([])

    const params = data.parametersData
    paramsData.push(['VOERTUIGGEGEVENS'])
    paramsData.push(['Aanschafprijs:', params.purchasePrice])
    if (params.gvw) paramsData.push(['GVW (kg):', params.gvw])
    if (params.payload) paramsData.push(['Laadvermogen (kg):', params.payload])
    paramsData.push([])

    paramsData.push(['VERBRUIKSGEGEVENS'])
    paramsData.push(['Kilometers per jaar:', params.kmPerYear])
    paramsData.push(['Brandstoftype:', fuelTypeLabels[params.fuelType] || params.fuelType])
    paramsData.push(['Verbruik:', params.consumption])
    paramsData.push([])

    paramsData.push(['BELASTINGEN & HEFFINGEN'])
    paramsData.push(['Motorrijtuigenbelasting (jaar):', params.motorTax || 0])
    paramsData.push(['Tol & kilometerheffing (jaar):', params.truckToll || 0])
    paramsData.push([])

    paramsData.push(['SUBSIDIES'])
    paramsData.push(['Subsidie:', params.subsidy || 0])
    paramsData.push([])

    paramsData.push(['FINANCIËLE PARAMETERS'])
    paramsData.push(['Rentepercentage (%):', (params.interestRate || 0) * 100])
    paramsData.push([
      'Afschrijvingsperiode (jaar):',
      params.depreciationYears || data.depreciationYears,
    ])
    paramsData.push([])

    paramsData.push(['EXTRA KOSTEN'])
    paramsData.push(['Onderhoudskosten per km:', params.maintenanceCostPerKm || 0])
    paramsData.push(['Verzekering (% aanschafprijs):', (params.insurancePercentage || 0) * 100])

    const ws = XLSX.utils.aoa_to_sheet(paramsData)
    ws['!cols'] = [{ wch: 35 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, ws, 'Parameters')
  }

  // Sheet 3: Detailed Breakdown
  if (options.costAnalysis.enabled && options.costAnalysis.detailedBreakdown) {
    const breakdownData: unknown[][] = []
    breakdownData.push(['GEDETAILLEERDE KOSTENSPECIFICATIE'])
    breakdownData.push([])

    data.results.forEach((result) => {
      breakdownData.push([fuelTypeLabels[result.fuelType] || result.fuelType])
      breakdownData.push(['Kostenpost', 'Bedrag'])
      breakdownData.push(['Aanschafkosten', result.breakdown.purchaseCost])
      breakdownData.push(['Brandstofkosten', result.breakdown.fuelCost])
      breakdownData.push(['Onderhoudskosten', result.breakdown.maintenanceCost])
      breakdownData.push(['Belastingen & Heffingen', result.breakdown.taxesCost])
      breakdownData.push(['Verzekeringen', result.breakdown.insuranceCost])
      breakdownData.push(['Rentekosten', result.breakdown.interestCost])
      if (result.breakdown.subsidyCredit > 0) {
        breakdownData.push(['Subsidie', -result.breakdown.subsidyCredit])
      }
      breakdownData.push(['TOTAAL', result.totalCost])
      breakdownData.push([])
      breakdownData.push(['Kosten per kilometer', result.costPerKm])
      breakdownData.push(['CO2-uitstoot (kg/jaar)', result.co2Emissions])
      breakdownData.push([])
    })

    const ws = XLSX.utils.aoa_to_sheet(breakdownData)
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, ws, 'Kostenspecificatie')
  }

  // Sheet 4: CAPEX vs OPEX (CFO Dashboard)
  if (options.cfoDashboard.enabled && options.cfoDashboard.capexOpex) {
    const capexOpexData: unknown[][] = []
    capexOpexData.push(['CAPEX vs OPEX ANALYSE'])
    capexOpexData.push([])
    capexOpexData.push(['Brandstoftype', 'CAPEX', 'OPEX per jaar', 'CAPEX %', 'OPEX %'])

    data.results.forEach((result) => {
      const capex = result.breakdown.purchaseCost - (result.breakdown.subsidyCredit || 0)
      const annualOpex =
        (result.breakdown.fuelCost +
          result.breakdown.maintenanceCost +
          result.breakdown.taxesCost +
          result.breakdown.insuranceCost) /
        data.depreciationYears

      const total = capex + annualOpex * data.depreciationYears
      const capexPercent = ((capex / total) * 100).toFixed(1)
      const opexPercent = (((annualOpex * data.depreciationYears) / total) * 100).toFixed(1)

      capexOpexData.push([
        fuelTypeLabels[result.fuelType] || result.fuelType,
        capex,
        annualOpex,
        parseFloat(capexPercent),
        parseFloat(opexPercent),
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(capexOpexData)
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, ws, 'CAPEX vs OPEX')
  }

  // Sheet 5: Timeline (Annual costs)
  if (options.timeline.enabled && options.timeline.annualCosts) {
    const timelineData: unknown[][] = []
    timelineData.push(['JAARLIJKSE KOSTENVERLOOP'])
    timelineData.push([])

    // Headers
    const headers = ['Jaar', ...data.results.map((r) => fuelTypeLabels[r.fuelType] || r.fuelType)]
    timelineData.push(headers)

    // Annual costs
    for (let year = 1; year <= data.depreciationYears; year++) {
      const row = [
        year,
        ...data.results.map((r) => {
          const annualOpex =
            (r.breakdown.fuelCost +
              r.breakdown.maintenanceCost +
              r.breakdown.taxesCost +
              r.breakdown.insuranceCost +
              r.breakdown.interestCost) /
            data.depreciationYears
          return annualOpex
        }),
      ]
      timelineData.push(row)
    }

    const ws = XLSX.utils.aoa_to_sheet(timelineData)
    ws['!cols'] = [{ wch: 10 }, ...data.results.map(() => ({ wch: 20 }))]
    XLSX.utils.book_append_sheet(workbook, ws, 'Jaarlijkse kosten')
  }

  // Sheet 6: Environmental Impact
  if (options.environmental.enabled && options.environmental.co2Comparison) {
    const envData: unknown[][] = []
    envData.push(['CO2 VERGELIJKING'])
    envData.push([])
    envData.push(['Brandstoftype', 'CO2 per jaar (kg)', 'CO2 totaal (kg)', 'Duurzaamheidscore'])

    const minCO2 = Math.min(...data.results.map((r) => r.co2Emissions))
    const maxCO2 = Math.max(...data.results.map((r) => r.co2Emissions))

    data.results.forEach((result) => {
      const annualCO2 = result.co2Emissions
      const totalCO2 = annualCO2 * data.depreciationYears
      const score =
        maxCO2 === minCO2
          ? 100
          : Math.round(((maxCO2 - result.co2Emissions) / (maxCO2 - minCO2)) * 100)

      envData.push([
        fuelTypeLabels[result.fuelType] || result.fuelType,
        annualCO2,
        totalCO2,
        `${score}/100`,
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(envData)
    ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
    XLSX.utils.book_append_sheet(workbook, ws, 'Milieuimpact')
  }

  // Sheet 7: ROI & Savings
  if (options.insights.enabled && (options.insights.roi || options.insights.savings)) {
    const roiData: unknown[][] = []
    roiData.push(['ROI & BESPARINGEN'])
    roiData.push([])

    const dieselResult = data.results.find((r) => r.fuelType === 'diesel')
    if (dieselResult) {
      roiData.push([
        'Brandstoftype',
        'Extra CAPEX',
        'Jaarlijkse besparing',
        'ROI (%)',
        'Terugverdientijd (jaar)',
      ])

      data.results.forEach((result) => {
        if (result.fuelType === 'diesel') {
          roiData.push([fuelTypeLabels[result.fuelType], 0, 0, 'Baseline', 'Baseline'])
        } else {
          const extraCapex = result.breakdown.purchaseCost - dieselResult.breakdown.purchaseCost
          const annualSavings = (dieselResult.totalCost - result.totalCost) / data.depreciationYears
          const roi = extraCapex > 0 ? ((annualSavings / extraCapex) * 100).toFixed(1) : 'N/A'
          const payback = annualSavings > 0 ? (extraCapex / annualSavings).toFixed(1) : 'N/A'

          roiData.push([
            fuelTypeLabels[result.fuelType] || result.fuelType,
            extraCapex,
            annualSavings,
            roi,
            payback,
          ])
        }
      })
    }

    const ws = XLSX.utils.aoa_to_sheet(roiData)
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, ws, 'ROI Analyse')
  }

  // Save the Excel file
  const fileName = `TCO_Analyse_${data.vehicleType.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
