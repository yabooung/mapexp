'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { useMapExpStore } from '@/store'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import { EXP_COLORS } from '@/constants'
import { KOREA_PROV_CODE_BY_ID } from '@/constants/regions'
import { getRegionsByCountry } from '@/data/regions'
import { loadMunicipalities, municipalityName, detectRegionAt, detectMunicipalityAt, PREF_KANJI_BY_ID, type Country } from '@/lib/geo'
import { loadJpMuniNames, muniDisplayName } from '@/lib/muniNames'
import { renderPrefectureCardImage } from '@/lib/mapSnapshot'
import { isTouchDevice } from '@/lib/dataFile'
import { useT, useLang, regionDisplayName, muniTerm, tNow, I18nKey } from '@/lib/i18n'
import Icon, { IconName } from '@/components/common/Icon'
import toast from '@/lib/appToast'
import { ev } from '@/lib/analytics'

// 지도 뷰는 Leaflet(window 의존) → SSR 비활성화 후 필요할 때만 로드
const MunicipalityMiniMap = dynamic(() => import('./MunicipalityMiniMap'), { ssr: false })

type ViewMode = 'list' | 'map'

interface MunicipalityManagerModalProps {
  isOpen: boolean
  onClose: () => void
  /** 열 때 선택할 광역 지역 (기본: 도쿄/서울) */
  initialPrefectureId?: string
}

interface MuniItem {
  id: string
  name: string // 원어 (ID·분류용 - 일본: 한자, 한국: 한글)
  display: string // 현재 언어 표시명
  level: ExperienceGrade
}

type TabId = 'all' | 'ward' | 'city' | 'town'

/**
 * 시정촌(일본)/시군구(한국) 일괄 관리 모달
 * - 광역 이동: 드롭다운 + 이전/다음 화살표
 * - 검색으로 빠른 찾기
 * - 아이템 클릭 = 레벨 순환 (지도/리스트와 동일한 조작)
 */
export default function MunicipalityManagerModal({
  isOpen,
  onClose,
  initialPrefectureId,
}: MunicipalityManagerModalProps) {
  const { getRegionById, addRegion, updateRegion, addGpsRecord, regions, country } = useMapExpStore()
  const t = useT()
  const lang = useLang()
  const [prefectureId, setPrefectureId] = useState<string>('')
  const [municipalities, setMunicipalities] = useState<MuniItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [search, setSearch] = useState('')
  // 지도가 기본 - 어디를 갔는지 공간으로 찍는 게 주 흐름, 목록은 검색·일괄용 보조
  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [locating, setLocating] = useState(false)
  // 현 위치 도장으로 잡힌 세부 지역 - 미니맵이 이 지역으로 줌 이동
  const [focusMuniId, setFocusMuniId] = useState<string | null>(null)

  const prefectures = useMemo(() => getRegionsByCountry(country), [country])
  const term = muniTerm(country, lang)

  // 모달 열릴 때 초기 광역 선택
  useEffect(() => {
    if (!isOpen) return
    setPrefectureId(initialPrefectureId || (country === 'japan' ? 'tokyo' : 'seoul'))
    setActiveTab('all')
    setSearch('')
    setViewMode('map')
    setFocusMuniId(null)
  }, [isOpen, initialPrefectureId, country])

  // ESC로 닫기 (공용 Modal을 쓰지 않는 커스텀 레이아웃이라 직접 처리)
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // 광역 변경 시 탭/검색 초기화
  useEffect(() => {
    setActiveTab('all')
    setSearch('')
  }, [prefectureId])

  // 선택된 광역의 기초 지역 목록 로드
  useEffect(() => {
    if (!isOpen || !prefectureId) return

    const loadData = async () => {
      setIsLoading(true)
      try {
        const fc = await loadMunicipalities(country as Country)
        if (!fc) return
        if (country === 'japan') await loadJpMuniNames() // 표시명 사전

        const items: MuniItem[] = []
        const seen = new Set<string>()

        fc.features.forEach((f) => {
          const props = f.properties as Record<string, string | null> | null
          let name: string | null = null

          if (country === 'japan') {
            if (props?.N03_001 !== PREF_KANJI_BY_ID[prefectureId]) return
            name = municipalityName(props)
          } else {
            const provCode = KOREA_PROV_CODE_BY_ID[prefectureId]
            if (!provCode || !props?.code?.startsWith(provCode)) return
            name = props.name
          }
          if (!name) return

          const genId = `${prefectureId}_${name}`
          if (seen.has(genId)) return // 섬 등 분리 폴리곤 중복 제거
          seen.add(genId)
          const exp = getRegionById(genId)
          const level = exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED
          items.push({ id: genId, name, display: muniDisplayName(country as Country, props, name, lang), level })
        })

        items.sort((a, b) => a.display.localeCompare(b.display))
        setMunicipalities(items)
      } catch (e) {
        console.error('Failed to load municipality data', e)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [isOpen, prefectureId, country, regions, getRegionById, lang])

  // 클릭 = 레벨 순환 (0→5→0)
  const handleCycle = (muni: MuniItem) => {
    const nextVal = (muni.level >= GyeongHyeonChi.RESIDED
      ? GyeongHyeonChi.UNVISITED
      : muni.level + 1) as ExperienceGrade
    const current = getRegionById(muni.id)
    if (current) {
      updateRegion(muni.id, { gyeonghyeonchi: nextVal })
    } else {
      addRegion({ regionId: muni.id, gyeonghyeonchi: nextVal, updatedAt: new Date().toISOString() })
    }
  }

  // 현 위치 도장: GPS로 현재 시정촌/시군구를 감지해 그 광역으로 이동 + 접지(2) GPS 인증 기록
  const handleLocateStamp = () => {
    if (locating) return
    if (!('geolocation' in navigator)) {
      toast.error(t('gps.notSupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lng } = pos.coords
          const region = await detectRegionAt(lat, lng, country as Country)
          if (!region) {
            toast.error(tNow('muni.locateFail'))
            return
          }
          setPrefectureId(region.id) // 해당 광역 화면으로 점프
          setViewMode('map') // 지도에서 바로 확인할 수 있게
          const muni = await detectMunicipalityAt(lat, lng, region.id, country as Country)
          setFocusMuniId(muni ? muni.id : null) // 미니맵이 이 세부 지역으로 줌
          const targetId = muni ? muni.id : region.id
          const prefName = (() => {
            const meta = prefectures.find((p) => p.id === region.id)
            return meta ? regionDisplayName(meta, lang) : region.name
          })()
          const label = muni
            ? `${prefName} · ${muniDisplayName(country as Country, muni.props, muni.name, lang)}`
            : prefName
          addGpsRecord(targetId, GyeongHyeonChi.LANDED)
          ev('muni_locate_stamp', { muni: !!muni })
          toast.success(tNow('gps.quickToast', { label }))
        } finally {
          setLocating(false)
        }
      },
      () => {
        toast.error(tNow('gps.denied'))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  }

  const prefMeta = prefectures.find((p) => p.id === prefectureId)
  const prefName = prefMeta ? regionDisplayName(prefMeta, lang) : prefectureId

  // 지역 카드 캡처: 이 광역의 기초 색칠 지도를 이미지로 (모바일=공유 시트, 폴백=다운로드)
  const [capturing, setCapturing] = useState(false)
  const [captureLabels, setCaptureLabels] = useState(false) // 캡처에 기초 지명 라벨 포함
  const handleCapture = async () => {
    if (capturing) return
    setCapturing(true)
    try {
      const getLevel = (id: string): ExperienceGrade => {
        const exp = getRegionById(id)
        return (exp?.gyeonghyeonchi ?? (exp?.level as ExperienceGrade) ?? GyeongHyeonChi.UNVISITED) as ExperienceGrade
      }
      const score = municipalities.reduce((s, m) => s + m.level, 0)
      const done = municipalities.filter((m) => m.level > 0).length
      const pct = Math.round((done / municipalities.length) * 100) || 0
      const dataUrl = await renderPrefectureCardImage(country as Country, prefectureId, getLevel, {
        regionName: prefName,
        subtitle: t('page.title'),
        stats: [
          { label: t('stats.visited'), value: String(done), sub: `/ ${municipalities.length}` },
          { label: t('stats.completion'), value: `${pct}%` },
          { label: 'EXP', value: String(score) },
        ],
        getLabel: captureLabels
          ? (props, name) => muniDisplayName(country as Country, props, name, lang)
          : undefined,
      })
      if (!dataUrl) throw new Error('render failed')

      const blob = await (await fetch(dataUrl)).blob()
      const fileName = `mapexp_${prefName}_${new Date().toISOString().slice(0, 10)}.png`
      const file = new File([blob], fileName, { type: 'image/png' })
      const download = () => {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = fileName
        a.click()
        toast.success(tNow('share.imageDone'))
      }
      // 공유 시트는 터치 기기에서만 (데스크톱 share()는 시트 없이 멈출 수 있음)
      if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'MAPEXP' })
        } catch (err) {
          if ((err as Error)?.name !== 'AbortError') download()
        }
      } else {
        download()
      }
      ev('muni_card_capture', { country })
    } catch {
      toast.error(tNow('share.imageFail'))
    } finally {
      setCapturing(false)
    }
  }
  const prefIndex = prefectures.findIndex((p) => p.id === prefectureId)

  const movePref = (delta: number) => {
    const next = prefectures[(prefIndex + delta + prefectures.length) % prefectures.length]
    if (next) {
      setPrefectureId(next.id)
      setFocusMuniId(null) // 수동 이동 시 초점 해제 (광역 전체 보기로)
    }
  }

  const handleBulkUpdate = (level: ExperienceGrade) => {
    if (!confirm(t(level === 0 ? 'muni.resetConfirm' : 'muni.markAllConfirm', { name: prefName }))) return

    municipalities.forEach((muni) => {
      const current = getRegionById(muni.id)
      if (current) {
        updateRegion(muni.id, { gyeonghyeonchi: level })
      } else if (level > 0) {
        addRegion({ regionId: muni.id, gyeonghyeonchi: level, updatedAt: new Date().toISOString() })
      }
    })
  }

  // 분류 탭 (일본: 区/市/町村, 한국: 구/시/군) - 접미사 자체가 라벨
  const categories = useMemo(() => {
    if (country === 'japan') {
      return {
        ward: { label: '区', items: municipalities.filter((m) => m.name.endsWith('区')) },
        city: { label: '市', items: municipalities.filter((m) => m.name.endsWith('市')) },
        town: { label: '町·村', items: municipalities.filter((m) => m.name.endsWith('町') || m.name.endsWith('村')) },
      }
    }
    return {
      ward: { label: '구', items: municipalities.filter((m) => m.name.endsWith('구')) },
      city: { label: '시', items: municipalities.filter((m) => m.name.endsWith('시')) },
      town: { label: '군', items: municipalities.filter((m) => m.name.endsWith('군')) },
    }
  }, [municipalities, country])

  const filteredMunis = useMemo(() => {
    let items = activeTab === 'all' ? municipalities : categories[activeTab].items
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter((m) => m.name.toLowerCase().includes(q) || m.display.toLowerCase().includes(q))
    }
    return items
  }, [municipalities, categories, activeTab, search])

  const visitedCount = municipalities.filter((m) => m.level > 0).length
  const total = municipalities.length
  const progress = Math.round((visitedCount / total) * 100) || 0

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-4xl h-[88vh] max-h-[680px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-line bg-paper">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            {/* 광역 선택: 이전/다음 + 드롭다운 */}
            <div className="flex items-center gap-1 min-w-0">
              <button
                onClick={() => movePref(-1)}
                className="w-8 h-8 shrink-0 rounded-md border border-line bg-card text-muted hover:text-ink flex items-center justify-center transition-colors"
                aria-label={t('muni.prevPref')}
              >
                <Icon name="chevron-left" size={16} />
              </button>
              <select
                value={prefectureId}
                onChange={(e) => {
                  setPrefectureId(e.target.value)
                  setFocusMuniId(null)
                }}
                className="text-[15px] sm:text-base font-bold text-ink bg-card border border-line rounded-md px-2.5 py-1.5 min-w-0 max-w-[190px] sm:max-w-[240px] focus:outline-none focus:border-ink"
                aria-label={t('muni.selectAria')}
              >
                {prefectures.map((p) => (
                  <option key={p.id} value={p.id}>
                    {regionDisplayName(p, lang)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => movePref(1)}
                className="w-8 h-8 shrink-0 rounded-md border border-line bg-card text-muted hover:text-ink flex items-center justify-center transition-colors"
                aria-label={t('muni.nextPref')}
              >
                <Icon name="chevron-right" size={16} />
              </button>
              {/* 현 위치 도장 - 지금 있는 세부 지역으로 점프해서 GPS 인증 접지 기록 */}
              <button
                onClick={handleLocateStamp}
                className="w-8 h-8 shrink-0 rounded-md border border-seal/40 bg-seal-soft text-seal hover:bg-seal hover:text-white flex items-center justify-center transition-colors"
                aria-label={t('muni.locate')}
                title={t('muni.locate')}
              >
                {locating ? (
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Icon name="locate" size={15} />
                )}
              </button>
              {/* 이 지역 이미지 캡처 (기초 색칠 지도 카드) */}
              <button
                onClick={handleCapture}
                className="w-8 h-8 shrink-0 rounded-md border border-line bg-card text-muted hover:text-ink flex items-center justify-center transition-colors"
                aria-label={t('muni.capture')}
                title={t('muni.capture')}
              >
                {capturing ? (
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Icon name="download" size={15} />
                )}
              </button>
              <span className="hidden sm:inline text-sm text-muted whitespace-nowrap ml-2">
                {t('muni.count', { kind: term, n: total })}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* 진행 요약 */}
              <span className="text-sm font-bold text-ink tabular-nums mr-1">
                {visitedCount}<span className="text-faint font-medium">/{total}</span>
              </span>
              <button onClick={onClose} className="p-2 text-muted hover:text-ink hover:bg-line/50 rounded-full" aria-label={t('common.close')}>
                <Icon name="x" size={16} />
              </button>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="w-full bg-card border border-line rounded-full h-2 overflow-hidden mb-3.5">
            <div className="bg-seal h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          {/* 검색 + 일괄 작업 */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('muni.search', { kind: term })}
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-card border border-line rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-faint"
              />
              <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
            </div>
            <button
              onClick={() => handleBulkUpdate(GyeongHyeonChi.VISITED)}
              className="shrink-0 px-3 py-1.5 bg-ink text-paper rounded-md hover:opacity-90 text-sm font-medium transition-opacity"
            >
              {t('muni.markAll')}
            </button>
            <button
              onClick={() => handleBulkUpdate(GyeongHyeonChi.UNVISITED)}
              className="shrink-0 px-3 py-1.5 border border-seal/40 text-seal rounded-md hover:bg-seal-soft text-sm font-medium transition-colors"
            >
              {t('muni.reset')}
            </button>
          </div>

          {/* 뷰 전환 + 분류 탭 */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-0.5">
            {/* 지도 / 목록 토글 (지도가 기본) */}
            <div className="shrink-0 flex items-center p-0.5 rounded-full border border-line bg-card mr-1">
              {(
                [
                  ['map', 'map', t('muni.viewMap')],
                  ['list', 'list', t('muni.viewList')],
                ] as Array<[ViewMode, IconName, string]>
              ).map(([mode, icon, label]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    viewMode === mode ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon name={icon} size={13} />
                  {label}
                </button>
              ))}
            </div>

            {/* 캡처 이미지에 지명 라벨 포함 여부 */}
            <button
              onClick={() => setCaptureLabels((v) => !v)}
              title={t('muni.captureLabels')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[13px] font-medium whitespace-nowrap border transition-colors flex items-center gap-1 ${
                captureLabels ? 'bg-ink text-paper border-ink' : 'bg-card text-muted border-line hover:text-ink'
              }`}
            >
              <Icon name="download" size={12} />
              {t('share.optLabels')}
            </button>

            {viewMode === 'list' ? (
              <>
                {(
                  [
                    ['all', `${t('muni.all')} ${total}`],
                    ['ward', `${categories.ward.label} ${categories.ward.items.length}`],
                    ['city', `${categories.city.label} ${categories.city.items.length}`],
                    ['town', `${categories.town.label} ${categories.town.items.length}`],
                  ] as Array<[TabId, string]>
                ).map(([tabId, label]) => (
                  <button
                    key={tabId}
                    onClick={() => setActiveTab(tabId)}
                    className={`px-3 py-1 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors border tabular-nums ${
                      activeTab === tabId
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-card text-muted border-line hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <span className="ml-auto hidden md:inline text-[11px] text-faint whitespace-nowrap">
                  {t('muni.cycleHint')}
                </span>
              </>
            ) : (
              <span className="ml-auto hidden sm:inline text-[11px] text-faint whitespace-nowrap">
                {t('muni.mapHint')}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 min-h-0 bg-paper ${viewMode === 'map' ? 'p-2.5 sm:p-3' : 'overflow-y-auto p-3 sm:p-4'}`}>
          {viewMode === 'map' ? (
            <MunicipalityMiniMap country={country as Country} prefectureId={prefectureId} focusMuniId={focusMuniId} />
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-seal"></div>
              <div className="text-muted text-sm">{t('muni.loading')}</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filteredMunis.map((muni) => {
                const isResided = muni.level === GyeongHyeonChi.RESIDED
                const isUnvisited = muni.level === GyeongHyeonChi.UNVISITED
                return (
                  <button
                    key={muni.id}
                    onClick={() => handleCycle(muni)}
                    className={`group flex items-center gap-2 p-2 pr-2.5 rounded-lg border text-left transition-all active:scale-[0.98] bg-card ${
                      isUnvisited ? 'border-line hover:border-faint' : 'border-line hover:border-seal/50'
                    }`}
                    title={`${muni.display} — ${t('muni.cycleHint')}`}
                  >
                    {/* 한 글자 도장 */}
                    <span
                      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[12px] font-bold ${
                        isUnvisited
                          ? 'border-[1.5px] border-dashed border-line text-faint'
                          : isResided
                            ? 'bg-seal text-white'
                            : 'text-ink/75 border border-black/10'
                      }`}
                      style={{
                        backgroundColor: isUnvisited || isResided ? undefined : EXP_COLORS[muni.level],
                        transform: isUnvisited ? undefined : 'rotate(-4deg)',
                      }}
                    >
                      {t(`level.short.${muni.level}` as I18nKey)}
                    </span>

                    <span className="flex-1 min-w-0">
                      <span className={`block text-[13px] font-bold truncate leading-tight ${isUnvisited ? 'text-muted' : 'text-ink'}`}>
                        {muni.display}
                      </span>
                      {/* 진행 점 */}
                      <span className="flex gap-[2.5px] mt-1">
                        {[1, 2, 3, 4, 5].map((step) => (
                          <span
                            key={step}
                            className="w-[5px] h-[5px] rounded-full"
                            style={{
                              backgroundColor:
                                step <= muni.level
                                  ? isResided ? 'var(--seal)' : EXP_COLORS[muni.level]
                                  : 'var(--line)',
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
