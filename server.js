// app.js
const morgan = require('morgan'); // Debugg
const bcrypt = require('bcrypt'); //For Encrypting Password
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose'); //
const bodyParser = require('body-parser'); //
const http = require('http');
const path = require('path');
const Models = require('./Details/Details');
const mqtt = require('mqtt');
const fs = require('fs');
const app = express();
const ejs = require('ejs');
const multer = require('multer');
const PDFDocument = require('pdfkit');
const pdf = require('html-pdf');
const Docxtemplater = require('docxtemplater');
const JSZip = require('jszip'); // Import JSZip
require('dotenv').config();

app.use(session({
  secret: 'your-secret-key', // Change this to a secure key
  resave: false,
  saveUninitialized: true,
}));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

const DryingDetailsModel = Models.DryingDetails; // Partially Done
const StartDryingModel = Models.TimerDetails; // Done
const SensorDataModel = Models.SensorData;
const RelayStatesModel = Models.RelayStates;
const CreateProfilesModel = Models.CreateProfiles;
const ESPDetails = Models.ESPDetails;

const mqttOptions = {
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  protocol: process.env.MQTT_PROTOCOL,
  rejectUnauthorized: true,
};

const httpServer = http.createServer(app);
const mqttClient = mqtt.connect(mqttOptions);
const port = 3000;
const io = require('socket.io')(httpServer);
const WebURL = '192.168.2.20'; //const WebURL = '192.168.60.95';

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
  .then((result) => {
      console.log(`Connected to database successfully.`);
  })
  .catch((err) => {
      console.error(`Error connecting to the database: ${err.message}`);
      // Handle MongoDB connection error here
  });

// Start HTTP server
httpServer.listen(port, WebURL, () => {
  console.log(`Server listening at http://${WebURL}:${port}.`);
})
  .on('error', (err) => {
      console.error(`Error starting HTTP server: ${err.message}`);
      // Handle HTTP server start error here
  });

// Connect to MQTT
mqttClient.on('connect', () => {
  console.log(`Connected to MQTT.`);
})
  .on('error', (err) => {
      console.error(`Error connecting to MQTT: ${err.message}`);
      // Handle MQTT connection error here
  });

  const staticPaths = [
      path.join(__dirname, '.'),
      path.join(__dirname, 'uploads'),
      path.join(__dirname, 'Public', 'css'),
      path.join(__dirname, 'Public', 'js'),
      path.join(__dirname, 'Public', 'img'),
      path.join(__dirname, 'Public', 'img', 'ProfilesImg'),
      path.join(__dirname, 'Public', 'mqttConnection'),
      path.join(__dirname, 'node_modules', 'bootstrap', 'dist'),
      path.join(__dirname, 'node_modules', 'bootstrap-icons', 'font'),
  ];

  staticPaths.forEach(staticPath => {
      app.use(express.static(staticPath));
  });

  const topic = [
      "MYMQTTDRYER/TimerRequest",
      "MYMQTTDRYER/FinishData",
      "MYMQTT/InitialACPowerTopic",
      "MYMQTT/CurrentACPowerTopic",
      'MYMQTT/DehumidifierSourceTopic'
  ];

const subscribePromises = topic.map(currentTopic => {
  return new Promise((resolve, reject) => {
    mqttClient.subscribe(currentTopic, err => {
      if (err) {
        reject(err);
      } else {
      //   console.log(`Subscribed to topic: ${currentTopic}`);
        resolve();
      }
    });
  });
});

Promise.all(subscribePromises)
  .then(() => {
    console.log('All subscriptions completed successfully.');
  })
  .catch(err => {
    console.error(`Error subscribing to topics: ${err.message}`);
  });

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(morgan('dev'));
  app.use(express.json());
  app.set('view engine', 'ejs');

  app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
  });

  
  const tabs = [
    { name: 'Dashboard', subtitle: 'Home' },
    { name: 'Control-Panel', subtitle: 'Power Control' },
    { name: 'History', subtitle: 'Recent Activities' },
    { name: 'Profile', subtitle: 'Users' },
    { name: 'AboutUs', subtitle: 'About Us' }
  ];

  mqttClient.on('message', async (topic, message) => {
    const payload = { topic, message: message.toString() };
    console.log(`Received message on topic '${topic}': ${payload.message}`);
    if (!payload.message.trim()) {
      console.log('Hello World');
      return;
    }
    if (payload.topic === 'MYMQTTDRYER/TimerRequest') {
      const activeTimer = await StartDryingModel.findOne({ _id: payload.message }).exec();
      if (activeTimer) {
        const endTimeMillis = activeTimer.endTime.getTime();
        const currentTimeMillis = Date.now();
        const diffMillis = endTimeMillis - currentTimeMillis;
        mqttClient.publish('MYMQTTDRYER/Millis', diffMillis.toString());
        console.log(`Time difference in milliseconds: ${diffMillis}`);

        if (diffMillis <= 0) {
          mqttClient.publish('MYMQTTDRYER/FinishData',"", { qos: 2, retain: true }, (err) => {
            if (err) {
              console.error('Error publishing message:', err);
            } else {
              console.log('Message published successfully');
            }
          });
        }
      }
    } else if (payload.topic === 'MYMQTTDRYER/FinishData') {
      try {
        const jsonData = JSON.parse(payload.message);
        console.log('Received JSON data:', jsonData);
        // Map JSON keys to match SensorDataSchema
          const mappedData = {
          UserName: jsonData.UserName,
          UserID: jsonData.UserID,
          Drying_id: jsonData._id, // Assuming _id in JSON corresponds to Drying_id
          UserProfPic: jsonData.UserProfPic,
          DryingTitle: jsonData.DryingTitle,
          ItemName: jsonData.ItemName,
          ItemQuantity: jsonData.ItemQuantity,
          Status: jsonData.Status,
          startTime: new Date(jsonData.startTime),
          endTime: new Date(jsonData.endTime),
          stopTime: new Date(),
          TimeMode: jsonData.TimeMode,
          Temperature: jsonData.Temperature.map(Number),
          Humidity: jsonData.Humidity.map(Number),
          SubmitBy: jsonData.SubmitBy
        };
        const sensorData = new SensorDataModel(mappedData);
        await sensorData.save();
        mqttClient.publish('MYMQTTDRYER/FinishData',"", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            console.log('Message published successfully');
          }
        });
        console.log('Data saved to MongoDB');
        const updateStartDrying = await StartDryingModel.findById(jsonData._id);
        if (!updateStartDrying) {
          return res.status(404).send('User not found');
        } else {
          updateStartDrying.Status = "Complete";
          await updateStartDrying.save();
          console.log("Successfully Updated The Drying")
        }
        const PowerStates = {
          HumidifierState: "OFF",
          PowerState: "OFF",
          OperationState: "OFF",
        };
        mqttClient.publish('MYMQTTDRYER/StoreStateTopic',JSON.stringify(PowerStates), { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            console.log('Message published successfully');
          }
        });
      } catch (error) {
        console.error('Error parsing JSON or saving to MongoDB:', error);
      }
    }
    // Emit the payload to all connected clients
    io.emit('mqttMessage', payload);
  });
  
  io.on('connection', (socket) => {
    console.log('A user connected');
  
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });

          
      // Unsubscribe from the topics
      const topics1 = ['MYMQTTDRYER/TemperatureHumidityTopic', 'MYMQTTDRYER/StoreStateTopic','MYMQTTDRYER/RecordPowerTopic']; // Add your subscribed topics here
      topics1.forEach((topic) => {
        mqttClient.unsubscribe(topic, (err) => {
          if (err) {
            console.error('Error unsubscribing from topic:', err);
          } else {
            console.log(`Unsubscribed from topic: ${topic}`);
          }
        });
      });

    // Unsubscribe from the topics
    const topics = ['MYMQTTDRYER/TemperatureHumidityTopic', 'MYMQTTDRYER/StoreStateTopic','MYMQTTDRYER/RecordPowerTopic']; // Add your subscribed topics here
    topics.forEach((topic) => {
      mqttClient.subscribe(topic, (err) => {
        if (err) {
          console.error('Error subscribing from topic:', err);
        } else {
          console.log(`Subscribed from topic: ${topic}`);
        }
      });
    });
  
    // Handle the 'publishMessage' event
    socket.on('publishMessage', (payload) => {
      mqttClient.publish(payload.topic, payload.message);
    });
  });
  

// Set up Multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); // Save uploads to the 'uploads' directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null,file.fieldname + '-' + req.body.UnivStudID + '-' + uniqueSuffix + extension);
  },
});

const upload = multer({ storage: storage });

app.get('/downloadSensorDataPDF', async (req, res) => {
  try {
    // Get the ID parameter from the request
    const historyId = req.query.id;

    // Fetch data from SensorDataModel based on the provided history ID
    const sensorData = await SensorDataModel.findOne({ _id: historyId });

    // Check if the data exists
    if (!sensorData) {
      return res.status(404).send('Data not found');
    }

    // Render EJS template with data
    const templatePath = path.join(__dirname, 'views', 'pdfTemplate.ejs');
    const htmlContent = await ejs.renderFile(templatePath, { sensorData });

    // Options for the HTML to PDF conversion
    const pdfOptions = { format: 'A4' };

    // Convert HTML to PDF
    pdf.create(htmlContent, pdfOptions).toBuffer((err, buffer) => {
      if (err) {
        console.error('Error generating PDF:', err);
        return res.status(500).send('Internal Server Error');
      }

      // Set the filename for download
      res.setHeader('Content-disposition', 'attachment; filename=sensorData.pdf');
      // Set the content type for PDF
      res.setHeader('Content-type', 'application/pdf');

      // Send the PDF buffer as the response
      res.send(buffer);
    });
  } catch (error) {
    console.error('Error generating and sending sensor data PDF:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/Dashboard');
  } else {
    // Clear session variables
    const error = req.session.error;
    req.session.error = null;

    res.render(__dirname + '/views/Login', { title: 'Login', error: error});
  }
});

app.get('/template', (req, res) => {
    // Clear session variables
    const error = req.session.error;
    req.session.error = null;

    res.render(__dirname + '/views/pdfTemplate', {dirname: __dirname});
});



function renderTab(tab, res, timerInfo = null, MyProfile = null, MyHistory = null, UserDetail, error = null, success = null) {
  res.render(`${__dirname}/views/index`, {
    title: tab.name,
    activeTab: tab.name.toLowerCase(),
    subtitle: tab.subtitle,
    path: path,
    dirname: __dirname,
    timerInfo: timerInfo,
    UserDetail: UserDetail,
    MyProfile: MyProfile,
    MyHistory: MyHistory,
    error: error,
    success: success,
  });
}


tabs.forEach(tab => {
  app.get(`/${tab.name}`, async (req, res) => {
    try {
      if(req.session.user) {
        const error = req.session.error;
        const success = req.session.success;
        req.session.error = null;
        req.session.success = null;

        if (tab.name === 'Dashboard') {
          const activeTimers = await StartDryingModel.find({ Status: "On-going" }).exec();
          const firstActiveTimer = activeTimers.length > 0 ? activeTimers[0] : null;
          const timerInfo = firstActiveTimer
            ? { ItemQuantity:firstActiveTimer.ItemQuantity, ItemName: firstActiveTimer.ItemName, id: firstActiveTimer._id, startTime: firstActiveTimer.startTime, endTime: firstActiveTimer.endTime }
            : null;
          renderTab(tab, res, timerInfo, null, null, req.session.user, error, success);
        } else if (tab.name === "Profile") {
          const Myprofile = await CreateProfilesModel.find().sort({ createdAt: -1 });
          // console.log('Fetched Profiles:', Myprofile);
          renderTab(tab, res, null, Myprofile, null, req.session.user, error, success);
        } else if (tab.name === "History") {
          const MyHistory = await SensorDataModel.find().sort({ createdAt: -1 });
          // console.log('Fetched Profiles:', Myprofile);
          renderTab(tab, res, null, null, MyHistory, req.session.user, error, success);
        } else {
          renderTab(tab, res, null, null, null, req.session.user, error, success);
        }
      }
      else {
        res.redirect('/');
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
});

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

app.post('/StartDrying', async (req, res) => {
  try {
    // const activeTimers = await StartDryingModel.find({ endTime: { $gt: new Date() } });
    const activeTimers = await StartDryingModel.find({ Status: "On-going" }).exec();

    activeTimers.forEach(timer => {
      console.log("Active Timer End Time: " + timer.endTime);
    });

    // Check if there are active timers with end time greater than current time
    if (activeTimers.length > 0) {
      res.redirect('/Dashboard');
    } else {
      // No active timer, proceed with starting a new timer
      console.log(req.body);
      // mqttClient.publish('MYMQTTDRYER/DryingData', JSON.stringify(req.body));
      const itemName = req.body.ItemName;
      const ItemQuantity = req.body.ItemQuantity;
      const modeSelect = req.body.modeSelect;
      const TimeMode = req.body.TimeMode;
      const sourceSelect = req.body.powerSourceSelect;
      const Status = req.body.status;
      const DryingTitle = req.body.DryingTitle;
      const { days, hours, minutes } = req.body;

      const totalMilliseconds = ((parseInt(days) * 24 + parseInt(hours)) * 60 + parseInt(minutes)) * 60 * 1000;
      const currentTimestamp = new Date().getTime(); // Get current timestamp in milliseconds
      const timestamp = new Date(currentTimestamp + totalMilliseconds);

      // Calculate the duration based on the user input
      const userDate = new Date(timestamp);
      const currentTime = new Date();

      // Convert user's datetime to milliseconds
      const userDateInMillis = userDate - currentTime;
      mqttClient.publish('MYMQTT/MillisTopic', userDateInMillis.toString());

      // Introduce a delay of 1000 milliseconds (1 second) before the second publish
      setTimeout(async () => {
        if (modeSelect === "AUTOMATIC") {
          mqttClient.publish('MYMQTT/SwitchSourceModeTopic', modeSelect);
          mqttClient.publish('MYMQTT/SwitchSourceTopic', "SOLAR");
        }
        mqttClient.publish('MYMQTT/SwitchSourceModeTopic', modeSelect);
        mqttClient.publish('MYMQTT/SwitchSourceTopic', sourceSelect);
      }, 1000); // Adjust the delay as needed

        // Continue with the rest of the code after the second publish
        console.log("userDate: " + userDate);
        console.log("currentTime: " + currentTime);
        console.log("UserMillis: " + userDateInMillis);

        if (TimeMode === "NOTIMER") {
          console.log("You Reach Me");
          // Create a new StartDryingModel instance
          const timer = new StartDryingModel({
            UserName: req.session.user.FullName,
            UserID: req.session.user._id,
            UserProfPic: req.session.user.ProfileImage,
            DryingTitle: DryingTitle,
            ItemName: itemName,
            ItemQuantity: ItemQuantity,
            TimeMode: TimeMode,
            Status: Status,
            startTime: currentTime,
            endTime: null,
          });
          // Save the timer to the database
          await timer.save();

        } else if (TimeMode === "TIMER") {
          // Create a new StartDryingModel instance
          const timer = new StartDryingModel({
            UserName: req.session.user.FullName,
            UserID: req.session.user._id,
            UserProfPic: req.session.user.ProfileImage,
            DryingTitle: DryingTitle,
            ItemName: itemName,
            ItemQuantity: ItemQuantity,
            TimeMode: TimeMode,
            Status: Status,
            startTime: currentTime,
            endTime: userDate,
          });
          // Save the timer to the database
          await timer.save();
        }

        const newTimerMQTT = await StartDryingModel.findOne({ Status: "On-going" }).exec();
        
        const PowerStates = {
          HumidifierState: "ON",
          PowerState: req.body.powerSourceSelect,
          OperationState: req.body.modeSelect,
        };
        mqttClient.publish('MYMQTTDRYER/DryingData', JSON.stringify(newTimerMQTT), { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            console.log('Message published successfully');
            
            // Add a 1-second delay before publishing the next message
            setTimeout(() => {
              mqttClient.publish('MYMQTTDRYER/StoreStateTopic', JSON.stringify(PowerStates), { qos: 2, retain: true }, (err) => {
                if (err) {
                  console.error('Error publishing message:', err);
                } else {
                  console.log('Message published successfully');
                }
              });
            }, 1000); // 1000 milliseconds = 1 second
          }
        });
        const newTimer = await StartDryingModel.find({ Status: "On-going" }).exec();
        const NewActiveTimer = newTimer.length > 0 ? newTimer[0] : null;
        console.log(NewActiveTimer._id);
        ID = NewActiveTimer._id

        const state = new RelayStatesModel({
          DehumidifierRelayState: 'ON',
          DryingID: ID,
          DryingMode: modeSelect,
          RelayState: sourceSelect,
        })
        // Save the State to the database
        await state.save();

        res.redirect('/Dashboard');
    }
  } catch (error) {
    // Handle any errors that may occur during the process
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post('/FinishDrying', async (req, res) => {
  console.log(req.body);
  const Temperature = [];
  const Humidity = [];
  for (let i = 0; i < 13; i++) {
    Temperature[i] = req.body[`Temperature${i}`];
    Humidity[i] = req.body[`Humidity${i}`];
  }
  console.log(Temperature);
  console.log(Humidity);

  const activeTimer = await StartDryingModel.findOne({ _id: req.body.DryingID }).exec();
  if (activeTimer) {
    const mappedData = {
      UserName: activeTimer.UserName,
      UserID: activeTimer.UserID,
      Drying_id: activeTimer._id, // Assuming _id in JSON corresponds to Drying_id
      UserProfPic: activeTimer.UserProfPic,
      DryingTitle: activeTimer.DryingTitle,
      ItemName: activeTimer.ItemName,
      ItemQuantity: activeTimer.ItemQuantity,
      Status: "Complete",
      startTime: activeTimer.startTime,
      endTime: activeTimer.endTime,
      stopTime: new Date(),
      TimeMode: activeTimer.TimeMode,
      Temperature: Temperature,
      Humidity: Humidity,
      SubmitBy: req.session.user.FullName
    };
    console.log(mappedData);

    const sensorData = new SensorDataModel(mappedData);
    await sensorData.save();
    console.log("Sensor data saved successfully!");
  } else {
    console.log("Active timer not found.");
  }

  res.send('Finished drying data received');
});
app.post('/SaveData', async (req, res) => {
  try {
    console.log(req.body);
    // Assuming datalog is a mongoose model, you can create an instance and save it
    const datalog = new SensorDataModel(req.body); // Replace YourDataModel with your actual Mongoose model
    await datalog.save();

    res.redirect('/Dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/StartGetData', async (req, res) => {
  try {
    // const activeTimers = await StartDryingModel.find({ endTime: { $gt: new Date() } });
    const activeTimers = await StartDryingModel.find({ Status: "On-going" }).exec();
    const firstActiveTimer = activeTimers.length > 0 ? activeTimers[0] : null;
    console.log(new Date().getTime());
    
    if (firstActiveTimer) {
      res.json(firstActiveTimer);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching data from MongoDB:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/getdata', async (req, res) => {
  try {
    // const activeTimers = await StartDryingModel.find({ endTime: { $gt: new Date() } });
    const activeTimers = await StartDryingModel.find({ Status: "On-going" }).exec();
    const firstActiveTimer = activeTimers.length > 0 ? activeTimers[0] : null;
    console.log(new Date().getTime());
    
    if (firstActiveTimer) {
      const SensorState = await RelayStatesModel
      .findOne({ DryingID: firstActiveTimer._id })
      .sort({ _id: -1 }) // Assuming the documents have an "_id" field and you want to sort based on it in descending order
      .limit(1);
      const userDateInMillis = firstActiveTimer.endTime.getTime() - new Date().getTime();
      res.json(firstActiveTimer);
      mqttClient.publish('MYMQTT/MillisTopic', userDateInMillis.toString());

      setTimeout(async () => {
        if (SensorState.DryingMode === "AUTOMATIC") {
          mqttClient.publish('MYMQTT/SwitchSourceModeTopic', SensorState.DryingMode);
          mqttClient.publish('MYMQTT/SwitchSourceTopic', SensorState.RelayState);
        }
        mqttClient.publish('MYMQTT/SwitchSourceModeTopic', SensorState.DryingMode);
        mqttClient.publish('MYMQTT/SwitchSourceTopic', SensorState.RelayState);
      }, 1000);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching data from MongoDB:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/ESP32', async (req, res) => {
  console.log(req.body);
});

app.post('/AddUser', upload.single('UserProfileImage'), async (req, res) => {
  try {
    // Log the request body
    console.log(req.body);

    // Retrieve user input from the form
    const { FullName, UnivStudID, EmailAddress, PhoneNumber, Password, RoleSelect } = req.body;
    // Get the file path of the uploaded image
    const imagePath = req.file ? req.file.path : null;

    // Check for duplicate UnivStudID or EmailAddress
    const existingUser = await CreateProfilesModel.findOne({
      $or: [{ UnivStudID: UnivStudID }, { FullName: FullName}]
    });

    if (existingUser) {
      // Handle duplicate user (you can send an error message or redirect to a different page)
      req.session.error = "Profile already exist! Check ID and Name";
      res.redirect('/Profile'); // Redirect to an error page or handle it as needed
      return;
    } 

    // Create a new profile instance
    const userProfile = new CreateProfilesModel({
      CreatedBy: req.session.user.FullName,
      CreatedByUserID: req.session.user._id,
      FullName: FullName,
      UnivStudID: UnivStudID,
      EmailAddress: EmailAddress,
      PhoneNumber: PhoneNumber,
      SecurityKey: Password,
      Role: RoleSelect,
      ProfileImage: imagePath,
    });

    // Save the profile to the database
    await userProfile.save();

    req.session.success = "Added Profile!";
    // Redirect or send a response as needed
    res.redirect('/Profile');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



// Assuming you have a route for handling login, e.g., '/login'
app.post('/login', async (req, res) => {
  try {
    const { StudUnivID, Password } = req.body;

    // If the user is already logged in, redirect them to the dashboard
    if (req.session.user) {
      return res.redirect('/Dashboard');
    }

    // Find the user by their student/university ID
    const user = await CreateProfilesModel.findOne({ UnivStudID: StudUnivID });

    if (user) {
      // Compare the provided password with the double-hashed password in the database
      const isPasswordMatch = await bcrypt.compare(Password, user.SecurityKey);

      if (isPasswordMatch) {
        req.session.user = user;

        // Set cache-control headers to prevent caching
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

        res.redirect('/Dashboard'); // Redirect to the dashboard or any authorized page
      } else {
        // Passwords do not match, set an error message in session
        req.session.error = 'Invalid ID or Password';
        res.redirect('/?invalidcredentials');
      }
    } else {
      // User not found, set an error message in session
      req.session.error = 'Invalid ID or Password';
      res.redirect('/?invalidcredentials');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/logout', (req, res) => {
  // Destroy the session to log the user out
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    // Redirect to the login page after logout
    res.redirect('/');
  });
});

app.post('/EditUser/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(userId);
    const { FullName, UnivStudID, EmailAddress, PhoneNumber, RoleSelect, UserProfileImage} = req.body;

    // Find the user by ID
    const user = await CreateProfilesModel.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Update user details
    user.FullName = FullName;
    user.UnivStudID = UnivStudID;
    user.EmailAddress = EmailAddress;
    user.PhoneNumber = PhoneNumber;
    user.Role = RoleSelect;
    if (req.file) {
      user.ProfileImage = req.file.filename; // Assuming multer renames the file and assigns a unique filename
    }

    // Save the updated user details
    await user.save();

    // Redirect or send a response as needed
    res.redirect('/Profile'); // Redirect to the profile page or any other page
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Update the route for deleting a user profile
app.post('/DeleteUser/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user by ID
    const user = await CreateProfilesModel.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Delete the associated image file if it exists
    if (user.ProfileImage) {
      fs.unlinkSync(user.ProfileImage);
    }

    // Delete the user
    await user.deleteOne();

    // Redirect or send a response as needed
    res.redirect('/Profile'); // Redirect to the profile page or any other page
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Add this route handling
app.post('/SaveToMongo', async (req, res) => {
  try {
    console.log(req.body);
      // Assuming datalog is a mongoose model, you can create an instance and save it
      const datalog = new RelayStatesModel(req.body); // Replace YourMongoModel with your actual Mongoose model
      await datalog.save();

      res.status(200).send('Data saved to MongoDB successfully');
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});

