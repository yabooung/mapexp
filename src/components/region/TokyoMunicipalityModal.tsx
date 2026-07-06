import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import { REGION_ID_MAP } from '@/constants/regions'

interface TokyoMunicipalityModalProps {
  isOpen: boolean
  onClose: () => void
}

interface MuniItem {
  id: string
  name: string
  level: ExperienceGrade
}

export default function TokyoMunicipalityModal({ isOpen, onClose }: TokyoMunicipalityModalProps) {
  const { getRegionById, addRegion, updateRegion, regions } = useMapExpStore()
  const [municipalities, setMunicipalities] = useState<MuniItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMuni, setSelectedMuni] = useState<MuniItem | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'ward' | 'city' | 'town'>('all')

  useEffect(() => {
    if (!isOpen) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        // Fetch strictly the municipalities file we are using
        // User provided specific file for Tokyo
        const res = await fetch('/geojson/japan-detail/N03-21_13_210101.json')
        const json = await res.json()
        
        if (json.type === 'FeatureCollection') {
           // File is already Tokyo specific, but we can keep safety check or map directly
           const tokyoFeats = json.features
           
           const items: MuniItem[] = tokyoFeats.map((f: any) => {
               const name = f.properties?.N03_004 || f.properties?.name || 'Unknown'
               const pref = f.properties?.N03_001
               
               let parentId = pref
               if (pref && REGION_ID_MAP['japan'][pref]) {
                   parentId = REGION_ID_MAP['japan'][pref]
               }
               const genId = `${parentId}_${name}`
               
               const exp = getRegionById(genId)
               const level = exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
               
               return { id: genId, name, level }
           })
           
           items.sort((a, b) => a.name.localeCompare(b.name))
           setMunicipalities(items)
        }
      } catch (e) {
          console.error("Failed to load Tokyo data", e)
      } finally {
          setIsLoading(false)
      }
    }
    loadData()
  }, [isOpen, regions, getRegionById]) 

  const handleLevelChange = (muni: MuniItem, newLevel: ExperienceGrade) => {
      const current = getRegionById(muni.id)
      if (current) {
          updateRegion(muni.id, { gyeonghyeonchi: newLevel })
      } else {
          addRegion({ regionId: muni.id, gyeonghyeonchi: newLevel, updatedAt: new Date().toISOString() })
      }
      // Local update handled by useEffect dependency on 'regions' or we can optimize
      setSelectedMuni(null) 
  }

  const handleBulkUpdate = (level: ExperienceGrade) => {
      if (!confirm(level === 0 ? 'Are you sure you want to reset all Tokyo progress?' : 'Mark all as Visited?')) return
      
      municipalities.forEach(muni => {
          const current = getRegionById(muni.id)
          if (current) {
               updateRegion(muni.id, { gyeonghyeonchi: level })
          } else if (level > 0) {
               addRegion({ regionId: muni.id, gyeonghyeonchi: level, updatedAt: new Date().toISOString() })
          }
      })
  }

  // Categories
  const wards = municipalities.filter(m => m.name.endsWith('区'))
  const cities = municipalities.filter(m => m.name.endsWith('市'))
  const towns = municipalities.filter(m => m.name.endsWith('町') || m.name.endsWith('村'))
  
  const getFilteredMunis = () => {
      switch(activeTab) {
          case 'ward': return wards
          case 'city': return cities
          case 'town': return towns
          default: return municipalities
      }
  }

  const visitedCount = municipalities.filter(m => m.level > 0).length
  const total = municipalities.length
  const progress = Math.round((visitedCount / total) * 100) || 0

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-line bg-paper">
           <div className="flex items-center justify-between mb-4">
               <div>
                   <h2 className="text-xl font-bold text-ink tracking-tight">도쿄 시정촌 관리</h2>
                   <p className="text-sm text-muted">{total}개 시정촌을 한 번에 관리합니다</p>
               </div>
               <button onClick={onClose} className="p-2 text-muted hover:text-ink hover:bg-line/50 rounded-full" aria-label="닫기">✕</button>
           </div>

           {/* Stats & Bulk Actions */}
           <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-3 rounded-lg border border-line">
               <div className="flex items-center gap-4 w-full sm:w-auto">
                   <div className="flex flex-col">
                       <span className="text-xs text-muted font-semibold uppercase tracking-wider">진행</span>
                       <div className="text-xl font-bold text-ink tabular-nums">{visitedCount} <span className="text-faint text-sm">/ {total}</span></div>
                   </div>
                   <div className="h-8 w-px bg-line"></div>
                   <div className="flex flex-col flex-1 sm:w-48">
                       <div className="flex justify-between text-xs mb-1 text-muted">
                           <span>달성률</span>
                           <span className="tabular-nums">{progress}%</span>
                       </div>
                       <div className="w-full bg-paper rounded-full h-1.5">
                           <div className="bg-seal h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                       </div>
                   </div>
               </div>

               <div className="flex gap-2 w-full sm:w-auto">
                   <button
                     onClick={() => handleBulkUpdate(GyeongHyeonChi.VISITED)}
                     className="flex-1 sm:flex-none px-3 py-1.5 bg-ink text-paper rounded-md hover:opacity-90 text-sm font-medium transition-opacity"
                   >
                     전체 방문 처리
                   </button>
                   <button
                     onClick={() => handleBulkUpdate(GyeongHyeonChi.UNVISITED)}
                     className="flex-1 sm:flex-none px-3 py-1.5 border border-seal/40 text-seal rounded-md hover:bg-seal-soft text-sm font-medium transition-colors"
                   >
                     초기화
                   </button>
               </div>
           </div>

           {/* Tabs */}
           <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">
               {([
                 ['all', `전체 (${total})`],
                 ['ward', `23구 (${wards.length})`],
                 ['city', `시 (${cities.length})`],
                 ['town', `정·촌 (${towns.length})`],
               ] as const).map(([tabId, label]) => (
                 <button
                   key={tabId}
                   onClick={() => setActiveTab(tabId)}
                   className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                     activeTab === tabId
                       ? 'bg-ink text-paper border-ink'
                       : 'bg-card text-muted border-line hover:text-ink'
                   }`}
                 >
                   {label}
                 </button>
               ))}
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div className="text-gray-500">Loading municipality data...</div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {getFilteredMunis().map(muni => (
                        <div 
                           key={muni.id} 
                           className={`
                             group relative p-3 rounded-lg border transition-all duration-200 cursor-pointer
                             ${muni.level > 0 ? 'bg-white border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300'}
                           `}
                           onClick={() => setSelectedMuni(muni)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`font-bold truncate ${muni.level > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {muni.name}
                                </span>
                                {muni.level > 0 && (
                                    <span className="flex h-2 w-2 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-full h-2 rounded-full bg-gray-100 overflow-hidden"
                                >
                                    <div 
                                      className="h-full transition-all duration-300"
                                      style={{ 
                                          width: '100%', 
                                          backgroundColor: muni.level > 0 ? EXP_COLORS[muni.level] : '#E5E7EB' 
                                      }}
                                    />
                                </div>
                                <span className="text-xs text-gray-400 font-mono w-4 text-right">{muni.level}</span>
                            </div>
                            
                            {/* Inline Selector Overlay */}
                            {selectedMuni?.id === muni.id && (
                                <div 
                                  className="absolute inset-0 bg-white/95 backdrop-blur-sm border-2 border-blue-500 rounded-lg flex items-center justify-center z-10 p-1 animate-in fade-in zoom-in-95 duration-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="grid grid-cols-3 gap-1 w-full h-full p-1">
                                        {[0, 1, 2, 3, 4, 5].map(lvl => (
                                            <button
                                               key={lvl}
                                               className={`
                                                 rounded flex flex-col items-center justify-center text-[10px] font-bold transition-transform hover:scale-105 active:scale-95
                                                 ${muni.level === lvl ? 'ring-2 ring-black z-10' : 'opacity-80 hover:opacity-100'}
                                               `}
                                               style={{ backgroundColor: EXP_COLORS[lvl as ExperienceGrade] }}
                                               onClick={() => handleLevelChange(muni, lvl as ExperienceGrade)}
                                            >
                                                {lvl}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs shadow-md hover:bg-black"
                                      onClick={() => setSelectedMuni(null)}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>,
    document.body
  )
}
