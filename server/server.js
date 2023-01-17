require('dotenv').config({
  path: 'variable.env'
});
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const Pusher = require('pusher');
const mysql = require('mysql');
const sha512 = require('js-sha512').sha512;
const jsdom = require("jsdom");

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  forceTLS: true,
});


const connection = mysql.createConnection({
  host: '127.0.0.1',
  port: '3306',
  user: 'root',
  password: process.env.MYSQLDB_PASS,
  database: 'eventdb'
});

const app = express();
app.use(session({
  secret: 'somesecrethere',
  resave: true,
  saveUninitialized: true
}))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(express.static(path.join(__dirname, '/../public')));

app.get('/', function (request, response) {
  if (request.session.loggedIn) {
    if (request.session.isAdmin) {
      return response.sendFile(path.join(__dirname + '/../public/admin/admin.html'));
    } else {
      return response.sendFile(path.join(__dirname + '/../public/landing/index.html'));
    }
  } else {
    response.sendFile(path.join(__dirname + '/../public/login/login.html'));
  }
});

app.post('/login', function (request, response) {
  let email = request.body.email;
  let ticket = request.body.ticket;
  if (email && ticket) {
    connection.query('SELECT * FROM accounts WHERE email = ? AND ticket = ?', [email, sha512(ticket)], function (error, result, fields) {
      if (error) throw error;
      if (result.length > 0) {
        request.session.loggedIn = true;
        request.session.email = result[0].email;
        request.session.username = result[0].username;
        request.session.fullname = result[0].fullname;
        if (request.session.username === 'admin') {
          request.session.isAdmin = true
        }
        return response.redirect('/');
      } else {
        return response.send('Incorrect input data provided!');
      }
    });
  } else {
    return response.send('Please enter username, email and ticket number!');
  }
});

app.post('/pusher/auth', (request, response) => {
  const socketId = request.body.socket_id;
  const channel = request.body.channel_name;
  const presenceData = {
    user_id: request.session.username,
    user_info: {
      fullname: request.session.fullname,
    }
  };
  const auth = pusher.authorizeChannel(socketId, channel, presenceData);
  response.send(auth);
});

app.listen(3000, () => {
  console.log('Server is up on 3000')
});
