import Hammer from 'hammerjs'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { cn } from '@bem-react/classname'
import classNames from 'classnames'
import { CURRENCY_SYMBOL_MAP } from 'const'
import './category-selector.scss'

const bem = cn('category-selector')

export default function SelectCategory({
  options = [],
  valueKey = 'value',
  value,
  opened,
  className,
  style,
  onChange,
  onMouseOver,
  onMouseOut,
  currency,
  ...rest
}) {
  const ref = useRef(null)
  const selectedIndex = useMemo(() => options.findIndex(option => option[valueKey] === value), [options, value, valueKey])

  return (
    <ul
      className={classNames(bem({ opened }), { [className]: className })}
      style={{ ...style, height: opened ? (options.length - 1) * 24 + 46 : 30 }}
      {...rest}
      ref={ref}
    >
      {options.map(({ price, ...option }, i) => (
        <li
          key={option[valueKey]}
          className={bem('option', {
            selected: option[valueKey] === value,
            disabled: !option.count
          })}
          style={option[valueKey] === value ?
            undefined : {
              top: i * 24 + 38 - (selectedIndex > i ? 0 : 24)
            } 
          }
          onClick={() => onChange(option[valueKey])}
          onMouseOver={e => {
            onMouseOver && option.count && onMouseOver(e, option)
          }}
          onMouseOut={() => onMouseOut && option.count && onMouseOut()}
        >
          <span className={bem('column')}>
            {!!option.icon &&
              <span
                style={{ color: option.color }}
                className={bem('icon')}
                dangerouslySetInnerHTML={{ __html: option.icon }}
              />
            }
            <span className={bem('label')}>{option.label}</span>
          </span>
          <span className={bem('count')}>{!!option.count && `${option.count} left`}</span>
          {!!option.sale && <span className={bem('old_price')}>{option.sale}</span>}
          <span className={bem('price')}>
            {!!price ? (
              Array.isArray(price) ? <>
                <span className='only-desktop'>from</span> {price[0]} {currency}&nbsp;
                <span className={classNames(bem('price-del'), 'only-mobile')}>–</span>
                <span className='only-desktop'>to</span> {price[1]} {currency}
              </> :
              [price, currency].filter(Boolean).join(' ')
            ) : 'SOLD OUT'}
          </span>
        </li>
      ))}
    </ul>
  )
}