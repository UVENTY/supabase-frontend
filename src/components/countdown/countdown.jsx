import { useEffect, useRef, useState } from 'react'
import { cn } from '@bem-react/classname'
import classNames from 'classnames'
import { ReactComponent as ClockIcon } from 'icons/clock.svg'
import { useCountdown } from 'utils/hooks'
import { msToTime } from 'components/seating-scheme/utils'
import './countdown.scss'

const bem = cn('countdown')

export default function Countdown({ to, className }) {
  const [ time, setTime ] = useState()
  const lastTime = useRef(null)
  const timer = useRef(null)

  const start = (seconds) => {
    if (timer.current) clearInterval(timer.current)
    setTime(Math.max(0, seconds))
    timer.current = setInterval(() => {
      setTime((time) => {
        if (time <= 0) {
          clearInterval(timer.current)
          return 0
        } else return time - 1
      })
    }, 1000)
  }

  useEffect(() => {
    if (lastTime.current !== to) {
      lastTime.current = to
      start(to > Date.now() ? (to - Date.now()) / 1000 : 0)
    }
  }, [to])
  
  return (
    <div className={classNames(bem({ active: time > 0 }), { [className]: className })}>
      <span className={bem('icon')}>
        <ClockIcon />
      </span>
      <span className={bem('text')}>
        Time left to place your order:
      </span>
      <span className={bem('time')}>
        {msToTime(time * 1000)}
      </span>
    </div>
  )
}