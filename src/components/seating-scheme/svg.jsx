import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { KeepScale, TransformComponent, useControls, useTransformComponent, useTransformContext } from 'react-zoom-pan-pinch'
import Hammer from 'hammerjs'
import classNames from 'classnames'
import { svgSeat } from 'utils/dom-scheme'
import { createDefs, createStyles, stringToSvg } from './utils'
import { CHECK_PATH_ID, SEAT_CLASS, SEAT_CLASS_HIDDEN, SEAT_CLONE_CLASS } from 'const'
import SeatingTooltip from 'components/seating-tooltip'
import TicketsCounter from 'components/tickets-counter'
import { isTouchDevice } from 'utils'

const log = () => {}

const mapSeat = (node, cb, joinToSelector = '') =>
  Array.from(node.querySelectorAll(`.svg-seat${joinToSelector}`)).map(cb)

const TOOLTIP_HEIGHT = 120

const SvgScheme = forwardRef((props, outerRef) => {
  const [counters, setCounters] = useState([])
  const [tooltipSeat, setTooltipSeat] = useState({ visible: false })
  const [wrapperSize, setWrapperSize] = useState({ width: 'auto', height: '100%' })
  const [activeSeat, setActiveSeat] = useState(null)
  const { src, categories, cart, currency, highlight, tickets, viewport, toggleInCart } = props
  const ref = useRef(null)
  const refSelected = useRef(null)
  const refTooltip = useRef(null)
  const { zoomIn } = useControls()
  useImperativeHandle(outerRef, () => ref.current)
  
  const viewportBounds = useRef(null)
  useEffect(() => {
    const node = document.querySelector('.react-transform-wrapper')
    if (!node) return
    viewportBounds.current = node.getBoundingClientRect()
  }, [])
  
  const ticketsByCategory = useMemo(() => tickets.reduce((acc, ticket) => ({
    ...acc,
    [ticket.category]: (acc[ticket.category] || []).concat(ticket)
  }), {}), [tickets])

  const context = useTransformContext()
  
  const showSeatTooltip = el => {
    const { width, height, x, y } = ref.current.getBoundingClientRect()
    const elBounds = el.getBoundingClientRect()
    const tooltipWidth = refTooltip.current?.clientWidth
    const tooltipHeight = refTooltip.current?.clientHeight
    const factorX = tooltipWidth >= elBounds.x ? tooltipWidth - elBounds.x - 10 : 0
    const isCutDown = TOOLTIP_HEIGHT >= (viewportBounds.current.height + viewportBounds.current.y) - (elBounds.y + elBounds.height)
    const seat = svgSeat(el)
    const unavailable = seat.disabled()
    let dx = ((elBounds.x - x) + elBounds.width) + factorX
    let dy = ((elBounds.y - y) + elBounds.height)
    if (viewportBounds.current && factorX) {
      dx += viewportBounds.current.x
    }

    setTooltipSeat({
      visible: true,
      x: `${(dx / width) * 100}%`,
      y: `${(dy / height) * 100}%`,
      ticketId: seat.get('ticket-id'),
      text: seat.get('text'),
      delay: null,
      seat,
      unavailable,
      isCutDown
    })
    Array.from(ref.current.querySelectorAll(`.${SEAT_CLASS_HIDDEN}`))
      .forEach(el => {
        el.classList.remove(SEAT_CLASS_HIDDEN)
      })
    const category = seat.get('category')
    const color = categories.find(cat => cat.value === category)?.color
    const viewBox = ref.current.getAttribute('viewBox')
    const box = el.getBBox()
    const activeObj = {
      Tag: el.tagName?.toLowerCase(),
      d: el.getAttribute('d'),
      fill: seat.disabled() ? '#666' : color,
      stroke: color,
      strokeWidth: 0,
      viewBox,
      box
    }
    setActiveSeat(activeObj)
    el.classList.add(SEAT_CLASS_HIDDEN)
  }

  const hideSeatTooltip = (delay = 0) => {
    function hide() {
      setTooltipSeat(prev => ({ ...prev, delay, visible: false }))
      setActiveSeat(null)
      Array.from(ref.current.querySelectorAll(`.${SEAT_CLASS_HIDDEN}`))
        .forEach(el => {
          el.classList.remove(SEAT_CLASS_HIDDEN)
        })
    }

    delay ? setTimeout(hide, delay) : hide()
  }

  useEffect(() => {
    if (!ref.current) return
    const cats = ref.current.querySelectorAll('.svg-seat[data-category]:not([data-row]):not([data-seat])')
    const svgBound = ref.current.getBBox()
    const counters = Array.from(cats).map(el => {
      const seat = svgSeat(el)
      const category = seat.get('category')
      const title = seat.getTitleNode()
      const bound = title ? title.getBBox() : el.getBBox()
      const left = bound.x + bound.width / 2
      const top = bound.y + (title ? 1.1 * bound.height : (2 / 3) * bound.height)
      const value = cart?.[category]?.items?.length || 0
      const visible = !!cart?.[category] || 0
      const max = ticketsByCategory[category]?.length || 0
      return {
        category,
        left: Math.round((left / svgBound.width) * 100) + '%',
        top: Math.round((top / svgBound.height) * 100) + '%',
        max,
        value,
        visible
      }
    })
    setCounters(counters)
  }, [cart, ticketsByCategory])

  useEffect(() => {
    const node = ref.current
    if (!highlight) {
      mapSeat(node, el => el.removeAttribute('style'), '')
      return
    }
    mapSeat(node, el => el.removeAttribute('style'), `[data-category="${highlight}"]`)
    mapSeat(node, el => el.style.fill = '#666', `:not([data-category="${highlight}"])`)
  }, [highlight])

  useEffect(() => {
    const node = ref.current
    if (!node || !src) return
    const svg = stringToSvg(src)
    createDefs(svg, ['path', { x: 0, y: 0, d: 'M 1.5 3.5 L 3 5 L 6 2', className: 'seat-check', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', id: 'checked-seat-path' }])
    createDefs(svg, ['path', { x: 0, y: 0, d: 'M 1 3 L 4.25 6.25 L 10 0.5', className: 'category-check', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', id: 'checked-category-path' }])
    createStyles(svg, categories)

    if (node.hasChildNodes()) node.innerHTML = ''
    let timer = null

    Array.from(svg.attributes).forEach(({ name, value }) => ['width', 'height'].includes(name) ?
      node.style[name] = 'auto' : node.setAttribute(name, value)
    )
    Array.from(svg.children).forEach(child => node.appendChild(child))
      Array.from(node.querySelectorAll('.svg-seat')).forEach(el => {
        const [category, row, num] = ['category', 'row', 'seat'].map(attr => el.getAttribute(`data-${attr}`))
        el.id = `seat-${[category, row, num].filter(Boolean).join('-')}`
        const seat = svgSeat(el)
        let seatTicket = seat.isMultiple() ?
          tickets.filter(item => item.category === category) :
          tickets.find(item => item.id === el.id)

        if (seatTicket) {
          seat.set('ticket-id', seatTicket.id)
          const hasInCart = seat.isMultiple() ? seatTicket.some(ticket => ticket.inCart) : seatTicket.inCart
          seat.checked(hasInCart)
          const ticketData = seat.isMultiple() ? seatTicket[0] : seatTicket
          const isSold = ticketData?.id_order || ticketData?.status === 3
          const isReserved = ticketData?.status === 2
          
          if (!isSold && !isReserved) {
            seat.disabled(false)
            el.removeAttribute('data-disabled')
            el.removeAttribute('style')
            el.removeAttribute('fill')
            el.classList.remove('unavailable')
          } else {
            seat.disabled(true)
            el.setAttribute('data-disabled', '')
          }
        } else {
          seat.disabled(true) 
        }
      if (!seat.isMultiple()) {
        const svgBound = ref.current.getBBox()
        el.addEventListener('mouseover', (e) => {
          timer && clearTimeout(timer)
          showSeatTooltip(el)
        })
        if (!isTouchDevice()) {
          el.addEventListener('mouseout', (e) => {
            timer = setTimeout(() => {
              log('mouseout')
              log(el.tagName, el.getAttribute('class'), el.textContent)
              hideSeatTooltip()
            }, 1000)
          })
        }
      }
    })

    const viewBox = (node.getAttribute('viewBox') || '').split(' ')
    const [x1, y1, x2, y2] = viewBox.map(Number) || []
    const svgWidth = x2 - x1
    const svgHeight = y2 - y1
    let { width: w, height: h } = viewport || {}
    if (!w && window.innerWidth < 1024) {
      w = window.innerWidth
    }
    
    let rw = svgWidth
    let rh = svgHeight
    if (w/h > svgWidth / svgHeight) {
      rh = h
      rw = (svgWidth / svgHeight) * rh
    } else {
      rw = w
      rh = (svgHeight / svgWidth) * rw
    }
    setWrapperSize({ width: rw, height: rh })
  }, [src])

  useEffect(() => {
    tickets.forEach(ticket => {
      let isMultiple = ['0', '-1'].includes(ticket.row)
      let id = `#${ticket.id}`
      if (isMultiple) id = `#seat-${ticket.category}`
      const el = ref.current.querySelector(id)
      if (!el) return

      const checked = isMultiple ? tickets.some(t => t.category === ticket.category && t.inCart) : ticket.inCart
      svgSeat(el).checked(checked)
    })
  }, [tickets])

  useEffect(() => {
    const svgEl = ref.current
    const hammer = new Hammer(svgEl, { domEvents: true })
    const handleTap = (event) => {
      const el = event.target      
      const seat = svgSeat.from(el)
      if (!seat) {
        log('no seat')
        log(el.tagName, el.getAttribute('class'), el.textContent)
        hideSeatTooltip(0)
        return
      }

      const isMultiple = seat && seat.isMultiple()
      const seatCat = seat ? seat.get('category') : ''
      const ticketsCat = ticketsByCategory?.[seatCat] || []
      const ticket = isMultiple && ticketsCat ? ticketsCat.find(item => !item.inCart) : tickets.find(t => t.id === el.id)
      
      if (ticket && !el.hasAttribute('data-disabled')) {
        if (isTouchDevice() && !isMultiple) {
          showSeatTooltip(el)
        } else {
          toggleInCart(ticket)
          log('not touch or multiple')
          log(el.tagName, el.getAttribute('class'), el.textContent)
          hideSeatTooltip(500)
        }
      } else {
        log('no ticket or disabled')
        log(el.tagName, el.getAttribute('class'), el.textContent)
        hideSeatTooltip(0)
      }
    }
    hammer.on('tap', handleTap)


    return () => {
      hammer.off('tap', handleTap)
      hammer.destroy()
    }
  }, [ticketsByCategory, tickets, tooltipSeat, zoomIn, context?.transformState?.scale])

  const handleChangeMultiple = (count, tickets, cat) => {
    const catInCart = tickets.filter(item => item.category === cat && item.inCart)
    const diff = count - catInCart.length

    if (diff > 0) {
      const changed = tickets.filter(item => item.category === cat && !item.inCart).slice(0, diff)
      changed.forEach(item => toggleInCart(item, 1))
    } else {
      const changed = catInCart.slice(0, -diff)
      changed.forEach(item => toggleInCart(item, 0))
    }
  }
  const width = ref.current?.parentNode?.clientWidth
  const height = ref.current?.parentNode?.clientWidth
  const transform = ref.current?.parentNode?.style.transform
  const ticket = useMemo(() => tickets.find(ticket => ticket.id === tooltipSeat.ticketId), [tickets, tooltipSeat.ticketId])
  const { Tag: MarkerTag, viewBox, box, ...markerProps } = activeSeat || {}
  
  return (
    <>
      <TransformComponent>
        <div
          className='scheme-wrapper'
          id='svg-wrapper'
          style={wrapperSize}
        >
          <svg
            ref={ref}
            className='scheme-svg'
            shapeRendering='geometricPrecision'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          />
          <div
            className={classNames('scheme-overlay', { ['scheme-overlay_visible']: !!activeSeat })}
            onPointerDown={(e) => hideSeatTooltip(0)}
          >
            <svg
              ref={refSelected}
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              viewBox={viewBox}
              style={{ width: '100%', height: '100%' }}
            >
              {!!activeSeat && <MarkerTag {...markerProps} />}
              {!!box && ticket?.inCart && <use x={box.x + 1.5} y={box.y + 1.8} href={`#${CHECK_PATH_ID}`} fill="red" />}
            </svg>
          </div>
          
          {counters.map(({ category, ...counter }, i) => (
            <KeepScale key={`counter-${category}-${i}`} style={{ position: 'absolute', zIndex: 20, ...counter }}>
              <TicketsCounter
                {...counter}
                onChange={value => handleChangeMultiple(value, tickets, category)}
              />
            </KeepScale>
          ))}
          <KeepScale
            style={{
              zIndex: 110,
              position: 'absolute',
              pointerEvents: 'none',
              left: tooltipSeat.x,
              top: tooltipSeat.y,
              transition: 'ease-in-out .2s',
              transitionProperty: 'left, top'
            }}
          >
            {tickets?.length > 0 && <SeatingTooltip
              {...ticket}
              categories={categories}
              visible={tooltipSeat.visible}
              text={tooltipSeat.text}
              hideDelay={tooltipSeat.delay ?? 500}
              scaleFactor={context?.transformState?.scale}
              currency={currency}
              toggleInCart={toggleInCart}
              onToggle={() => log('toggle ticket with tooltip') || hideSeatTooltip(500)}
              isCutDown={tooltipSeat.isCutDown}
              unavailable={tooltipSeat.unavailable}
              seat={tooltipSeat.seat}
              ref={refTooltip}
            />}
          </KeepScale>
        </div>
      </TransformComponent>
    </>
  )
})

export default SvgScheme