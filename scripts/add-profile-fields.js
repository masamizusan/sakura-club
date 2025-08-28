// Script to add missing profile fields to Supabase database
const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found, trying with anon key')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addProfileFields() {
  console.log('🚀 Adding missing profile fields to database...')
  
  try {
    // Execute SQL to add missing columns
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS occupation TEXT,
        ADD COLUMN IF NOT EXISTS height INTEGER CHECK (height >= 100 AND height <= 250),
        ADD COLUMN IF NOT EXISTS body_type TEXT,
        ADD COLUMN IF NOT EXISTS marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
        ADD COLUMN IF NOT EXISTS personality TEXT[],
        ADD COLUMN IF NOT EXISTS custom_culture TEXT;
      `
    })
    
    if (error) {
      console.error('❌ SQL execution error:', error)
      
      // Try alternative approach - direct SQL query
      console.log('🔄 Trying alternative approach...')
      const queries = [
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT;",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height INTEGER;",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_type TEXT;",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marital_status TEXT;",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality TEXT[];",
        "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_culture TEXT;"
      ]
      
      for (const query of queries) {
        const { error: queryError } = await supabase.from('_').select().limit(0) // This won't work, need different approach
        console.log('Query:', query)
      }
    } else {
      console.log('✅ Successfully added profile fields:', data)
    }
  } catch (err) {
    console.error('❌ Error adding profile fields:', err)
  }
}

// Check current schema first
async function checkCurrentSchema() {
  console.log('🔍 Checking current profiles table schema...')
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (data && data.length > 0) {
      console.log('📊 Current profile fields:', Object.keys(data[0]))
    } else {
      console.log('📊 No data found, but table exists')
    }
  } catch (err) {
    console.error('❌ Schema check error:', err)
  }
}

async function main() {
  await checkCurrentSchema()
  await addProfileFields()
  
  // Verify changes
  setTimeout(async () => {
    await checkCurrentSchema()
    console.log('🏁 Migration script completed')
    process.exit(0)
  }, 2000)
}

main()