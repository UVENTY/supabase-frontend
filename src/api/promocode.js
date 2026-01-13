import { checkPromocode as checkPromocodeSupabase } from '../supabase/promocode'

/**
 * Проверка промокода
 * @param {string} value - код промокода
 * @param {number} count - количество билетов
 * @param {number} eventId - ID события
 * @returns {Promise} - данные о промокоде (discount, schedule, count)
 */
export async function CheckPromocode(value, count = 1, eventId = null) {
  try {
    const response = await checkPromocodeSupabase(value, count, eventId)
    if (response.error) {
      throw new Error(response.error)
    }
    return response
  } catch (e) {return Promise.reject(e)
  }
}