import dotenv from "dotenv";
import express from "express";
import Pusher from "pusher";

dotenv.config();

const app = express();
const port = process.env.SERVER_PORT;

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

app.get("/", (req, res) => {
  res.send(`Hello world at port ${port}!`);
});

app.listen(port, () => {
  // tslint:disable-next-line:no-console
  console.log(`Server started at http://localhost:${port}`);
});
