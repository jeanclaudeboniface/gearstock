/**
 * Quick test script to verify Resend email sending works
 * 
 * Usage: node test-email.js your-email@example.com
 */

require('dotenv').config();
const { Resend } = require('resend');

const testEmail = process.argv[2];

if (!testEmail) {
  console.log('Usage: node test-email.js your-email@example.com');
  console.log('\nNote: With Resend sandbox, emails can ONLY be sent to the email');
  console.log('      address associated with your Resend account.');
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error('ERROR: RESEND_API_KEY not set in .env file');
  process.exit(1);
}

console.log('Resend Configuration:');
console.log('  API Key:', apiKey.substring(0, 10) + '...');
console.log('  From:', process.env.EMAIL_FROM || 'onboarding@resend.dev');
console.log('  To:', testEmail);
console.log('  App URL:', process.env.APP_PUBLIC_URL || 'http://localhost:5173');
console.log('');

const resend = new Resend(apiKey);

async function sendTestEmail() {
  try {
    console.log('Sending test email...');
    
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [testEmail],
      subject: '🔧 Garage Inventory - Email Test',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4f46e5;">✅ Email is Working!</h1>
          <p>This is a test email from your Garage Inventory SaaS application.</p>
          <p>Your Resend email integration is configured correctly.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            Sent at: ${new Date().toISOString()}<br/>
            From: ${process.env.EMAIL_FROM || 'onboarding@resend.dev'}
          </p>
        </div>
      `,
      text: 'Email is working! Your Resend integration is configured correctly.'
    });

    console.log('');
    console.log('✅ SUCCESS! Email sent successfully.');
    console.log('   Email ID:', result.data?.id || result.id);
    console.log('');
    console.log('Check your inbox at:', testEmail);
    
  } catch (error) {
    console.error('');
    console.error('❌ FAILED to send email:');
    console.error('   Error:', error.message);
    
    if (error.message?.includes('not verified')) {
      console.log('');
      console.log('📝 SANDBOX LIMITATION:');
      console.log('   With Resend sandbox (onboarding@resend.dev), you can ONLY');
      console.log('   send emails to the email address registered with your Resend account.');
      console.log('');
      console.log('   To send to any email, you need to:');
      console.log('   1. Add and verify a custom domain in Resend');
      console.log('   2. Update EMAIL_FROM in .env to use your verified domain');
    }
    
    process.exit(1);
  }
}

sendTestEmail();
