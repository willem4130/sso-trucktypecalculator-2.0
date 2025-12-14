import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create default app settings
  const existingSettings = await prisma.appSettings.findFirst()
  if (!existingSettings) {
    await prisma.appSettings.create({
      data: {
        siteName: 'TCO Truck Calculator',
        timezone: 'Europe/Amsterdam',
        theme: 'system',
        accentColor: '#f29100', // SCEX Orange
        emailNotifications: true,
        pushNotifications: false,
      },
    })
    console.log('✅ Created default app settings')
  }

  // Seed Vehicle Types (6 categories)
  const vehicleTypes = [
    {
      name: 'Kleine Bakwagen',
      description: '3.5t - 7.5t',
      defaultGvw: 7500,
      defaultPayload: 4500,
    },
    {
      name: 'Medium Bakwagen',
      description: '7.5t - 12t',
      defaultGvw: 12000,
      defaultPayload: 7000,
    },
    {
      name: 'Grote Bakwagen',
      description: '12t - 18t',
      defaultGvw: 18000,
      defaultPayload: 11000,
    },
    {
      name: 'Bouwvoertuig',
      description: 'Construction vehicle',
      defaultGvw: 26000,
      defaultPayload: 15000,
    },
    {
      name: 'Lichte Trekker',
      description: '18t - 26t tractor unit',
      defaultGvw: 26000,
      defaultPayload: 15000,
    },
    {
      name: 'Zware Trekker',
      description: '26t+ tractor unit',
      defaultGvw: 40000,
      defaultPayload: 25000,
    },
  ]

  for (const vehicleType of vehicleTypes) {
    await prisma.vehicleType.upsert({
      where: { name: vehicleType.name },
      update: vehicleType,
      create: vehicleType,
    })
  }
  console.log('✅ Created 6 vehicle types')

  // Seed Driving Areas (4 categories)
  const drivingAreas = [
    {
      name: 'Regionaal',
      description: 'Regional driving (city and surrounding areas)',
      defaultKmPerYear: 25000,
    },
    {
      name: 'Nationaal',
      description: 'National driving (within the Netherlands)',
      defaultKmPerYear: 50000,
    },
    {
      name: 'Nationaal+',
      description: 'Extended national driving',
      defaultKmPerYear: 75000,
    },
    {
      name: 'Internationaal',
      description: 'International long-haul driving',
      defaultKmPerYear: 100000,
    },
  ]

  for (const area of drivingAreas) {
    await prisma.drivingArea.upsert({
      where: { name: area.name },
      update: area,
      create: area,
    })
  }
  console.log('✅ Created 4 driving areas')

  // Seed 2026 Tax Rates and Defaults
  const preset2026 = {
    name: '2026 Tax Rates',
    year: 2026,
    isActive: true,

    // Tax rates (from project requirements)
    motorTaxPerYear: 345.0, // €345/year motor tax
    truckTollDiesel: 2820.8, // €2820.80/year truck toll for diesel
    truckTollBev: 537.6, // €537.60/year truck toll for BEV

    // Fuel/energy prices (2026 estimates)
    dieselPricePerLiter: 1.85, // €1.85/liter
    electricityPricePerKwh: 0.35, // €0.35/kWh
    hydrogenPricePerKg: 10.0, // €10/kg H2

    // Consumption rates (typical values)
    dieselConsumption: 25.0, // 25 L/100km
    bevConsumption: 120.0, // 120 kWh/100km
    fcevConsumption: 8.0, // 8 kg H2/100km
    h2iceConsumption: 12.0, // 12 kg H2/100km (less efficient than FCEV)

    // Financial defaults
    interestRate: 3.5, // 3.5% interest rate
    depreciationYears: 5, // 5-year depreciation

    // Additional defaults (stored as JSON)
    defaultValues: {
      maintenanceCostPerKm: {
        diesel: 0.15,
        bev: 0.1, // Lower maintenance for electric
        fcev: 0.12,
        h2ice: 0.16,
      },
      insurancePercentage: 2.5, // 2.5% of vehicle price per year
      subsidies: {
        bev: 10000, // €10,000 subsidy for BEV
        fcev: 15000, // €15,000 subsidy for FCEV
        h2ice: 5000, // €5,000 subsidy for H2ICE
      },
    },
  }

  await prisma.calculationPreset.upsert({
    where: { name: preset2026.name },
    update: preset2026,
    create: preset2026,
  })
  console.log('✅ Created 2026 tax rates and calculation preset')

  console.log('🎉 Database seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
