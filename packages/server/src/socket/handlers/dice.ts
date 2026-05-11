import type { Server, Socket } from 'socket.io';
import { prisma } from '../../db/client';
import { roomManager } from '../roomManager';
import type { DiceRollResult, DiceType, ChatMessage } from '@dnd/shared';
import { DICE_SIDES } from '@dnd/shared';
import { nanoid, rollDice } from './utils';

interface RollPayload {
  dice: DiceType;
  count: number;
  modifier: number;
  advantage?: boolean;
  disadvantage?: boolean;
  isPrivate?: boolean;
  label?: string;
}

export function registerDiceHandlers(io: Server, socket: Socket): void {
  socket.on('dice:roll', async (payload: RollPayload) => {
    const found = roomManager.getUserRoom(socket.id);
    if (!found) return;
    const { sessionId, userId } = found;

    const room = roomManager.getRoom(sessionId);
    if (!room) return;

    const user = room.users.get(userId);
    if (!user) return;

    const sides = DICE_SIDES[payload.dice] ?? 20;
    const count = Math.min(Math.max(payload.count ?? 1, 1), 20);
    const modifier = Math.min(Math.max(payload.modifier ?? 0, -20), 20);

    let rolls = rollDice(count, sides);

    // Advantage/disadvantage applies to d20 single-die rolls
    if ((payload.advantage || payload.disadvantage) && count === 1 && payload.dice === 'd20') {
      const second = rollDice(1, sides);
      if (payload.advantage) {
        rolls = [Math.max(rolls[0], second[0])];
      } else {
        rolls = [Math.min(rolls[0], second[0])];
      }
    }

    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + modifier;

    const rollResult: DiceRollResult = {
      dice: payload.dice,
      count,
      modifier,
      rolls,
      total,
      advantage: payload.advantage,
      disadvantage: payload.disadvantage,
      label: payload.label,
    };

    const description = buildRollDescription(rollResult);

    const message: ChatMessage = {
      id: nanoid(),
      sessionId,
      userId,
      userName: user.name,
      userColor: user.color,
      content: description,
      type: 'roll',
      timestamp: Date.now(),
      roll: rollResult,
      isPrivate: payload.isPrivate && roomManager.isDM(sessionId, userId),
    };

    // Persist to DB (skip private GM rolls)
    if (!message.isPrivate) {
      await prisma.chatMessage.create({
        data: {
          id: message.id,
          sessionId,
          userId,
          userName: user.name,
          userColor: user.color,
          content: description,
          type: 'roll',
          rollData: rollResult as object,
          isPrivate: false,
        },
      });
    }

    if (message.isPrivate) {
      // Only visible to the roller (DM)
      socket.emit('dice:result', message);
    } else {
      io.to(sessionId).emit('dice:result', message);
    }
  });
}

function buildRollDescription(r: DiceRollResult): string {
  const diceStr = `${r.count}${r.dice}`;
  const modStr = r.modifier !== 0 ? (r.modifier > 0 ? ` + ${r.modifier}` : ` - ${Math.abs(r.modifier)}`) : '';
  const advStr = r.advantage ? ' (Advantage)' : r.disadvantage ? ' (Disadvantage)' : '';
  const label = r.label ? `${r.label}: ` : '';
  return `${label}${diceStr}${modStr}${advStr} = **${r.total}**`;
}
