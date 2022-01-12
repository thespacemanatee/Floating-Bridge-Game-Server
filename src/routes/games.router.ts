import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { pusher } from '.';
import { Game } from '../models';
import { collections } from '../services/database.service';
import { assignHandsToPlayers, getValidHands } from '../models/Deck';
import { getChannelUsers, isBiddingOrWinningBid } from '../utils';

export const gamesRouter = express.Router();

gamesRouter.post('/init', async (req: Request, res: Response) => {
  try {
    const { roomId, userId } = req.body;
    const channelName = `presence-${roomId}`;
    const users = await getChannelUsers(pusher, channelName);
    const hands = getValidHands();
    const playerHands = assignHandsToPlayers(users, hands);
    const startPos = playerHands.findIndex((e) => e.userId === userId);
    const newGame = new Game(
      roomId,
      'started',
      startPos,
      'n',
      1,
      [],
      true,
      playerHands,
      []
    );
    const result = await collections.games.insertOne(newGame);

    if (result) {
      res
        .status(201)
        .send(`Successfully created a new game with id ${result.insertedId}`);
      const events = [
        {
          channel: channelName,
          name: 'game-init-event',
          data: {
            gameId: result.insertedId,
            ...newGame,
          },
        },
      ];
      pusher.triggerBatch(events);
    } else {
      res.status(500).send('Failed to create a new game.');
    }
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
});

gamesRouter.post('/bid', (req: Request) => {
  const { roomId, bid, bidSequence, currentPosition } = req.body;
  const channelName = `presence-${roomId}`;
  bidSequence.push(bid);
  const { winningBid, isBidding } = isBiddingOrWinningBid(bidSequence);
  pusher.trigger(channelName, 'game-bid-event', {
    bidSequence,
    nextPosition: (currentPosition + 1) % 4,
    isBidding,
    winningBid,
  });
});

gamesRouter.post('/turn', (req: Request) => {
  const { roomId, playCardPayload, currentPosition } = req.body;
  const channelName = `presence-${roomId}`;
  pusher.trigger(channelName, 'game-turn-event', {
    playCardPayload,
    nextPosition: (currentPosition + 1) % 4,
  });
});

gamesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const games = (await collections.games
      .find({})
      .toArray()) as unknown as Game[];

    res.status(200).send(games);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

gamesRouter.get('/:id', async (req: Request, res: Response) => {
  const id = req?.params?.id;

  try {
    const query = { _id: new ObjectId(id) };
    const game = (await collections.games.findOne(query)) as unknown as Game;

    if (game) {
      res.status(200).send(game);
    }
  } catch (error) {
    res
      .status(404)
      .send(`Unable to find matching document with id: ${req.params.id}`);
  }
});

gamesRouter.put('/:id', async (req: Request, res: Response) => {
  const id = req?.params?.id;

  try {
    const updatedGame: Game = req.body;
    const query = { _id: new ObjectId(id) };

    const result = await collections.games.updateOne(query, {
      $set: updatedGame,
    });

    if (result) {
      res.status(200).send(`Successfully updated game with id ${id}`);
    } else {
      res.status(304).send(`Game with id: ${id} not updated`);
    }
  } catch (error) {
    console.error(error.message);
    res.status(400).send(error.message);
  }
});

gamesRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params?.id;

  try {
    const query = { _id: new ObjectId(id) };
    const result = await collections.games.deleteOne(query);

    if (result && result.deletedCount) {
      res.status(202).send(`Successfully removed game with id ${id}`);
    } else if (!result) {
      res.status(400).send(`Failed to remove game with id ${id}`);
    } else if (!result.deletedCount) {
      res.status(404).send(`Game with id ${id} does not exist`);
    }
  } catch (error) {
    console.error(error.message);
    res.status(400).send(error.message);
  }
});
