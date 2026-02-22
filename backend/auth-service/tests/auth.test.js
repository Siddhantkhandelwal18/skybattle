// SKYBATTLE — Auth Service Unit Tests
'use strict';

const {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
} = require('../src/utils/jwt');

// Mock environment
process.env.JWT_ACCESS_SECRET = 'test_access_secret_for_unit_tests_only_min32chars__';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_for_unit_tests_only_min32chars_';
process.env.JWT_ACCESS_EXPIRY = '900';
process.env.JWT_REFRESH_EXPIRY = '2592000';

describe('JWT Utilities', () => {
    const payload = { userId: 'test-user-uuid', displayName: 'TestPlayer' };

    test('generates valid access token', () => {
        const token = generateAccessToken(payload);
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
    });

    test('access token verifies correctly', () => {
        const token = generateAccessToken(payload);
        const decoded = verifyAccessToken(token);
        expect(decoded.userId).toBe(payload.userId);
        expect(decoded.displayName).toBe(payload.displayName);
    });

    test('generates distinct access and refresh tokens', () => {
        const access = generateAccessToken(payload);
        const refresh = generateRefreshToken(payload);
        expect(access).not.toBe(refresh);
    });

    test('invalid access token throws error', () => {
        expect(() => verifyAccessToken('invalid.token.here')).toThrow();
    });
});

describe('Display Name Validation', () => {
    const validateName = (name) => /^[a-zA-Z0-9_]{3,32}$/.test(name);

    test('accepts valid display names', () => {
        expect(validateName('SkyStar')).toBe(true);
        expect(validateName('Player_01')).toBe(true);
        expect(validateName('JetAce123')).toBe(true);
        expect(validateName('ABC')).toBe(true);
    });

    test('rejects invalid display names', () => {
        expect(validateName('AB')).toBe(false);          // too short
        expect(validateName('Has Space')).toBe(false);   // spaces not allowed
        expect(validateName('special!')).toBe(false);    // special chars not allowed
        expect(validateName('')).toBe(false);             // empty
        expect(validateName('a'.repeat(33))).toBe(false); // too long
    });
});

describe('ELO Rank Tier', () => {
    const getRankTier = (elo) => {
        if (elo >= 1800) return 'Legend';
        if (elo >= 1600) return 'Commander';
        if (elo >= 1400) return 'Elite';
        if (elo >= 1200) return 'Veteran';
        if (elo >= 1000) return 'Soldier';
        return 'Recruit';
    };

    test('correctly assigns rank tiers', () => {
        expect(getRankTier(2400)).toBe('Legend');
        expect(getRankTier(1800)).toBe('Legend');
        expect(getRankTier(1700)).toBe('Commander');
        expect(getRankTier(1500)).toBe('Elite');
        expect(getRankTier(1300)).toBe('Veteran');
        expect(getRankTier(1100)).toBe('Soldier');
        expect(getRankTier(900)).toBe('Recruit');
        expect(getRankTier(0)).toBe('Recruit');
    });
});
