import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import Pusher from "pusher";

import { getUserColor } from "./utils/utils";

dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

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

app.post("/pusher/auth", (req, res) => {
  let auth: Pusher.AuthResponse;
  const { socket_id: socketId, channel_name: channelName, username } = req.body;
  if (/^presence-/.test(channelName)) {
    const userId = `user-${new Date().toISOString()}`;
    const presenceData = {
      user_id: userId,
      user_info: {
        username,
        color: getUserColor(userId),
      },
    };
    auth = pusher.authenticate(socketId, channelName, presenceData);
  } else {
    auth = pusher.authenticate(socketId, channelName);
  }
  res.send(auth);
});

const port = process.env.PORT || 5000;
app.listen(port);
