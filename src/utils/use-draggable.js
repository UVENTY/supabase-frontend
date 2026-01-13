import React, { useRef, useState, useEffect, useCallback } from 'react'
import { unstable_batchedUpdates as batch } from 'react-dom'
import Hammer from 'hammerjs'

let logEvents = false;

function enableLog(ev) {
  logEvents = !logEvents;
}

function log(prefix, value) {
  if (!logEvents) return;
  const o = document.getElementsByTagName("output")[0];
  o.innerHTML += `${prefix}: ${value}<br>`;
}

function clearLog(event) {
  const o = document.getElementsByTagName("output")[0];
  o.textContent = "";
}
export const throttle = (f) => {
  let token = null
  let lastArgs = null
  const invoke = () => {
    f(...lastArgs)
    token = null
  }
  const result = (...args) => {
    lastArgs = args
    if (!token) {
      token = requestAnimationFrame(invoke)
    }
  }
  result.cancel = () => token && cancelAnimationFrame(token)
  return result
}

export const useRefEffect = (handler) => {
  const storedValue = useRef()
  const unsubscribe = useRef()
  const result = useCallback(
    (value) => {
      storedValue.current = value
      if (unsubscribe.current) {
        unsubscribe.current()
        unsubscribe.current = undefined
      }
      if (value) {
        unsubscribe.current = handler(value)
      }
    },
    [handler]
  )
  useEffect(() => {
    result(storedValue.current)
  }, [result])
  return result
}

const useCombinedRef = (...refs) => {
  const initialRefs = useRef(refs)
  return useCallback((value) => {
    initialRefs.current.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value)
      } else {
        ref.current = value
      }
    })
  }, [])
}

const useDomEvent = (name, handler) => {
  return useCallback(
    (elem) => {
      elem.addEventListener(name, handler)
      return () => {
        elem.removeEventListener(name, handler)
      }
    },
    [name, handler]
  )
}

const usePersistentCallback = (f) => {
  const realF = useRef(f)
  useEffect(() => {
    realF.current = f
  }, [f])
  return useCallback((...args) => {
    return realF.current(...args)
  }, [])
}

const emptyFn = (x) => x
n
export const useDraggableAndScalable = ({
  onDrag = emptyFn,
  onScale = emptyFn,
  disabled,
  scale: scaleOptions = {}
} = {}) => {
  const minScale = scaleOptions.min || 0.5
  const maxScale = scaleOptions.max || 6
  const scaleStep = scaleOptions.step || 0.5

  const viewportBounds = useRef()
  const draggableBounds = useRef()
  const [pressed, setPressed] = useState(false)
  const [position, setPositionState] = useState({ x: 0, y: 0 })
  const [scale, setScaleState] = useState(1)
  const [pinching, setPinching] = useState(false)
  const hammer = useRef()
  const ref = useRef()
  const dragTargetRef = useRef()
  const scaleTargetRef = useRef()
  const initialSize = useRef()

  const setPosition = (nextPos, transition) => {
    function handleTransitionEnd() {
      this.style.transition = null
      this.removeEventListener('transitionend', handleTransitionEnd)
    }

    if (transition) {
      dragTargetRef.current.style.transition = 'ease-in-out 0.2s transform'
      dragTargetRef.current.addEventListener('transitionend', handleTransitionEnd)
    }

    setPositionState(nextPos)
  }

  const setScale = nextScale => {
    const el = scaleTargetRef.current
    if (typeof nextScale === 'function') {
      const val = nextScale(scale)
      return setScale(val)
    }
    if (!initialSize.current && el) {
      initialSize.current = {
        width: el.clientWidth,
        height: el.clientHeight
      }
    }
    const val = Math.min(Math.max(nextScale, minScale), maxScale)
    const width = initialSize.current.width * val
    const height = initialSize.current.height * val
    const dragBounds = { ...draggableBounds.current, width, height }
    const pos = toValidPosition(position, dragBounds, viewportBounds.current)
    setPosition(pos, true)
    applyTransform(pos)
    el.style.width = width
    el.style.height = height
    setScaleState(val)
  }
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) {
      return
    }
    viewportBounds.current = ref.current.getBoundingClientRect()
    draggableBounds.current = dragTargetRef.current.getBoundingClientRect()
    setPressed(true)
  }, [])
  const handlePinch = (e) => {
    const newScale = Math.max(minScale, Math.min(scale * (e.scale + 0.15), maxScale));
    setScale(newScale)
  }

  useEffect(() => {
    if (!ref.current) return
    const elem = ref.current
    elem.style.userSelect = 'none'
    
    hammer.current = new Hammer(ref.current)
    hammer.current.get('pinch').set({ enable: true })
    hammer.current.on('pinchstart pinch pinchend', handlePinch)

    viewportBounds.current = ref.current.getBoundingClientRect()
    draggableBounds.current = dragTargetRef.current.getBoundingClientRect()

    return () => {
      elem.style.userSelect = 'auto'
      hammer.current.off('pinch')
      hammer.current.destroy()
    }
  }, [])
  const subscribeMouseDown = useDomEvent('pointerdown', handleMouseDown)
  const ref2 = useRefEffect(subscribeMouseDown)
  const combinedRef = useCombinedRef(ref, ref2)
  const persistentOnDrag = usePersistentCallback(onDrag)

  useEffect(() => {
    function handleWheel(e) {
      if (e.ctrlKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -scaleStep : scaleStep
        setScale(scale + delta)
      }
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [scale])

  function toValidPosition({ x, y }, dragBounds, viewBounds) {
    const { width: dw, height: dh, left: dl, top: dt } = dragBounds
    const { width: vw, height: vh, left: vl, top: vt } = viewBounds
    const limitX = dw - vw > 0 ? 100 * 2 * scale : 0
    const limitY = dh - vh > 0 ? 100 * 2 * scale : 0

    const dx = Math.max(-limitX, Math.min(x, limitX))
    const dy = Math.max(-limitY, Math.min(y, limitY))
    return { x: dx, y: dy }
  }

  function applyTransform(lastPosition) {
    if (!ref.current || !dragTargetRef.current) {
      return
    }
    let { x, y } = lastPosition
    dragTargetRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
  }

  useEffect(() => {
    const elem = ref.current
    if (elem) {
      elem.style.cursor = pressed ? 'grabbing' : 'grab'
    }
    if (!pressed) {
      return
    }
    elem.style.cursor = 'grabbing'
    let delta = position
    let lastPosition = position
    const handleMouseMove = throttle(({ movementX, movementY }) => {
      log('isp', pinching)
      if (pinching) return
      const { x, y } = delta
      
      const { x: dx, y: dy } = toValidPosition({ x: x + movementX, y: y + movementY }, draggableBounds.current, viewportBounds.current)
      delta = { x: dx, y: dy }
      lastPosition = persistentOnDrag(delta)
      applyTransform(lastPosition)
    })
    const handleMouseUp = (e) => {
      handleMouseMove(e)
      batch(() => {
        setPressed(false)
        setPosition(lastPosition)
      })
    }
    const terminate = () => {
      lastPosition = position
      applyTransform(lastPosition)
      setPressed(false)
    }
    const handleKeyDown = (e) => {
      if (e.code === 'Escape') {
        e.preventDefault()
        terminate()
      }
    }
    document.addEventListener('pointermove', handleMouseMove)
    document.addEventListener('pointerup', handleMouseUp)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', terminate)
    return () => {
      handleMouseMove.cancel()
      document.removeEventListener('pointermove', handleMouseMove)
      document.removeEventListener('pointerup', handleMouseUp)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', terminate)
    }
  }, [position, scale, pressed, persistentOnDrag])
  return [combinedRef, dragTargetRef, scaleTargetRef, pressed, position, scale, setScale, setPosition]
}

export const useResize = (onResize) => {
  const persistentOnResize = usePersistentCallback(onResize)
  const obs = useRef()
  useEffect(() => {
    obs.current = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentBoxSize) {
          const { inlineSize: x, blockSize: y } = Array.isArray(
            entry.contentBoxSize
          )
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize
          persistentOnResize({ x, y })
        } else {
          const { width: x, height: y } = entry.contentRect
          persistentOnResize({ x, y })
        }
      }
    })
  }, [persistentOnResize])
  return useRefEffect((elem) => {
    obs.current && obs.current.observe(elem)
    return () => {
      obs.current && obs.current.unobserve(elem)
    }
  })
}