'use client'

import { motion } from 'framer-motion'
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from 'react-simple-maps'
import { memo } from 'react'

interface NetherlandsMapProps {
  selectedArea: string | null
  hoveredArea: string | null
  onAreaHover?: (area: string | null) => void
}

// Netherlands TopoJSON URL (public CDN)
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-10m.json'

// SCEX Orange brand color
const ORANGE = '#f29100'

export const NetherlandsMap = memo(function NetherlandsMap({
  selectedArea,
  hoveredArea,
}: NetherlandsMapProps) {
  const displayArea = hoveredArea || selectedArea

  // Determine what to show based on selected area
  const showRegionaal = displayArea === 'Regionaal'
  const showNationaalPlus = displayArea === 'Nationaal+'
  const showInternationaal = displayArea === 'Internationaal'

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: showInternationaal ? 600 : 2800,
          center: showInternationaal ? [10, 52] : [5.2, 52.1],
        }}
        className="w-full h-full"
        style={{
          width: '100%',
          height: '100%',
        }}
      >
        <ZoomableGroup zoom={1}>
          <Geographies geography={geoUrl}>
            {({ geographies }) => (
              <>
                {/* Show Europe for Internationaal */}
                {showInternationaal &&
                  geographies
                    .filter((geo) =>
                      [
                        'Netherlands',
                        'Belgium',
                        'Germany',
                        'France',
                        'Luxembourg',
                        'Austria',
                        'Switzerland',
                        'Denmark',
                        'Poland',
                        'Czechia',
                      ].includes(geo.properties.name)
                    )
                    .map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={geo.properties.name === 'Netherlands' ? ORANGE : '#e0e0e0'}
                        stroke="#999"
                        strokeWidth={0.5}
                        style={{
                          default: {
                            fill: geo.properties.name === 'Netherlands' ? ORANGE : '#e0e0e0',
                            stroke: '#999',
                            strokeWidth: 0.5,
                            opacity: geo.properties.name === 'Netherlands' ? 0.8 : 0.4,
                            outline: 'none',
                          },
                          hover: {
                            fill: geo.properties.name === 'Netherlands' ? ORANGE : '#e0e0e0',
                            stroke: '#666',
                            strokeWidth: 0.8,
                            opacity: geo.properties.name === 'Netherlands' ? 0.9 : 0.5,
                            outline: 'none',
                          },
                          pressed: {
                            fill: geo.properties.name === 'Netherlands' ? ORANGE : '#e0e0e0',
                            stroke: '#999',
                            strokeWidth: 0.5,
                            opacity: geo.properties.name === 'Netherlands' ? 0.8 : 0.4,
                            outline: 'none',
                          },
                        }}
                      />
                    ))}

                {/* Show Netherlands for Nationaal, Nationaal+, and Regionaal */}
                {!showInternationaal &&
                  geographies
                    .filter((geo) => geo.properties.name === 'Netherlands')
                    .map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={ORANGE}
                        stroke="#d67700"
                        strokeWidth={1.5}
                        style={{
                          default: {
                            fill: ORANGE,
                            stroke: '#d67700',
                            strokeWidth: 1.5,
                            opacity: 0.7,
                            outline: 'none',
                          },
                          hover: {
                            fill: ORANGE,
                            stroke: '#d67700',
                            strokeWidth: 2,
                            opacity: 0.8,
                            outline: 'none',
                          },
                          pressed: {
                            fill: ORANGE,
                            stroke: '#d67700',
                            strokeWidth: 1.5,
                            opacity: 0.7,
                            outline: 'none',
                          },
                        }}
                      />
                    ))}

                {/* Show neighboring countries for Nationaal+ */}
                {showNationaalPlus &&
                  geographies
                    .filter((geo) => ['Belgium', 'Germany'].includes(geo.properties.name))
                    .map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#ffa726"
                        stroke="#d67700"
                        strokeWidth={1}
                        style={{
                          default: {
                            fill: '#ffa726',
                            stroke: '#d67700',
                            strokeWidth: 1,
                            opacity: 0.3,
                            outline: 'none',
                          },
                          hover: {
                            fill: '#ffa726',
                            stroke: '#d67700',
                            strokeWidth: 1.5,
                            opacity: 0.4,
                            outline: 'none',
                          },
                          pressed: {
                            fill: '#ffa726',
                            stroke: '#d67700',
                            strokeWidth: 1,
                            opacity: 0.3,
                            outline: 'none',
                          },
                        }}
                      />
                    ))}
              </>
            )}
          </Geographies>

          {/* Regionaal - Central marker (Randstad area) */}
          {showRegionaal && !showInternationaal && (
            <Marker coordinates={[4.9, 52.1]}>
              <circle r={15} fill={ORANGE} opacity={0.5} stroke={ORANGE} strokeWidth={2} />
              <circle r={8} fill={ORANGE} opacity={0.8} />
            </Marker>
          )}
        </ZoomableGroup>
      </ComposableMap>

      {/* Compact Legend */}
      {displayArea && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-2 right-2 bg-white/95 dark:bg-gray-800/95 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ORANGE }} />
            <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
              {displayArea === 'Regionaal' && 'Centraal NL'}
              {displayArea === 'Nationaal' && 'Nederland'}
              {displayArea === 'Nationaal+' && 'NL + Grens'}
              {displayArea === 'Internationaal' && 'Europa'}
            </span>
          </div>
        </motion.div>
      )}

      {/* No selection state */}
      {!displayArea && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">Selecteer een rijgebied</p>
        </div>
      )}
    </div>
  )
})
