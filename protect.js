// ========================================
// PROTECT (TenantShield) - Main Script
// ========================================

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initLocker();
  initComplaint();
  loadLockerFromStorage();
  updateSummary();
});

// ========================================
// TAB NAVIGATION
// ========================================
function initTabs() {
  const tabs = document.querySelectorAll('.pr-tab');
  const panels = document.querySelectorAll('.pr-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;

      // Update active states
      tabs.forEach(t => t.classList.remove('pr-tab-active'));
      panels.forEach(p => p.classList.remove('pr-panel-active'));

      tab.classList.add('pr-tab-active');
      document.querySelector(`[data-panel="${targetTab}"]`).classList.add('pr-panel-active');
    });
  });
}

// ========================================
// EVIDENCE LOCKER (Phase 1)
// ========================================
let lockerData = [];
let pendingPhotos = [];

function initLocker() {
  const form = document.getElementById('pr-locker-form');
  const photoInput = document.getElementById('pr-ev-photos');
  const filterCategory = document.getElementById('pr-filter-category');
  const sortOrder = document.getElementById('pr-sort-order');

  // Set today's date as default
  document.getElementById('pr-ev-date').valueAsDate = new Date();

  // Photo upload
  photoInput.addEventListener('change', (e) => {
    handlePhotoUpload(e.target.files);
  });

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addEvidence();
  });

  // Filters
  filterCategory.addEventListener('change', renderTimeline);
  sortOrder.addEventListener('change', renderTimeline);
}

function handlePhotoUpload(files) {
  const preview = document.getElementById('pr-photo-preview');

  Array.from(files).forEach((file, index) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      // Resize image
      resizeImage(e.target.result, 800, (resized) => {
        pendingPhotos.push(resized);
        
        // Show preview
        const item = document.createElement('div');
        item.className = 'pr-photo-item';
        item.innerHTML = `
          <img src="${resized}" alt="Preview">
          <button type="button" class="pr-photo-remove" data-index="${pendingPhotos.length - 1}">×</button>
        `;
        
        item.querySelector('.pr-photo-remove').addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.index);
          pendingPhotos.splice(idx, 1);
          item.remove();
        });
        
        preview.appendChild(item);
      });
    };
    reader.readAsDataURL(file);
  });
}

function resizeImage(dataUrl, maxWidth, callback) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    callback(canvas.toDataURL('image/jpeg', 0.85));
  };
  img.src = dataUrl;
}

function addEvidence() {
  const date = document.getElementById('pr-ev-date').value;
  const category = document.getElementById('pr-ev-category').value;
  const title = document.getElementById('pr-ev-title').value;
  const note = document.getElementById('pr-ev-note').value;
  const amount = document.getElementById('pr-ev-amount').value;

  if (!date || !category || !title) return;

  const entry = {
    id: 'ev_' + Date.now(),
    date,
    category,
    title,
    note,
    amount: amount ? parseFloat(amount) : null,
    photos: [...pendingPhotos]
  };

  lockerData.push(entry);
  saveLockerToStorage();
  
  // Reset form
  document.getElementById('pr-locker-form').reset();
  document.getElementById('pr-ev-date').valueAsDate = new Date();
  document.getElementById('pr-photo-preview').innerHTML = '';
  pendingPhotos = [];

  renderTimeline();
  updateSummary();
}

function renderTimeline() {
  const timeline = document.getElementById('pr-timeline');
  const filterCategory = document.getElementById('pr-filter-category').value;
  const sortOrder = document.getElementById('pr-sort-order').value;

  let filtered = lockerData.filter(entry => 
    !filterCategory || entry.category === filterCategory
  );

  // Sort
  filtered.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  if (filtered.length === 0) {
    timeline.innerHTML = `
      <div class="pr-empty-timeline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15h6"/></svg>
        <p>${filterCategory ? 'No entries in this category.' : 'No entries yet. Add your first piece of evidence above.'}</p>
      </div>
    `;
    return;
  }

  const list = document.createElement('ul');
  list.className = 'pr-timeline-list';

  filtered.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'pr-timeline-item';
    
    // Add category-based class
    if (entry.category === 'Deduction') {
      li.classList.add('pr-cat-alert');
    } else if (entry.category === 'Maintenance complaint') {
      li.classList.add('pr-cat-warning');
    }

    const formattedDate = new Date(entry.date).toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });

    let photosHtml = '';
    if (entry.photos && entry.photos.length > 0) {
      photosHtml = '<div class="pr-timeline-photos">' +
        entry.photos.map(photo => `<img src="${photo}" alt="Evidence photo">`).join('') +
        '</div>';
    }

    let amountHtml = '';
    if (entry.amount !== null) {
      const amountClass = entry.amount < 0 ? 'pr-negative' : 'pr-positive';
      const amountText = entry.amount < 0 ? `-₹${Math.abs(entry.amount)}` : `₹${entry.amount}`;
      amountHtml = `<div class="pr-timeline-amount ${amountClass}">${amountText}</div>`;
    }

    li.innerHTML = `
      <div class="pr-timeline-date">${formattedDate}</div>
      <div class="pr-timeline-content">
        <span class="pr-timeline-category">${entry.category}</span>
        <div class="pr-timeline-title">${entry.title}</div>
        ${entry.note ? `<div class="pr-timeline-note">${entry.note}</div>` : ''}
        ${amountHtml}
        ${photosHtml}
      </div>
      <div class="pr-timeline-actions">
        <button class="pr-timeline-delete" data-id="${entry.id}">Delete</button>
      </div>
    `;

    // Delete handler
    li.querySelector('.pr-timeline-delete').addEventListener('click', (e) => {
      if (confirm('Delete this entry? This cannot be undone.')) {
        lockerData = lockerData.filter(item => item.id !== entry.id);
        saveLockerToStorage();
        renderTimeline();
        updateSummary();
      }
    });

    list.appendChild(li);
  });

  timeline.innerHTML = '';
  timeline.appendChild(list);
}

function updateSummary() {
  const count = lockerData.length;
  const countEl = document.getElementById('pr-summary-count');
  const rangeEl = document.getElementById('pr-summary-range');
  const disputedEl = document.getElementById('pr-summary-disputed');

  countEl.textContent = count;

  if (count === 0) {
    rangeEl.textContent = '—';
    disputedEl.textContent = '₹0';
    return;
  }

  // Date range
  const dates = lockerData.map(e => new Date(e.date)).sort((a, b) => a - b);
  const first = dates[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const last = dates[dates.length - 1].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  rangeEl.textContent = `${first} – ${last}`;

  // Disputed amount (negative amounts)
  const disputed = lockerData
    .filter(e => e.amount !== null && e.amount < 0)
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);
  disputedEl.textContent = `₹${disputed.toLocaleString('en-IN')}`;
}

function loadSampleData() {
  if (lockerData.length > 0) {
    if (!confirm('This will replace your current data. Continue?')) return;
  }

  lockerData = JSON.parse(JSON.stringify(PR_SAMPLE_LOCKER));
  saveLockerToStorage();
  renderTimeline();
  updateSummary();
}

function exportLocker() {
  if (lockerData.length === 0) {
    alert('No evidence to export.');
    return;
  }

  // Create printable document
  const printWindow = window.open('', '', 'width=800,height=600');
  const doc = printWindow.document;
  
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>TenantShield Evidence - Export</title>
      <style>
        body { font-family: Georgia, serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .meta { color: #666; margin-bottom: 32px; }
        .entry { margin-bottom: 32px; page-break-inside: avoid; }
        .entry-date { font-weight: bold; color: #1E3A2C; }
        .entry-category { display: inline-block; padding: 2px 8px; background: #D3DDD4; border-radius: 4px; font-size: 12px; margin-left: 8px; }
        .entry-title { font-size: 18px; margin: 8px 0; }
        .entry-note { color: #333; line-height: 1.6; margin: 8px 0; }
        .entry-amount { font-weight: bold; }
        .negative { color: #C0392B; }
        .positive { color: #2E7D4F; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>TenantShield Evidence Record</h1>
      <div class="meta">Exported on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
  `);

  const sorted = [...lockerData].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  sorted.forEach(entry => {
    const date = new Date(entry.date).toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    let amountHtml = '';
    if (entry.amount !== null) {
      const amountClass = entry.amount < 0 ? 'negative' : 'positive';
      const amountText = entry.amount < 0 ? `-₹${Math.abs(entry.amount)}` : `₹${entry.amount}`;
      amountHtml = `<div class="entry-amount ${amountClass}">${amountText}</div>`;
    }

    doc.write(`
      <div class="entry">
        <div class="entry-date">${date}<span class="entry-category">${entry.category}</span></div>
        <div class="entry-title">${entry.title}</div>
        ${entry.note ? `<div class="entry-note">${entry.note}</div>` : ''}
        ${amountHtml}
      </div>
    `);
  });

  doc.write(`</body></html>`);
  doc.close();
  printWindow.print();
}

function saveLockerToStorage() {
  localStorage.setItem('tn_protect_locker', JSON.stringify(lockerData));
}

function loadLockerFromStorage() {
  const stored = localStorage.getItem('tn_protect_locker');
  if (stored) {
    lockerData = JSON.parse(stored);
    renderTimeline();
  }
}

// ========================================
// COMPLAINT LETTER (Phase 3)
// ========================================
function initComplaint() {
  const form = document.getElementById('pr-complaint-form');
  const copyBtn = document.getElementById('pr-copy-letter');
  const printBtn = document.getElementById('pr-print-letter');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    generateLetter();
  });

  copyBtn.addEventListener('click', copyLetter);
  printBtn.addEventListener('click', () => window.print());

  // Populate escalation steps
  const list = document.getElementById('pr-escalation-list');
  PR_ESCALATION_INFO.forEach(step => {
    const li = document.createElement('li');
    li.textContent = step;
    list.appendChild(li);
  });
}

function generateLetter() {
  const yourName = document.getElementById('pr-c-your-name').value;
  const landlordName = document.getElementById('pr-c-landlord-name').value;
  const address = document.getElementById('pr-c-address').value;
  const issue = document.getElementById('pr-c-issue').value;
  const amount = document.getElementById('pr-c-amount').value;
  const issueDate = document.getElementById('pr-c-issue-date').value;
  const deadline = document.getElementById('pr-c-deadline').value;
  const whatYouWant = document.getElementById('pr-c-what-you-want').value;

  if (!yourName || !landlordName || !address || !issue || !issueDate || !whatYouWant) {
    alert('Please fill all required fields.');
    return;
  }

  const today = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const issueDateFormatted = new Date(issueDate).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const deadlineDate = new Date();
  deadlineDate.setDate(deadlineDate.getDate() + parseInt(deadline));
  const deadlineDateFormatted = deadlineDate.toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const issueTexts = {
    'deposit': 'my security deposit has not been returned',
    'repairs': 'necessary repairs have not been carried out',
    'deductions': 'illegal deductions have been made from my security deposit',
    'harassment': 'I have been subjected to harassment and entry without proper notice'
  };

  let evidenceList = '';
  if (lockerData.length > 0) {
    evidenceList = '<p><strong>Supporting Evidence:</strong></p><p>';
    const relevant = lockerData.slice(0, 5); // Show up to 5 entries
    relevant.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      evidenceList += `${date}: ${entry.title}<br>`;
    });
    if (lockerData.length > 5) {
      evidenceList += `... and ${lockerData.length - 5} more entries`;
    }
    evidenceList += '</p>';
  }

  const letter = `
    <p><strong>Date:</strong> ${today}</p>
    <p><strong>To:</strong><br>${landlordName}<br>${address}</p>
    <p><strong>Subject:</strong> Formal Notice Regarding ${issue.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
    <p>Dear ${landlordName},</p>
    <p>I am writing to formally notify you that ${issueTexts[issue]} in relation to the property located at ${address}, which I rented from you.</p>
    <p>Since ${issueDateFormatted}, ${whatYouWant.toLowerCase()}. ${amount ? `The amount in question is ₹${parseFloat(amount).toLocaleString('en-IN')}.` : ''} Despite my previous communication, this matter remains unresolved.</p>
    ${evidenceList}
    <p>I hereby request that you ${whatYouWant.toLowerCase()} within ${deadline} days from the date of this letter, i.e., by ${deadlineDateFormatted}. Failure to comply will compel me to seek legal remedies, including filing a complaint with the appropriate authorities.</p>
    <p>I trust this matter will be resolved amicably and promptly.</p>
    <p><strong>Yours sincerely,</strong><br>${yourName}</p>
  `;

  document.getElementById('pr-letter-doc').innerHTML = letter;
  document.getElementById('pr-letter-empty').hidden = true;
  document.getElementById('pr-letter-content').hidden = false;

  // Scroll to letter
  document.getElementById('pr-letter-content').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyLetter() {
  const letterEl = document.getElementById('pr-letter-doc');
  const text = letterEl.innerText;
  
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('pr-copy-letter');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(() => {
    alert('Could not copy. Please select and copy manually.');
  });
}
