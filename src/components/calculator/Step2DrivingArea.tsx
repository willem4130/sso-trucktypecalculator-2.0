'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  Check,
  Map,
  Globe,
  Zap,
  LayoutList,
  LayoutGrid,
  Euro,
  Battery,
  Fuel,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react'
import { NetherlandsMap } from '@/components/maps/NetherlandsMap'
import { api } from '@/trpc/react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { CalculationSession, VehicleType, DrivingArea } from '@prisma/client'

type ViewMode = 'simple' | 'detailed'

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

// Business-focused cost estimation (simplified for demo)
const estimateAnnualCosts = (area: DrivingArea, vehicleType: VehicleType | null) => {
  if (!vehicleType) return null

  const kmPerYear = area.defaultKmPerYear
  // Simplified cost estimates based on area and vehicle
  const baseFuelCostPerKm = 0.45 // €0.45/km for diesel baseline
  const tollCostPerKm =
    area.name === 'Internationaal' ? 0.15 : area.name === 'Nationaal+' ? 0.1 : 0.05

  const fuelCost = kmPerYear * baseFuelCostPerKm
  const tollCost = kmPerYear * tollCostPerKm
  const maintenanceCost = kmPerYear * 0.08 // €0.08/km maintenance

  return {
    fuelCost: Math.round(fuelCost),
    tollCost: Math.round(tollCost),
    maintenanceCost: Math.round(maintenanceCost),
    totalAnnual: Math.round(fuelCost + tollCost + maintenanceCost),
  }
}

// Infrastructure readiness score (0-100)
const getInfrastructureReadiness = (area: DrivingArea) => {
  const scores = {
    Regionaal: { charging: 95, hydrogen: 30, diesel: 100 },
    Nationaal: { charging: 85, hydrogen: 50, diesel: 100 },
    'Nationaal+': { charging: 75, hydrogen: 65, diesel: 100 },
    Internationaal: { charging: 60, hydrogen: 40, diesel: 100 },
  }
  return scores[area.name as keyof typeof scores] || { charging: 50, hydrogen: 30, diesel: 100 }
}

// Operational feasibility score
const getOperationalFeasibility = (area: DrivingArea, vehicleType: VehicleType | null) => {
  if (!vehicleType) return 50

  // Factors: range requirements, charging time impact, operational complexity
  const areaComplexity = {
    Regionaal: 20, // Low complexity
    Nationaal: 50, // Medium
    'Nationaal+': 70, // High
    Internationaal: 90, // Very high
  }

  const complexity = areaComplexity[area.name as keyof typeof areaComplexity] || 50
  const feasibility = 100 - complexity * 0.3 // Higher complexity = lower feasibility for alt fuels

  return Math.round(feasibility)
}

export function Step2DrivingArea({ session, onComplete }: Step2Props) {
  const [selectedId, setSelectedId] = useState<string | null>(session.drivingAreaId || null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')

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

  const selectedArea = drivingAreas?.find((a) => a.id === selectedId)
  const hoveredArea = hoveredId ? drivingAreas?.find((a) => a.id === hoveredId) : null
  const displayArea = hoveredArea || selectedArea

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="mb-4 border-b border-gray-200 pb-3 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Rijgebied Selectie
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Selecteer operationeel gebied en bekijk kostenschatting
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded bg-gray-100 p-1 dark:bg-gray-800">
              <button
                onClick={() => setViewMode('simple')}
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-all',
                  viewMode === 'simple'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                )}
                title="Overzicht - Kaart en selectie"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Overzicht</span>
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-all',
                  viewMode === 'detailed'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                )}
                title="Analyse - Kosten en haalbaarheid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Analyse</span>
              </button>
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
      </div>

      {/* Main Layout */}
      <div className="grid gap-3 lg:grid-cols-12">
        {/* Left: Area Selection */}
        <div className={cn(viewMode === 'simple' ? 'lg:col-span-4' : 'lg:col-span-4')}>
          <Card className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Rijgebieden
              </h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {drivingAreas?.map((area: DrivingArea, index: number) => {
                const isSelected = selectedId === area.id
                const Icon = areaIcons[area.name as keyof typeof areaIcons] || MapPin
                const costs = estimateAnnualCosts(area, session.vehicleType)

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
                        className={cn('absolute left-0 top-0 h-full w-0.5 transition-colors', {
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {area.name}
                          </div>
                          {isSelected && <Check className="h-4 w-4 shrink-0 text-orange-500" />}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{(area.defaultKmPerYear / 1000).toFixed(0)}k km/jr</span>
                          {costs && (
                            <>
                              <span>•</span>
                              <span className="font-medium">
                                ~€{(costs.totalAnnual / 1000).toFixed(0)}k/jr
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </Card>

          {/* Continue Button */}
          {selectedArea && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
              <Button onClick={handleContinue} className="w-full bg-orange-500 hover:bg-orange-600">
                Ga door naar Parameters
              </Button>
            </motion.div>
          )}
        </div>

        {/* Right: Business Insights Dashboard */}
        <div className="lg:col-span-8">
          {viewMode === 'simple' && (
            <Card className="overflow-hidden border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Dekkingsgebied Nederland
                </h3>
              </div>
              <div className="h-[400px] p-4">
                <NetherlandsMap
                  selectedArea={selectedArea?.name || null}
                  hoveredArea={displayArea?.name || null}
                />
              </div>
            </Card>
          )}

          {viewMode === 'detailed' && displayArea && (
            <div className="space-y-3">
              {/* Cost Estimation Cards */}
              <div className="grid grid-cols-2 gap-3">
                {(() => {
                  const costs = estimateAnnualCosts(displayArea, session.vehicleType)
                  if (!costs) return null

                  return (
                    <>
                      <Card className="border-gray-200 p-3 dark:border-gray-700">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Brandstofkosten
                          </h4>
                          <Fuel className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          €{(costs.fuelCost / 1000).toFixed(0)}k
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Per jaar (schatting)
                        </div>
                      </Card>

                      <Card className="border-gray-200 p-3 dark:border-gray-700">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Totale Operationeel
                          </h4>
                          <Euro className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          €{(costs.totalAnnual / 1000).toFixed(0)}k
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Brandstof + Tol + Onderhoud
                        </div>
                      </Card>

                      <Card className="border-gray-200 p-3 dark:border-gray-700">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Tolkosten
                          </h4>
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          €{(costs.tollCost / 1000).toFixed(0)}k
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          {displayArea.name === 'Internationaal'
                            ? 'Hoog (int. tol)'
                            : displayArea.name === 'Nationaal+'
                              ? 'Gemiddeld'
                              : 'Laag'}
                        </div>
                      </Card>

                      <Card className="border-gray-200 p-3 dark:border-gray-700">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Onderhoudskosten
                          </h4>
                          <CheckCircle className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                          €{(costs.maintenanceCost / 1000).toFixed(0)}k
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          €0.08/km standaard
                        </div>
                      </Card>
                    </>
                  )
                })()}
              </div>

              {/* Infrastructure & Feasibility - Side by Side */}
              <div className="grid gap-3 lg:grid-cols-2">
                {/* Infrastructure Readiness */}
                <Card className="border-gray-200 dark:border-gray-700">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Infrastructuur Gereedheid
                    </h3>
                  </div>
                  <div className="space-y-3 p-4">
                    {(() => {
                      const infra = getInfrastructureReadiness(displayArea)
                      return (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Battery className="h-3.5 w-3.5 text-green-600" />
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  Laadinfrastructuur (BEV)
                                </span>
                              </div>
                              <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                {infra.charging}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className="h-full rounded-full bg-green-500 transition-all"
                                style={{ width: `${infra.charging}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {infra.charging >= 80
                                ? '✓ Uitstekende dekking, geschikt voor dagelijks gebruik'
                                : infra.charging >= 60
                                  ? '⚠ Adequate dekking, planning vereist'
                                  : '⚠ Beperkte dekking, niet aanbevolen'}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Zap className="h-3.5 w-3.5 text-cyan-600" />
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  Waterstofstations (FCEV)
                                </span>
                              </div>
                              <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                {infra.hydrogen}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className="h-full rounded-full bg-cyan-500 transition-all"
                                style={{ width: `${infra.hydrogen}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {infra.hydrogen >= 60
                                ? '✓ Groeiende dekking, geschikt met planning'
                                : infra.hydrogen >= 40
                                  ? '⚠ Beperkte stations, zorgvuldige route planning'
                                  : '⚠ Zeer beperkt, alleen voor pilotprojecten'}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Fuel className="h-3.5 w-3.5 text-gray-600" />
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  Diesel/Benzine Tankstations
                                </span>
                              </div>
                              <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                                {infra.diesel}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className="h-full rounded-full bg-gray-600 transition-all"
                                style={{ width: `${infra.diesel}%` }}
                              />
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              ✓ Volledige dekking, geen beperkingen
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </Card>

                {/* Operational Feasibility */}
                <Card className="border-gray-200 dark:border-gray-700">
                  <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Operationele Haalbaarheid
                    </h3>
                  </div>
                  <div className="p-4">
                    {(() => {
                      const feasibility = getOperationalFeasibility(
                        displayArea,
                        session.vehicleType
                      )
                      const complexityText = {
                        Regionaal: 'Laag - Kortere routes, frequente mogelijkheden om te laden',
                        Nationaal: 'Gemiddeld - Voldoende laadinfra, planning noodzakelijk',
                        'Nationaal+':
                          'Hoog - Langere routes, nauwkeurige planning en backup vereist',
                        Internationaal:
                          'Zeer hoog - Grensoverschrijdend, complexe planning, infrastructuur varieert',
                      }

                      return (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'flex h-16 w-16 shrink-0 items-center justify-center rounded-lg',
                                feasibility >= 70
                                  ? 'bg-green-100 dark:bg-green-950/20'
                                  : feasibility >= 50
                                    ? 'bg-amber-100 dark:bg-amber-950/20'
                                    : 'bg-red-100 dark:bg-red-950/20'
                              )}
                            >
                              <div className="text-center">
                                <div
                                  className={cn(
                                    'text-2xl font-bold tabular-nums',
                                    feasibility >= 70
                                      ? 'text-green-600'
                                      : feasibility >= 50
                                        ? 'text-amber-600'
                                        : 'text-red-600'
                                  )}
                                >
                                  {feasibility}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  score
                                </div>
                              </div>
                            </div>

                            <div className="flex-1">
                              <div className="mb-2 flex items-center gap-2">
                                {feasibility >= 70 ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : feasibility >= 50 ? (
                                  <Info className="h-4 w-4 text-amber-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {feasibility >= 70
                                    ? 'Goed Haalbaar'
                                    : feasibility >= 50
                                      ? 'Haalbaar met Planning'
                                      : 'Uitdagend'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                <strong>Complexiteit:</strong>{' '}
                                {complexityText[displayArea.name as keyof typeof complexityText]}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
                            <div className="mb-1.5 flex items-center gap-2">
                              <Info className="h-4 w-4 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                                Zakelijke Aanbeveling
                              </span>
                            </div>
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                              {displayArea.name === 'Regionaal' && (
                                <>
                                  BEV zeer geschikt voor regionale routes. Lage operationele kosten,
                                  uitstekende laadinfra. <strong>ROI: 3-4 jaar</strong>
                                </>
                              )}
                              {displayArea.name === 'Nationaal' && (
                                <>
                                  BEV/FCEV geschikt met goede planning. BEV voordeliger, FCEV voor
                                  langere single-trips. <strong>ROI: 4-5 jaar</strong>
                                </>
                              )}
                              {displayArea.name === 'Nationaal+' && (
                                <>
                                  FCEV of Diesel aanbevolen. BEV mogelijk met uitgebreide
                                  laadinfrastructuur. <strong>ROI: 5-6 jaar</strong>
                                </>
                              )}
                              {displayArea.name === 'Internationaal' && (
                                <>
                                  Diesel of FCEV aanbevolen voor internationale routes. BEV
                                  uitdagend door infrastructuurverschillen.{' '}
                                  <strong>ROI: 6-7 jaar</strong>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </Card>
              </div>

              {/* Map */}
              <Card className="overflow-hidden border-gray-200 dark:border-gray-700">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Dekkingsgebied Nederland
                  </h3>
                </div>
                <div className="h-[300px] p-4">
                  <NetherlandsMap
                    selectedArea={selectedArea?.name || null}
                    hoveredArea={displayArea?.name || null}
                  />
                </div>
              </Card>
            </div>
          )}

          {!displayArea && viewMode === 'detailed' && (
            <Card className="flex h-[500px] items-center justify-center border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Selecteer een rijgebied
                </h3>
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  Kies een gebied links om kosten en haalbaarheid te zien
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
