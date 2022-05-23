const axios = require('axios');
const express = require('express');
const { Summoner, Match, SummonerMatch } = require('../models');

const router = express.Router();
let searching = false;

router.get('/', (req, res) => {
    res.render('index');
})

async function createSummonerByName(name) {
    try {
        const result = await axios.get('https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/' + encodeURIComponent(name) + `?api_key=${process.env.api_key}`);
        const playerData = result.data;
        console.log('가져온 데이터:', playerData);
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
        return err;
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
        })
    } catch(err) {
        console.error(err);
        return err;
    }
}

router.get('/search', async (req, res, next) => { 
    while (searching);
    
    searching = true;
    let matches = [];
    const searchName = req.query.name.replace(/ /gi, '').toLowerCase();
    console.log('최초 출력: ', req.query.name);
    let summoner = await Summoner.findOne({ // 검색한 소환사 정보 저장 & 불러오기
        where: { searchName }
    });
    if (!summoner) { // DB에 해당 소환사 data 없음
        try { // 소환사 정보 DB에 저장
            await createSummonerByName(req.query.name);
        } catch (err) {
            return next(err);
        }
        summoner = await Summoner.findOne({
            where: { searchName }
        });
    }
    if(!summoner) {
        return res.redirect(`/?searchError=${req.query.name}을 찾을 수 없습니다.`);
    }

    try {
        const res = await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/' + summoner.puuid + `/ids?start=0&count=8&api_key=${process.env.api_key}`);
        matches = res.data;
        for (let match of matches) {
            const exMatch = await Match.findOne({
                where: { id: match }
            });
            if (!exMatch) {
                let mode, duration, playerCount;
                const result = await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/' + match + `?api_key=${process.env.api_key}`);
                const matchDataByPuuid = result.data;
                mode = matchDataByPuuid.info.gameMode;
                duration = matchDataByPuuid.info.gameDuration,
                playerCount = matchDataByPuuid.metadata.participants.length;
                await Match.create({
                    id: match,
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
                        await createSummonerByPuuid(matchDataByMatchId.metadata.participants[i]);
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
        })
        data.push(match);
    }
    
    searching = false;
    return res.render('result', { matches: data });

    // matches.forEach(async (el) => {
    //     await axios.get()
    // })
})

module.exports = router;