import { CATEGORY_CHECK_PATH_ID, CHECK_PATH_ID, SEAT_CLASS } from "../const"
import { isEqualStr } from "./string"

const xmlType = "http://www.w3.org/2000/svg"

export const createCheckElement = ({ x = 0, y = 0, className, d = 'M 1.5 3.5 L 3 5 L 6 2' } = {}) => {
  const check = document.createElementNS(xmlType, 'path')
  check.setAttribute('d', d)
  check.setAttribute('stroke-linecap', 'round')
  check.setAttribute('stroke-linejoin', 'round')
  check.setAttribute('class', className)
  if (x || y) {
    check.setAttribute('style', `transform: translate(${(x || 0)}px, ${(y || 0)}px)`)
  }
  return check
}

export const createFilterElement = ({ id = 'filter-blur', blur = 1.2 }) => {
  const el = document.createElementNS(xmlType, 'filter')
  el.id = id
  el.innerHTML = '<feGaussianBlur in="SourceGraphic" stdDeviation="' + blur + '"></feGaussianBlur>'
  return el
}

export const createUse = (attrs) => {
  const el = document.createElementNS(xmlType, 'use')
  el.id = `use-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  Object.entries(attrs).forEach(([ attr, val ]) => {
    el.setAttribute(attr, val)
  })
  return el
}

const insertAfter = (el, insertEl) => {
  const parent = el?.parentNode
  if (!parent) return
  const next = el?.nextElementSibling
  return next ?
    parent.insertBefore(insertEl, next) :
    parent.appendChild(insertEl)
}

export const svgSeat = (el, details = {}) => {
  const { x, y } = el.getBBox()
  const seat = {
    get: (attribute, defaultValue) =>Array.isArray(attribute) ?
      attribute.map(attr => seat.get(attr, defaultValue)) :
      el?.getAttribute(`data-${attribute}`) || defaultValue,
    set: (attribute, value) => el?.setAttribute(`data-${attribute}`, value) || seat,
    has: (attribute) => el.hasAttribute(`data-${attribute}`),
    hasCheck: () => {
      const checkId = seat.isMultiple() ? CATEGORY_CHECK_PATH_ID : CHECK_PATH_ID
      return el.hasAttribute(`data-check-${checkId}`)
    },
    addCheck: () => {
      if (seat.hasCheck()) return
      if (seat.isMultiple()) {
        const node = seat.getTitleNode()
        if (!node) return
        const { x, y, width, height } = node.getBBox()
        const centerX = x + width / 2
        const centerY = y + height / 2
        const checkX = centerX - (9 / 2) - 1 
        const checkY = centerY - (5.75 / 2) - 2 
        
        const checkElement = createUse({ x: checkX, y: checkY, class: 'category-check', href: `#${CATEGORY_CHECK_PATH_ID}` })
        el.ownerSVGElement.appendChild(checkElement)
        el.setAttribute(`data-check-${CATEGORY_CHECK_PATH_ID}`, checkElement.id || `check-${Date.now()}`)
        el.style.cursor = 'auto'
      } else {
        const { x, y, width, height } = el.getBBox()
        const centerX = x + width / 2
        const centerY = y + height / 2
        const checkX = centerX - (4.5 / 2) - 1 
        const checkY = centerY - (3 / 2) - 2 
        
        const checkElement = createUse({ x: checkX, y: checkY, class: 'seat-check', href: `#${CHECK_PATH_ID}` })
        el.ownerSVGElement.appendChild(checkElement)
        el.setAttribute(`data-check-${CHECK_PATH_ID}`, checkElement.id || `check-${Date.now()}`)
      }
      return seat
    },
    removeCheck: () => {
      if (!seat.hasCheck()) return
      
      const checkId = seat.isMultiple() ? CATEGORY_CHECK_PATH_ID : CHECK_PATH_ID
      const checkAttr = `data-check-${checkId}`
      const checkElementId = el.getAttribute(checkAttr)
      
      if (checkElementId) {
        const check = el.ownerSVGElement.querySelector(`#${checkElementId}`)
        if (check) {
          check.classList.add('seat-check-out')
          check.addEventListener('transitionend', () => check.remove())
        }
        el.removeAttribute(checkAttr)
      }
      
      if (seat.isMultiple()) el.removeAttribute('style')
      return seat
    },
    toggleChecked: () => {
      seat.hasCheck() ? seat.removeCheck() : seat.addCheck()
      return seat
    },
    checked: val => {
      if (val === undefined || val === null) return seat.w()
      val ? seat.addCheck() : seat.removeCheck()
      return seat
    },
    disabled: val => {
      if (val === undefined) return seat.has('disabled')
      val ? el.setAttribute('data-disabled', '') : el.removeAttribute('data-disabled')
      return seat
    },
    isMultiple: () => !seat.get('seat') && !seat.get('row'),
    getTitleNode: () => {
      if (!seat.isMultiple()) return null
      const selector = `.title-${seat.get('category').toUpperCase()}`
      return el.ownerSVGElement.querySelector(selector)
    },
    getKey: () => seat.isMultiple() ? seat.get('category') : seat.get(['row', 'seat']).join('-'),
    matches: obj => Object.entries(obj).reduce((acc, [key, value]) => acc && isEqualStr(seat.get(key), value), true),
    findMatches: (seats) => seats.find(s => seat.matches(s)),
    isEqual: item => {
      const cat = item.category
      if (seat.isMultiple()) {
        return seat.get('category') === cat
      }
      return seat.get('category') === cat && seat.get(['row', 'seat']).join('-') === [item.row, item.seat].join('-')
    },
    toObject: () => {
      return {
        category: seat.get('category'),
        row: seat.get('row', '-1'),
        seat: seat.get('seat'),
        price: seat.get('price'),
      }
    },
  }

  return seat
}

svgSeat.from = obj => {
  if (obj && obj instanceof SVGElement) {
    return obj.hasAttribute('data-category') ? svgSeat(obj) : null
  }
  
  const el = (!obj.row || obj.row === '-1' || obj.row === '0') ?
    document.querySelector(`.${SEAT_CLASS}[data-category="${obj.category}"]`) :
    document.querySelector(`.${SEAT_CLASS}[data-row="${obj.row}"][data-seat="${obj.seat}"]`)
  return el ? svgSeat(el) : null
}