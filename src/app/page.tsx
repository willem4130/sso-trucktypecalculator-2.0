import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Truck, Calculator, TrendingDown, Leaf, ArrowRight } from 'lucide-react'
import Image from 'next/image'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-[#08192c]">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-gray-200/50 dark:bg-grid-gray-800/50 bg-[size:20px_20px] opacity-20" />

      {/* SCEXie Mascot - Bottom Right */}
      <div className="pointer-events-none fixed bottom-0 right-0 -z-10 opacity-30 dark:opacity-20">
        <Image
          src="/branding/scexie-mascot.png"
          alt="SCEXie Mascot"
          width={400}
          height={400}
          className="object-contain"
          unoptimized
        />
      </div>

      {/* SCEX Branding - Top Right */}
      <div className="absolute right-8 top-8 z-50 rounded-lg bg-gradient-to-br from-[#08192c] to-[#0a2847] p-3 shadow-xl">
        <Image
          src="/branding/SCEX logo letters.png"
          alt="SCEX Logo"
          width={180}
          height={60}
          className="h-auto w-auto max-h-12 object-contain"
          priority
          unoptimized
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full bg-white/80 px-6 py-3 shadow-lg dark:bg-gray-800/80">
              <Truck className="h-6 w-6 text-orange-500" />
              <span className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                TCO Truck Calculator 2.0
              </span>
            </div>

            <h1 className="mb-6 bg-gradient-to-r from-orange-500 via-orange-600 to-[#08192c] bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl">
              Total Cost of Ownership
              <br />
              Truck Calculator
            </h1>

            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              Vergelijk de totale eigendomskosten van Diesel, BEV, FCEV en H2ICE trucks. Maak
              datagedreven beslissingen voor uw vloot.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="mb-12 grid gap-6 md:grid-cols-3">
            <Card className="border-2 border-gray-200 bg-white/80 p-6 backdrop-blur dark:border-gray-700 dark:bg-gray-800/80">
              <Calculator className="mb-4 h-10 w-10 text-orange-500" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Volledige TCO Analyse
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Alle kosten in één overzicht: aanschaf, brandstof, onderhoud, belastingen en meer
              </p>
            </Card>

            <Card className="border-2 border-gray-200 bg-white/80 p-6 backdrop-blur dark:border-gray-700 dark:bg-gray-800/80">
              <TrendingDown className="mb-4 h-10 w-10 text-green-500" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Kostenbesparing
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ontdek welke brandstoftype het meest kosteneffectief is voor uw bedrijf
              </p>
            </Card>

            <Card className="border-2 border-gray-200 bg-white/80 p-6 backdrop-blur dark:border-gray-700 dark:bg-gray-800/80">
              <Leaf className="mb-4 h-10 w-10 text-emerald-500" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                CO₂ Impact
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vergelijk de milieu-impact en maak duurzame keuzes voor de toekomst
              </p>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="rounded-2xl border-2 border-orange-500/20 bg-gradient-to-br from-orange-50 to-white p-8 text-center shadow-2xl dark:from-gray-800 dark:to-gray-900 md:p-12">
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Start uw TCO berekening
            </h2>
            <p className="mb-8 text-lg text-gray-600 dark:text-gray-300">
              Volg 4 eenvoudige stappen: Voertuig → Rijgebied → Parameters → Resultaten
            </p>

            <Link href="/calculator">
              <Button
                size="lg"
                className="gap-3 bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6 text-lg font-semibold shadow-xl transition-all hover:scale-105 hover:from-orange-600 hover:to-orange-700"
              >
                Start Calculator
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>

            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
              Gratis • Geen registratie vereist • Direct resultaten
            </p>
          </div>

          {/* Footer Info */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Powered by{' '}
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                SCEX Software Optimization
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
