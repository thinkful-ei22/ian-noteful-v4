'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullname: { type: String },
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});

userSchema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
        delete ret._id;
        delete ret.password;
    }
});

module.exports = mongoose.model('User', userSchema);