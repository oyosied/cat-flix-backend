const express = require('express');
const { check } = require('express-validator');

const usersController = require('../controllers/users-controllers');


const router = express.Router();

router.post('/login', usersController.login);
router.post('/signup', usersController.signup);

module.exports = router;
