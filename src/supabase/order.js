import { supabase } from './client'

export async function createOrder(orderData) {
  try {

    const { seats, promocode, user_id, currency } = orderData

    let paymentMethodId = null
    const { data: paymentMethods } = await supabase
      .from('payment_method')
      .select('id_payment_method')
      .eq('active', true)
      .limit(1)
      .maybeSingle()
    
    if (paymentMethods?.id_payment_method) {
      paymentMethodId = paymentMethods.id_payment_method
    } else {
      const { data: newPaymentMethod, error: createPmError } = await supabase
        .from('payment_method')
        .insert({
          name_en: 'Default Payment',
          name_ru: 'Оплата по умолчанию',
          active: true
        })
        .select('id_payment_method')
        .single()
      
      if (createPmError) {
        const { data: anyPaymentMethod } = await supabase
          .from('payment_method')
          .select('id_payment_method')
          .limit(1)
          .maybeSingle()
        
        if (anyPaymentMethod?.id_payment_method) {
          paymentMethodId = anyPaymentMethod.id_payment_method
        } else {
          throw new Error('No payment method found and could not create one')
        }
      } else {
        paymentMethodId = newPaymentMethod.id_payment_method
      }
    }

    let orderStatusId = null
    const { data: orderStatuses } = await supabase
      .from('order_status')
      .select('id_order_status')
      .limit(1)
      .maybeSingle()
    
    if (orderStatuses?.id_order_status) {
      orderStatusId = orderStatuses.id_order_status
    } else {
      const { data: newOrderStatus, error: createStatusError } = await supabase
        .from('order_status')
        .insert({
          name_en: 'In Process',
          name_ru: 'В обработке',
          active: 1
        })
        .select('id_order_status')
        .single()
      
      if (createStatusError) {
        const { data: anyOrderStatus } = await supabase
          .from('order_status')
          .select('id_order_status')
          .limit(1)
          .maybeSingle()
        
        if (anyOrderStatus?.id_order_status) {
          orderStatusId = anyOrderStatus.id_order_status
        } else {
          throw new Error('No order status found and could not create one')
        }
      } else {
        orderStatusId = newOrderStatus.id_order_status
      }
    }

    let orderLocationId = null
    const { data: orderLocations } = await supabase
      .from('order_location')
      .select('id_order_location')
      .limit(1)
      .maybeSingle()
    
    if (orderLocations?.id_order_location) {
      orderLocationId = orderLocations.id_order_location
    } else {
      const { data: newOrderLocation, error: createLocationError } = await supabase
        .from('order_location')
        .insert({
          name_en: 'Default Location',
          name_ru: 'Локация по умолчанию',
          active: true
        })
        .select('id_order_location')
        .single()
      
      if (createLocationError) {
        const { data: anyOrderLocation } = await supabase
          .from('order_location')
          .select('id_order_location')
          .limit(1)
          .maybeSingle()
        
        if (anyOrderLocation?.id_order_location) {
          orderLocationId = anyOrderLocation.id_order_location
        } else {
          throw new Error('No order location found and could not create one')
        }
      } else {
        orderLocationId = newOrderLocation.id_order_location
      }
    }

    const now = new Date()
    const { data: order, error: orderError } = await supabase
      .from('order')
      .insert({
        client: user_id,
        sum: orderData.sum || 0,
        currency: currency || 'EUR',
        id_order_status: orderStatusId, 
        id_order_location: orderLocationId, 
        "from": '', 
        "to": '', 
        datetime_start_plan: now.toISOString(), 
        id_payment_method: paymentMethodId, 
        options: JSON.stringify({
          tickets: {
            seats
          }
        }),
        create_datetime: now.toISOString()
      })
      .select()
      .single()

    if (orderError) throw orderError

    for (const [tripId, tripSeats] of Object.entries(seats)) {
      for (const seatId of Object.keys(tripSeats)) {
        const { error: ticketError } = await supabase
          .from('ticket')
          .update({
            id_order: order.id_order,
            status: 3, 
            updated_at: new Date().toISOString()
          })
          .eq('id_trip', tripId)
          .eq('id_seat', seatId)
          .is('id_order', null) 
      }
    }

    if (promocode) {
      const { data: promoData } = await supabase
        .from('promocode')
        .select('id_promocode')
        .eq('value', promocode)
        .eq('active', true)
        .single()

      if (promoData) {
        await supabase
          .from('order_prop_items_int')
          .insert({
            id_order: order.id_order,
            id_order_prop: 2, 
            value: promoData.id_promocode
          })
      }
    }

    await supabase
      .from('cart')
      .delete()
      .eq('id_user', user_id)

    return { data: order, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function getUserOrders(userId) {
  try {
    const { data, error } = await supabase
      .from('order')
      .select(`
        *,
        tickets:ticket(*)
      `)
      .eq('client', userId)
      .order('create_datetime', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function getOrderById(orderId) {
  try {
    const { data, error } = await supabase
      .from('order')
      .select(`
        *,
        tickets:ticket(*),
        client:users(*)
      `)
      .eq('id_order', orderId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function updateOrderStatus(orderId, status, additionalData = {}) {
  try {
    const updateData = {
      id_order_status: status,
      updated_at: new Date().toISOString()
    }

    if (status === 2) { 
      updateData.pay_datetime = new Date().toISOString()
    } else if (status === 6) { 
      updateData.offer_datetime = new Date().toISOString()
    } else if (status === 1) { 
      updateData.process_datetime = new Date().toISOString()
    } else if (status === 5) { 
      updateData.pending_datetime = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('order')
      .update({
        ...updateData,
        ...additionalData
      })
      .eq('id_order', orderId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}