import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, localTime, localToDate, nextDate } from '../src/time.js';

test('IPMA local times become instants, summer and winter, mainland and Azores', () => {
  // Summer: Lisbon UTC+1, Azores UTC+0.
  assert.equal(
    localToDate('2022-07-28T09:00:00', 'Europe/Lisbon').toISOString(),
    '2022-07-28T08:00:00.000Z',
  );
  assert.equal(
    localToDate('2022-07-28T09:00:00', 'Atlantic/Azores').toISOString(),
    '2022-07-28T09:00:00.000Z',
  );
  // Winter: Lisbon UTC+0, Azores UTC-1.
  assert.equal(
    localToDate('2022-01-15T09:00:00', 'Europe/Lisbon').toISOString(),
    '2022-01-15T09:00:00.000Z',
  );
  assert.equal(
    localToDate('2022-01-15T09:00:00', 'Atlantic/Azores').toISOString(),
    '2022-01-15T10:00:00.000Z',
  );
  // Just after the spring change (01:00 → 02:00 UTC+1 on 2022-03-27).
  assert.equal(
    localToDate('2022-03-27T03:00:00', 'Europe/Lisbon').toISOString(),
    '2022-03-27T02:00:00.000Z',
  );
  assert.equal(localToDate('garbage', 'Europe/Lisbon'), null);
});

test('the local date and time of an instant', () => {
  // 23:30 UTC in summer is already tomorrow in Lisbon, still today in the Azores.
  const instant = new Date('2022-07-28T23:30:00Z');
  assert.equal(localDate(instant, 'Europe/Lisbon'), '2022-07-29');
  assert.equal(localDate(instant, 'Atlantic/Azores'), '2022-07-28');
  assert.equal(localTime(instant, 'Europe/Lisbon'), '00:30');
  assert.equal(nextDate('2022-12-31'), '2023-01-01');
});
