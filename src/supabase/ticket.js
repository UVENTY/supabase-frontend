import { supabase } from './client'

export async function getTicketsBySchedule(scheduleId, filters = {}) {
  try {
    let query = supabase
      .from('ticket')
      .select(`
        id_trip,
        id_schedule,
        id_seat,
        id_order,
        status,
        tariff,
        currency,
        section,
        row,
        seat,
        code,
        code_qr_base64,
        schedule:schedule(id_schedule, start_datetime)
      `)
      .eq('id_schedule', scheduleId)

    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.availableOnly) {
      query = query.eq('status', 1).is('id_order', null)
    }

    const { data, error } = await query

    if (error) {

      throw error
    }
    
    return { data: data || [], error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function getTicketsByTrip(tripId) {
  try {
    const { data, error } = await supabase
      .from('ticket')
      .select(`
        id_trip,
        id_schedule,
        id_seat,
        id_order,
        status,
        tariff,
        currency,
        section,
        row,
        seat,
        code,
        code_qr_base64
      `)
      .eq('id_trip', tripId)

    if (error) throw error

    const grouped = data?.reduce((acc, ticket) => {
      const parts = ticket.id_seat?.split(';') || []
      if (parts.length >= 4) {
        const [, category, row, seat] = parts
        if (!acc[category]) acc[category] = {}
        if (!acc[category][row]) acc[category][row] = {}
        acc[category][row][seat] = ticket
      }
      return acc
    }, {})

    return { data: grouped || {}, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function checkTicket(code) {
  try {
    const { data, error } = await supabase
      .from('ticket')
      .select(`
        *,
        order:order(*),
        schedule:schedule(*),
        trip:trip(*)
      `)
      .eq('code', code)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { 
          data: null, 
          error: { message: 'Ticket not found', code: '404' } 
        }
      }
      throw error
    }

    const isPaid = data.status === 2 || 
      (data.order?.id_order_status !== 3 && data.order?.pay_datetime)

    if (!isPaid) {
      return { 
        data: null, 
        error: { message: 'Ticket not paid', code: '404' } 
      }
    }

    return { data, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function updateTicketPass(ticketId, seatId, passed) {
  try {
    const updateData = {
      pass: passed ? 1 : 0,
      pass_datetime: passed ? new Date().toISOString() : null,
      out_datetime: passed ? null : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('ticket')
      .update(updateData)
      .eq('id_trip_seat', ticketId)
      .eq('id_seat', seatId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function getAvailableSeats(scheduleId, tripId) {
  try {
    const { data: tickets, error: ticketsError } = await supabase
      .from('ticket')
      .select('*')
      .eq('id_schedule', scheduleId)
      .eq('id_trip', tripId)

    if (ticketsError) throw ticketsError

    const { data: trip, error: tripError } = await supabase
      .from('trip')
      .select('*')
      .eq('id_trip', tripId)
      .single()

    if (tripError) throw tripError

    const seats_sold = {}
    const prices = trip.json?.price || []

    tickets?.forEach(ticket => {
      const isFree = !ticket.id_order && ticket.status === 1
      if (isFree) {
        return
      }
      
      const parts = ticket.id_seat?.split(';') || []
      if (parts.length >= 4) {
        const [, category, row, seat] = parts
        if (!seats_sold[category]) seats_sold[category] = {}
        if (!seats_sold[category][row]) seats_sold[category][row] = {}

        const seatOptions = []
        if (ticket.tariff) {
          const priceIndex = prices.findIndex(p => 
            p.includes(ticket.tariff) && p.includes(ticket.currency)
          )
          seatOptions.push(priceIndex >= 0 ? priceIndex : null)
        }
        if (ticket.id_order) {
          seatOptions.push(2) 
        }
        const cartBooking = ticket.booking_limit
        if (cartBooking) {
          seatOptions.push(3) 
        }

        seats_sold[category][row][seat] = seatOptions
      }
    })

    return {
      data: {
        seats_sold,
        price: prices
      },
      error: null
    }
  } catch (error) {

    return { data: null, error }
  }
}