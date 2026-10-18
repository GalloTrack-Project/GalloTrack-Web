import { describe, it, expect } from 'vitest';
import {
  isBirdCodeUniqueViolation,
  isChickenCodeUniqueViolation,
  DB_UPDATE_NEEDED_MESSAGE,
} from './fowl-service';

describe('fowl-service: isBirdCodeUniqueViolation', () => {
  it('detects Postgres 23505 with fowl_user_bird_code_key index in message', () => {
    const errorObj = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "fowl_user_bird_code_key"',
      details: 'Key (user_id, bird_code)=(123, 1A1) already exists.',
    };
    expect(isBirdCodeUniqueViolation(errorObj)).toBe(true);
    expect(isChickenCodeUniqueViolation(errorObj)).toBe(true);
  });

  it('detects Postgres 23505 with bird_code in details', () => {
    const errorObj = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
      details: 'Key (user_id, bird_code)=(abc, 2) already exists.',
    };
    expect(isBirdCodeUniqueViolation(errorObj)).toBe(true);
    expect(isChickenCodeUniqueViolation(errorObj)).toBe(true);
  });

  it('detects string error messages containing fowl_user_bird_code_key', () => {
    const errorStr = 'duplicate key value violates unique constraint "fowl_user_bird_code_key"';
    expect(isBirdCodeUniqueViolation(errorStr)).toBe(true);
    expect(isChickenCodeUniqueViolation(errorStr)).toBe(true);
  });

  it('detects legacy fowl_user_chicken_code_key for backward compatibility', () => {
    const errorStr = 'duplicate key value violates unique constraint "fowl_user_chicken_code_key"';
    expect(isBirdCodeUniqueViolation(errorStr)).toBe(true);
    expect(isChickenCodeUniqueViolation(errorStr)).toBe(true);
  });

  it('does NOT trigger for unique violations on other columns/indexes (e.g. wing_band)', () => {
    const wingBandError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "fowl_user_wing_band_key"',
      details: 'Key (user_id, wing_band)=(123, WB-001) already exists.',
    };
    expect(isBirdCodeUniqueViolation(wingBandError)).toBe(false);
    expect(isChickenCodeUniqueViolation(wingBandError)).toBe(false);
  });

  it('does NOT trigger for other postgres error codes (e.g. 42703 undefined column)', () => {
    const missingColError = {
      code: '42703',
      message: 'column "declared_composition" does not exist',
    };
    expect(isBirdCodeUniqueViolation(missingColError)).toBe(false);
  });

  it('returns false for null, undefined, or empty error', () => {
    expect(isBirdCodeUniqueViolation(null)).toBe(false);
    expect(isBirdCodeUniqueViolation(undefined)).toBe(false);
    expect(isBirdCodeUniqueViolation('')).toBe(false);
  });

  it('exports DB_UPDATE_NEEDED_MESSAGE with the specified user-facing text', () => {
    expect(DB_UPDATE_NEEDED_MESSAGE).toBe(
      'This feature needs a database update. Please contact the administrator.'
    );
  });
});
