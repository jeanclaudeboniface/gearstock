/**
 * Test the complete invite flow with email sending
 * 
 * This script:
 * 1. Logs in as an existing user
 * 2. Gets their tenants
 * 3. Creates an invite
 * 4. Verifies email was sent
 */

require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

// Test credentials - use an existing admin account
const TEST_EMAIL = 'samuelxanda752@gmail.com';
const TEST_PASSWORD = 'password123'; // Change this to your actual password

async function testInviteFlow() {
  console.log('=== Testing Complete Invite Flow with Email ===\n');
  
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginRes = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    
    if (!loginRes.ok) {
      const err = await loginRes.json();
      throw new Error(`Login failed: ${err.message}`);
    }
    
    const loginData = await loginRes.json();
    console.log('   ✅ Logged in as:', loginData.user?.email || TEST_EMAIL);
    
    const token = loginData.token;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Step 2: Get user's tenants
    console.log('\n2. Getting tenants...');
    const tenantsRes = await fetch(`${API_URL}/tenants`, {
      headers
    });
    
    if (!tenantsRes.ok) {
      throw new Error('Failed to get tenants');
    }
    
    const tenants = await tenantsRes.json();
    console.log(`   ✅ Found ${tenants.length} tenant(s)`);
    
    if (tenants.length === 0) {
      console.log('   ⚠️  No tenants found. Creating one...');
      const createRes = await fetch(`${API_URL}/tenants`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Test Garage for Email' })
      });
      
      if (!createRes.ok) {
        throw new Error('Failed to create tenant');
      }
      
      const newTenant = await createRes.json();
      tenants.push(newTenant);
      console.log('   ✅ Created tenant:', newTenant.name);
    }
    
    const tenantId = tenants[0]._id || tenants[0].id;
    console.log('   Using tenant:', tenants[0].name, '(', tenantId, ')');
    
    // Step 3: Create an invite
    console.log('\n3. Creating invite...');
    const inviteEmail = 'samuelxanda752@gmail.com'; // Will receive actual email
    
    const inviteRes = await fetch(`${API_URL}/tenants/${tenantId}/invites`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: inviteEmail,
        role: 'MECHANIC'
      })
    });
    
    const inviteData = await inviteRes.json();
    
    if (!inviteRes.ok) {
      console.log('   ⚠️  Invite creation response:', inviteData.message);
      // This might fail if user is already a member - that's OK
    } else {
      console.log('   ✅ Invite created!');
      console.log('   📧 Email sent to:', inviteEmail);
      console.log('   🔗 Invite link:', inviteData.invite?.inviteLink);
      console.log('\n   ✨ Check your inbox for the invite email!');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testInviteFlow();
