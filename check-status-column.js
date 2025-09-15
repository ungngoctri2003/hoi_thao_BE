const { withConn } = require('./dist/config/db.js');

async function checkStatusColumn() {
  try {
    console.log('Checking STATUS column in ROOMS table...');

    await withConn(async conn => {
      // Check if STATUS column exists
      const res = await conn.execute(
        "SELECT COLUMN_NAME FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'ROOMS' AND COLUMN_NAME = 'STATUS'",
        {},
        { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
      );

      if (res.rows && res.rows.length > 0) {
        console.log('✅ STATUS column exists in ROOMS table');

        // Check current data
        const dataRes = await conn.execute(
          'SELECT ID, NAME, STATUS FROM ROOMS WHERE ROWNUM <= 3',
          {},
          { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
        );

        console.log('Current rooms data:');
        console.log(JSON.stringify(dataRes.rows, null, 2));
      } else {
        console.log('❌ STATUS column does not exist in ROOMS table');
        console.log('Adding STATUS column...');

        await conn.execute(
          "ALTER TABLE ROOMS ADD STATUS VARCHAR2(20) DEFAULT 'available'",
          {},
          { autoCommit: true }
        );

        console.log('✅ Added STATUS column to ROOMS table');

        // Update existing rooms
        await conn.execute(
          "UPDATE ROOMS SET STATUS = 'available' WHERE STATUS IS NULL",
          {},
          { autoCommit: true }
        );

        console.log('✅ Updated existing rooms with default status');
      }
    });
  } catch (error) {
    console.error('Error checking STATUS column:', error.message);
  }
}

checkStatusColumn();
