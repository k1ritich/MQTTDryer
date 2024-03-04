// MQTT settings
var mqttServer = "192.168.1.141";
var mqttPort = 9001;
var mqttUsername = "your_mqtt_username";
var mqttPassword = "your_mqtt_password";
var mqttClient = new Paho.MQTT.Client(mqttServer, mqttPort, "web_" + parseInt(Math.random() * 100, 10));

// MQTT topics 
var TemperatureTopic = "MYMQTT/TemperatureTopic"; // Client
var HumidityTopic = "MYMQTT/HumidityTopic"; // Client
var LightTopic = "MYMQTT/LightTopic"; // Client
var VoltageTopic = "MYMQTT/VoltageTopic"; // Client

var SourceTopic = "MYMQTT/SourceTopic"; // Client
var RequestSourceTopic = "MYMQTT/RequestSourceTopic"; // Arduino
var SwitchSourceTopic = "MYMQTT/SwitchSourceTopic"; // Arduino

var SourceModeTopic = "MYMQTT/SourceModeTopic"; // Client
var RequestSourceModeTopic = "MYMQTT/RequestSourceModeTopic"; //Arduino
var SwitchSourceModeTopic = "MYMQTT/SwitchSourceModeTopic"; //Arduino

// Connect to MQTT broker with username and password
mqttClient.connect({
    onSuccess: function () {
        console.log("Connected to MQTT broker");
        mqttClient.subscribe(TemperatureTopic);
        mqttClient.subscribe(HumidityTopic);
        mqttClient.subscribe(LightTopic);
        mqttClient.subscribe(VoltageTopic);
        mqttClient.subscribe(SourceTopic);
        mqttClient.subscribe(SourceModeTopic);

        // Request initial sensor data and power source after connecting
        mqttClient.send(RequestSourceTopic, "REQUEST_SOURCE");

        // Request initial sensor data and power source mode after connecting

        toggleButton();
    },
    onFailure: function (message) {
        console.log("Connection failed: " + message.errorMessage);
    },
    userName: mqttUsername,
    password: mqttPassword
});