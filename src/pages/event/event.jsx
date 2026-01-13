import { useCallback, useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import classNames from "classnames"
import Hammer from 'hammerjs'
import { cn } from '@bem-react/classname'
import Button from "components/button";
import TicketsCounter from "components/tickets-counter";
import CategorySelector from "components/category-selector";
import SeatingScheme from "components/seating-scheme";
import Countdown from "components/countdown/countdown";
import Cart from "components/cart";
import CartModal from "components/modal/modal";
import { ReactComponent as IconArrow } from 'icons/arrow.svg'
import { ReactComponent as IconArrowDouble } from 'icons/arrow_2_down.svg'
import { clearCart, updateCart } from "api/cart";
import { getEventQuery } from "api/event";
import { useClickOutside, useCountdown, useEventId, useIsMobile, useLocalStorage } from "utils/hooks";
import { isEqualSeats } from "utils";
import { getFromLocalStorage } from "utils/common";
import { EMPTY_ARRAY, STORAGE_KEY_USER_EMAIL } from "const";
import './event.scss'

const bem = cn('event')

export default function Event() {
  const routeParams = useParams()
  const [searchParams] = useSearchParams()
  const id = useEventId()
  const queryClient = useQueryClient()
  const { bookingExpired, bookingLimit, cart, cartByCategory, categories, scheme, tickets, event, errors } = useOutletContext()
  const isMobile = useIsMobile()
  const [selectValue, setSelectValue] = useState(null)
  const [selectOpened, setSelectOpened] = useState(false)
  const [highlightCat, setHighlightCat] = useState(null)
  const [orderExpanded, setOrderExpanded] = useState(false)
  const [cartModal, setCartModal] = useState(false)
  const [promoCode, setPromoCode] = useState(null)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [viewport, setViewport] = useState(null)

  const ref = useClickOutside((e) => {
    setSelectOpened(false)
  })
  const cartRef = useRef(false)
  const schemeRef = useRef(null)
  
  useEffect(() => {
    const el = schemeRef.current
    if (!el) return
    const viewport = el.getBoundingClientRect()
    setViewport(viewport)
  }, [])

  useLayoutEffect(() => {
    const isDesktop = window.innerWidth > 1023 || 
                     window.screen.width > 1023 || 
                     !navigator.userAgent.includes('Mobile')
    
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    
    if (isDesktop || (isSafari && isMac && window.innerWidth > 768)) {
      setSelectOpened(true)
    }
    
    setTimeout(() => {
      if (window.innerWidth > 1023 && !selectOpened) {
        setSelectOpened(true)
      }
    }, 100)
  }, [])
  
  useEffect(() => {
    if (selectOpened) {
      setOrderExpanded(false)
    }
  }, [selectOpened])

  useEffect(() => {
    if (!bookingExpired || !bookingExpired.length) return
    bookingExpired.forEach(item => updateCart(item, 0))
  }, [bookingExpired])

  const toggleInCart = useMutation({
    mutationFn: (item) => updateCart(item, Number(!item.inCart)),
    onMutate: async (ticket) => {
      const booking = ticket.inCart ? 0 : (bookingLimit || (Date.now() + 15 * 60 * 1000 + 59 * 1000))
      const queryKey = ['tickets', id]
      await queryClient.cancelQueries({ queryKey })
      const previousCart = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, items =>
        items.map(item => item.id === ticket.id ? {
          ...item,
          inCart: !item.inCart,
          bookingLimit: booking
        } : item)
      )
      return { previousCart }
    }
  })
  
  const handleClearCart = useCallback((queryKey) => {
    return clearCart().then(() => queryClient.resetQueries({ queryKey, exact: true }))
  }, [cart])

  const handlePromoCodeApplied = useCallback((code, discount) => {
    setPromoCode(code)
    setPromoDiscount(discount || 0)
  }, [])

  const handleSetCartModal = useCallback((isOpen, promo = null) => {
    setCartModal(isOpen)
    if (promo) {
      setPromoCode(promo)
    }
  }, [])
  
  return (
    <div className={bem('layout')}>
      <div className={bem('scheme')} ref={schemeRef}>
        <Countdown to={bookingLimit} className={bem('countdown')} />
        {!!viewport && <SeatingScheme
          src={scheme}
          categories={categories}
          highlight={highlightCat || selectValue}
          selectedCategory={selectValue}
          resetSelectedCategory={() => setSelectValue(null)}
          cart={cartByCategory}
          tickets={tickets || EMPTY_ARRAY}
          toggleInCart={toggleInCart.mutate}
          viewport={viewport}
          currency={event?.currencySign}
        />}
      </div>
      <div className={classNames(bem('sidebar'), bem('categories'))} ref={ref}>
        <h2 className={bem('title')}>select a category:</h2>
        <CategorySelector
          value={selectValue}
          options={categories}
          opened={selectOpened}
          onChange={(val) => {
            if (selectOpened) setSelectValue(val)
            setSelectOpened(!selectOpened)
          }}
          onMouseOver={(e, val) => setHighlightCat(val.value)}
          onMouseOut={() => setHighlightCat(null)}
          currency={event?.currencySign}
        />
        <Button
          color='ghost'
          className={bem('toggle-cat', { opened: selectOpened })}
          onClick={() => setSelectOpened(!selectOpened)}
        >
          <IconArrow />
        </Button>
      </div>
      <div
        className={classNames(
          bem('sidebar'),
          bem('order', { expanded: !orderExpanded })
        )}
        ref={cartRef}
      >
        <button
          className={classNames(bem('toggleCart'), 'only-mobile')}
          onClick={() => {
            setOrderExpanded(!orderExpanded)
            setSelectOpened(false)
          }}
        >
          <IconArrowDouble style={{ width: 16 }} /> More details
        </button>
        {!!cartByCategory  && <Cart
          tickets={tickets}
          categories={categories}
          cart={cartByCategory}
          toggleInCart={toggleInCart.mutate}
          setCartModal={handleSetCartModal}
          fee={event?.fee * 1}
          currency={event?.currencySign}
          eventId={id}
          onPromoCodeApplied={handlePromoCodeApplied}
        />}
      </div>
      {cartModal && (
        <CartModal
          open={cartModal}
          fee={event?.fee * 1}
          categoriesF={categories}
          bookingLimit={bookingLimit}
          cart={cart}
          cartByCategory={cartByCategory}
          setOpen={setCartModal}
          clearCart={handleClearCart}
          promocode={promoCode}
          discount={promoDiscount}
        />
      )}
    </div>
  )
};