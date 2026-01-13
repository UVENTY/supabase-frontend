import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Spin } from 'antd'
import { supabase } from '../../supabase/client'

const PaymentCancel = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')

  useEffect(() => {
    const freeTickets = async () => {
      if (!orderId) {
        window.location.href = '/'
        return
      }

      try {
        await supabase
          .from('ticket')
          .update({ 
            id_order: null,
            status: 1 
          })
          .eq('id_order', orderId)

        await supabase
          .from('stripe_orders')
          .update({ 
            order_status: 'canceled'
          })
          .eq('order_id', orderId)

      } catch (error) {
      } finally {
        window.location.href = '/'
      }
    }

    freeTickets()
  }, [orderId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" />
      <div style={{ marginTop: 16, color: '#fff' }}>Payment cancellation</div>
    </div>
  )
}

export default PaymentCancel