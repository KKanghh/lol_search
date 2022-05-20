const Sequelize = require('sequelize');

module.exports = class Match extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: Sequelize.STRING(15),
                primaryKey: true,
            },
            mode: {
                type: Sequelize.STRING(15),
            },
            duration: {
                type: Sequelize.INTEGER,
            },
            playerCount: {
                type: Sequelize.INTEGER,
            }
        }, {
            sequelize,
            timestamps: false,
            underscored: false,
            modelName: "Match",
            tableName: 'matchs',
            paranoid: false,
            charset: 'utf8',
            collate: 'utf8_general_ci',
        });
    }

    static assoicate(db) {
        db.Match.hasMany(db.SummonerMatch);
    }
};