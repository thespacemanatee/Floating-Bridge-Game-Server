import express from 'express';
import { pusher } from '.';
import { assignHandsToPlayers, getValidHands } from '../models/Deck';
import { getChannelUsers, isBiddingOrWinningBid } from '../utils';

export const gameRouter = express.Router();

gameRouter.route('/game/init').post(async (req) => {
  const { channelName, userId } = req.body;
  const users = await getChannelUsers(pusher, channelName);
  const hands = getValidHands();
  const events = [
    {
      channel: channelName,
      name: 'game-status-event',
      data: { status: 'started' },
    },
    {
      channel: channelName,
      name: 'game-init-event',
      data: {
        startUserId: userId,
        hands: assignHandsToPlayers(users, hands),
        isBidding: true,
      },
    },
  ];
  pusher.triggerBatch(events);
});

gameRouter.route('/game/bid').post((req) => {
  const { channelName, bid, bidSequence, currentPosition } = req.body;
  bidSequence.push(bid);
  const { winningBid, isBidding } = isBiddingOrWinningBid(bidSequence);
  pusher.trigger(channelName, 'game-bid-event', {
    bidSequence,
    nextPosition: (currentPosition + 1) % 4,
    isBidding,
    winningBid,
  });
});

gameRouter.route('/game/turn').post((req) => {
  const { channelName, playCardPayload, currentPosition } = req.body;
  pusher.trigger(channelName, 'game-turn-event', {
    playCardPayload,
    nextPosition: (currentPosition + 1) % 4,
  });
});
