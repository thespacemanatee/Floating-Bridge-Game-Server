import express, { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { pusher } from '.';
import { collections } from '../services/database.service';
import {
  Bid,
  Game,
  PlayCardPayload,
  assignHandsToPlayers,
  CardSuit,
  CardValue,
  getValidHands,
  Card,
  Player,
  PlayedCard,
} from '../models';
import { getChannelUsers, getRoundWinner, isBidding } from '../utils';

export const gamesRouter = express.Router();

type InitPayload = {
  roomId: string;
  userId: string;
  players: Player[];
};

gamesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const games = (await collections.games.find({}).toArray()) as Game[];

    res.status(200).send(games);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

gamesRouter.post('/', async (req: Request, res: Response) => {
  const { roomId, userId, players }: InitPayload = req.body;
  const channelName = `presence-${roomId}`;

  try {
    const hands = getValidHands();
    const playersData = assignHandsToPlayers(players, hands);
    const startPos = playersData.findIndex((e) => e.id === userId);
    const newGame = new Game(
      roomId,
      playersData,
      0,
      startPos,
      null,
      [],
      true,
      null,
      false,
      []
    );
    const result = await collections.games.insertOne(newGame);

    if (result) {
      const events = [
        {
          channel: channelName,
          name: 'game-status-event',
          data: {
            status: 'started',
          },
        },
        {
          channel: channelName,
          name: 'game-init-event',
          data: {
            gameId: result.insertedId,
            gameData: newGame,
          },
        },
      ];
      pusher.triggerBatch(events);
      res
        .status(201)
        .send(`Successfully created a new game with id ${result.insertedId}`);
    } else {
      res.status(400).send('Failed to create a new game.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

type ResumePayload = {
  roomId: string;
};

gamesRouter.post('/:gameId', async (req: Request, res: Response) => {
  const gameId = req?.params?.gameId;
  const { roomId }: ResumePayload = req.body;
  const channelName = `presence-${roomId}`;
  const players = (await getChannelUsers(pusher, channelName)).map((e) => e.id);

  try {
    const query = { _id: new ObjectId(gameId), roomId };
    const game = (await collections.games.findOne(query)) as Game;

    if (game) {
      const existingGame = game.players.every((thisPlayer) =>
        players.some((otherPlayerId) => thisPlayer.id === otherPlayerId)
      );

      if (existingGame) {
        res.status(200).send(game);
      } else {
        res
          .status(403)
          .send(
            `Existing game with id: ${req.params.id} found but invalid players.`
          );
      }
    } else {
      res.status(404).send(`Failed to find an ongoing game with id ${gameId}.`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

gamesRouter.post('/resume/:gameId', async (req: Request, res: Response) => {
  const gameId = req?.params?.gameId;
  const { roomId }: ResumePayload = req.body;
  const channelName = `presence-${roomId}`;
  const players = (await getChannelUsers(pusher, channelName)).map((e) => e.id);

  try {
    const query = { _id: new ObjectId(gameId), roomId };
    const game = (await collections.games.findOne(query)) as Game;

    if (game) {
      const existingGame = game.players.every((thisPlayer) =>
        players.some((otherPlayerId) => thisPlayer.id === otherPlayerId)
      );

      if (existingGame) {
        const events = [
          {
            channel: channelName,
            name: 'game-status-event',
            data: {
              status: 'started',
            },
          },
          {
            channel: channelName,
            name: 'game-turn-event',
            data: {
              gameData: game,
            },
          },
        ];
        pusher.triggerBatch(events);
        res.status(200).send(game);
      } else {
        res
          .status(403)
          .send(
            `Existing game with id: ${req.params.id} found but invalid players.`
          );
      }
    } else {
      res.status(404).send(`Failed to find an ongoing game with id ${gameId}.`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

type BidPayload = {
  bid: Bid;
};

gamesRouter.post('/bid/:gameId', async (req: Request, res: Response) => {
  const gameId = req?.params?.gameId;
  const { bid }: BidPayload = req.body;

  try {
    const query = { _id: new ObjectId(gameId) };
    const game = (await collections.games.findOne(query)) as Game;

    if (game) {
      const { roomId, players, currentPosition, latestBid, bidSequence } = game;

      bidSequence.push(bid);
      const bidding = isBidding(bidSequence);

      const nextPosition = bidding
        ? (currentPosition + 1) % players.length
        : (players.findIndex((e) => e.id === latestBid?.userId) + 1) %
          players.length;
      const result = await collections.games.findOneAndUpdate(
        query,
        {
          $set: {
            currentPosition: nextPosition,
            bidSequence,
            isBidding: bidding,
            ...(bid && { latestBid: bid }),
            isTrumpBroken: latestBid?.trump === 'n',
          },
        },
        { returnDocument: 'after' }
      );
      if (result) {
        const channelName = `presence-${roomId}`;
        const gameData = result.value as Game;
        pusher.trigger(channelName, 'game-turn-event', {
          gameData,
        });
      }
      res
        .status(200)
        .send(`Successfully updated bid for game with id ${gameId}`);
    } else {
      res.status(304).send(`Game with id: ${gameId} not updated`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

type PartnerPayload = {
  partner: {
    suit: CardSuit;
    value: CardValue;
  };
};

gamesRouter.post('/partner/:gameId', async (req: Request, res: Response) => {
  const gameId = req?.params?.gameId;
  const { partner }: PartnerPayload = req.body;

  try {
    const query = { _id: new ObjectId(gameId) };
    const game = (await collections.games.findOne(query)) as Game;

    if (game) {
      const { roomId, players } = game;
      let partnerId: string;
      players.forEach((player) => {
        const isPartner = player.hand.some(
          (card) => card.suit === partner.suit && card.value === partner.value
        );
        if (isPartner) {
          partnerId = player.id;
        }
      });

      const result = await collections.games.findOneAndUpdate(
        query,
        {
          $set: {
            partner: {
              userId: partnerId,
              ...partner,
            },
          },
        },
        { returnDocument: 'after' }
      );
      if (result) {
        const channelName = `presence-${roomId}`;
        const gameData = result.value as Game;
        pusher.trigger(channelName, 'game-turn-event', {
          gameData,
        });
      }
      res
        .status(200)
        .send(`Successfully updated partner for game with id ${gameId}`);
    } else {
      res.status(304).send(`Game with id: ${gameId} not updated`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

type TurnPayload = {
  gameId: string;
  playCardPayload: PlayCardPayload;
};

gamesRouter.post('/turn/:gameId', async (req: Request, res: Response) => {
  const gameId = req?.params?.gameId;
  const { playCardPayload }: TurnPayload = req.body;

  try {
    const query = { _id: new ObjectId(gameId) };
    const game = (await collections.games.findOne(query)) as Game;

    if (game) {
      const {
        roomId,
        players,
        currentPosition,
        latestBid,
        isTrumpBroken,
        playedCards,
      } = game;
      const newIsTrumpBroken =
        isTrumpBroken || latestBid.trump === playCardPayload.card.suit;
      let playedCard: Card;
      players.forEach((player) => {
        if (player.id === playCardPayload.userId) {
          [playedCard] = player.hand.splice(
            player.hand.findIndex(
              (card) =>
                card.suit === playCardPayload.card.suit &&
                card.value === playCardPayload.card.value
            ),
            1
          );
        }
      });

      let nextPosition = (currentPosition + 1) % players.length;
      const playedCardData: PlayedCard = {
        playedBy: playCardPayload.userId,
        ...playedCard,
      };
      let nextRound = false;
      if (playedCards.push(playedCardData) === players.length) {
        nextRound = true;
        const userId = getRoundWinner(playedCards, latestBid.trump).playedBy;
        nextPosition = players.findIndex((player) => player.id === userId);
        players
          .find((player) => player.id === userId)
          .sets.push([...playedCards]);
        playedCards.length = 0;
      }
      const result = await collections.games.findOneAndUpdate(
        query,
        {
          $set: {
            players,
            currentPosition: nextPosition,
            playedCards,
            isTrumpBroken: newIsTrumpBroken,
          },
          ...(nextRound && {
            $inc: {
              roundNo: 1,
            },
          }),
        },
        { returnDocument: 'after' }
      );
      if (result) {
        const channelName = `presence-${roomId}`;
        const gameData = result.value as Game;
        pusher.trigger(channelName, 'game-turn-event', {
          gameData,
        });
      }
      res.status(200).send(`Successfully updated game with id ${gameId}`);
    } else {
      res.status(304).send(`Game with id: ${gameId} not updated`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});
