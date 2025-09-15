const fetch = require('node-fetch');

async function testAPIStatus() {
  try {
    console.log('Testing API with status...');

    // Test creating a room with status
    const createData = {
      name: 'Test Room with Status',
      capacity: 50,
      description: 'Test description',
      roomType: 'meeting',
      features: ['WiFi', 'Projector'],
      status: 'maintenance',
    };

    console.log('Creating room with status:', createData.status);

    const createResponse = await fetch('http://localhost:4000/api/v1/venue/floors/1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_TOKEN_HERE', // You'll need to replace this
      },
      body: JSON.stringify(createData),
    });

    if (createResponse.ok) {
      const createResult = await createResponse.json();
      console.log('✅ Room created successfully:', createResult);

      // Test updating the room status
      const updateData = {
        name: 'Test Room with Status',
        capacity: 50,
        description: 'Test description',
        roomType: 'meeting',
        features: ['WiFi', 'Projector'],
        status: 'available',
      };

      console.log('Updating room status to:', updateData.status);

      const updateResponse = await fetch(
        `http://localhost:4000/api/v1/venue/rooms/${createResult.data.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer YOUR_TOKEN_HERE', // You'll need to replace this
          },
          body: JSON.stringify(updateData),
        }
      );

      if (updateResponse.ok) {
        console.log('✅ Room updated successfully');
      } else {
        console.log('❌ Failed to update room:', await updateResponse.text());
      }
    } else {
      console.log('❌ Failed to create room:', await createResponse.text());
    }
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testAPIStatus();
