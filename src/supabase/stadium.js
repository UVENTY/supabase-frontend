import { supabase } from './client'

export async function getStadiumById(id) {
  try {
    const { data, error } = await supabase
      .from('stadium')
      .select('*')
      .eq('id_stadium', id)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {return { data: null, error }
  }
}