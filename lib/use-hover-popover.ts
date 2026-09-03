import { useCallback, useEffect, useRef, useState } from 'react'

/** 마우스가 트리거↔팝업 사이를 지날 때 닫히지 않도록 leave 지연 */
export function useHoverPopover<T>(idle: T, delayMs = 280) {
  const [active, setActive] = useState(idle)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  useEffect(() => () => clearTimer(), [clearTimer])

  const show = useCallback((value: T) => {
    clearTimer()
    setActive(value)
  }, [clearTimer])

  const hide = useCallback(() => {
    clearTimer()
    timer.current = setTimeout(() => setActive(idle), delayMs)
  }, [clearTimer, delayMs, idle])

  return { active, show, hide, setActive }
}
