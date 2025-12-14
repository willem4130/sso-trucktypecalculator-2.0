'use client'

import { motion } from 'framer-motion'

interface NetherlandsMapProps {
  selectedArea: string | null
  hoveredArea: string | null
  onAreaHover?: (area: string | null) => void
}

// Simple Netherlands map with coverage zones
export function NetherlandsMap({ selectedArea, hoveredArea, onAreaHover }: NetherlandsMapProps) {
  // Map driving areas to coverage percentages
  const coverageMap: Record<string, number> = {
    Regionaal: 20,
    Nationaal: 60,
    'Nationaal+': 80,
    Internationaal: 100,
  }

  const getOpacity = (area: string) => {
    if (!selectedArea && !hoveredArea) return 0.4
    if (selectedArea === area || hoveredArea === area) return 1
    return 0.2
  }

  const getColor = (area: string) => {
    if (selectedArea === area) return '#f29100' // Orange
    if (hoveredArea === area) return '#ffa726'
    return '#94a3b8' // Gray
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 400 500" className="w-full h-full" style={{ maxHeight: '400px' }}>
        {/* Netherlands outline (simplified) */}
        <path
          d="M 200 50 L 250 100 L 280 150 L 290 200 L 280 250 L 250 300 L 220 350 L 200 400 L 180 350 L 150 300 L 120 250 L 110 200 L 120 150 L 150 100 Z"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        {/* Regional zone (20% - inner circle) */}
        <motion.circle
          cx="200"
          cy="225"
          r="40"
          fill={getColor('Regionaal')}
          opacity={getOpacity('Regionaal')}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="cursor-pointer"
          onMouseEnter={() => onAreaHover?.('Regionaal')}
          onMouseLeave={() => onAreaHover?.(null)}
        />
        <text
          x="200"
          y="230"
          textAnchor="middle"
          className="text-xs font-semibold fill-white pointer-events-none"
        >
          20%
        </text>

        {/* National zone (60% - medium circle) */}
        <motion.circle
          cx="200"
          cy="225"
          r="80"
          fill={getColor('Nationaal')}
          opacity={getOpacity('Nationaal')}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="cursor-pointer"
          onMouseEnter={() => onAreaHover?.('Nationaal')}
          onMouseLeave={() => onAreaHover?.(null)}
        />
        <text
          x="200"
          y="170"
          textAnchor="middle"
          className="text-xs font-semibold fill-white pointer-events-none"
        >
          60%
        </text>

        {/* National+ zone (80% - large circle) */}
        <motion.circle
          cx="200"
          cy="225"
          r="120"
          fill={getColor('Nationaal+')}
          opacity={getOpacity('Nationaal+')}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="cursor-pointer"
          onMouseEnter={() => onAreaHover?.('Nationaal+')}
          onMouseLeave={() => onAreaHover?.(null)}
        />
        <text
          x="200"
          y="120"
          textAnchor="middle"
          className="text-xs font-semibold fill-white pointer-events-none"
        >
          80%
        </text>

        {/* International zone (100% - full map) */}
        <motion.path
          d="M 200 50 L 250 100 L 280 150 L 290 200 L 280 250 L 250 300 L 220 350 L 200 400 L 180 350 L 150 300 L 120 250 L 110 200 L 120 150 L 150 100 Z"
          fill={getColor('Internationaal')}
          opacity={getOpacity('Internationaal')}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="cursor-pointer"
          onMouseEnter={() => onAreaHover?.('Internationaal')}
          onMouseLeave={() => onAreaHover?.(null)}
        />
        <text
          x="200"
          y="60"
          textAnchor="middle"
          className="text-xs font-semibold fill-white pointer-events-none"
        >
          100%
        </text>

        {/* Legend */}
        <g transform="translate(20, 430)">
          <text className="text-xs font-medium fill-gray-600 dark:fill-gray-400">
            Coverage Area
          </text>
        </g>
      </svg>

      {/* Active area label */}
      {(selectedArea || hoveredArea) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-3 py-1.5 rounded text-xs font-medium"
        >
          {selectedArea || hoveredArea} - {coverageMap[(selectedArea || hoveredArea) as string]}% NL
          Coverage
        </motion.div>
      )}
    </div>
  )
}
