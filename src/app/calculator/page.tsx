import { CalculatorWizard } from '@/components/calculator/CalculatorWizard'

export default function CalculatorPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          TCO Truck Calculator
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Compare Total Cost of Ownership for Diesel, BEV, FCEV, and H2ICE trucks
        </p>
      </div>
      <CalculatorWizard />
    </div>
  )
}
