function updateRemainingTime(endTime) {
  var intervalId = setInterval(() => {
    var currentDate = new Date();
    var remainingMillis = endTime - currentDate;

    // console.log('Remaining Milliseconds:', remainingMillis); // Add this line for debugging

    if (remainingMillis <= 0) {
      console.log('Drying process finished. Submitting the form.'); // Add this line for debugging

      // Timer has ended, submit the form
      // document.getElementById('finishDryingForm').submit(); remove comment to automatically submit the form
      window.location.href = '/Dashboard';
      clearInterval(intervalId); // Stop the interval
    } else {
      // Calculate and display remaining time
      var days = Math.floor(remainingMillis / (24 * 60 * 60 * 1000));
      var hours = Math.floor((remainingMillis % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      var minutes = Math.floor((remainingMillis % (60 * 60 * 1000)) / (60 * 1000));
      var seconds = Math.floor((remainingMillis % (60 * 1000)) / 1000);

      var timeRemainingElement = document.getElementById('timeRemaining');
      timeRemainingElement.innerHTML = `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
    }
  }, 1000);
}
