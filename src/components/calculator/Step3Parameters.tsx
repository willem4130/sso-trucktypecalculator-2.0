'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { CalculationSession, VehicleType, DrivingArea } from '@prisma/client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card } from '@/components/ui/card'

interface Step3Props {
  session: CalculationSession & {
    vehicleType: VehicleType | null
    drivingArea: DrivingArea | null
  }
  onComplete: (parametersData: Record<string, unknown>) => void
}

type FuelType = 'diesel' | 'bev' | 'fcev' | 'h2ice'

interface FormData {
  // Vehicle characteristics
  purchasePrice: string
  gvw: string
  payload: string

  // Consumption
  kmPerYear: string
  fuelType: FuelType
  consumption: string

  // Taxes
  motorTax: string
  truckToll: string

  // Subsidies
  subsidy: string

  // Financial
  interestRate: string
  depreciationYears: string

  // Extra
  maintenanceCostPerKm: string
  insurancePercentage: string
}

interface FieldErrors {
  [key: string]: string
}

const fuelTypeLabels: Record<FuelType, string> = {
  diesel: 'Diesel',
  bev: 'BEV (Battery Electric)',
  fcev: 'FCEV (Fuel Cell Electric)',
  h2ice: 'H2ICE (Hydrogen Internal Combustion)',
}

const fuelTypeUnits: Record<FuelType, string> = {
  diesel: 'L/100km',
  bev: 'kWh/100km',
  fcev: 'kg/100km',
  h2ice: 'kg/100km',
}

// Smart defaults based on fuel type (2026 data)
const fuelTypeDefaults: Record<
  FuelType,
  {
    consumption: number
    truckToll: number
    subsidy: number
  }
> = {
  diesel: {
    consumption: 28, // L/100km typical for heavy trucks
    truckToll: 2820.8, // 2026 diesel rate
    subsidy: 0, // No subsidy for diesel
  },
  bev: {
    consumption: 120, // kWh/100km typical for electric trucks
    truckToll: 537.6, // 2026 BEV rate
    subsidy: 10000, // €10k subsidy for BEV
  },
  fcev: {
    consumption: 8, // kg/100km typical for fuel cell trucks
    truckToll: 537.6, // 2026 FCEV rate (same as BEV)
    subsidy: 15000, // €15k subsidy for FCEV
  },
  h2ice: {
    consumption: 12, // kg/100km typical for H2 combustion
    truckToll: 537.6, // 2026 H2ICE rate (same as BEV)
    subsidy: 5000, // €5k subsidy for H2ICE
  },
}

// Fuel type colors for visualization
const fuelTypeColors: Record<FuelType, string> = {
  diesel: '#6366f1', // indigo
  bev: '#10b981', // green
  fcev: '#06b6d4', // cyan
  h2ice: '#8b5cf6', // purple
}

// Fuel prices (2026 estimates per unit - synced with backend preset)
const fuelPrices: Record<FuelType, number> = {
  diesel: 1.85, // €/L
  bev: 0.35, // €/kWh
  fcev: 10, // €/kg
  h2ice: 10, // €/kg (same as FCEV)
}

// Helper function to calculate live TCO preview (synced with backend logic)
const calculateLiveTCO = (formData: FormData) => {
  const purchasePrice = parseFloat(formData.purchasePrice) || 0
  const kmPerYear = parseFloat(formData.kmPerYear) || 0
  const consumption = parseFloat(formData.consumption) || 0
  const motorTax = parseFloat(formData.motorTax) || 345
  const truckToll = parseFloat(formData.truckToll) || 0
  const subsidy = parseFloat(formData.subsidy) || 0
  const interestRate = parseFloat(formData.interestRate) || 3.5
  const depreciationYears = parseFloat(formData.depreciationYears) || 5 // Backend default
  const maintenanceCostPerKm = parseFloat(formData.maintenanceCostPerKm) || 0.15
  const insurancePercentage = parseFloat(formData.insurancePercentage) || 2.5 // Backend default

  // Calculate annual costs
  const fuelPrice = fuelPrices[formData.fuelType]
  const fuelCostPerYear = (kmPerYear / 100) * consumption * fuelPrice
  const maintenanceCostPerYear = kmPerYear * maintenanceCostPerKm
  const insuranceCostPerYear = (purchasePrice * insurancePercentage) / 100

  // Calculate total annual operating costs
  const annualOperatingCosts =
    fuelCostPerYear + maintenanceCostPerYear + insuranceCostPerYear + motorTax + truckToll

  // Calculate depreciation and interest on GROSS purchase price (backend logic)
  const annualDepreciation = purchasePrice / depreciationYears
  const interestCostPerYear = (purchasePrice * interestRate) / 100

  // Total annual TCO (before subsidy)
  const totalAnnualTCO = annualOperatingCosts + annualDepreciation + interestCostPerYear

  // TCO over full ownership period (subsidy subtracted at END - backend logic)
  const totalTCO = totalAnnualTCO * depreciationYears - subsidy

  return {
    fuelCost: fuelCostPerYear,
    maintenance: maintenanceCostPerYear,
    insurance: insuranceCostPerYear,
    taxes: motorTax + truckToll,
    depreciation: annualDepreciation,
    interest: interestCostPerYear,
    annualTotal: totalAnnualTCO,
    lifetimeTotal: totalTCO,
  }
}

// Tab configuration with required fields
const tabConfig = {
  vehicle: {
    label: 'Voertuig',
    requiredFields: ['purchasePrice'],
  },
  consumption: {
    label: 'Verbruik',
    requiredFields: ['kmPerYear', 'consumption'],
  },
  taxes: {
    label: 'Belasting',
    requiredFields: [],
  },
  subsidies: {
    label: 'Subsidies',
    requiredFields: [],
  },
  financial: {
    label: 'Financieel',
    requiredFields: [],
  },
  extra: {
    label: 'Extra',
    requiredFields: [],
  },
}

export function Step3Parameters({ session, onComplete }: Step3Props) {
  const [activeTab, setActiveTab] = useState('vehicle')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // Initialize form data with session data or defaults
  const [formData, setFormData] = useState<FormData>(() => {
    const saved = session.parametersData as Record<string, unknown> | null

    return {
      // Vehicle characteristics
      purchasePrice: saved?.purchasePrice?.toString() || '',
      gvw: saved?.gvw?.toString() || session.vehicleType?.defaultGvw?.toString() || '',
      payload: saved?.payload?.toString() || session.vehicleType?.defaultPayload?.toString() || '',

      // Consumption
      kmPerYear:
        saved?.kmPerYear?.toString() || session.drivingArea?.defaultKmPerYear?.toString() || '',
      fuelType: (saved?.fuelType as FuelType) || 'diesel',
      consumption: saved?.consumption?.toString() || '',

      // Taxes
      motorTax: saved?.motorTax?.toString() || '345',
      truckToll: saved?.truckToll?.toString() || '',

      // Subsidies
      subsidy: saved?.subsidy?.toString() || '0',

      // Financial
      interestRate: saved?.interestRate?.toString() || '3.5',
      depreciationYears: saved?.depreciationYears?.toString() || '5',

      // Extra
      maintenanceCostPerKm: saved?.maintenanceCostPerKm?.toString() || '0.15',
      insurancePercentage: saved?.insurancePercentage?.toString() || '2.5',
    }
  })

  // Calculate TCO mutation
  const utils = api.useUtils()
  const calculateTCO = api.calculator.calculateTCO.useMutation({
    onSuccess: async () => {
      toast.success('TCO berekening succesvol!', {
        description: 'De resultaten worden nu geladen...',
      })
      // Refetch session to get updated resultsData
      await utils.calculator.getOrCreateSession.invalidate()
      await utils.calculator.getOrCreateSession.refetch()
    },
    onError: (error: { message: string }) => {
      toast.error('Fout bij berekenen TCO', {
        description: error.message,
      })
    },
  })

  // Auto-fill fields when fuel type changes
  useEffect(() => {
    const defaults = fuelTypeDefaults[formData.fuelType]

    // Only auto-fill if fields are empty or were previously auto-filled
    setFormData((prev) => ({
      ...prev,
      consumption: prev.consumption || defaults.consumption.toString(),
      truckToll: prev.truckToll || defaults.truckToll.toString(),
      subsidy: prev.subsidy === '0' || !prev.subsidy ? defaults.subsidy.toString() : prev.subsidy,
    }))
  }, [formData.fuelType])

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleBlur = (field: keyof FormData) => {
    validateField(field, formData[field])
  }

  const validateField = (field: keyof FormData, value: string) => {
    const errors: FieldErrors = {}

    if (field === 'purchasePrice' && !value) {
      errors.purchasePrice = 'Aankoopprijs is verplicht'
    } else if (field === 'purchasePrice' && parseFloat(value) <= 0) {
      errors.purchasePrice = 'Aankoopprijs moet groter zijn dan 0'
    }

    if (field === 'kmPerYear' && !value) {
      errors.kmPerYear = 'Kilometers per jaar is verplicht'
    } else if (field === 'kmPerYear' && parseFloat(value) <= 0) {
      errors.kmPerYear = 'Kilometers moet groter zijn dan 0'
    }

    if (field === 'consumption' && !value) {
      errors.consumption = 'Verbruik is verplicht'
    } else if (field === 'consumption' && parseFloat(value) <= 0) {
      errors.consumption = 'Verbruik moet groter zijn dan 0'
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }))
    return Object.keys(errors).length === 0
  }

  const validateAllFields = () => {
    const errors: FieldErrors = {}

    // Required fields
    if (!formData.purchasePrice) {
      errors.purchasePrice = 'Aankoopprijs is verplicht'
    } else if (parseFloat(formData.purchasePrice) <= 0) {
      errors.purchasePrice = 'Aankoopprijs moet groter zijn dan 0'
    }

    if (!formData.kmPerYear) {
      errors.kmPerYear = 'Kilometers per jaar is verplicht'
    } else if (parseFloat(formData.kmPerYear) <= 0) {
      errors.kmPerYear = 'Kilometers moet groter zijn dan 0'
    }

    if (!formData.consumption) {
      errors.consumption = 'Verbruik is verplicht'
    } else if (parseFloat(formData.consumption) <= 0) {
      errors.consumption = 'Verbruik moet groter zijn dan 0'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Get tab status (complete, error, incomplete)
  const getTabStatus = (tabKey: string): 'complete' | 'error' | 'incomplete' => {
    const config = tabConfig[tabKey as keyof typeof tabConfig]
    if (!config) return 'incomplete'

    const hasErrors = config.requiredFields.some((field) => fieldErrors[field])
    if (hasErrors) return 'error'

    const allFilled = config.requiredFields.every((field) => formData[field as keyof FormData])
    if (allFilled) return 'complete'

    return 'incomplete'
  }

  // Navigate to first tab with errors
  const navigateToFirstError = () => {
    for (const [tabKey, config] of Object.entries(tabConfig)) {
      const hasError = config.requiredFields.some((field) => fieldErrors[field])
      if (hasError) {
        setActiveTab(tabKey)
        // Scroll to first error field
        setTimeout(() => {
          const firstErrorField = config.requiredFields.find((field) => fieldErrors[field])
          if (firstErrorField) {
            const element = document.getElementById(firstErrorField)
            element?.focus()
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
        return
      }
    }
  }

  const handleCalculate = async () => {
    // Validate all fields
    const isValid = validateAllFields()

    if (!isValid) {
      const errorCount = Object.keys(fieldErrors).length
      toast.error(`${errorCount} veld${errorCount > 1 ? 'en' : ''} vereist aandacht`, {
        description: 'Controleer de gemarkeerde velden en probeer opnieuw.',
      })
      navigateToFirstError()
      return
    }

    if (!session.vehicleTypeId || !session.drivingAreaId) {
      toast.error('Selecteer eerst een voertuig en rijgebied')
      return
    }

    // Convert form data to numbers
    const parametersData = {
      // Vehicle characteristics
      purchasePrice: parseFloat(formData.purchasePrice),
      gvw: formData.gvw ? parseFloat(formData.gvw) : undefined,
      payload: formData.payload ? parseFloat(formData.payload) : undefined,

      // Consumption
      kmPerYear: parseFloat(formData.kmPerYear),
      fuelType: formData.fuelType,
      consumption: parseFloat(formData.consumption),

      // Taxes
      motorTax: formData.motorTax ? parseFloat(formData.motorTax) : undefined,
      truckToll: formData.truckToll ? parseFloat(formData.truckToll) : undefined,

      // Subsidies
      subsidy: formData.subsidy ? parseFloat(formData.subsidy) : undefined,

      // Financial
      interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
      depreciationYears: formData.depreciationYears
        ? parseFloat(formData.depreciationYears)
        : undefined,

      // Extra
      maintenanceCostPerKm: formData.maintenanceCostPerKm
        ? parseFloat(formData.maintenanceCostPerKm)
        : undefined,
      insurancePercentage: formData.insurancePercentage
        ? parseFloat(formData.insurancePercentage)
        : undefined,
    }

    // Validate numbers
    if (Object.values(parametersData).some((v) => typeof v === 'number' && isNaN(v))) {
      toast.error('Ongeldige invoer', {
        description: 'Controleer of alle numerieke velden geldig zijn.',
      })
      return
    }

    try {
      // Calculate TCO (this saves resultsData to session)
      await calculateTCO.mutateAsync({
        sessionKey: session.sessionKey,
        vehicleTypeId: session.vehicleTypeId,
        drivingAreaId: session.drivingAreaId,
        parametersData,
      })

      // Save parameters to session (wizard will handle navigation)
      onComplete(parametersData)
    } catch {
      // Error handled by mutation
    }
  }

  // Calculate live TCO preview
  const livePreview = calculateLiveTCO(formData)
  const hasValidData = parseFloat(formData.purchasePrice) > 0 && parseFloat(formData.kmPerYear) > 0

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Vul de parameters in
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Specificeer de gegevens voor de TCO berekening
        </p>
      </div>

      {/* Top Grid: Form + KPI Cards */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Parameter Form (8 columns) */}
        <div className="lg:col-span-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              {Object.entries(tabConfig).map(([key, config]) => {
                const status = getTabStatus(key)
                return (
                  <TabsTrigger key={key} value={key} className="relative">
                    {config.label}
                    {status === 'complete' && (
                      <CheckCircle2 className="ml-1 h-3 w-3 text-green-500" />
                    )}
                    {status === 'error' && <AlertCircle className="ml-1 h-3 w-3 text-red-500" />}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* Tab 1: Vehicle Characteristics */}
            <TabsContent value="vehicle" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="purchasePrice" className="flex items-center gap-1">
                    Aankoopprijs (€) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    placeholder="Bijv. 120000"
                    value={formData.purchasePrice}
                    onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                    onBlur={() => handleBlur('purchasePrice')}
                    className={cn(
                      'mt-1',
                      fieldErrors.purchasePrice && 'border-red-500 focus-visible:ring-red-500'
                    )}
                  />
                  {fieldErrors.purchasePrice && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.purchasePrice}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="gvw" className="flex items-center gap-1">
                    Totaalgewicht (GVW in kg)
                    {session.vehicleType?.defaultGvw && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Standaard: {session.vehicleType.defaultGvw} kg
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="gvw"
                    type="number"
                    placeholder={session.vehicleType?.defaultGvw?.toString()}
                    value={formData.gvw}
                    onChange={(e) => handleInputChange('gvw', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="payload" className="flex items-center gap-1">
                    Laadvermogen (kg)
                    {session.vehicleType?.defaultPayload && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Standaard: {session.vehicleType.defaultPayload} kg
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="payload"
                    type="number"
                    placeholder={session.vehicleType?.defaultPayload?.toString()}
                    value={formData.payload}
                    onChange={(e) => handleInputChange('payload', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </motion.div>
            </TabsContent>

            {/* Tab 2: Consumption */}
            <TabsContent value="consumption" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="kmPerYear" className="flex items-center gap-1">
                    Kilometers per jaar <span className="text-red-500">*</span>
                    {session.drivingArea?.defaultKmPerYear && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Standaard: {session.drivingArea.defaultKmPerYear.toLocaleString('nl-NL')} km
                      </Badge>
                    )}
                  </Label>
                  <Input
                    id="kmPerYear"
                    type="number"
                    placeholder={session.drivingArea?.defaultKmPerYear?.toString()}
                    value={formData.kmPerYear}
                    onChange={(e) => handleInputChange('kmPerYear', e.target.value)}
                    onBlur={() => handleBlur('kmPerYear')}
                    className={cn(
                      'mt-1',
                      fieldErrors.kmPerYear && 'border-red-500 focus-visible:ring-red-500'
                    )}
                  />
                  {fieldErrors.kmPerYear && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.kmPerYear}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fuelType">
                    Brandstoftype <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.fuelType}
                    onValueChange={(value) => handleInputChange('fuelType', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(fuelTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="consumption" className="flex items-center gap-1">
                    Verbruik ({fuelTypeUnits[formData.fuelType]}){' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="consumption"
                    type="number"
                    step="0.1"
                    placeholder="Bijv. 25.5"
                    value={formData.consumption}
                    onChange={(e) => handleInputChange('consumption', e.target.value)}
                    onBlur={() => handleBlur('consumption')}
                    className={cn(
                      'mt-1',
                      fieldErrors.consumption && 'border-red-500 focus-visible:ring-red-500'
                    )}
                  />
                  {fieldErrors.consumption && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.consumption}
                    </p>
                  )}
                </div>
              </motion.div>
            </TabsContent>

            {/* Tab 3: Taxes */}
            <TabsContent value="taxes" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="motorTax" className="flex items-center gap-1">
                    Motorrijtuigenbelasting (€/jaar)
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Standaard: €345
                    </Badge>
                  </Label>
                  <Input
                    id="motorTax"
                    type="number"
                    placeholder="345"
                    value={formData.motorTax}
                    onChange={(e) => handleInputChange('motorTax', e.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-gray-500">2026 tarief voor vrachtauto's</p>
                </div>

                <div>
                  <Label htmlFor="truckToll">Vrachtwagenheffing (€/jaar)</Label>
                  <Input
                    id="truckToll"
                    type="number"
                    placeholder="Afhankelijk van brandstoftype"
                    value={formData.truckToll}
                    onChange={(e) => handleInputChange('truckToll', e.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Diesel: €2820.80, BEV: €537.60 (2026)
                  </p>
                </div>
              </motion.div>
            </TabsContent>

            {/* Tab 4: Subsidies */}
            <TabsContent value="subsidies" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="subsidy" className="flex items-center gap-1">
                    Subsidie (€)
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Standaard: €0
                    </Badge>
                  </Label>
                  <Input
                    id="subsidy"
                    type="number"
                    placeholder="0"
                    value={formData.subsidy}
                    onChange={(e) => handleInputChange('subsidy', e.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Typische subsidies: BEV €10.000, FCEV €15.000, H2ICE €5.000
                  </p>
                </div>
              </motion.div>
            </TabsContent>

            {/* Tab 5: Financial */}
            <TabsContent value="financial" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="interestRate" className="flex items-center gap-1">
                    Rentepercentage (%)
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Standaard: 3.5%
                    </Badge>
                  </Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    placeholder="3.5"
                    value={formData.interestRate}
                    onChange={(e) => handleInputChange('interestRate', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="depreciationYears" className="flex items-center gap-1">
                    Afschrijvingsperiode (jaren)
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Standaard: 5 jaar
                    </Badge>
                  </Label>
                  <Input
                    id="depreciationYears"
                    type="number"
                    placeholder="5"
                    value={formData.depreciationYears}
                    onChange={(e) => handleInputChange('depreciationYears', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </motion.div>
            </TabsContent>

            {/* Tab 6: Extra */}
            <TabsContent value="extra" className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="maintenanceCostPerKm" className="flex items-center gap-1">
                    Onderhoudskosten (€/km)
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Standaard: €0.15
                    </Badge>
                  </Label>
                  <Input
                    id="maintenanceCostPerKm"
                    type="number"
                    step="0.01"
                    placeholder="0.15"
                    value={formData.maintenanceCostPerKm}
                    onChange={(e) => handleInputChange('maintenanceCostPerKm', e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="insurancePercentage" className="flex items-center gap-1">
                    Verzekering (% van aankoopprijs)
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Standaard: 2.5%
                    </Badge>
                  </Label>
                  <Input
                    id="insurancePercentage"
                    type="number"
                    step="0.1"
                    placeholder="2.5"
                    value={formData.insurancePercentage}
                    onChange={(e) => handleInputChange('insurancePercentage', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Calculate Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-4"
          >
            <Button
              onClick={handleCalculate}
              size="lg"
              disabled={calculateTCO.isPending}
              className="gap-2 bg-orange-500 hover:bg-orange-600"
            >
              <Calculator className="h-5 w-5" />
              {calculateTCO.isPending ? 'Berekenen...' : 'Bereken TCO'}
            </Button>
          </motion.div>
        </div>

        {/* Right: KPI Cards Only (4 columns) */}
        <div className="lg:col-span-4">
          {/* KPI Card */}
          <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="border-b border-gray-200 dark:border-gray-700 px-3 py-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Live TCO Preview
                </h3>
              </div>
            </div>

            {/* KPI Cards - Horizontal Layout */}
            <div className="p-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Jaarlijkse TCO
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                  €
                  {hasValidData
                    ? livePreview.annualTotal.toLocaleString('nl-NL', {
                        maximumFractionDigits: 0,
                      })
                    : '0'}
                </div>
                <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">per jaar</div>
              </div>

              <div>
                <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Totale TCO
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                  €
                  {hasValidData
                    ? livePreview.lifetimeTotal.toLocaleString('nl-NL', {
                        maximumFractionDigits: 0,
                      })
                    : '0'}
                </div>
                <div className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                  {formData.depreciationYears || '7'} jaar
                </div>
              </div>
            </div>
          </Card>

          {/* Empty State - Only show when no valid data */}
          {!hasValidData && (
            <Card className="border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 mt-3">
              <div className="p-4 text-center">
                <Calculator className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Vul aankoopprijs en km/jaar in om een preview te zien
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Grid: Charts Side by Side (Only when data is valid) */}
      {hasValidData && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Cost Breakdown Chart */}
          <div>
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="border-b border-gray-200 dark:border-gray-700 px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kosten Verdeling
                </h3>
              </div>
              <div className="p-3">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={[
                      {
                        name: 'Brandstof',
                        value: livePreview.fuelCost,
                        color: fuelTypeColors[formData.fuelType],
                      },
                      { name: 'Onderhoud', value: livePreview.maintenance, color: '#f59e0b' },
                      { name: 'Verzekering', value: livePreview.insurance, color: '#8b5cf6' },
                      { name: 'Belasting', value: livePreview.taxes, color: '#ef4444' },
                      { name: 'Afschrijving', value: livePreview.depreciation, color: '#6b7280' },
                      { name: 'Rente', value: livePreview.interest, color: '#ec4899' },
                    ]}
                    layout="vertical"
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `€${value.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`
                      }
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                      {[
                        {
                          name: 'Brandstof',
                          value: livePreview.fuelCost,
                          color: fuelTypeColors[formData.fuelType],
                        },
                        { name: 'Onderhoud', value: livePreview.maintenance, color: '#f59e0b' },
                        { name: 'Verzekering', value: livePreview.insurance, color: '#8b5cf6' },
                        { name: 'Belasting', value: livePreview.taxes, color: '#ef4444' },
                        {
                          name: 'Afschrijving',
                          value: livePreview.depreciation,
                          color: '#6b7280',
                        },
                        { name: 'Rente', value: livePreview.interest, color: '#ec4899' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Cost Details Table - More Compact */}
                <div className="mt-2 space-y-1 border-t border-gray-200 dark:border-gray-700 pt-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: fuelTypeColors[formData.fuelType] }}
                      />
                      <span className="text-gray-600 dark:text-gray-400">Brandstof</span>
                    </div>
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      €{livePreview.fuelCost.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-gray-600 dark:text-gray-400">Onderhoud</span>
                    </div>
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      €
                      {livePreview.maintenance.toLocaleString('nl-NL', {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      <span className="text-gray-600 dark:text-gray-400">Verzekering</span>
                    </div>
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      €
                      {livePreview.insurance.toLocaleString('nl-NL', {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      <span className="text-gray-600 dark:text-gray-400">Belasting</span>
                    </div>
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      €{livePreview.taxes.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">Afschrijving</span>
                    </div>
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      €
                      {livePreview.depreciation.toLocaleString('nl-NL', {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                      <span className="text-gray-600 dark:text-gray-400">Rente</span>
                    </div>
                    <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                      €{livePreview.interest.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="text-gray-900 dark:text-gray-100">Totaal / jaar</span>
                    <span className="font-mono text-gray-900 dark:text-gray-100">
                      €
                      {livePreview.annualTotal.toLocaleString('nl-NL', {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right: Parameter Sensitivity Analysis */}
          <div>
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <div className="border-b border-gray-200 dark:border-gray-700 px-3 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kosten Impact Analyse
                </h3>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-[10px] text-gray-600 dark:text-gray-400">
                  Welke parameters beïnvloeden uw TCO het meest?
                </p>

                {/* Calculate sensitivity - which cost categories are largest */}
                {(() => {
                  const costs = [
                    {
                      name: 'Brandstofkosten',
                      value: livePreview.fuelCost,
                      percent: (livePreview.fuelCost / livePreview.annualTotal) * 100,
                      color: fuelTypeColors[formData.fuelType],
                      tip: 'Grootste impact: verbruik optimaliseren en routeplanning',
                    },
                    {
                      name: 'Afschrijving',
                      value: livePreview.depreciation,
                      percent: (livePreview.depreciation / livePreview.annualTotal) * 100,
                      color: '#6b7280',
                      tip: 'Impact beperken: hogere restwaarde en langere gebruiksduur',
                    },
                    {
                      name: 'Onderhoud',
                      value: livePreview.maintenance,
                      percent: (livePreview.maintenance / livePreview.annualTotal) * 100,
                      color: '#f59e0b',
                      tip: 'Optimaliseren via preventief onderhoud en dealercontracten',
                    },
                    {
                      name: 'Belastingen',
                      value: livePreview.taxes,
                      percent: (livePreview.taxes / livePreview.annualTotal) * 100,
                      color: '#ef4444',
                      tip: 'Beperkte controle: subsidies en fiscale voordelen benutten',
                    },
                    {
                      name: 'Verzekering',
                      value: livePreview.insurance,
                      percent: (livePreview.insurance / livePreview.annualTotal) * 100,
                      color: '#8b5cf6',
                      tip: 'Optimaliseren via fleet-polissen en eigen risico',
                    },
                    {
                      name: 'Rente',
                      value: livePreview.interest,
                      percent: (livePreview.interest / livePreview.annualTotal) * 100,
                      color: '#ec4899',
                      tip: 'Impact verkleinen: hogere aanbetaling of kortere looptijd',
                    },
                  ].sort((a, b) => b.value - a.value)

                  const topCost = costs[0]

                  return (
                    <div className="space-y-2">
                      {/* Top 5 Impact Drivers */}
                      {costs.slice(0, 5).map((cost, index) => (
                        <div key={cost.name} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                {index + 1}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {cost.name}
                              </span>
                            </div>
                            <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                              {cost.percent.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${cost.percent}%`,
                                  backgroundColor: cost.color,
                                }}
                              />
                            </div>
                          </div>
                          <p className="text-[9px] leading-tight text-gray-500 dark:text-gray-400">
                            💡 {cost.tip}
                          </p>
                        </div>
                      ))}

                      {/* Business Insight */}
                      {topCost && (
                        <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950/20">
                          <div className="mb-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-blue-600" />
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-100">
                              Zakelijk Advies
                            </span>
                          </div>
                          <p className="text-[10px] leading-snug text-blue-800 dark:text-blue-200">
                            {topCost.name} vertegenwoordigt{' '}
                            <strong>{topCost.percent.toFixed(0)}%</strong> van uw jaarlijkse kosten.{' '}
                            {topCost.percent > 40 && (
                              <strong>Focus hier op voor maximale kostenbesparing.</strong>
                            )}
                            {topCost.percent <= 40 && topCost.percent > 25 && (
                              <>Optimalisatie kan aanzienlijke besparingen opleveren.</>
                            )}
                            {topCost.percent <= 25 && <>Relatief gebalanceerde kostenverdeling.</>}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
