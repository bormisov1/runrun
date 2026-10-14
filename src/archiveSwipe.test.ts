import assert from 'node:assert/strict';
import test from 'node:test';
import { archiveSwipeOutcome } from './archiveSwipe';

test('a full left swipe archives, while a shorter swipe reveals the action', () => {
  assert.equal(archiveSwipeOutcome(0, -210, -0.4, 320), 'archive');
  assert.equal(archiveSwipeOutcome(0, -75, -0.4, 320), 'open');
  assert.equal(archiveSwipeOutcome(0, -25, -0.8, 320), 'open');
  assert.equal(archiveSwipeOutcome(0, -25, 0, 320), 'close');
});

test('an opened row closes on a right swipe and can still complete a full swipe', () => {
  assert.equal(archiveSwipeOutcome(-96, 42, 0.6, 320), 'close');
  assert.equal(archiveSwipeOutcome(-96, -100, -0.3, 320), 'archive');
});
