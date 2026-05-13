import type { Ref } from 'vue'

type PositionFn = (
  point: [number, number],

  params: unknown,
  dom: HTMLElement | unknown,
  rect: unknown,
  size: { contentSize: [number, number]; viewSize: [number, number] },
) => [number, number]

/**
 * Returns an echarts `tooltip.position` callback that keeps the floating
 * tooltip box fully inside the browser viewport, no matter where the cursor
 * is on the chart. Without this, `appendToBody: true` lets the tooltip spill
 * past the right/bottom edge and triggers a document-level scroll.
 *
 * The host ref must point at an element rendered around the chart so we can
 * map echarts' chart-relative `point` into viewport coordinates and back.
 */
export function clampTooltipToViewport(host: Ref<HTMLElement | null>): PositionFn {
  const MARGIN = 12
  const OFFSET = 16
  return function position(point, _params, _dom, _rect, size) {
    const el = host.value
    const rect = el?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }
    const [tw, th] = size.contentSize

    let pageX = rect.left + point[0] + OFFSET
    let pageY = rect.top + point[1] + OFFSET

    if (pageX + tw > window.innerWidth - MARGIN) {
      // Flip to the left of the cursor when the right edge would overflow.
      pageX = rect.left + point[0] - tw - OFFSET
    }
    if (pageX < MARGIN) pageX = MARGIN
    if (pageX + tw > window.innerWidth - MARGIN) {
      pageX = window.innerWidth - tw - MARGIN
    }

    if (pageY + th > window.innerHeight - MARGIN) {
      // Flip above the cursor when bottom edge would overflow.
      pageY = rect.top + point[1] - th - OFFSET
    }
    if (pageY < MARGIN) pageY = MARGIN

    return [pageX - rect.left, pageY - rect.top]
  }
}
