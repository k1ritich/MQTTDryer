const bcrypt = require('bcrypt'); //For Encrypting Password
// This is for Backend That goes to MongoDB.
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TimerSchema = new Schema({
    UserName: {
        type: String,
        required: false
    },
    UserID: {
        type: String,
        required: false
    },
    UserProfPic: {
        type: String,
        required: false
    },
    DryingTitle: {
        type: String,
        required: false
    },
    ItemName: {
        type: String,
        required: false
    },
    ItemQuantity: {
        type: Number,
        required: false
    },
    TimeMode: {
        type: String,
        required: false
    },
    Status: {
        type: String,
        required: false
    },
    startTime: {
        type: Date,
        required: false
    },
    endTime: {
        type: Date,
        required: false
    }
}, { timestamps: false });

const RelayState = new Schema ({
    DryingID: {
        type: String,
        required: false
    },
    DryingMode: {
        type: String,
        required: false
    },
    RelayState: {
        type: String,
        required: false
    },
    DehumidifierRelayState: {
        type: String,
        required: false
    }
}, { timestamps: false });

const DryingDetailSchema = new Schema({
    // User Data
    DryingID: {
        type: String,
        required: false
    },
    ItemName: {
        type: String,
        required: false
    },
    ItemQuantity: {
        type: String, // it should be "Number"
        required: false
    },
    startTime: {
        type: Date,
        required: false
    },
    endTime: {
        type: Date,
        required: false
    },

    // Environment Data
    Humidity: {
        type: Number, // Assuming humidity is a number, adjust if necessary
        required: false
    },

    Temperature: {
        type: Number, // Assuming temperature is a number, adjust if necessary
        required: false
    },

    LightIntensity: {
        type: Number, // Assuming light is a number, adjust if necessary
        required: false
    },

    // Battery Power Information
    BattPower: {
        type: String, //
        required: false
    },
    BattPowerUsage: {
        type: String, // it should be "Number"
        required: false
    },
    BattPowerVoltage: {
        type: Number, // 
        required: false
    },
    BattPowerCurrent: {
        type: String, // it should be "Number"
        required: false
    },
    // Add battery-related properties here

    // Battery Power Information
    ACPower: {
        type: String, // 
        required: false 
    },
    ACPowerUsage: {
        type: String, // it should be "Number"
        required: false
    },
    ACPowerVoltage: {
        type: String, // it should be "Number"
        required: false
    },
    ACPowerCurrent: {
        type: String, // it should be "Number"
        required: false
    },
    // Add battery-related properties here
}, { timestamps: false });

const UserDetailSchema = new Schema({
    // User Data
    User: {
        type: String,
        required: false
    },
    Item: {
        type: String,
        required: false
    },
    StartTime: {
        type: String,
        required: false
    },
    EndTime: {
        type: String // Add other properties as needed
    },
}, { timestamps: false });

const SensorDataSchema = new Schema({
    // User Data
    UserName: {
      type: String,
      required: false,
    },
    UserID: {
      type: String,
      required: false,
    },
    Drying_id: {
      type: String,
      required: false,
    },
    UserProfPic: {
        type: String,
        required: false,
    },
    SubmitBy: {
        type: String,
        required: false,
    },
    DryingTitle: {
      type: String,
      required: false,
    },
    ItemName: {
      type: String,
      required: false,
    },
    ItemQuantity: {
      type: Number,
      required: false,
    },
    Status: {
      type: String,
      required: false,
    },
    startTime: {
      type: Date,
      required: false,
    },
    endTime: {
      type: Date,
      required: false,
    },
    stopTime: {
        type: Date,
        required: false,
    },
    TimeMode: {
      type: String,
      required: false,
    },
    Temperature: {
        type: [Number],
        required: false,
    },
    Humidity: {
        type: [Number],
        required: false,
    },
}, { timestamps: false });

const ESPDetails = new Schema({
    ItemName: {
        type: String,
        required: false
    },
    ItemQuantity: {
        type: Number,
        required: false
    },
    startTime: {
        type: Date,
        required: false
    },
    endTime: {
        type: Date,
        required: false
    }
});

const CreateProfile = new mongoose.Schema({
    CreatedBy: {
        type: String,
        required: false
    },
    CreatedByUserID: {
        type: String,
        required: false
    },
    FullName: {
        type: String,
        required: false
    },
    UnivStudID: {
        type: String,
        required: false
    },
    EmailAddress: {
        type: String,
        required: false
    },
    PhoneNumber: {
        type: Number,
        required: false
    },
    SecurityKey: {
        type: String,
        required: false
    },
    ProfileImage: {
        type: String,
    },
    Role: {
        type: String,
        required: false
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