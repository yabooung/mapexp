'use client'

import { useState } from 'react'
import CountrySelector from '@/components/common/CountrySelector'
import RegionList from '@/components/region/RegionList'
import RegionModal from '@/components/region/RegionModal'
import StatsPanel from '@/components/stats/StatsPanel'

export default function Home() {
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
  const [showStats, setShowStats] = useState(true)

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

        {/* 지역 리스트 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm p-6 min-h-[600px]">
            <RegionList onRegionClick={handleRegionClick} />
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
