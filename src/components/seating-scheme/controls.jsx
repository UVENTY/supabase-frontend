import classNames from 'classnames'
import { useControls, useTransformComponent } from 'react-zoom-pan-pinch'
import { ReactComponent as ResetIcon } from 'icons/reset.svg'
import { ReactComponent as TicketLogo } from 'icons/ticket_logo.svg'
import { ReactComponent as ZoomIn } from 'icons/zoom-in.svg'
import { ReactComponent as ZoomOut } from 'icons/zoom-out.svg'

function Controls(props) {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  const transformedComponent = useTransformComponent(({ state, instance }) => {
    return <>
      <div className='scheme-zoom'>
        <button
          className={classNames('scheme-control')}
          onClick={() => zoomOut()}
        >
          <ZoomOut style={{ width: 17 }} />
        </button>
        <button
          className={classNames('scheme-control')}
          onClick={() => zoomIn()}
        >
          <ZoomIn style={{ width: 17 }} />
        </button>
      </div>
      <div className='scheme-reset'>
        <button
          className={classNames('scheme-control', { 'scheme-control_hidden': state.scale <= 1.2 })}
          onClick={() => {
            props.resetCategory()
            resetTransform()
          }}
        >
          <ResetIcon style={{ width: 23 }} />
        </button>
      </div>
      <div className='scheme-reset-categories'>
        <button
          className={classNames('scheme-control scheme-control-large', { 'scheme-control_hidden': !props.selectedCategory })}
          onClick={() => props.resetCategory()}
          style={{ fontWeight: "400" }}
        >
          <svg width="34" height="6" viewBox="0 0 34 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M33 3.4C33.2209 3.4 33.4 3.22091 33.4 3C33.4 2.77909 33.2209 2.6 33 2.6L33 3.4ZM0.717155 2.71716C0.560947 2.87337 0.560947 3.12663 0.717155 3.28284L3.26274 5.82843C3.41895 5.98464 3.67222 5.98464 3.82843 5.82843C3.98464 5.67222 3.98464 5.41895 3.82843 5.26274L1.56569 3L3.82843 0.737258C3.98464 0.581048 3.98464 0.327782 3.82843 0.171573C3.67222 0.0153629 3.41895 0.0153629 3.26274 0.171573L0.717155 2.71716ZM33 2.6L1 2.6L1 3.4L33 3.4L33 2.6Z" fill="currentColor" />
          </svg>
          BACK TO<br />
          ALL CATEGORIES
        </button>
      </div>
      <div className='simple-impudent-logo'>
        <TicketLogo width="54" height="13" />
      </div>
      <div className='scheme-overlay'></div>
    </>
  })

  return transformedComponent
}

export default Controls