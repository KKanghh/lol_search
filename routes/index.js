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
    console.log(req.query.name);
    let summoner = await Summoner.findOne({ // 검색한 소환사 정보 저장 & 불러오기
        where: { name: req.query.name }
    });
    console.log('-----------', summoner);
    if (!summoner) {
        await createSummonerByName(req.query.name);
        summoner = await Summoner.findOne({
            where: { name: req.query.name }
        });
    }
    if(!summoner) {
        const error = new Error('입력한 사용자가 없습니다.');
        error.status = 404;
        next(error);
    }

    await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/' + summoner.puuid + `/ids?start=0&count=8&api_key=${process.env.api_key}`)
        .then(async res => {
            matches = res.data;
            for (match of matches) {
                try {
                    const exMatch = await Match.findOne({
                        where: { id: match }
                    });
                    if (!exMatch) {
                        let mode, duration;
                        await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/' + match + `?api_key=${process.env.api_key}`)
                            .then(res => {
                                mode = res.data.info.gameMode;
                                duration = res.data.info.gameDuration;
                            })
                        await Match.create({
                            id: match,
                            mode,
                            duration,
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
            next(err);
        });

    for (match of matches) {
        const exMatch = await SummonerMatch.findAll({
            where: { 
                MatchId: match,
            }
        });
        if (exMatch.length != 10) {
            await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/' + match + `?api_key=${process.env.api_key}`)
                .then(async res => {
                    try {
                        for (let i = 0; i < 10; i++) {
                            const exUser = await Summoner.findOne({
                                where: { puuid: res.data.metadata.participants[i] }
                            });
                            if (!exUser) {
                                await createSummonerByPuuid(res.data.info.participants[i].puuid);
                            }
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
                                    win: res.data.info.participants[i].win,
                                });
                            }
                        }
                    }
                    catch (err) {
                        console.error(err);
                        next(err);
                    }
                });
        }
        
    }

    const data = [];
    const playerMatches = await SummonerMatch.findAll({
        where: {
            SummonerPuuid: summoner.puuid
        },
        attributes: [ 'MatchId' ],
        order: [['MatchId', 'DESC']],
    });

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
        });
        data.push(match);
    }
    
    res.render('result', { matches: data });

    // matches.forEach(async (el) => {
    //     await axios.get()
    // })
})

module.exports = router;