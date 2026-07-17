'use client'

import { useRef } from 'react'
import { useMapExpStore } from '@/store'
import { useGpsStore } from '@/store/gps'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import { useT, useLang, Lang } from '@/lib/i18n'
import { parseImportFile, downloadDataFile } from '@/lib/dataFile'
import toast from '@/lib/appToast'
import { ENABLE_GPS_TRACKING } from '@/constants'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const LANG_OPTIONS: Array<{ value: Lang; label: string }> = [
  { value: 'ko', label: '한국어' },
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
]

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { exportData, importData, clearAllRegions, updateSettings } = useMapExpStore()
  const autoDetectVisit = useGpsStore((s) => s.autoDetectVisit)
  const setAutoDetectVisit = useGpsStore((s) => s.setAutoDetectVisit)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useT()
  const lang = useLang()

  const handleAutoDetectToggle = () => {
    const next = !autoDetectVisit
    setAutoDetectVisit(next)
    if (next) {
      toast.success(t('settings.autoDetectOn'))
    } else {
      toast(t('settings.autoDetectOff'))
    }
  }

  // 데이터 내보내기 (JSON 다운로드 - 스키마 봉투 포함)
  const handleExport = () => {
    try {
      downloadDataFile(exportData())
      toast.success(t('settings.exportDone'))
    } catch (err) {
      console.error(err)
      toast.error(t('settings.exportFail'))
    }
  }

  // 데이터 가져오기 (JSON 업로드)
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      // 신뢰 불가 입력: 타입 검증에 실패하면 상태를 건드리지 않고 조용히 실패
      const data = parseImportFile(String(event.target?.result ?? ''))
      if (!data) {
        toast.error(t('settings.importFail'))
        return
      }

      // 유일하게 데이터를 잃을 수 있는 경로 - 교체 규모를 구체적으로 알리고,
      // 진행 시 기존 데이터를 자동 백업 다운로드한 뒤 덮어쓴다
      const current = exportData()
      if (confirm(t('settings.importConfirmDetail', { a: current.regions.length, b: data.regions.length }))) {
        try {
          if (current.regions.length > 0) downloadDataFile(current, 'backup')
        } catch {
          // 백업 실패해도 사용자가 확인한 가져오기는 진행
        }
        importData(data)
        toast.success(t('settings.importDone'))
        onClose()
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // 데이터 초기화
  const handleReset = () => {
    if (confirm(t('settings.resetConfirm'))) {
      // 안전장치: 초기화 직전 자동으로 백업 JSON을 다운로드해 실수로 인한 손실 방지
      try {
        const data = exportData()
        if (data.regions.length > 0) {
          const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
          const a = document.createElement('a')
          a.href = url
          a.download = `mapexp-backup-${new Date().toISOString().slice(0, 10)}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      } catch {
        // 백업 실패해도 초기화는 진행
      }
      clearAllRegions()
      toast.success(t('settings.resetDone'))
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.title')}
      size="md"
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 언어 */}
        <div>
          <h3 className="text-sm font-semibold text-ink mb-3">{t('settings.language')}</h3>
          <div className="inline-flex rounded-md border border-line bg-card p-0.5">
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ language: opt.value, mapLanguage: 'auto' })}
                className={`px-4 py-1.5 rounded-[5px] text-sm font-medium transition-colors ${
                  lang === opt.value ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-line"></div>

        {/* GPS 설정 — 연속 추적(자동 방문 감지) 자산. ENABLE_GPS_TRACKING 꺼짐 시엔
            워처가 동작하지 않아 토글이 무의미하므로 섹션 전체를 숨긴다. */}
        {ENABLE_GPS_TRACKING && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-ink mb-3">{t('settings.gpsSection')}</h3>
              <label className="flex items-center justify-between gap-3 p-3 bg-paper rounded-lg cursor-pointer border border-line">
                <div>
                  <p className="text-sm font-medium text-ink">{t('settings.autoDetect')}</p>
                  <p className="text-xs text-muted mt-0.5">{t('settings.autoDetectDesc')}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={autoDetectVisit}
                  onClick={(e) => {
                    e.preventDefault()
                    handleAutoDetectToggle()
                  }}
                  className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
                    autoDetectVisit ? 'bg-seal' : 'bg-line'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      autoDetectVisit ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </label>
            </div>

            <div className="border-t border-line"></div>
          </>
        )}

        {/* 데이터 백업/복원 */}
        <div>
          <h3 className="text-sm font-semibold text-ink mb-3">{t('settings.backupSection')}</h3>
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleExport} className="flex-1 gap-1.5">
              <Icon name="download" size={15} />
              {t('settings.export')}
            </Button>
            <Button variant="secondary" onClick={handleImportClick} className="flex-1 gap-1.5">
              <Icon name="upload" size={15} />
              {t('settings.import')}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
          <p className="text-xs text-muted mt-2">{t('settings.backupDesc')}</p>
        </div>

        <div className="border-t border-line"></div>

        {/* 위험 구역 */}
        <div>
          <h3 className="text-sm font-semibold text-seal mb-3">{t('settings.dangerSection')}</h3>
          <Button variant="danger" onClick={handleReset} className="w-full gap-1.5">
            <Icon name="trash" size={15} />
            {t('settings.reset')}
          </Button>
          <p className="text-xs text-muted mt-2">{t('settings.resetDesc')}</p>
        </div>
      </div>
    </Modal>
  )
}
