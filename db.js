const axios = require("axios");
const { sequelize, Match } = require("./models");
const dotenv = require('dotenv');

dotenv.config();


sequelize.sync({ force: false })
    .then(() => {
        console.log('데이터베이스 연결 성공');
    })
    .catch((err) => {
        console.error(err);
    });

Match.findAll({})
    .then(async matches => {
        for (let match of matches) {
            // console.log(match);
            const result = await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/' + match.id + `?api_key=${process.env.api_key}`);
            console.log(result.data.info.gameCreation);
            Match.update({
                gameCreation: result.data.info.gameCreation,
            }, {
                where: { id: match.id }
            })
        }
    })
    .catch(err => {
        console.error(err);
    })