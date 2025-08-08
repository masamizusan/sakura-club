const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - you'll need to set these environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function lookupProfile(searchTerm) {
  try {
    console.log(`Looking up profile for: ${searchTerm}`);
    
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        last_name,
        gender,
        age,
        nationality,
        residence,
        city,
        interests,
        bio,
        avatar_url,
        is_verified,
        membership_type,
        created_at
      `);

    // Determine search strategy based on input
    if (searchTerm.includes('@')) {
      // Search by email
      query = query.eq('email', searchTerm);
    } else if (searchTerm.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // Search by UUID
      query = query.eq('id', searchTerm);
    } else {
      // Search by name (case insensitive)
      query = query.or(`name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error looking up profile:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No profiles found matching the search criteria.');
      return;
    }

    // Display results
    console.log(`\nFound ${data.length} profile(s):\n`);
    
    data.forEach((profile, index) => {
      console.log(`--- Profile ${index + 1} ---`);
      console.log(`ID: ${profile.id}`);
      console.log(`Email: ${profile.email}`);
      console.log(`Name: ${profile.name || 'N/A'} ${profile.last_name || ''}`);
      console.log(`Gender: ${profile.gender || 'N/A'}`);
      console.log(`Age: ${profile.age || 'N/A'}`);
      console.log(`Nationality: ${profile.nationality || 'N/A'}`);
      console.log(`Location: ${profile.residence || 'N/A'}, ${profile.city || 'N/A'}`);
      console.log(`Interests: ${profile.interests ? profile.interests.join(', ') : 'N/A'}`);
      console.log(`Bio: ${profile.bio ? profile.bio.substring(0, 100) + '...' : 'N/A'}`);
      console.log(`Verified: ${profile.is_verified ? 'Yes' : 'No'}`);
      console.log(`Membership: ${profile.membership_type}`);
      console.log(`Created: ${new Date(profile.created_at).toLocaleDateString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

async function listAllProfiles() {
  try {
    console.log('Fetching all profiles...\n');
    
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        name,
        last_name,
        gender,
        age,
        nationality,
        residence,
        city,
        membership_type,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log('No profiles found in the database.');
      return;
    }

    console.log(`Total profiles: ${data.length}\n`);
    
    data.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name || 'N/A'} ${profile.last_name || ''} (${profile.email})`);
      console.log(`   Age: ${profile.age || 'N/A'}, Gender: ${profile.gender || 'N/A'}, Location: ${profile.residence || 'N/A'}`);
      console.log(`   Membership: ${profile.membership_type}, Created: ${new Date(profile.created_at).toLocaleDateString()}`);
      console.log('');
    });

  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node lookupProfile.js <search-term>  - Search for a specific profile');
    console.log('  node lookupProfile.js --all          - List all profiles');
    console.log('');
    console.log('Search examples:');
    console.log('  node lookupProfile.js user@example.com     - Search by email');
    console.log('  node lookupProfile.js John                 - Search by name');
    console.log('  node lookupProfile.js 123e4567-e89b-...   - Search by UUID');
    return;
  }

  if (args[0] === '--all') {
    await listAllProfiles();
  } else {
    await lookupProfile(args[0]);
  }
}

// Check if required environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('Warning: Supabase environment variables not found.');
  console.log('Please set:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('');
}

main().catch(console.error);