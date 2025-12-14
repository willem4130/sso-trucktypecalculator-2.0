'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Download, TrendingDown, TrendingUp, Fuel, Zap, Droplet } from 'lucide-react'
import CountUp from 'react-countup'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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
  diesel: 'indigo',
  bev: 'green',
  fcev: 'cyan',
  h2ice: 'purple',
}

const fuelTypeIcons = {
  diesel: Fuel,
  bev: Zap,
  fcev: Droplet,
  h2ice: Fuel,
}

const fuelTypeLabels = {
  diesel: 'Diesel',
  bev: 'BEV',
  fcev: 'FCEV',
  h2ice: 'H2ICE',
}

type FuelType = keyof typeof fuelTypeColors

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

// Colors for pie chart slices
const PIE_COLORS = {
  purchaseCost: '#3b82f6', // blue
  fuelCost: '#f29100', // orange
  maintenanceCost: '#10b981', // green
  taxesCost: '#ef4444', // red
  insuranceCost: '#8b5cf6', // purple
  interestCost: '#f59e0b', // amber
  subsidyCredit: '#22c55e', // bright green
}

export function Step4Results({ session }: Step4Props) {
  const results = session.resultsData as Record<string, ResultData> | null

  if (!results) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Geen resultaten beschikbaar
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Ga terug naar de parameters en bereken de TCO.
        </p>
      </div>
    )
  }

  // Convert results to array and sort by total cost
  const resultsArray = Object.values(results).sort((a, b) => a.totalCost - b.totalCost)

  // Find min cost for comparison
  const minCost = resultsArray[0]?.totalCost || 0

  // Prepare chart data
  const chartData = resultsArray.map((result) => ({
    name: fuelTypeLabels[result.fuelType as FuelType],
    'TCO (€)': Math.round(result.totalCost),
    'Kosten/km (€)': parseFloat(result.costPerKm.toFixed(2)),
  }))

  // Prepare pie chart data for the lowest cost fuel type
  const lowestCostResult = resultsArray[0]
  const pieData = lowestCostResult
    ? [
        {
          name: 'Aankoopprijs',
          value: lowestCostResult.breakdown.purchaseCost,
          color: PIE_COLORS.purchaseCost,
        },
        {
          name: 'Brandstof',
          value: lowestCostResult.breakdown.fuelCost,
          color: PIE_COLORS.fuelCost,
        },
        {
          name: 'Onderhoud',
          value: lowestCostResult.breakdown.maintenanceCost,
          color: PIE_COLORS.maintenanceCost,
        },
        {
          name: 'Belastingen',
          value: lowestCostResult.breakdown.taxesCost,
          color: PIE_COLORS.taxesCost,
        },
        {
          name: 'Verzekering',
          value: lowestCostResult.breakdown.insuranceCost,
          color: PIE_COLORS.insuranceCost,
        },
        {
          name: 'Rente',
          value: lowestCostResult.breakdown.interestCost,
          color: PIE_COLORS.interestCost,
        },
      ].filter((item) => item.value > 0)
    : []

  // Prepare CO2 emissions chart data
  const co2Data = resultsArray.map((result) => ({
    name: fuelTypeLabels[result.fuelType as FuelType],
    'CO2 (kg)': result.co2Emissions,
    fill:
      fuelTypeColors[result.fuelType as FuelType] === 'indigo'
        ? '#6366f1'
        : fuelTypeColors[result.fuelType as FuelType] === 'green'
          ? '#10b981'
          : fuelTypeColors[result.fuelType as FuelType] === 'cyan'
            ? '#06b6d4'
            : '#a855f7',
  }))

  // Get depreciation years from parameters
  const depreciationYears = session.parametersData
    ? ((session.parametersData as Record<string, unknown>).depreciationYears as number) || 7
    : 7

  // Export to PDF
  const handleExportPDF = () => {
    // TODO: Implement PDF export with jsPDF
    console.log('Export to PDF')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">TCO Vergelijking</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Totale kosten over {depreciationYears} jaar voor alle brandstoftypen
        </p>
      </div>

      {/* Results Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resultsArray.map((result, index) => {
          const fuelType = result.fuelType as FuelType
          const colorClass = fuelTypeColors[fuelType]
          const Icon = fuelTypeIcons[fuelType]
          const isLowest = result.totalCost === minCost
          const difference = result.totalCost - minCost

          return (
            <motion.div
              key={result.fuelType}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'relative overflow-hidden p-6',
                  isLowest && 'border-2 border-green-500 shadow-lg'
                )}
              >
                {/* Lowest Badge */}
                {isLowest && (
                  <div className="absolute right-2 top-2">
                    <Badge className="bg-green-500">Laagste TCO</Badge>
                  </div>
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'mb-4 flex h-12 w-12 items-center justify-center rounded-lg',
                    `bg-${colorClass}-100 text-${colorClass}-600 dark:bg-${colorClass}-900 dark:text-${colorClass}-400`
                  )}
                >
                  <Icon className="h-6 w-6" />
                </div>

                {/* Fuel Type */}
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {fuelTypeLabels[fuelType]}
                </h3>

                {/* Total Cost */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Totale TCO</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    €<CountUp end={result.totalCost} duration={1.5} separator="." decimals={0} />
                  </p>
                </div>

                {/* Cost per km */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Kosten per km</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    €<CountUp end={result.costPerKm} duration={1.5} decimals={2} />
                  </p>
                </div>

                {/* CO2 Emissions */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">CO2 uitstoot</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    <CountUp end={result.co2Emissions} duration={1.5} separator="." decimals={0} />{' '}
                    kg
                  </p>
                </div>

                <Separator className="my-4" />

                {/* Difference from lowest */}
                {!isLowest && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-500" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      +€{difference.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} vs
                      laagste
                    </p>
                  </div>
                )}

                {isLowest && (
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-green-500" />
                    <p className="text-sm text-green-600 dark:text-green-500">Beste keuze</p>
                  </div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Cost Breakdown Chart */}
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
          TCO Vergelijking Grafiek
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: number) =>
                `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
              }
            />
            <Legend />
            <Bar dataKey="TCO (€)" fill="#f29100" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Cost Breakdown Pie Chart */}
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
          Kostenverdeling -{' '}
          {lowestCostResult ? fuelTypeLabels[lowestCostResult.fuelType as FuelType] : ''} (Laagste
          TCO)
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) =>
                `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* CO2 Emissions Comparison */}
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
          CO2 Uitstoot Vergelijking
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={co2Data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) =>
                `${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} kg`
              }
            />
            <Bar dataKey="CO2 (kg)" radius={[8, 8, 0, 0]}>
              {co2Data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Breakdown Table */}
      <Card className="p-4">
        <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
          Gedetailleerde Kostenverdeling
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Kostenpost</th>
                {resultsArray.map((result) => (
                  <th key={result.fuelType} className="p-2 text-right">
                    {fuelTypeLabels[result.fuelType as FuelType]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">Aankoopprijs</td>
                {resultsArray.map((result) => (
                  <td key={result.fuelType} className="p-2 text-right">
                    €
                    {result.breakdown.purchaseCost.toLocaleString('nl-NL', {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2">Brandstof</td>
                {resultsArray.map((result) => (
                  <td key={result.fuelType} className="p-2 text-right">
                    €
                    {result.breakdown.fuelCost.toLocaleString('nl-NL', {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2">Onderhoud</td>
                {resultsArray.map((result) => (
                  <td key={result.fuelType} className="p-2 text-right">
                    €
                    {result.breakdown.maintenanceCost.toLocaleString('nl-NL', {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2">Belastingen</td>
                {resultsArray.map((result) => (
                  <td key={result.fuelType} className="p-2 text-right">
                    €
                    {result.breakdown.taxesCost.toLocaleString('nl-NL', {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2">Verzekering</td>
                {resultsArray.map((result) => (
                  <td key={result.fuelType} className="p-2 text-right">
                    €
                    {result.breakdown.insuranceCost.toLocaleString('nl-NL', {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2">Rente</td>
                {resultsArray.map((result) => (
                  <td key={result.fuelType} className="p-2 text-right">
                    €
                    {result.breakdown.interestCost.toLocaleString('nl-NL', {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr className="border-b bg-green-50 dark:bg-green-950/20">
                <td className="p-2 font-semibold">Subsidie</td>
                {resultsArray.map((result) => (
                  <td key={result.fuelType} className="p-2 text-right font-semibold text-green-600">
                    -€
                    {result.breakdown.subsidyCredit.toLocaleString('nl-NL', {
                      maximumFractionDigits: 0,
                    })}
                  </td>
                ))}
              </tr>
              <tr className="border-b bg-gray-100 dark:bg-gray-800">
                <td className="p-2 font-bold">Totale TCO</td>
                {resultsArray.map((result) => (
                  <td key={result.fuelType} className="p-2 text-right font-bold">
                    €{result.totalCost.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Export Button */}
      <div className="flex justify-center">
        <Button onClick={handleExportPDF} size="lg" variant="outline" className="gap-2">
          <Download className="h-5 w-5" />
          Exporteer naar PDF
        </Button>
      </div>
    </div>
  )
}
