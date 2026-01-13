import { useQuery } from '@tanstack/react-query'
import { PHANTOM_PASSWORD, STORAGE_KEY_USER_EMAIL, STORAGE_KEY_USER_HASH, STORAGE_KEY_USER_TOKEN } from 'const'
import { getFromLocalStorage, setLocalStorage } from 'utils/common'
import { supabase } from '../supabase/client'
import { getCurrentUser, signIn, signUp, updateProfile } from '../supabase/auth'
import md5 from 'md5'

function md5Double(text) {
  return md5(md5(text))
}

const login = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {

      return false
    }
    
    if (session && session.user) {
      setLocalStorage(STORAGE_KEY_USER_EMAIL, session.user.email)
      setLocalStorage(STORAGE_KEY_USER_TOKEN, session.access_token)
      setLocalStorage(STORAGE_KEY_USER_HASH, session.refresh_token || '')
      return true
    }
    
    const savedToken = getFromLocalStorage(STORAGE_KEY_USER_TOKEN)
    if (savedToken) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        return true
      }
    }
    
    return false
  } catch (error) {

    return false
  }
}

export const useUser = () => useQuery({
  queryKey: ['user'],
  queryFn: login,
  staleTime: Infinity,
})

export async function updateUser(data) {
  try {
    const userEmail = (data.u_email || data.email || '').trim().toLowerCase()
    
    if (!userEmail || userEmail === '') {
      throw new Error('User email is required')
    }

    const findUserByEmail = async (email) => {
      const searchVariants = [
        () => supabase.from('users').select('id_user, name, family, middle, phone, email').eq('email', email).maybeSingle(),
        () => supabase.from('users').select('id_user, name, family, middle, phone, email').ilike('email', email).maybeSingle(),
        () => supabase.from('users').select('id_user, name, family, middle, phone, email').ilike('email', `%${email}%`).maybeSingle(),
      ]

      for (const searchFunc of searchVariants) {
        try {
          const { data: result, error } = await searchFunc()
          if (!error && result?.id_user) {
            if (result.email && result.email.trim().toLowerCase() === email.toLowerCase()) {
              return result
            }
          }
        } catch (e) {

        }
      }
      return null
    }

    let userData = await findUserByEmail(userEmail)
    let userId = null

    if (userData?.id_user) {
      userId = userData.id_user
    } else {
      try {
        let phoneNumber = null
        const phoneValue = data.u_phone || data.phone
        if (phoneValue) {
          const phoneStr = String(phoneValue).replace(/\D/g, '')
          if (phoneStr.length > 0) {
            phoneNumber = parseInt(phoneStr, 10)
          }
        }

        const newUserData = {
          email: userEmail.toLowerCase(),
          name: data.u_name || data.name || '',
          family: data.u_family || data.family || '',
          middle: data.u_middle || data.middle || '',
          phone: phoneNumber,
          id_role: 1, 
          active: true,
          deleted: 0,
          pwd: md5Double(PHANTOM_PASSWORD)
        }

        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert(newUserData)
          .select('id_user, name, family, middle, phone, email')
          .single()

        if (insertError) {
          if (insertError.code === '23505' || insertError.code === 'PGRST116' || 
              insertError.code === '409' ||
              insertError.message?.includes('duplicate') || 
              insertError.message?.includes('already exists') ||
              insertError.message?.includes('unique constraint')) {
            
            let retries = 5
            let found = false
            
            while (retries > 0 && !found) {
              await new Promise(resolve => setTimeout(resolve, 300))
              
              const foundUser = await findUserByEmail(userEmail)
              
              if (foundUser?.id_user) {
                userId = foundUser.id_user
                userData = foundUser
                found = true
                break
              }
              
              retries--
            }

            if (!found) {

              const { data: allUsers } = await supabase
                .from('users')
                .select('id_user, name, family, middle, phone, email')
                .limit(1000)
              
              if (allUsers && Array.isArray(allUsers)) {
                const matchedUser = allUsers.find(u => 
                  u.email && u.email.trim().toLowerCase() === userEmail.toLowerCase()
                )
                
                if (matchedUser?.id_user) {
                  userId = matchedUser.id_user
                  userData = matchedUser
                  found = true
                }
              }
            }

            if (!found) {
              throw new Error(`User with email ${userEmail} already exists but could not be retrieved. Please try again or use a different email.`)
            }
          } else {
            throw insertError
          }
        } else if (insertedUser?.id_user) {
          userId = insertedUser.id_user
          userData = insertedUser
        } else {
          throw new Error('Failed to create user in database')
        }
      } catch (createError) {

        throw new Error('Failed to create user: ' + (createError.message || 'Unknown error'))
      }
    }

    return {
      data: {
        status: 'success',
        message: 'User found or created successfully',
        user_id: userId,
        user: userData
      }
    }
  } catch (error) {

    return {
      data: {
        status: 'error',
        message: error.message || 'Failed to process user'
      }
    }
  }
}

export async function AuthUser(email = "", phone = "", auth_type = "e-mail") {
  try {
    const { data, error } = await signIn({
      email: email || phone,
      password: PHANTOM_PASSWORD
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await signUp({
          email: email || phone,
          phone: phone || '',
          password: PHANTOM_PASSWORD,
          name: '',
          family: '',
          middle: ''
        })

        if (signUpError) {
          throw signUpError
        }

        if (signUpData?.session) {
          setLocalStorage(STORAGE_KEY_USER_EMAIL, email || phone)
          setLocalStorage(STORAGE_KEY_USER_TOKEN, signUpData.session.access_token)
          setLocalStorage(STORAGE_KEY_USER_HASH, signUpData.session.refresh_token || '')
          
          return {
            token: signUpData.session.access_token,
            u_hash: signUpData.session.refresh_token || '',
            u_id: signUpData.user?.id || ''
          }
        }
      } else {
        throw error
      }
    }

    const userEmail = email || phone
    if (!userEmail || userEmail.trim() === '') {
      throw new Error('Email or phone is required')
    }
    
    const { data: userData } = await supabase
      .from('users')
      .select('id_user')
      .eq('email', userEmail.trim())
      .maybeSingle()

    if (data?.session) {
      setLocalStorage(STORAGE_KEY_USER_EMAIL, email || phone)
      setLocalStorage(STORAGE_KEY_USER_TOKEN, data.session.access_token)
      setLocalStorage(STORAGE_KEY_USER_HASH, data.session.refresh_token || '')
    }

    return {
      token: data?.session?.access_token || '',
      u_hash: data?.session?.refresh_token || '',
      u_id: userData?.id_user || data?.user?.id || ''
    }
  } catch (error) {

    throw error
  }
}