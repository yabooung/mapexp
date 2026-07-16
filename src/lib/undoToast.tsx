import toast from 'react-hot-toast'
import { useMapExpStore } from '@/store'
import { ExperienceGrade } from '@/types'
import { tNow, levelLabel, type Lang } from '@/lib/i18n'

/**
 * 등급 변경 토스트 + 실행취소.
 * 지도/리스트의 탭 순환은 실수 시 한 바퀴(5번 탭)를 돌아야 복구되므로,
 * 변경 직후 한 번의 탭으로 직전 등급에 되돌릴 수단을 준다.
 * 같은 지역 연속 탭은 id로 토스트를 갱신 - 실행취소는 마지막 탭 직전 등급으로 복원.
 */
export function showLevelUndoToast(regionId: string, name: string, prev: ExperienceGrade, next: ExperienceGrade) {
  const lang = (useMapExpStore.getState().settings.language ?? 'ko') as Lang
  toast(
    (tk) => (
      <span className="flex items-center gap-3">
        <span className="text-sm">
          {name} · <b>{levelLabel(next, lang)}</b>
        </span>
        <button
          onClick={() => {
            useMapExpStore.getState().updateRegion(regionId, { gyeonghyeonchi: prev })
            toast.dismiss(tk.id)
          }}
          className="shrink-0 text-xs font-bold text-seal underline underline-offset-2"
        >
          {tNow('common.undo')}
        </button>
      </span>
    ),
    { id: `undo-${regionId}`, duration: 3500 },
  )
}
