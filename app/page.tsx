'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { useMapExpStore } from '@/store'
import { parseShareUrl } from '@/lib/share'
import toast from 'react-hot-toast'
import CountrySelector from '@/components/common/CountrySelector'
import RegionList from '@/components/region/RegionList'
import RegionModal from '@/components/region/RegionModal'
import StatsPanel from '@/components/stats/StatsPanel'

// Leaflet을 dynamic import (SSR 비활성화)
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">지도 로딩 중...</p>
      </div>
    </div>
  ),
})

export default function Home() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { importData } = useMapExpStore()
  
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [showStats, setShowStats] = useState(true)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

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
            version: '1.0.0', // 임시 버전
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          })
          toast.success('공유된 지도를 불러왔습니다!')
        } else {
          toast.error('잘못된 공유 링크입니다.')
        }
      }
      
      // URL 정리
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
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* 헤더 섹션 */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            지역 경험치 맵
          </h1>
          <p className="text-gray-600">
            방문한 지역을 기록하고 경험치를 쌓아보세요
          </p>
        </div>
        <CountrySelector />
      </div>

      {/* 뷰 모드 전환 */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            🗺️ 지도 보기
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            📋 리스트 보기
          </button>
        </div>

        {/* 사용 가이드 */}
        {viewMode === 'map' && (
          <div className="mt-2 text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
            💡 <span className="font-medium">지도 클릭</span>으로 빠르게 레벨 변경 (0→1→2→3→4→0)
            | <span className="font-medium">Shift+클릭</span> 또는 <span className="font-medium">리스트 클릭</span>으로 상세 설정
          </div>
        )}
      </div>

      {/* 메인 컨텐츠 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 통계 패널 (데스크톱: 사이드바, 모바일: 토글) */}
        <div className="lg:col-span-1">
          {/* 모바일 토글 버튼 */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="lg:hidden w-full mb-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showStats ? '통계 숨기기 ▲' : '통계 보기 ▼'}
          </button>

          {/* 통계 패널 */}
          <div className={`${showStats ? 'block' : 'hidden'} lg:block`}>
            <StatsPanel />
          </div>
        </div>

        {/* 지도 또는 리스트 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {viewMode === 'map' ? (
              <MapView onRegionClick={handleRegionClick} />
            ) : (
              <div className="p-6 min-h-[600px]">
                <RegionList onRegionClick={handleRegionClick} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 지역 상세 모달 */}
      {selectedRegionId && (
        <RegionModal
          isOpen={!!selectedRegionId}
          onClose={handleCloseModal}
          regionId={selectedRegionId}
        />
      )}
    </div>
  )
}
