
import { MapContainer, TileLayer, Rectangle, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Koordinat dummy Bekasi area (ganti dengan koordinat proyek kamu)
const center: [number, number] = [-6.2415, 107.1234]

// Area bounds dummy A-F
const areas = [
  { id: 'AREA-A', name: 'Area A Office', bounds: [[-6.241,107.123],[ -6.242,107.124]] as any, color: '#22c55e', permits: 2 },
  { id: 'AREA-B', name: 'Area B Pipe Rack', bounds: [[-6.242,107.124],[ -6.243,107.125]] as any, color: '#ef4444', permits: 5 },
  { id: 'AREA-C', name: 'Area C Structure', bounds: [[-6.243,107.125],[ -6.244,107.126]] as any, color: '#f59e0b', permits: 1 },
]

export function PlantMap({ onSelectArea }: { onSelectArea?: (id:string)=>void }){
  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden border">
      <MapContainer center={center} zoom={17} style={{height:'100%', width:'100%'}}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        {areas.map(a=>(
          <Rectangle 
            key={a.id} 
            bounds={a.bounds} 
            pathOptions={{color: a.color, fillOpacity: 0.3, weight: 2}}
            eventHandlers={{ click: ()=> onSelectArea?.(a.id) }}
          >
            <Popup>
              <b>{a.name}</b><br/>
              Active Permits: {a.permits}<br/>
              {a.color === '#ef4444' && <span className="text-red-600 font-bold">OVERLAP KRITIS!</span>}
            </Popup>
          </Rectangle>
        ))}
      </MapContainer>
    </div>
  )
}
