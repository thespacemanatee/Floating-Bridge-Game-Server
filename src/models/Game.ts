import { ObjectId } from 'mongodb';
import { Card, PlayedCard } from '.';

export type GameHand = {
  userId: string;
  hand: Card[];
};

export type PlayCardPayload = {
  userId: string;
  position: number;
  cardIndex: number;
};

export type TrumpSuit = 'c' | 'd' | 'h' | 's' | 'n';

export type BidLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Bid = {
  userId: string;
  suit: TrumpSuit;
  level: BidLevel;
};

export class Game {
  constructor(
    public roomId: string,
    public currentPosition: number,
    public trump: TrumpSuit,
    public level: BidLevel,
    public latestBid: Bid | null,
    public bidSequence: Bid[],
    public isBidding: boolean,
    public hands: GameHand[],
    public playedCards: PlayedCard[],
    public _id?: ObjectId
  ) {}
}
