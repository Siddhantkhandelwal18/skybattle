// SKYBATTLE — Database Seed Script
// Populates test data for local development
// Run: node seed.js

const { Client } = require('pg');
const bcrypt = require('bcrypt');

const client = new Client({
    connectionString: process.env.DATABASE_URL ||
        'postgresql://skybattle:localpass@localhost:5432/skybattle_dev'
});

async function seed() {
    await client.connect();
    console.log('✅ Connected to PostgreSQL for seeding');

    // Seed items catalog
    const items = [
        { type: 'CHARACTER_SKIN', name: 'Neon Ninja', rarity: 'EPIC', price: 1200, bp: false, weapon: null },
        { type: 'CHARACTER_SKIN', name: 'Desert Storm', rarity: 'RARE', price: 800, bp: false, weapon: null },
        { type: 'CHARACTER_SKIN', name: 'Robot Warrior', rarity: 'LEGENDARY', price: 2000, bp: true, weapon: null },
        { type: 'WEAPON_SKIN', name: 'Gold AR', rarity: 'RARE', price: 600, bp: false, weapon: 'ASSAULT_RIFLE' },
        { type: 'WEAPON_SKIN', name: 'Dragon Shotgun', rarity: 'EPIC', price: 1000, bp: false, weapon: 'SHOTGUN' },
        { type: 'WEAPON_SKIN', name: 'Electric SMG', rarity: 'EPIC', price: 900, bp: false, weapon: 'SMG' },
        { type: 'EMOTE', name: 'Victory Dance', rarity: 'RARE', price: 400, bp: false, weapon: null },
        { type: 'EMOTE', name: 'Taunt', rarity: 'COMMON', price: 200, bp: false, weapon: null },
        { type: 'KILL_EFFECT', name: 'Fire Explosion', rarity: 'EPIC', price: 600, bp: false, weapon: null },
        { type: 'KILL_EFFECT', name: 'Ice Shatter', rarity: 'RARE', price: 400, bp: false, weapon: null },
        { type: 'SPRAY_TAG', name: 'SKYBATTLE Logo', rarity: 'COMMON', price: 100, bp: false, weapon: null },
        { type: 'AVATAR', name: 'Pilot Ace', rarity: 'COMMON', price: 80, bp: false, weapon: null },
    ];

    for (const item of items) {
        await client.query(
            `INSERT INTO items_catalog (item_type, item_name, rarity, coin_price, is_battle_pass_item, weapon_type)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
            [item.type, item.name, item.rarity, item.price, item.bp, item.weapon]
        );
    }
    console.log(`  ✓ Seeded ${items.length} items to catalog`);

    // Seed test users
    const testUsers = [
        { name: 'SkyStar', email: 'skystar@test.com', elo: 1342, level: 24, coins: 1200, xp: 48200 },
        { name: 'JetAce', email: 'jetace@test.com', elo: 1380, level: 27, coins: 850, xp: 62000 },
        { name: 'RocketKing', email: 'rocketking@test.com', elo: 1190, level: 15, coins: 350, xp: 24000 },
        { name: 'SkyHunter', email: 'skyhunter@test.com', elo: 995, level: 8, coins: 120, xp: 8500 },
        { name: 'Legend01', email: 'legend01@test.com', elo: 2340, level: 75, coins: 5000, xp: 900000 },
        { name: 'AirKing', email: 'airking@test.com', elo: 1820, level: 55, coins: 2200, xp: 400000 },
        { name: 'NeonBlade', email: 'neonblade@test.com', elo: 1450, level: 31, coins: 700, xp: 100000 },
        { name: 'DualStrike', email: 'dualstrike@test.com', elo: 1250, level: 19, coins: 450, xp: 38000 },
        { name: 'TestAdmin', email: 'admin@test.com', elo: 1000, level: 1, coins: 999999, xp: 0 },
        { name: 'TestPlayer', email: 'player@test.com', elo: 1000, level: 1, coins: 500, xp: 0 },
    ];

    const passwordHash = await bcrypt.hash('Test1234!', 12);

    for (const user of testUsers) {
        const rankTier = getRankTier(user.elo);
        const result = await client.query(
            `INSERT INTO users (display_name, email, password_hash, region)
       VALUES ($1, $2, $3, 'ap-south-1')
       ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING user_id`,
            [user.name, user.email, passwordHash]
        );
        const userId = result.rows[0].user_id;

        await client.query(
            `INSERT INTO player_stats (user_id, elo_rating, rank_tier, coins, xp, level)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE 
       SET elo_rating = $2, rank_tier = $3, coins = $4, xp = $5, level = $6`,
            [userId, user.elo, rankTier, user.coins, user.xp, user.level]
        );
    }

    console.log(`  ✓ Seeded ${testUsers.length} test users`);
    console.log('\n📋 Test credentials (all use password: Test1234!):');
    testUsers.forEach(u => console.log(`    ${u.email} → ${u.name} (ELO: ${u.elo})`));
    console.log('\n✅ Seeding complete!');
    await client.end();
}

function getRankTier(elo) {
    if (elo >= 1800) return 'Legend';
    if (elo >= 1600) return 'Commander';
    if (elo >= 1400) return 'Elite';
    if (elo >= 1200) return 'Veteran';
    if (elo >= 1000) return 'Soldier';
    return 'Recruit';
}

seed().catch(err => {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
});
