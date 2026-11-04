
import { createBrowserRouter } from 'react-router-dom'
// Nanti import pages dari features

export const router = createBrowserRouter([
  { path: '/', element: <div className="p-8">Dashboard - Lihat prototype HTML yang kemarin untuk UI lengkap</div> },
  { path: '/vendors', element: <div>Vendors</div> },
  { path: '/work-permits', element: <div>Work Permits - pakai OverlapWarning.tsx</div> },
  { path: '/mapping', element: <div>Mapping - pakai PlantMap.tsx</div> },
  { path: '/patrol', element: <div>Patrol Mobile PWA - pakai html5-qrcode</div> },
])
