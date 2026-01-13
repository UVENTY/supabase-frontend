import { supabase } from './client'

/**
 * Проверить промокод
 * @param {string} value - код промокода
 * @param {number} count - количество билетов
 * @param {number} eventId - ID события (опционально)
 * @returns {Promise} - данные о промокоде (discount, schedule, count)
 */
export async function checkPromocode(value, count = 1, eventId = null) {
  try {
    const { data: promocode, error: promoError } = await supabase
      .from('promocode')
      .select('*')
      .eq('value', value)
      .eq('active', 1)
      .maybeSingle()

    if (promoError || !promocode) {
      return {
        discount: 0,
        schedule: [],
        count: 0,
        error: 'Promocode not found or inactive'
      }
    }

    if (promocode.limit) {
      const limitDate = new Date(promocode.limit)
      if (limitDate < new Date()) {
        return {
          discount: 0,
          schedule: [],
          count: 0,
          error: 'Promocode expired'
        }
      }
    }

    if (promocode.max_products && count > promocode.max_products) {
      return {
        discount: 0,
        schedule: [],
        count: 0,
        error: 'Exceeds maximum tickets limit'
      }
    }

    const { data: schedules } = await supabase
      .from('promocode_schedule')
      .select('id_schedule')
      .eq('id_promocode', promocode.id_promocode)

    const scheduleIds = schedules?.map(s => String(s.id_schedule)) || []

    if (eventId && scheduleIds.length > 0 && !scheduleIds.includes(String(eventId))) {
      return {
        discount: 0,
        schedule: scheduleIds,
        count: 0,
        error: 'Promocode not valid for this event'
      }
    }

    return {
      discount: promocode.discount || 0,
      schedule: scheduleIds,
      count: count,
      max_products: promocode.max_products,
      max_payments: promocode.max_payments
    }
  } catch (error) {return {
      discount: 0,
      schedule: [],
      count: 0,
      error: error.message
    }
  }
}