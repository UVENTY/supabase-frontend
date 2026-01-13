import { STORAGE_KEY_USER_EMAIL } from 'const'
import { getFromLocalStorage } from 'utils/common'
import { getCart as getCartSupabase, updateCart as updateCartSupabase, clearCart as clearCartSupabase, moveCart as moveCartSupabase } from '../supabase/cart'
import { supabase } from '../supabase/client'

export const getCartQuery = options => ({
  queryKey: ['cart', getFromLocalStorage(STORAGE_KEY_USER_EMAIL)],
  queryFn: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session || !session.user) {
      return { data: { cart: [] } }
    }

    const user = session.user
    
    let userId = null
    
    if (user?.email && user.email.trim() !== '') {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('id_user')
          .eq('email', user.email.trim())
          .maybeSingle()
        
        if (userData?.id_user) {
          userId = userData.id_user
        }
      } catch (userError) {

        return { data: { cart: [] } }
      }
    }
    
    if (!userId) {
      return { data: { cart: [] } }
    }

    const { data, error } = await getCartSupabase(userId)
    
    if (error) {

      return { data: { cart: [] } }
    }

    return data
  },
  select: ({ data }) => (data.cart || []).map(item => {
    const [hall_id, category, row, seat] = item.prop?.split(';')
    return {
      hall_id,
      category,
      row,
      seat,
      inCart: true,
      booking_limit: item.booking_limit
    }
  }),
  ...options,
})

export async function updateCart(item, count) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session || !session.user) {
      return { data: { status: 'error', error: 'User not authenticated' } }
    }

    const user = session.user
    
    if (!user?.email) {
      return { data: { status: 'error', error: 'User email not found' } }
    }
    
    let userId = null
    
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id_user')
        .eq('email', user.email)
        .maybeSingle()
      
      if (!userData?.id_user) {
        return { data: { status: 'error', error: 'User not found in database' } }
      }
      
      userId = userData.id_user
    } catch (userError) {

      return { data: { status: 'error', error: 'Failed to get user id' } }
    }

    const result = await updateCartSupabase(userId, item, count)
    return { data: result.data || { status: 'success' } }
  } catch (error) {

    return { data: { status: 'error', error: error.message } }
  }
}

export async function moveCart(token, u_hash, u_id) {
  try {
    return { data: { status: 'success' } }
  } catch (error) {

    throw error
  }
}

export async function clearCart(items) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session || !session.user) {
      return { data: { status: 'success' } }
    }

    const user = session.user
    
    if (!user?.email) {
      return { data: { status: 'success' } }
    }
    
    let userId = null
    
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('id_user')
        .eq('email', user.email)
        .maybeSingle()
      
      if (!userData?.id_user) {
        return { data: { status: 'success' } }
      }
      
      userId = userData.id_user
    } catch (userError) {

      return { data: { status: 'success' } }
    }

    const result = await clearCartSupabase(userId, items)
    return { data: result.data || { status: 'success' } }
  } catch (error) {

    return { data: { status: 'error', error: error.message } }
  }
}