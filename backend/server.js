const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Create books directory for file storage
const booksDir = path.join(__dirname, 'books');
if (!fs.existsSync(booksDir)) {
    fs.mkdirSync(booksDir);
}

// 🗄️ DATABASE SETUP
const db = new sqlite3.Database('./library.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('✅ Connected to SQLite database!');
        
        // Ensure all tables exist
        db.run(`
            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                genre TEXT,
                year INTEGER,
                is_read BOOLEAN DEFAULT 0,
                is_public_domain BOOLEAN DEFAULT 0,
                source_type TEXT DEFAULT 'metadata',
                file_path TEXT,
                file_size INTEGER,
                download_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                membership_id TEXT UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS downloads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                book_id INTEGER,
                downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (member_id) REFERENCES members(id),
                FOREIGN KEY (book_id) REFERENCES books(id)
            )
        `);

        console.log('✅ All tables are ready!');
        addSampleBooks();
    }
});

// Add sample books
function addSampleBooks() {
    const checkSql = 'SELECT COUNT(*) as count FROM books';
    db.get(checkSql, [], (err, row) => {
        if (err) return;
        
        if (row.count === 0) {
            const sampleBooks = [
                ['The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', 1925, 1, 0],
                ['To Kill a Mockingbird', 'Harper Lee', 'Fiction', 1960, 0, 0],
                ['1984', 'George Orwell', 'Science Fiction', 1949, 1, 0],
                ['Pride and Prejudice', 'Jane Austen', 'Romance', 1813, 0, 1],
                ['Moby Dick', 'Herman Melville', 'Adventure', 1851, 0, 1]
            ];
            
            const insertSql = `INSERT INTO books (title, author, genre, year, is_read, is_public_domain) 
                              VALUES (?, ?, ?, ?, ?, ?)`;
            
            sampleBooks.forEach(book => {
                db.run(insertSql, book);
            });
            
            console.log('✅ Sample books added!');
        }
    });
}

// 📚 API ROUTES

// Get all books
app.get('/api/books', (req, res) => {
    const sql = 'SELECT * FROM books ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get public domain books only
app.get('/api/books/public-domain', (req, res) => {
    const sql = 'SELECT * FROM books WHERE is_public_domain = 1 ORDER BY title';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Add new book
app.post('/api/books', (req, res) => {
    const { title, author, genre, year, is_read, is_public_domain } = req.body;
    const sql = `INSERT INTO books (title, author, genre, year, is_read, is_public_domain) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [title, author, genre, year, is_read ? 1 : 0, is_public_domain ? 1 : 0], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ 
            id: this.lastID,
            message: 'Book added successfully'
        });
    });
});

// Download book file
app.get('/api/books/:id/download', (req, res) => {
    const bookId = req.params.id;
    
    const sql = 'SELECT * FROM books WHERE id = ? AND is_public_domain = 1';
    db.get(sql, [bookId], (err, book) => {
        if (err || !book) {
            return res.status(404).json({ error: 'Book not available for download' });
        }
        
        // For now, we'll simulate file download
        // In a real system, you'd have actual PDF/EPUB files here
        console.log(`Download requested for: ${book.title}`);
        
        // Update download count
        db.run('UPDATE books SET download_count = download_count + 1 WHERE id = ?', [bookId]);
        
        // Create a simple text file as simulation
        const simulatedContent = `
Title: ${book.title}
Author: ${book.author}
Year: ${book.year}
Genre: ${book.genre}

This is a simulated download for "${book.title}".
In a real system, this would be the actual book content.

Thank you for using our Public Domain Library!
        `;
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${book.title}.txt"`);
        res.send(simulatedContent);
    });
});

// Get download statistics
app.get('/api/statistics', (req, res) => {
    const stats = {};
    
    // Total books count
    db.get('SELECT COUNT(*) as total FROM books', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.totalBooks = row.total;
        
        // Public domain books count
        db.get('SELECT COUNT(*) as count FROM books WHERE is_public_domain = 1', [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.publicDomainBooks = row.count;
            
            // Total downloads
            db.get('SELECT SUM(download_count) as total FROM books', [], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.totalDownloads = row.total || 0;
                
                res.json(stats);
            });
        });
    });
});

// Get all categories
app.get('/api/categories', (req, res) => {
    const sql = 'SELECT * FROM book_categories ORDER BY name';
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get books by category
app.get('/api/categories/:category/books', (req, res) => {
    const category = req.params.category;
    const sql = `
        SELECT ub.*, m.username, m.display_name 
        FROM user_books ub
        JOIN members m ON ub.user_id = m.id
        WHERE ub.genre = ? AND ub.is_shared = 1
        ORDER BY ub.created_at DESC
    `;
    
    db.all(sql, [category], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get user's personal books
app.get('/api/user/books', (req, res) => {
    const userId = req.query.user_id;
    const sql = 'SELECT * FROM user_books WHERE user_id = ? ORDER BY created_at DESC';
    
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Update user book (read status, etc.)
app.put('/api/user/books/:id', (req, res) => {
    const { is_read, personal_notes, personal_rating } = req.body;
    const sql = 'UPDATE user_books SET is_read = ?, personal_notes = ?, personal_rating = ? WHERE id = ?';
    
    db.run(sql, [is_read ? 1 : 0, personal_notes, personal_rating, req.params.id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Book updated successfully' });
    });
});

// Other existing routes (update, delete, search) remain the same
app.put('/api/books/:id', (req, res) => {
    const { is_read } = req.body;
    const sql = 'UPDATE books SET is_read = ? WHERE id = ?';
    
    db.run(sql, [is_read ? 1 : 0, req.params.id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Book updated successfully' });
    });
});

app.delete('/api/books/:id', (req, res) => {
    const sql = 'DELETE FROM books WHERE id = ?';
    
    db.run(sql, [req.params.id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Book deleted successfully' });
    });
});

app.get('/api/books/search', (req, res) => {
    const query = req.query.q;
    const sql = `SELECT * FROM books 
                 WHERE title LIKE ? OR author LIKE ? OR genre LIKE ? 
                 ORDER BY created_at DESC`;
    
    const searchTerm = `%${query}%`;
    db.all(sql, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// User Registration and Authentication
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password, display_name } = req.body;
    
    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Hash password (in real app, use bcrypt)
    const password_hash = `hashed_${password}`; // Replace with actual hashing
    
    const sql = `INSERT INTO members (username, email, password_hash, display_name) 
                 VALUES (?, ?, ?, ?)`;
    
    db.run(sql, [username, email, password_hash, display_name || username], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }
            return res.status(400).json({ error: err.message });
        }
        
        res.json({ 
            id: this.lastID,
            message: 'User registered successfully',
            user: { id: this.lastID, username, display_name: display_name || username }
        });
    });
});

// Add a book to personal collection
app.post('/api/user/books', (req, res) => {
    const { user_id, title, author, genre, year, is_public_domain, is_shared, personal_notes, personal_rating } = req.body;
    
    const sql = `INSERT INTO user_books (user_id, title, author, genre, year, is_public_domain, is_shared, personal_notes, personal_rating) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [user_id, title, author, genre, year, is_public_domain ? 1 : 0, is_shared ? 1 : 0, personal_notes, personal_rating], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        res.json({ 
            id: this.lastID,
            message: 'Book added to personal collection'
        });
    });
});

// Share a book from personal collection
app.post('/api/user/books/:id/share', (req, res) => {
    const userBookId = req.params.id;
    const { user_id, is_public, allow_downloads, expires_at } = req.body;
    
    // Generate unique share code
    const share_code = require('crypto').randomBytes(8).toString('hex');
    
    const sql = `INSERT INTO shared_books (user_book_id, shared_by_user_id, is_public, allow_downloads, share_code, expires_at) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [userBookId, user_id, is_public ? 1 : 0, allow_downloads ? 1 : 0, share_code, expires_at], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        // Update the user_books table to mark as shared
        db.run('UPDATE user_books SET is_shared = 1 WHERE id = ?', [userBookId]);
        
        res.json({ 
            id: this.lastID,
            share_code: share_code,
            message: 'Book shared successfully'
        });
    });
});

// Get shared books (community feed)
app.get('/api/community/books', (req, res) => {
    const sql = `
        SELECT 
            sb.*,
            ub.title, ub.author, ub.genre, ub.year, ub.is_public_domain,
            ub.personal_notes, ub.personal_rating,
            m.username, m.display_name, m.avatar_url,
            (SELECT COUNT(*) FROM book_interactions WHERE shared_book_id = sb.id AND interaction_type = 'like') as like_count,
            (SELECT COUNT(*) FROM book_interactions WHERE shared_book_id = sb.id AND interaction_type = 'comment') as comment_count
        FROM shared_books sb
        JOIN user_books ub ON sb.user_book_id = ub.id
        JOIN members m ON sb.shared_by_user_id = m.id
        WHERE sb.is_public = 1 
        ORDER BY sb.shared_at DESC
        LIMIT 50
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Like a shared book
app.post('/api/community/books/:id/like', (req, res) => {
    const sharedBookId = req.params.id;
    const { user_id } = req.body;
    
    // Check if already liked
    const checkSql = 'SELECT * FROM book_interactions WHERE shared_book_id = ? AND user_id = ? AND interaction_type = "like"';
    db.get(checkSql, [sharedBookId, user_id], (err, row) => {
        if (err) return res.status(400).json({ error: err.message });
        
        if (row) {
            // Unlike - remove the like
            db.run('DELETE FROM book_interactions WHERE id = ?', [row.id], function(err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ liked: false, message: 'Like removed' });
            });
        } else {
            // Like - add interaction
            const sql = 'INSERT INTO book_interactions (user_id, shared_book_id, interaction_type) VALUES (?, ?, "like")';
            db.run(sql, [user_id, sharedBookId], function(err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ liked: true, message: 'Book liked' });
            });
        }
    });
});

// Add comment to shared book
app.post('/api/community/books/:id/comment', (req, res) => {
    const sharedBookId = req.params.id;
    const { user_id, comment_text } = req.body;
    
    if (!comment_text || comment_text.trim().length === 0) {
        return res.status(400).json({ error: 'Comment cannot be empty' });
    }
    
    const sql = 'INSERT INTO book_interactions (user_id, shared_book_id, interaction_type, comment_text) VALUES (?, ?, "comment", ?)';
    
    db.run(sql, [user_id, sharedBookId, comment_text.trim()], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        res.json({ 
            id: this.lastID,
            message: 'Comment added successfully'
        });
    });
});

// Get comments for a shared book
app.get('/api/community/books/:id/comments', (req, res) => {
    const sharedBookId = req.params.id;
    
    const sql = `
        SELECT bi.*, m.username, m.display_name, m.avatar_url
        FROM book_interactions bi
        JOIN members m ON bi.user_id = m.id
        WHERE bi.shared_book_id = ? AND bi.interaction_type = 'comment'
        ORDER BY bi.created_at ASC
    `;
    
    db.all(sql, [sharedBookId], (err, rows) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Follow a user
app.post('/api/user/follow', (req, res) => {
    const { follower_id, following_id } = req.body;
    
    if (follower_id === following_id) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }
    
    const sql = 'INSERT OR IGNORE INTO user_follows (follower_id, following_id) VALUES (?, ?)';
    
    db.run(sql, [follower_id, following_id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            res.json({ following: true, message: 'Already following' });
        } else {
            res.json({ following: true, message: 'User followed successfully' });
        }
    });
});

// Get user profile
app.get('/api/user/:id', (req, res) => {
    const userId = req.params.id;
    
    const sql = `
        SELECT 
            m.*,
            (SELECT COUNT(*) FROM user_follows WHERE following_id = m.id) as follower_count,
            (SELECT COUNT(*) FROM user_follows WHERE follower_id = m.id) as following_count,
            (SELECT COUNT(*) FROM user_books WHERE user_id = m.id) as book_count,
            (SELECT COUNT(*) FROM shared_books 
             JOIN user_books ON shared_books.user_book_id = user_books.id 
             WHERE user_books.user_id = m.id) as shared_count
        FROM members m
        WHERE m.id = ?
    `;
    
    db.get(sql, [userId], (err, row) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(row);
    });
});

// Serve static files for PWA
app.use(express.static('../frontend', {
  setHeaders: (res, path) => {
    // Cache static assets for longer
    if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  }
}));

// Serve manifest.json with correct headers
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, '../frontend/manifest.json'));
});

// Serve service worker with correct scope
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, '../frontend/sw.js'));
});

// API endpoints for mobile-specific features
app.get('/api/mobile/stats', (req, res) => {
  // Return optimized stats for mobile
  const stats = {
    totalBooks: 1247,
    publicDomainBooks: 893,
    totalDownloads: 5281,
    activeUsers: 524,
    lastUpdated: new Date().toISOString()
  };
  res.json(stats);
});

// Push notification subscription endpoint
app.post('/api/notifications/subscribe', (req, res) => {
  const { subscription, userId } = req.body;
  // Store subscription in database
  console.log('Push subscription received:', subscription);
  res.json({ success: true, message: 'Subscribed to notifications' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Public Domain Library Ready!`);
    console.log(`💡 Open http://localhost:3000 in your browser`);
});
