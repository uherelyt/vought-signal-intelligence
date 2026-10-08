import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowAltarQuestion, formatAltarQuestion } from '../../lib/altar/petition-visibility.mjs';

test('operator shrine questions show by default, but can be private', () => {
  assert.equal(shouldShowAltarQuestion(true, undefined), true);
  assert.equal(shouldShowAltarQuestion(true, false), false);
  assert.equal(shouldShowAltarQuestion(true, true), true);
});

test('external guest questions are private unless explicitly shared', () => {
  assert.equal(shouldShowAltarQuestion(false, undefined), false);
  assert.equal(shouldShowAltarQuestion(false, false), false);
  assert.equal(shouldShowAltarQuestion(false, true), true);
});

test('displayed question preserves actual author, shrine target and full wording', () => {
  const visible = formatAltarQuestion('123456789012345678', 'Ah-Muzen-Cab I', '  Why does the hive remember?\nAnd who listens?  ');
  assert.equal(visible, '**Question from <@123456789012345678> to Ah-Muzen-Cab I:**\nWhy does the hive remember?\nAnd who listens?');
});

test('blank invocations are not mislabeled as user questions', () => {
  assert.equal(formatAltarQuestion('123456789012345678', 'Zeus', '   '), null);
  assert.equal(formatAltarQuestion('123456789012345678', 'Zeus', undefined), null);
});

test('oversized questions fail explicitly rather than silently truncating', () => {
  assert.throws(() => formatAltarQuestion('123456789012345678', 'Zeus', 'x'.repeat(1501)), /question_too_long/);
});
