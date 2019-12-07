const mongoose = require('mongoose');
const config = require('./config.js');

/* ---------
 mongoose connected */

mongoose.connect(config.mongodbUri, {useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true });
mongoose.Promise = global.Promise;

const db = mongoose.connection;
db.on('error', console.error);

const model = require('./model');

const Crawler = require('crawler');

const prev = [];

let idxc = 0;
const funcodeforces = async function(c) {
    idxc += 1;
    c.queue(`https://codeforces.com/problemset/page/${idxc}`);
};

const prevs = [];

let idxs = -1;
const funspoj = async function(s) {
    idxs += 1;
    s.queue(`https://www.spoj.com/problems/classical/sort=0,start=${idxs * 50}`);
};

const c = new Crawler({
    rateLimit: 1000,

    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            const $ = res.$;

            let obj = {
                name: '',
                problem_number: '',
                Category: [],
                problem_solver: 0,
                problem_rating: 0
            };
            let cnt = 0;
            const arr = [];
            $(".problems td").each(function (idx) {
                 $(this).find(".ProblemRating").each(function (idx) {
                     if ($(this).text().trim() === '') return;
                     // 문제 레이팅
                     if ($(this).text().trim().length > 0) {
                         obj.problem_rating = parseInt($(this).text().trim());
                     }
                 });

                 $(this).find("a").each(function (idx) {
                     if ($(this).text().trim() === '') return;
                     if ($(this)[0].attribs.class === 'notice') {
                         // 카테고리
                         obj.Category.push($(this).text().trim());
                     }
                     else if ($(this)[0].attribs.title === 'Participants solved the problem') {
                         // 푼 사람 수
                         if($(this).text().trim().length > 0)
                             obj.problem_solver = parseInt($(this).text().trim().substring(1));
                     }
                     else if ($(this)[0].attribs.title !== 'Participants solved the problem') {
                         if(cnt === 0) {
                             obj.problem_number = "codeforces/" + obj.problem_number;
                             if(obj.name !== '') arr.push(obj);
                             obj = {
                                 name: '',
                                 problem_number: '',
                                 Category: [],
                                 problem_solver: 0,
                                 problem_rating: 0
                             };
                         }
                         if(cnt === 0) obj.problem_number = $(this).text().trim();
                         else obj.name = $(this).text().trim();
                         cnt = (cnt + 1) % 2;
                     }
                 });
            });
            if(obj.name !== '') arr.push(obj);

            if(prev.length > 0 && arr.length > 0 && prev[0].problem_number === arr[0].problem_number) {
                // 멈춰!
            }
            else if(arr.length === 0) {
                // 멈춰!
            }
            else {
                console.log("Codeforces " + idxc + " " + arr.length);
                for(let i = 0; i < arr.length; i++) {
                    model.outProblem.create(arr[i]).then(result => {

                    }).catch(err => {
                    });
                    model.outProblem.findOneAndUpdate({name: arr[i].name},
                        {$set: {problem_solver: arr[i].problem_solver,
                                problem_rating: arr[i].problem_rating,
                                Category: arr[i].Category
                            }}).then(result => {}).catch(err => {});
                }

                funcodeforces(c).catch(err => {
                    console.log(err);
                });
            }
            prev.splice(0,prev.length);
            for(let i = 0; i < arr.length; i++) {
                prev.push(arr[i]);
            }
        }
        done();
    }
});

const s = new Crawler({
    rateLimit: 1000,

    // This will be called for each crawled page
    callback: function (error, res, done) {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            const keys = ['problem_number', 'name', '', 'problem_solver', '', 'problem_rating'];
            const arr = [];
            const arrLink = [];
            $('.problems tr').each(function(idx) {
                if($(this)[0].attribs.class.split(' ').find(elem => elem === 'title-row') !== undefined) return;
                const obj = {
                    'Category': []
                };
                let link = '';
                $(this).find('a').each(function(idx) {
                    if($(this)[0].attribs.href.split('/').find(elem=>elem === 'problems') !== undefined) {
                        link = 'https://www.spoj.com' + $(this)[0].attribs.href;
                    }
                });
                arrLink.push(link);
                $(this).find('td').each(function(idx) {
                    if($(this).text().trim() === '') return;
                    if(keys[idx] === '') return;
                    if(idx === 5) {
                        obj[keys[idx]] = $(this).text().trim().substring(0, 4).trim();
                    }
                    else {
                        obj[keys[idx]] = $(this).text().trim();
                    }
                });
                const sav = link.split('/');
                obj.problem_number = sav[sav.length - 1];
                arr.push(obj);
            });

            for(let i = 0; i < arr.length; i++) {
                arr[i].problem_number = 'spoj/' + arr[i].problem_number;
            }

            if(prevs.length > 0 && arr.length > 0 && prevs[0].problem_number === arr[0].problem_number) {
                // 멈춰!
            }
            else if(arr.length === 0) {
                // 멈춰!
            }
            else {
                console.log("SPOJ " + idxs + " " + arr.length);

                prevs.splice(0,prevs.length);
                for(let i = 0; i < arr.length; i++) {
                    prevs.push(arr[i]);
                }

                let stag_idx = -1;

                const funcstag = async function(stag) {
                    if(stag_idx < arrLink.length - 1)
                        stag.queue(arrLink[stag_idx + 1]);
                    else
                        funspoj(s).catch(err => {
                            console.log(err);
                        })
                };

                const stag = new Crawler({
                    rateLimit: 1000,
                    callback: function(error, res, done) {
                        stag_idx++;
                        if (error) {
                            console.log(error);
                        } else {
                            const $ = res.$;
                            $('#problem-tags').each(function(idx) {
                                $(this).find('a').each(function(idx) {
                                    arr[stag_idx].Category.push($(this).text().trim().substring(1));
                                })
                            });
                        }
                        prevs.push(arr[stag_idx]);
                        model.outProblem.create(arr[stag_idx]).then(result => {

                        }).catch(err => {

                        });

                        model.outProblem.findOneAndUpdate({name: arr[stag_idx].name},
                            {$set: {problem_solver: arr[stag_idx].problem_solver,
                                    problem_rating: arr[stag_idx].problem_rating,
                                    Category: arr[stag_idx].Category
                                }}).then(result => {}).catch(err => {});

                        funcstag(stag).catch(err => {
                            console.log(err);
                        });
                        done();
                    }
                });

                funcstag(stag).catch(err => {
                    console.log(err);
                });
            }
        }
        done();
    }
});


db.once('open', () => {
    setInterval(() => {
        idxs = -1;
        funspoj(s).catch(err => {
            console.log(err);
        });
    }, 86400000);

    setInterval(() => {
        idxc = 0;
        funcodeforces(c).catch(err => {
            console.log(err);
        });
    }, 86400000);
});
