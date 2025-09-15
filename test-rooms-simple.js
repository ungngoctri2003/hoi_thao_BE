const axios = require('axios');

async function testRoomsAPI() {
  try {
    console.log('🔍 Đang kiểm tra API rooms...');

    // Test GET all rooms
    console.log('\n1. Testing GET /api/v1/venue/rooms...');
    const getAllResponse = await axios.get('http://localhost:4000/api/v1/venue/rooms');
    console.log('✅ GET all rooms thành công:', getAllResponse.data.data?.length || 0, 'rooms');

    // Test GET room by ID
    console.log('\n2. Testing GET /api/v1/venue/rooms/2...');
    const getByIdResponse = await axios.get('http://localhost:4000/api/v1/venue/rooms/2');
    console.log('✅ GET room by ID thành công:', getByIdResponse.data.data);
  } catch (error) {
    console.error('❌ Lỗi:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log('💡 Gợi ý: Cần token xác thực để truy cập API');
    }
  }
}

// Đợi 3 giây để server khởi động
setTimeout(testRoomsAPI, 3000);
