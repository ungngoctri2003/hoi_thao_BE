// Test public endpoints
const BASE_URL = 'http://localhost:4000/api/v1/public';

async function testEndpoints() {
  console.log('Testing public endpoints...\n');

  try {
    // Test conferences endpoint
    console.log('1. Testing /public/conferences');
    const conferencesResponse = await fetch(`${BASE_URL}/conferences`);
    console.log('Status:', conferencesResponse.status);
    const conferencesData = await conferencesResponse.json();
    console.log('Response:', JSON.stringify(conferencesData, null, 2));
    console.log('---\n');

    // Test checkins endpoint
    console.log('2. Testing /public/checkins');
    const checkinsResponse = await fetch(`${BASE_URL}/checkins`);
    console.log('Status:', checkinsResponse.status);
    const checkinsData = await checkinsResponse.json();
    console.log('Response:', JSON.stringify(checkinsData, null, 2));
    console.log('---\n');

    // Test attendees search endpoint
    console.log('3. Testing /public/attendees/search?q=test&conferenceId=1');
    const searchResponse = await fetch(`${BASE_URL}/attendees/search?q=test&conferenceId=1`);
    console.log('Status:', searchResponse.status);
    const searchData = await searchResponse.json();
    console.log('Response:', JSON.stringify(searchData, null, 2));
    console.log('---\n');

    // Test validate QR endpoint
    console.log('4. Testing /public/checkins/validate-qr');
    const validateResponse = await fetch(`${BASE_URL}/checkins/validate-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qrCode: 'TEST_QR',
        conferenceId: 1
      })
    });
    console.log('Status:', validateResponse.status);
    const validateData = await validateResponse.json();
    console.log('Response:', JSON.stringify(validateData, null, 2));
    console.log('---\n');

  } catch (error) {
    console.error('Error testing endpoints:', error);
  }
}

testEndpoints();
