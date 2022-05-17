const Sequelize = require('sequelize');

const env = process.env.NODE_ENV || 'development';
const config = require('../config/config.json')[env];

const db = {};
const Match = require('./match');
const Summoner = require('./summoner');
const SummonerMatch = require('./summonerMatch');
const sequelize = new Sequelize(config.database, config.username, config.password, config);

db.sequelize = sequelize;
db.Match = Match;
db.Summoner = Summoner;
db.SummonerMatch = SummonerMatch;

Match.init(sequelize);
Summoner.init(sequelize);
SummonerMatch.init(sequelize);

Match.assoicate(db);
Summoner.assoicate(db);
SummonerMatch.assoicate(db);

module.exports = db;