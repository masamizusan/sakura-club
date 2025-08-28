// Test script to check current database schema
const { createClient } = require('@supabase/supabase-js')

// Direct environment variables
const supabaseUrl = 'https://zrdzyeghrubeaafbkjtr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyZHp5ZWdocnViZWFhZmJqaXIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxMjUzMzMwMywiZXhwIjoyMDI4MTA5MzAzfQ._JNdJZUJ1vAYfWSZ2WrBK94UdLPvaWsWxzt-KZGsT5I'

console.log('🔗 Supabase URL:', supabaseUrl ? 'Set' : 'Not set')
console.log('🔑 Supabase Key:', supabaseKey ? 'Set' : 'Not set')

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  try {
    console.log('🔍 Fetching sample profile data...')
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('📊 Available fields in profiles table:')
      const fields = Object.keys(data[0])
      fields.forEach(field => {
        const value = data[0][field]
        console.log(`  - ${field}: ${typeof value} (${value === null ? 'NULL' : 'has value'})`)
      })
      
      console.log('\n🔍 Checking for missing optional fields:')
      const optionalFields = ['occupation', 'height', 'body_type', 'marital_status', 'personality', 'custom_culture']
      
      optionalFields.forEach(field => {
        const exists = fields.includes(field)
        console.log(`  - ${field}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`)
      })
    } else {
      console.log('📊 No profile data found')
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

checkSchema()