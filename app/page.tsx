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
import TokyoMunicipalityModal from '@/components/region/TokyoMunicipalityModal'
import GpsManager from '@/components/gps/GpsManager'
import LevelUpWatcher from '@/components/common/LevelUpWatcher'
import BottomNav, { MobileTab } from '@/components/layout/BottomNav'
import Icon from '@/components/common/Icon'

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
  const { importData } = useMapExpStore()

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [view, setView] = useState<MobileTab>('map')
  const [showTokyoModal, setShowTokyoModal] = useState(false)

  // 공유 URL 처리
  useEffect(() => {
    const shareCode = searchParams.get('share')
    if (shareCode) {
      if (confirm('공유된 지도를 불러오시겠습니까?\n주의: 현재 내 지도가 덮어씌워집니다.')) {
        const data = parseShareUrl(shareCode)
        if (data && data.regions) {
          importData({
            country: data.country || 'japan',
            regions: data.regions,
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          toast.success('공유된 지도를 불러왔습니다!')
        } else {
          toast.error('잘못된 공유 링크입니다.')
        }
      }
      router.replace('/')
    }
  }, [searchParams, router, importData])

  const handleRegionClick = (regionId: string) => {
    setSelectedRegionId(regionId)
  }

  const handleCloseModal = () => {
    setSelectedRegionId(null)
  }

  return (
    <>
      {/* 헤드리스: GPS 추적 + 레벨업 감지 */}
      <GpsManager />
      <LevelUpWatcher />

      <div className="flex flex-col h-full lg:h-auto lg:block lg:container lg:mx-auto lg:px-4 lg:py-6 lg:max-w-7xl">
        {/* 데스크톱 타이틀 섹션 */}
        <div className="hidden lg:flex mb-6 flex-row items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-ink leading-tight">
              나의 경현치 지도
            </h1>
            <p className="text-muted mt-1 text-[15px]">
              지나가고, 내리고, 걷고, 묵은 자리마다 도장이 쌓입니다
            </p>
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
                지도
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${
                  view === 'list' ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon name="list" size={15} />
                리스트
              </button>
            </div>

            <button
              onClick={() => setShowTokyoModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-muted border border-line bg-card hover:text-ink hover:bg-paper transition-colors"
            >
              <Icon name="building" size={15} />
              도쿄 시정촌 관리
            </button>
          </div>

          {view !== 'list' && (
            <p className="mt-2.5 text-xs text-muted">
              지도 클릭으로 레벨 변경 (0→5→0) · Shift+클릭으로 상세 설정 · 좌하단 조준 버튼으로 GPS 추적
            </p>
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
              <StatsPanel />
              <BadgePanel />
              {/* 모바일 전용: 국가/도쿄 관리 */}
              <div className="lg:hidden space-y-3">
                <CountrySelector />
                <button
                  onClick={() => setShowTokyoModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md font-medium text-ink border border-line bg-card active:bg-paper"
                >
                  <Icon name="building" size={16} />
                  도쿄 시정촌 관리
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
                <MapView onRegionClick={handleRegionClick} />
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
      <TokyoMunicipalityModal isOpen={showTokyoModal} onClose={() => setShowTokyoModal(false)} />
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
