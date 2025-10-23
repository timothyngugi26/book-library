const API_BASE = 'http://localhost:3000/api';

let currentCategory = null;
let allCategories = [];
let allBooks = [];

// Load categories and books
async function loadCategories() {
    try {
        // Load categories
        const categoriesResponse = await fetch(`${API_BASE}/categories`);
        allCategories = await categoriesResponse.json();
        
        // Load books from community
        const booksResponse = await fetch(`${API_BASE}/community/books`);
        allBooks = await booksResponse.json();
        
        displayCategories(allCategories);
        displayRecentCommunityBooks(allBooks.slice(0, 6));
        displayPopularGenres();
        
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Display categories grid
function displayCategories(categories) {
    const container = document.getElementById('categoriesContainer');
    
    container.innerHTML = categories.map(category => `
        <div class="category-card" onclick="showCategoryDetail('${category.name}')" 
             style="border-color: ${category.color}">
            <div class="category-icon">${category.icon}</div>
            <h3 class="category-title">${category.name}</h3>
            <p style="color: #7f8c8d; margin-bottom: 10px;">${category.description}</p>
            <div class="category-count">
                ${getBooksInCategory(category.name).length} books
            </div>
        </div>
    `).join('');
}

// Get books in a specific category
function getBooksInCategory(categoryName) {
    return allBooks.filter(book => 
        book.genre === categoryName || 
        (book.genre && book.genre.toLowerCase().includes(categoryName.toLowerCase()))
    );
}

// Show category detail view
function showCategoryDetail(categoryName) {
    currentCategory = categoryName;
    const category = allCategories.find(cat => cat.name === categoryName);
    const categoryBooks = getBooksInCategory(categoryName);
    
    // Update category detail view
    document.getElementById('currentCategoryName').textContent = categoryName;
    document.getElementById('categoryDetailTitle').textContent = categoryName;
    document.getElementById('categoryDetailDescription').textContent = category?.description || `Explore ${categoryName} books shared by our community.`;
    document.getElementById('categoryBookCount').textContent = `${categoryBooks.length} books`;
    
    // Show category tags
    const tagsContainer = document.getElementById('categoryTags');
    const popularTags = getPopularTags(categoryBooks);
    tagsContainer.innerHTML = popularTags.map(tag => `
        <span class="tag">${tag}</span>
    `).join('');
    
    // Display books in this category
    displayCategoryBooks(categoryBooks);
    
    // Switch views
    document.getElementById('allCategoriesView').style.display = 'none';
    document.getElementById('categoryDetailView').style.display = 'block';
}

// Display books in a category
function displayCategoryBooks(books) {
    const container = document.getElementById('categoryBooksContainer');
    
    if (books.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #7f8c8d;">
                <div style="font-size: 3em; margin-bottom: 10px;">📚</div>
                <h3>No books in this category yet</h3>
                <p>Be the first to share a ${currentCategory} book in the community!</p>
                <a href="community.html" class="action-btn" style="text-decoration: none; display: inline-block; margin-top: 15px;">
                    Share a Book
                </a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = books.map(book => `
        <div class="book-card ${book.is_read ? 'read' : 'unread'}">
            ${book.is_public_domain ? '<span class="book-badge">🆓 Public Domain</span>' : ''}
            ${book.personal_rating ? `<span class="book-badge" style="background: #f39c12;">${'★'.repeat(book.personal_rating)}</span>` : ''}
            
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            <p><strong>Shared by:</strong> ${book.display_name || book.username}</p>
            ${book.year ? `<p><strong>Year:</strong> ${book.year}</p>` : ''}
            
            ${book.personal_notes ? `
                <div class="personal-notes">
                    <p>"${book.personal_notes.substring(0, 100)}..."</p>
                </div>
            ` : ''}
            
            <div class="book-actions">
                <button class="btn-view" onclick="viewBook(${book.id})">
                    👁️ View
                </button>
                <button class="btn-like" onclick="likeBook(${book.id})">
                    ❤️ Like (${book.like_count || 0})
                </button>
                <a href="community.html" class="btn-comment" style="text-decoration: none;">
                    💬 Comment
                </a>
            </div>
        </div>
    `).join('');
}

// Display recent community books
function displayRecentCommunityBooks(books) {
    const container = document.getElementById('recentCommunityBooks');
    
    container.innerHTML = books.map(book => `
        <div class="book-card">
            <span class="book-badge">${book.genre || 'General'}</span>
            
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            <p><strong>By:</strong> ${book.display_name || book.username}</p>
            
            ${book.personal_rating ? `
                <p><strong>Rating:</strong> ${'★'.repeat(book.personal_rating)}</p>
            ` : ''}
            
            <div class="book-actions">
                <button class="btn-view" onclick="viewBook(${book.id})">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

// Display popular genres
function displayPopularGenres() {
    const container = document.getElementById('popularGenres');
    
    // Count books per genre
    const genreCounts = {};
    allBooks.forEach(book => {
        if (book.genre) {
            genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
        }
    });
    
    // Get top genres
    const popularGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([genre, count]) => genre);
    
    container.innerHTML = popularGenres.map(genre => `
        <span class="tag" onclick="showCategoryDetail('${genre}')">${genre} (${genreCounts[genre]})</span>
    `).join('');
}

// Get popular tags from books
function getPopularTags(books) {
    const tags = new Set();
    
    books.forEach(book => {
        if (book.genre) tags.add(book.genre);
        // You could extract more tags from descriptions or notes
    });
    
    return Array.from(tags).slice(0, 8);
}

// Filter categories
function filterCategories(filter) {
    let filteredCategories = allCategories;
    
    switch (filter) {
        case 'popular':
            // Sort by book count (you'd need to implement this)
            filteredCategories = [...allCategories].sort((a, b) => {
                return getBooksInCategory(b.name).length - getBooksInCategory(a.name).length;
            });
            break;
        case 'recent':
            // Sort by recent activity (simplified)
            filteredCategories = [...allCategories].reverse();
            break;
    }
    
    displayCategories(filteredCategories);
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Search categories
document.getElementById('categorySearch').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    
    const filteredCategories = allCategories.filter(category =>
        category.name.toLowerCase().includes(query) ||
        category.description.toLowerCase().includes(query)
    );
    
    displayCategories(filteredCategories);
});

// Back to all categories
function backToCategories() {
    document.getElementById('allCategoriesView').style.display = 'block';
    document.getElementById('categoryDetailView').style.display = 'none';
    currentCategory = null;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
});
