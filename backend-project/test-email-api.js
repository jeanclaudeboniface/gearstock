/**
 * Test the email sending via API endpoints
 * This creates a user, tenant, and sends an invite to verify emails work
 */

const API_URL = 'http://localhost:5000/api';

async function testEmailViaAPI() {
  console.log('=== Testing Email Sending via API ===\n');
  
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'Test123!@#';
  
  try {
    // 1. Register a new user with garage
    console.log('1. Registering new user with garage:', testEmail);
    const signupRes = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        garageName: 'Email Test Garage',
        ownerName: 'Test Owner',
        email: testEmail,
        password: testPassword
      })
    });
    
    if (!signupRes.ok) {
      const err = await signupRes.json();
      throw new Error(`Signup failed: ${err.message}`);
    }
    
    const signupData = await signupRes.json();
    console.log('   ✅ User registered');
    
    const token = signupData.token;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // 2. Get the created tenant/garage
    console.log('\n2. Getting garage...');
    const tenantsRes = await fetch(`${API_URL}/tenants`, {
      headers
    });
    
    if (!tenantsRes.ok) {
      const err = await tenantsRes.json();
      throw new Error(`Get tenants failed: ${err.message}`);
    }
    
    const tenants = await tenantsRes.json();
    const tenant = tenants[0];
    console.log('   ✅ Garage:', tenant.name);
    
    const tenantId = tenant._id || tenant.id;
    
    // 3. Create an invite (this should trigger the email)
    console.log('\n3. Creating invite to samuelxanda752@gmail.com...');
    const inviteRes = await fetch(`${API_URL}/tenants/${tenantId}/invites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: 'samuelxanda752@gmail.com',
        role: 'MECHANIC'
      })
    });
    
    const inviteData = await inviteRes.json();
    
    if (!inviteRes.ok) {
      console.log('   ⚠️ Invite response:', inviteData.message);
    } else {
      console.log('   ✅ Invite created successfully!');
      console.log('   📧 Email should be sent to: samuelxanda752@gmail.com');
      console.log('   🔗 Invite link:', inviteData.invite?.inviteLink);
    }
    
    console.log('\n=== Test Complete ===');
    console.log('\n📬 Check the server console for "[EmailService] Email sent" log');
    console.log('📬 Check inbox at samuelxanda752@gmail.com for the invite email\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testEmailViaAPI();
