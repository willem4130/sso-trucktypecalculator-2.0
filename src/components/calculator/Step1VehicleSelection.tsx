'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Truck, Check } from 'lucide-react'
import { api } from '@/trpc/react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { CalculationSession, VehicleType } from '@prisma/client'

interface Step1Props {
  session: CalculationSession & {
    vehicleType: VehicleType | null
    drivingArea: unknown | null
  }
  onComplete: (vehicleTypeId: string) => void
}

export function Step1VehicleSelection({ session, onComplete }: Step1Props) {
  const [selectedId, setSelectedId] = useState<string | null>(session.vehicleTypeId || null)

  // Fetch all vehicle types
  const { data: vehicleTypes, isLoading } = api.calculator.getVehicleTypes.useQuery()

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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Selecteer uw voertuigtype
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Kies het type vrachtauto waarvoor u de TCO wilt berekenen
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicleTypes?.map((vehicle: VehicleType, index: number) => {
          const isSelected = selectedId === vehicle.id

          return (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'group relative cursor-pointer overflow-hidden border-2 p-6 transition-all hover:shadow-lg',
                  {
                    'border-orange-500 bg-orange-50 dark:bg-orange-950/20': isSelected,
                    'border-gray-200 hover:border-orange-300 dark:border-gray-700 dark:hover:border-orange-700':
                      !isSelected,
                  }
                )}
                onClick={() => handleSelect(vehicle.id)}
              >
                {/* Selected Indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white"
                  >
                    <Check className="h-5 w-5" />
                  </motion.div>
                )}

                {/* Vehicle Icon */}
                <div
                  className={cn(
                    'mb-4 flex h-16 w-16 items-center justify-center rounded-lg transition-colors',
                    {
                      'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400':
                        isSelected,
                      'bg-gray-100 text-gray-600 group-hover:bg-orange-50 group-hover:text-orange-600 dark:bg-gray-800 dark:text-gray-400':
                        !isSelected,
                    }
                  )}
                >
                  <Truck className="h-8 w-8" />
                </div>

                {/* Vehicle Info */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {vehicle.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{vehicle.description}</p>

                  <div className="pt-2 text-xs text-gray-500 dark:text-gray-500">
                    <p>GVW: {vehicle.defaultGvw ? (vehicle.defaultGvw / 1000).toFixed(1) : '-'}t</p>
                    <p>
                      Payload:{' '}
                      {vehicle.defaultPayload ? (vehicle.defaultPayload / 1000).toFixed(1) : '-'}t
                    </p>
                  </div>
                </div>

                {/* Hover Effect Border */}
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-orange-500"
                  initial={{ width: '0%' }}
                  animate={{ width: isSelected ? '100%' : '0%' }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Continue Button */}
      {selectedId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center pt-4"
        >
          <Button onClick={handleContinue} size="lg" className="bg-orange-500 hover:bg-orange-600">
            Ga verder naar rijgebied
          </Button>
        </motion.div>
      )}
    </div>
  )
}
