'use client'

import { useMapExpStore } from '@/store'
import { ExpLevel, EXP_LEVEL_LABELS } from '@/types'
import { EXP_COLORS, TOTAL_REGIONS } from '@/constants'
import Card from '@/components/common/Card'

/**
 * 통계 패널 컴포넌트
 */
export default function StatsPanel() {
  const { country, getTotalExp, getVisitedCount, getCompletionRate, getLevelCounts } =
    useMapExpStore()

  const totalExp = getTotalExp()
  const visitedCount = getVisitedCount()
  const completionRate = getCompletionRate()
  const levelCounts = getLevelCounts()
  const totalRegions = TOTAL_REGIONS[country]

  // 레벨별 점수 계산 (경현도 기준: 레벨 = 점수)
  const getLevelPoints = (level: ExpLevel, count: number) => {
    return count * level
  }

  return (
    <div className="space-y-4">
      {/* 주요 통계 */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">통계</h2>

        <div className="grid grid-cols-2 gap-4">
          {/* 총 경험치 */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">총 경험치</p>
            <p className="text-3xl font-bold text-blue-600">{totalExp}</p>
          </div>

          {/* 방문 지역 수 */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">방문 지역</p>
            <p className="text-3xl font-bold text-green-600">
              {visitedCount}
              <span className="text-lg text-gray-500">/{totalRegions}</span>
            </p>
          </div>

          {/* 달성률 */}
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">달성률</p>
            <p className="text-3xl font-bold text-purple-600">
              {completionRate}%
            </p>
          </div>

          {/* 거주(최고레벨) 지역 */}
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">거주 👑</p>
            <p className="text-3xl font-bold text-yellow-600">
              {levelCounts[ExpLevel.RESIDED]}
            </p>
          </div>
        </div>
      </Card>

      {/* 레벨별 분포 */}
      <Card>
        <h3 className="text-md font-semibold text-gray-900 mb-3">
          레벨별 분포
        </h3>

        <div className="space-y-2">
          {[
            ExpLevel.RESIDED,
            ExpLevel.STAYED,
            ExpLevel.VISITED,
            ExpLevel.LANDED,
            ExpLevel.PASSED,
            ExpLevel.UNVISITED,
          ].map((level) => {
            const count = levelCounts[level]
            const points = getLevelPoints(level, count)
            const percentage =
              totalRegions > 0 ? ((count / totalRegions) * 100).toFixed(1) : 0

            return (
              <div
                key={level}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
              >
                {/* 색상 인디케이터 */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EXP_COLORS[level] }}
                />

                {/* 레벨 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {EXP_LEVEL_LABELS[level]}
                    </span>
                    {level === ExpLevel.RESIDED && <span>👑</span>}
                  </div>
                </div>

                {/* 카운트 및 점수 */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-600">{count}개</span>
                  <span className="text-gray-400">|</span>
                  <span className="font-medium text-gray-900">
                    {points}점
                  </span>
                  <span className="text-gray-500 w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 진행 바 */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">진행도</span>
            <span className="font-medium text-gray-900">
              {visitedCount} / {totalRegions}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 국가 정보 */}
      <Card padding="sm">
        <div className="text-center">
          <p className="text-xs text-gray-500">
            {country === 'japan' ? '🇯🇵 일본' : '🇰🇷 한국'}
          </p>
          <p className="text-xs text-gray-500">
            전체 {totalRegions}개 지역
          </p>
        </div>
      </Card>
    </div>
  )
}
