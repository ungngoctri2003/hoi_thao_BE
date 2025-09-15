const axios = require('axios');

async function testRoomsAPI() {
  const baseURL = 'http://localhost:4000/api/v1';

  try {
    console.log('🧪 Testing Rooms API...\n');

    // Test 1: Get all rooms
    console.log('1. Testing GET /venue/rooms...');
    try {
      const response = await axios.get(`${baseURL}/venue/rooms`);
      console.log('✅ GET rooms successful');
      console.log(`Found ${response.data.data?.length || 0} rooms`);

      if (response.data.data && response.data.data.length > 0) {
        const firstRoom = response.data.data[0];
        console.log('Sample room data:', {
          ID: firstRoom.ID,
          NAME: firstRoom.NAME,
          CAPACITY: firstRoom.CAPACITY,
          DESCRIPTION: firstRoom.DESCRIPTION,
          ROOM_TYPE: firstRoom.ROOM_TYPE,
          FEATURES: firstRoom.FEATURES,
        });
      }
    } catch (error) {
      console.log('❌ GET rooms failed:', error.response?.data || error.message);
    }

    // Test 2: Create a new room
    console.log('\n2. Testing POST /venue/floors/1/rooms...');
    try {
      const newRoomData = {
        name: 'Test Room API',
        capacity: 20,
        description: 'This is a test room created via API',
        roomType: 'meeting',
        features: ['Máy chiếu', 'Bảng trắng', 'WiFi'],
      };

      const response = await axios.post(`${baseURL}/venue/floors/1/rooms`, newRoomData);
      console.log('✅ POST room successful');
      console.log('Created room ID:', response.data.data.id);

      const roomId = response.data.data.id;

      // Test 3: Update the room
      console.log('\n3. Testing PUT /venue/rooms/' + roomId + '...');
      try {
        const updateData = {
          name: 'Updated Test Room API',
          capacity: 25,
          description: 'This room has been updated via API',
          roomType: 'conference',
          features: ['Máy chiếu', 'Hệ thống âm thanh', 'WiFi', 'Nước uống'],
        };

        const updateResponse = await axios.put(`${baseURL}/venue/rooms/${roomId}`, updateData);
        console.log('✅ PUT room successful');
        console.log('Update response:', updateResponse.data);

        // Test 4: Delete the room
        console.log('\n4. Testing DELETE /venue/rooms/' + roomId + '...');
        try {
          const deleteResponse = await axios.delete(`${baseURL}/venue/rooms/${roomId}`);
          console.log('✅ DELETE room successful');
          console.log('Delete response status:', deleteResponse.status);
        } catch (deleteError) {
          console.log('❌ DELETE room failed:', deleteError.response?.data || deleteError.message);
        }
      } catch (updateError) {
        console.log('❌ PUT room failed:', updateError.response?.data || updateError.message);
      }
    } catch (createError) {
      console.log('❌ POST room failed:', createError.response?.data || createError.message);
    }

    console.log('\n🎉 API testing completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Wait a bit for server to start
setTimeout(() => {
  testRoomsAPI();
}, 3000);
