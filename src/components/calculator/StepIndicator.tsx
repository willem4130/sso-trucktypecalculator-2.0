'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  number: number
  title: string
  description: string
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Voertuig',
    description: 'Selecteer type',
  },
  {
    number: 2,
    title: 'Rijgebied',
    description: 'Kies gebied',
  },
  {
    number: 3,
    title: 'Parameters',
    description: 'Vul gegevens in',
  },
  {
    number: 4,
    title: 'Resultaten',
    description: 'TCO vergelijking',
  },
]

interface StepIndicatorProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-0 top-5 h-0.5 w-full bg-gray-200 dark:bg-gray-700" />
        <motion.div
          className="absolute left-0 top-5 h-0.5 bg-gradient-to-r from-orange-500 to-orange-600"
          initial={{ width: '0%' }}
          animate={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = currentStep > step.number
            const isCurrent = currentStep === step.number

            return (
              <div key={step.number} className="flex flex-col items-center">
                {/* Step Circle */}
                <motion.div
                  className={cn(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-900',
                    {
                      'border-orange-500 text-orange-500': isCurrent,
                      'border-orange-500 bg-orange-500 text-white': isCompleted,
                      'border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500':
                        !isCurrent && !isCompleted,
                    }
                  )}
                  initial={{ scale: 0.8 }}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Check className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <span className="font-semibold">{step.number}</span>
                  )}
                </motion.div>

                {/* Step Label */}
                <div className="mt-2 text-center">
                  <motion.p
                    className={cn('text-sm font-medium', {
                      'text-orange-600 dark:text-orange-500': isCurrent,
                      'text-gray-900 dark:text-gray-100': isCompleted,
                      'text-gray-500 dark:text-gray-400': !isCurrent && !isCompleted,
                    })}
                    animate={{
                      scale: isCurrent ? 1.05 : 1,
                    }}
                  >
                    {step.title}
                  </motion.p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
