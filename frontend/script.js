const API_BASE = 'http://localhost:3000/api';

// DOM Elements
const bookForm = document.getElementById('bookForm');
const booksContainer = document.getElementById('booksContainer');
const searchInput = document.getElementById('searchInput');
const showAllBtn = document.getElementById('showAll');
const showPublicDomainBtn = document.getElementById('showPublicDomain');
const statsSection = document.getElementById('statsSection');

// Statistics elements
const totalBooksEl = document.getElementById('totalBooks');
const publicDomainBooksEl = document.getElementById('publicDomainBooks');
const totalDownloadsEl = document.getElementById('totalDownloads');

// Current filter state
let currentFilter = 'all';

// Load everything when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadBooks();
    loadStatistics();
    
    // Set up filter buttons
    showAllBtn.addEventListener('click', () => {
        setActiveFilter('all');
        loadBooks();
    });
    
    showPublicDomainBtn.addEventListener('click', () => {
        setActiveFilter('public-domain');
        loadPublicDomainBooks();
    });
});

// Set active filter
function setActiveFilter(filter) {
    currentFilter = filter;
    showAllBtn.classList.toggle('active', filter === 'all');
    showPublicDomainBtn.classList.toggle('active', filter === 'public-domain');
}

// Add new book
bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookData = {
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        genre: document.getElementById('genre').value,
        year: document.getElementById('year').value,
        is_read: document.getElementById('is_read').checked,
        is_public_domain: document.getElementById('is_public_domain').checked
    };

    try {
        const response = await fetch(`${API_BASE}/books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookData)
        });

        if (response.ok) {
            bookForm.reset();
            loadBooks();
            loadStatistics();
        }
    } catch (error) {
        console.error('Error adding book:', error);
        alert('Error adding book. Please try again.');
    }
});

// Search books
searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (query.length > 2) {
        searchBooks(query);
    } else if (query.length === 0) {
        if (currentFilter === 'all') {
            loadBooks();
        } else {
            loadPublicDomainBooks();
        }
    }
});

// Load all books
async function loadBooks() {
    try {
        const response = await fetch(`${API_BASE}/books`);
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error loading books:', error);
    }
}

// Load public domain books only
async function loadPublicDomainBooks() {
    try {
        const response = await fetch(`${API_BASE}/books/public-domain`);
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error loading public domain books:', error);
    }
}

// Search books
async function searchBooks(query) {
    try {
        const response = await fetch(`${API_BASE}/books/search?q=${encodeURIComponent(query)}`);
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        console.error('Error searching books:', error);
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${API_BASE}/statistics`);
        const stats = await response.json();
        
        totalBooksEl.textContent = stats.totalBooks;
        publicDomainBooksEl.textContent = stats.publicDomainBooks;
        totalDownloadsEl.textContent = stats.totalDownloads;
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Display books in grid
function displayBooks(books) {
    booksContainer.innerHTML = '';
    
    if (books.length === 0) {
        booksContainer.innerHTML = '<p class="no-books">No books found. Add some books to your library!</p>';
        return;
    }
    
    books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = `book-card ${book.is_public_domain ? 'public-domain' : 'copyrighted'} ${book.is_read ? 'read' : 'unread'}`;
        
        // Public domain badge
        const badge = book.is_public_domain ? '<span class="book-badge">🆓 Public Domain</span>' : '';
        
        // Download button
        const downloadButton = book.is_public_domain ? 
            `<button class="btn-download" onclick="downloadBook(${book.id})">📥 Download (${book.download_count || 0})</button>` : 
            '<span class="no-download">Copyright Protected</span>';
        
        bookCard.innerHTML = `
            ${badge}
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            ${book.genre ? `<p><strong>Genre:</strong> ${book.genre}</p>` : ''}
            ${book.year ? `<p><strong>Year:</strong> ${book.year}</p>` : ''}
            <p><strong>Status:</strong> ${book.is_read ? '✅ Read' : '📖 Unread'}</p>
            <p><strong>Copyright:</strong> ${book.is_public_domain ? '🆓 Public Domain' : '© Copyrighted'}</p>
            <div class="book-actions">
                ${downloadButton}
                <button class="${book.is_read ? 'btn-unread' : 'btn-read'}" 
                        onclick="toggleReadStatus(${book.id}, ${!book.is_read})">
                    ${book.is_read ? 'Mark Unread' : 'Mark Read'}
                </button>
                <button class="btn-delete" onclick="deleteBook(${book.id})">
                    Delete
                </button>
            </div>
        `;
        
        booksContainer.appendChild(bookCard);
    });
}

// Download book
async function downloadBook(bookId) {
    try {
        const response = await fetch(`${API_BASE}/books/${bookId}/download`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            
            // Get filename from response or use book ID
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `book-${bookId}.txt`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            
            // Reload to update download counts
            setTimeout(() => {
                if (currentFilter === 'all') {
                    loadBooks();
                } else {
                    loadPublicDomainBooks();
                }
                loadStatistics();
            }, 1000);
            
        } else {
            const error = await response.json();
            alert(error.error || 'This book is not available for download');
        }
    } catch (error) {
        console.error('Download error:', error);
        alert('Error downloading book. Please try again.');
    }
}

// Toggle read status
async function toggleReadStatus(bookId, isRead) {
    try {
        const response = await fetch(`${API_BASE}/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_read: isRead })
        });

        if (response.ok) {
            if (currentFilter === 'all') {
                loadBooks();
            } else {
                loadPublicDomainBooks();
            }
        }
    } catch (error) {
        console.error('Error updating book:', error);
    }
}

// Delete book
async function deleteBook(bookId) {
    if (confirm('Are you sure you want to delete this book?')) {
        try {
            const response = await fetch(`${API_BASE}/books/${bookId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                if (currentFilter === 'all') {
                    loadBooks();
                } else {
                    loadPublicDomainBooks();
                }
                loadStatistics();
            }
        } catch (error) {
            console.error('Error deleting book:', error);
        }
    }
}
