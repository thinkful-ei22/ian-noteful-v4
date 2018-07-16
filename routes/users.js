'use strict';

const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user');
const bcrypt = require('bcryptjs');
const router = express.Router();


//POST ENDPOINT

router.post('/', (req, res, next) => {
    const { fullname, username, password } = req.body;
    const newUser = { fullname, username, password };

    const requiredFields = ['username', 'password'];
    const missingField = requiredFields.find(field => !(field in req.body));
  
    if (missingField) {
      const err = new Error(`Missing '${missingField}' in request body`);
      err.status = 422;
      return next(err);
    }

    return User.hashPassword(password)
        .then(digest => {
            console.log(digest);
            newUser.password = digest;
            return User.create(newUser);
        })
        .then(result => {
            return res.status(201).location(`/api/users/${result.id}`).json(result);
        })
        .catch(err => {
            if (err.code === 11000) {
            err = new Error('The username already exists');
            err.status = 400;
            }
            next(err);
    });
    
});

module.exports = router;