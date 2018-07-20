'use strict';

const express = require('express');
const mongoose = require('mongoose');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');

const router = express.Router();
const passport = require('passport');

router.use('/', passport.authenticate('jwt', {session: false, failWithError: true }));

//validate folderID
function validateFolderId(folderId, userId) {
  if(folderId === undefined) {
    return Promise.resolve();
  }

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return Promise.reject(err);
  }
 
  return Folder.count({ _id: folderId, userId })
  .then(count => {
    if (count === 0) {
      const err = new Error('The hey `folderId` is not valid');
      err.status = 400;
      return Promise.reject(err);
    }
  });
  }

//validate tag IDs
function validateTagIds(tags = [], userId) {
  if(!tags.length) {
    return Promise.resolve();
  }
  if (tags) {
    const badIds = tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The tags `id` is not valid');
      err.status = 400;
      return Promise.reject(err);
    }
  }
  return Tag.find({ $and : [{ _id: { $in: tags }, userId }] })
    .then(results => {
      if(tags.length !== results.length) {
        const err = new Error('the tags array contains an invalid id');
        err.status = 400;
        return Promise.reject(err);
      }
  });
}

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const userId = req.user.id

  let filter = { userId: userId };

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  Note.find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({_id: id, userId})
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags = [] } = req.body;
  const userId = req.user.id

  const newNote = { title, content, folderId, tags, userId };

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }
  
  if(folderId === '') {
    delete newNote.folderId;
  }

  Promise.all([
    validateFolderId(newNote.folderId, userId),
    validateTagIds(tags, userId)
  ])
    .then(() => Note.create(newNote))
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const { title, content, folderId, tags = [] } = req.body;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }
  if (title === '') {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const updateNote = { title, content, tags }
  if(mongoose.Types.ObjectId.isValid(folderId)){
    updateNote.folderId = folderId;
  }

  Promise.all([
    validateFolderId(folderId, userId),
    validateTagIds(tags, userId)
  ])
    .then(() => Note.findByIdAndUpdate(id, updateNote, { new: true }).populate('tags'))
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findByIdAndRemove(id)
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;