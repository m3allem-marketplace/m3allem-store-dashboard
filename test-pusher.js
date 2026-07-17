const Pusher = require('pusher');
try {
  const pusher = new Pusher({
    appId: undefined,
    key: undefined,
    secret: undefined,
    cluster: undefined,
    useTLS: true
  });
  console.log("Success");
} catch (e) {
  console.error("Error:", e.message);
}
