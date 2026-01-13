
export const EMPTY_ARRAY = []

export const CHECK_PATH_ID = 'checked-seat-path'
export const CATEGORY_CHECK_PATH_ID = 'checked-category-path'

export const SEAT_CLASS = 'svg-seat'
export const SEAT_CLASS_ACTIVE = `${SEAT_CLASS}_active`
export const SEAT_CLASS_SELECTED = `${SEAT_CLASS}_selected`
export const SEAT_CLASS_HIDDEN = `${SEAT_CLASS}_mobile_hidden`
export const SEAT_CLONE_CLASS = 'svg-seat-clone'

export const CURRENCY_SYMBOL_MAP = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  RUB: '₽',
  UAH: '₴',
  BYR: 'p',
  KZT: '₸',
  KGS: '₸',
  CNY: '¥',
  INR: '₹',
  JPY: '¥',
  TRY: '₺',
}

export const STORAGE_KEY_REDIRECT = 'redirect_after_pay'
export const STORAGE_KEY_USER_TOKEN = 'phantom_user_token'
export const STORAGE_KEY_USER_EMAIL = 'phantom_user_email'
export const STORAGE_KEY_USER_HASH = 'phantom_user_u_hash'
export const SCHEME_BLUR_ID = 'scheme-blur-filter'

export const PHANTOM_PASSWORD = '123456' 
export const getPhantomUser = () => ({
  u_name: `Phantom-${Date.now()}`,
  u_role: '1',
  u_email: `${Date.now()}@client`,
  data: JSON.stringify({
    password: PHANTOM_PASSWORD,
  }),
})

export const DISTRIBUTE_PAGE_URL = 'https://uventy.com/congratulations'

export const SUCCEEDED_PAGE_URL = 'https://uventy.com/congratulations'

export const MODAL_WINDOW_PRIVACY_POLICY = 'https://uventy.com/privacy_policy'

export const MODAL_WINDOW_OFFER = 'https://uventy.com/public_offer_agreement'

export const STORAGE_KEY_PLACES_IN_ORDERS = 'places_in_orders'