const topic = [
    "MYMQTT/TemperatureTopic",
    "MYMQTT/HumidityTopic",
    "MYMQTT/LightTopic",
    "MYMQTT/VoltageTopic",
    "MYMQTT/VoltageTopic",
    "MYMQTT/RequestSourceTopic",
    "MYMQTT/SwitchSourceTopic",
    "MYMQTT/SourceModeTopic",
    "MYMQTT/RequestSourceModeTopic",
    "MYMQTT/SwitchSourceModeTopic",
  ];
  
  const mqttOptions = {
    host: process.env.MQTT_HOST,
    port: process.env.MQTT_PORT,
    clientId: process.env.MQTT_CLIENT_ID,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    protocol: process.env.MQTT_PROTOCOL,
    rejectUnauthorized: true,
    ca: [fs.readFileSync(process.env.MQTT_CA_PATH)],
  };
  
  const mqttClient = mqtt.connect(mqttOptions);
  
  
  mqttClient.on('connect', () => {
    console.log('Connected to HiveMQ Cloud');
  
    // Subscribe to multiple topics using a loop
    topic.forEach((currentTopic) => {
      mqttClient.subscribe(currentTopic, (err) => {
        if (!err) {
          console.log(`Subscribed to topic: ${currentTopic}`);
        }
      });
    });
  
    // Publish a message to a topic
    mqttClient.publish('your/topic', 'Hello, HiveMQ Cloud with Certificate!');
  });