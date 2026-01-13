import { SEAT_CLASS } from "const"

const xmlType = "http://www.w3.org/2000/svg"

export function createSvgElement(tag, attributes, inner = '') {
  const el = document.createElementNS(xmlType, tag)
  for (const key in attributes) {
    el.setAttribute(key, attributes[key])
  }
  if (inner) el.innerHTML = inner
  return el
}

export function stringToSvg(str) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(str, 'text/html')
  const error = doc.querySelector('parsererror')
  if (error) {
    throw new Error(`Message: ${error.innerText}, Details: ${doc.querySelector('sourcetext')?.innerText}`)
  }
  return doc.querySelector('svg')
}

export function createDefs(svg, ...elemsConfig) {
  let defs = svg.querySelector('defs')
  if (!defs) {
    defs = createSvgElement('defs', {})
    svg.insertBefore(defs, svg.firstElementChild)
  }
  elemsConfig.forEach(([tag, attrs, inner]) => {
    const el = createSvgElement(tag, attrs, inner)
    defs.appendChild(el)
  })
}

export function createStyles(svg, categories) {
  const styles = createSvgElement('style')
  styles.innerHTML = categories.reduce(
    (acc, cat) => acc + `
      .${SEAT_CLASS}[data-category="${cat.value}"] { fill: ${cat.color}; stroke: ${cat.color}; stroke-width: 0; transition: ease-out .3s; transition-property: stroke-width, fill, filter, opacity; }
                        @media (hover: hover) { .${SEAT_CLASS}[data-category="${cat.value}"]:not([data-disabled]):hover { stroke-width: 2px; filter: brightness(1.10); } }
                  /* Safari на Mac - осветление через opacity */
                                      @supports not (filter: brightness(1.10)) { .${SEAT_CLASS}[data-category="${cat.value}"]:not([data-disabled]):hover { opacity: 1; } }
                  /* Webkit-specific стили для Safari */
                  @media screen and (-webkit-min-device-pixel-ratio: 0) { .${SEAT_CLASS}[data-category="${cat.value}"]:not([data-disabled]):hover { -webkit-filter: brightness(1.10); } }
      .${SEAT_CLASS}-icon-cat-${cat.value} { color: ${cat.color}; }
      .${SEAT_CLASS}-bg-cat-${cat.value} { background-color: ${cat.color}; }
    `,
    ` .${SEAT_CLASS}:not([data-disabled]) { cursor: pointer; }
      .${SEAT_CLASS}[data-disabled] { fill: #666 !important; }
      text, tspan { pointer-events: none; }`
  )
  svg.insertBefore(styles, svg.firstElementChild)
}

export const msToTime = ms => {
  const fullSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(fullSeconds / 60)
  const seconds = fullSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export const getCursorOffsetToElementCenter = (element, event) => {
  const { clientX, clientY } = event
  const { x: ex, y: ey, width, height } = element.getBoundingClientRect()
  const centerLeft = width / 2 + ex
  const centerTop = height / 2 + ey
  const x = centerLeft - clientX
  const y = centerTop - clientY

  return { x, y }
}

export const isSafariOnMac = () => {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  return isSafari && isMac
}

export const applySafariHoverEffect = (element, isHovering) => {
  if (isSafariOnMac()) {
    if (isHovering) {
      element.style.opacity = '1'
      element.style.webkitFilter = 'brightness(1.3)'
    } else {
      element.style.opacity = '1'
      element.style.webkitFilter = 'none'
    }
  }
}