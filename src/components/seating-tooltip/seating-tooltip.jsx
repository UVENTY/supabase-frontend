import { forwardRef, useEffect, useRef, useState } from 'react'
import { cn } from '@bem-react/classname'
import Button from 'components/button'
import { toHaveAttribute } from '@testing-library/jest-dom/dist/matchers'
import { CURRENCY_SYMBOL_MAP } from 'const'
import { ReactComponent as Selected } from 'icons/selected.svg'
import './seating-tooltip.scss'
import { useIsMobile } from 'utils/hooks'

const bem = cn('seating-tooltip')

const SeatingTooltip = forwardRef((props, ref) => {
  const { currency, visible, seat, isCutDown, onToggle = () => {} } = props
  const isMobile = useIsMobile()
  const category = seat?.get('category')
  const disabled = seat?.disabled()
  const cat = props.categories.find((c) => c.value === category);
  const svg = props.icon || cat?.icon;
  const color = props.color || cat?.color || "#fff";
  let timer = useRef(null)

  return (
    <div
      id='seat-tooltip'
      className={bem({ visible, over: isCutDown })}
      style={{ left: props.x, top: props.y }}
      onClick={() => {
        if (disabled) return
        props.toggleInCart(props, Number(!props.inCart))
        onToggle(Number(!props.inCart))
      }}
      ref={ref}
    >
      <div className={bem('head')}>
        <div className={bem('price')}>
          {disabled ? 'SOLD' : <>
            {props?.price || '-'}&nbsp;{currency}
          </>}
        </div>
        {!!svg && <div
          className={bem('icon')}
          style={{ color }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />}
      </div>
      <div className={bem('desc')} style={{ color }}>
        <div className={bem('category')}>{cat?.name || seat?.get('category')}</div>
        {!!props.text && <div className={bem('text')}>{props.text}</div>}
      </div>
      <div className={bem('seat')}>
        <div className={bem('row')}>
          <span>Row:</span> {seat?.get('row')}
        </div>
        <div className={bem('num')}>
          <span>Seat:</span> {seat?.get('seat')}
        </div>
      </div>
      <button
        className={bem('button', { selected: props.inCart })}
        style={{
          backgroundColor: props.inCart ? color : undefined,
          borderColor: props.inCart ? color : undefined
        }}
      >
        {disabled ? 'Unavailable' : <>
          {props.inCart ? <><Selected style={{ width: 12 }} /> Selected</> : `${isMobile ? 'Tap' : 'Click'} to select`}
        </>}
      </button>
    </div>
  )
})

export default SeatingTooltip