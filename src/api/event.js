import { CURRENCY_SYMBOL_MAP } from 'const'
import { getScheduleById } from '../supabase/schedule'
import { getStadiumById } from '../supabase/stadium'

const fetchEvent = async (id) => {
  try {
    const { data: event, error: eventError } = await getScheduleById(id)

    if (eventError || !event) {
      throw new Error('Event not found')
    }

    if (!event.currency) {
      event.currency = 'EUR'
    }

    event.currencySign = CURRENCY_SYMBOL_MAP?.[event.currency] || event.currency

    if (event.stadium || event.id_stadium) {
      const stadium = event.stadium
      
      if (stadium) {
        const schemeBlob = stadium.scheme || stadium.scheme_link || ''
        
        if (schemeBlob) {
          try {
            let schemeData
            if (typeof schemeBlob === 'string') {
              const jsonString = schemeBlob.replace(/'/g, '"')
              schemeData = JSON.parse(jsonString)
            } else {
              schemeData = schemeBlob
            }

            if (schemeData) {
              event.categories = schemeData.categories || []
              event.schemeCode = schemeData.scheme || ''
            }
          } catch (parseError) {

            event.categories = []
            event.schemeCode = ''
          }
        } else {
          event.categories = []
          event.schemeCode = ''
        }
      } else if (event.id_stadium) {
        const { data: stadiumData, error: stadiumError } = await getStadiumById(event.id_stadium)

        if (!stadiumError && stadiumData) {
          const schemeBlob = stadiumData.scheme || stadiumData.scheme_link || ''
          
          if (schemeBlob) {
            try {
              let schemeData
              if (typeof schemeBlob === 'string') {
                const jsonString = schemeBlob.replace(/'/g, '"')
                schemeData = JSON.parse(jsonString)
              } else {
                schemeData = schemeBlob
              }

              if (schemeData) {
                event.categories = schemeData.categories || []
                event.schemeCode = schemeData.scheme || ''
              }
            } catch (parseError) {

              event.categories = []
              event.schemeCode = ''
            }
          } else {
            event.categories = []
            event.schemeCode = ''
          }
        }
      }
    }

    if (event.team1_table) {
      event.team1 = event.team1_table
      delete event.team1_table
    }
    if (event.team2_table) {
      event.team2 = event.team2_table
      delete event.team2_table
    }

    return event
  } catch (error) {

    throw error
  }
}

export const getEventQuery = (id, options) => ({
  queryKey: ['event', id],
  queryFn: () => fetchEvent(id),
  staleTime: 5 * 60 * 1000,
  retry: 0,
  ...options
})