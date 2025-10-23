const API_BASE = 'http://localhost:3000/api';

// Current user state (in real app, this would come from authentication)
let currentUser = {
    id: 1,
    username: 'booklover',
    display_name: 'Book Lover'
};

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}Tab`).style.display = 'block';
    
    // Add active class to clicked tab
    event.target.classList.add('active');
    
    // Load appropriate data
    if (tabName === 'community') {
        loadCommunityFeed();
    } else if (tabName === 'mybooks') {
        loadMyBooks();
    }
}

// Load community feed
async function loadCommunityFeed() {
    try {
        const response = await fetch(`${API_BASE}/community/books`);
        const sharedBooks = await response.json();
        displayCommunityFeed(sharedBooks);
    } catch (error) {
        console.error('Error loading community feed:', error);
    }
}

// Display community feed
function displayCommunityFeed(sharedBooks) {
    const feedContainer = document.getElementById('communityFeed');
    
    if (sharedBooks.length === 0) {
        feedContainer.innerHTML = `
            <div class="no-books">
                <h3>No books shared yet</h3>
                <p>Be the first to share a book with the community!</p>
            </div>
        `;
        return;
    }
    
    feedContainer.innerHTML = sharedBooks.map(book => `
        <div class="shared-book-card">
            <div class="shared-by">
                <div class="user-avatar small">${book.display_name?.charAt(0) || book.username?.charAt(0)}</div>
                <span>Shared by <strong>${book.display_name || book.username}</strong></span>
            </div>
            
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            ${book.genre ? `<p><strong>Genre:</strong> ${book.genre}</p>` : ''}
            ${book.year ? `<p><strong>Year:</strong> ${book.year}</p>` : ''}
            
            ${book.personal_notes ? `
                <div class="personal-notes">
                    <strong>Notes from ${book.display_name || book.username}:</strong>
                    <p>"${book.personal_notes}"</p>
                </div>
            ` : ''}
            
            ${book.personal_rating ? `
                <div class="user-rating">
                    <strong>Rating:</strong> 
                    ${'★'.repeat(book.personal_rating)}${'☆'.repeat(5 - book.personal_rating)}
                </div>
            ` : ''}
            
            <div class="shared-actions">
                <button class="action-btn like-btn ${book.user_liked ? 'liked' : ''}" 
                        onclick="toggleLike(${book.id})">
                    ❤️ Like (${book.like_count || 0})
                </button>
                <button class="action-btn" onclick="toggleComments(${book.id})">
                    💬 Comment (${book.comment_count || 0})
                </button>
                <button class="action-btn" onclick="followUser(${book.shared_by_user_id})">
                    👤 Follow
                </button>
            </div>
            
            <div class="comments-section" id="comments-${book.id}" style="display: none;">
                <div class="comments-list" id="comments-list-${book.id}">
                    <!-- Comments will be loaded here -->
                </div>
                <div class="comment-form">
                    <input type="text" class="comment-input" id="comment-input-${book.id}" 
                           placeholder="Add a comment...">
                    <button onclick="addComment(${book.id})">Post</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Like/Unlike functionality
async function toggleLike(sharedBookId) {
    try {
        const response = await fetch(`${API_BASE}/community/books/${sharedBookId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: currentUser.id })
        });
        
        const result = await response.json();
        if (response.ok) {
            loadCommunityFeed(); // Refresh feed to show updated likes
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Comment functionality
async function toggleComments(sharedBookId) {
    const commentsSection = document.getElementById(`comments-${sharedBookId}`);
    
    if (commentsSection.style.display === 'none') {
        // Load comments
        await loadComments(sharedBookId);
        commentsSection.style.display = 'block';
    } else {
        commentsSection.style.display = 'none';
    }
}

async function loadComments(sharedBookId) {
    try {
        const response = await fetch(`${API_BASE}/community/books/${sharedBookId}/comments`);
        const comments = await response.json();
        
        const commentsList = document.getElementById(`comments-list-${sharedBookId}`);
        commentsList.innerHTML = comments.map(comment => `
            <div class="comment">
                <div class="comment-author">${comment.display_name || comment.username}</div>
                <div class="comment-text">${comment.comment_text}</div>
                <div class="comment-time">${new Date(comment.created_at).toLocaleDateString()}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading comments:', error);
    }
}

async function addComment(sharedBookId) {
    const commentInput = document.getElementById(`comment-input-${sharedBookId}`);
    const commentText = commentInput.value.trim();
    
    if (!commentText) return;
    
    try {
        const response = await fetch(`${API_BASE}/community/books/${sharedBookId}/comment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                user_id: currentUser.id,
                comment_text: commentText
            })
        });
        
        if (response.ok) {
            commentInput.value = '';
            await loadComments(sharedBookId); // Refresh comments
            loadCommunityFeed(); // Refresh feed to update comment count
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// Follow user
async function followUser(userId) {
    try {
        const response = await fetch(`${API_BASE}/user/follow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                follower_id: currentUser.id,
                following_id: userId
            })
        });
        
        const result = await response.json();
        alert(result.message);
    } catch (error) {
        console.error('Error following user:', error);
    }
}

// Load user's personal books
async function loadMyBooks() {
    try {
        const response = await fetch(`${API_BASE}/user/books?user_id=${currentUser.id}`);
        const books = await response.json();
        displayMyBooks(books);
    } catch (error) {
        console.error('Error loading user books:', error);
    }
}

function displayMyBooks(books) {
    const container = document.getElementById('myBooksContainer');
    
    if (books.length === 0) {
        container.innerHTML = `
            <div class="no-books">
                <h3>Your collection is empty</h3>
                <p>Add some books to get started!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = books.map(book => `
        <div class="book-card ${book.is_shared ? 'shared' : 'private'}">
            ${book.is_shared ? '<span class="book-badge">👥 Shared</span>' : ''}
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            ${book.genre ? `<p><strong>Genre:</strong> ${book.genre}</p>` : ''}
            ${book.personal_rating ? `
                <p><strong>Your Rating:</strong> ${'★'.repeat(book.personal_rating)}</p>
            ` : ''}
            ${book.personal_notes ? `
                <p><strong>Your Notes:</strong> "${book.personal_notes}"</p>
            ` : ''}
            <div class="book-actions">
                ${!book.is_shared ? `
                    <button class="btn-share" onclick="shareBook(${book.id})">
                        📤 Share
                    </button>
                ` : ''}
                <button class="btn-edit" onclick="editBook(${book.id})">
                    ✏️ Edit
                </button>
            </div>
        </div>
    `).join('');
}

// Add personal book
document.getElementById('personalBookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookData = {
        user_id: currentUser.id,
        title: document.getElementById('personalTitle').value,
        author: document.getElementById('personalAuthor').value,
        genre: document.getElementById('personalGenre').value,
        year: document.getElementById('personalYear').value,
        personal_notes: document.getElementById('personalNotes').value,
        is_read: document.getElementById('personalIsRead').checked,
        is_public_domain: document.getElementById('personalIsPublicDomain').checked,
        is_shared: document.getElementById('personalShareBook').checked,
        personal_rating: document.querySelectorAll('.star.active').length
    };
    
    try {
        const response = await fetch(`${API_BASE}/user/books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookData)
        });
        
        if (response.ok) {
            alert('Book added to your collection!');
            document.getElementById('personalBookForm').reset();
            showTab('mybooks');
        }
    } catch (error) {
        console.error('Error adding book:', error);
        alert('Error adding book. Please try again.');
    }
});

// Star rating functionality
document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', function() {
        const rating = parseInt(this.dataset.rating);
        const stars = this.parentElement.querySelectorAll('.star');
        
        stars.forEach((s, index) => {
            if (index < rating) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCommunityFeed();
    updateUserProfile();
});

// Update user profile display
function updateUserProfile() {
    document.getElementById('userDisplayName').textContent = currentUser.display_name;
    document.getElementById('userAvatar').textContent = currentUser.display_name?.charAt(0) || 'U';
    
    // Load user stats
    fetch(`${API_BASE}/user/${currentUser.id}`)
        .then(response => response.json())
        .then(user => {
            document.getElementById('userBooks').textContent = user.book_count || 0;
            document.getElementById('userShared').textContent = user.shared_count || 0;
            document.getElementById('userFollowers').textContent = user.follower_count || 0;
            document.getElementById('userBio').textContent = user.bio || 'Book enthusiast and collector';
        });
}
