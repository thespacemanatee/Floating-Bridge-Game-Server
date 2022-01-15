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
import { getRoundWinner, isBidding } from '../utils';

export const gamesRouter = express.Router();

type InitPayload = {
  roomId: string;
  userId: string;
  players: Player[];
};

gamesRouter.post('/init', async (req: Request, res: Response) => {
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
      res
        .status(201)
        .send(`Successfully created a new game with id ${result.insertedId}`);
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
    } else {
      res.status(500).send('Failed to create a new game.');
    }
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
});

type BidPayload = {
  gameId: string;
  bid: Bid;
};

gamesRouter.post('/bid', async (req: Request, res: Response) => {
  const { gameId, bid }: BidPayload = req.body;
  const query = { _id: new ObjectId(gameId) };

  try {
    const game = (await collections.games.findOne(query)) as unknown as Game;

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
    res.status(400).send(error.message);
  }
});

type PartnerPayload = {
  gameId: string;
  partner: {
    suit: CardSuit;
    value: CardValue;
  };
};

gamesRouter.post('/partner', async (req: Request, res: Response) => {
  const { gameId, partner }: PartnerPayload = req.body;
  const query = { _id: new ObjectId(gameId) };

  try {
    const game = (await collections.games.findOne(query)) as unknown as Game;

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
    res.status(400).send(error.message);
  }
});

type TurnPayload = {
  gameId: string;
  playCardPayload: PlayCardPayload;
};

gamesRouter.post('/turn', async (req: Request, res: Response) => {
  const { gameId, playCardPayload }: TurnPayload = req.body;
  const query = { _id: new ObjectId(gameId) };

  try {
    const game = (await collections.games.findOne(query)) as unknown as Game;

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
      res
        .status(200)
        .send(`Successfully updated partner for game with id ${gameId}`);
    } else {
      res.status(304).send(`Game with id: ${gameId} not updated`);
    }
  } catch (error) {
    console.error(error);
    res.status(400).send(error.message);
  }
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
