const mongoose = require('mongoose');

const outProblemSchema = new mongoose.Schema({
    name: String,
    Category: [],
    problem_number: {type:String, unique: true},
    problem_solver: Number,
    problem_rating: Number
});

module.exports = {
    outProblem: mongoose.model('outProblem', outProblemSchema)
};