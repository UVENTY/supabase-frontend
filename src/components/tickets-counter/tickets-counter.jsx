import { useEffect, useState } from 'react'
import cn from 'classnames'
import InputNumber from '../input-number/input-number'
import { svgSeat } from '../../utils/dom-scheme'
import './tickets-counter.scss'

export default function TicketsCounter({ category, left, top, visible, value, max, onChange }) {
  return (
    <div
      className={cn('svg-counter', { visible })}
      style={{ left, top }}
      onMouseDown={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <InputNumber
        value={value}
        min={0}
        max={max}
        onChange={onChange}
      />
    </div>
  )
}