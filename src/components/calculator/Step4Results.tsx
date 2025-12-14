'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  TrendingDown,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Leaf,
  FileSpreadsheet,
  Filter,
  Eye,
  EyeOff,
  X,
} from 'lucide-react'
import { exportToPDF, exportToExcel } from '@/lib/export-utils'
import CountUp from 'react-countup'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { CalculationSession, VehicleType, DrivingArea } from '@prisma/client'

interface Step4Props {
  session: CalculationSession & {
    vehicleType: VehicleType | null
    drivingArea: DrivingArea | null
  }
}

const fuelTypeColors = {
  diesel: '#6366f1', // indigo
  bev: '#10b981', // green
  fcev: '#06b6d4', // cyan
  h2ice: '#a855f7', // purple
}

const fuelTypeLabels = {
  diesel: 'Diesel',
  bev: 'BEV',
  fcev: 'FCEV',
  h2ice: 'H2ICE',
}

type FuelType = keyof typeof fuelTypeColors
type SortField = 'totalCost' | 'costPerKm' | 'co2Emissions' | 'fuelCost' | 'none'
type SortDirection = 'asc' | 'desc'
type ViewMode = 'overzicht' | 'analyse' | 'expert'
type BreakdownChartType = 'stacked' | 'grouped' | 'horizontal' | 'percentage'
type TimelineChartType = 'line' | 'area' | 'bar'

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

// Cost category colors (muted professional palette)
const COST_COLORS = {
  purchaseCost: '#3b82f6',
  fuelCost: '#f29100',
  maintenanceCost: '#10b981',
  taxesCost: '#ef4444',
  insuranceCost: '#8b5cf6',
  interestCost: '#f59e0b',
}

export function Step4Results({ session }: Step4Props) {
  const [sortField, setSortField] = useState<SortField>('totalCost')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<ViewMode>('analyse')
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<FuelType[]>([
    'diesel',
    'bev',
    'fcev',
    'h2ice',
  ])
  const [breakdownChartType, setBreakdownChartType] = useState<BreakdownChartType>('stacked')
  const [timelineChartType, setTimelineChartType] = useState<TimelineChartType>('line')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    kpis: true,
    comparison: true,
    breakdown: true,
    timeline: true,
    detailed: true,
    insights: true,
  })

  // Currency formatter helper
  const formatCurrency = (value: number) =>
    `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`

  const results = session.resultsData as Record<string, ResultData> | null

  if (!results) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Geen resultaten beschikbaar
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Ga terug naar de parameters en bereken de TCO.
          </p>
        </div>
      </div>
    )
  }

  // Convert results to array and filter by selected fuel types
  const resultsArray = Object.values(results).filter((r) =>
    selectedFuelTypes.includes(r.fuelType as FuelType)
  )

  // Sort results
  const sortedResults = [...resultsArray].sort((a, b) => {
    if (sortField === 'none') return 0

    let aValue: number
    let bValue: number

    if (sortField === 'fuelCost') {
      aValue = a.breakdown.fuelCost
      bValue = b.breakdown.fuelCost
    } else {
      aValue = a[sortField]
      bValue = b[sortField]
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
  })

  // Find min/max values for comparison
  const minCost = Math.min(...resultsArray.map((r) => r.totalCost))
  const maxCost = Math.max(...resultsArray.map((r) => r.totalCost))
  const minCO2 = Math.min(...resultsArray.map((r) => r.co2Emissions))
  const dieselResult = resultsArray.find((r) => r.fuelType === 'diesel')

  // Get depreciation years from parameters
  const depreciationYears =
    session.parametersData && typeof session.parametersData === 'object'
      ? ((session.parametersData as Record<string, unknown>).depreciationYears as number) || 7
      : 7

  // Calculate annual costs for line chart
  const annualData = Array.from({ length: depreciationYears + 1 }, (_, year) => {
    const dataPoint: Record<string, number | string> = { year }
    resultsArray.forEach((result) => {
      dataPoint[fuelTypeLabels[result.fuelType as FuelType]] = Math.round(
        (result.totalCost / depreciationYears) * year
      )
    })
    return dataPoint
  })

  // Prepare stacked bar chart data
  const stackedData = resultsArray.map((result) => ({
    name: fuelTypeLabels[result.fuelType as FuelType],
    Aanschaf: result.breakdown.purchaseCost,
    Brandstof: result.breakdown.fuelCost,
    Onderhoud: result.breakdown.maintenanceCost,
    Belastingen: result.breakdown.taxesCost,
    Verzekering: result.breakdown.insuranceCost,
    Rente: result.breakdown.interestCost,
  }))

  // Prepare radar chart data (for expert mode)
  const radarData = [
    {
      metric: 'TCO',
      ...Object.fromEntries(
        resultsArray.map((r) => [
          fuelTypeLabels[r.fuelType as FuelType],
          Math.round((r.totalCost / maxCost) * 100),
        ])
      ),
    },
    {
      metric: 'CO2',
      ...Object.fromEntries(
        resultsArray.map((r) => [
          fuelTypeLabels[r.fuelType as FuelType],
          Math.round(
            ((Math.max(...resultsArray.map((x) => x.co2Emissions)) - r.co2Emissions) /
              Math.max(...resultsArray.map((x) => x.co2Emissions))) *
              100
          ),
        ])
      ),
    },
    {
      metric: 'Brandstof',
      ...Object.fromEntries(
        resultsArray.map((r) => [
          fuelTypeLabels[r.fuelType as FuelType],
          Math.round(
            (r.breakdown.fuelCost / Math.max(...resultsArray.map((x) => x.breakdown.fuelCost))) *
              100
          ),
        ])
      ),
    },
    {
      metric: 'Onderhoud',
      ...Object.fromEntries(
        resultsArray.map((r) => [
          fuelTypeLabels[r.fuelType as FuelType],
          Math.round(
            (r.breakdown.maintenanceCost /
              Math.max(...resultsArray.map((x) => x.breakdown.maintenanceCost))) *
              100
          ),
        ])
      ),
    },
  ]

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortField('none')
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get sort indicator
  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 inline h-3 w-3 text-orange-500" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3 text-orange-500" />
    )
  }

  // Toggle fuel type filter
  const toggleFuelType = (fuelType: FuelType) => {
    setSelectedFuelTypes((prev) => {
      if (prev.includes(fuelType)) {
        // Don't allow deselecting the last one
        if (prev.length === 1) return prev
        return prev.filter((ft) => ft !== fuelType)
      }
      return [...prev, fuelType]
    })
  }

  // Export to PDF
  const handleExportPDF = () => {
    setShowExportDialog(true)
  }

  // Export to Excel
  const handleExportExcel = () => {
    setShowExportDialog(true)
  }

  // Confirm export
  const confirmExport = (format: 'pdf' | 'excel') => {
    // Prepare export data
    const exportData = {
      vehicleType: session.vehicleType?.name || 'Onbekend voertuig',
      drivingArea: session.drivingArea?.name || 'Onbekend gebied',
      depreciationYears,
      results: resultsArray,
    }

    // Call the appropriate export function
    try {
      if (format === 'pdf') {
        exportToPDF(exportData, exportOptions)
      } else {
        exportToExcel(exportData, exportOptions)
      }
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export is mislukt. Probeer het opnieuw.')
    }

    setShowExportDialog(false)
  }

  return (
    <div className="space-y-6">
      {/* Header with View Mode Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">TCO ANALYSE</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Vergelijking over {depreciationYears} jaar voor{' '}
            {session.vehicleType?.name || 'geselecteerd voertuig'} -{' '}
            {session.drivingArea?.name || 'geselecteerd gebied'}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
          <button
            onClick={() => setViewMode('overzicht')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
              viewMode === 'overzicht'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            )}
          >
            Overzicht
          </button>
          <button
            onClick={() => setViewMode('analyse')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
              viewMode === 'analyse'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            )}
          >
            Analyse
          </button>
          <button
            onClick={() => setViewMode('expert')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors',
              viewMode === 'expert'
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
            )}
          >
            Expert
          </button>
        </div>
      </div>

      {/* Fuel Type Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Filter Brandstoftypen:
            </span>
          </div>
          {Object.entries(fuelTypeLabels).map(([key, label]) => {
            const fuelType = key as FuelType
            const isSelected = selectedFuelTypes.includes(fuelType)
            return (
              <button
                key={key}
                onClick={() => toggleFuelType(fuelType)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all',
                  isSelected
                    ? 'border-transparent shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800'
                )}
                style={
                  isSelected
                    ? {
                        backgroundColor: `${fuelTypeColors[fuelType]}20`,
                        borderColor: fuelTypeColors[fuelType],
                        color: fuelTypeColors[fuelType],
                      }
                    : undefined
                }
              >
                {isSelected ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {label}
              </button>
            )
          })}
          <span className="text-xs text-gray-500">
            ({selectedFuelTypes.length}/{Object.keys(fuelTypeLabels).length} geselecteerd)
          </span>
        </div>
      </Card>

      {/* Top KPI Cards - Always Visible */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Lowest TCO */}
        <Card className="border-green-200 bg-green-50/50 p-4 dark:border-green-800 dark:bg-green-950/20">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Laagste TCO
            </h3>
            <Badge className="bg-green-500 text-white">Beste</Badge>
          </div>
          <div className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            €
            <CountUp end={minCost} duration={1.5} separator="." decimals={0} preserveValue={true} />
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {
              fuelTypeLabels[
                resultsArray.find((r) => r.totalCost === minCost)?.fuelType as FuelType
              ]
            }
          </div>
        </Card>

        {/* Average Annual Cost */}
        <Card className="p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Gem. Jaarkosten
          </h3>
          <div className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            €
            <CountUp
              end={minCost / depreciationYears}
              duration={1.5}
              separator="."
              decimals={0}
              preserveValue={true}
            />
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">Per jaar</div>
        </Card>

        {/* CO2 Impact */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              CO2 Impact
            </h3>
            <Leaf className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            <CountUp
              end={minCO2}
              duration={1.5}
              separator="."
              decimals={0}
              suffix=" kg"
              preserveValue={true}
            />
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">Laagste uitstoot</div>
        </Card>

        {/* Cost Spread */}
        <Card className="p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Kostenverschil
          </h3>
          <div className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            €
            <CountUp
              end={maxCost - minCost}
              duration={1.5}
              separator="."
              decimals={0}
              preserveValue={true}
            />
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">Max vs min verschil</div>
        </Card>
      </div>

      {/* OVERZICHT MODE: Simple comparison */}
      {viewMode === 'overzicht' && (
        <div className="space-y-6">
          {/* Comparison Table */}
          <Card className="overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Kostenvergelijking
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <tr>
                    <th className="p-3 text-left">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Brandstof
                      </span>
                    </th>
                    <th
                      className="cursor-pointer p-3 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleSort('totalCost')}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Totale TCO {getSortIndicator('totalCost')}
                      </span>
                    </th>
                    <th
                      className="cursor-pointer p-3 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleSort('costPerKm')}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Kosten/km {getSortIndicator('costPerKm')}
                      </span>
                    </th>
                    <th
                      className="cursor-pointer p-3 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleSort('co2Emissions')}
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        CO2 (kg) {getSortIndicator('co2Emissions')}
                      </span>
                    </th>
                    <th className="p-3 text-right">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Status
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((result, index) => {
                    const isLowest = result.totalCost === minCost

                    return (
                      <motion.tr
                        key={result.fuelType}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          'border-b border-gray-200 transition-colors dark:border-gray-700',
                          isLowest
                            ? 'bg-green-50/50 dark:bg-green-950/10'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{
                                backgroundColor: fuelTypeColors[result.fuelType as FuelType],
                              }}
                            />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {fuelTypeLabels[result.fuelType as FuelType]}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                          €{result.totalCost.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                          €{result.costPerKm.toFixed(2)}
                        </td>
                        <td className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100">
                          {result.co2Emissions.toLocaleString('nl-NL', {
                            maximumFractionDigits: 0,
                          })}
                        </td>
                        <td className="p-3 text-right">
                          {isLowest && <Badge className="bg-green-500 text-white">Laagste</Badge>}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
                  <tr>
                    <td colSpan={5} className="p-3 text-xs text-gray-600 dark:text-gray-400">
                      {resultsArray.length} brandstoftypen vergeleken
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ANALYSE MODE: Full dashboard (default) */}
      {viewMode === 'analyse' && (
        <div className="space-y-6">
          {/* Main Dashboard Grid */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Comparison Table */}
            <div className="lg:col-span-7">
              <Card className="overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Kostenvergelijking
                  </h3>
                </div>
                <div>
                  <table className="w-full table-fixed">
                    <thead className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                      <tr>
                        <th className="w-[15%] px-2 py-2 text-left">
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Brandstof
                          </span>
                        </th>
                        <th
                          className="w-[18%] cursor-pointer px-2 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('totalCost')}
                        >
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Totale TCO {getSortIndicator('totalCost')}
                          </span>
                        </th>
                        <th
                          className="hidden w-[13%] cursor-pointer px-2 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 md:table-cell"
                          onClick={() => handleSort('costPerKm')}
                        >
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            €/km {getSortIndicator('costPerKm')}
                          </span>
                        </th>
                        <th
                          className="w-[20%] cursor-pointer px-2 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('fuelCost')}
                        >
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Brandstof {getSortIndicator('fuelCost')}
                          </span>
                        </th>
                        <th
                          className="hidden w-[14%] cursor-pointer px-2 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 xl:table-cell"
                          onClick={() => handleSort('co2Emissions')}
                        >
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            CO2 {getSortIndicator('co2Emissions')}
                          </span>
                        </th>
                        <th className="w-[20%] px-2 py-2 text-right">
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Status
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults.map((result, index) => {
                        const isLowest = result.totalCost === minCost
                        const difference = result.totalCost - minCost

                        return (
                          <motion.tr
                            key={result.fuelType}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              'border-b border-gray-200 transition-colors dark:border-gray-700',
                              isLowest
                                ? 'bg-green-50/50 dark:bg-green-950/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            )}
                          >
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="h-2.5 w-2.5 flex-shrink-0 rounded"
                                  style={{
                                    backgroundColor: fuelTypeColors[result.fuelType as FuelType],
                                  }}
                                />
                                <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {fuelTypeLabels[result.fuelType as FuelType]}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-right text-sm tabular-nums text-gray-900 dark:text-gray-100">
                              €
                              {result.totalCost.toLocaleString('nl-NL', {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="hidden px-2 py-2 text-right text-sm tabular-nums text-gray-900 dark:text-gray-100 md:table-cell">
                              €{result.costPerKm.toFixed(2)}
                            </td>
                            <td className="px-2 py-2 text-right text-sm tabular-nums text-gray-900 dark:text-gray-100">
                              €
                              {result.breakdown.fuelCost.toLocaleString('nl-NL', {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="hidden px-2 py-2 text-right text-sm tabular-nums text-gray-900 dark:text-gray-100 xl:table-cell">
                              {result.co2Emissions.toLocaleString('nl-NL', {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {isLowest ? (
                                <Badge className="bg-green-500 text-xs text-white">Laagste</Badge>
                              ) : difference > 0 ? (
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  +€
                                  {(difference / 1000).toFixed(0)}k
                                </span>
                              ) : null}
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
                      <tr>
                        <td
                          colSpan={6}
                          className="px-2 py-2 text-xs text-gray-600 dark:text-gray-400"
                        >
                          {resultsArray.length} brandstoftypen vergeleken
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </div>

            {/* Right: Key Insights */}
            <div className="space-y-6 lg:col-span-5">
              {/* Savings vs Diesel */}
              {dieselResult && (
                <Card className="p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Besparing vs Diesel
                  </h3>
                  <div className="space-y-3">
                    {resultsArray
                      .filter((r) => r.fuelType !== 'diesel')
                      .map((result) => {
                        const savings = dieselResult.totalCost - result.totalCost
                        const savingsPercent =
                          ((dieselResult.totalCost - result.totalCost) / dieselResult.totalCost) *
                          100
                        const isSaving = savings > 0

                        return (
                          <div key={result.fuelType} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded"
                                style={{
                                  backgroundColor: fuelTypeColors[result.fuelType as FuelType],
                                }}
                              />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {fuelTypeLabels[result.fuelType as FuelType]}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSaving ? (
                                <>
                                  <TrendingDown className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-semibold tabular-nums text-green-600">
                                    -€
                                    {savings.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({savingsPercent.toFixed(0)}%)
                                  </span>
                                </>
                              ) : (
                                <>
                                  <TrendingUp className="h-4 w-4 text-red-600" />
                                  <span className="text-sm font-semibold tabular-nums text-red-600">
                                    +€
                                    {Math.abs(savings).toLocaleString('nl-NL', {
                                      maximumFractionDigits: 0,
                                    })}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({Math.abs(savingsPercent).toFixed(0)}%)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </Card>
              )}

              {/* Environmental Impact */}
              <Card className="p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Milieu-impact
                </h3>
                <div className="space-y-3">
                  {sortedResults
                    .sort((a, b) => a.co2Emissions - b.co2Emissions)
                    .map((result) => {
                      const maxCO2 = Math.max(...resultsArray.map((r) => r.co2Emissions))
                      const co2Percentage = (result.co2Emissions / maxCO2) * 100

                      return (
                        <div key={result.fuelType} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {fuelTypeLabels[result.fuelType as FuelType]}
                            </span>
                            <span className="tabular-nums text-gray-600 dark:text-gray-400">
                              {result.co2Emissions.toLocaleString('nl-NL', {
                                maximumFractionDigits: 0,
                              })}{' '}
                              kg
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${co2Percentage}%`,
                                backgroundColor: fuelTypeColors[result.fuelType as FuelType],
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </Card>
            </div>
          </div>

          {/* Cost Breakdown Chart with Type Selector */}
          <Card className="overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kostenverdeling per Brandstoftype
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setBreakdownChartType('stacked')}
                    className={cn(
                      'rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors',
                      breakdownChartType === 'stacked'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                    title="Gestapeld - Totaal overzicht"
                  >
                    Gestapeld
                  </button>
                  <button
                    onClick={() => setBreakdownChartType('grouped')}
                    className={cn(
                      'rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors',
                      breakdownChartType === 'grouped'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                    title="Gegroepeerd - Categorievergelijking"
                  >
                    Gegroepeerd
                  </button>
                  <button
                    onClick={() => setBreakdownChartType('horizontal')}
                    className={cn(
                      'rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors',
                      breakdownChartType === 'horizontal'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                    title="Horizontaal - Betere leesbaarheid"
                  >
                    Horizontaal
                  </button>
                  <button
                    onClick={() => setBreakdownChartType('percentage')}
                    className={cn(
                      'rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors',
                      breakdownChartType === 'percentage'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                    title="Percentage - Relatieve verdeling"
                  >
                    Percentage
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                {breakdownChartType === 'stacked' && (
                  <BarChart data={stackedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
                      iconType="rect"
                    />
                    <Bar dataKey="Aanschaf" stackId="a" fill={COST_COLORS.purchaseCost} />
                    <Bar dataKey="Brandstof" stackId="a" fill={COST_COLORS.fuelCost} />
                    <Bar dataKey="Onderhoud" stackId="a" fill={COST_COLORS.maintenanceCost} />
                    <Bar dataKey="Belastingen" stackId="a" fill={COST_COLORS.taxesCost} />
                    <Bar dataKey="Verzekering" stackId="a" fill={COST_COLORS.insuranceCost} />
                    <Bar dataKey="Rente" stackId="a" fill={COST_COLORS.interestCost} />
                  </BarChart>
                )}
                {breakdownChartType === 'grouped' && (
                  <BarChart data={stackedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
                      iconType="rect"
                    />
                    <Bar dataKey="Aanschaf" fill={COST_COLORS.purchaseCost} />
                    <Bar dataKey="Brandstof" fill={COST_COLORS.fuelCost} />
                    <Bar dataKey="Onderhoud" fill={COST_COLORS.maintenanceCost} />
                    <Bar dataKey="Belastingen" fill={COST_COLORS.taxesCost} />
                    <Bar dataKey="Verzekering" fill={COST_COLORS.insuranceCost} />
                    <Bar dataKey="Rente" fill={COST_COLORS.interestCost} />
                  </BarChart>
                )}
                {breakdownChartType === 'horizontal' && (
                  <BarChart data={stackedData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      width={80}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
                      iconType="rect"
                    />
                    <Bar dataKey="Aanschaf" stackId="a" fill={COST_COLORS.purchaseCost} />
                    <Bar dataKey="Brandstof" stackId="a" fill={COST_COLORS.fuelCost} />
                    <Bar dataKey="Onderhoud" stackId="a" fill={COST_COLORS.maintenanceCost} />
                    <Bar dataKey="Belastingen" stackId="a" fill={COST_COLORS.taxesCost} />
                    <Bar dataKey="Verzekering" stackId="a" fill={COST_COLORS.insuranceCost} />
                    <Bar dataKey="Rente" stackId="a" fill={COST_COLORS.interestCost} />
                  </BarChart>
                )}
                {breakdownChartType === 'percentage' && (
                  <BarChart data={stackedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const item = stackedData.find((d) => d.name === name)
                        if (!item) return '0%'
                        const total =
                          (item.Aanschaf || 0) +
                          (item.Brandstof || 0) +
                          (item.Onderhoud || 0) +
                          (item.Belastingen || 0) +
                          (item.Verzekering || 0) +
                          (item.Rente || 0)
                        const percent = ((value as number) / total) * 100
                        return `${percent.toFixed(1)}%`
                      }}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
                      iconType="rect"
                    />
                    <Bar dataKey="Aanschaf" stackId="percent" fill={COST_COLORS.purchaseCost} />
                    <Bar dataKey="Brandstof" stackId="percent" fill={COST_COLORS.fuelCost} />
                    <Bar dataKey="Onderhoud" stackId="percent" fill={COST_COLORS.maintenanceCost} />
                    <Bar dataKey="Belastingen" stackId="percent" fill={COST_COLORS.taxesCost} />
                    <Bar dataKey="Verzekering" stackId="percent" fill={COST_COLORS.insuranceCost} />
                    <Bar dataKey="Rente" stackId="percent" fill={COST_COLORS.interestCost} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Timeline Chart with Type Selector */}
          <Card className="overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kostenopbouw over {depreciationYears} jaar
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTimelineChartType('line')}
                    className={cn(
                      'rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors',
                      timelineChartType === 'line'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                    title="Lijn - Trend weergave"
                  >
                    Lijn
                  </button>
                  <button
                    onClick={() => setTimelineChartType('area')}
                    className={cn(
                      'rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors',
                      timelineChartType === 'area'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                    title="Vlak - Cumulatief zicht"
                  >
                    Vlak
                  </button>
                  <button
                    onClick={() => setTimelineChartType('bar')}
                    className={cn(
                      'rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors',
                      timelineChartType === 'bar'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                    title="Staaf - Jaarvergelijking"
                  >
                    Staaf
                  </button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                {timelineChartType === 'line' && (
                  <LineChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      label={{ value: 'Jaar', position: 'insideBottom', offset: -5, fontSize: 12 }}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
                      iconType="line"
                    />
                    {resultsArray.map((result) => (
                      <Line
                        key={result.fuelType}
                        type="monotone"
                        dataKey={fuelTypeLabels[result.fuelType as FuelType]}
                        stroke={fuelTypeColors[result.fuelType as FuelType]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                )}
                {timelineChartType === 'area' && (
                  <AreaChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      label={{ value: 'Jaar', position: 'insideBottom', offset: -5, fontSize: 12 }}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
                      iconType="rect"
                    />
                    {resultsArray.map((result) => (
                      <Area
                        key={result.fuelType}
                        type="monotone"
                        dataKey={fuelTypeLabels[result.fuelType as FuelType]}
                        stroke={fuelTypeColors[result.fuelType as FuelType]}
                        fill={fuelTypeColors[result.fuelType as FuelType]}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                )}
                {timelineChartType === 'bar' && (
                  <BarChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      label={{ value: 'Jaar', position: 'insideBottom', offset: -5, fontSize: 12 }}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
                      iconType="rect"
                    />
                    {resultsArray.map((result) => (
                      <Bar
                        key={result.fuelType}
                        dataKey={fuelTypeLabels[result.fuelType as FuelType]}
                        fill={fuelTypeColors[result.fuelType as FuelType]}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </Card>

          {/* CFO CASH FLOW DASHBOARD */}
          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                  💰 CFO Dashboard - Cashflow Analyse
                </h3>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  Financiële impact en cashflow projectie
                </p>
              </div>
            </div>

            {/* CAPEX vs OPEX KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
              {resultsArray.map((result) => {
                const purchaseCost = result.breakdown.purchaseCost
                const annualOpex =
                  result.breakdown.fuelCost +
                  result.breakdown.maintenanceCost +
                  result.breakdown.taxesCost +
                  result.breakdown.insuranceCost
                const monthlyOpex = annualOpex / 12
                const totalLifetime = result.totalCost

                return (
                  <Card key={result.fuelType} className="border-gray-200 p-4 dark:border-gray-700">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {fuelTypeLabels[result.fuelType as FuelType]}
                      </span>
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: fuelTypeColors[result.fuelType as FuelType] }}
                      />
                    </div>

                    <div className="space-y-3">
                      {/* CAPEX */}
                      <div>
                        <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                          CAPEX (Initial)
                        </div>
                        <div className="mt-0.5 text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          {formatCurrency(purchaseCost)}
                        </div>
                      </div>

                      {/* Monthly OPEX */}
                      <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
                        <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                          Monthly OPEX
                        </div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          {formatCurrency(monthlyOpex)}/mnd
                        </div>
                      </div>

                      {/* Annual OPEX */}
                      <div>
                        <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                          Annual OPEX
                        </div>
                        <div className="mt-0.5 text-sm font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                          {formatCurrency(annualOpex)}/jr
                        </div>
                      </div>

                      {/* Total Lifetime */}
                      <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
                        <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                          Total {depreciationYears}yr
                        </div>
                        <div className="mt-0.5 text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          {formatCurrency(totalLifetime)}
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            {/* Cumulative Cash Flow Chart */}
            <Card className="overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cumulatieve Cashflow Projectie
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={Array.from({ length: depreciationYears + 1 }, (_, i) => {
                      const year = i
                      const dataPoint: Record<string, number | string> = { year }

                      resultsArray.forEach((result) => {
                        const purchaseCost = result.breakdown.purchaseCost
                        const annualOpex =
                          result.breakdown.fuelCost +
                          result.breakdown.maintenanceCost +
                          result.breakdown.taxesCost +
                          result.breakdown.insuranceCost

                        // Cumulative: Initial investment + (annual OPEX * years)
                        const cumulative =
                          year === 0 ? purchaseCost : purchaseCost + annualOpex * year
                        dataPoint[fuelTypeLabels[result.fuelType as FuelType]] = cumulative
                      })

                      return dataPoint
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      label={{ value: 'Jaar', position: 'insideBottom', offset: -5, fontSize: 12 }}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-sans)' }}
                      iconType="line"
                    />
                    {resultsArray.map((result) => (
                      <Line
                        key={result.fuelType}
                        type="monotone"
                        dataKey={fuelTypeLabels[result.fuelType as FuelType]}
                        stroke={fuelTypeColors[result.fuelType as FuelType]}
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* EXPERT MODE: Everything + advanced analytics */}
      {viewMode === 'expert' && (
        <div className="space-y-6">
          {/* Copy of Analyse mode content */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Comparison Table */}
            <div className="lg:col-span-7">
              <Card className="overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Kostenvergelijking
                  </h3>
                </div>
                <div>
                  <table className="w-full table-fixed">
                    <thead className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                      <tr>
                        <th className="w-[15%] px-2 py-2 text-left">
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Brandstof
                          </span>
                        </th>
                        <th
                          className="w-[18%] cursor-pointer px-2 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('totalCost')}
                        >
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Totale TCO {getSortIndicator('totalCost')}
                          </span>
                        </th>
                        <th
                          className="hidden w-[13%] cursor-pointer px-2 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 md:table-cell"
                          onClick={() => handleSort('costPerKm')}
                        >
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            €/km {getSortIndicator('costPerKm')}
                          </span>
                        </th>
                        <th
                          className="w-[20%] cursor-pointer px-2 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={() => handleSort('fuelCost')}
                        >
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Brandstof {getSortIndicator('fuelCost')}
                          </span>
                        </th>
                        <th
                          className="hidden w-[14%] cursor-pointer px-2 py-2 text-right transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 xl:table-cell"
                          onClick={() => handleSort('co2Emissions')}
                        >
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            CO2 {getSortIndicator('co2Emissions')}
                          </span>
                        </th>
                        <th className="w-[20%] px-2 py-2 text-right">
                          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Status
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults.map((result, index) => {
                        const isLowest = result.totalCost === minCost
                        const difference = result.totalCost - minCost

                        return (
                          <motion.tr
                            key={result.fuelType}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              'border-b border-gray-200 transition-colors dark:border-gray-700',
                              isLowest
                                ? 'bg-green-50/50 dark:bg-green-950/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            )}
                          >
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="h-2.5 w-2.5 flex-shrink-0 rounded"
                                  style={{
                                    backgroundColor: fuelTypeColors[result.fuelType as FuelType],
                                  }}
                                />
                                <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {fuelTypeLabels[result.fuelType as FuelType]}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-right text-sm tabular-nums text-gray-900 dark:text-gray-100">
                              €
                              {result.totalCost.toLocaleString('nl-NL', {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="hidden px-2 py-2 text-right text-sm tabular-nums text-gray-900 dark:text-gray-100 md:table-cell">
                              €{result.costPerKm.toFixed(2)}
                            </td>
                            <td className="px-2 py-2 text-right text-sm tabular-nums text-gray-900 dark:text-gray-100">
                              €
                              {result.breakdown.fuelCost.toLocaleString('nl-NL', {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="hidden px-2 py-2 text-right text-sm tabular-nums text-gray-900 dark:text-gray-100 xl:table-cell">
                              {result.co2Emissions.toLocaleString('nl-NL', {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="px-2 py-2 text-right">
                              {isLowest ? (
                                <Badge className="bg-green-500 text-xs text-white">Laagste</Badge>
                              ) : difference > 0 ? (
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  +€
                                  {(difference / 1000).toFixed(0)}k
                                </span>
                              ) : null}
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
                      <tr>
                        <td
                          colSpan={6}
                          className="px-2 py-2 text-xs text-gray-600 dark:text-gray-400"
                        >
                          {resultsArray.length} brandstoftypen vergeleken
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </div>

            {/* Right: Multi-dimensional Radar Chart */}
            <div className="lg:col-span-5">
              <Card className="overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Multi-dimensionale Analyse
                  </h3>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        style={{ fontFamily: 'var(--font-sans)' }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                      />
                      {resultsArray.map((result) => (
                        <Radar
                          key={result.fuelType}
                          name={fuelTypeLabels[result.fuelType as FuelType]}
                          dataKey={fuelTypeLabels[result.fuelType as FuelType]}
                          stroke={fuelTypeColors[result.fuelType as FuelType]}
                          fill={fuelTypeColors[result.fuelType as FuelType]}
                          fillOpacity={0.2}
                        />
                      ))}
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-sans)' }}
                        iconType="circle"
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

          {/* Cost Breakdown + Timeline in Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cost Breakdown Stacked Bar */}
            <Card className="overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kostenverdeling per Brandstoftype
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stackedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-sans)' }}
                      iconType="rect"
                    />
                    <Bar dataKey="Aanschaf" stackId="a" fill={COST_COLORS.purchaseCost} />
                    <Bar dataKey="Brandstof" stackId="a" fill={COST_COLORS.fuelCost} />
                    <Bar dataKey="Onderhoud" stackId="a" fill={COST_COLORS.maintenanceCost} />
                    <Bar dataKey="Belastingen" stackId="a" fill={COST_COLORS.taxesCost} />
                    <Bar dataKey="Verzekering" stackId="a" fill={COST_COLORS.insuranceCost} />
                    <Bar dataKey="Rente" stackId="a" fill={COST_COLORS.interestCost} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Annual Cost Progression */}
            <Card className="overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kostenopbouw over {depreciationYears} jaar
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={annualData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      style={{ fontFamily: 'var(--font-sans)' }}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-sans)' }}
                      iconType="line"
                    />
                    {resultsArray.map((result) => (
                      <Line
                        key={result.fuelType}
                        type="monotone"
                        dataKey={fuelTypeLabels[result.fuelType as FuelType]}
                        stroke={fuelTypeColors[result.fuelType as FuelType]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Detailed Breakdown Table */}
          <Card className="overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Gedetailleerde Kostenspecificatie
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                  <tr>
                    <th className="p-3 text-left">
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Kostenpost
                      </span>
                    </th>
                    {sortedResults.map((result) => (
                      <th key={result.fuelType} className="p-3 text-right">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {fuelTypeLabels[result.fuelType as FuelType]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                      Aankoopprijs
                    </td>
                    {sortedResults.map((result) => (
                      <td
                        key={result.fuelType}
                        className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100"
                      >
                        €
                        {result.breakdown.purchaseCost.toLocaleString('nl-NL', {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">Brandstof</td>
                    {sortedResults.map((result) => (
                      <td
                        key={result.fuelType}
                        className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100"
                      >
                        €
                        {result.breakdown.fuelCost.toLocaleString('nl-NL', {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">Onderhoud</td>
                    {sortedResults.map((result) => (
                      <td
                        key={result.fuelType}
                        className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100"
                      >
                        €
                        {result.breakdown.maintenanceCost.toLocaleString('nl-NL', {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                      Belastingen
                    </td>
                    {sortedResults.map((result) => (
                      <td
                        key={result.fuelType}
                        className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100"
                      >
                        €
                        {result.breakdown.taxesCost.toLocaleString('nl-NL', {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">
                      Verzekering
                    </td>
                    {sortedResults.map((result) => (
                      <td
                        key={result.fuelType}
                        className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100"
                      >
                        €
                        {result.breakdown.insuranceCost.toLocaleString('nl-NL', {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="p-3 font-medium text-gray-900 dark:text-gray-100">Rente</td>
                    {sortedResults.map((result) => (
                      <td
                        key={result.fuelType}
                        className="p-3 text-right tabular-nums text-gray-900 dark:text-gray-100"
                      >
                        €
                        {result.breakdown.interestCost.toLocaleString('nl-NL', {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b-2 border-gray-200 bg-green-50 dark:border-gray-700 dark:bg-green-950/20">
                    <td className="p-3 font-semibold text-gray-900 dark:text-gray-100">Subsidie</td>
                    {sortedResults.map((result) => (
                      <td
                        key={result.fuelType}
                        className="p-3 text-right font-semibold tabular-nums text-green-600"
                      >
                        -€
                        {result.breakdown.subsidyCredit.toLocaleString('nl-NL', {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-t-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                    <td className="p-3 font-bold text-gray-900 dark:text-gray-100">Totale TCO</td>
                    {sortedResults.map((result) => (
                      <td
                        key={result.fuelType}
                        className="p-3 text-right font-bold tabular-nums text-gray-900 dark:text-gray-100"
                      >
                        €{result.totalCost.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Export Actions */}
      <div className="flex justify-center gap-4 border-t border-gray-200 pt-6 dark:border-gray-700">
        <Button
          onClick={handleExportPDF}
          size="lg"
          className="gap-2 bg-orange-500 hover:bg-orange-600"
        >
          <Download className="h-5 w-5" />
          Exporteer naar PDF
        </Button>
        <Button
          onClick={handleExportExcel}
          size="lg"
          variant="outline"
          className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
        >
          <FileSpreadsheet className="h-5 w-5" />
          Exporteer naar Excel
        </Button>
      </div>

      {/* Export Dialog */}
      <AnimatePresence>
        {showExportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowExportDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Export Rapport
                </h3>
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Selecteer welke secties je wilt exporteren
              </p>

              <div className="space-y-3">
                {[
                  { key: 'kpis', label: 'KPI Samenvatting', icon: '📊' },
                  { key: 'comparison', label: 'Kostenvergelijking Tabel', icon: '📈' },
                  { key: 'breakdown', label: 'Kostenverdeling Grafiek', icon: '🔧' },
                  { key: 'timeline', label: 'Jaarlijkse Opbouw', icon: '📅' },
                  { key: 'detailed', label: 'Gedetailleerde Specificatie', icon: '📋' },
                  { key: 'insights', label: 'Besparing & Milieu-impact', icon: '💡' },
                ].map(({ key, label, icon }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={exportOptions[key as keyof typeof exportOptions]}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-2xl">{icon}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => confirmExport('pdf')}
                  className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600"
                  disabled={!Object.values(exportOptions).some((v) => v)}
                >
                  <Download className="h-4 w-4" />
                  Exporteer PDF
                </Button>
                <Button
                  onClick={() => confirmExport('excel')}
                  variant="outline"
                  className="flex-1 gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
                  disabled={!Object.values(exportOptions).some((v) => v)}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Exporteer Excel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
