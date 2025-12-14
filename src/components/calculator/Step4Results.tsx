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
  Plus,
} from 'lucide-react'
import { exportToPDF, exportToExcel } from '@/lib/export-utils'
import CountUp from 'react-countup'
import { api } from '@/trpc/react'
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

// Comparison vehicle interface
interface ComparisonVehicle {
  vehicleTypeId: string
  vehicleTypeName: string
  results: Record<string, ResultData>
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
    // Executive Summary
    executiveSummary: {
      enabled: true,
      coverPage: true,
      keyFindings: true,
      recommendations: true,
    },
    // Specifications
    specifications: {
      enabled: true,
      vehicleDetails: true,
      drivingArea: true,
      parameters: true,
    },
    // CFO Dashboard
    cfoDashboard: {
      enabled: true,
      capexOpex: true,
      cashFlowChart: true,
      breakEvenAnalysis: true,
    },
    // Cost Analysis
    costAnalysis: {
      enabled: true,
      comparisonTable: true,
      comparisonChart: true,
      costBreakdownChart: true,
      detailedBreakdown: true,
    },
    // Timeline & Projection
    timeline: {
      enabled: true,
      annualCosts: true,
      cumulativeCashFlow: true,
      depreciationSchedule: true,
    },
    // Environmental Impact
    environmental: {
      enabled: true,
      co2Comparison: true,
      emissionsChart: true,
      sustainabilityScore: true,
    },
    // Insights & Recommendations
    insights: {
      enabled: true,
      savings: true,
      roi: true,
      riskFactors: true,
    },
  })

  // Multi-vehicle comparison state
  const [comparisonVehicles, setComparisonVehicles] = useState<ComparisonVehicle[]>([])
  const [showVehicleSelector, setShowVehicleSelector] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')

  // Fetch all vehicle types for comparison selection
  const { data: allVehicleTypes } = api.calculator.getVehicleTypes.useQuery()

  // tRPC mutation for calculating TCO
  const calculateTCO = api.calculator.calculateTCO.useMutation()

  // Currency formatter helper
  const formatCurrency = (value: number) =>
    `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`

  // Handle adding comparison vehicle
  const handleAddComparisonVehicle = async () => {
    if (!selectedVehicleId || !session.drivingArea?.id || !session.parametersData) {
      return
    }

    // Check if already comparing this vehicle
    const alreadyAdded = comparisonVehicles.some((v) => v.vehicleTypeId === selectedVehicleId)
    if (alreadyAdded) {
      alert('Dit voertuig is al toegevoegd voor vergelijking')
      return
    }

    // Check max 3 vehicles total (1 primary + 2 comparison)
    if (comparisonVehicles.length >= 2) {
      alert('Maximaal 3 voertuigen kunnen worden vergeleken')
      return
    }

    // Find vehicle type name
    const vehicleType = allVehicleTypes?.find((v) => v.id === selectedVehicleId)
    if (!vehicleType) return

    try {
      // Calculate TCO for this vehicle using same parameters
      const tcoResponse = await calculateTCO.mutateAsync({
        sessionKey: session.sessionKey,
        vehicleTypeId: selectedVehicleId,
        drivingAreaId: session.drivingArea.id,
        parametersData: session.parametersData as {
          purchasePrice: number
          kmPerYear: number
          fuelType: 'diesel' | 'bev' | 'fcev' | 'h2ice'
          consumption: number
          gvw?: number
          payload?: number
          motorTax?: number
          truckToll?: number
          subsidy?: number
          interestRate?: number
          depreciationYears?: number
          maintenanceCostPerKm?: number
          insurancePercentage?: number
        },
      })

      // Add to comparison vehicles
      setComparisonVehicles((prev) => [
        ...prev,
        {
          vehicleTypeId: selectedVehicleId,
          vehicleTypeName: vehicleType.name,
          results: tcoResponse.results as Record<string, ResultData>,
        },
      ])

      // Reset selection
      setSelectedVehicleId('')
      setShowVehicleSelector(false)
    } catch (error) {
      console.error('Failed to calculate TCO for comparison vehicle:', error)
      alert('Fout bij het berekenen van TCO voor vergelijkingsvoertuig')
    }
  }

  // Handle removing comparison vehicle
  const handleRemoveComparisonVehicle = (vehicleTypeId: string) => {
    setComparisonVehicles((prev) => prev.filter((v) => v.vehicleTypeId !== vehicleTypeId))
  }

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

    // Map new nested options to legacy format for export functions
    const legacyOptions = {
      kpis: exportOptions.executiveSummary.enabled && exportOptions.executiveSummary.keyFindings,
      comparison: exportOptions.costAnalysis.enabled && exportOptions.costAnalysis.comparisonTable,
      breakdown:
        exportOptions.costAnalysis.enabled && exportOptions.costAnalysis.costBreakdownChart,
      timeline: exportOptions.timeline.enabled && exportOptions.timeline.cumulativeCashFlow,
      detailed: exportOptions.costAnalysis.enabled && exportOptions.costAnalysis.detailedBreakdown,
      insights: exportOptions.insights.enabled,
    }

    // Call the appropriate export function
    try {
      if (format === 'pdf') {
        exportToPDF(exportData, legacyOptions)
      } else {
        exportToExcel(exportData, legacyOptions)
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
                  {comparisonVehicles.length > 0 &&
                    ` • ${comparisonVehicles.length + 1} voertuigen in vergelijking`}
                </p>
              </div>
              {comparisonVehicles.length < 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVehicleSelector(!showVehicleSelector)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Voertuig toevoegen
                </Button>
              )}
            </div>

            {/* Vehicle Comparison Selector */}
            {showVehicleSelector && (
              <Card className="border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Selecteer voertuig voor vergelijking
                    </label>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Hetzelfde rijgebied en parameters worden toegepast
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                      className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                    >
                      <option value="">Kies een voertuigtype...</option>
                      {allVehicleTypes
                        ?.filter((v) => v.id !== session.vehicleType?.id)
                        .filter((v) => !comparisonVehicles.some((cv) => cv.vehicleTypeId === v.id))
                        .map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.name}
                            {vehicle.defaultGvw ? ` (${vehicle.defaultGvw}kg GVW)` : ''}
                          </option>
                        ))}
                    </select>
                    <Button
                      onClick={handleAddComparisonVehicle}
                      disabled={!selectedVehicleId || calculateTCO.isPending}
                      className="gap-2"
                    >
                      {calculateTCO.isPending ? 'Berekenen...' : 'Toevoegen'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowVehicleSelector(false)}>
                      Annuleren
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Currently Compared Vehicles */}
            {comparisonVehicles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="gap-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
                >
                  {session.vehicleType?.name} (Primair)
                </Badge>
                {comparisonVehicles.map((vehicle) => (
                  <Badge
                    key={vehicle.vehicleTypeId}
                    variant="outline"
                    className="gap-2 border-orange-300 bg-orange-100 dark:border-orange-600 dark:bg-orange-900"
                  >
                    {vehicle.vehicleTypeName}
                    <button
                      onClick={() => handleRemoveComparisonVehicle(vehicle.vehicleTypeId)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* CAPEX vs OPEX KPIs - Grouped by Fuel Type */}
            <div className="grid gap-4 md:grid-cols-4">
              {(['diesel', 'bev', 'fcev', 'h2ice'] as FuelType[])
                .filter((fuelType) => selectedFuelTypes.includes(fuelType))
                .map((fuelType) => {
                  // Collect all vehicles' results for this fuel type
                  const allVehiclesForFuelType = [
                    {
                      name: session.vehicleType?.name || 'Primair',
                      isPrimary: true,
                      result: results[fuelType],
                    },
                    ...comparisonVehicles.map((cv) => ({
                      name: cv.vehicleTypeName,
                      isPrimary: false,
                      result: cv.results[fuelType],
                    })),
                  ].filter((v) => v.result) // Only show if result exists

                  return (
                    <div key={fuelType} className="space-y-3">
                      {/* Fuel Type Header */}
                      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: fuelTypeColors[fuelType] }}
                        />
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {fuelTypeLabels[fuelType]}
                        </span>
                      </div>

                      {/* Vehicle Cards */}
                      {allVehiclesForFuelType.map((vehicle, idx) => {
                        const result = vehicle.result
                        if (!result) return null

                        const purchaseCost = result.breakdown.purchaseCost
                        const annualOpex =
                          result.breakdown.fuelCost +
                          result.breakdown.maintenanceCost +
                          result.breakdown.taxesCost +
                          result.breakdown.insuranceCost
                        const monthlyOpex = annualOpex / 12
                        const totalLifetime = result.totalCost

                        return (
                          <Card
                            key={`${fuelType}-${idx}`}
                            className={cn(
                              'border-gray-200 p-3 dark:border-gray-700',
                              vehicle.isPrimary &&
                                'border-2 border-orange-300 dark:border-orange-600'
                            )}
                          >
                            {/* Vehicle Name */}
                            <div className="mb-2 text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                              {vehicle.name}
                              {vehicle.isPrimary && ' (Primair)'}
                            </div>

                            <div className="space-y-2">
                              {/* CAPEX */}
                              <div>
                                <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400">
                                  CAPEX
                                </div>
                                <div className="mt-0.5 text-base font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                  {formatCurrency(purchaseCost)}
                                </div>
                              </div>

                              {/* Monthly OPEX */}
                              <div className="border-t border-gray-100 pt-1.5 dark:border-gray-800">
                                <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400">
                                  Monthly OPEX
                                </div>
                                <div className="mt-0.5 text-xs font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                  {formatCurrency(monthlyOpex)}/mnd
                                </div>
                              </div>

                              {/* Annual OPEX */}
                              <div>
                                <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400">
                                  Annual OPEX
                                </div>
                                <div className="mt-0.5 text-xs font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                                  {formatCurrency(annualOpex)}/jr
                                </div>
                              </div>

                              {/* Total Lifetime */}
                              <div className="border-t border-gray-100 pt-1.5 dark:border-gray-800">
                                <div className="text-[9px] font-medium text-gray-500 dark:text-gray-400">
                                  Total {depreciationYears}yr
                                </div>
                                <div className="mt-0.5 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                                  {formatCurrency(totalLifetime)}
                                </div>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  )
                })}
            </div>

            {/* Cumulative Cash Flow Chart */}
            <Card className="overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cumulatieve Cashflow Projectie
                  {comparisonVehicles.length > 0 && ' • Multi-Vehicle Vergelijking'}
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer
                  width="100%"
                  height={comparisonVehicles.length > 0 ? 400 : 300}
                >
                  <LineChart
                    data={Array.from({ length: depreciationYears + 1 }, (_, i) => {
                      const year = i
                      const dataPoint: Record<string, number | string> = { year }

                      // Primary vehicle
                      const primaryVehicleName = session.vehicleType?.name || 'Primair'
                      selectedFuelTypes.forEach((fuelType) => {
                        const result = results[fuelType]
                        if (result) {
                          const purchaseCost = result.breakdown.purchaseCost
                          const annualOpex =
                            result.breakdown.fuelCost +
                            result.breakdown.maintenanceCost +
                            result.breakdown.taxesCost +
                            result.breakdown.insuranceCost

                          const cumulative =
                            year === 0 ? purchaseCost : purchaseCost + annualOpex * year
                          dataPoint[`${primaryVehicleName} - ${fuelTypeLabels[fuelType]}`] =
                            cumulative
                        }
                      })

                      // Comparison vehicles
                      comparisonVehicles.forEach((vehicle) => {
                        selectedFuelTypes.forEach((fuelType) => {
                          const result = vehicle.results[fuelType]
                          if (result) {
                            const purchaseCost = result.breakdown.purchaseCost
                            const annualOpex =
                              result.breakdown.fuelCost +
                              result.breakdown.maintenanceCost +
                              result.breakdown.taxesCost +
                              result.breakdown.insuranceCost

                            const cumulative =
                              year === 0 ? purchaseCost : purchaseCost + annualOpex * year
                            dataPoint[`${vehicle.vehicleTypeName} - ${fuelTypeLabels[fuelType]}`] =
                              cumulative
                          }
                        })
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
                      wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-sans)' }}
                      iconType="line"
                    />
                    {/* Primary vehicle lines (solid) */}
                    {selectedFuelTypes.map((fuelType) => (
                      <Line
                        key={`primary-${fuelType}`}
                        type="monotone"
                        dataKey={`${session.vehicleType?.name || 'Primair'} - ${fuelTypeLabels[fuelType]}`}
                        stroke={fuelTypeColors[fuelType]}
                        strokeWidth={3}
                        strokeDasharray="0"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                    {/* Comparison vehicle lines (dashed/dotted) */}
                    {comparisonVehicles.map((vehicle, vehicleIdx) => {
                      const strokeDasharray = vehicleIdx === 0 ? '5 5' : '2 2' // First comparison: dashed, second: dotted
                      return selectedFuelTypes.map((fuelType) => (
                        <Line
                          key={`${vehicle.vehicleTypeId}-${fuelType}`}
                          type="monotone"
                          dataKey={`${vehicle.vehicleTypeName} - ${fuelTypeLabels[fuelType]}`}
                          stroke={fuelTypeColors[fuelType]}
                          strokeWidth={2.5}
                          strokeDasharray={strokeDasharray}
                          strokeOpacity={0.8}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      ))
                    })}
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

              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                Selecteer welke secties je wilt exporteren - perfect voor C-level rapportage
              </p>

              {/* Quick Actions */}
              <div className="mb-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const allEnabled = Object.fromEntries(
                      Object.entries(exportOptions).map(([key, section]) => [
                        key,
                        typeof section === 'object'
                          ? {
                              ...section,
                              enabled: true,
                              ...Object.fromEntries(
                                Object.keys(section)
                                  .filter((k) => k !== 'enabled')
                                  .map((k) => [k, true])
                              ),
                            }
                          : true,
                      ])
                    ) as typeof exportOptions
                    setExportOptions(allEnabled)
                  }}
                  className="text-xs"
                >
                  Alles selecteren
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const allDisabled = Object.fromEntries(
                      Object.entries(exportOptions).map(([key, section]) => [
                        key,
                        typeof section === 'object'
                          ? {
                              ...section,
                              enabled: false,
                              ...Object.fromEntries(
                                Object.keys(section)
                                  .filter((k) => k !== 'enabled')
                                  .map((k) => [k, false])
                              ),
                            }
                          : false,
                      ])
                    ) as typeof exportOptions
                    setExportOptions(allDisabled)
                  }}
                  className="text-xs"
                >
                  Alles deselecteren
                </Button>
              </div>

              {/* Scrollable Sections */}
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-2">
                {/* Executive Summary */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="flex cursor-pointer items-center gap-3 border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={exportOptions.executiveSummary.enabled}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          executiveSummary: { ...prev.executiveSummary, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500"
                    />
                    <span className="text-lg">📋</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Executive Summary
                    </span>
                  </label>
                  {exportOptions.executiveSummary.enabled && (
                    <div className="space-y-1 p-2">
                      {[
                        { key: 'coverPage', label: 'Cover Page met branding' },
                        { key: 'keyFindings', label: 'Key Findings & KPIs' },
                        { key: 'recommendations', label: 'Strategische aanbevelingen' },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={
                              exportOptions.executiveSummary[
                                key as keyof typeof exportOptions.executiveSummary
                              ] as boolean
                            }
                            onChange={(e) =>
                              setExportOptions((prev) => ({
                                ...prev,
                                executiveSummary: {
                                  ...prev.executiveSummary,
                                  [key]: e.target.checked,
                                },
                              }))
                            }
                            className="h-3 w-3 rounded border-gray-300 text-orange-500"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Specifications */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="flex cursor-pointer items-center gap-3 border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={exportOptions.specifications.enabled}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          specifications: { ...prev.specifications, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500"
                    />
                    <span className="text-lg">🚛</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Specificaties & Parameters
                    </span>
                  </label>
                  {exportOptions.specifications.enabled && (
                    <div className="space-y-1 p-2">
                      {[
                        {
                          key: 'vehicleDetails',
                          label: 'Voertuig specificaties (GVW, payload, etc.)',
                        },
                        { key: 'drivingArea', label: 'Rijgebied details & km/jaar' },
                        { key: 'parameters', label: 'Alle input parameters' },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={
                              exportOptions.specifications[
                                key as keyof typeof exportOptions.specifications
                              ] as boolean
                            }
                            onChange={(e) =>
                              setExportOptions((prev) => ({
                                ...prev,
                                specifications: { ...prev.specifications, [key]: e.target.checked },
                              }))
                            }
                            className="h-3 w-3 rounded border-gray-300 text-orange-500"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* CFO Dashboard */}
                <div className="rounded-lg border border-orange-200 bg-orange-50/30 dark:border-orange-900 dark:bg-orange-950/20">
                  <label className="flex cursor-pointer items-center gap-3 border-b border-orange-200 bg-orange-100/50 p-3 dark:border-orange-900 dark:bg-orange-950/40">
                    <input
                      type="checkbox"
                      checked={exportOptions.cfoDashboard.enabled}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          cfoDashboard: { ...prev.cfoDashboard, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500"
                    />
                    <span className="text-lg">💰</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      CFO Dashboard (AANBEVOLEN)
                    </span>
                  </label>
                  {exportOptions.cfoDashboard.enabled && (
                    <div className="space-y-1 p-2">
                      {[
                        { key: 'capexOpex', label: 'CAPEX vs OPEX vergelijking' },
                        { key: 'cashFlowChart', label: 'Cumulatieve cashflow projectie' },
                        { key: 'breakEvenAnalysis', label: 'Break-even analyse' },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-orange-100/30 dark:hover:bg-orange-950/30"
                        >
                          <input
                            type="checkbox"
                            checked={
                              exportOptions.cfoDashboard[
                                key as keyof typeof exportOptions.cfoDashboard
                              ] as boolean
                            }
                            onChange={(e) =>
                              setExportOptions((prev) => ({
                                ...prev,
                                cfoDashboard: { ...prev.cfoDashboard, [key]: e.target.checked },
                              }))
                            }
                            className="h-3 w-3 rounded border-gray-300 text-orange-500"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cost Analysis */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="flex cursor-pointer items-center gap-3 border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={exportOptions.costAnalysis.enabled}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          costAnalysis: { ...prev.costAnalysis, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500"
                    />
                    <span className="text-lg">📊</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Kostenanalyse & Vergelijking
                    </span>
                  </label>
                  {exportOptions.costAnalysis.enabled && (
                    <div className="space-y-1 p-2">
                      {[
                        { key: 'comparisonTable', label: 'Vergelijkingstabel (alle fuel types)' },
                        { key: 'comparisonChart', label: 'TCO vergelijkingsgrafiek (bar chart)' },
                        {
                          key: 'costBreakdownChart',
                          label: 'Kostenverdeling grafiek (stacked bar)',
                        },
                        {
                          key: 'detailedBreakdown',
                          label: 'Gedetailleerde specificatie per fuel type',
                        },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={
                              exportOptions.costAnalysis[
                                key as keyof typeof exportOptions.costAnalysis
                              ] as boolean
                            }
                            onChange={(e) =>
                              setExportOptions((prev) => ({
                                ...prev,
                                costAnalysis: { ...prev.costAnalysis, [key]: e.target.checked },
                              }))
                            }
                            className="h-3 w-3 rounded border-gray-300 text-orange-500"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timeline & Projection */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="flex cursor-pointer items-center gap-3 border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={exportOptions.timeline.enabled}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          timeline: { ...prev.timeline, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500"
                    />
                    <span className="text-lg">📈</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Timeline & Projecties
                    </span>
                  </label>
                  {exportOptions.timeline.enabled && (
                    <div className="space-y-1 p-2">
                      {[
                        { key: 'annualCosts', label: 'Jaarlijkse kostenopbouw' },
                        { key: 'cumulativeCashFlow', label: 'Cumulatieve cashflow grafiek' },
                        { key: 'depreciationSchedule', label: 'Afschrijvingsschema' },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={
                              exportOptions.timeline[
                                key as keyof typeof exportOptions.timeline
                              ] as boolean
                            }
                            onChange={(e) =>
                              setExportOptions((prev) => ({
                                ...prev,
                                timeline: { ...prev.timeline, [key]: e.target.checked },
                              }))
                            }
                            className="h-3 w-3 rounded border-gray-300 text-orange-500"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Environmental Impact */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="flex cursor-pointer items-center gap-3 border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={exportOptions.environmental.enabled}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          environmental: { ...prev.environmental, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500"
                    />
                    <span className="text-lg">🌱</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Milieu-impact & Duurzaamheid
                    </span>
                  </label>
                  {exportOptions.environmental.enabled && (
                    <div className="space-y-1 p-2">
                      {[
                        { key: 'co2Comparison', label: 'CO2-uitstoot vergelijking' },
                        { key: 'emissionsChart', label: 'Emissies grafiek (CO2, NOx, fijnstof)' },
                        { key: 'sustainabilityScore', label: 'Duurzaamheidsscore & badges' },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={
                              exportOptions.environmental[
                                key as keyof typeof exportOptions.environmental
                              ] as boolean
                            }
                            onChange={(e) =>
                              setExportOptions((prev) => ({
                                ...prev,
                                environmental: { ...prev.environmental, [key]: e.target.checked },
                              }))
                            }
                            className="h-3 w-3 rounded border-gray-300 text-orange-500"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Insights & Recommendations */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="flex cursor-pointer items-center gap-3 border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                    <input
                      type="checkbox"
                      checked={exportOptions.insights.enabled}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          insights: { ...prev.insights, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-orange-500"
                    />
                    <span className="text-lg">💡</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Inzichten & Aanbevelingen
                    </span>
                  </label>
                  {exportOptions.insights.enabled && (
                    <div className="space-y-1 p-2">
                      {[
                        { key: 'savings', label: 'Besparingsanalyse vs Diesel' },
                        { key: 'roi', label: 'ROI berekening & terugverdientijd' },
                        { key: 'riskFactors', label: 'Risicofactoren & overwegingen' },
                      ].map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <input
                            type="checkbox"
                            checked={
                              exportOptions.insights[
                                key as keyof typeof exportOptions.insights
                              ] as boolean
                            }
                            onChange={(e) =>
                              setExportOptions((prev) => ({
                                ...prev,
                                insights: { ...prev.insights, [key]: e.target.checked },
                              }))
                            }
                            className="h-3 w-3 rounded border-gray-300 text-orange-500"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={() => confirmExport('pdf')}
                  className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600"
                >
                  <Download className="h-4 w-4" />
                  Exporteer PDF
                </Button>
                <Button
                  onClick={() => confirmExport('excel')}
                  variant="outline"
                  className="flex-1 gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
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
