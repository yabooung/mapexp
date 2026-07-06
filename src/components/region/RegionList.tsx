'use client'

import { useState, useMemo } from 'react'
import { useMapExpStore } from '@/store'
import { getRegionsByCountry } from '@/data/regions'
import { GyeongHyeonChi, ExperienceGrade } from '@/types'
import RegionCard from './RegionCard'

interface RegionListProps {
  onRegionClick: (regionId: string) => void
}

/**
 * 지역 리스트 컴포넌트
 */
export default function RegionList({ onRegionClick }: RegionListProps) {
  const { country, regions, getRegionById } = useMapExpStore()
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'level'>('name')

  // 현재 국가의 모든 지역 메타데이터
  const allRegions = getRegionsByCountry(country)

  // 필터링 및 정렬
  const filteredRegions = useMemo(() => {
    let filtered = allRegions

    // 검색 필터
    if (searchText) {
      const search = searchText.toLowerCase()
      filtered = filtered.filter(
        (region) =>
          region.name.toLowerCase().includes(search) ||
          region.nameEn.toLowerCase().includes(search) ||
          region.nameLocal.toLowerCase().includes(search)
      )
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ko')
      } else {
        // 레벨순 (높은 순)
        const aExp = getRegionById(a.id)
        const bExp = getRegionById(b.id)
        const aVal = aExp?.gyeonghyeonchi ?? aExp?.level ?? 0
        const bVal = bExp?.gyeonghyeonchi ?? bExp?.level ?? 0
        return bVal - aVal
      }
    })

    return sorted
  }, [allRegions, searchText, sortBy, getRegionById])

  // 클릭 핸들러 (레벨 순환)
  const handleRegionClick = (e: React.MouseEvent, regionId: string) => {
    // Shift 클릭 시 상세 모달
    if (e.shiftKey) {
      onRegionClick(regionId)
      return
    }

    const regionExp = getRegionById(regionId)
    const currentVal = regionExp?.gyeonghyeonchi ?? regionExp?.level ?? GyeongHyeonChi.UNVISITED
    let nextVal: ExperienceGrade

    // 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0
    if (currentVal >= GyeongHyeonChi.RESIDED) {
      nextVal = GyeongHyeonChi.UNVISITED
    } else {
      nextVal = (currentVal + 1) as ExperienceGrade
    }

    // 레벨 업데이트 (단순 변경시는 날짜/메모 유지)
    if (regionExp) {
      const { updateRegion } = useMapExpStore.getState()
      updateRegion(regionId, { gyeonghyeonchi: nextVal })
    } else {
      const { addRegion } = useMapExpStore.getState()
      addRegion({
        regionId,
        gyeonghyeonchi: nextVal,
        updatedAt: new Date().toISOString(),
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 검색 및 정렬 */}
      <div className="mb-4 space-y-3">
        {/* 검색 */}
        <div className="relative">
          <input
            type="text"
            placeholder="지역 검색..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-card border border-line rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-faint"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 정렬 & 도움말 */}
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-md border border-line bg-card p-0.5">
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 text-sm rounded-[5px] transition-colors ${
                sortBy === 'name' ? 'bg-ink text-paper font-medium' : 'text-muted hover:text-ink'
              }`}
            >
              이름순
            </button>
            <button
              onClick={() => setSortBy('level')}
              className={`px-3 py-1 text-sm rounded-[5px] transition-colors ${
                sortBy === 'level' ? 'bg-ink text-paper font-medium' : 'text-muted hover:text-ink'
              }`}
            >
              레벨순
            </button>
          </div>

          <div className="text-xs text-muted hidden sm:block">
            클릭: 레벨 변경 · Shift+클릭: 상세
          </div>
        </div>
      </div>

      {/* 지역 카드 그리드 */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRegions.map((region) => (
            <RegionCard
              key={region.id}
              regionInfo={region}
              regionExp={getRegionById(region.id)}
              onClick={(e) => handleRegionClick(e, region.id)}
            />
          ))}
        </div>

        {/* 검색 결과 없음 */}
        {filteredRegions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg
              className="w-16 h-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M12 12h.01"
              />
            </svg>
            <p>검색 결과가 없습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
