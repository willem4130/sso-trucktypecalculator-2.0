interface TruckIllustrationProps {
  vehicleType: string
  className?: string
}

export function TruckIllustration({ vehicleType, className = '' }: TruckIllustrationProps) {
  // Determine truck type based on name
  const isBakwagen = vehicleType.toLowerCase().includes('bakwagen')
  const isBouwvoertuig = vehicleType.toLowerCase().includes('bouwvoertuig')
  const isTrekker = vehicleType.toLowerCase().includes('trekker')
  const isKlein = vehicleType.toLowerCase().includes('klein')
  const isGroot = vehicleType.toLowerCase().includes('groot')
  const isZwaar = vehicleType.toLowerCase().includes('zwaar')

  // Box truck illustration (Bakwagen)
  if (isBakwagen) {
    return (
      <svg
        viewBox="0 0 200 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Cargo box */}
        <rect
          x="80"
          y="25"
          width={isKlein ? '70' : isGroot ? '100' : '85'}
          height="45"
          fill="#f29100"
          stroke="#08192c"
          strokeWidth="2"
        />
        {/* Box details */}
        <line
          x1="80"
          y1="40"
          x2={isKlein ? '150' : isGroot ? '180' : '165'}
          y2="40"
          stroke="#08192c"
          strokeWidth="1"
          opacity="0.3"
        />
        <line
          x1="80"
          y1="55"
          x2={isKlein ? '150' : isGroot ? '180' : '165'}
          y2="55"
          stroke="#08192c"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Cabin */}
        <path
          d="M 60 30 L 60 70 L 80 70 L 80 30 L 70 20 L 60 30 Z"
          fill="#08192c"
          stroke="#08192c"
          strokeWidth="2"
        />
        {/* Window */}
        <rect
          x="63"
          y="33"
          width="14"
          height="12"
          fill="#87ceeb"
          stroke="#08192c"
          strokeWidth="1"
        />

        {/* Wheels */}
        <circle cx="75" cy="70" r="8" fill="#333" stroke="#08192c" strokeWidth="2" />
        <circle cx="75" cy="70" r="4" fill="#666" />
        <circle
          cx={isKlein ? '140' : isGroot ? '165' : '150'}
          cy="70"
          r="8"
          fill="#333"
          stroke="#08192c"
          strokeWidth="2"
        />
        <circle cx={isKlein ? '140' : isGroot ? '165' : '150'} cy="70" r="4" fill="#666" />

        {/* Ground */}
        <line x1="40" y1="78" x2="190" y2="78" stroke="#666" strokeWidth="1" opacity="0.3" />
      </svg>
    )
  }

  // Construction vehicle (Bouwvoertuig)
  if (isBouwvoertuig) {
    return (
      <svg
        viewBox="0 0 200 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Tipper body */}
        <path
          d="M 80 30 L 160 30 L 170 70 L 80 70 Z"
          fill="#f29100"
          stroke="#08192c"
          strokeWidth="2"
        />
        {/* Tipper details */}
        <line x1="90" y1="30" x2="95" y2="70" stroke="#08192c" strokeWidth="1" opacity="0.3" />
        <line x1="110" y1="30" x2="115" y2="70" stroke="#08192c" strokeWidth="1" opacity="0.3" />
        <line x1="130" y1="30" x2="135" y2="70" stroke="#08192c" strokeWidth="1" opacity="0.3" />
        <line x1="150" y1="30" x2="155" y2="70" stroke="#08192c" strokeWidth="1" opacity="0.3" />

        {/* Cabin */}
        <path
          d="M 55 35 L 55 70 L 80 70 L 80 35 L 67 22 L 55 35 Z"
          fill="#08192c"
          stroke="#08192c"
          strokeWidth="2"
        />
        {/* Window */}
        <rect
          x="58"
          y="38"
          width="18"
          height="14"
          fill="#87ceeb"
          stroke="#08192c"
          strokeWidth="1"
        />

        {/* Wheels */}
        <circle cx="70" cy="70" r="9" fill="#333" stroke="#08192c" strokeWidth="2" />
        <circle cx="70" cy="70" r="5" fill="#666" />
        <circle cx="145" cy="70" r="9" fill="#333" stroke="#08192c" strokeWidth="2" />
        <circle cx="145" cy="70" r="5" fill="#666" />
        <circle cx="160" cy="70" r="9" fill="#333" stroke="#08192c" strokeWidth="2" />
        <circle cx="160" cy="70" r="5" fill="#666" />

        {/* Ground */}
        <line x1="40" y1="79" x2="190" y2="79" stroke="#666" strokeWidth="1" opacity="0.3" />
      </svg>
    )
  }

  // Tractor unit (Trekker)
  if (isTrekker) {
    return (
      <svg
        viewBox="0 0 200 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Trailer */}
        <rect
          x="110"
          y="25"
          width="75"
          height="45"
          fill="#e0e0e0"
          stroke="#08192c"
          strokeWidth="2"
        />
        {/* Trailer details */}
        <line x1="110" y1="40" x2="185" y2="40" stroke="#08192c" strokeWidth="1" opacity="0.3" />
        <line x1="110" y1="55" x2="185" y2="55" stroke="#08192c" strokeWidth="1" opacity="0.3" />
        <rect x="180" y="32" width="4" height="8" fill="#d00" />

        {/* Tractor cabin */}
        <path
          d={
            isZwaar
              ? 'M 50 25 L 50 70 L 110 70 L 110 40 L 95 25 Z'
              : 'M 55 30 L 55 70 L 110 70 L 110 42 L 98 30 Z'
          }
          fill="#f29100"
          stroke="#08192c"
          strokeWidth="2"
        />
        {/* Cabin roof */}
        <path
          d={isZwaar ? 'M 50 25 L 95 25 L 85 15 L 60 15 Z' : 'M 55 30 L 98 30 L 90 22 L 65 22 Z'}
          fill="#08192c"
          stroke="#08192c"
          strokeWidth="2"
        />
        {/* Windows */}
        <rect
          x={isZwaar ? '58' : '63'}
          y={isZwaar ? '30' : '35'}
          width="20"
          height="15"
          fill="#87ceeb"
          stroke="#08192c"
          strokeWidth="1"
        />
        <rect
          x={isZwaar ? '85' : '88'}
          y={isZwaar ? '30' : '35'}
          width="18"
          height="15"
          fill="#87ceeb"
          stroke="#08192c"
          strokeWidth="1"
        />

        {/* Wheels - tractor */}
        <circle
          cx={isZwaar ? '65' : '70'}
          cy="70"
          r={isZwaar ? '10' : '9'}
          fill="#333"
          stroke="#08192c"
          strokeWidth="2"
        />
        <circle cx={isZwaar ? '65' : '70'} cy="70" r={isZwaar ? '6' : '5'} fill="#666" />
        <circle
          cx={isZwaar ? '95' : '98'}
          cy="70"
          r={isZwaar ? '10' : '9'}
          fill="#333"
          stroke="#08192c"
          strokeWidth="2"
        />
        <circle cx={isZwaar ? '95' : '98'} cy="70" r={isZwaar ? '6' : '5'} fill="#666" />

        {/* Wheels - trailer */}
        <circle cx="155" cy="70" r="8" fill="#333" stroke="#08192c" strokeWidth="2" />
        <circle cx="155" cy="70" r="4" fill="#666" />
        <circle cx="170" cy="70" r="8" fill="#333" stroke="#08192c" strokeWidth="2" />
        <circle cx="170" cy="70" r="4" fill="#666" />

        {/* Ground */}
        <line x1="35" y1="78" x2="195" y2="78" stroke="#666" strokeWidth="1" opacity="0.3" />
      </svg>
    )
  }

  // Default truck illustration
  return (
    <svg viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="80" y="30" width="90" height="40" fill="#f29100" stroke="#08192c" strokeWidth="2" />
      <path
        d="M 60 35 L 60 70 L 80 70 L 80 35 L 70 25 L 60 35 Z"
        fill="#08192c"
        stroke="#08192c"
        strokeWidth="2"
      />
      <rect x="63" y="38" width="14" height="12" fill="#87ceeb" stroke="#08192c" strokeWidth="1" />
      <circle cx="75" cy="70" r="8" fill="#333" stroke="#08192c" strokeWidth="2" />
      <circle cx="75" cy="70" r="4" fill="#666" />
      <circle cx="155" cy="70" r="8" fill="#333" stroke="#08192c" strokeWidth="2" />
      <circle cx="155" cy="70" r="4" fill="#666" />
      <line x1="40" y1="78" x2="180" y2="78" stroke="#666" strokeWidth="1" opacity="0.3" />
    </svg>
  )
}
