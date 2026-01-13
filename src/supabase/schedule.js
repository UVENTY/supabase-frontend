import { supabase } from './client'

export async function getSchedules(filters = {}) {
  try {
    let query = supabase
      .from('schedule')
      .select('*')
      .eq('active', true)
      .gte('start_datetime', new Date().toISOString())
      .order('start_datetime', { ascending: true })

    if (filters.stadium) {
      query = query.eq('id_stadium', filters.stadium)
    }
    if (filters.tournament) {
      query = query.eq('id_tournament', filters.tournament)
    }

    const { data: schedules, error } = await query

    if (error) throw error

    if (!schedules || schedules.length === 0) {
      return { data: [], error: null }
    }

    const teamIds = [...new Set(schedules.map(s => [s.team1, s.team2]).flat().filter(Boolean))]
    const stadiumIds = [...new Set(schedules.map(s => s.id_stadium).filter(Boolean))]
    const tournamentIds = [...new Set(schedules.map(s => s.id_tournament).filter(Boolean))]

    const [teamsResult, stadiumsResult, tournamentsResult] = await Promise.all([
      teamIds.length > 0 ? supabase.from('team').select('*').in('id_team', teamIds) : Promise.resolve({ data: [] }),
      stadiumIds.length > 0 ? supabase.from('stadium').select('*').in('id_stadium', stadiumIds) : Promise.resolve({ data: [] }),
      tournamentIds.length > 0 ? supabase.from('tournament').select('*').in('id_tournament', tournamentIds) : Promise.resolve({ data: [] })
    ])

    const teamsMap = new Map((teamsResult.data || []).map(t => [t.id_team, t]))
    const stadiumsMap = new Map((stadiumsResult.data || []).map(s => [s.id_stadium, s]))
    const tournamentsMap = new Map((tournamentsResult.data || []).map(t => [t.id_tournament, t]))

    const processedData = schedules.map(item => ({
      ...item,
      team1: item.team1 ? teamsMap.get(item.team1) : null,
      team2: item.team2 ? teamsMap.get(item.team2) : null,
      stadium: item.id_stadium ? stadiumsMap.get(item.id_stadium) : null,
      tournament: item.id_tournament ? tournamentsMap.get(item.id_tournament) : null,
      datetime: item.start_datetime?.split('+')[0] || item.start_datetime
    }))

    return { data: processedData, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function getScheduleById(id) {
  try {
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedule')
      .select(`
        *,
        team1_table:team!team1(name_en, name_ru),
        team2_table:team!team2(name_en, name_ru),
        stadium(name_en, name_ru, scheme, scheme_link),
        tournament(name_en, name_ru)
      `)
      .eq('id_schedule', id)
      .single()

    if (scheduleError) throw scheduleError

    if (!schedule) {
      return { data: null, error: { message: 'Schedule not found' } }
    }

    const data = {
      ...schedule,
      team1: schedule.team1_table || schedule.team1,
      team2: schedule.team2_table || schedule.team2,
      datetime: schedule.start_datetime?.split('+')[0] || schedule.start_datetime
    }

    delete data.team1_table
    delete data.team2_table

    return { data, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function createSchedule(scheduleData) {
  try {
    if (!scheduleData.team1 || !scheduleData.team2) {
      throw new Error('Team1 and Team2 are required')
    }

    const { data, error } = await supabase
      .from('schedule')
      .insert({
        team1: scheduleData.team1,
        team2: scheduleData.team2,
        id_stadium: scheduleData.stadium,
        id_tournament: scheduleData.tournament,
        start_datetime: scheduleData.datetime,
        duration: scheduleData.duration,
        only_date: scheduleData.only_date || false,
        top: scheduleData.top || false,
        time_zone: scheduleData.time_zone || '+03:00',
        currency: scheduleData.currency,
        stripe_account: scheduleData.stripe_account,
        active: true,
        options: scheduleData.options || {}
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function updateSchedule(id, updates) {
  try {
    const { data, error } = await supabase
      .from('schedule')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id_schedule', id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {

    return { data: null, error }
  }
}

export async function deleteSchedule(id) {
  try {
    const { data, error } = await supabase
      .from('schedule')
      .update({ active: false })
      .eq('id_schedule', id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {

    return { data: null, error }
  }
}