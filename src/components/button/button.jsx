import { forwardRef } from 'react'
import cn from 'classnames'
import { Link } from 'react-router-dom'
import s from './button.module.scss'

const Button = forwardRef(function Button(props, ref) {
  const {
    attach,
    block,
    children,
    className,
    color,
    disabled,
    link,
    loading,
    size,
    ...rest
  } = props
  const Tag = link ? Link : 'button'
  const tagProps = link ? { to: link } : { disabled: disabled || loading }
  return (
    <Tag
      ref={ref}
      className={cn(s.button, className, {
        [s[`button_size_${size}`]]: size,
        [s[`button_color_${color}`]]: color,
        [s[`button_attach_${attach}`]]: attach,
        [s[`button_loading`]]: loading,
      })}
      {...tagProps}
      {...rest}
    >
      {children}
    </Tag>
  )
})

export default Button