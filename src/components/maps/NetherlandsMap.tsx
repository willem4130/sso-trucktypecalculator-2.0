'use client'

import { motion } from 'framer-motion'

interface NetherlandsMapProps {
  selectedArea: string | null
  hoveredArea: string | null
  onAreaHover?: (area: string | null) => void
}

// Netherlands map with coverage zones overlays
export function NetherlandsMap({ selectedArea, hoveredArea, onAreaHover }: NetherlandsMapProps) {
  // Map driving areas to coverage zones
  const coverageMap: Record<string, number> = {
    Regionaal: 20,
    Nationaal: 60,
    'Nationaal+': 80,
    Internationaal: 100,
  }

  const getOpacity = (area: string) => {
    if (!selectedArea && !hoveredArea) return 0.3
    if (selectedArea === area || hoveredArea === area) return 0.7
    return 0.1
  }

  const getStrokeWidth = (area: string) => {
    if (selectedArea === area || hoveredArea === area) return 2
    return 0.5
  }

  const getColor = (area: string) => {
    if (selectedArea === area) return '#f29100' // Orange
    if (hoveredArea === area) return '#ffa726'
    return '#94a3b8' // Gray
  }

  // Simplified Netherlands shape (scaled from actual GeoJSON coordinates)
  const netherlandsPath =
    'M 42,20 L 48,28 L 50,35 L 49,42 L 48,45 L 47,50 L 46,52 L 40,58 L 36,60 L 32,62 L 25,65 L 20,65 L 15,63 L 8,60 L 5,56 L 3,50 L 2,45 L 5,40 L 10,35 L 15,32 L 22,30 L 28,28 L 35,25 L 42,20 Z'

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 60 75" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Gradient for better visual */}
          <linearGradient id="nlGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f3f4f6" />
            <stop offset="100%" stopColor="#e5e7eb" />
          </linearGradient>
        </defs>

        {/* International (100%) - Background rectangle */}
        <motion.rect
          x="-5"
          y="10"
          width="70"
          height="70"
          fill={getColor('Internationaal')}
          opacity={getOpacity('Internationaal')}
          stroke={getColor('Internationaal')}
          strokeWidth={getStrokeWidth('Internationaal')}
          strokeDasharray="3,2"
          rx="2"
          initial={{ opacity: 0 }}
          animate={{ opacity: getOpacity('Internationaal') }}
          transition={{ delay: 0.4 }}
          className="cursor-pointer"
          onMouseEnter={() => onAreaHover?.('Internationaal')}
          onMouseLeave={() => onAreaHover?.(null)}
        />
        {selectedArea === 'Internationaal' || hoveredArea === 'Internationaal' ? (
          <text x="30" y="75" textAnchor="middle" className="text-[3px] font-semibold fill-white">
            100% - Europa
          </text>
        ) : null}

        {/* Nationaal+ (80%) - Extended NL region */}
        <motion.ellipse
          cx="25"
          cy="42"
          rx="28"
          ry="30"
          fill={getColor('Nationaal+')}
          opacity={getOpacity('Nationaal+')}
          stroke={getColor('Nationaal+')}
          strokeWidth={getStrokeWidth('Nationaal+')}
          strokeDasharray="2,1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 }}
          className="cursor-pointer"
          onMouseEnter={() => onAreaHover?.('Nationaal+')}
          onMouseLeave={() => onAreaHover?.(null)}
        />
        {selectedArea === 'Nationaal+' || hoveredArea === 'Nationaal+' ? (
          <text x="25" y="18" textAnchor="middle" className="text-[3px] font-semibold fill-white">
            80%
          </text>
        ) : null}

        {/* Base Netherlands outline */}
        <path
          d={netherlandsPath}
          fill="url(#nlGradient)"
          stroke="#9ca3af"
          strokeWidth="0.5"
          className="dark:fill-gray-800"
        />

        {/* Nationaal (60%) - Netherlands coverage */}
        <motion.path
          d={netherlandsPath}
          fill={getColor('Nationaal')}
          opacity={getOpacity('Nationaal')}
          stroke={getColor('Nationaal')}
          strokeWidth={getStrokeWidth('Nationaal')}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="cursor-pointer"
          onMouseEnter={() => onAreaHover?.('Nationaal')}
          onMouseLeave={() => onAreaHover?.(null)}
        />
        {selectedArea === 'Nationaal' || hoveredArea === 'Nationaal' ? (
          <text x="25" y="50" textAnchor="middle" className="text-[3px] font-semibold fill-white">
            60% - NL
          </text>
        ) : null}

        {/* Regionaal (20%) - Central area */}
        <motion.ellipse
          cx="25"
          cy="42"
          rx="10"
          ry="12"
          fill={getColor('Regionaal')}
          opacity={getOpacity('Regionaal')}
          stroke={getColor('Regionaal')}
          strokeWidth={getStrokeWidth('Regionaal')}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="cursor-pointer"
          onMouseEnter={() => onAreaHover?.('Regionaal')}
          onMouseLeave={() => onAreaHover?.(null)}
        />
        {selectedArea === 'Regionaal' || hoveredArea === 'Regionaal' ? (
          <text x="25" y="43" textAnchor="middle" className="text-[3px] font-semibold fill-white">
            20%
          </text>
        ) : null}

        {/* Label */}
        <text
          x="25"
          y="70"
          textAnchor="middle"
          className="text-[2.5px] font-medium fill-gray-500 dark:fill-gray-400"
        >
          Nederland Dekking
        </text>
      </svg>

      {/* Active area tooltip */}
      {(selectedArea || hoveredArea) && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap shadow-lg"
        >
          {selectedArea || hoveredArea} - {coverageMap[(selectedArea || hoveredArea) as string]}%
          Dekking
        </motion.div>
      )}
    </div>
  )
}
