import { supabase } from './client'

export async function signUp({ email, phone, password, name, family, middle }) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          family,
          middle,
          phone
        }
      }
    })

    if (authError) throw authError

    if (authData.user) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }

    return { data: authData, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function signIn({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    if (data.user && email && email.trim() !== '') {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.trim())
        .maybeSingle()

      return { 
        data: { ...data, userData }, 
        error: null 
      }
    }

    return { data, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {

    return { error }
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: authError }
    }

    if (!user?.email || user.email.trim() === '') {
      return { data: { ...user, id_role: 1 }, error: null }
    }
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email.trim())
      .maybeSingle()

    if (userError) {

      return { data: { ...user, id_role: 1 }, error: null } 
    }

    return { 
      data: { ...user, ...userData }, 
      error: null 
    }
  } catch (error) {

    return { data: null, error }
  }
}

export async function updateProfile(userId, updates) {
  try {
    let realUserId = userId
    
    const isNumber = typeof userId === 'number' || (typeof userId === 'string' && /^\d+$/.test(userId))
    
    if (!isNumber) {
      const email = updates.email
      if (email && email.trim() !== '') {
        const { data: userData } = await supabase
          .from('users')
          .select('id_user')
          .eq('email', email.trim())
          .maybeSingle()
        
        if (userData?.id_user) {
          realUserId = userData.id_user
        } else {
          throw new Error('User not found by email')
        }
      } else {
        throw new Error('Invalid user ID or email')
      }
    } else {
      realUserId = typeof userId === 'number' ? userId : parseInt(userId, 10)
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id_user', realUserId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export function isAuthenticated() {
  const session = supabase.auth.session()
  return !!session
}