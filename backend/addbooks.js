const sqlite3 = require('sqlite3').verbose();

// Connect to database
const db = new sqlite3.Database('./library.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to database');
        addBooks();
    }
});

function addBooks() {
    const books = [
        ['The Hobbit', 'J.R.R. Tolkien', 'Fantasy', 1937, 0],
        ['Harry Potter', 'J.K. Rowling', 'Fantasy', 1997, 1],
        ['The Catcher in the Rye', 'J.D. Salinger', 'Fiction', 1951, 0]
    ];

    const sql = `INSERT INTO books (title, author, genre, year, is_read) VALUES (?, ?, ?, ?, ?)`;

    books.forEach(book => {
        db.run(sql, book, function(err) {
            if (err) {
                console.error('Error adding book:', err);
            } else {
                console.log(`Added book: ${book[0]} with ID: ${this.lastID}`);
            }
        });
    });

    // Close database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
    });
}
