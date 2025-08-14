const API_BASE = 'http://localhost:5000';

async function getAuthToken() {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.token;
    }
  } catch (error) {
    console.log('Login failed');
  }
  return null;
}

async function getCheckedInGuests(token) {
  try {
    const response = await fetch(`${API_BASE}/api/guests/checked-in`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
  } catch (error) {
    console.log('Failed to fetch guests');
  }
  return [];
}

async function checkoutGuest(token, guestId) {
  try {
    const response = await fetch(`${API_BASE}/api/guests/checkout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id: guestId })
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function cleanupDuplicates() {
  console.log('🔍 Starting duplicate cleanup...');
  
  const token = await getAuthToken();
  if (!token) {
    console.log('❌ Authentication failed');
    return;
  }
  
  const guests = await getCheckedInGuests(token);
  console.log(`📊 Found ${guests.length} checked-in guests`);
  
  // Group guests by capsule and name to find duplicates
  const grouped = {};
  guests.forEach(guest => {
    const key = `${guest.capsuleNumber}-${guest.name}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(guest);
  });
  
  // Find duplicates
  const duplicates = [];
  Object.entries(grouped).forEach(([key, guestList]) => {
    if (guestList.length > 1) {
      duplicates.push({
        key,
        guests: guestList
      });
    }
  });
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }
  
  console.log(`🚨 Found ${duplicates.length} duplicate groups:`);
  
  // Clean up duplicates - keep the first one, checkout the rest
  let cleaned = 0;
  for (const duplicate of duplicates) {
    console.log(`\n📝 Duplicate group: ${duplicate.key}`);
    console.log(`   Keeping: ${duplicate.guests[0].name} (ID: ${duplicate.guests[0].id})`);
    
    // Checkout all duplicates except the first one
    for (let i = 1; i < duplicate.guests.length; i++) {
      const guest = duplicate.guests[i];
      console.log(`   Checking out: ${guest.name} (ID: ${guest.id})`);
      
      const success = await checkoutGuest(token, guest.id);
      if (success) {
        cleaned++;
        console.log(`   ✅ Checked out successfully`);
      } else {
        console.log(`   ❌ Failed to checkout`);
      }
    }
  }
  
  console.log(`\n🎉 Cleanup complete! Checked out ${cleaned} duplicate guests`);
  console.log('💡 Tip: Delete the population scripts to prevent future duplicates');
}

// Run cleanup
cleanupDuplicates().catch(console.error);

