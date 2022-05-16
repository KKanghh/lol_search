const axios = require('axios');
const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('index');
})

router.get('/search', async (req, res) => {
    let summoner, matches = [];
    let url = 'https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/' + encodeURIComponent(req.query.name) + `?api_key=${process.env.api_key}`;
    await axios.get(url)
        .then(res => {
            summoner = res.data.puuid;
        })
        .catch(err => {
            console.error('에러:', err);
        });
    await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/' + summoner + `/ids?start=0&count=20&api_key=${process.env.api_key}`)
        .then(res => {
            matches = res.data;
            console.log(matches[[0]]);
        })
        .catch(err => {
            console.error(err);
        });
    const data = [];
    const mydata = [];
    for (match of matches) {
        await axios.get('https://asia.api.riotgames.com/lol/match/v5/matches/' + match + `?api_key=${process.env.api_key}`)
            .then(res => {
                data.push(res.data.info)
                mydata.push(res.data.info.participants[res.data.metadata.participants.indexOf(summoner)])
            })
    }
    
    // participant.forEach(async element => {
    //     const user = await axios.get('https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/' + element + `?api_key=${process.env.api_key}`);
    //     console.log(user.data.name);
    //     participantInfo.push(user.data.name)
    // })
    // console.log(participantInfo);
    res.render('result', { matches: data, myInfo: mydata });

    // matches.forEach(async (el) => {
    //     await axios.get()
    // })
})

module.exports = router;