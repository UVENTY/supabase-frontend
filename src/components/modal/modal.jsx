import React, { useState, useEffect, useMemo, useRef } from "react";
import { Checkbox, ConfigProvider } from "antd";
import { MdOutlineAccessTime } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";
import { BiLoaderCircle } from "react-icons/bi";
import { useDispatch, useSelector } from "react-redux";
import { getFromLocalStorage, setLocalStorage } from "../../utils/common";
import {
  DISTRIBUTE_PAGE_URL, MODAL_WINDOW_OFFER, MODAL_WINDOW_PRIVACY_POLICY,
  STORAGE_KEY_PLACES_IN_ORDERS,
  STORAGE_KEY_REDIRECT,
  STORAGE_KEY_USER_EMAIL,
  STORAGE_KEY_USER_HASH,
  STORAGE_KEY_USER_TOKEN,
  SUCCEEDED_PAGE_URL
} from "../../const";
import { ReactComponent as CheckboxIcon } from 'icons/checkbox.svg'
import { updateUser, AuthUser } from "../../api/user";
import { clearCart, formatSeats, moveCart } from "../../api/cart";
import { CreateOrder } from "../../api/order"
import { useCountdown, useEventId } from "../../utils/hooks";
import { msToTime } from "../seating-scheme/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Button from "components/button";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import cn from "classnames";
import { ReactComponent as Spinner } from 'icons/spinner-dots.svg'
import { ModalSpinner } from "../modal-button-spinner/modalSpinner";

export const calculateTotal = (data, percentage, discount) => {
  let totalQuantity = 0;

  const total = data?.reduce((acc, curr) => {
    if (curr?.type === "stand") {
      totalQuantity += curr?.quantity;
    } else {
      totalQuantity += 1;
    }
    const itemTotal = curr?.type === "stand" ? curr?.price * curr?.quantity : curr?.price;
    return acc + Number(itemTotal);
  }, 0);

  const roundedTotal = Math.round(total * 100) / 100;
  const fee = Math.round(roundedTotal * percentage) / 100;
  const totalDiscount = discount ? Math.round(roundedTotal * discount) / 100 : 0;
  const finalTotal = Math.round((roundedTotal + fee - totalDiscount) * 100) / 100;

  return {
    total: finalTotal,
    fee: fee,
    dis: totalDiscount,
    qty: totalQuantity,
  };
};

const CartModal = ({
  setOpen,
  open,
  fee,
  categoriesF,
  discount = 0,
  bookingLimit,
  cart,
  clearCart,
  cartByCategory = {},
  promocode = null,
}) => {
  const t = useMemo(() => calculateTotal(cart, fee, discount), [cart, fee, discount])
  const queryClient = useQueryClient()
  const [load, setLoad] = useState(false);
  const [token, setToken] = useState(null);
  const [u_hash, setU_hash] = useState(null);
  const location = useLocation()
  const [msLeft, countdown] = useCountdown(bookingLimit - Date.now())
  const [correctUserData, setCorrectUserData] = useState(false)
  const [transitionClose, setTransitionClose] = useState(false)
  const [userAcceptPrivacyPolicy, setUserAcceptPrivacyPolicy] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [searchParams] = useSearchParams()
  const routeParams = useParams()
  const id = useEventId()
  const timer = useRef(null)

  async function addPayment(e) {
    e.preventDefault()
    const formData = new FormData(e.target)
    const values = Object.fromEntries(formData.entries())
    values.Phone = values.Phone.toString().replace("+", "")
    setLoad(true)
    const prevToken = getFromLocalStorage(STORAGE_KEY_USER_TOKEN)
    const prevHash = getFromLocalStorage(STORAGE_KEY_USER_HASH)
    await updateUser({ u_name: values.Name, u_email: values.Email, u_phone: values.Phone })
      .then(async ({ data }) => {
        if (data.status === "error" && data.message.startsWith("busy user data:")) {
          const userData = await AuthUser(values.Email, values.Phone)
          if (userData.u_id) {
            await moveCart(prevToken, prevHash, userData.u_id)
            setLocalStorage(STORAGE_KEY_USER_EMAIL, values.Email);
            setLocalStorage(STORAGE_KEY_USER_TOKEN, userData.token);
            setLocalStorage(STORAGE_KEY_USER_HASH, userData.u_hash);
            return userData.u_id
          }
        } else if (data.message === "user or modified data not found") {

        }

        return null
      })
      .catch(e => {
        setErrorMsg(e.message)
      })

    const seats = cart.reduce((acc, seat) => {
      if (!acc[seat.t_id]) acc[seat.t_id] = {}
      var seatFormat = [seat.hall_id, seat.section || seat.category, seat.row, seat.seat].join(';');
      acc[seat.t_id][seatFormat] = 1;
      return acc;
    }, {});

    var to_stripe_formatting_dancefloor_flag = false;
    for (var i = 0; i < cart.length; i++) {
      cart[i].name = "Row - " + cart[i].row + ", Seat - " + cart[i].seat;

      if (
        cart[i].category ===
        categoriesF.find((cat) => cat.code_type === "Dancefloor")?.value &&
        !to_stripe_formatting_dancefloor_flag
      ) {
        to_stripe_formatting_dancefloor_flag = true;
        cart[i].name = "DANCE FLOOR";
        cart[i].quantity = cart.filter(
          (x) =>
            x.category ===
            categoriesF.find((cat) => cat.code_type === "Dancefloor")?.value
        ).length;
      }
    }
    var places_in_orders = getFromLocalStorage(STORAGE_KEY_PLACES_IN_ORDERS, {})

    CreateOrder(seats, SUCCEEDED_PAGE_URL, undefined, promocode, values.Email, id)
      .then(({ data } = {}) => {
        const { payment, b_id } = data
        setLoad(false)
        clearCart(['tickets', id])
        if (payment) {
          const url = new URL(window.location.href)
          const redirect = url?.href || window.location.href
          localStorage.setItem(STORAGE_KEY_REDIRECT, redirect)

          if (!places_in_orders[id]) { places_in_orders[id] = {} }
          var new_tickets_grouped = {};
          for (let i = 0; i < cart.length; i++) {
            if (!new_tickets_grouped[cart[i].t_id]) new_tickets_grouped[cart[i].t_id] = []
            new_tickets_grouped[cart[i].t_id].push(cart[i])
          }
          for (const key in new_tickets_grouped) {
            for (let i = 0; i < new_tickets_grouped[key].length; i++) {
              new_tickets_grouped[key][i] = new_tickets_grouped[key][i].hall_id + ';' + new_tickets_grouped[key][i].category + ';' + new_tickets_grouped[key][i].row + ';' + new_tickets_grouped[key][i].seat
            }
          }
          places_in_orders[id] = new_tickets_grouped
          localStorage.setItem(STORAGE_KEY_PLACES_IN_ORDERS, JSON.stringify(places_in_orders))
          window.location.href = payment
        } else {
          setErrorMsg(`Payment error ${JSON.stringify(data)}`)
        }
      })
      .catch(e => {
        setErrorMsg(e.message)
        setLoad(false)
      })
  }

  const close = () => {
    const modal = contentRef.current
    const overlay = modal.parentNode
    modal.classList.add('modal-content_closing')
    overlay.style.opacity = 0;
    modal.addEventListener('transitionend', () => {
      setOpen(false)
      modal.classList.remove('modal-content_closing')
      overlay.style.opacity = null
    }, {})
  }

  useEffect(() => setLoad(false), [location])

  useEffect(() => {
    if (bookingLimit > Date.now()) countdown.start()
  }, [])
  const contentRef = useRef(null)

  const isDancefloorTypeCategory = (categoryItems) => {
    var flag = true
    categoryItems.forEach((item) => {
      if (item.row !== "-1") {
        flag = false
      }
    })
    return flag
  }

  const checkUserData = () => {
    const name = document.getElementById('modal-auth-name')
    const email = document.getElementById('modal-auth-email')
    const phone = document.getElementById('modal-auth-phone')
    const checkName = name.value.length > 0
    const checkEmail = email.value.match(/.+@.+\..+/i)
    const checkPhone = phone.value.match(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g)

    if (checkEmail) {
      email.style.border = "none"
    } else {
      if (email.value.length > 0) {
        email.style.border = "1px solid #B3261E"
      }
    }

    if (checkPhone) {
      phone.style.border = "none"
    } else {
      if (phone.value.length > 0) {
        phone.style.border = "1px solid #B3261E"
      }
    }

    if (checkName) {
      name.style.border = "none"
    }
    else {
      if (checkName) {
        name.style.border = "1px solid #B3261E"
      }
    }

    if (checkName && checkEmail && checkPhone) {
      setCorrectUserData(true)
    }
    else {
      setCorrectUserData(false)
    }
  }
  return (
    <>
      <div
        className={`w100 df aic jcc modal-container ${open && "open"}`}
        onClick={e => {
          if (contentRef.current && contentRef.current.contains(e.target)) return
          close()
        }}
      >
        <div className="df fdc aic gap10 modal-content" ref={contentRef}>
          <p className="w100 df aic jcc gap10 fs12 ticket-time">
            <MdOutlineAccessTime className="fs18" />
            Time left to place your order: <span style={{ width: "45px" }}>{msToTime(msLeft)}</span>
          </p>
          <div className="w100 df fdc aic gap10 modal-info">
            <div className="w100 df aic jcsb _info-title">
              <p className="fs22">YOUR TICKETS</p>
              <span className="fs18 cp" onClick={() => close()}>
                <RxCross2 className="close-icon" />
              </span>
            </div>

            {(() => {
              const formatPrice = (price) => Number(price).toFixed(2);
              window.formatPrice = formatPrice; 
              return null;
            })()}

            <div className="w100 df aic fww gap10 tags">
              {Object.values(cartByCategory).map(({ data, items }, i) => {
                return <React.Fragment key={`category-${i}-${data?.value}`}>
                  {isDancefloorTypeCategory(items) ? <div>
                    <label
                      className="df aic gap8 fs12 tag"
                      key={`label-${data?.value}`}>
                      <div
                        className='seats-preview'
                        dangerouslySetInnerHTML={{
                          __html: data?.icon,
                        }}
                        style={{
                          width: 12,
                          height: 12,
                          color: data?.color,
                        }}
                      />
                      <span style={{ alignItems: "baseline", display: "flex", verticalAlign: "middle" }}>
                        {data?.value} <RxCross2 style={{ marginTop: "auto", marginBottom: "auto", marginLeft: "5px", marginRight: "5px" }} /> {items.length}
                      </span>
                    </label>
                  </div>
                    : items.map(item => {
                      return (
                        <label
                          className="df aic gap8 fs12 tag"
                          key={`label-${data?.value}-${item?.category}`}>
                          <div
                            className='seats-preview'
                            dangerouslySetInnerHTML={{
                              __html: data?.icon,
                            }}
                            style={{
                              width: 12,
                              height: 12,
                              color: data?.color,
                            }}
                          />
                          <span>
                            {item?.row}
                            <div style={{
                              color: "#F8F5EC4D",
                              height: "100%",
                              width: "1px",
                              display: "inline-block",
                              margin: "0 6px 0 4px",
                            }}>|
                            </div>
                            {item?.seat}
                          </span>
                        </label>)
                    })}

                </React.Fragment>
              })}
            </div>
            <p className="w100 df aic jcsb" style={{ color: "#f8f5ec80" }}>
              <span className="fs12">service fee<span style={{ display: "none" }}>{fee}%</span>:</span>
              <i className="fs12">
                <b>{t?.fee || 0} €</b>
              </i>
            </p>
            <p className="w100 df aic jcsb">
              <span className="fs14">Total:</span>
              <i className="fs14">
                <b>{t.total || 0} €</b>
              </i>
            </p>
            <form
              className="w100 df fdc aic gap8  _info-form"
              onSubmit={addPayment}
            >
              <input
                id={"modal-auth-name"}
                type="text"
                name="Name"
                placeholder="Name"
                autoComplete="off"
                required
                onChange={() => checkUserData()}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (e.target.value.length === 1) {
                      setCorrectUserData(false)
                      e.target.style.border = 'none'
                    }
                  }
                }}
              />
              <input
                id={"modal-auth-phone"}
                type="tel"
                name="Phone"
                placeholder="Phone"
                autoComplete="off"
                required
                onChange={() => checkUserData()}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (e.target.value.length === 1) {
                      setCorrectUserData(false)
                      e.target.style.border = 'none'
                    }
                  }
                }}
              />
              <input
                id={"modal-auth-email"}
                type="email"
                name="Email"
                placeholder="Email"
                autoComplete="off"
                required
                onChange={() => checkUserData()}
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    if (e.target.value.length === 1) {
                      setCorrectUserData(false)
                      e.target.style.border = 'none'
                    }
                  }
                }}
              />

              <label className='checkbox' style={{ paddingTop: 4, alignItems: "baseline" }} onMouseUp={() => { setUserAcceptPrivacyPolicy(!userAcceptPrivacyPolicy); }}>
                <input type='checkbox' name='aggree' defaultChecked={userAcceptPrivacyPolicy} />
                <CheckboxIcon style={{ color: (userAcceptPrivacyPolicy && correctUserData ? '#f8f5ec' : '#f8f5ec40'), transition: 'all 0.3s ease' }} />
                <div style={{ color: (userAcceptPrivacyPolicy && correctUserData ? '#f8f5ec' : '#f8f5ec40'), transition: 'all 0.3s ease', fontSize: "9px" }}>
                  By checking the box, you acknowledge and agree to the Uventy <a
                    href={MODAL_WINDOW_PRIVACY_POLICY}
                    target='_blank'
                    style={{ color: "inherit", textDecoration: 'underline' }}
                  >Privacy Policy</a> and <a
                    href={MODAL_WINDOW_OFFER}
                    target='_blank'
                    style={{ color: "inherit", textDecoration: 'underline' }}
                  >Offer Agreement</a>
                  .
                </div>
              </label>
              <Button
                color='bordered'
                size='large'
                type='submit'
                style={{ width: '100%', textTransform: 'uppercase' }}
                loading={load}
                disabled={!correctUserData || !userAcceptPrivacyPolicy}
              >
                {correctUserData && userAcceptPrivacyPolicy && load ? <ModalSpinner dots_color={"#212121"} svg_style={{ width: 20 }} /> : 'Buy tickets'}


              </Button>
            </form>
            <div className="modal-bottom-container">
              <div className="svg-info-container">
                <svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path className={"svg-info-icon-path"} d="M6.625 4.71204V7.21204M6.625 12.5557C3.5184 12.5557 1 10.0373 1 6.93066C1 3.82406 3.5184 1.30566 6.625 1.30566C9.7316 1.30566 12.25 3.82406 12.25 6.93066C12.25 10.0373 9.7316 12.5557 6.625 12.5557ZM6.65613 9.08704V9.14954L6.59387 9.14929V9.08704H6.65613Z" style={{ stroke: '#F8F5EC' }} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className={"modal-bottom-info-text"} style={{ color: '#F8F5EC' }}>
                Double-check your order — once you proceed to payment, changes won't be possible, and your order will be locked for 10 minutes.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartModal;