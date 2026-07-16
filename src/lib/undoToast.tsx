import toast from 'react-hot-toast'
import { useMapExpStore } from '@/store'
import { ExperienceGrade } from '@/types'
import { tNow, levelLabel, type Lang } from '@/lib/i18n'

// react-hot-toast의 내부 타이머는 토스트에 마우스가 올라가면 전부 일시정지되는데,
// 터치 기기에서는 탭이 mouseenter만 만들고 mouseleave가 안 와 타이머가 영영 멈출 수 있다
// (→ 토스트가 안 사라지고 쌓임). 그래서 소멸은 내부 duration 대신 자체 타이머로 강제한다.
let dismissTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 등급 변경 토스트 + 실행취소.
 * 지도/리스트의 탭 순환은 실수 시 한 바퀴(5번 탭)를 돌아야 복구되므로,
 * 변경 직후 한 번의 탭으로 직전 등급에 되돌릴 수단을 준다.
 * 같은 지역 연속 탭은 id로 토스트를 갱신 - 실행취소는 마지막 탭 직전 등급으로 복원.
 * onMuni가 있으면 '세부 도장' 버튼도 함께 - 광역을 찍은 김에 시정촌/시군구로 이어지는 흐름.
 */
export function showLevelUndoToast(
  regionId: string,
  name: string,
  prev: ExperienceGrade,
  next: ExperienceGrade,
  opts?: { onMuni?: () => void },
) {
  const lang = (useMapExpStore.getState().settings.language ?? 'ko') as Lang
  toast(
    (tk) => (
      // 아무 곳이나 탭해도 닫힘 (버튼 동작 후에도 버블링으로 함께 닫혀 무해)
      <span className="flex items-center gap-2.5" onClick={() => toast.dismiss(tk.id)}>
        <span className="text-sm whitespace-nowrap">
          {name} · <b>{levelLabel(next, lang)}</b>
        </span>
        <button
          onClick={() => {
            useMapExpStore.getState().updateRegion(regionId, { gyeonghyeonchi: prev })
            toast.dismiss(tk.id)
          }}
          className="shrink-0 text-xs font-semibold text-muted hover:text-ink underline underline-offset-2 whitespace-nowrap transition-colors"
        >
          {tNow('common.undo')}
        </button>
        {opts?.onMuni && (
          <button
            onClick={() => {
              toast.dismiss(tk.id)
              opts.onMuni!()
            }}
            className="shrink-0 px-3 py-1.5 rounded-full bg-seal text-white text-xs font-bold whitespace-nowrap hover:bg-seal-hover transition-colors"
          >
            {tNow('undo.muni')}
          </button>
        )}
      </span>
    ),
    {
      // 고정 id: 연속으로 여러 지역을 탭해도 토스트가 쌓이지 않고
      // 마지막 도장 하나만 갱신 표시 (실행취소도 마지막 탭 대상)
      id: 'undo-stamp',
      duration: Infinity, // 소멸은 아래 자체 타이머가 담당 (호버-정지 면역)
      // 지도 중앙을 가리지 않게 하단에서 표시 - 연속으로 탭하며 편집하는 흐름 유지
      // (모바일 하단 탭과 겹치지 않는 오프셋은 .undo-toast CSS에서)
      position: 'bottom-center',
      className: 'undo-toast',
    },
  )

  if (dismissTimer) clearTimeout(dismissTimer)
  dismissTimer = setTimeout(() => toast.dismiss('undo-stamp'), 3500)
}
