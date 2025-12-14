import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

// Input schemas
const sessionKeyInput = z.object({
  sessionKey: z.string().optional(),
})

const updateSessionInput = z.object({
  sessionKey: z.string(),
  step: z.number().int().min(1).max(4),
  vehicleTypeId: z.string().optional(),
  drivingAreaId: z.string().optional(),
  parametersData: z.record(z.string(), z.unknown()).optional(),
})

const calculateTCOInput = z.object({
  sessionKey: z.string(),
  vehicleTypeId: z.string(),
  drivingAreaId: z.string(),
  parametersData: z.object({
    // Vehicle characteristics
    purchasePrice: z.number(),
    gvw: z.number().optional(),
    payload: z.number().optional(),

    // Consumption
    kmPerYear: z.number(),
    fuelType: z.enum(['diesel', 'bev', 'fcev', 'h2ice']),
    consumption: z.number(), // L/100km or kWh/100km or kg/100km

    // Taxes
    motorTax: z.number().optional(),
    truckToll: z.number().optional(),

    // Subsidies
    subsidy: z.number().optional(),

    // Financial
    interestRate: z.number().optional(),
    depreciationYears: z.number().optional(),

    // Extra
    maintenanceCostPerKm: z.number().optional(),
    insurancePercentage: z.number().optional(),
  }),
})

const exportPDFInput = z.object({
  sessionKey: z.string(),
})

export const calculatorRouter = createTRPCRouter({
  // 1. Get all vehicle types (6 categories)
  getVehicleTypes: publicProcedure.query(async ({ ctx }) => {
    const vehicleTypes = await ctx.db.vehicleType.findMany({
      orderBy: { name: 'asc' },
    })
    return vehicleTypes
  }),

  // 2. Get all driving areas (4 categories)
  getDrivingAreas: publicProcedure.query(async ({ ctx }) => {
    const drivingAreas = await ctx.db.drivingArea.findMany({
      orderBy: { defaultKmPerYear: 'asc' },
    })
    return drivingAreas
  }),

  // 3. Get or create calculation session
  getOrCreateSession: publicProcedure.input(sessionKeyInput).query(async ({ ctx, input }) => {
    // If sessionKey provided, try to find existing session
    if (input.sessionKey) {
      const existingSession = await ctx.db.calculationSession.findUnique({
        where: { sessionKey: input.sessionKey },
        include: {
          vehicleType: true,
          drivingArea: true,
        },
      })

      if (existingSession) {
        return existingSession
      }
    }

    // Create new session
    const newSession = await ctx.db.calculationSession.create({
      data: {
        currentStep: 1,
        isCompleted: false,
      },
      include: {
        vehicleType: true,
        drivingArea: true,
      },
    })

    return newSession
  }),

  // 4. Update calculation session
  updateSession: publicProcedure.input(updateSessionInput).mutation(async ({ ctx, input }) => {
    const { sessionKey, step, vehicleTypeId, drivingAreaId, parametersData } = input

    // Find session
    const session = await ctx.db.calculationSession.findUnique({
      where: { sessionKey },
    })

    if (!session) {
      throw new Error('Session not found')
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      currentStep: step,
    }

    if (vehicleTypeId) {
      updateData.vehicleTypeId = vehicleTypeId
    }

    if (drivingAreaId) {
      updateData.drivingAreaId = drivingAreaId
    }

    if (parametersData) {
      updateData.parametersData = parametersData
    }

    // Mark as completed if on step 4
    if (step === 4) {
      updateData.isCompleted = true
    }

    // Update session
    const updatedSession = await ctx.db.calculationSession.update({
      where: { sessionKey },
      data: updateData,
      include: {
        vehicleType: true,
        drivingArea: true,
      },
    })

    return updatedSession
  }),

  // 5. Calculate TCO for all fuel types
  calculateTCO: publicProcedure.input(calculateTCOInput).mutation(async ({ ctx, input }) => {
    const { sessionKey, vehicleTypeId, drivingAreaId, parametersData } = input

    // Get active preset for tax rates and defaults
    const preset = await ctx.db.calculationPreset.findFirst({
      where: { isActive: true },
    })

    if (!preset) {
      throw new Error('No active calculation preset found')
    }

    // Get vehicle type and driving area
    const vehicleType = await ctx.db.vehicleType.findUnique({
      where: { id: vehicleTypeId },
    })

    const drivingArea = await ctx.db.drivingArea.findUnique({
      where: { id: drivingAreaId },
    })

    if (!vehicleType || !drivingArea) {
      throw new Error('Vehicle type or driving area not found')
    }

    // Calculate TCO for each fuel type
    const fuelTypes = ['diesel', 'bev', 'fcev', 'h2ice'] as const
    const results: Record<
      string,
      {
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
    > = {}

    const depreciationYears = parametersData.depreciationYears || preset.depreciationYears
    const interestRate = parametersData.interestRate || preset.interestRate

    for (const fuelType of fuelTypes) {
      // Get fuel type specific consumption and price
      let consumption: number
      let fuelPricePerUnit: number
      let truckToll: number

      if (fuelType === 'diesel') {
        consumption = preset.dieselConsumption
        fuelPricePerUnit = preset.dieselPricePerLiter
        truckToll = preset.truckTollDiesel
      } else if (fuelType === 'bev') {
        consumption = preset.bevConsumption
        fuelPricePerUnit = preset.electricityPricePerKwh
        truckToll = preset.truckTollBev
      } else if (fuelType === 'fcev') {
        consumption = preset.fcevConsumption
        fuelPricePerUnit = preset.hydrogenPricePerKg
        truckToll = preset.truckTollBev // Same as BEV
      } else {
        // h2ice
        consumption = preset.h2iceConsumption
        fuelPricePerUnit = preset.hydrogenPricePerKg
        truckToll = preset.truckTollBev // Same as BEV
      }

      // Calculate costs over depreciation period
      const kmPerYear = parametersData.kmPerYear
      const totalKm = kmPerYear * depreciationYears

      // 1. Purchase cost (with depreciation)
      const purchaseCost = parametersData.purchasePrice

      // 2. Fuel cost
      const fuelCostPerYear = (kmPerYear * consumption * fuelPricePerUnit) / 100
      const totalFuelCost = fuelCostPerYear * depreciationYears

      // 3. Maintenance cost
      const defaultMaintenance =
        (preset.defaultValues as { maintenanceCostPerKm?: Record<string, number> })
          ?.maintenanceCostPerKm?.[fuelType] || 0.15
      const maintenanceCostPerKm = parametersData.maintenanceCostPerKm || defaultMaintenance
      const totalMaintenanceCost = totalKm * maintenanceCostPerKm

      // 4. Taxes (motor tax + truck toll)
      const motorTax = parametersData.motorTax || preset.motorTaxPerYear
      const totalTaxesCost = (motorTax + truckToll) * depreciationYears

      // 5. Insurance
      const insurancePercentage = parametersData.insurancePercentage || 2.5
      const insuranceCostPerYear = (purchaseCost * insurancePercentage) / 100
      const totalInsuranceCost = insuranceCostPerYear * depreciationYears

      // 6. Subsidy (one-time credit)
      const defaultSubsidies =
        (preset.defaultValues as { subsidies?: Record<string, number> })?.subsidies || {}
      const subsidy = parametersData.subsidy || defaultSubsidies[fuelType] || 0

      // 7. Interest cost (on purchase price)
      const interestCostPerYear = (purchaseCost * interestRate) / 100
      const totalInterestCost = interestCostPerYear * depreciationYears

      // Total operating cost (excluding purchase cost)
      const totalOperatingCost =
        totalFuelCost + totalMaintenanceCost + totalTaxesCost + totalInsuranceCost

      // Total cost over depreciation period
      const totalCost = purchaseCost + totalOperatingCost + totalInterestCost - subsidy

      // Cost per km
      const costPerKm = totalCost / totalKm

      // CO2 emissions (simplified calculation)
      // Diesel: ~2.6 kg CO2/L, BEV: ~0.4 kg CO2/kWh (grid mix), FCEV/H2ICE: depends on H2 source
      let co2PerUnit: number
      if (fuelType === 'diesel') {
        co2PerUnit = 2.6 // kg CO2 per liter
      } else if (fuelType === 'bev') {
        co2PerUnit = 0.4 // kg CO2 per kWh (EU grid mix)
      } else {
        co2PerUnit = 0.0 // Assume green hydrogen (for now)
      }

      const co2Emissions = (totalKm * consumption * co2PerUnit) / 100 // Total kg CO2

      results[fuelType] = {
        fuelType,
        totalCost: Math.round(totalCost * 100) / 100,
        costPerKm: Math.round(costPerKm * 100) / 100,
        co2Emissions: Math.round(co2Emissions),
        breakdown: {
          purchaseCost: Math.round(purchaseCost * 100) / 100,
          fuelCost: Math.round(totalFuelCost * 100) / 100,
          maintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
          taxesCost: Math.round(totalTaxesCost * 100) / 100,
          insuranceCost: Math.round(totalInsuranceCost * 100) / 100,
          subsidyCredit: Math.round(subsidy * 100) / 100,
          interestCost: Math.round(totalInterestCost * 100) / 100,
          totalOperatingCost: Math.round(totalOperatingCost * 100) / 100,
        },
      }
    }

    // Save results to session
    await ctx.db.calculationSession.update({
      where: { sessionKey },
      data: {
        resultsData: results,
        currentStep: 4,
        isCompleted: true,
      },
    })

    return {
      results,
      metadata: {
        vehicleType: vehicleType.name,
        drivingArea: drivingArea.name,
        kmPerYear: parametersData.kmPerYear,
        depreciationYears,
        calculatedAt: new Date(),
      },
    }
  }),

  // 6. Export calculation to PDF
  exportPDF: publicProcedure.input(exportPDFInput).query(async ({ ctx, input }) => {
    const { sessionKey } = input

    // Get session with results
    const session = await ctx.db.calculationSession.findUnique({
      where: { sessionKey },
      include: {
        vehicleType: true,
        drivingArea: true,
      },
    })

    if (!session || !session.resultsData) {
      throw new Error('Session not found or calculation not completed')
    }

    // Return session data for PDF generation on client side
    // (jsPDF works better on the client side for complex layouts)
    return {
      sessionKey,
      vehicleType: session.vehicleType?.name,
      drivingArea: session.drivingArea?.name,
      parametersData: session.parametersData,
      resultsData: session.resultsData,
      createdAt: session.createdAt,
    }
  }),
})
