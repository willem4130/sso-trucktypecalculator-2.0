'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Check, Map, Globe, Zap } from 'lucide-react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Line,
  Area,
  AreaChart,
} from 'recharts'
import { api } from '@/trpc/react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { CalculationSession, VehicleType, DrivingArea } from '@prisma/client'

interface Step2Props {
  session: CalculationSession & {
    vehicleType: VehicleType | null
    drivingArea: DrivingArea | null
  }
  onComplete: (drivingAreaId: string) => void
}

const areaIcons = {
  Regionaal: MapPin,
  Nationaal: Map,
  'Nationaal+': Zap,
  Internationaal: Globe,
}

export function Step2DrivingArea({ session, onComplete }: Step2Props) {
  const [selectedId, setSelectedId] = useState<string | null>(session.drivingAreaId || null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Fetch all driving areas
  const { data: drivingAreas, isLoading } = api.calculator.getDrivingAreas.useQuery()

  const handleSelect = (id: string) => {
    setSelectedId(id)
  }

  const handleContinue = () => {
    if (selectedId) {
      onComplete(selectedId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  // Prepare data for analytics
  const selectedArea = drivingAreas?.find((a) => a.id === selectedId)
  const hoveredArea = hoveredId ? drivingAreas?.find((a) => a.id === hoveredId) : null

  // Radar chart data - comparing all areas
  const radarData = [
    {
      metric: 'Km/jaar',
      ...Object.fromEntries(drivingAreas?.map((a) => [a.name, a.defaultKmPerYear / 1000]) || []),
    },
    { metric: 'Bereik', Regionaal: 20, Nationaal: 60, 'Nationaal+': 80, Internationaal: 100 },
    { metric: 'Snelweg %', Regionaal: 20, Nationaal: 60, 'Nationaal+': 75, Internationaal: 85 },
    { metric: 'Complexiteit', Regionaal: 30, Nationaal: 50, 'Nationaal+': 70, Internationaal: 90 },
  ]

  // Area chart data - cumulative view
  const cumulativeData = drivingAreas?.map((area, idx) => ({
    name: area.name,
    'Km/jaar': area.defaultKmPerYear / 1000,
    'Cum. Km': drivingAreas
      .slice(0, idx + 1)
      .reduce((sum, a) => sum + a.defaultKmPerYear / 1000, 0),
  }))

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Rijgebied Selectie
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Analyseer en selecteer uw primaire operationeel gebied
            </p>
          </div>
          {session.vehicleType && (
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Voertuig</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {session.vehicleType.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BI Dashboard Layout - Full Width */}
      <div className="grid gap-3 lg:grid-cols-12">
        {/* Left: Area Selection Table (4 columns on large screens) */}
        <div className="lg:col-span-4">
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Rijgebieden
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {drivingAreas?.map((area: DrivingArea, index: number) => {
                const isSelected = selectedId === area.id
                const Icon = areaIcons[area.name as keyof typeof areaIcons] || MapPin

                return (
                  <motion.div
                    key={area.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      'group relative cursor-pointer px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      {
                        'bg-orange-50/50 dark:bg-orange-950/10': isSelected,
                      }
                    )}
                    onClick={() => handleSelect(area.id)}
                    onMouseEnter={() => setHoveredId(area.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Selection Indicator */}
                      <div
                        className={cn('w-0.5 h-full absolute left-0 top-0 transition-colors', {
                          'bg-orange-500': isSelected,
                          'bg-transparent group-hover:bg-gray-300': !isSelected,
                        })}
                      />

                      {/* Icon */}
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors',
                          {
                            'bg-orange-500 text-white': isSelected,
                            'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400':
                              !isSelected,
                          }
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {area.name}
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-orange-500 shrink-0" />}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {(area.defaultKmPerYear / 1000).toFixed(0)}k km/jaar
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </Card>

          {/* Data Table Summary */}
          {selectedArea && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3"
            >
              <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Gebied Details
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Naam</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedArea.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Km/jaar</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      {selectedArea.defaultKmPerYear.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Bereik</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedArea.name === 'Regionaal'
                        ? '~20% NL'
                        : selectedArea.name === 'Nationaal'
                          ? '~60% NL'
                          : selectedArea.name === 'Nationaal+'
                            ? '~80% NL'
                            : '100% NL+'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Snelweg</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {selectedArea.name === 'Regionaal'
                        ? '~20%'
                        : selectedArea.name === 'Nationaal'
                          ? '~60%'
                          : selectedArea.name === 'Nationaal+'
                            ? '~75%'
                            : '~85%'}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Right: Analytics Dashboard (8 columns on large screens) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Top Row: Key Metrics */}
          {(selectedArea || hoveredArea) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-3 gap-3"
            >
              <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Km/jaar
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {((selectedArea || hoveredArea)!.defaultKmPerYear / 1000).toFixed(0)}k
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Jaarlijks bereik
                  </div>
                </div>
              </Card>

              <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Dekking
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {(selectedArea || hoveredArea)!.name === 'Regionaal'
                      ? '20%'
                      : (selectedArea || hoveredArea)!.name === 'Nationaal'
                        ? '60%'
                        : (selectedArea || hoveredArea)!.name === 'Nationaal+'
                          ? '80%'
                          : '100%'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Geografisch bereik NL
                  </div>
                </div>
              </Card>

              <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Snelweg
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {(selectedArea || hoveredArea)!.name === 'Regionaal'
                      ? '20%'
                      : (selectedArea || hoveredArea)!.name === 'Nationaal'
                        ? '60%'
                        : (selectedArea || hoveredArea)!.name === 'Nationaal+'
                          ? '75%'
                          : '85%'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Snelweg percentage
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Middle Row: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Km/year Bar Chart */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kilometrage Vergelijking
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={drivingAreas?.map((area) => ({
                      id: area.id,
                      name: area.name,
                      'Km/jaar': area.defaultKmPerYear / 1000,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip
                      formatter={(value: number) => [`${value}k km`, 'Km/jaar']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="Km/jaar" radius={[2, 2, 0, 0]}>
                      {drivingAreas?.map((area) => {
                        const isHovered = hoveredId === area.id
                        const isSelected = selectedId === area.id
                        return (
                          <Cell
                            key={area.id}
                            fill={isSelected ? '#f29100' : isHovered ? '#ffa726' : '#9ca3af'}
                            opacity={isHovered || isSelected || !hoveredId ? 1 : 0.4}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Radar Chart - Multi-dimensional Comparison */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Multi-dimensionele Analyse
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={160}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: '#6b7280' }} />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: '#6b7280' }}
                    />
                    <Radar
                      name="Regionaal"
                      dataKey="Regionaal"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={
                        selectedId === drivingAreas?.[0]?.id || hoveredId === drivingAreas?.[0]?.id
                          ? 0.5
                          : 0.05
                      }
                      strokeWidth={
                        selectedId === drivingAreas?.[0]?.id || hoveredId === drivingAreas?.[0]?.id
                          ? 2
                          : 1
                      }
                    />
                    <Radar
                      name="Nationaal"
                      dataKey="Nationaal"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={
                        selectedId === drivingAreas?.[1]?.id || hoveredId === drivingAreas?.[1]?.id
                          ? 0.5
                          : 0.05
                      }
                      strokeWidth={
                        selectedId === drivingAreas?.[1]?.id || hoveredId === drivingAreas?.[1]?.id
                          ? 2
                          : 1
                      }
                    />
                    <Radar
                      name="Nationaal+"
                      dataKey="Nationaal+"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={
                        selectedId === drivingAreas?.[2]?.id || hoveredId === drivingAreas?.[2]?.id
                          ? 0.5
                          : 0.05
                      }
                      strokeWidth={
                        selectedId === drivingAreas?.[2]?.id || hoveredId === drivingAreas?.[2]?.id
                          ? 2
                          : 1
                      }
                    />
                    <Radar
                      name="Internationaal"
                      dataKey="Internationaal"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={
                        selectedId === drivingAreas?.[3]?.id || hoveredId === drivingAreas?.[3]?.id
                          ? 0.5
                          : 0.05
                      }
                      strokeWidth={
                        selectedId === drivingAreas?.[3]?.id || hoveredId === drivingAreas?.[3]?.id
                          ? 2
                          : 1
                      }
                    />
                    <Tooltip contentStyle={{ fontSize: '11px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Bottom Row: Calculation Flow & Area Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Process Flow Diagram */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  TCO Berekening Flow
                </h3>
              </div>
              <div className="p-4">
                <div className="flex flex-col gap-2">
                  {/* Flow Step 1 */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold">
                      1
                    </div>
                    <div className="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        Rijgebied Input
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {selectedArea
                          ? `${selectedArea.name} • ${(selectedArea.defaultKmPerYear / 1000).toFixed(0)}k km/jr`
                          : 'Selecteer gebied'}
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="h-4 w-0.5 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500" />
                  </div>

                  {/* Flow Step 2 */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold">
                      2
                    </div>
                    <div className="flex-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        Verbruiksberekening
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Km/jr × Brandstofverbruik × Brandstofprijs
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <div className="h-4 w-0.5 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500" />
                  </div>

                  {/* Flow Step 3 */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-semibold">
                      3
                    </div>
                    <div className="flex-1 rounded border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 px-3 py-2">
                      <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        TCO Output
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Totale eigendomskosten over periode
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Area Chart */}
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Cumulatieve Analyse
                </h3>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="Km/jaar"
                      stroke="#f29100"
                      fill="#f29100"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="Cum. Km"
                      stroke="#08192c"
                      strokeWidth={2}
                      dot={{ fill: '#08192c', r: 3, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      {selectedId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center pt-2"
        >
          <Button onClick={handleContinue} size="lg" className="bg-orange-500 hover:bg-orange-600">
            Ga verder naar parameters
          </Button>
        </motion.div>
      )}
    </div>
  )
}
