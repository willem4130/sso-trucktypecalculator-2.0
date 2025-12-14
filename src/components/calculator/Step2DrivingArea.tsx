'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Check, Navigation } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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
  Nationaal: Navigation,
  'Nationaal+': Navigation,
  Internationaal: Navigation,
}

export function Step2DrivingArea({ session, onComplete }: Step2Props) {
  const [selectedId, setSelectedId] = useState<string | null>(session.drivingAreaId || null)

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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Selecteer uw rijgebied
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Kies het gebied waarin u voornamelijk rijdt
        </p>
        {session.vehicleType && (
          <p className="mt-1 text-xs text-orange-600 dark:text-orange-500">
            Geselecteerd voertuig: {session.vehicleType.name}
          </p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {drivingAreas?.map((area: DrivingArea, index: number) => {
          const isSelected = selectedId === area.id
          const Icon = areaIcons[area.name as keyof typeof areaIcons] || MapPin

          return (
            <motion.div
              key={area.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={cn(
                  'group relative cursor-pointer overflow-hidden border-2 p-3 transition-all hover:shadow-lg',
                  {
                    'border-orange-500 bg-orange-50 dark:bg-orange-950/20': isSelected,
                    'border-gray-200 hover:border-orange-300 dark:border-gray-700 dark:hover:border-orange-700':
                      !isSelected,
                  }
                )}
                onClick={() => handleSelect(area.id)}
              >
                {/* Selected Indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white"
                  >
                    <Check className="h-4 w-4" />
                  </motion.div>
                )}

                {/* Area Icon */}
                <div
                  className={cn(
                    'mb-2 flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                    {
                      'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400':
                        isSelected,
                      'bg-gray-100 text-gray-600 group-hover:bg-orange-50 group-hover:text-orange-600 dark:bg-gray-800 dark:text-gray-400':
                        !isSelected,
                    }
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Area Info */}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {area.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{area.description}</p>

                  <div className="pt-1">
                    <div className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {(area.defaultKmPerYear / 1000).toFixed(0)}k km/jaar
                    </div>
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

      {/* Visual Comparison Chart */}
      {drivingAreas && drivingAreas.length > 0 && (
        <Card className="mt-2 border-[#08192c]/10 bg-gradient-to-br from-white to-blue-50/30 p-3 shadow-lg dark:from-gray-800 dark:to-[#08192c]/20">
          <h3 className="mb-2 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
            Km/jaar Vergelijking
          </h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={drivingAreas.map((area) => ({
                name: area.name,
                'Km/jaar': area.defaultKmPerYear / 1000, // Show in thousands
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ value: 'Duizend km', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number) => [`${value}k km`, 'Km/jaar']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="Km/jaar" fill="#f29100" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Continue Button */}
      {selectedId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center pt-4"
        >
          <Button onClick={handleContinue} size="lg" className="bg-orange-500 hover:bg-orange-600">
            Ga verder naar parameters
          </Button>
        </motion.div>
      )}
    </div>
  )
}
