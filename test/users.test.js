'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const app = require('../server');
const User = require('../models/user');

const { TEST_MONGODB_URI } = require('../config');

chai.use(chaiHttp);
const expect = chai.expect;




describe.only('Noteful API - Users', function () {
    const username = 'exampleUser';
    const password = 'examplePass';
    const fullname = 'Example User';
    const usernameB = 'exampleUserB';
    const passwordB = 'examplePassB';
    const fullnameB = 'Example UserB';
  

    before(function () {
        return mongoose.connect(TEST_MONGODB_URI)
            .then(() => mongoose.connection.db.dropDatabase());
    });

    beforeEach(function () {
        return Promise.all([
            User.createIndexes()
        ]);
    });

    afterEach(function () {
        return mongoose.connection.db.dropDatabase();
    });

    after(function () {
        return mongoose.disconnect();
    });

    describe('POST', function () {
        it('Should reject users with missing username', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    password,
                    fullname
                })
                .then((res) => {
                    console.log(res.body);
                    expect(res).to.have.status(422);
                    expect(res.body.message).to.equal(`Missing 'username' in request body`);
                });
        });
        it('Should reject users with missing password', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username,
                    fullname
                })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.message).to.equal(`Missing 'password' in request body`);
                });
        });
        it('Should reject users with non-string username', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username: 1234,
                    password,
                    fullname
                })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.message).to.equal(
                        `Field: 'username' must be type String`
                    );
                });
        });
        it('Should reject users with non-string password', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username,
                    password: 1234,
                    fullname
                })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.message).to.equal(
                        `Field: 'password' must be type String`
                    );
                });
        });
        it('Should reject users with non-trimmed username', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username: ` ${username} `,
                    password,
                    fullname
                })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.message).to.equal(
                        `Field: 'username' cannot start or end with whitespace`
                    );
                });
        });
        it('Should reject users with non-trimmed password', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username,
                    password: ` ${password} `,
                    fullname
                })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.message).to.equal(
                        `Field: 'password' cannot start or end with whitespace`
                    );
                });
        });
        it('Should reject users with empty username', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username: '',
                    password,
                    fullname
                })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.message).to.equal(
                        `Field: 'username' must be at least 1 characters long`
                    );
                });
        });
        it('Should reject users with password less than 8 characters', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username,
                    password: '1234567',
                    fullname
                })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.message).to.equal(
                        `Field: 'password' must be at least 8 characters long`
                    );
                });
        });
        it('Should reject users with password greater than 72 characters', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username,
                    password: new Array(73).fill('a').join(''),
                    fullname
                })
                .then((res) => {
                    expect(res).to.have.status(422);
                    expect(res.body.message).to.equal(
                        `Field: 'password' must be at most 72 characters long`
                    );
                });
        });
        it('Should reject users with duplicate username', function () {
            // Create an initial user
            return User.create({
                username,
                password,
                fullname
            })
                .then(() =>
                    // Try to create a second user with the same username
                    chai.request(app).post('/api/users').send({
                        username,
                        password,
                        fullname
                    })
                )
                .then((res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.message).to.equal(
                        'The username already exists'
                    );
                });
        });
        it('Should create a new user', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username,
                    password,
                    fullname
                })
                .then(res => {
                    expect(res).to.have.status(201);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.keys(
                        'username',
                        'fullname',
                        'id'
                    );
                    expect(res.body.username).to.equal(username);
                    expect(res.body.fullname).to.equal(fullname);
                    return User.findOne({
                        username
                    });
                })
                .then(user => {
                    expect(user).to.not.be.null;
                    expect(user.fullname).to.equal(fullname);
                    return user.validatePassword(password);
                })
                .then(passwordIsCorrect => {
                    expect(passwordIsCorrect).to.be.true;
                });
        });
        it('Should trim fullname', function () {
            return chai
                .request(app)
                .post('/api/users')
                .send({
                    username,
                    password,
                    fullname: ` ${fullname} `
                })
                .then(res => {
                    expect(res).to.have.status(201);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.keys(
                        'username',
                        'fullname',
                        'id'
                    );
                    expect(res.body.username).to.equal(username);
                    expect(res.body.fullname).to.equal(fullname);
                    return User.findOne({
                        username
                    });
                })
                .then(user => {
                    expect(user).to.not.be.null;
                    expect(user.fullname).to.equal(fullname);
                });
        });
    });    
});

