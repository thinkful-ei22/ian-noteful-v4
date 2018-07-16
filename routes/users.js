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

    const stringFields = ['username', 'fullname', 'password'];
    const nonStringFields = stringFields.find((field) => {
        field in req.body && typeof req.body[field] !== 'string'
    });
    if (nonStringFields) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected string',
            location: nonStringField
        });
    }

    const explicitlyTrimmedFields = ['username', 'password'];
    const nonTrimmedField = explicitlyTrimmedFields.find(
      field => req.body[field].trim() !== req.body[field]
    );
  
    if (nonTrimmedField) {
      return res.status(422).json({
        code: 422,
        reason: 'ValidationError',
        message: 'Cannot start or end with whitespace',
        location: nonTrimmedField
      });
    }

    const sizedFields = {
        username: {
            min: 1
        },
        password: {
            min: 8,
            max: 72
        }
    };

    const tooSmallField = Object.keys(sizedFields).find(field =>
        'min' in sizedFields[field] && req.body[field].trim().length < sizedFields[field].min);

    const tooLargeField = Object.keys(sizedFields).find(field =>
        'max' in sizedFields[field] && req.body[field].trim().length > sizedFields[field].max);

    if (tooSmallField || tooLargeField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: tooSmallField
                ? `Must be at least ${sizedFields[tooSmallField]
                    .min} characters long`
                : `Must be at most ${sizedFields[tooLargeField]
                    .max} characters long`,
            location: tooSmallField || tooLargeField
        });
    };

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