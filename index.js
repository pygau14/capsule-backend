const express = require('express');
const cors = require('cors');

const app = express();
const bodyParser = require('body-parser');
const routes = require('./route');
// Parse JSON bodies
app.use(bodyParser.json());


app.use(cors());
// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('src'));
app.use(express.json());
app.use('/',routes);


// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
