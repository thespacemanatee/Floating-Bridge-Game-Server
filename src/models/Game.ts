import { ObjectId } from 'mongodb';
import { Card, CardSuit, CardValue, PlayedCard } from '.';

export type PlayCardPayload = {
  userId: string;
  card: Card;
};

export type Trump = 'c' | 'd' | 'h' | 's' | 'n';

export type BidLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Bid = {
  userId: string;
  trump: Trump;
  level: BidLevel;
};

export type Partner = {
  userId: string;
  suit: CardSuit;
  value: CardValue;
};

export interface Player {
  id: string;
  info: {
    username: string;
    color: string;
  };
}

export interface PlayerData extends Player {
  hand: Card[];
  sets: PlayedCard[][];
}

export class Game {
  constructor(
    public roomId: string,
    public players: PlayerData[],
    public currentPosition: number,
    public latestBid: Bid,
    public bidSequence: Bid[],
    public isBidding: boolean,
    public partner: Partner,
    public isPartnerChosen: boolean,
    public isTrumpBroken: boolean,
    public playedCards: PlayedCard[],
    public _id?: ObjectId
  ) {}
}
