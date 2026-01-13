import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Spin } from 'antd'
import { supabase } from '../../supabase/client'

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1] 
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function generateTicketPDFFromTemplate(ticketData, html2pdf) {
  const pdfTemplate = ticketData.schedule?.pdf_template || ''
  
  let qrCodeBase64 = ticketData.code_qr_base64 || ''
  
  let format = 'a4'
  let margins = [3, 3, 3, 3]
  
  if (pdfTemplate && pdfTemplate.trim()) {
    pdfTemplate.replace(/<!--format:([^>]+)-->/i, (match, formatStr) => {
      const formatParts = formatStr.trim().split(/\s*,\s*/)
      if (formatParts.length === 2) {
        format = [parseFloat(formatParts[0]), parseFloat(formatParts[1])]
      } else {
        format = formatParts[0]
      }
      return ''
    })
    
    pdfTemplate.replace(/<!--margins:([^>]+)-->/i, (match, marginsStr) => {
      const marginsParts = marginsStr.trim().split(/\s*,\s*/).map(m => parseFloat(m))
      if (marginsParts.length === 1) {
        margins = [marginsParts[0], marginsParts[0], marginsParts[0], marginsParts[0]]
      } else if (marginsParts.length === 2) {
        margins = [marginsParts[0], marginsParts[1], marginsParts[0], marginsParts[1]]
      } else if (marginsParts.length === 3) {
        margins = [marginsParts[0], marginsParts[1], marginsParts[2], marginsParts[1]]
      } else {
        margins = marginsParts
      }
      return ''
    })
  }
  
  if (pdfTemplate && pdfTemplate.trim()) {
    try {
      const schedule = ticketData.schedule || {}
      const team1Name = schedule.team1?.name_en || schedule.team1_table?.name_en || ''
      const team2Name = schedule.team2?.name_en || schedule.team2_table?.name_en || ''
      const eventName = (team1Name && team2Name) 
        ? `${team1Name} vs ${team2Name}` 
        : schedule.name || schedule.title || 'Event'
      
      const eventDate = schedule.start_datetime 
        ? (() => {
            const date = new Date(schedule.start_datetime)
            const year = date.getUTCFullYear()
            const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
            const day = date.getUTCDate()
            const hours = date.getUTCHours()
            const minutes = date.getUTCMinutes()
            const ampm = hours >= 12 ? 'PM' : 'AM'
            const hours12 = hours % 12 || 12
            const minutesStr = minutes.toString().padStart(2, '0')
            return `${month} ${day}, ${year} at ${hours12}:${minutesStr} ${ampm}`
          })()
        : ''
      
      const section = String(ticketData.section || ticketData.block || '')
      const row = String(ticketData.row || '')
      const seat = String(ticketData.seat || '')
      const code = String(ticketData.code || '')
      const price = String(ticketData.tariff || ticketData.price || 0)
      const currency = String(ticketData.currency || 'USD')
      
      let htmlContent = pdfTemplate
        .replace(/\{event_name\}/g, eventName)
        .replace(/\{event_date\}/g, eventDate)
        .replace(/\{code\}/g, code)
        .replace(/\{section\}/g, section)
        .replace(/\{row\}/g, row)
        .replace(/\{seat\}/g, seat)
        .replace(/\{price\}/g, price)
        .replace(/\{currency\}/g, currency)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,code_qr_base64;val\}/g, qrCodeBase64 || '')
        .replace(/\{\$ticket\}\{\*,schedule,\*,str\}/g, eventName ? `${eventName}, ${eventDate}` : eventDate)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,block;val\}/g, section)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,row;val\}/g, row)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,seat;val\}/g, seat)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,code;val\}/g, code)
        .replace(/\{\$ticket\}\{\*,trips,\*,seats,\*,price;val\}/g, price)
      
      if (qrCodeBase64) {
        htmlContent = htmlContent.replace(/src="\{[^}]+\}"/g, `src="${qrCodeBase64}"`)
        htmlContent = htmlContent.replace(/src='\{[^}]+\}'/g, `src='${qrCodeBase64}'`)
      }
      
      htmlContent = htmlContent.replace(/>Event</gi, `>${eventName}<`)
      
      htmlContent = htmlContent.replace(/(row[^>]*>)\s*NONE\s*(<\/td>)/gi, `$1${row}$2`)
      htmlContent = htmlContent.replace(/(seat[^>]*>)\s*NONE\s*(<\/td>)/gi, `$1${seat}$2`)
      
      let parsedFormat = format
      htmlContent = htmlContent.replace(/<!--format:([^>]+)-->/i, (match, formatStr) => {
        const formatParts = formatStr.trim().split(/\s*,\s*/)
        if (formatParts.length === 2) {
          parsedFormat = [parseFloat(formatParts[0]), parseFloat(formatParts[1])]
        } else {
          parsedFormat = formatParts[0]
        }
        return ''
      })
      
      htmlContent = htmlContent.replace(/<!--margins:([^>]+)-->/i, (match, marginsStr) => {
        const marginsParts = marginsStr.trim().split(/\s*,\s*/).map(m => parseFloat(m))
        if (marginsParts.length === 1) {
          margins = [marginsParts[0], marginsParts[0], marginsParts[0], marginsParts[0]]
        } else if (marginsParts.length === 2) {
          margins = [marginsParts[0], marginsParts[1], marginsParts[0], marginsParts[1]]
        } else if (marginsParts.length === 3) {
          margins = [marginsParts[0], marginsParts[1], marginsParts[2], marginsParts[1]]
        } else {
          margins = marginsParts
        }
        return ''
      })
      
      htmlContent = htmlContent.replace(/<page>/gi, '<div class="pdf-page">')
      htmlContent = htmlContent.replace(/<\/page>/gi, '</div>')
      
      htmlContent = htmlContent.replace(/\{\$ticket;foreach;[\s\S]*?\}/gi, '')
      htmlContent = htmlContent.replace(/\{\$this_seat;foreach;[\s\S]*?\}/gi, '')
      htmlContent = htmlContent.replace(/\{\$this_seat\}\{[\s\S]*?\}/gi, '')
      htmlContent = htmlContent.replace(/\{\$ticket\}\{[^}]*trips[^}]*\}/gi, '')
      htmlContent = htmlContent.replace(/,\s*trips,\s*/gi, '')
      htmlContent = htmlContent.replace(/,\s*seats,\s*/gi, '')
      htmlContent = htmlContent.replace(/\{sc_id_i;val\}/gi, '')
      htmlContent = htmlContent.replace(/\{t_id_i;val\}/gi, '')
      htmlContent = htmlContent.replace(/\{seat_i;val\}/gi, '')
      htmlContent = htmlContent.replace(/\{\$ticket\}[\s\S]*?\{[^}]*;val\}[^}]*\}/gi, '')
      htmlContent = htmlContent.replace(/\n\s*\n\s*\n/g, '\n\n')
      
      htmlContent = htmlContent.replace(/[`]{2,}/g, '')
      htmlContent = htmlContent.replace(/[`;{}\\]{3,}/g, '')
      htmlContent = htmlContent.replace(/^\s*[`;{}\\]+\s*/gm, '')
      htmlContent = htmlContent.replace(/\s*[`;{}\\]+\s*$/gm, '')
      htmlContent = htmlContent.replace(/^[^<]*[`;{}\\]+\s*/m, '')
      htmlContent = htmlContent.replace(/>\s*[`;{}\\]+\s*</g, '><')
      
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = htmlContent
      document.body.appendChild(tempDiv)
      
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const images = tempDiv.querySelectorAll('img')
      
      if (images.length > 0) {
        await new Promise((resolve) => {
          let loaded = 0
          const total = images.length
          const maxWait = 5000
          const startTime = Date.now()
          
          images.forEach((img) => {
            if (img.complete && img.naturalWidth > 0) {
              loaded++
            } else {
              img.onload = () => {
                loaded++
              }
              img.onerror = () => {
                loaded++
              }
            }
          })
          
          const checkComplete = () => {
            if (loaded >= total) {
              resolve()
            } else if (Date.now() - startTime > maxWait) {
              resolve() 
            } else {
              setTimeout(checkComplete, 100)
            }
          }
          checkComplete()
        })
      }
      
      const rect = tempDiv.getBoundingClientRect()
      
      const opt = {
        margin: margins,
        filename: `ticket_${ticketData.code || 'ticket'}.pdf`,
        image: { type: 'jpeg', quality: 0.85 },
        html2canvas: { 
          scale: 1.5, 
          useCORS: true, 
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 0 
        },
        jsPDF: { 
          unit: 'mm', 
          format: parsedFormat, 
          orientation: 'portrait',
          compress: true 
        }
      }
      
      const pdfBlob = await html2pdf().set(opt).from(tempDiv).outputPdf('blob')
      
      document.body.removeChild(tempDiv)
      
      return pdfBlob
      
    } catch (error) {
      throw error
    }
  }
  
  throw new Error('PDF template is required')
}

async function generateTicketPDF(ticketData, jsPDF, html2pdf) {
  const pdfTemplate = ticketData.schedule?.pdf_template || ''
  
  let qrCodeBase64 = ticketData.code_qr_base64 || ''
  
  if (pdfTemplate && pdfTemplate.trim() && html2pdf) {
    try {
      const schedule = ticketData.schedule || {}
      const team1Name = schedule.team1?.name_en || schedule.team1_table?.name_en || ''
      const team2Name = schedule.team2?.name_en || schedule.team2_table?.name_en || ''
      const eventName = (team1Name && team2Name) 
        ? `${team1Name} vs ${team2Name}` 
        : schedule.name || 'Event'
      
      const eventDate = schedule.start_datetime 
        ? new Date(schedule.start_datetime).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : ''
      
      let htmlContent = pdfTemplate
        .replace(/\{event_name\}/g, eventName)
        .replace(/\{event_date\}/g, eventDate)
        .replace(/\{code\}/g, String(ticketData.code || ''))
        .replace(/\{section\}/g, String(ticketData.section || ''))
        .replace(/\{row\}/g, String(ticketData.row || ''))
        .replace(/\{seat\}/g, String(ticketData.seat || ''))
        .replace(/\{price\}/g, String(ticketData.tariff || ticketData.price || 0))
        .replace(/\{currency\}/g, String(ticketData.currency || 'USD'))
      
      if (qrCodeBase64 && !htmlContent.includes('<img') && !htmlContent.includes('qr') && !htmlContent.includes('QR')) {
        const qrImageHtml = `<div style="text-align: center; margin: 20px 0;">
          <img src="${qrCodeBase64}" alt="QR Code" style="max-width: 150px; height: auto;" />
        </div>`
        htmlContent = htmlContent.replace(/(<\/div>\s*<\/page>|<\/div>\s*$)/, qrImageHtml + '$1')
      } else if (qrCodeBase64) {
        htmlContent = htmlContent.replace(/\{qr_code\}/g, qrCodeBase64)
        htmlContent = htmlContent.replace(/\{qr\}/g, qrCodeBase64)
      }
      
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.width = '210mm' 
      tempDiv.innerHTML = htmlContent
      document.body.appendChild(tempDiv)
      
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `ticket_${ticketData.code || 'ticket'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }
      
      const pdfBlob = await html2pdf().set(opt).from(tempDiv).outputPdf('blob')
      
      document.body.removeChild(tempDiv)
      
      return pdfBlob
      
    } catch (error) {

    }
  }
  
  let qrCodeData = qrCodeBase64 || ''
  if (qrCodeData && qrCodeData.startsWith('data:image')) {
    qrCodeData = qrCodeData.split(',')[1] || qrCodeData
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = margin + 15

  const eventSchedule = ticketData.schedule || {}
  const team1Name = eventSchedule.team1?.name_en || ''
  const team2Name = eventSchedule.team2?.name_en || ''
  const eventName = (team1Name && team2Name) 
    ? `${team1Name} vs ${team2Name}` 
    : 'Event'
  
  const eventDate = eventSchedule.start_datetime 
    ? new Date(eventSchedule.start_datetime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Date TBD'

  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Event Ticket', pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  doc.setFontSize(16)
  doc.setFont('helvetica', 'normal')
  doc.text(eventName.substring(0, 60), pageWidth / 2, yPos, { align: 'center', maxWidth: pageWidth - margin * 2 })
  yPos += 10

  doc.setFontSize(12)
  doc.text(eventDate.substring(0, 40), pageWidth / 2, yPos, { align: 'center' })
  yPos += 15

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  
  const section = String(ticketData.section || '')
  const row = String(ticketData.row || '')
  const seat = String(ticketData.seat || '')
  const price = String(ticketData.tariff || 0)
  const currency = String(ticketData.currency || 'USD')
  const code = String(ticketData.code || '')

  doc.setFont('helvetica', 'bold')
  doc.text('Section:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(section, margin + 35, yPos)
  yPos += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Row:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(row, margin + 35, yPos)
  yPos += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Seat:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(seat, margin + 35, yPos)
  yPos += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Price:', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.text(`${price} ${currency}`, margin + 35, yPos)
  yPos += 10

  if (code) {
    doc.setFont('helvetica', 'bold')
    doc.text('Ticket Code:', margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(code, margin + 35, yPos)
    doc.setFontSize(14)
    yPos += 10
  }

  if (qrCodeData) {
    try {
      const qrSize = 50
      const qrX = (pageWidth - qrSize) / 2
      const qrY = yPos + 20
      doc.addImage(qrCodeData, 'PNG', qrX, qrY, qrSize, qrSize)
    } catch (error) {

    }
  }


  const pdfBlob = doc.output('blob')
  return pdfBlob
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!orderId) {
        window.location.href = 'https://uventy.com'
        return
      }

      try {
        const { data: paymentStatusData, error: paymentStatusError } = await supabase.functions.invoke(
          'check-stripe-session',
          {
            body: { order_id: orderId }
          }
        )

        if (paymentStatusError) {
          window.location.href = 'https://uventy.com'
          return
        }

        const { payment_status, session_status, success, error: statusError } = paymentStatusData || {}

        if (!success || payment_status !== 'paid' || session_status !== 'complete') {
          if (payment_status === 'expired' || session_status === 'expired' || statusError === 'Session not found or expired') {
            await supabase
              .from('ticket')
              .update({ 
                id_order: null,
                status: 1 
              })
              .eq('id_order', orderId)

            window.location.href = 'https://uventy.com'
            return
          }
          
          if (payment_status === 'unpaid') {
            await supabase
              .from('ticket')
              .update({ 
                id_order: null,
                status: 1 
              })
              .eq('id_order', orderId)

            window.location.href = 'https://uventy.com'
            return
          }
          
          window.location.href = 'https://uventy.com'
          return
        }

        await supabase
          .from('stripe_orders')
          .update({ 
            order_status: 'succeeded'
          })
          .eq('order_id', orderId)

        await supabase
          .from('order')
          .update({ 
            id_order_status: 2,
            pay_datetime: new Date().toISOString()
          })
          .eq('id_order', orderId)

        await supabase
          .from('ticket')
          .update({ status: 3 }) 
          .eq('id_order', orderId)

        const { data: ticketsData, error: ticketsError } = await supabase
          .from('ticket')
          .select(`
            id_schedule,
            id_seat,
            code,
            code_qr_base64,
            section,
            row,
            seat,
            tariff,
            currency,
            schedule:schedule!inner(
              id_schedule,
              team1_table:team!team1(name_en),
              team2_table:team!team2(name_en),
              start_datetime,
              email_subject,
              email_body,
              pdf_template
            )
          `)
          .eq('id_order', orderId)

        if (ticketsError || !ticketsData || ticketsData.length === 0) {
          throw new Error('Tickets not found')
        }

        const processedTickets = ticketsData.map(ticket => {
          if (ticket.schedule) {
            return {
              ...ticket,
              schedule: {
                ...ticket.schedule,
                team1: ticket.schedule.team1_table || ticket.schedule.team1,
                team2: ticket.schedule.team2_table || ticket.schedule.team2
              }
            }
          }
          return ticket
        })

        try {
          if (!window.html2pdf) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script')
              script.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.12.1/dist/html2pdf.bundle.min.js'
              script.onload = () => {
                setTimeout(() => resolve(), 100)
              }
              script.onerror = () => reject(new Error('Failed to load html2pdf.js from CDN'))
              document.head.appendChild(script)
            })
          }
          
          if (!window.html2pdf) {
            throw new Error('html2pdf.js не загружен!')
          }
          
          const html2pdf = window.html2pdf
          
          const pdfsBase64 = []
          for (const ticket of processedTickets) {
            try {
              const pdfBlob = await generateTicketPDFFromTemplate(ticket, html2pdf)
              
              if (pdfBlob.size < 10000) {
                throw new Error(`PDF too small: ${pdfBlob.size} bytes`)
              }
              
              const base64 = await blobToBase64(pdfBlob)
              
              if (!base64 || base64.length < 100) {
                throw new Error(`Base64 too short: ${base64?.length || 0} chars`)
              }
              
              pdfsBase64.push(base64)
            } catch (error) {

            }
          }

          if (pdfsBase64.length > 0) {

            await supabase.functions.invoke(
              'send-ticket-email',
              {
                body: { 
                  order_id: orderId,
                  pdfs_base64: pdfsBase64
                }
              }
            )
          }
          
          window.location.href = 'https://uventy.com/congratulations'
        } catch (error) {
          window.location.href = 'https://uventy.com/congratulations'
        }

      } catch (error) {
        window.location.href = 'https://uventy.com'
      }
    }

    checkPaymentStatus()
  }, [orderId])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" />
      <div style={{ marginLeft: 16 }}>Checking payment status...</div>
    </div>
  )
}

export default PaymentSuccess