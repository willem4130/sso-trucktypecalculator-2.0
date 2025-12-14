'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StepIndicator } from './StepIndicator'
import { Step1VehicleSelection } from './Step1VehicleSelection'
import { Step2DrivingArea } from './Step2DrivingArea'
import { Step3Parameters } from './Step3Parameters'
import { Step4Results } from './Step4Results'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'

const SESSION_KEY_STORAGE = 'tco-calculator-session-key'

export function CalculatorWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const utils = api.useUtils()

  // Get or create session
  const { data: session, isLoading } = api.calculator.getOrCreateSession.useQuery(
    { sessionKey: sessionKey || undefined },
    {
      refetchOnWindowFocus: false,
    }
  )

  // Update session mutation
  const updateSession = api.calculator.updateSession.useMutation({
    onSuccess: async () => {
      // Invalidate and refetch session to get updated data
      await utils.calculator.getOrCreateSession.invalidate()
      await utils.calculator.getOrCreateSession.refetch()
    },
    onError: (error: { message: string }) => {
      toast.error('Failed to save progress', {
        description: error.message,
      })
    },
  })

  // Initialize with fresh session on mount
  useEffect(() => {
    // Always start fresh - clear old session
    localStorage.removeItem(SESSION_KEY_STORAGE)
    setSessionKey(null) // Will trigger new session creation
  }, [])

  // Save session key to storage when session is created
  useEffect(() => {
    if (session?.sessionKey && session.sessionKey !== sessionKey) {
      setSessionKey(session.sessionKey)
      localStorage.setItem(SESSION_KEY_STORAGE, session.sessionKey)
    }
  }, [session?.sessionKey, sessionKey])

  // Initialize step from session on first load only
  useEffect(() => {
    if (session?.currentStep && currentStep === 1 && session.currentStep !== 1) {
      // Only sync on initial load if session has a saved step
      setCurrentStep(session.currentStep)
    }
  }, [session?.sessionKey]) // Only run when session is created

  const handleNext = async () => {
    if (!sessionKey || currentStep >= 4) return

    // Update session with new step
    await updateSession.mutateAsync({
      sessionKey,
      step: currentStep + 1,
    })

    setCurrentStep((prev) => prev + 1)
  }

  const handleBack = async () => {
    if (!sessionKey || currentStep <= 1) return

    // Update session with new step
    await updateSession.mutateAsync({
      sessionKey,
      step: currentStep - 1,
    })

    setCurrentStep((prev) => prev - 1)
  }

  const handleStepClick = async (step: number) => {
    if (!sessionKey) return

    // Update session with clicked step
    await updateSession.mutateAsync({
      sessionKey,
      step,
    })

    setCurrentStep(step)
  }

  const handleStepComplete = async (data: {
    vehicleTypeId?: string
    drivingAreaId?: string
    parametersData?: Record<string, unknown>
  }) => {
    if (!sessionKey) return

    // Save data WITHOUT auto-navigating
    await updateSession.mutateAsync({
      sessionKey,
      step: currentStep, // Don't increment step - user clicks Next
      ...data,
    })

    // Ensure session is refetched with updated data
    await utils.calculator.getOrCreateSession.refetch()
  }

  // Check if user can proceed to next step
  const canProceed = () => {
    if (currentStep === 1) return !!session?.vehicleTypeId
    if (currentStep === 2) return !!session?.drivingAreaId
    if (currentStep === 3) return !!session?.resultsData
    return false
  }

  // Animation variants for step transitions
  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  }

  if (isLoading) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      </Card>
    )
  }

  if (!session) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Failed to initialize calculator session. Please refresh the page.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />

      {/* Step Content */}
      <Card className="relative overflow-hidden p-6">
        <AnimatePresence mode="wait" custom={currentStep}>
          <motion.div
            key={currentStep}
            custom={currentStep}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
          >
            {currentStep === 1 && (
              <Step1VehicleSelection
                session={session}
                onComplete={(vehicleTypeId) => handleStepComplete({ vehicleTypeId })}
              />
            )}
            {currentStep === 2 && (
              <Step2DrivingArea
                session={session}
                onComplete={(drivingAreaId) => handleStepComplete({ drivingAreaId })}
              />
            )}
            {currentStep === 3 && (
              <Step3Parameters
                session={session}
                onComplete={(parametersData) => handleStepComplete({ parametersData })}
              />
            )}
            {currentStep === 4 && <Step4Results session={session} />}
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || updateSession.isPending}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Vorige
        </Button>

        {currentStep < 4 && (
          <Button
            onClick={handleNext}
            disabled={updateSession.isPending || !canProceed()}
            className="gap-2 bg-orange-500 hover:bg-orange-600"
          >
            {currentStep === 3 ? 'Bekijk Resultaten' : 'Volgende'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
