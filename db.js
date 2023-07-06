const mysql = require('mysql');

const connection = mysql.createPool({
    host: '82.180.143.52',
  user: 'u176507776_capsule_dbUser',
  password: 'capsule_db_MAIN123',
  database: 'u176507776_capulse_DB',
});


module.exports = connection;