import { createOrder as createOrderSupabase } from '../supabase/order'
import { supabase } from '../supabase/client'
import { getTicketsByTrip } from '../supabase/ticket' 

export async function CreateOrder(seats, succeeded_url, failed_url = window.location.href, promocode = null, userEmail = null, event_id = null) {
  try {
    let email = userEmail
    
    if (!email) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (!authError && user?.email) {
        email = user.email
      }
    }
    
    if (!email || email.trim() === '') {
      throw new Error('User email not found')
    }

    let userData = null
    const { data: existingUser } = await supabase
      .from('users')
      .select('id_user')
      .eq('email', email.trim())
      .maybeSingle()

    let userId = null

    if (existingUser?.id_user) {
      userId = existingUser.id_user
    } else {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data: retryUser } = await supabase
        .from('users')
        .select('id_user')
        .eq('email', email.trim())
        .maybeSingle()

      if (retryUser?.id_user) {
        userId = retryUser.id_user
      } else {
        const { data: allUsers } = await supabase
          .from('users')
          .select('id_user')
          .ilike('email', email.trim())

        if (allUsers && allUsers.length > 0) {
          userId = allUsers[0].id_user
        } else {
          throw new Error('User not found in database. Please complete user registration first.')
        }
      }
    }
    
    if (!userId) {
      throw new Error('User ID not found')
    }

    let totalSum = 0
    let currency = 'EUR'

    const ticketQueries = []
    for (const [tripId, tripSeats] of Object.entries(seats)) {
      for (const seatId of Object.keys(tripSeats)) {
        ticketQueries.push({ tripId, seatId })
      }
    }

    if (ticketQueries.length > 0 && ticketQueries.length < 50) {
      const { data: tickets } = await supabase
        .from('ticket')
        .select('id_trip, id_seat, tariff, currency')
        .in('id_trip', [...new Set(ticketQueries.map(q => q.tripId))])

      if (tickets && tickets.length > 0) {
        ticketQueries.forEach(({ tripId, seatId }) => {
          const ticket = tickets.find(t => t.id_trip == tripId && t.id_seat == seatId)
          if (ticket) {
            totalSum += parseFloat(ticket.tariff || 0)
            currency = ticket.currency || currency
          }
        })
      }
    }

    const { data: order, error } = await createOrderSupabase({
      seats,
      promocode,
      user_id: userId,
      currency,
      sum: totalSum
    })

    if (error) {
      throw error
    }

    const { data: stripeData, error: stripeError } = await supabase.functions.invoke(
      'create-stripe-session',
      {
        body: {
          order_id: order.id_order,
          event_id: event_id,
          amount: totalSum,
          currency: currency,
          title: `Ticket Order #${order.id_order}`,
          redirect_url: window.location.origin,
          duration: 1800,
          email: email
        }
      }
    )

    if (stripeError) {
      throw new Error(`Failed to create Stripe session: ${stripeError.message}`)
    }

    if (!stripeData?.url) {
      throw new Error('No payment URL received from server')
    }

    return {
      data: {
        payment: stripeData.url,
        b_id: order.id_order,
        session_id: stripeData.session_id
      }
    }
  } catch (e) {
    return Promise.reject(e)
  }
}