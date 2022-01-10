import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import Pusher from "pusher";

import { getChannelUsers, getUserColor } from "./utils";
import { assignHandsToPlayers, getValidHands } from "./models/deck";

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

app.get("/", (_, res) => {
  res.send(`Hello world at port ${port}!`);
});

app.post("/pusher/auth", (req, res) => {
  let auth: Pusher.AuthResponse;
  const {
    socket_id: socketId,
    channel_name: channelName,
    username,
    userId,
  } = req.body;
  if (/^presence-/.test(channelName)) {
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

app.post("/game/init", async (req, _) => {
  const { channelName, userId } = req.body;
  const users = await getChannelUsers(pusher, channelName);
  const hands = getValidHands();
  const events = [
    {
      channel: channelName,
      name: "game-status-event",
      data: { status: "started" },
    },
    {
      channel: channelName,
      name: "game-init-event",
      data: {
        startUserId: userId,
        hands: assignHandsToPlayers(users, hands),
      },
    },
  ];
  pusher.triggerBatch(events);
});

const port = process.env.PORT || 5000;
app.listen(port);
