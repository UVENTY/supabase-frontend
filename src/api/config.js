import { getConfig as getConfigSupabase } from '../supabase/config'

export const getConfigQuery = (options) => ({
  queryKey: ['config'],
  queryFn: async () => {
    const { data, error } = await getConfigSupabase()
    if (error) throw error
    return data
  },
  select: (data) => ({
    country: data.default_country,
    currency: data.default_currency,
    lang: data.default_lang
  }),
  staleTime: Infinity,
  ...options
})