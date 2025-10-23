const API_BASE = 'http://localhost:3000/api';

let currentUser = { id: 1 }; // In real app, get from authentication
let currentTab = 'all';
let currentSort = 'date-added';

// Load user's library
async function loadMyLibrary() {
    try {
        const response = await fetch(`${API_BASE}/user/books?user_id=${currentUser.id}`);
        const books = await response.json();
        
        updateLibraryStats(books);
        displayMyBooks(books);
        
    } catch (error) {
        console.error('Error loading library:', error);
    }
}

// Update library statistics
function updateLibraryStats(books) {
    const totalBooks = books.length;
    const booksRead = books.filter(book => book.is_read).length;
    const sharedBooks = books.filter(book => book.is_shared).length;
    
    // Calculate reading progress
    const readingGoal = 12; // Example goal
    const progress = Math.min(Math.round((booksRead / readingGoal) * 100), 100);
    
    // Update DOM
    document.getElementById('totalMyBooks').textContent = totalBooks;
    document.getElementById('booksRead').textContent = booksRead;
    document.getElementById('sharedBooks').textContent = sharedBooks;
    document.getElementById('readingGoal').textContent = `${progress}%`;
    document.getElementById('readCount').textContent = booksRead;
    document.getElementById('readingGoalCount').textContent = readingGoal;
    document.getElementById('progressFill').style.width = `${progress}%`;
    
    // Show/hide empty state
    const emptyState = document.getElementById('emptyState');
    const booksContainer = document.getElementById('myBooksContainer');
    
    if (totalBooks === 0) {
        emptyState.style.display = 'block';
        booksContainer.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        booksContainer.style.display = 'grid';
    }
}

// Display user's books
function displayMyBooks(books) {
    const container = document.getElementById('myBooksContainer');
    
    // Filter books based on current tab
    let filteredBooks = books;
    
    switch (currentTab) {
        case 'reading':
            filteredBooks = books.filter(book => !book.is_read);
            break;
        case 'read':
            filteredBooks = books.filter(book => book.is_read);
            break;
        case 'want-to-read':
            filteredBooks = books.filter(book => !book.is_read);
            break;
        case 'shared':
            filteredBooks = books.filter(book => book.is_shared);
            break;
        case 'favorites':
            filteredBooks = books.filter(book => book.personal_rating >= 4);
            break;
    }
    
    // Sort books
    filteredBooks = sortBookList(filteredBooks, currentSort);
    
    if (filteredBooks.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #7f8c8d;">
                <div style="font-size: 3em; margin-bottom: 10px;">📖</div>
                <h3>No books found</h3>
                <p>Try a different filter or add some books to your library!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredBooks.map(book => `
        <div class="book-card ${book.is_read ? 'read' : 'unread'}">
            ${book.is_shared ? '<span class="book-badge">👥 Shared</span>' : ''}
            ${book.personal_rating ? `<span class="book-badge" style="background: #f39c12;">${'★'.repeat(book.personal_rating)}</span>` : ''}
            
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            ${book.genre ? `<p><strong>Genre:</strong> ${book.genre}</p>` : ''}
            ${book.year ? `<p><strong>Year:</strong> ${book.year}</p>` : ''}
            
            ${book.personal_notes ? `
                <div class="personal-notes">
                    <strong>Your Notes:</strong>
                    <p>"${book.personal_notes}"</p>
                </div>
            ` : ''}
            
            <p><strong>Status:</strong> ${book.is_read ? '✅ Read' : '📖 Unread'}</p>
            <p><strong>Added:</strong> ${new Date(book.created_at).toLocaleDateString()}</p>
            
            <div class="book-actions">
                <button class="${book.is_read ? 'btn-unread' : 'btn-read'}" 
                        onclick="toggleReadStatus(${book.id}, ${!book.is_read})">
                    ${book.is_read ? 'Mark Unread' : 'Mark Read'}
                </button>
                <button class="btn-edit" onclick="editBook(${book.id})">
                    ✏️ Edit
                </button>
                ${book.is_shared ? `
                    <button class="btn-unshare" onclick="unshareBook(${book.id})">
                        🔒 Unshare
                    </button>
                ` : `
                    <button class="btn-share" onclick="shareBook(${book.id})">
                        📤 Share
                    </button>
                `}
                <button class="btn-delete" onclick="deleteBook(${book.id})">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Sort books
function sortBookList(books, sortBy) {
    return [...books].sort((a, b) => {
        switch (sortBy) {
            case 'title':
                return a.title.localeCompare(b.title);
            case 'author':
                return a.author.localeCompare(b.author);
            case 'rating':
                return (b.personal_rating || 0) - (a.personal_rating || 0);
            case 'date-added':
            default:
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });
}

// Tab management
function showLibraryTab(tab) {
    currentTab = tab;
    
    // Update active tab
    document.querySelectorAll('.library-tab').forEach(tabEl => {
        tabEl.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update title
    const titles = {
        'all': 'All My Books',
        'reading': 'Currently Reading',
        'read': 'Finished Reading', 
        'want-to-read': 'Want to Read',
        'shared': 'Shared Books',
        'favorites': 'My Favorites'
    };
    document.getElementById('libraryTabTitle').textContent = titles[tab];
    
    // Reload books with new filter
    loadMyLibrary();
}

// Sort books
function sortBooks(sortBy) {
    currentSort = sortBy;
    
    // Update active sort button
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Reload books with new sort
    loadMyLibrary();
}

// Book actions
async function toggleReadStatus(bookId, isRead) {
    try {
        const response = await fetch(`${API_BASE}/user/books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_read: isRead })
        });
        
        if (response.ok) {
            loadMyLibrary();
        }
    } catch (error) {
        console.error('Error updating book:', error);
    }
}

async function shareBook(bookId) {
    try {
        const response = await fetch(`${API_BASE}/user/books/${bookId}/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: currentUser.id })
        });
        
        if (response.ok) {
            alert('Book shared with community!');
            loadMyLibrary();
        }
    } catch (error) {
        console.error('Error sharing book:', error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadMyLibrary();
});
