import express from "express";
const app = express();
app.get('/', (req, res) => {
  res.send('Uptime Monitor API');
});
export default app;