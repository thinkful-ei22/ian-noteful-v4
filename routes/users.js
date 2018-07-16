'use strict';

const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user');

const router = express.Router();

//POST ENDPOINT

router.post('/', (req, res, next) => {
    const { fullname, username, password } = req.body;
    const newUser = { fullname, username, password };

    User.create(newUser)
        .then((result) => {
            res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
        })
        .catch(err => next(err));
});

module.exports = router;