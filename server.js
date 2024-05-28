const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const http = require('http');
const path = require('path');
const Models = require('./Details/Details');
const mqtt = require('mqtt');
const fs = require('fs');
const app = express();
const ejs = require('ejs');
const multer = require('multer');
const cron = require('node-cron');
const axios = require('axios');
const puppeteer = require('puppeteer');
const PDFDocument = require('pdfkit');
const pug = require('pug');
const html_to_pdf = require('html-pdf');
require('dotenv').config();

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
const StartDryingModel = Models.TimerDetails; // Done
const SensorDataModel = Models.SensorData;
const TemperatureLogModel = Models.TemperatureLog;
const oneMinuteTemperatureLogModel = Models.oneMinuteTemperatureLog;
const fiveMinuteTemperatureLogModel = Models.fiveMinuteTemperatureLog;
const ActivityLogModel = Models.ActivityLog;
const CreateProfilesModel = Models.CreateProfiles;

const mqttOptions = {
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  protocol: process.env.MQTT_PROTOCOL,
  rejectUnauthorized: true,
};

const httpServer = http.createServer(app);
const mqttClient = mqtt.connect(mqttOptions);
const port = 10000 || 4000;
const io = require('socket.io')(httpServer);

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
httpServer.listen(port, () => {
  // console.log(`Server listening at http://${WebURL}:${port}.`);
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
      'MYMQTTDRYER/RecordHalfMinuteLogTemperatureHumidityTopic', 
      'MYMQTTDRYER/RecordOneMinuteLogTemperatureHumidityTopic',
      'MYMQTTDRYER/RecordFiveMinuteLogTemperatureHumidityTopic'
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
  // app.use(morgan('dev'));
  app.use(express.json());
  app.set('view engine', 'ejs', 'pug');
  

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
    // console.log(`Received message on topic '${topic}': ${payload.message}`);
    if (!payload.message.trim()) {
      // console.log('Hello World');
      return;
    }
    if (payload.topic === 'MYMQTTDRYER/RecordHalfMinuteLogTemperatureHumidityTopic') {
      const activeTimers = await StartDryingModel.find({ Status: "On-going" }).exec();
      const firstActiveTimer = activeTimers.length > 0 ? activeTimers[0] : null;
      if (!firstActiveTimer) {

      } else {
        try {
          const jsonData = JSON.parse(payload.message);
            const mappedData = {
            Drying_id: firstActiveTimer._id,
            DryingTitle: firstActiveTimer.DryingTitle,
            ItemName: firstActiveTimer.ItemName,
            ItemQuantity: firstActiveTimer.ItemQuantity,
            logTime: new Date(),
            Temperature: jsonData.Temperature.map(Number),
            Humidity: jsonData.Humidity.map(Number),
          };
          const sensorData = new TemperatureLogModel(mappedData);
          await sensorData.save();
        } catch (error) {
          console.error('Error parsing JSON or saving to MongoDB:', error);
        }
        mqttClient.publish('MYMQTTDRYER/RecordHalfMinuteLogTemperatureHumidityTopic',"", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });
      }
    } else if (payload.topic === 'MYMQTTDRYER/RecordOneMinuteLogTemperatureHumidityTopic') {
      const activeTimers = await StartDryingModel.find({ Status: "On-going" }).exec();
      const firstActiveTimer = activeTimers.length > 0 ? activeTimers[0] : null;
      if (!firstActiveTimer) {

      } else {
        try {
          const jsonData = JSON.parse(payload.message);
            const mappedData = {
            Drying_id: firstActiveTimer._id,
            DryingTitle: firstActiveTimer.DryingTitle,
            ItemName: firstActiveTimer.ItemName,
            ItemQuantity: firstActiveTimer.ItemQuantity,
            logTime: new Date(),
            Temperature: jsonData.Temperature.map(Number),
            Humidity: jsonData.Humidity.map(Number),
          };
          const sensorData = new oneMinuteTemperatureLogModel(mappedData);
          await sensorData.save();
        } catch (error) {
          console.error('Error parsing JSON or saving to MongoDB:', error);
        }
        mqttClient.publish('MYMQTTDRYER/RecordOneMinuteLogTemperatureHumidityTopic',"", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });
      }
    } else if (payload.topic === 'MYMQTTDRYER/RecordFiveMinuteLogTemperatureHumidityTopic') {
      const activeTimers = await StartDryingModel.find({ Status: "On-going" }).exec();
      const firstActiveTimer = activeTimers.length > 0 ? activeTimers[0] : null;
      if (!firstActiveTimer) {
        
      } else {
        try {
          const jsonData = JSON.parse(payload.message);
            const mappedData = {
            Drying_id: firstActiveTimer._id,
            DryingTitle: firstActiveTimer.DryingTitle,
            ItemName: firstActiveTimer.ItemName,
            ItemQuantity: firstActiveTimer.ItemQuantity,
            logTime: new Date(),
            Temperature: jsonData.Temperature.map(Number),
            Humidity: jsonData.Humidity.map(Number),
          };
          const sensorData = new fiveMinuteTemperatureLogModel(mappedData);
          await sensorData.save();
        } catch (error) {
          console.error('Error parsing JSON or saving to MongoDB:', error);
        }
        mqttClient.publish('MYMQTTDRYER/RecordFiveMinuteLogTemperatureHumidityTopic',"", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });
      }
    } else if (payload.topic === 'MYMQTTDRYER/TimerRequest') {
      const activeTimer = await StartDryingModel.findOne({ _id: payload.message }).exec();
      if (activeTimer) {
        const endTimeMillis = activeTimer.endTime.getTime();
        const currentTimeMillis = Date.now();
        const diffMillis = endTimeMillis - currentTimeMillis;
        mqttClient.publish('MYMQTTDRYER/Millis', diffMillis.toString());
        // console.log(`Time difference in milliseconds: ${diffMillis}`);

        if (diffMillis <= 0) {
          mqttClient.publish('MYMQTTDRYER/FinishData',"", { qos: 2, retain: true }, (err) => {
            if (err) {
              console.error('Error publishing message:', err);
            } else {
              // console.log('Message published successfully');
            }
          });
        }
      }
    } else if (payload.topic === 'MYMQTTDRYER/FinishData') {
      try {
        const jsonData = JSON.parse(payload.message);
          const mappedData = {
            UserName: jsonData.UserName,
            UserID: jsonData.UserID,
            Drying_id: jsonData._id,
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

        const log = new ActivityLogModel({
          ActionBy: jsonData.SubmitBy,
          Action: "Stopped Drying",
          Description: jsonData.SubmitBy + " Stopped drying with title " +"'"+jsonData.DryingTitle+"'"
        });
        await log.save(); 

        const PowerStates = {
          PowerState: "OFF",
          OperationState: "OFF",
        };

        for (i=0; i < 10; i++) {
          mqttClient.publish('MYMQTTDRYER/StoreStateTopic',JSON.stringify(PowerStates), { qos: 2, retain: true }, (err) => {
            if (err) {
              console.error('Error publishing message:', err);
            } else {
              // console.log('Message published successfully');
            }
          });
        }
        mqttClient.publish('MYMQTTDRYER/PlayingTime',"NOTIMER", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });
        mqttClient.publish('MYMQTTDRYER/DryingData',"", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });
        mqttClient.publish('MYMQTTDRYER/FinishData',"", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });
        mqttClient.publish('MYMQTTDRYER/TemperatureHumidityTopic',"", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });
        mqttClient.publish('MYMQTTDRYER/RecordTemperatureHumidityTopic',"", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });
        mqttClient.publish('MYMQTTDRYER/RecordPowerTopic',"", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });
        // console.log('Data saved to MongoDB');
        const updateStartDrying = await StartDryingModel.findById(jsonData._id);
        if (!updateStartDrying) {
          return res.status(404).send('User not found');
        } else {
          updateStartDrying.Status = "Complete";
          await updateStartDrying.save();
          // console.log("Successfully Updated The Drying")
        }
        for (i=0; i < 10; i++) {
          mqttClient.publish('MYMQTTDRYER/StoreStateTopic',JSON.stringify(PowerStates), { qos: 2, retain: true }, (err) => {
            if (err) {
              console.error('Error publishing message:', err);
            } else {
              // console.log('Message published successfully');
            }
          });
        }
      } catch (error) {
        console.error('Error parsing JSON or saving to MongoDB:', error);
      }
    }
    // Emit the payload to all connected clients
    io.emit('mqttMessage', payload);
  });
  
  io.on('connection', (socket) => {
    // console.log('A user connected');
  
    // Handle disconnection
    socket.on('disconnect', () => {
      // console.log('User disconnected');
    });

          
      // Unsubscribe from the topics
      const topics1 = ['MYMQTTDRYER/ESPState','MYMQTTDRYER/TemperatureHumidityTopic', 'MYMQTTDRYER/StoreStateTopic','MYMQTTDRYER/RecordPowerTopic','MYMQTTDRYER/VoltageController']; // Add your subscribed topics here
      topics1.forEach((topic) => {
        mqttClient.unsubscribe(topic, (err) => {
          if (err) {
            console.error('Error unsubscribing from topic:', err);
          } else {
          }
        });
      });

    // Unsubscribe from the topics
    const topics = ['MYMQTTDRYER/ESPState','MYMQTTDRYER/TemperatureHumidityTopic', 'MYMQTTDRYER/StoreStateTopic','MYMQTTDRYER/RecordPowerTopic','MYMQTTDRYER/VoltageController']; // Add your subscribed topics here
    topics.forEach((topic) => {
      mqttClient.subscribe(topic, (err) => {
        if (err) {
        } else {
          // console.log(`Subscribed from topic: ${topic}`);
        }
      });
    });
  
    // Handle the 'publishMessage' event
    socket.on('publishMessage', (payload) => {
      mqttClient.publish(payload.topic, payload.message);
    });

    socket.on('publishVoltage', (payload) => {
      mqttClient.publish(payload.topic, payload.message, { retain: true });
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

async function renderPdfTemplate(sensorData) {
  const templatePath = path.join(__dirname, 'views', 'onepdftemplate.ejs');
  return await ejs.renderFile(templatePath, { sensorData });
}

//Download All Data
app.get('/download-all-pdf', async (req, res) => {
  try {
    // Render the Pug template to HTML
    const pug = require('pug');
    const html = pug.renderFile(path.join(__dirname, '/views/document.pug'));

    // Convert HTML to PDF
    html_to_pdf.create(html).toBuffer((err, buffer) => {
      if (err) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Internal Server Error');
        return;
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=example.pdf');
      res.send(buffer);
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/Dashboard');
  } else {
    const error = req.session.error;
    req.session.error = null;
    res.render(__dirname + '/views/Login', { title: 'Login', error: error});
  }
});
function renderTab(tab, res, timerInfo = null, MyProfile = null, MyHistory = null, onGoingTimers= null, ActivityLogs=null, UserDetail, error = null, success = null) {
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
    onGoingTimers: onGoingTimers,
    ActivityLogs: ActivityLogs,
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
            ? { ItemQuantity:firstActiveTimer.ItemQuantity, ItemName: firstActiveTimer.ItemName, id: firstActiveTimer._id, startTime: firstActiveTimer.startTime, endTime: firstActiveTimer.endTime, TimeMode: firstActiveTimer.TimeMode }
            : null;
          renderTab(tab, res, timerInfo, null, null, null, null, req.session.user, error, success);
        } else if (tab.name === "Profile" && req.session.user.Role === "Admin") {
          const Myprofile = await CreateProfilesModel.find().sort({ createdAt: -1 });
          renderTab(tab, res, null, Myprofile, null, null, null, req.session.user, error, success);
        } else if (tab.name === "Profile" && req.session.user.Role === "User") {
          req.session.error = "Profile Tab is for 'Admin Only'";
          res.redirect('/');
        } else if (tab.name === "History") {
          const onGoingTimers = await StartDryingModel.findOne({ Status: "On-going" });
          const MyHistory = await SensorDataModel.find().sort({ endTime: -1 });
          const ActivityLogs = await ActivityLogModel.find().sort({ createdAt: -1 });
          renderTab(tab, res, null, null, MyHistory, onGoingTimers, ActivityLogs, req.session.user, error, success);
        } else {
          renderTab(tab, res, null, null, null, null, null, req.session.user, error, success);
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
app.post('/StartDrying', async (req, res) => {
  try {
    const activeTimers = await StartDryingModel.find({ Status: "On-going" }).exec();

    activeTimers.forEach(timer => {
    });
    if (activeTimers.length > 0) {
      res.redirect('/Dashboard');
    } else {
      const itemName = req.body.ItemName;
      const ItemQuantity = req.body.ItemQuantity;
      const TimeMode = req.body.TimeMode;
      const Status = req.body.status;
      const DryingTitle = req.body.DryingTitle;
      const { days, hours, minutes } = req.body;

      const totalMilliseconds = ((parseInt(days) * 24 + parseInt(hours)) * 60 + parseInt(minutes)) * 60 * 1000;
      const currentTimestamp = new Date().getTime();
      const timestamp = new Date(currentTimestamp + totalMilliseconds);

      const userDate = new Date(timestamp);
      const currentTime = new Date();

      const userDateInMillis = userDate - currentTime;
      mqttClient.publish('MYMQTT/MillisTopic', userDateInMillis.toString());

      const log = new ActivityLogModel({
        ActionBy: req.session.user.FullName,
        Action: "Started Drying",
        Description: "Started drying with title " +"'"+DryingTitle+"'"
      });
      await log.save();

        if (TimeMode === "NOTIMER") {
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
          await timer.save();

        } else if (TimeMode === "TIMER") {
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
          await timer.save();
        }
        const newTimerMQTT = await StartDryingModel.findOne({ Status: "On-going" }).exec();
        const PowerStates = {
          PowerState: req.body.powerSourceSelect,
          OperationState: req.body.modeSelect,
        };
        mqttClient.publish('MYMQTTDRYER/DryingData', JSON.stringify(newTimerMQTT), { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            setTimeout(() => {
              mqttClient.publish('MYMQTTDRYER/SwitchSourceModeTopic', req.body.modeSelect, { qos: 2, retain: false }, (err) => {
                if (err) {
                  console.error('Error publishing message:', err);
                } else {
                  // console.log('Message published successfully');
                  setTimeout(() => {
                    mqttClient.publish('MYMQTTDRYER/SwitchPowerTopic', req.body.powerSourceSelect, { qos: 2, retain: false }, (err) => {
                      if (err) {
                        console.error('Error publishing message:', err);
                      } else {
                        // console.log('Message published successfully');
                      }
                    });
                  }, 1000); // Additional 1 second delay before publishing the second message
                }
              });
            }, 1000); // Initial 1 second delay before publishing the first subsequent message
          }
        });        
        mqttClient.publish('MYMQTTDRYER/PlayingTime',"TIMER", { qos: 2, retain: true }, (err) => {
          if (err) {
            console.error('Error publishing message:', err);
          } else {
            // console.log('Message published successfully');
          }
        });

        res.redirect('/Dashboard');
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});
app.post('/FinishDrying', async (req, res) => {
  // console.log(req.body);
  const Temperature = [];
  const Humidity = [];
  for (let i = 0; i < 14; i++) {
    Temperature[i] = req.body[`Temperature${i}`];
    Humidity[i] = req.body[`Humidity${i}`];
  }

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
      endTime: activeTimer.TimeMode === "TIMER" ? activeTimer.endTime : new Date(),
      stopTime: new Date(),
      TimeMode: activeTimer.TimeMode,
      Temperature: Temperature,
      Humidity: Humidity,
      SubmitBy: req.session.user.FullName
    };    
    // console.log(mappedData);

    const sensorData = new SensorDataModel(mappedData);
    await sensorData.save();
    activeTimer.Status = "Complete";
    activeTimer.endTime = new Date();
    await activeTimer.save();
    // console.log("Sensor data saved successfully!");

    const log = new ActivityLogModel({
      ActionBy: req.session.user.FullName,
      Action: "Stopped Drying",
      Description: "Stopped drying with title " +"'"+activeTimer.DryingTitle+"'"
    });
    await log.save();

    const PowerStates = {
      PowerState: "OFF",
      OperationState: "OFF",
    };
    setTimeout(() => {
      mqttClient.publish('MYMQTTDRYER/SwitchSourceModeTopic', "OFF", { qos: 2, retain: false }, (err) => {
        if (err) {
          console.error('Error publishing message:', err);
        } else {
          // console.log('Message published successfully');
          setTimeout(() => {
            mqttClient.publish('MYMQTTDRYER/SwitchPowerTopic', "OFF", { qos: 2, retain: false }, (err) => {
              if (err) {
                console.error('Error publishing message:', err);
              } else {
                // console.log('Message published successfully');
              }
            });
          }, 1000); // Additional 1 second delay before publishing the second message
        }
      });
    }, 1000); // Initial 1 second delay before publishing the first subsequent message
    mqttClient.publish('MYMQTTDRYER/PlayingTime',"NOTIMER", { qos: 2, retain: true }, (err) => {
      if (err) {
        console.error('Error publishing message:', err);
      } else {
        // console.log('Message published successfully');
      }
    });
    mqttClient.publish('MYMQTTDRYER/DryingData',"", { qos: 2, retain: true }, (err) => {
      if (err) {
        console.error('Error publishing message:', err);
      } else {
        // console.log('Message published successfully');
      }
    });
    mqttClient.publish('MYMQTTDRYER/FinishData',"", { qos: 2, retain: true }, (err) => {
      if (err) {
        console.error('Error publishing message:', err);
      } else {
        // console.log('Message published successfully');
      }
    });
    mqttClient.publish('MYMQTTDRYER/TemperatureHumidityTopic',"", { qos: 2, retain: true }, (err) => {
      if (err) {
        console.error('Error publishing message:', err);
      } else {
        // console.log('Message published successfully');
      }
    });
    mqttClient.publish('MYMQTTDRYER/RecordTemperatureHumidityTopic',"", { qos: 2, retain: true }, (err) => {
      if (err) {
        console.error('Error publishing message:', err);
      } else {
        // console.log('Message published successfully');
      }
    });
    mqttClient.publish('MYMQTTDRYER/RecordPowerTopic',"", { qos: 2, retain: true }, (err) => {
      if (err) {
        console.error('Error publishing message:', err);
      } else {
        // console.log('Message published successfully');
      }
    });
    req.session.success = "Set 'Mode' to turn Off After Drying";
    res.redirect('/Control-Panel');
  } else {
    // console.log("Active timer not found.");
  }
});
app.post('/AddUser', upload.single('UserProfileImage'), async (req, res) => {
  try {
    const { FullName, UnivStudID, EmailAddress, PhoneNumber, Password, RoleSelect } = req.body;
    const imagePath = req.file ? req.file.path : null;
    const existingUser = await CreateProfilesModel.findOne({
      $or: [{ UnivStudID: UnivStudID }, { FullName: FullName}]
    });
    if (existingUser) {
      req.session.error = "Profile already exist! Check ID and Name";
      res.redirect('/Profile');
      return;
    } 
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
    await userProfile.save();
    const log = new ActivityLogModel({
      ActionBy: req.session.user.FullName,
      Action: "Added Profile",
      Description: req.session.user.FullName + " added profile with studentID " +"'"+UnivStudID+"'"
    }); 
    await log.save();

    req.session.success = "Added Profile";
    res.redirect('/Profile');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/login', async (req, res) => {
  try {
    const { StudUnivID, Password } = req.body;
    if (req.session.user) {
      return res.redirect('/Dashboard');
    }
    const user = await CreateProfilesModel.findOne({ UnivStudID: StudUnivID });
    if (user) {
      const isPasswordMatch = await bcrypt.compare(Password, user.SecurityKey);
      if (isPasswordMatch) {
        req.session.user = user;
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.redirect('/Dashboard');
      } else {
        req.session.error = 'Invalid ID or Password';
        res.redirect('/?invalidcredentials');
      }
    } else {
      req.session.error = 'Invalid ID or Password';
      res.redirect('/?invalidcredentials');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/');
  });
});
app.post('/EditUser/:id', upload.single('UserProfileImage'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { FullName, UnivStudID, EmailAddress, PhoneNumber, RoleSelect, UserProfileImage} = req.body;
    const user = await CreateProfilesModel.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    user.FullName = FullName;
    user.UnivStudID = UnivStudID;
    user.EmailAddress = EmailAddress;
    user.PhoneNumber = PhoneNumber;
    user.Role = RoleSelect;
    if (req.file) {
      user.ProfileImage = req.file.filename;
    }
    await user.save();
    const log = new ActivityLogModel({
      ActionBy: req.session.user.FullName,
      Action: "Edited Profile",
      Description: req.session.user.FullName + " edited profile with studentID " +"'"+user.UnivStudID+"'"
    }); 
    await log.save();
    req.session.success = "Edited Profile"
    res.redirect('/Profile');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/UpdateUser/:id', upload.single('NewUserProfileImage'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { FullName, UnivStudID, OldSecurityKey, SecurityKey, EmailAddress, PhoneNumber} = req.body;
    const user = await CreateProfilesModel.findById(userId);
    if (user) {
      if (OldSecurityKey && SecurityKey) {
        const isPasswordMatch = await bcrypt.compare(OldSecurityKey, user.SecurityKey);
        if (isPasswordMatch) {
          user.FullName = FullName;
          user.UnivStudID = UnivStudID;
          user.EmailAddress = EmailAddress;
          user.PhoneNumber = PhoneNumber;
          user.SecurityKey = SecurityKey;
          const imagePath = req.file ? req.file.path : null;
          if (req.file) {
            user.ProfileImage = imagePath;
          }
          await user.save();
          req.session.success = "Updated Profile and password is changed (Relogin!)"
          res.redirect('/');
        } else {
          req.session.error = "Old Password is incorrect"
          res.redirect('/');
        }
      } else if (!OldSecurityKey && !SecurityKey) {
          user.FullName = FullName;
          user.UnivStudID = UnivStudID;
          user.EmailAddress = EmailAddress;
          user.PhoneNumber = PhoneNumber;
          const imagePath = req.file ? req.file.path : null;
          if (req.file) {
              user.ProfileImage = imagePath;
          }
          await user.save();
          req.session.success = "Updated Profile (Relogin)"
          res.redirect('/');
      } else if (!OldSecurityKey !== !SecurityKey) {
        req.session.error = "If you wish to change password provide the New/Old Password"
        res.redirect('/');
      }
    } else if (!user) {
      req.session.error = "Unable to find your profile"
      res.redirect('/');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/DeleteUser/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await CreateProfilesModel.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    await user.deleteOne();
    const log = new ActivityLogModel({
      ActionBy: req.session.user.FullName,
      Action: "Deleted Profile",
      Description: req.session.user.FullName + " deleted profile with studentID " +"'"+user.UnivStudID+"'"
    });
    await log.save(); 
    req.session.error = "Deleted Profile";
    res.redirect('/Profile');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/SaveToMongo', async (req, res) => {
  try {
      const datalog = new ActivityLogModel(req.body); // Replace YourMongoModel with your actual Mongoose model
      await datalog.save();
      res.status(200).send('Data saved to MongoDB successfully');
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
cron.schedule('*/12 * * * *', async () => {
  try {
      const response = await axios.get('https://mqttdryer.onrender.com/');
      // console.log('Ping sent:', response.status);
  } catch (error) {
      console.error('Error sending ping:', error.message);
  }
});