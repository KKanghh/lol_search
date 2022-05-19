const Sequelize = require('sequelize');

module.exports = class Summoner extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            puuid: {
                type: Sequelize.STRING(78),
                allowNull: false,
                unique: true,
                primaryKey: true,
            },
            accountId: {
                type: Sequelize.STRING(56),
                allowNull: false,
                unique: true,
            },
            id: {
                type: Sequelize.STRING(63),
                allowNull: false,
                unique: true,
            },
            name: {
                type: Sequelize.STRING(16),
            },
            level: {
                type: Sequelize.INTEGER,
            },
            profileIcon: {
                type: Sequelize.INTEGER,
            }
        }, {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: "Summoner",
            tableName: 'summoners',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }

    static assoicate(db) {
        db.Summoner.hasMany(db.SummonerMatch);
    }
};