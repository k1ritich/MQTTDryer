const morgan = require('morgan'); //For Debugging
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path'); // Add this line at the top of your Express application

const Models = require('./Details/Details');
const DryingDetailsModel = Models.DryingDetails;
const UserDetailsModel = Models.UserDetails;
const StartDryingModel = Models.StartTimerDetails;

const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);

app.use(bodyParser.urlencoded({ extended: true }));

const dbURI = 'mongodb://localhost:27017';

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true, })
  .then((result) => {
    httpServer.listen(3000);
    console.log('Connected to Database');
  })
  .catch((err) => {
    console.log(err);
  });

  app.use(express.static('Public/css'));
  app.use(express.static('Public/js'));
  app.use(express.static('Public/img'));
  app.use(express.static('Public/mqttConnections'));

  app.use(express.static('node_modules/bootstrap/dist/')); //Bootstrap CSS/JS
  app.use(express.static('node_modules/bootstrap-icons/font/'));
  app.use(express.static('node_modules/socket.io/client-dist/'));
  app.use(morgan('dev'));


  app.set('view engine', 'ejs');

app.use(express.json());

// Login
app.get('/', (req, res) => {
    res.render(__dirname + '/Login/index', { title: 'Login' });
});

//SignUp
app.get('/Signup', (req, res) => {
  res.render(__dirname + '/SignUp/index', { title: 'Login' });
});

//Contents

//Express Route Handling
app.get('/Dashboard', async (req, res) => {
  res.render(__dirname + '/views/index', {title: 'Dashboard', activeTab: 'dashboard', subtitle: 'Home', path: path, dirname: __dirname });
});

app.get('/Control-Panel',  (req, res) => {
  res.render(__dirname + '/views/index', { title: 'Control Panel', activeTab: 'controlPanel', subtitle: 'Power Options', path: path, dirname: __dirname });
});

app.get('/History', (req, res) => {
  res.render(__dirname + '/views/index', { title: 'History', activeTab: 'history', subtitle: 'Recent Activities', path: path, dirname: __dirname });
});

app.get('/Profile', (req, res) => {
  res.render(__dirname + '/views/index', { title: 'Profile', activeTab: 'users', subtitle: 'Profiles', path: path, dirname: __dirname });
});

app.get('/AboutUs', (req, res) => {
  res.render(__dirname + '/views/index', { title: 'About Us', activeTab: 'aboutUs', subtitle: 'Profiles', path: path, dirname: __dirname });
});

// Add similar route handling for other tabs

// Save to MongoDB
app.post('/DryingDetails', (req, res) => {
  console.log(req.body);
  const dryingDetails = new DryingDetailsModel(req.body);
  dryingDetails.save()
    .then(() => {
      res.redirect('/Dashboard');
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get('/Dashboard/Dashboard', (req,res) => {
    res.render('about', {title: 'About'});
});
