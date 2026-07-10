'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { useMapExpStore } from '@/store'
import { parseShareUrl } from '@/lib/share'
import toast from 'react-hot-toast'
import CountrySelector from '@/components/common/CountrySelector'
import RegionList from '@/components/region/RegionList'
import RegionModal from '@/components/region/RegionModal'
import StatsPanel from '@/components/stats/StatsPanel'
import BadgePanel from '@/components/stats/BadgePanel'
import MunicipalityManagerModal from '@/components/region/MunicipalityManagerModal'
import GpsManager from '@/components/gps/GpsManager'
import LevelUpWatcher from '@/components/common/LevelUpWatcher'
import OnboardingHint from '@/components/common/OnboardingHint'
import ViewerBanner from '@/components/common/ViewerBanner'
import StoragePersist from '@/components/common/StoragePersist'
import { ev } from '@/lib/analytics'
import BottomNav, { MobileTab } from '@/components/layout/BottomNav'
import Icon from '@/components/common/Icon'
import { useT, useLang, muniTerm } from '@/lib/i18n'

// Leaflet을 dynamic import (SSR 비활성화)
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">지도 로딩 중...</p>
      </div>
    </div>
  ),
})

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { country, enterViewerMode, initViewerFromStorage } = useMapExpStore()
  const isViewer = useMapExpStore((s) => s.isViewer)

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [view, setView] = useState<MobileTab>('map')
  const [showTokyoModal, setShowTokyoModal] = useState(false)
  const [showBothMaps, setShowBothMaps] = useState(false)
  const t = useT()
  const lang = useLang()
  // 기초 지역 용어는 보고 있는 국가를 따름 (일본=시정촌, 한국=시군구)
  const term = muniTerm(country, lang)

  // 새로고침 후에도 뷰어 모드 유지
  useEffect(() => {
    initViewerFromStorage()
  }, [initViewerFromStorage])

  // 공유 URL 처리 - 읽기 전용 뷰어로 열기 (내 데이터는 자동 백업, 덮어쓰지 않음)
  useEffect(() => {
    const shareCode = searchParams.get('share')
    if (shareCode) {
      const data = parseShareUrl(shareCode)
      if (data && data.regions) {
        enterViewerMode({
          country: data.country || 'japan',
          regions: data.regions,
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        ev('viewer_open', { country: data.country || 'japan' })
        toast.success(t('viewer.loaded'))
      } else {
        toast.error(t('viewer.invalid'))
      }
      router.replace('/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, enterViewerMode])

  const handleRegionClick = (regionId: string) => {
    setSelectedRegionId(regionId)
  }

  const handleCloseModal = () => {
    setSelectedRegionId(null)
  }

  return (
    <>
      {/* 헤드리스: GPS 추적 + 레벨업 감지 + 저장소 영속화 */}
      <GpsManager />
      {!isViewer && <LevelUpWatcher />}
      <StoragePersist />

      {/* 공유 지도 열람 모드 배너 */}
      <ViewerBanner />

      <div className="flex flex-col h-full lg:h-auto lg:block lg:container lg:mx-auto lg:px-4 lg:py-6 lg:max-w-7xl">
        {/* 데스크톱 타이틀 섹션 */}
        <div className="hidden lg:flex mb-6 flex-row items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-ink leading-tight">
              {t('page.title')}
            </h1>
            <p className="text-muted mt-1 text-[15px]">{t('page.tagline')}</p>
          </div>
          <CountrySelector />
        </div>

        {/* 데스크톱 뷰 모드 전환 */}
        <div className="hidden lg:block mb-4">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-line bg-card p-0.5">
              <button
                onClick={() => setView('map')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${
                  view !== 'list' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon name="map" size={15} />
                {t('nav.map')}
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${
                  view === 'list' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon name="list" size={15} />
                {t('nav.list')}
              </button>
            </div>

            <button
              onClick={() => setShowTokyoModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-muted border border-line bg-card hover:text-ink hover:bg-paper transition-colors"
            >
              <Icon name="building" size={15} />
              {t('page.manageMunis', { term })}
            </button>
          </div>

          {view !== 'list' && (
            <p className="mt-2.5 text-xs text-muted">{t('page.guide')}</p>
          )}
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 min-h-0 lg:grid lg:grid-cols-4 lg:gap-6">
          {/* 통계 패널: 데스크톱 사이드바 / 모바일 '통계' 탭 */}
          <div
            className={`${
              view === 'stats' ? 'block overflow-y-auto p-4 pb-24 h-full' : 'hidden'
            } lg:block lg:col-span-1 lg:p-0 lg:h-auto lg:overflow-visible lg:pb-0`}
          >
            <div className="space-y-4">
              <StatsPanel showBoth={showBothMaps} />
              <BadgePanel />
              {/* 모바일 전용: 국가/도쿄 관리 */}
              <div className="lg:hidden space-y-3">
                <CountrySelector />
                <button
                  onClick={() => setShowTokyoModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-ink border border-line bg-card active:bg-paper"
                >
                  <Icon name="building" size={16} />
                  {t('page.manageMunisLong', { term })}
                </button>
              </div>
            </div>
          </div>

          {/* 지도 / 리스트 */}
          <div
            className={`${
              view === 'stats' ? 'hidden lg:block' : 'flex flex-col'
            } flex-1 min-h-0 lg:col-span-3 h-full`}
          >
            <div className="bg-card lg:rounded-[10px] lg:border lg:border-line overflow-hidden relative flex-1 min-h-0 lg:h-[calc(100vh-270px)] lg:min-h-[600px]">
              {/* 지도는 항상 마운트 유지 (탭 전환 시 상태 보존) */}
              <div className={`${view === 'list' ? 'hidden' : 'block'} h-full`}>
                <MapView
                  onRegionClick={handleRegionClick}
                  showBoth={showBothMaps}
                  onToggleBoth={() => setShowBothMaps((v) => !v)}
                />
                {/* 첫 방문 온보딩 (한 번만 표시, 공유 열람 중에는 숨김) */}
                {!isViewer && <OnboardingHint />}
              </div>

              {view === 'list' && (
                <div className="absolute inset-0 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6 bg-card">
                  <RegionList onRegionClick={handleRegionClick} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 하단 탭 */}
      <BottomNav tab={view} onChange={setView} />

      {/* 지역 상세 모달 */}
      {selectedRegionId && (
        <RegionModal isOpen={!!selectedRegionId} onClose={handleCloseModal} regionId={selectedRegionId} />
      )}

      {/* Tokyo Municipality Modal */}
      <MunicipalityManagerModal isOpen={showTokyoModal} onClose={() => setShowTokyoModal(false)} />
    </>
  )
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
