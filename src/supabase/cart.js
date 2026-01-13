import { supabase } from './client'

/**
 * Получить корзину пользователя
 * @param {string|number} userId - может быть id_user (integer) или UUID из Supabase Auth
 */
export async function getCart(userId) {
  try {
    let realUserId = null
    
    const isNumber = typeof userId === 'number' || (typeof userId === 'string' && /^\d+$/.test(userId))
    
    if (isNumber) {
      realUserId = typeof userId === 'number' ? userId : parseInt(userId, 10)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email || user.email.trim() === '') {
        return { data: { cart: [] }, error: null }
      }
      
      const { data: userData } = await supabase
        .from('users')
        .select('id_user')
        .eq('email', user.email.trim())
        .maybeSingle()
      
      if (!userData?.id_user) {
        return { data: { cart: [] }, error: null }
      }
      
      realUserId = userData.id_user
    }
    
    if (!realUserId) {
      return { data: { cart: [] }, error: null }
    }

    const { data: cartData, error } = await supabase
      .from('cart')
      .select(`
        *,
        ticket:ticket!ticket_prop_items_int_fk_1(id_seat, tariff, currency)
      `)
      .eq('id_user', realUserId)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!cartData || cartData.length === 0) {
      return { data: { cart: [] }, error: null }
    }

    const cart = cartData.map(item => {
      const idSeat = item.ticket?.id_seat || ''
      return {
        prop: idSeat, 
        booking_limit: item.booking_limit,
        id_trip: item.product,
        t_id: item.product, 
        price: item.ticket?.tariff,
        currency: item.ticket?.currency
      }
    })

    return { data: { cart }, error: null }
  } catch (error) {

    return { data: { cart: [] }, error }
  }
}

/**
 * Обновить корзину (добавить/удалить товар)
 * @param {string|number} userId - может быть id_user (integer) или UUID из Supabase Auth
 */
export async function updateCart(userId, item, count) {
  try {
    let realUserId = null
    
    const isNumber = typeof userId === 'number' || (typeof userId === 'string' && /^\d+$/.test(userId))
    
    if (isNumber) {
      realUserId = typeof userId === 'number' ? userId : parseInt(userId, 10)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email || user.email.trim() === '') {
        return { data: { status: 'error', message: 'User email not found' }, error: null }
      }
      
      const { data: userData } = await supabase
        .from('users')
        .select('id_user')
        .eq('email', user.email.trim())
        .maybeSingle()
      
      if (!userData?.id_user) {
        return { data: { status: 'error', message: 'User not found' }, error: null }
      }
      
      realUserId = userData.id_user
    }
    
    if (!realUserId) {
      return { data: { status: 'error', message: 'User ID not found' }, error: null }
    }

    const tripId = item.t_id || item.id_trip
    if (!tripId) {
      return { data: { status: 'error', message: 'Trip ID is required' }, error: null }
    }

    const id_seat = [item.hall_id, item.category, item.row, item.seat].join(';')
    
    const { data: ticketData, error: ticketError } = await supabase
      .from('ticket')
      .select('id_trip_seat')
      .eq('id_trip', tripId)
      .eq('id_seat', id_seat)
      .single()

    if (ticketError || !ticketData) {

      return { data: { status: 'error', message: 'Ticket not found' }, error: null }
    }

    const property = ticketData.id_trip_seat
    
    if (count === 0) {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('id_user', realUserId)
        .eq('product', tripId)
        .eq('property', property)

      if (error) throw error
      return { data: { status: 'success' }, error: null }
    } else {
      const bookingLimit = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 минут

      const { data: existing } = await supabase
        .from('cart')
        .select('*')
        .eq('id_user', realUserId)
        .eq('product', tripId)
        .eq('property', property)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('cart')
          .update({
            booking_limit: bookingLimit,
            updated_at: new Date().toISOString()
          })
          .eq('id_user', realUserId)
          .eq('product', tripId)
          .eq('property', property)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('cart')
          .insert({
            id_user: realUserId,
            product: tripId,
            property: property,
            booking_limit: bookingLimit
          })

        if (error) throw error
      }

      return { data: { status: 'success' }, error: null }
    }
  } catch (error) {

    return { data: null, error }
  }
}

/**
 * Очистить корзину
 * @param {string|number} userId - может быть id_user (integer) или UUID из Supabase Auth
 */
export async function clearCart(userId, items = null) {
  try {
    let realUserId = null
    
    const isNumber = typeof userId === 'number' || (typeof userId === 'string' && /^\d+$/.test(userId))
    
    if (isNumber) {
      realUserId = typeof userId === 'number' ? userId : parseInt(userId, 10)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        return { data: { status: 'success' }, error: null }
      }
      
      const { data: userData } = await supabase
        .from('users')
        .select('id_user')
        .eq('email', user.email)
        .maybeSingle()
      
      if (!userData?.id_user) {
        return { data: { status: 'success' }, error: null }
      }
      
      realUserId = userData.id_user
    }
    
    if (!realUserId) {
      return { data: { status: 'success' }, error: null }
    }

    let query = supabase
      .from('cart')
      .delete()
      .eq('id_user', realUserId)

    const { error } = await query

    if (error) throw error
    return { data: { status: 'success' }, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function moveCart(fromUserId, toUserId) {
  try {
    const { error } = await supabase
      .from('cart')
      .update({ id_user: toUserId })
      .eq('id_user', fromUserId)

    if (error) throw error
    return { data: { status: 'success' }, error: null }
  } catch (error) {

    return { data: null, error }
  }
}