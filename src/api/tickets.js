import { getTicketsBySchedule } from '../supabase/ticket'
import { getCart } from '../supabase/cart'
import { supabase } from '../supabase/client'
import { renameKeys } from 'utils'
const isArray = Array.isArray
const entries = Object.entries

const selectFlatArray = (ticketsData, cartMap = {}) => {
  const flatTickets = []
  
  ticketsData.forEach(ticket => {
    const parts = (ticket.id_seat || '').split(';')
    if (parts.length >= 4) {
      const [hall_id, category, row, seat] = parts
      const price = parseFloat(ticket.tariff || 0)
      const currency = ticket.currency || 'EUR'
      
      const bookingLimit = cartMap[ticket.id_seat] ? new Date(cartMap[ticket.id_seat]).getTime() : null
      
      if (ticket.id_order || ticket.status === 3) {
        return
      }
      
      if (ticket.status === 2) {
        return
      }
            
      const ticketId = `seat-${[category, row, seat].join('-')}`
      
      flatTickets.push({
        event_id: ticket.id_schedule,
        hall_id: hall_id,
        date_start: ticket.schedule?.start_datetime || null,
        category,
        row,
        seat,
        price,
        currency,
        t_id: ticket.id_trip,
        id_trip: ticket.id_trip,
        bookingLimit: bookingLimit,
        inCart: !!bookingLimit && bookingLimit > Date.now(),
        id: ticketId
      })
    }
  })
  
  return flatTickets
}

async function fetchTickets(id) {
  try {
    const { data: ticketsData, error: ticketsError } = await getTicketsBySchedule(id, {
      availableOnly: false
    })
    
    if (ticketsError) {
      throw ticketsError
    }
    
    if (!ticketsData || ticketsData.length === 0) {
      return []
    }
    
    const { data: { session } } = await supabase.auth.getSession()
    let cartMap = {}
    
    if (session && session.user && session.user.email && session.user.email.trim() !== '') {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id_user')
          .eq('email', session.user.email.trim())
          .maybeSingle()
        
        if (userData?.id_user) {
          const { data: cartResult } = await getCart(userData.id_user)
          if (cartResult?.cart) {
            cartMap = cartResult.cart.reduce((acc, item) => {
              if (item.prop) {
                acc[item.prop] = item.booking_limit
              }
              return acc
            }, {})
          }
        }
      } catch (cartError) {

      }
    }
    
    return selectFlatArray(ticketsData, cartMap)
  } catch (error) {

    throw error
  }
}

export const getTicketsQuery = (id, options) => ({
  queryKey: ['tickets', id],
  queryFn: () => fetchTickets(id),
  retry: 0,
  ...options
})