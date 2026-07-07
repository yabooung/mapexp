'use client'

import toast from 'react-hot-toast'
import { useMapExpStore } from '@/store'
import { useT } from '@/lib/i18n'
import { ev } from '@/lib/analytics'
import Icon from '@/components/common/Icon'

/**
 * 공유 지도 열람 모드 배너
 * 내 데이터는 백업돼 있고, 저장하거나 내 지도로 돌아갈 수 있다.
 */
export default function ViewerBanner() {
  const isViewer = useMapExpStore((s) => s.isViewer)
  const exitViewerMode = useMapExpStore((s) => s.exitViewerMode)
  const adoptSharedMap = useMapExpStore((s) => s.adoptSharedMap)
  const t = useT()

  if (!isViewer) return null

  return (
    <div className="bg-seal text-white">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-medium min-w-0">
          <Icon name="pin" size={14} className="shrink-0" />
          <span className="truncate">{t('viewer.banner')}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              adoptSharedMap()
              ev('viewer_adopt')
              toast.success(t('viewer.adopted'))
            }}
            className="px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 text-[12px] font-semibold transition-colors"
          >
            {t('viewer.adopt')}
          </button>
          <button
            onClick={() => {
              exitViewerMode()
              toast(t('viewer.exited'))
            }}
            className="px-2.5 py-1 rounded-md bg-white text-seal text-[12px] font-bold hover:opacity-90 transition-opacity"
          >
            {t('viewer.exit')}
          </button>
        </span>
      </div>
    </div>
  )
}
