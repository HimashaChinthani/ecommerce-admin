// Delegate to the main application entry so `node server.js` and `npm start` behave the same.
require('dotenv').config();
try {
  require('./src/app.js');
} catch (err) {
  console.error('Failed to start application from ./src/app.js', err);
  process.exit(1);
}
