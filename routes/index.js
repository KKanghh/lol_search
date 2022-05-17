const axios = require('axios');
const express = require('express');
const { Summoner, Match, SummonerMatch } = require('../models');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('index');
})

async function createSummonerByName(name) {
    await axios.get('https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/' + encodeURIComponent(name) + `?api_key=${process.env.api_key}`)
            .then(async res => {
                await Summoner.create({
                    name: res.data.name,
                    puuid: res.data.puuid,
                    accountId: res.data.accountId,
                    id: res.data.id,
                    level: res.data.summonerLevel,
                    profileIcon: res.data.profileIconId,
                });
            })
            .catch(err => {
                console.error('에러:', err);
                
            });
}

async function createSummonerByPuuid(puuid) {
    await axios.get('https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/' + puuid + `?api_key=${process.env.api_key}`)
            .then(async res => {
                const user = await Summoner.create({
                    name: res.data.name,
                    puuid: res.data.puuid,
                    accountId: res.data.accountId,
                    id: res.data.id,
                    level: res.data.summonerLevel,
                    profileIcon: res.data.profileIconId,
                })
                return user;
            })
            .catch(err => {
                console.error('에러:', err);
            });
}

router.get('/search', async (req, res, next) => {
    let matches = [];
    let summoner = await Summoner.findOne({
        where: { name: req.query.name }
    });
    if (!summoner) {
        await createSummonerByName(req.query.name);
        summoner = await Summoner.findOne({
            where: { name: req.query.name }
        });
    }

    await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/' + summoner.puuid + `/ids?start=0&count=5&api_key=${process.env.api_key}`)
        .then(async res => {
            matches = res.data;
            for (match of matches) {
                try {
                    const exMatch = await Match.findOne({
                        where: { id: match }
                    });
                    if (!exMatch) {
                        await Match.create({
                            id: match,
                        });
                    }
                }
                catch (err) {
                    console.error(err);
                    next(err);
                }
            }
        })
        .catch(err => {
            console.error(err);
        });

    for (match of matches) {
        const exMatch = await SummonerMatch.findAll({
            where: { 
                MatchId: match,
            }
        });
        console.log(match, exMatch.length);
        if (exMatch.length != 10) {
            await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/' + match + `?api_key=${process.env.api_key}`)
                .then(async res => {
                    for (let i = 0; i < 10; i++) {
                        const exUser = await Summoner.findOne({
                            where: { puuid: res.data.metadata.participants[i] }
                        });
                        if (!exUser) {
                            await createSummonerByPuuid(res.data.info.participants[i].puuid);
                        }
                        console.log(3);
                        const find = await SummonerMatch.findOne({
                            where: {
                                MatchId: match,
                                SummonerPuuid: res.data.info.participants[i].puuid,
                            }
                        });
                        console.log('find', find);
                        if (!find) {
                            await SummonerMatch.create({
                                MatchId: match,
                                SummonerPuuid: res.data.metadata.participants[i],
                                kill: res.data.info.participants[i].kills,
                                assist: res.data.info.participants[i].assists,
                                death: res.data.info.participants[i].deaths,
                                gold: res.data.info.participants[i].goldEarned,
                                item1: res.data.info.participants[i].item0,
                                item2: res.data.info.participants[i].item1,
                                item3: res.data.info.participants[i].item2,
                                item4: res.data.info.participants[i].item3,
                                item5: res.data.info.participants[i].item4,
                                item6: res.data.info.participants[i].item5,
                                item7: res.data.info.participants[i].item6,
                                team: res.data.info.participants[i].teamId.toString(),
                                champion: res.data.info.participants[i].championName,
                            })
                        }
                    }
                });
        }
    }
    const data = [];
    const mydata = await SummonerMatch.findAll({
        where: {
            SummonerPuuid: summoner.puuid
        },
        limit: 20,
        order: [['MatchId', 'DESC']],
    });
    for (let i = 0; i < 20; i++) {
        data.push(await SummonerMatch.findAll({
            where: {
                MatchId: mydata[i].MatchId,
            },
            order: [['team', 'ASC']],
            include: [{
                model: Summoner,
            }]
        }));
    }
    console.log(data);
    res.render('result', { matches: data, myInfo: mydata });

    // matches.forEach(async (el) => {
    //     await axios.get()
    // })
})

module.exports = router;