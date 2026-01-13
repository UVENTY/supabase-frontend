import { supabase } from './client'

export async function getConfig() {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('*')
      .maybeSingle()

    if (error) {

      return {
        data: {
          default_country: 'US',
          default_currency: 'EUR',
          default_lang: 'en'
        },
        error: null
      }
    }

    return { data: data || {
      default_country: 'US',
      default_currency: 'EUR',
      default_lang: 'en'
    }, error: null }
  } catch (error) {

    return {
      data: {
        default_country: 'US',
        default_currency: 'EUR',
        default_lang: 'en'
      },
      error: null
    }
  }
}