import express from 'express';
import Pusher from 'pusher';
import { getUserColor } from '../utils';

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export const pusherRouter = express.Router();

pusherRouter.route('/auth').post((req, res) => {
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
