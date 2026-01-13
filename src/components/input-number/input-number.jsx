import { useCallback } from 'react'
import cn from 'classnames'
import Button from '../button/button'
import styles from './input-number.module.scss'

const InputNumber = ({
  value,
  onChange = () => {},
  min = -Infinity,
  max = +Infinity,
  step = 1,
  style,
  ghost,
  className,
  disabledInput = true,
  ...rest
}) => {

  const isInRange = useCallback((num) => {
    return 
  }, [min, max])

  return (
    <div className={cn(styles.group, className, { [styles.ghost]: ghost })} style={style}>
      <Button
        color={ghost ? 'ghost' : 'dark'}
        size='small'
        attach='right'
        disabled={typeof value === 'number' && value <= min}
        onClick={() => onChange(Math.max(value - step, min))}
      >
        <svg viewBox='0 0 9 9' width='9px' height='9px' className='inline-icon icon-sign'>
          <line x1={0} y1={5.5} x2={9} y2={5.5} stroke='currentColor' />
        </svg>
      </Button>
      
      <div className={styles.textField}>
        <div className={styles.fakeValue}>{value}</div>
        <input
          type='number'
          className={cn(styles.input, {
            [styles.readOnly]: disabledInput,
          })}
          value={value}
          onChange={e => onChange(parseInt(e.target.value || 0))}
          onBlur={() => !isInRange(value) && onChange(value - min < max - value ? min : max)}
          min={min === -Infinity ? null : min}
          max={max === +Infinity ? null : max}
          {...rest}
        />
      </div>

      <Button
        color={ghost ? 'ghost' : 'dark'}
        size='small'
        attach='left'
        disabled={typeof value === 'number' && value >= max}
        onClick={() => onChange(Math.min(value + step, max))}
      >
        <svg viewBox='0 0 9 9' width='9px' height='9px' className='inline-icon icon-sign' style={{ position: 'relative', top: 1 }}>
          <line x1={4.5} y1={0} x2={4.5} y2={9} stroke='currentColor' />
          <line x1={0} y1={4.5} x2={9} y2={4.5} stroke='currentColor' />
        </svg>
      </Button>
    </div>
  )
}

export default InputNumber