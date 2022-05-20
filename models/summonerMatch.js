const Sequelize = require('sequelize');

module.exports = class SummonerMatch extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            kill: {
                type: Sequelize.INTEGER,
            },
            death: {
                type: Sequelize.INTEGER,
            },
            assist: {
                type: Sequelize.INTEGER,
            },
            gold: {
                type: Sequelize.INTEGER,
            },
            item1: {
                type: Sequelize.INTEGER,
            },
            item2: {
                type: Sequelize.INTEGER,
            },
            item3: {
                type: Sequelize.INTEGER,
            },
            item4: {
                type: Sequelize.INTEGER,
            },
            item5: {
                type: Sequelize.INTEGER,
            },
            item6: {
                type: Sequelize.INTEGER,
            },
            item7: {
                type: Sequelize.INTEGER,
            },
            team: {
                type: Sequelize.ENUM(['100', '200']),
            },
            champion: {
                type: Sequelize.STRING(20),
            },
            win: {
                type: Sequelize.BOOLEAN,
            }
        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: "SummonerMatch",
            tableName: 'summonermatchs',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }

    static assoicate(db) {
        db.SummonerMatch.belongsTo(db.Summoner);
        db.SummonerMatch.belongsTo(db.Match);
    }
};