const bcrypt = require('bcrypt'); //For Encrypting Password
// This is for Backend That goes to MongoDB.
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TimerSchema = new Schema({
    UserName: {
        type: String,
        required: true
    },
    UserID: {
        type: String,
        required: true
    },
    UserProfPic: {
        type: String,
        required: false
    },
    DryingTitle: {
        type: String,
        required: true
    },
    ItemName: {
        type: String,
        required: true
    },
    ItemQuantity: {
        type: Number,
        required: true
    },
    TimeMode: {
        type: String,
        required: true
    },
    Status: {
        type: String,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: false
    }
}, { timestamps: true });

const RelayState = new Schema ({
    DryingID: {
        type: String,
        required: true
    },
    DryingMode: {
        type: String,
        required: true
    },
    RelayState: {
        type: String,
        required: true
    },
    DehumidifierRelayState: {
        type: String,
        required: true
    }
}, { timestamps: true });

const DryingDetailSchema = new Schema({
    // User Data
    DryingID: {
        type: String,
        required: true
    },
    ItemName: {
        type: String,
        required: true
    },
    ItemQuantity: {
        type: String, // it should be "Number"
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },

    // Environment Data
    Humidity: {
        type: Number, // Assuming humidity is a number, adjust if necessary
        required: true
    },

    Temperature: {
        type: Number, // Assuming temperature is a number, adjust if necessary
        required: true
    },

    LightIntensity: {
        type: Number, // Assuming light is a number, adjust if necessary
        required: true
    },

    // Battery Power Information
    BattPower: {
        type: String, //
        required: true
    },
    BattPowerUsage: {
        type: String, // it should be "Number"
        required: true
    },
    BattPowerVoltage: {
        type: Number, // 
        required: true
    },
    BattPowerCurrent: {
        type: String, // it should be "Number"
        required: true
    },
    // Add battery-related properties here

    // Battery Power Information
    ACPower: {
        type: String, // 
        required: true 
    },
    ACPowerUsage: {
        type: String, // it should be "Number"
        required: true
    },
    ACPowerVoltage: {
        type: String, // it should be "Number"
        required: true
    },
    ACPowerCurrent: {
        type: String, // it should be "Number"
        required: true
    },
    // Add battery-related properties here
}, { timestamps: true });

const UserDetailSchema = new Schema({
    // User Data
    User: {
        type: String,
        required: true
    },
    Item: {
        type: String,
        required: true
    },
    StartTime: {
        type: String,
        required: true
    },
    EndTime: {
        type: String // Add other properties as needed
    },
}, { timestamps: true });

const SensorDataSchema = new Schema({
    // User Data
    UserName: {
      type: String,
      required: true,
    },
    UserID: {
      type: String,
      required: true,
    },
    Drying_id: {
      type: String,
      required: true,
    },
    UserProfPic: {
        type: String,
        required: false,
    },
    SubmitBy: {
        type: String,
        required: true,
    },
    DryingTitle: {
      type: String,
      required: true,
    },
    ItemName: {
      type: String,
      required: true,
    },
    ItemQuantity: {
      type: Number,
      required: true,
    },
    Status: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    stopTime: {
        type: Date,
        required: true,
    },
    TimeMode: {
      type: String,
      required: true,
    },
    Temperature: {
        type: [Number],
        required: true,
    },
    Humidity: {
        type: [Number],
        required: true,
    },
}, { timestamps: true });

const ESPDetails = new Schema({
    ItemName: {
        type: String,
        required: true
    },
    ItemQuantity: {
        type: Number,
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    }
});

const CreateProfile = new mongoose.Schema({
    CreatedBy: {
        type: String,
        required: true
    },
    CreatedByUserID: {
        type: String,
        required: true
    },
    FullName: {
        type: String,
        required: true
    },
    UnivStudID: {
        type: String,
        required: true
    },
    EmailAddress: {
        type: String,
        required: true
    },
    PhoneNumber: {
        type: Number,
        required: true
    },
    SecurityKey: {
        type: String,
        required: true
    },
    ProfileImage: {
        type: String,
    },
    Role: {
        type: String,
        required: true
    }
  });
  
  // Middleware to hash the password before saving
  CreateProfile.pre('save', async function (next) {
    try {
      // Hash the password only if it's modified or new
      if (this.isModified('SecurityKey') || this.isNew) {
        const salt1 = await bcrypt.genSalt(10);
        const hashedPassword1 = await bcrypt.hash(this.SecurityKey, salt1);
        this.SecurityKey = hashedPassword1;
      }
      next();
    } catch (error) {
      next(error);
    }
  });

// This Part -------------'||DryingDetails||'--------- is the collection name that goes to the MongoDatabase
// This Part -------------'||UserDetails||'--------- is the collection name that goes to the MongoDatabase
// Export both schemas as properties of an object

const Models = {
    DryingDetails: mongoose.model('DryingDetails', DryingDetailSchema),
    UserDetails: mongoose.model('UserDetails', UserDetailSchema),
    TimerDetails: mongoose.model('TimerDetails', TimerSchema), // Renamed to be consistent
    RelayStates: mongoose.model('RelayStates', RelayState), // Renamed to be consistent
    CreateProfiles: mongoose.model('Profiles', CreateProfile),
    

    SensorData: mongoose.model('SensorDatas', SensorDataSchema),
    ESPDetails: mongoose.model('ESPDetails', ESPDetails), // Renamed to be consistent
  };
module.exports = Models;