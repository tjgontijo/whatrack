'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix para ícone do marker no Next.js
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface LocationPickerProps {
  latitude: number
  longitude: number
  onLocationChange: (lat: number, lng: number) => void
}

// Componente para controlar o centro do mapa
function MapController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom())
  }, [map, lat, lng])

  return null
}

function LocationMarker({
  position,
  onLocationChange,
}: {
  position: [number, number]
  onLocationChange: (lat: number, lng: number) => void
}) {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(position)
  const markerRef = useRef<L.Marker>(null)

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng
      setMarkerPosition([lat, lng])
      onLocationChange(lat, lng)
    },
  })

  useEffect(() => {
    setMarkerPosition(position)
  }, [position])

  return (
    <Marker
      ref={markerRef}
      position={markerPosition}
      icon={markerIcon}
      draggable
      eventHandlers={{
        dragend: () => {
          const marker = markerRef.current
          if (marker) {
            const { lat, lng } = marker.getLatLng()
            setMarkerPosition([lat, lng])
            onLocationChange(lat, lng)
          }
        },
      }}
    />
  )
}

export function LocationPicker({ latitude, longitude, onLocationChange }: LocationPickerProps) {
  const position: [number, number] = [latitude, longitude]

  return (
    <div className="h-[200px] w-full rounded-lg overflow-hidden border">
      <MapContainer
        center={position}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController lat={latitude} lng={longitude} />
        <LocationMarker position={position} onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  )
}
