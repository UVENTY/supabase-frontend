import event from "pages/event"
import { isEqualSeats } from "utils"

const combineQueries = (results) => {
  const refetch = () => Promise.all(results.map(item => item.refetch()))
  const errors = results.map(item => item.error)
  
  if (errors.filter(Boolean).length > 0) {
    return {
      errors: errors.filter(Boolean),
      loaded: true,
      refetch
    }
  }
  
  if (results.every(item => item.status === 'success')) {
    const [respEvent, tickets] = results.map(item => item.data)
    const priceList = tickets.map(item => item.price).filter(Boolean)
    const { categories: eventCats = [], schemeCode: scheme, ...event } = respEvent
    const bookingLimit = tickets.reduce((limit, ticket) => ticket.bookingLimit > Date.now() ? Math.max(limit, ticket.bookingLimit) : limit, 0)
    const bookingExpired = tickets.filter(ticket => ticket.bookingLimit !== null && ticket.bookingLimit < Date.now())
    const ticketsMap = tickets.reduce((map, { category, price, ...ticket }) => ({
      ...map,
      [category]: {
        count: (map[category]?.count || 0) + 1,
        price: (map[category]?.price || new Set()).add(price),
      }
    }), {})

    const cart = tickets.filter(ticket => ticket.inCart)
    const cartByCategory = cart.reduce((map, { category, price, ...ticket }) => ({
        ...map,
        [category]: {
          items: (map[category]?.items || []).concat({ category, price, ...ticket }),
          sum: (map[category]?.sum || 0) + price,
          data: map[category]?.data || eventCats.find(cat => cat.value === category),
          isMulitple: map[category]?.isMultiple || ['0', '-1'].includes(ticket.row)
        }
      }), {})

      Object.entries(cartByCategory).reduce((acc, [key, value]) => {
        value.items = value.items.sort((a, b) => {
          if (a.row === b.row) return a.seat - b.seat
          return Number(a.row) && Number(b.row) ? a.row - b.row : String(a.row).localeCompare(String(b.row))
        })
      }, {})

    const categories = [{
      value: null,
      label: 'All categories',
      count: tickets.length,
      price: [Math.min(...priceList), Math.max(...priceList)]
    }].concat(
      eventCats.map(category => {
        const t = ticketsMap[category.value]
        if (!t) return category
        t.price = t.price.size > 1 ?
          [Math.min(...t.price), Math.max(...t.price)] :
          [...t.price][0]
        return { ...category, ...t }
      }))
    
    return {
      bookingExpired,
      bookingLimit,
      cartByCategory,
      cart,
      categories,
      event,
      scheme,
      errors: [],
      tickets,
      refetch,
      loaded: true
    }
  }

  return {
    errors: [],
    loaded: false
  }
}

export default combineQueries