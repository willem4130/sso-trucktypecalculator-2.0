'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Truck, Check, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { api } from '@/trpc/react'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import type { CalculationSession, VehicleType } from '@prisma/client'
import { TruckIllustration } from '@/components/ui/truck-illustration'

interface Step1Props {
  session: CalculationSession & {
    vehicleType: VehicleType | null
    drivingArea: unknown | null
  }
  onComplete: (vehicleTypeId: string) => void
}

type SortField = 'name' | 'defaultGvw' | 'defaultPayload'
type SortDirection = 'asc' | 'desc' | null

export function Step1VehicleSelection({ session, onComplete }: Step1Props) {
  const [selectedId, setSelectedId] = useState<string | null>(session.vehicleTypeId || null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Fetch all vehicle types
  const { data: vehicleTypes, isLoading } = api.calculator.getVehicleTypes.useQuery()

  // Sort vehicle types
  const sortedVehicles = useMemo(() => {
    if (!vehicleTypes || !sortDirection) return vehicleTypes || []

    return [...vehicleTypes].sort((a, b) => {
      let aVal: string | number | null
      let bVal: string | number | null

      if (sortField === 'name') {
        aVal = a.name
        bVal = b.name
      } else {
        aVal = a[sortField]
        bVal = b[sortField]
      }

      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [vehicleTypes, sortField, sortDirection])

  const selectedVehicle = sortedVehicles.find((v) => v.id === selectedId)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction: asc -> desc -> null -> asc
      if (sortDirection === 'asc') setSortDirection('desc')
      else if (sortDirection === 'desc') setSortDirection(null)
      else setSortDirection('asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Selection handler - saves to session immediately
  const handleSelect = (id: string) => {
    setSelectedId(id)
    onComplete(id) // Save to session
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field || !sortDirection) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-orange-500" />
    ) : (
      <ArrowDown className="h-3 w-3 text-orange-500" />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          VOERTUIG SELECTIE
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Selecteer uw voertuigtype uit de vergelijkingstabel
        </p>
      </div>

      {/* Main Content: Table + Detail Panel */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Panel: Comparison Table (8 cols) */}
        <div className="col-span-12 lg:col-span-8">
          <Card className="overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                    {/* Vehicle Type Column */}
                    <th className="px-4 py-2 text-left">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-orange-500 dark:text-gray-400"
                      >
                        Voertuigtype
                        {getSortIcon('name')}
                      </button>
                    </th>

                    {/* Description Column */}
                    <th className="hidden px-4 py-2 text-left md:table-cell">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                        Beschrijving
                      </span>
                    </th>

                    {/* GVW Column */}
                    <th className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleSort('defaultGvw')}
                        className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-orange-500 dark:text-gray-400"
                      >
                        GVW (ton)
                        {getSortIcon('defaultGvw')}
                      </button>
                    </th>

                    {/* Payload Column */}
                    <th className="px-4 py-2 text-right">
                      <button
                        onClick={() => handleSort('defaultPayload')}
                        className="ml-auto flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-orange-500 dark:text-gray-400"
                      >
                        Lading (ton)
                        {getSortIcon('defaultPayload')}
                      </button>
                    </th>

                    {/* Selection Column */}
                    <th className="w-10 px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVehicles.map((vehicle, index) => {
                    const isSelected = selectedId === vehicle.id

                    return (
                      <motion.tr
                        key={vehicle.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleSelect(vehicle.id)}
                        className={cn(
                          'cursor-pointer border-b border-gray-100 transition-colors dark:border-gray-800',
                          {
                            'bg-orange-50 dark:bg-orange-950/20': isSelected,
                            'hover:bg-gray-50 dark:hover:bg-gray-800/50': !isSelected,
                          }
                        )}
                      >
                        {/* Vehicle Type */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'flex h-8 w-8 items-center justify-center rounded border',
                                {
                                  'border-orange-200 bg-orange-100 text-orange-600 dark:border-orange-800 dark:bg-orange-900 dark:text-orange-400':
                                    isSelected,
                                  'border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400':
                                    !isSelected,
                                }
                              )}
                            >
                              <Truck className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {vehicle.name}
                            </span>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {vehicle.description}
                          </span>
                        </td>

                        {/* GVW */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-sm tabular-nums text-gray-900 dark:text-gray-100">
                            {vehicle.defaultGvw ? (vehicle.defaultGvw / 1000).toFixed(1) : '-'}
                          </span>
                        </td>

                        {/* Payload */}
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-sm tabular-nums text-gray-900 dark:text-gray-100">
                            {vehicle.defaultPayload
                              ? (vehicle.defaultPayload / 1000).toFixed(1)
                              : '-'}
                          </span>
                        </td>

                        {/* Selection Indicator */}
                        <td className="px-4 py-3">
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white"
                            >
                              <Check className="h-3 w-3" />
                            </motion.div>
                          )}
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {sortedVehicles.length} voertuigtypen beschikbaar • Klik op kolomkoppen om te
                sorteren
              </p>
            </div>
          </Card>
        </div>

        {/* Right Panel: Vehicle Detail (4 cols) */}
        <div className="col-span-12 lg:col-span-4">
          {selectedVehicle ? (
            <motion.div
              key={selectedVehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Vehicle Overview Card */}
              <Card className="border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      GESELECTEERD VOERTUIG
                    </h3>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedVehicle.name}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white">
                    <Check className="h-4 w-4" />
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedVehicle.description}
                </p>

                {/* Vehicle Illustration */}
                <div className="mt-4 flex h-32 items-center justify-center rounded-lg border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-900 dark:to-gray-800">
                  <TruckIllustration vehicleType={selectedVehicle.name} className="h-full w-full" />
                </div>
              </Card>

              {/* Technical Specifications Card */}
              <Card className="border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  TECHNISCHE SPECIFICATIES
                </h3>

                <div className="space-y-2">
                  {/* GVW */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Toegestaan totaalgewicht
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                      {selectedVehicle.defaultGvw
                        ? (selectedVehicle.defaultGvw / 1000).toFixed(1)
                        : '-'}{' '}
                      ton
                    </span>
                  </div>

                  {/* Payload */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Laadvermogen</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                      {selectedVehicle.defaultPayload
                        ? (selectedVehicle.defaultPayload / 1000).toFixed(1)
                        : '-'}{' '}
                      ton
                    </span>
                  </div>

                  {/* Empty Weight (calculated) */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Leeggewicht (geschat)
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                      {selectedVehicle.defaultGvw && selectedVehicle.defaultPayload
                        ? (
                            (selectedVehicle.defaultGvw - selectedVehicle.defaultPayload) /
                            1000
                          ).toFixed(1)
                        : '-'}{' '}
                      ton
                    </span>
                  </div>

                  {/* Category */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Categorie</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedVehicle.name.includes('Bakwagen')
                        ? 'Bakwagen'
                        : selectedVehicle.name.includes('Bouwvoertuig')
                          ? 'Bouwvoertuig'
                          : selectedVehicle.name.includes('Trekker')
                            ? 'Trekker'
                            : 'Vrachtauto'}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Comparison Metrics Card */}
              <Card className="border border-gray-200 p-4 dark:border-gray-700">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  VERGELIJKINGSMETRIEKEN
                </h3>

                <div className="space-y-3">
                  {/* Weight Class */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        Gewichtsklasse
                      </span>
                      <span className="font-mono text-xs tabular-nums text-gray-900 dark:text-gray-100">
                        {selectedVehicle.defaultGvw
                          ? selectedVehicle.defaultGvw >= 26000
                            ? 'Zwaar'
                            : selectedVehicle.defaultGvw >= 12000
                              ? 'Medium'
                              : 'Licht'
                          : '-'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full bg-orange-500"
                        style={{
                          width: selectedVehicle.defaultGvw
                            ? `${Math.min((selectedVehicle.defaultGvw / 40000) * 100, 100)}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </div>

                  {/* Payload Ratio */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Lading ratio</span>
                      <span className="font-mono text-xs tabular-nums text-gray-900 dark:text-gray-100">
                        {selectedVehicle.defaultGvw && selectedVehicle.defaultPayload
                          ? `${((selectedVehicle.defaultPayload / selectedVehicle.defaultGvw) * 100).toFixed(0)}%`
                          : '-'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width:
                            selectedVehicle.defaultGvw && selectedVehicle.defaultPayload
                              ? `${(selectedVehicle.defaultPayload / selectedVehicle.defaultGvw) * 100}%`
                              : '0%',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Selection saved - use wizard navigation buttons below */}
            </motion.div>
          ) : (
            // Empty State
            <Card className="border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900">
              <Truck className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-700" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                GEEN SELECTIE
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Selecteer een voertuigtype uit de tabel om details te bekijken
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
