const { withConn } = require('./dist/config/db.js');

async function testSimpleStatus() {
  try {
    console.log('Testing simple status query...');

    await withConn(async conn => {
      // Check if STATUS column exists and has data
      const res = await conn.execute(
        'SELECT ID, NAME, STATUS FROM ROOMS WHERE ROWNUM <= 3',
        {},
        { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
      );

      console.log('Rooms with STATUS:');
      console.log(JSON.stringify(res.rows, null, 2));

      // Update one room's status
      if (res.rows && res.rows.length > 0) {
        const roomId = res.rows[0].ID;
        console.log(`\nUpdating room ${roomId} status to 'maintenance'...`);

        await conn.execute(
          'UPDATE ROOMS SET STATUS = :status WHERE ID = :id',
          { status: 'maintenance', id: roomId },
          { autoCommit: true }
        );

        console.log('✅ Status updated successfully');

        // Check updated status
        const updatedRes = await conn.execute(
          'SELECT ID, NAME, STATUS FROM ROOMS WHERE ID = :id',
          { id: roomId },
          { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
        );

        console.log('Updated room:');
        console.log(JSON.stringify(updatedRes.rows[0], null, 2));
      }
    });
  } catch (error) {
    console.error('Error testing status:', error.message);
  }
}

testSimpleStatus();
