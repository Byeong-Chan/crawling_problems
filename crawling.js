const mongoose = require('mongoose');
const config = require('./config.js');

/* ---------
 mongoose connected */

mongoose.connect(config.mongodbUri, {useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true, useFindAndModify: false });
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




let idxb_categroy = 0;
let pageb_category = 0;
const funboj_category = async function(b_category) {
    pageb_category += 1;
    if(pageb_category === 9) {
        pageb_category = 1;
        idxb_categroy += 1;
    }
    b_category.queue(`https://solved.ac/problems/algorithms/${idxb_categroy}?page=${pageb_category}`);
};




let idxb = -1;
let pageb = 0;
const funboj = async function(b, b_category) {
    pageb += 1;
    if(pageb === 101) {
        pageb = 1;
        idxb += 1;
    }
    if(pageb === 8 && idxb !== 0) {
        pageb = 1;
        idxb += 1;
    }
    if(idxb < 31) {
        b.queue(`https://solved.ac/problems/level/${idxb}?page=${pageb}`);
    }
    else {
        pageb_category = 8;
        idxb_categroy = 0;
        funboj_category(b_category).catch(err => { console.log(err); });
    }
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
                    model.outProblem.findOneAndUpdate({problem_number: arr[i].problem_number},
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

                        model.outProblem.findOneAndUpdate({problem_number: arr[stag_idx].problem_number},
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

let counter = 0;
const b_category = new Crawler({
    rateLimit: 1000,

    // This will be called for each crawled page
    callback: function (error, res, done) {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            const category_name = $('h1').text().trim();

            if(category_name === '' && counter < 10) {
                counter += 1;
                console.log('empty');
                funboj_category(b_category).catch(err => {
                    console.log(err)
                });
            }
            if(category_name !== '') {
                counter = 0;
                console.log('BOJ Category ' + idxb_categroy + ' ' + category_name);

                const arr = [];
                $('.problem_list tr').each(function(idx) {
                    const obj = {
                        name: '',
                        problem_number: '',
                        problem_solver: 0,
                        problem_rating: 0,
                        Category: []
                    };
                    const keys = ["problem_number", "name", "problem_solver"];
                    $(this).find('td').each(function(idx) {
                        obj[keys[idx]] = $(this).text().trim();
                        if(idx === 2) {
                            const tmp = $(this).text().trim();
                            if(tmp[tmp.length - 1] === 'K') {
                                obj[keys[idx]] = parseInt(parseFloat(tmp.substring(0, tmp.length - 1)) * 1000);
                            }
                            else {
                                let s = '';
                                tmp.split(',').map((val, idx) => {
                                    s = s.concat(val);
                                });
                                obj[keys[idx]] = parseInt(s);
                            }
                        }
                    });
                    if(obj.name !== '') {
                        obj.problem_number = 'boj/' + obj.problem_number;
                        arr.push(obj);
                    }
                });

                for(let i = 0; i < arr.length; i++) {
                    model.outProblem.create(arr[i]).then(result => {}).catch(err => {});
                    model.outProblem.findOneAndUpdate({problem_number: arr[i].problem_number},
                        {$addToSet: {Category: category_name}}).then(result => {}).catch(err => {});
                }

                funboj_category(b_category).catch(err => {
                    console.log(err)
                });
            }
        }
        done();
    }
});

const b = new Crawler({
    rateLimit: 1000,

    // This will be called for each crawled page
    callback: function (error, res, done) {
        if (error) {
            console.log(error);
        } else {
            const $ = res.$;
            console.log('BOJ ' + idxb);
            const arr = [];
            $('.problem_list tr').each(function(idx) {
                const obj = {
                    name: '',
                    problem_number: '',
                    problem_solver: 0,
                    problem_rating: idxb,
                    Category: []
                };
                const keys = ["problem_number", "name", "problem_solver"];
                $(this).find('td').each(function(idx) {
                    obj[keys[idx]] = $(this).text().trim();
                    if(idx === 2) {
                        const tmp = $(this).text().trim();
                        if(tmp[tmp.length - 1] === 'K') {
                            obj[keys[idx]] = parseInt(parseFloat(tmp.substring(0, tmp.length - 1)) * 1000);
                        }
                        else {
                            let s = '';
                            tmp.split(',').map((val, idx) => {
                                s = s.concat(val);
                            });
                            obj[keys[idx]] = parseInt(s);
                        }
                    }
                });
                if(obj.name !== '') {
                    obj.problem_number = 'boj/' + obj.problem_number;
                    arr.push(obj);
                }
            });

            for(let i = 0; i < arr.length; i++) {
                model.outProblem.create(arr[i]).then(result => {}).catch(err => {});
                model.outProblem.findOneAndUpdate({problem_number: arr[i].problem_number},
                    {$set: {problem_rating: arr[i].problem_rating,
                            problem_solver: arr[i].problem_solver}}).then(result => {}).catch(err => {});
            }

            funboj(b, b_category).catch(err => {console.log(err)});
        }
        done();
    }
});


db.once('open', () => {
    setInterval(() => {
        pageb = 100;
        idxb = -1;
        counter = 0;
        funboj(b).catch(err => {
            console.log(err);
        });
    }, 86400000);

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
