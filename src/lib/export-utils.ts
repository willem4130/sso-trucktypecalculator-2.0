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

interface ExportOptions {
  kpis: boolean
  comparison: boolean
  breakdown: boolean
  timeline: boolean
  detailed: boolean
  insights: boolean
}

interface ExportData {
  vehicleType: string
  drivingArea: string
  depreciationYears: number
  results: ResultData[]
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
 * Export TCO analysis to PDF
 */
export function exportToPDF(data: ExportData, options: ExportOptions) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPos = 20

  // SCEX Brand Colors
  const orangeRGB = [242, 145, 0] as [number, number, number]
  const navyRGB = [8, 25, 44] as [number, number, number]

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - 20) {
      doc.addPage()
      yPos = 20
    }
  }

  // Header with branding
  doc.setFillColor(...orangeRGB)
  doc.rect(0, 0, pageWidth, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('TCO ANALYSE RAPPORT', 15, 15)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('SCEX Software Optimization', pageWidth - 15, 15, { align: 'right' })

  // Reset text color
  doc.setTextColor(...navyRGB)
  yPos = 35

  // Vehicle and Area Info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Voertuig: ${data.vehicleType}`, 15, yPos)
  yPos += 7
  doc.text(`Rijgebied: ${data.drivingArea}`, 15, yPos)
  yPos += 7
  doc.text(`Afschrijvingsperiode: ${data.depreciationYears} jaar`, 15, yPos)
  yPos += 12

  // KPIs Section
  if (options.kpis) {
    checkPageBreak(40)
    doc.setFillColor(245, 245, 245)
    doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('KERNGEGEVENS', 17, yPos)
    yPos += 10

    const minCost = Math.min(...data.results.map((r) => r.totalCost))
    const avgCost = data.results.reduce((sum, r) => sum + r.totalCost, 0) / data.results.length
    const minCO2 = Math.min(...data.results.map((r) => r.co2Emissions))
    const maxCost = Math.max(...data.results.map((r) => r.totalCost))

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Laagste TCO: ${formatCurrency(minCost)}`, 17, yPos)
    yPos += 6
    doc.text(`Gemiddelde TCO: ${formatCurrency(avgCost)}`, 17, yPos)
    yPos += 6
    doc.text(`Laagste CO2: ${formatNumber(minCO2 / 1000, 1)} ton/jaar`, 17, yPos)
    yPos += 6
    doc.text(`Kostenspreiding: ${formatCurrency(maxCost - minCost)}`, 17, yPos)
    yPos += 12
  }

  // Comparison Table
  if (options.comparison) {
    checkPageBreak(60)
    doc.setFillColor(245, 245, 245)
    doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('VERGELIJKINGSTABEL', 17, yPos)
    yPos += 10

    // Table headers
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    const colX = [17, 70, 110, 150] as const
    doc.text('Brandstof', colX[0]!, yPos)
    doc.text('Totale TCO', colX[1]!, yPos)
    doc.text('Kosten/km', colX[2]!, yPos)
    doc.text('CO2 (ton/jr)', colX[3]!, yPos)
    yPos += 5

    // Table rows
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

  // Cost Breakdown
  if (options.breakdown) {
    data.results.forEach((result) => {
      checkPageBreak(70)
      doc.setFillColor(245, 245, 245)
      doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
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

  // Insights Section
  if (options.insights) {
    checkPageBreak(40)
    doc.setFillColor(245, 245, 245)
    doc.rect(15, yPos - 5, pageWidth - 30, 8, 'F')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('INZICHTEN & AANBEVELINGEN', 17, yPos)
    yPos += 10

    const minCostResult = data.results.reduce((min, r) => (r.totalCost < min.totalCost ? r : min))
    const dieselResult = data.results.find((r) => r.fuelType === 'diesel')

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `• ${fuelTypeLabels[minCostResult.fuelType]} heeft de laagste totale eigendomskosten`,
      17,
      yPos
    )
    yPos += 6

    if (dieselResult && minCostResult.fuelType !== 'diesel') {
      const savings = dieselResult.totalCost - minCostResult.totalCost
      const savingsPercent = ((savings / dieselResult.totalCost) * 100).toFixed(1)
      doc.text(
        `• Besparing t.o.v. Diesel: ${formatCurrency(savings)} (${savingsPercent}%)`,
        17,
        yPos
      )
      yPos += 6
    }

    const minCO2Result = data.results.reduce((min, r) =>
      r.co2Emissions < min.co2Emissions ? r : min
    )
    doc.text(`• ${fuelTypeLabels[minCO2Result.fuelType]} heeft de laagste CO2-uitstoot`, 17, yPos)
    yPos += 12
  }

  // Footer
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
 * Export TCO analysis to Excel
 */
export function exportToExcel(data: ExportData, options: ExportOptions) {
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Overview
  if (options.kpis || options.comparison) {
    const overviewData: unknown[][] = []

    // Header
    overviewData.push(['TCO ANALYSE RAPPORT'])
    overviewData.push(['SCEX Software Optimization'])
    overviewData.push([])
    overviewData.push(['Voertuig:', data.vehicleType])
    overviewData.push(['Rijgebied:', data.drivingArea])
    overviewData.push(['Afschrijvingsperiode:', `${data.depreciationYears} jaar`])
    overviewData.push([])

    if (options.kpis) {
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

    if (options.comparison) {
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

    // Set column widths
    ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }]

    XLSX.utils.book_append_sheet(workbook, ws, 'Overzicht')
  }

  // Sheet 2: Detailed Breakdown
  if (options.breakdown || options.detailed) {
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

  // Sheet 3: Timeline (Annual costs)
  if (options.timeline) {
    const timelineData: unknown[][] = []
    timelineData.push(['JAARLIJKSE KOSTENVERLOOP'])
    timelineData.push([])

    // Headers
    const headers = ['Jaar', ...data.results.map((r) => fuelTypeLabels[r.fuelType] || r.fuelType)]
    timelineData.push(headers)

    // Annual costs (simplified - assuming even distribution)
    for (let year = 1; year <= data.depreciationYears; year++) {
      const row = [
        year,
        ...data.results.map((r) => r.breakdown.totalOperatingCost / data.depreciationYears),
      ]
      timelineData.push(row)
    }

    const ws = XLSX.utils.aoa_to_sheet(timelineData)
    ws['!cols'] = [{ wch: 10 }, ...data.results.map(() => ({ wch: 20 }))]
    XLSX.utils.book_append_sheet(workbook, ws, 'Jaarlijkse kosten')
  }

  // Save the Excel file
  const fileName = `TCO_Analyse_${data.vehicleType.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
