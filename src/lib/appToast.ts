import hotToast, { Renderable, ToastOptions } from 'react-hot-toast'

/**
 * 자체 소멸 타이머를 가진 토스트 래퍼.
 *
 * react-hot-toast는 토스트에 마우스가 올라가면 모든 토스트의 소멸 타이머를
 * 일시정지하는데, 터치 기기에서는 탭이 mouseenter만 만들고 mouseleave가 오지
 * 않아 타이머가 영영 멈출 수 있다 (토스트가 안 사라지고 쌓임).
 * 그래서 내부 duration 대신 여기서 setTimeout으로 직접 dismiss한다.
 * 모든 호출처는 react-hot-toast 대신 이 모듈을 쓸 것.
 */

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function schedule(id: string, ms: number) {
  const prev = timers.get(id)
  if (prev) clearTimeout(prev)
  timers.set(
    id,
    setTimeout(() => {
      hotToast.dismiss(id)
      timers.delete(id)
    }, ms),
  )
}

function show(kind: 'blank' | 'success' | 'error', message: Renderable, opts?: ToastOptions): string {
  const ms = opts?.duration ?? (kind === 'error' ? 5000 : 4000)
  const fn = kind === 'blank' ? hotToast : hotToast[kind]
  const id = fn(message as never, { ...opts, duration: Infinity })
  schedule(id, ms)
  return id
}

type AppToast = ((message: Renderable, opts?: ToastOptions) => string) & {
  success: (message: Renderable, opts?: ToastOptions) => string
  error: (message: Renderable, opts?: ToastOptions) => string
  dismiss: (id?: string) => void
}

export const appToast: AppToast = Object.assign(
  (message: Renderable, opts?: ToastOptions) => show('blank', message, opts),
  {
    success: (message: Renderable, opts?: ToastOptions) => show('success', message, opts),
    error: (message: Renderable, opts?: ToastOptions) => show('error', message, opts),
    dismiss: (id?: string) => hotToast.dismiss(id),
  },
)

export default appToast
