const axios = require('axios');
const express = require('express');
const { Summoner, Match, SummonerMatch } = require('../models');

const router = express.Router();

router.get('/', (req, res) => {
    return res.render('index');
})

async function createSummonerByName(name) {
    try {
        const result = await axios.get('https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/' + encodeURIComponent(name) + `?api_key=${process.env.api_key}`);
        const playerData = result.data;
        console.log('가져온 데이터:', playerData);
        return await Summoner.create({
            name: playerData.name,
            searchName: playerData.name.replace(/ /gi, '').toLowerCase(),
            puuid: playerData.puuid,
            accountId: playerData.accountId,
            id: playerData.id,
            level: playerData.summonerLevel,
            profileIcon: playerData.profileIconId,
        });
    } catch(err) {
        console.error('hello');
        throw err;
    }
}

async function createSummonerByPuuid(puuid) {
    try {
        const result = await axios.get('https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/' + puuid + `?api_key=${process.env.api_key}`);
        const playerData = result.data;
        console.log(playerData);
        await Summoner.create({
            name: playerData.name,
            searchName: playerData.name.replace(/ /gi, '').toLowerCase(),
            puuid: playerData.puuid,
            accountId: playerData.accountId,
            id: playerData.id,
            level: playerData.summonerLevel,
            profileIcon: playerData.profileIconId,
        });
    } catch(err) {
        console.error(err);
        throw err;
    }
}

router.route('/summoner')
    .get(async (req, res, next) => {
        res.locals.name = req.query.name;
        const summoner = await Summoner.findOne({
            where: { searchName: req.query.name.replace(/ /gi, '').toLowerCase() }
        });

        const data = [];
        const playerMatches = await SummonerMatch.findAll({
            where: {
                SummonerPuuid: summoner.puuid,
            },
            include: [{
                model: Match,
            }],
            attributes: [ 'MatchId' ],
            order: [['Match', 'gameCreation', 'DESC']],
        });
        for (let match of playerMatches) {
            console.log(match.Match.gameCreation);
        }
        for (let i = 0; i < playerMatches.length; i++) {
            const match = {};
            match.mydata = await SummonerMatch.findOne({
                where: {
                    SummonerPuuid: summoner.puuid,
                    MatchId: playerMatches[i].MatchId,
                },
                include: [{
                    model: Match,
                }]
            });
            match.matchInfo = await SummonerMatch.findAll({
                where: {
                    MatchId: match.mydata.MatchId,
                },
                order: [['team', 'ASC']],
                include: [{
                    model: Summoner,
                }]
            })
            data.push(match);
        }
        return res.render('result', { matches: data });
    })
    .post(async (req, res, next) => {
        let summoner;
        console.log('req: ', req);
        try {
            const name = req.body.name.replace(/ /gi, '').toLowerCase();
            console.log(name);
            summoner = await Summoner.findOne({ // 검색한 소환사 정보 저장 & 불러오기
                where: { searchName: name }
            });
            if (!summoner) {
                summoner = await createSummonerByName(name);
            }
            return res.redirect(`/summoner?name=${req.body.name}`);
        } catch (err) {
            if (err.response.status === 404) {
                return res.redirect(`/?searchError=${req.body.name}을 찾을 수 없습니다.`);
            }
            console.error(err);
            return next(err);
        }
    });

router.post('/match', async (req, res, next) => {
    let matches = [];
    const summoner = await Summoner.findOne({
        where: { searchName: req.body.name.replace(/ /gi, '').toLowerCase(), }
    });
    console.log('POST /match: ', req.body.name, summoner);
    try {
        const result = await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/' + summoner.puuid + `/ids?start=0&count=8&api_key=${process.env.api_key}`);
        matches = result.data;
        for (let match of matches) {
            const exMatch = await Match.findOne({
                where: { id: match }
            });
            if (!exMatch) {
                let mode, duration, playerCount, gameCreation;
                const result = await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/' + match + `?api_key=${process.env.api_key}`);
                const matchDataByPuuid = result.data;
                mode = matchDataByPuuid.info.gameMode;
                duration = matchDataByPuuid.info.gameDuration;
                gameCreation = matchDataByPuuid.info.gameCreation;
                playerCount = matchDataByPuuid.metadata.participants.length;
                await Match.create({
                    id: match,
                    gameCreation,
                    mode,
                    duration,
                    playerCount,
                });
            }
        }
        
    } catch(err) {
        console.error(err);
        return next(err);
    }

    for (let match of matches) {
            const matchPlayersData = await SummonerMatch.findAll({
                where: { 
                    MatchId: match,
                }
            });
            const matchPlayerCount = await Match.findOne({
                attributes: ['playerCount'],
                where: {
                    id: match,
                }
            })
            console.log(matchPlayerCount);
            if (matchPlayersData.length < matchPlayerCount.playerCount) {
                try {
                    const result = await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/' + match + `?api_key=${process.env.api_key}`);
                    const matchDataByMatchId = result.data;
                    for (let i = 0; i < matchPlayerCount.playerCount; i++) {
                        const exUser = await Summoner.findOne({
                            where: { puuid: matchDataByMatchId.metadata.participants[i] }
                        });
                        console.log('exUser:', exUser);
                        if (!exUser) {
                            // await createSummonerByPzzuuid(matchDataByMatchId.metadata.participants[i]);
                            await axios.post('/summoner', { name: matchDataByMatchId.info.participants[i].summonerName });
                        }
                        const find = await SummonerMatch.findOne({
                            where: {
                                MatchId: match,
                                SummonerPuuid: matchDataByMatchId.metadata.participants[i],
                            }
                        });
                        console.log('find', find);
                        if (!find) {
                            await SummonerMatch.create({
                                MatchId: match,
                                SummonerPuuid: matchDataByMatchId.metadata.participants[i],
                                kill: matchDataByMatchId.info.participants[i].kills,
                                assist: matchDataByMatchId.info.participants[i].assists,
                                death: matchDataByMatchId.info.participants[i].deaths,
                                gold: matchDataByMatchId.info.participants[i].goldEarned,
                                item1: matchDataByMatchId.info.participants[i].item0,
                                item2: matchDataByMatchId.info.participants[i].item1,
                                item3: matchDataByMatchId.info.participants[i].item2,
                                item4: matchDataByMatchId.info.participants[i].item3,
                                item5: matchDataByMatchId.info.participants[i].item4,
                                item6: matchDataByMatchId.info.participants[i].item5,
                                item7: matchDataByMatchId.info.participants[i].item6,
                                team: matchDataByMatchId.info.participants[i].teamId.toString(),
                                champion: matchDataByMatchId.info.participants[i].championName,
                                win: matchDataByMatchId.info.participants[i].win,
                            });
                        }
                    }
                } catch (err) {
                    console.error(err);
                    return next(err);
                }
            }
        }


    res.redirect(`/summoner?name=${req.body.name}`);
});

module.exports = router;