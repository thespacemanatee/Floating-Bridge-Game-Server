import { ObjectId } from 'mongodb';
import { Card, CardSuit, CardValue, PlayedCard } from '.';

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
  trump: TrumpSuit;
  level: BidLevel;
};

export type Partner = {
  userId: string;
  suit: CardSuit;
  value: CardValue;
};

export class Game {
  constructor(
    public roomId: string,
    public currentPosition: number,
    public latestBid: Bid,
    public bidSequence: Bid[],
    public isBidding: boolean,
    public partner: Partner,
    public isPartnerChosen: boolean,
    public hands: GameHand[],
    public playedCards: PlayedCard[],
    public _id?: ObjectId
  ) {}
}
