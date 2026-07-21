'use client'

import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useMapExpStore } from '@/store'
import { downloadDataFile } from '@/lib/dataFile'
import { recordBackup, shouldRemind, snoozeReminder } from '@/lib/backupReminder'
import { useT } from '@/lib/i18n'

const TOAST_ID = 'backup-reminder'

/**
 * 자동 백업 알림 — 데이터가 쌓였는데 한동안 백업하지 않았으면
 * "지금 백업하세요" 넛지를 띄운다. 데이터는 localStorage에만 있어
 * 캐시 삭제/기기 교체 시 사라지므로, 주기적으로 JSON 내보내기를 유도한다.
 *
 * 뷰어(공유 열람) 모드에서는 내 데이터가 아니므로 뜨지 않는다.
 * 판정은 최초 마운트 시 한 번만 — 앱을 열 때 조용히 한 번 알린다.
 */
export default function BackupReminder() {
  const t = useT()
  const isViewer = useMapExpStore((s) => s.isViewer)
  const exportData = useMapExpStore((s) => s.exportData)
  const regionCount = useMapExpStore((s) => s.regions.length)
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    if (isViewer) return

    const now = Date.now()
    if (!shouldRemind(regionCount, now)) return
    fired.current = true

    const handleBackup = () => {
      try {
        const data = exportData()
        downloadDataFile(data)
        recordBackup(data.regions.length, Date.now())
        toast.success(t('settings.exportDone'))
      } catch {
        toast.error(t('settings.exportFail'))
      }
      toast.dismiss(TOAST_ID)
    }

    const handleLater = () => {
      snoozeReminder(Date.now())
      toast.dismiss(TOAST_ID)
    }

    toast(
      () => (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-ink">{t('backup.remindMessage')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackup}
              className="px-3 py-1.5 rounded-full bg-seal text-white text-xs font-bold whitespace-nowrap hover:bg-seal-hover transition-colors"
            >
              {t('backup.remindAction')}
            </button>
            <button
              onClick={handleLater}
              className="px-2 py-1.5 text-xs font-semibold text-muted hover:text-ink whitespace-nowrap transition-colors"
            >
              {t('backup.remindLater')}
            </button>
          </div>
        </div>
      ),
      { id: TOAST_ID, duration: Infinity },
    )
    // 최초 마운트 시 1회만 판정 (의존성 변화로 재실행하지 않음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
