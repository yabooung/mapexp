'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import { KOREA_PROV_CODE_BY_ID } from '@/constants/regions'
import { getRegionsByCountry } from '@/data/regions'
import { loadMunicipalities, municipalityName, PREF_KANJI_BY_ID, type Country } from '@/lib/geo'

interface MunicipalityManagerModalProps {
  isOpen: boolean
  onClose: () => void
  /** 열 때 선택할 광역 지역 (기본: 도쿄/서울) */
  initialPrefectureId?: string
}

interface MuniItem {
  id: string
  name: string
  level: ExperienceGrade
}

type TabId = 'all' | 'ward' | 'city' | 'town'

/**
 * 시정촌(일본)/시군구(한국) 일괄 관리 모달 — 전 광역 지역 지원
 */
export default function MunicipalityManagerModal({
  isOpen,
  onClose,
  initialPrefectureId,
}: MunicipalityManagerModalProps) {
  const { getRegionById, addRegion, updateRegion, regions, country } = useMapExpStore()
  const [prefectureId, setPrefectureId] = useState<string>('')
  const [municipalities, setMunicipalities] = useState<MuniItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMuni, setSelectedMuni] = useState<MuniItem | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('all')

  const prefectures = useMemo(() => getRegionsByCountry(country), [country])

  // 모달 열릴 때 초기 광역 선택
  useEffect(() => {
    if (!isOpen) return
    setPrefectureId(initialPrefectureId || (country === 'japan' ? 'tokyo' : 'seoul'))
    setActiveTab('all')
    setSelectedMuni(null)
  }, [isOpen, initialPrefectureId, country])

  // 선택된 광역의 기초 지역 목록 로드
  useEffect(() => {
    if (!isOpen || !prefectureId) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const fc = await loadMunicipalities(country as Country)
        if (!fc) return

        const items: MuniItem[] = []
        const seen = new Set<string>()

        if (country === 'japan') {
          const prefKanji = PREF_KANJI_BY_ID[prefectureId]
          fc.features.forEach((f) => {
            const props = f.properties as Record<string, string | null> | null
            if (props?.N03_001 !== prefKanji) return
            const name = municipalityName(props)
            if (!name) return
            const genId = `${prefectureId}_${name}`
            if (seen.has(genId)) return // 섬 등 분리 폴리곤 중복 제거
            seen.add(genId)
            const exp = getRegionById(genId)
            const level = exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
            items.push({ id: genId, name, level })
          })
        } else {
          const provCode = KOREA_PROV_CODE_BY_ID[prefectureId]
          fc.features.forEach((f) => {
            const props = f.properties as Record<string, string | null> | null
            if (!provCode || !props?.code?.startsWith(provCode)) return
            const name = props.name
            if (!name) return
            const genId = `${prefectureId}_${name}`
            if (seen.has(genId)) return
            seen.add(genId)
            const exp = getRegionById(genId)
            const level = exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
            items.push({ id: genId, name, level })
          })
        }

        items.sort((a, b) => a.name.localeCompare(b.name))
        setMunicipalities(items)
      } catch (e) {
        console.error('Failed to load municipality data', e)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [isOpen, prefectureId, country, regions, getRegionById])

  const handleLevelChange = (muni: MuniItem, newLevel: ExperienceGrade) => {
    const current = getRegionById(muni.id)
    if (current) {
      updateRegion(muni.id, { gyeonghyeonchi: newLevel })
    } else {
      addRegion({ regionId: muni.id, gyeonghyeonchi: newLevel, updatedAt: new Date().toISOString() })
    }
    setSelectedMuni(null)
  }

  const prefName = prefectures.find((p) => p.id === prefectureId)?.name || prefectureId

  const handleBulkUpdate = (level: ExperienceGrade) => {
    if (!confirm(level === 0 ? `${prefName}의 기초 지역 기록을 모두 초기화할까요?` : `${prefName}의 기초 지역을 모두 '방문'으로 표시할까요?`)) return

    municipalities.forEach((muni) => {
      const current = getRegionById(muni.id)
      if (current) {
        updateRegion(muni.id, { gyeonghyeonchi: level })
      } else if (level > 0) {
        addRegion({ regionId: muni.id, gyeonghyeonchi: level, updatedAt: new Date().toISOString() })
      }
    })
  }

  // 분류 탭 (일본: 区/市/町村, 한국: 구/시/군)
  const categories = useMemo(() => {
    if (country === 'japan') {
      return {
        ward: { label: '구(区)', items: municipalities.filter((m) => m.name.endsWith('区')) },
        city: { label: '시(市)', items: municipalities.filter((m) => m.name.endsWith('市')) },
        town: { label: '정·촌', items: municipalities.filter((m) => m.name.endsWith('町') || m.name.endsWith('村')) },
      }
    }
    return {
      ward: { label: '구', items: municipalities.filter((m) => m.name.endsWith('구')) },
      city: { label: '시', items: municipalities.filter((m) => m.name.endsWith('시')) },
      town: { label: '군', items: municipalities.filter((m) => m.name.endsWith('군')) },
    }
  }, [municipalities, country])

  const getFilteredMunis = () => {
    if (activeTab === 'all') return municipalities
    return categories[activeTab].items
  }

  const visitedCount = municipalities.filter((m) => m.level > 0).length
  const total = municipalities.length
  const progress = Math.round((visitedCount / total) * 100) || 0

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-line bg-paper">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* 광역 선택 */}
              <select
                value={prefectureId}
                onChange={(e) => setPrefectureId(e.target.value)}
                className="text-lg font-bold text-ink bg-card border border-line rounded-md px-3 py-1.5 max-w-[220px] focus:outline-none focus:border-ink"
                aria-label="광역 지역 선택"
              >
                {prefectures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted whitespace-nowrap hidden sm:block">
                {country === 'japan' ? '시정촌' : '시군구'} {total}개
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-muted hover:text-ink hover:bg-line/50 rounded-full shrink-0" aria-label="닫기">
              ✕
            </button>
          </div>

          {/* Stats & Bulk Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-3 rounded-lg border border-line">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex flex-col">
                <span className="text-xs text-muted font-semibold uppercase tracking-wider">진행</span>
                <div className="text-xl font-bold text-ink tabular-nums">
                  {visitedCount} <span className="text-faint text-sm">/ {total}</span>
                </div>
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
            {(
              [
                ['all', `전체 (${total})`],
                ['ward', `${categories.ward.label} (${categories.ward.items.length})`],
                ['city', `${categories.city.label} (${categories.city.items.length})`],
                ['town', `${categories.town.label} (${categories.town.items.length})`],
              ] as Array<[TabId, string]>
            ).map(([tabId, label]) => (
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
        <div className="flex-1 overflow-y-auto p-4 bg-paper">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seal"></div>
              <div className="text-muted text-sm">데이터를 불러오는 중...</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {getFilteredMunis().map((muni) => (
                <div
                  key={muni.id}
                  className={`group relative p-3 rounded-lg border transition-colors cursor-pointer bg-card ${
                    muni.level > 0 ? 'border-faint' : 'border-line hover:border-faint'
                  }`}
                  onClick={() => setSelectedMuni(muni)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold truncate ${muni.level > 0 ? 'text-ink' : 'text-muted'}`}>
                      {muni.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="w-full h-1.5 rounded-full bg-paper overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: '100%',
                          backgroundColor: muni.level > 0 ? EXP_COLORS[muni.level] : 'var(--line)',
                        }}
                      />
                    </div>
                    <span className="text-xs text-faint tabular-nums w-4 text-right">{muni.level}</span>
                  </div>

                  {/* Inline Selector Overlay */}
                  {selectedMuni?.id === muni.id && (
                    <div
                      className="absolute inset-0 bg-card/95 backdrop-blur-sm border-2 border-ink rounded-lg flex items-center justify-center z-10 p-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-3 gap-1 w-full h-full p-1">
                        {[0, 1, 2, 3, 4, 5].map((lvl) => (
                          <button
                            key={lvl}
                            className={`rounded flex flex-col items-center justify-center text-[10px] font-bold transition-transform hover:scale-105 active:scale-95 ${
                              muni.level === lvl ? 'ring-2 ring-ink z-10' : 'opacity-80 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: EXP_COLORS[lvl as ExperienceGrade] }}
                            onClick={() => handleLevelChange(muni, lvl as ExperienceGrade)}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                      <button
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center text-xs shadow-md"
                        onClick={() => setSelectedMuni(null)}
                        aria-label="닫기"
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
    document.body,
  )
}
