const express = require('express');
const router = express.Router();
const multer = require('multer');
const connection = require('./db');
const bodyParser = require('body-parser');

const path = require('path');

// Parse JSON bodies
router.use(bodyParser.json());

// Parse URL-encoded bodies
router.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({storage : storage});

router.get('/',upload.none(),(req,res)=>{
  console.log('server is working');
  res.status(200).json("Server is working");
})

// route to fetch classes list
// Route to get all classes
router.get('/classes', (req, res) => {
 
  const query = 'SELECT * FROM classes';

  connection.query(query, (err, results) => {
    

    if (err) {
      console.error('Error executing MySQL query:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json(results);
  });
});

// Route to get subjects for a particular class
router.get('/subjects/:classId', (req, res) => {
const classId = req.params.classId;


  const query = `
    SELECT s.subject_name
    FROM subjects s
    JOIN class_subjects cs ON cs.subject_id = s.id
    WHERE cs.class_id = ?
  `;

  connection.query(query, [classId], (err, results) => {
    

    if (err) {
      console.error('Error executing MySQL query:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json(results);
  });
});



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
        res.status(200).json(results);
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
        const formattedResults = results.map(result => {
          const options = [];
  
          if (result.option1) options.push(result.option1);
          if (result.option2) options.push(result.option2);
          if (result.option3) options.push(result.option3);
          if (result.option4) options.push(result.option4);
  
          return {
            id: result.id,
            question: result.question,
            option: options
          };
        });
  
        res.status(200).json(formattedResults);
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
        const user_id = result.insertId;
      console.log("User created successfully with ID:", user_id);
      res.status(200).json({ message: 'User created successfully', user_id });
      }
    });
  });

//route to calculate score
router.post('/calculateResults',upload.none(), async  (req, res) => {
  try{
    const { testId, subject, mode, className, selectedOptions, user_id } = req.body;
    console.log(typeof(testId));
    console.log(typeof(subject));
    console.log(typeof(mode));
    console.log(typeof(className));
    console.log(typeof(selectedOptions));
    console.log(typeof(user_id));
  
    console.log(testId , subject , mode , className , selectedOptions , user_id);
    // Parse the selectedOptions if it's a JSON string, or use it directly if it's an array
  let selectedOptionsArr;
  if (typeof selectedOptions === 'string') {
    try {
      selectedOptionsArr = JSON.parse(selectedOptions);
    } catch (error) {
      console.error('Error parsing selectedOptions JSON:', error);
      res.status(400).json({ error: 'Invalid selectedOptions format' });
      return;
    }
  } else if (Array.isArray(selectedOptions)) {
    selectedOptionsArr = selectedOptions;
  } else {
    console.error('Invalid selectedOptions format:', typeof selectedOptions);
    res.status(400).json({ error: 'Invalid selectedOptions format' });
    return;
  }
    // Fetch correctOption from the 'questions' table based on the received parameters
    const fetchQuery = `SELECT correct_option FROM questions WHERE test_set_id = ? AND subject = ? AND mode = ? AND class = ?`;
    connection.query(fetchQuery, [testId, subject, mode, className], (error, results) => {
      if (error) {
        console.error('Error fetching correctOption:', error);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
  
      const correctOptions = results.map(result => result.correct_option);
  
      // Calculate the rightAnswers, wrongAnswers, rightQuestionNo, wrongQuestionNo, complete, and totalQuestionNo
      let rightAnswers = 0;
      let rightQuestionNo = [];
      let wrongAnswers = 0;
      let wrongQuestionNo = [];
      let notComplete = 0;
      let complete = 0;
      const totalQuestionNo = correctOptions.length;
  
      console.log(typeof(selectedOptionsArr));
  
      selectedOptionsArr.forEach((option, index) => {
        if (option == correctOptions[index] && option !== 'Not Selected') {
          rightAnswers++;
          rightQuestionNo.push(index+1);
        }
        else if(option == 'Not Selected'){
          notComplete++;
          wrongAnswers++;
        } else {
          wrongAnswers++;
          wrongQuestionNo.push(index+1); 
        }
      });
  
      complete = ((rightAnswers + wrongAnswers-notComplete) / totalQuestionNo) * 100;
  
      // Convert selectedOption array to a string
      const selectedOptionString = selectedOptionsArr.join('+');
  
      // Save the data into the user_history table
      const saveQuery = `INSERT INTO user_history (user_id, test_set_id, selectedOptions, score) VALUES (?, ?, ?, ?)`;
      connection.query(saveQuery, [user_id, testId, selectedOptionString, rightAnswers], (error, results) => {
        if (error) {
          console.error('Error saving user history:', error);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
  
        // Send the response to the frontend
        res.status(200).json({
          rightAnswers,
          rightQuestionNo,
          wrongAnswers,
          wrongQuestionNo,
          complete,
          totalQuestionNo
        });
     });
    });
  }
  catch(err){
    console.log(err);
    res.status(500).json(err);
  }
 
});



  //route to send the list of books with url for icons and pdf file
  // Define the route
router.get('/books',upload.none(), (req, res) => {
  // Fetch all books from the MySQL table
  const query = 'SELECT * FROM books';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching books:', err);
      res.status(500).send('Internal Server Error');
      return;
    }
    
    // Transform the data to include the file paths
    const transformedResults = results.map((book) => {
      return {
        id: book.id,
        class: book.class,
        subject: book.subject,
        book_name: book.book_name,
        book_icon_url: `https://capsule-backend-wep6.onrender.com/book-icon/${book.book_icon_filename}`,
        ebook_pdf_url: `https://capsule-backend-wep6.onrender.com/ebook-pdf/${book.ebook_filename}`
      };
    });

    // Send the transformed data to the frontend
    res.status(200).json(transformedResults);
  });
});

// Serve the book icons and e-book PDFs statically
router.use('/book-icon', express.static(path.join(__dirname, 'book-icon')));

// route to handle the pdf and storing the data into tables
// Define the route for accessing PDFs
router.get('/ebook-pdf/:filename',upload.none(), (req, res) => {
  // Extract the user ID from the request headers
  const userId = req.headers['user_id'];
  if (!userId) {
    res.status(400).send('User ID is missing');
    return;
  }

  // Get the book ID based on the requested filename
  const bookIdQuery = 'SELECT id FROM books WHERE ebook_filename = ?';
  connection.query(bookIdQuery, [req.params.filename], (err, results) => {
    if (err) {
      console.error('Error fetching book ID:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length === 0) {
      res.status(404).send('Book not found');
      return;
    }

    const bookId = results[0].id;

    // Store the user-book history in the user_book_history table
    const insertQuery = 'INSERT INTO user_book_history (user_id, book_id) VALUES (?, ?)';
    connection.query(insertQuery, [userId, bookId], (err) => {
      if (err) {
        console.error('Error inserting user-book history:', err);
        res.status(500).send('Internal Server Error');
        return;
      }

      // Send the PDF file as a response
      const pdfPath = path.join(__dirname, 'ebook-pdf', req.params.filename);
      res.sendFile(pdfPath);
    });
  });
});

//           USER History routes
//routes to handle user -history -> test/Exam record
// Define the route
router.get('/user-history/:userId',upload.none(), (req, res) => {
  const userId = req.params.userId;

  // Fetch user history data from the MySQL table
  const query = 'SELECT id,test_set_id, score FROM user_history WHERE user_id = ?';
  
  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching user history:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    // Prepare an array to store the transformed data
    const transformedData = [];
   
    // Iterate through each user history record
    for (const result of results) {
      const { test_set_id, score } = result;

      // Fetch chapter_id and questions_count from the test_sets table
      const testSetQuery = 'SELECT chapter_id, questions_count FROM test_sets WHERE id = ?';
      connection.query(testSetQuery, [test_set_id], (err, testSetResults) => {
        if (err) {
          console.error('Error fetching test set data:', err);
          return;
        }

        // Fetch chapter_name from the chapters table
        const chapterId = testSetResults[0].chapter_id;
        const questionsCount = testSetResults[0].questions_count;
        const historyId = result.id; 
        const chapterQuery = 'SELECT chapter_name FROM chapters WHERE id = ?';
        connection.query(chapterQuery, [chapterId], (err, chapterResults) => {
          if (err) {
            console.error('Error fetching chapter data:', err);
            return;
          }

          // Transform the data and push it to the array
          const chapterName = chapterResults[0].chapter_name;
          transformedData.push({
            chapter_name: chapterName,
            total_questions: questionsCount,
            marks_scored: score,
            history_id : historyId
          });

          // Check if all queries have finished executing
          if (transformedData.length === results.length) {
            // Send the transformed data to the frontend
            res.json(transformedData);
          }
        });
      });
    }
  });
});

//route to handle where user history -> Review Exam.
// Route to fetch data based on history_id
router.get('/fetchData/:history_id',upload.none(), (req, res) => {
  const historyId = req.params.history_id;

  // Fetch test_set_id and selectedOptions from user_history table
  connection.query(
    'SELECT test_set_id, selectedOptions FROM user_history WHERE id = ?',
    [historyId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch data from user_history' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'User history not found' });
      }

      const { test_set_id, selectedOptions } = results[0];
      const selectedOptionsArray = selectedOptions.split('+');

      // Fetch questions, options, and correct_option using test_set_id
      connection.query(
        'SELECT question_text AS question, option1, option2, option3, option4, correct_option FROM questions WHERE test_set_id = ?',
        [test_set_id],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch questions' });
          }

          const data = results.map((row) => ({
            question: row.question,
            option1: row.option1,
            option2: row.option2,
            option3: row.option3,
            option4: row.option4,
            correct_option: row.correct_option,
            selectedOption: selectedOptionsArray.shift() || null,
          }));

          res.json(data);
        }
      );
    }
  );
});

//route to handle user history for pdf/books
// Route to fetch book information based on user_id
router.get('/fetchBooks/:user_id',upload.none(), (req, res) => {
  const userId = req.params.user_id;

  // Fetch distinct book_ids from user_book_history table
  connection.query(
    'SELECT DISTINCT book_id FROM user_book_history WHERE user_id = ?',
    [userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch book IDs from user_book_history' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'No books found for the user' });
      }

      const bookIds = results.map((row) => row.book_id);

      // Fetch book information from books table
      connection.query(
        'SELECT class, subject, book_name, book_icon_filename, ebook_filename FROM books WHERE id IN (?)',
        [bookIds],
        (err, results) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch book information' });
          }

          const data = results.map((row) => ({
            class: row.class,
            subject: row.subject,
            book_name: row.book_name,
            book_icon_url: "https://capsule-backend-wep6.onrender.com/book-icon/"+row.book_icon_filename,
            ebook_pdf_url: "https://capsule-backend-wep6.onrender.com/ebook-pdf/"+row.ebook_filename,
          }));

          res.json(data);
        }
      );
    }
  );
});
//          END FOR USER HISTORY 

//             USER PROFILE
// Route to fetch user information based on user_id
router.get('/fetchUser/:user_id',upload.none(), (req, res) => {
  const userId = req.params.user_id;

  // Fetch user information from users table
  connection.query(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to fetch user information' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = results[0];
      res.json(userData);
    }
  );
});

// route to update user profile 
// Route to update user information based on user_id
router.put('/updateUser/:user_id',upload.none(), (req, res) => {
  const userId = req.params.user_id;
  const { first_name, last_name, dob, email, country, phone_number, gender, class: user_class } = req.body;

  // Update user information in users table
  connection.query(
    'UPDATE users SET first_name = ?, last_name = ?, dob = ?, email = ?, country = ?, phone_number = ?, gender = ?, class = ? WHERE id = ?',
    [first_name, last_name, dob, email, country, phone_number, gender, user_class, userId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to update user information' });
      }

      res.json({ message: 'User information updated successfully' });
    }
  );
});


  

  module.exports = router;