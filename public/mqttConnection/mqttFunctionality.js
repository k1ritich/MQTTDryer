mqttClient.onConnectionLost = onConnectionLost;
    mqttClient.onMessageArrived = onMessageArrived;

    function onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log("Connection lost: " + responseObject.errorMessage);
        }
    }
    
    let sourceValue; // Declare a variable to store the SourceValue

    function onMessageArrived(message) {
        switch (message.destinationName) {
            case TemperatureTopic:
                document.getElementById("Temperature").value = message.payloadString;
                break;
            case HumidityTopic:
                document.getElementById("Humidity").value = message.payloadString;
                break;
            case LightTopic:
                document.getElementById("LightIntensity").value = message.payloadString;
                break;
            case VoltageTopic:
                document.getElementById("BattPowerVoltage").value = message.payloadString;
                break;
            case SourceTopic:
                // Update the value of the HTML element with the id "SourceValue"
                document.getElementById("BattPower").value = message.payloadString;
                // Store the SourceValue in the variable
                sourceValue = message.payloadString;
                // Call the changeColor function with the appropriate button index
                if (sourceValue === 'OFF') {
                    document.getElementById("BattPower").value = message.payloadString;
                    document.getElementById("ACPower").value = message.payloadString;
                    handleSourceMessage(message.payloadString)
                } else if (sourceValue === 'BATTERY') {
                    document.getElementById("ACPower").value = "OFF";
                    document.getElementById("BattPower").value = message.payloadString;
                    handleSourceMessage(message.payloadString)
                    console.log(message.payloadString)
                } else if (sourceValue === 'AC') {
                    document.getElementById("BattPower").value = "OFF";
                    document.getElementById("ACPower").value = message.payloadString;
                    handleSourceMessage(message.payloadString)
                    console.log(message.payloadString)
                }
                break;
        }
    }
    
    // Now you can use the sourceValue variable elsewhere in your code if needed.


function SwitchSource(clickedButton) {
    // Send MQTT message when Battery or AC button is clicked
    var buttonType = clickedButton.id === 'batterybutton' ? 'SOLAR' : 'AC';
    var message = buttonType;
    mqttClient.send(SwitchSourceTopic, message);
}

function toggleButton() {
    if (mqttClient.isConnected()) { // Check if the client is connected

        // Enable or disable the AC and Battery buttons based on the selected mode
        document.getElementById('acbutton').disabled = (document.getElementById('mode').value === "AUTOMATIC");
        document.getElementById('batterybutton').disabled = (document.getElementById('mode').value === "AUTOMATIC");

        // Send the selected mode to MQTT
        mqttClient.send(SourceModeTopic, document.getElementById('mode').value);
    } else {
        console.error("MQTT client is not connected.");
    }
}

function handleSourceMessage(source) {
    var acButton = document.getElementById('acbutton');
    var batteryButton = document.getElementById('batterybutton');

    // Update the background color of the AC and Battery buttons
    if (source === 'AC') {
        acli.style.backgroundColor = '#800000'; // Change this to your desired color
        batli.style.backgroundColor = ''; // Reset battery button color
    } else if (source === 'BATTERY') {
        batli.style.backgroundColor = '#800000'; // Change this to your desired color
        acli.style.backgroundColor = ''; // Reset AC button color
    } else if (source === 'OFF'){
        // Handle other cases or reset both buttons if needed
        acli.style.backgroundColor = '';
        batli.style.backgroundColor = '';
    }
}

function handleModeMessage(mode) {
    var modeSelect = document.getElementById('mode');
    var acButton = document.getElementById('acbutton');
    var batteryButton = document.getElementById('batterybutton');

    modeSelect.value = mode;

    // Enable or disable the AC and Battery buttons based on the mode
    acButton.disabled = (mode === 'AUTOMATIC');
    batteryButton.disabled = (mode === 'AUTOMATIC');
}