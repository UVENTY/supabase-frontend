import { useEffect } from "react"
import { Form, Link, Outlet, useLocation, useParams, useSearchParams } from "react-router-dom"
import { useQueries } from "@tanstack/react-query"
import cn from "classnames"
import { useUser } from "api/user"
import { getEventQuery } from "api/event"
import { getTicketsQuery } from "api/tickets"
import { ReactComponent as TicketLogo } from 'icons/ticket_logo.svg'
import Button from "components/button"
import { useEventId } from "utils/hooks"
import NotFound from "pages/not-found"
import { clearCart } from "api/cart"
import { STORAGE_KEY_PLACES_IN_ORDERS, STORAGE_KEY_USER_HASH, STORAGE_KEY_USER_TOKEN } from "const"
import { getFromLocalStorage } from "utils/common"
import { API_URL } from "utils/axios"
import combineQueries from "./combine"
import './loader.scss'

export default function Loader() {
  const routeParams = useParams()
  const [ searchParams ] = useSearchParams()
  const id = useEventId()
  const showScheme = searchParams.get('scheme') !== null
  const { data: authorized } = useUser()
  const location = useLocation()

  const isMobile = window.innerWidth <= 1023
  
  const enabled = authorized && !!id
  const data = useQueries({
    queries: [
      getEventQuery(id, { enabled }),
      getTicketsQuery(id, { enabled })
    ],
    combine: combineQueries
  })
  const { loaded, errors, cart, ...resp } = data
  const search = location.search.replace(/&?scheme/, '')

  useEffect(() => {
    const onLeave = function(e) {
      e.preventDefault()
      if (document.visibilityState === "hidden") {
        const formData = new FormData()
        const token = getFromLocalStorage(STORAGE_KEY_USER_TOKEN)
        const hash = getFromLocalStorage(STORAGE_KEY_USER_HASH)
        if (token && hash) {
          formData.append('token', token)
          formData.append('u_hash', hash)
        }
        navigator.sendBeacon(`${API_URL}cart/clear`, formData)
      }
    }

    window.addEventListener('unload', onLeave, { capture: true })
    return () => window.removeEventListener('unload', onLeave, { capture: true })
  }, [])

  useEffect(() => {
    const isMobile = window.innerWidth <= 1023
    const body = document.body
    if (!isMobile || searchParams.get('scheme') === null) {
      body.style = {}
    } else {
      body.style.overscrollBehavior = 'auto'
      body.style.overflow = 'hidden'
      body.style.height = '100dvh'
      body.style.maxHeight = '100dvh'
    }
  }, [searchParams.get('scheme')])
  
  return (
    <div className='layout'>
      <div className={cn('mobile-close', { 'mobile-close_visible': showScheme })}>
        <Link to={{ search }}>
          <svg className='icon-arrow' width="7" height="12" viewBox="0 0 7 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M6.74372 0.251051C7.08543 0.585786 7.08543 1.1285 6.74372 1.46323L2.11244 6L6.74372 10.5368C7.08543 10.8715 7.08543 11.4142 6.74372 11.7489C6.40201 12.0837 5.84799 12.0837 5.50628 11.7489L0.256282 6.60609C-0.0854272 6.27136 -0.0854272 5.72864 0.256282 5.39391L5.50628 0.251051C5.84799 -0.0836838 6.40201 -0.0836838 6.74372 0.251051Z" fill="#F8F5EC" />
          </svg>
          Back to the concert page
        </Link>
        <Link to={{ search }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5368 0.251051C10.8715 -0.0836838 11.4142 -0.0836838 11.7489 0.251051C12.0837 0.585786 12.0837 1.1285 11.7489 1.46323L7.21218 6L11.7489 10.5368C12.0837 10.8715 12.0837 11.4142 11.7489 11.7489C11.4142 12.0837 10.8715 12.0837 10.5368 11.7489L6 7.21218L1.46323 11.7489C1.1285 12.0837 0.585786 12.0837 0.251052 11.7489C-0.0836839 11.4142 -0.0836839 10.8715 0.251052 10.5368L4.78782 6L0.251052 1.46323C-0.0836834 1.1285 -0.0836834 0.585786 0.251052 0.251051C0.585787 -0.0836838 1.1285 -0.0836838 1.46323 0.251051L6 4.78782L10.5368 0.251051Z" fill="#F8F5EC" />
          </svg>
        </Link>
      </div>
      <div className='mobile-placeholder'>
        <div>
          <TicketLogo className='mobile-logo' />
          <div className='mobile-slogan'>Сloud ticketing solution</div>
        </div>
        <Button link={{ search: `${search}&scheme` }} className='mobile-button' color='bordered' size='xlarge'>Select ticket</Button>
      </div>
      {loaded && <div className={cn('loader-content', { 'loader-content_mobile-visible': showScheme })}>
        <Outlet context={data} />
      </div>}
      <div className={cn('loader-spinner', { 'loader-spinner_visible': isMobile ? (!loaded && showScheme) : !loaded })}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle fill="#53BC6B" stroke="#53BC6B" strokeWidth="2" r="15" cx="40" cy="100"><animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4" /></circle><circle fill="#53BC6B" stroke="#53BC6B" strokeWidth="2" r="15" cx="100" cy="100"><animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2" /></circle><circle fill="#53BC6B" stroke="#53BC6B" strokeWidth="2" r="15" cx="160" cy="100"><animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0" /></circle></svg>
      </div>
    </div>
  )
}