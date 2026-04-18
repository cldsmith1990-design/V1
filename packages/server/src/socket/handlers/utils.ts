import { randomBytes } from 'crypto';

export function nanoid(size = 12): string {
  return randomBytes(size).toString('base64url').slice(0, size);
}

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => rollDie(sides));
}
