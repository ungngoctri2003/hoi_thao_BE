const { withConn } = require('./dist/config/db.js');

async function addStatusColumn() {
  try {
    console.log('Adding STATUS column to ROOMS table...');

    await withConn(async conn => {
      // Add STATUS column
      await conn.execute(
        "ALTER TABLE ROOMS ADD STATUS VARCHAR2(20) DEFAULT 'available'",
        {},
        { autoCommit: true }
      );
      console.log('✅ Added STATUS column to ROOMS table');

      // Update existing rooms to have 'available' status
      await conn.execute(
        "UPDATE ROOMS SET STATUS = 'available' WHERE STATUS IS NULL",
        {},
        { autoCommit: true }
      );
      console.log('✅ Updated existing rooms with default status');

      // Verify the column was added
      const res = await conn.execute(
        "SELECT COLUMN_NAME, DATA_TYPE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'ROOMS' ORDER BY COLUMN_ID",
        {},
        { outFormat: require('oracledb').OUT_FORMAT_OBJECT }
      );

      console.log('📋 ROOMS table structure after update:');
      res.rows.forEach(row => {
        console.log(`  - ${row.COLUMN_NAME}: ${row.DATA_TYPE}`);
      });
    });

    console.log('🎉 Database update completed successfully!');
  } catch (error) {
    console.error('❌ Error updating database:', error.message);

    if (error.message.includes('name is already used')) {
      console.log('ℹ️  STATUS column already exists, skipping...');
    } else {
      throw error;
    }
  }
}

addStatusColumn();
