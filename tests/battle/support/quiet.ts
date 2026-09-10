// Combat currently logs every hit. Keep assertions and errors visible.
if (!process.env.BATTLE_TEST_LOGS) console.log = () => {};
