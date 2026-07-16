'use client'

import { useState, useMemo } from 'react'
import { useMapExpStore } from '@/store'
import { getRegionsByCountry, getHiddenRegionsByCountry, getRegionMetadata } from '@/data/regions'
import { GyeongHyeonChi, ExperienceGrade, RegionMetadata } from '@/types'
import { REGION_GROUPS } from '@/constants/regions'
import RegionCard from './RegionCard'
import { useT, useLang, regionDisplayName, I18nKey } from '@/lib/i18n'
import { showLevelUndoToast } from '@/lib/undoToast'

interface RegionListProps {
  onRegionClick: (regionId: string) => void
}

type SortMode = 'group' | 'name' | 'level'

/**
 * 지역 리스트 — 지방/권역별 그룹핑이 기본, 이름순/레벨순 평면 정렬 지원
 */
export default function RegionList({ onRegionClick }: RegionListProps) {
  const { country, getRegionById } = useMapExpStore()
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState<SortMode>('group')
  const t = useT()
  const lang = useLang()

  const levelOf = (regionId: string): ExperienceGrade => {
    const exp = getRegionById(regionId)
    return (exp?.gyeonghyeonchi ?? exp?.level ?? 0) as ExperienceGrade
  }

  // 현재 국가의 모든 지역 메타데이터
  const allRegions = [
    ...getRegionsByCountry(country),
    ...getHiddenRegionsByCountry(country).filter((r) => levelOf(r.id) > GyeongHyeonChi.UNVISITED),
  ]

  // 검색 필터
  const filteredRegions = useMemo(() => {
    if (!searchText) return allRegions
    const search = searchText.toLowerCase()
    return allRegions.filter(
      (region) =>
        region.name.toLowerCase().includes(search) ||
        region.nameEn.toLowerCase().includes(search) ||
        region.nameLocal.toLowerCase().includes(search),
    )
  }, [allRegions, searchText])

  // 그룹 모드: 지방/권역별 섹션 구성
  const groups = useMemo(() => {
    if (sortBy !== 'group') return null
    const byId = new Map(filteredRegions.map((r) => [r.id, r]))
    const result = REGION_GROUPS[country]
      .map((group) => {
        const members = group.ids
          .map((id) => byId.get(id))
          .filter((r): r is RegionMetadata => !!r)
        const totalInGroup = group.ids.length
        const visitedInGroup = group.ids.filter((id) => levelOf(id) > GyeongHyeonChi.UNVISITED).length
        return { name: group.name, members, totalInGroup, visitedInGroup }
      })
      .filter((g) => g.members.length > 0)
    const hiddenMembers = filteredRegions.filter((r) => r.hidden)
    if (hiddenMembers.length > 0) {
      result.push({
        name: 'group.hidden',
        members: hiddenMembers,
        totalInGroup: hiddenMembers.length,
        visitedInGroup: hiddenMembers.length,
      })
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRegions, sortBy, country, getRegionById])

  // 평면 모드 정렬
  const flatSorted = useMemo(() => {
    if (sortBy === 'group') return []
    return [...filteredRegions].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko')
      return levelOf(b.id) - levelOf(a.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRegions, sortBy, getRegionById])

  // 클릭 핸들러 (레벨 순환)
  const handleRegionClick = (e: React.MouseEvent, regionId: string) => {
    if (e.shiftKey) {
      onRegionClick(regionId)
      return
    }

    const regionExp = getRegionById(regionId)
    const currentVal = (regionExp?.gyeonghyeonchi ?? regionExp?.level ?? GyeongHyeonChi.UNVISITED) as ExperienceGrade
    const nextVal = (currentVal >= GyeongHyeonChi.RESIDED
      ? GyeongHyeonChi.UNVISITED
      : currentVal + 1) as ExperienceGrade

    if (regionExp) {
      useMapExpStore.getState().updateRegion(regionId, { gyeonghyeonchi: nextVal })
    } else {
      useMapExpStore.getState().addRegion({
        regionId,
        gyeonghyeonchi: nextVal,
        updatedAt: new Date().toISOString(),
      })
    }

    const meta = getRegionMetadata(regionId)
    showLevelUndoToast(regionId, meta ? regionDisplayName(meta, lang) : regionId, currentVal, nextVal)
  }

  const renderCards = (regions: RegionMetadata[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {regions.map((region) => (
        <RegionCard
          key={region.id}
          regionInfo={region}
          regionExp={getRegionById(region.id)}
          onClick={(e) => handleRegionClick(e, region.id)}
          onDetail={() => onRegionClick(region.id)}
        />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* 검색 및 정렬 */}
      <div className="mb-4 space-y-3">
        {/* 검색 */}
        <div className="relative">
          <input
            type="text"
            placeholder={t('list.search')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-card border border-line rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-faint"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-faint"
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
            {(
              [
                ['group', country === 'japan' ? t('list.sortGroupJp') : t('list.sortGroupKr')],
                ['name', t('list.sortName')],
                ['level', t('list.sortLevel')],
              ] as Array<[SortMode, string]>
            ).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setSortBy(mode)}
                className={`px-3 py-1 text-sm rounded-[5px] transition-colors ${
                  sortBy === mode ? 'bg-ink text-paper font-medium' : 'text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="text-xs text-muted hidden sm:block">
            {t('list.hint')}
          </div>
        </div>
      </div>

      {/* 목록 */}
      <div className="flex-1 overflow-y-auto">
        {groups ? (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.name}>
                {/* 그룹 헤더: 지방명 + 진행도 */}
                <div className="flex items-center gap-3 mb-2.5">
                  <h3 className="text-sm font-bold text-ink whitespace-nowrap">{t(group.name as I18nKey)}</h3>
                  <span className="flex-1 h-px bg-line" />
                  <span className="w-16 h-1 rounded-full bg-line overflow-hidden">
                    <span
                      className="block h-full bg-seal rounded-full"
                      style={{ width: `${(group.visitedInGroup / group.totalInGroup) * 100}%` }}
                    />
                  </span>
                  <span className="text-xs text-muted tabular-nums whitespace-nowrap">
                    {group.visitedInGroup}/{group.totalInGroup}
                  </span>
                </div>
                {renderCards(group.members)}
              </section>
            ))}
          </div>
        ) : (
          renderCards(flatSorted)
        )}

        {/* 검색 결과 없음 */}
        {filteredRegions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <p className="text-sm">{t('list.noResult', { q: searchText })}</p>
          </div>
        )}
      </div>
    </div>
  )
}
