/**
 * Тест подключения к Supabase
 * Запустите: node test-supabase-connection.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://qrbjhpyiutpwmmgfzpkz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyYmpocHlpdXRwd21tZ2Z6cGt6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzQ5NzQsImV4cCI6MjA4MDg1MDk3NH0.Tl-SGeNDXSzJqdhkfrU8ohvldRfAUYn0Omn5r2Ma-y0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('🔍 Testing Supabase connection...\n')
  
  // Тест 1: Проверка таблицы schedule
  console.log('1. Testing schedule table...')
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('schedule')
    .select('id_schedule')
    .limit(1)
  
  if (scheduleError) {
    console.error('   ❌ Error:', scheduleError.message)
  } else {
    console.log('   ✅ Successfully connected to schedule table')
  }
  
  // Тест 2: Проверка таблицы users
  console.log('\n2. Testing users table...')
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id_user')
    .limit(1)
  
  if (usersError) {
    console.error('   ❌ Error:', usersError.message)
  } else {
    console.log('   ✅ Successfully connected to users table')
  }
  
  // Тест 3: Проверка таблицы ticket
  console.log('\n3. Testing ticket table...')
  const { data: ticketData, error: ticketError } = await supabase
    .from('ticket')
    .select('id_ticket')
    .limit(1)
  
  if (ticketError) {
    console.error('   ❌ Error:', ticketError.message)
  } else {
    console.log('   ✅ Successfully connected to ticket table')
  }
  
  // Тест 4: Проверка таблицы orders
  console.log('\n4. Testing orders table...')
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select('id_order')
    .limit(1)
  
  if (ordersError) {
    console.error('   ❌ Error:', ordersError.message)
  } else {
    console.log('   ✅ Successfully connected to orders table')
  }
  
  // Итог
  console.log('\n' + '='.repeat(50))
  const allTestsPassed = !scheduleError && !usersError && !ticketError && !ordersError
  if (allTestsPassed) {
    console.log('✅ All connection tests passed!')
    console.log('✅ Supabase is ready to use!')
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.')
    console.log('⚠️  Make sure you applied the migrations in Supabase Dashboard!')
  }
  console.log('='.repeat(50))
}

test().catch(console.error)

