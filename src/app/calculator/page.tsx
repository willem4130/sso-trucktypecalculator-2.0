import { CalculatorWizard } from '@/components/calculator/CalculatorWizard'
import Image from 'next/image'

export default function CalculatorPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-[#08192c]">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-gray-200/50 dark:bg-grid-gray-800/50 bg-[size:20px_20px] opacity-20" />

      {/* SCEXie Mascot - Bottom Right - Behind everything */}
      <div className="pointer-events-none fixed bottom-0 right-0 -z-10 opacity-50 dark:opacity-40">
        <Image
          src="/branding/scexie-mascot.png"
          alt="SCEXie Mascot"
          width={400}
          height={400}
          className="object-contain"
          unoptimized
        />
      </div>

      {/* SCEX Branding - Top Right - Always on top */}
      <div className="absolute right-8 top-8 z-50 rounded-lg bg-gradient-to-br from-[#08192c] to-[#0a2847] p-3 shadow-xl">
        <Image
          src="/branding/SCEX logo letters.png"
          alt="SCEX Logo"
          width={180}
          height={60}
          className="h-auto w-auto max-h-12 object-contain transition-opacity hover:opacity-90"
          priority
          unoptimized
        />
      </div>

      <div className="relative z-10 container mx-auto py-12 px-4">
        <div className="mb-12 text-center">
          <h1 className="bg-gradient-to-r from-orange-500 via-orange-600 to-[#08192c] bg-clip-text text-5xl font-bold tracking-tight text-transparent">
            TCO Truck Calculator
          </h1>
          <p className="mt-3 text-xl text-gray-600 dark:text-gray-300">
            Compare Total Cost of Ownership for Diesel, BEV, FCEV, and H2ICE trucks
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Powered by SCEX Software Optimization
          </p>
        </div>
        <CalculatorWizard />
      </div>
    </div>
  )
}
