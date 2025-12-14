'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calculator } from 'lucide-react'
import { api } from '@/trpc/react'
import { toast } from 'sonner'
import type { CalculationSession, VehicleType, DrivingArea } from '@prisma/client'

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

export function Step3Parameters({ session, onComplete }: Step3Props) {
  const [activeTab, setActiveTab] = useState('vehicle')

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
      depreciationYears: saved?.depreciationYears?.toString() || '7',

      // Extra
      maintenanceCostPerKm: saved?.maintenanceCostPerKm?.toString() || '0.15',
      insurancePercentage: saved?.insurancePercentage?.toString() || '1.5',
    }
  })

  // Calculate TCO mutation
  const calculateTCO = api.calculator.calculateTCO.useMutation({
    onSuccess: () => {
      toast.success('TCO berekening succesvol!', {
        description: 'De resultaten worden nu geladen...',
      })
    },
    onError: (error: { message: string }) => {
      toast.error('Fout bij berekenen TCO', {
        description: error.message,
      })
    },
  })

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCalculate = async () => {
    // Validate required fields
    if (!formData.purchasePrice || !formData.kmPerYear || !formData.consumption) {
      toast.error('Vul alle verplichte velden in', {
        description: 'Aankoopprijs, km/jaar, en verbruik zijn verplicht.',
      })
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
      // Calculate TCO
      await calculateTCO.mutateAsync({
        sessionKey: session.sessionKey,
        vehicleTypeId: session.vehicleTypeId,
        drivingAreaId: session.drivingAreaId,
        parametersData,
      })

      // Save parameters and move to results
      onComplete(parametersData)
    } catch {
      // Error handled by mutation
    }
  }

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vehicle">Voertuig</TabsTrigger>
          <TabsTrigger value="consumption">Verbruik</TabsTrigger>
          <TabsTrigger value="taxes">Belasting</TabsTrigger>
          <TabsTrigger value="subsidies">Subsidies</TabsTrigger>
          <TabsTrigger value="financial">Financieel</TabsTrigger>
          <TabsTrigger value="extra">Extra</TabsTrigger>
        </TabsList>

        {/* Tab 1: Vehicle Characteristics */}
        <TabsContent value="vehicle" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="purchasePrice">
                Aankoopprijs (€) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="purchasePrice"
                type="number"
                placeholder="Bijv. 120000"
                value={formData.purchasePrice}
                onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="gvw">Totaalgewicht (GVW in kg)</Label>
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
              <Label htmlFor="payload">Laadvermogen (kg)</Label>
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
              <Label htmlFor="kmPerYear">
                Kilometers per jaar <span className="text-red-500">*</span>
              </Label>
              <Input
                id="kmPerYear"
                type="number"
                placeholder={session.drivingArea?.defaultKmPerYear?.toString()}
                value={formData.kmPerYear}
                onChange={(e) => handleInputChange('kmPerYear', e.target.value)}
                className="mt-1"
              />
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
              <Label htmlFor="consumption">
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
                className="mt-1"
              />
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
              <Label htmlFor="motorTax">Motorrijtuigenbelasting (€/jaar)</Label>
              <Input
                id="motorTax"
                type="number"
                placeholder="345"
                value={formData.motorTax}
                onChange={(e) => handleInputChange('motorTax', e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-xs text-gray-500">Standaard: €345 (2026 tarief)</p>
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
              <p className="mt-1 text-xs text-gray-500">Diesel: €2820.80, BEV: €537.60 (2026)</p>
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
              <Label htmlFor="subsidy">Subsidie (€)</Label>
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
              <Label htmlFor="interestRate">Rentepercentage (%)</Label>
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
              <Label htmlFor="depreciationYears">Afschrijvingsperiode (jaren)</Label>
              <Input
                id="depreciationYears"
                type="number"
                placeholder="7"
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
              <Label htmlFor="maintenanceCostPerKm">Onderhoudskosten (€/km)</Label>
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
              <Label htmlFor="insurancePercentage">Verzekering (% van aankoopprijs)</Label>
              <Input
                id="insurancePercentage"
                type="number"
                step="0.1"
                placeholder="1.5"
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
  )
}
