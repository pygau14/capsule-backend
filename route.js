const express = require('express');
const router = express.Router();
const multer = require('multer');
const connection = require('./db');
const bodyParser = require('body-parser');

// Parse JSON bodies
router.use(bodyParser.json());

// Parse URL-encoded bodies
router.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({storage : storage});




// Route 1: Get chapters based on class and subject
router.post('/chapters',upload.none(), (req, res) => {
    const { className, subject } = req.body;
  
    const query = `SELECT id, chapter_name AS name FROM chapters WHERE class = ? AND subject = ?`;
  
    connection.query(query, [className, subject], (err, results) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        
        res.json(results);
      }
    });
  });
  
  // Route 2: Get test sets based on chapter, mode, class, and subject
  router.post('/test-sets',upload.none(), (req, res) => {
    const { chapterId, mode, className, subject } = req.body;
  
    const query = `SELECT id as testID, CONCAT('Set', id) AS name, questions_count, hours, minutes, seconds
                   FROM test_sets
                   WHERE chapter_id = ? AND mode = ? AND class = ? AND subject = ?`;
  
    connection.query(query, [chapterId, mode, className, subject], (err, results) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
       
        console.log(results);
        res.json(results);
      }
    });
  });
  
  // Route 3: Get questions based on test ID, class, subject, and mode
  router.post('/questions',upload.none(), (req, res) => {
    const { testId, className, subject, mode } = req.body;
  
    const query = `SELECT id, question_text AS question, option1, option2, option3, option4
                   FROM questions
                   WHERE test_set_id = ? AND class = ? AND subject = ? AND mode = ?`;
  
    connection.query(query, [testId, className, subject, mode], (err, results) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(results);
      }
    });
  });
  // Route 4: Insert user data into the "users" table
  router.post('/users',upload.none(), (req, res) => {
  
  
    const { firstName, lastName, dob, email, country, phoneNumber, gender, className } = req.body;
  
    const query = `INSERT INTO users (first_name, last_name, dob, email, country, phone_number, gender, class)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  
    connection.query(query, [firstName, lastName, dob, email, country, phoneNumber, gender, className], (err, result) => {
      if (err) {
        console.error('Error executing MySQL query:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        console.log("user created successfully");
        res.json({ message: 'User created successfully' });
      }
    });
  });

  

  module.exports = router;