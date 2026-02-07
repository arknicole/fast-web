// ==========================================
// 1. APPOINTMENT DATE HANDLING
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  // Set minimum date to today
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;
  
  const dateInput = document.getElementById('appt_date');
  if (dateInput) {
    dateInput.setAttribute('min', todayString);
  }
});

// ==========================================
// 2. APPOINTMENT FORM SUBMISSION
// ==========================================
const apptForm = document.getElementById('appointmentForm');
if (apptForm) {
  apptForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const form = this; 
    
    // Collect Data
    const data = {
      fullname: document.getElementById('fullname').value,
      email: document.getElementById('email').value,
      contact: document.getElementById('contact').value,
      program: document.getElementById('program').value,
      appt_date: document.getElementById('appt_date').value,
      appt_time: document.getElementById('appt_time').value
    };

    // Validation: Contact Number (Numbers only)
    const contactNumber = document.getElementById('contact').value.trim();
    const contactRegex = /^[0-9]+$/;
    if (!contactRegex.test(contactNumber)) {
      document.getElementById('formStatus').innerText = 'Contact number must contain only numbers.';
      return;
    }
    
    // Validation: Past Dates
    const selectedDate = new Date(data.appt_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    if (selectedDate < today) {
      document.getElementById('formStatus').innerText = 'You cannot select a past date for an appointment.';
      return;
    }
    
    // Validation: Sundays
    const dateObj = new Date(data.appt_date);
    if (dateObj.getUTCDay() === 0) {
      document.getElementById('formStatus').innerText = 'Appointments are only allowed Monday to Saturday.';
      return;
    }

    // Submit to API
    fetch('/api/appointment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
      if (result.message.includes('successfully')) {
        showAppointmentModal(data);
        form.reset(); 
        document.getElementById('formStatus').innerText = ''; 
      } else {
        document.getElementById('formStatus').innerText = result.message;
      }
    })
    .catch(() => {
      document.getElementById('formStatus').innerText = 'Error submitting appointment.';
    });
  });
}

// ==========================================
// 3. APPOINTMENT SUCCESS MODAL
// ==========================================
function showAppointmentModal(data) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const programName = data.program === 'AMT' ? 'Aircraft Maintenance Technology' : 'Aviation Electronics Technology';
  const formattedDate = new Date(data.appt_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  overlay.innerHTML = `
    <div class="modal-content">
      <h2>Appointment Submitted!</h2>
      <p>Thank you, <strong>${data.fullname}</strong>. Your appointment request has been received. Please review the details below.</p>
      <hr>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Contact No:</strong> ${data.contact}</p>
      <p><strong>Program:</strong> ${programName}</p>
      <p><strong>Preferred Date:</strong> ${formattedDate} (${data.appt_time})</p>
      <button class="modal-close-btn">Close</button>
    </div>
  `;

  document.body.appendChild(overlay);
  
  // Small delay to allow CSS transition
  setTimeout(() => overlay.classList.add('is-visible'), 10);

  overlay.querySelector('.modal-close-btn').addEventListener('click', () => {
    overlay.classList.remove('is-visible');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  });
}

// ==========================================
// 4. ADMIN HOTKEY (Alt + A)
// ==========================================
document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'a') {
    const adminLink = document.querySelector('.admin-link');
    if (adminLink) {
      // Toggle visibility or just show it
      adminLink.style.display = (adminLink.style.display === 'none') ? 'inline-block' : 'none';
    }
  }
});

// ==========================================
// 5. BACKGROUND ANIMATION
// ==========================================
const layer = document.getElementById('animation-layer');
if (layer) {
  function createMover(type, symbol) {
    const el = document.createElement('div');
    el.classList.add(type);
    el.innerText = symbol;
    el.style.top = Math.random() * 90 + 'vh';
    el.style.left = Math.random() * 90 + 'vw';
    el.style.setProperty('--xMove', (Math.random() * 200 - 100) + 'vw');
    el.style.setProperty('--yMove', (Math.random() * 200 - 100) + 'vh');
    el.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    el.style.animation = `moveRandom ${10 + Math.random() * 20}s linear infinite alternate`;
    layer.appendChild(el);
  }
  // Create 10 planes and 10 gears
  for (let i = 0; i < 10; i++) { createMover('plane', '✈️'); }
  for (let i = 0; i < 10; i++) { createMover('gear', '⚙️'); }
}

// ==========================================
// 6. NEWS SLIDER LOADER
// ==========================================
function loadNews() {
  fetch('/api/news')
    .then(res => res.json())
    .then(data => {
      const wrapper = document.getElementById('news-container-wrapper');
      const swiperContainer = document.querySelector('.swiper-news');
      if (!wrapper || !swiperContainer) return;

      wrapper.innerHTML = '';

      // Strict filter to remove empty database rows
      const filteredData = data.filter(item => {
        const hasTitle = item.title && item.title.trim().length > 0;
        const hasContent = item.content && item.content.trim().length > 0;
        const hasImage = item.image && item.image.trim().length > 0;
        return hasTitle || hasContent || hasImage;
      });

      if (filteredData.length === 0) {
        wrapper.innerHTML = '<div class="swiper-slide news-slide-item"><h3>No news at this time</h3></div>';
        return;
      }

      // Render Slides
      filteredData.forEach(newsItem => {
        const slide = document.createElement('div');
        slide.classList.add('swiper-slide', 'news-slide-item');
        slide.innerHTML = `
          ${newsItem.image ? `<img src="${newsItem.image}" alt="${newsItem.title}" class="news-image">` : ''}
          <div class="news-text-content">
            <h3>${newsItem.title}</h3>
            <p>${newsItem.content}</p>
          </div>
        `;
        wrapper.appendChild(slide);
      });

      // Swiper Configuration
      const swiperOptions = {
        effect: 'slide',
        grabCursor: true,
        centeredSlides: true, 
        slidesPerView: 'auto', 
        spaceBetween: 20, 
        loop: true, 
        // Autoplay removed for professional feel
        // AutoHeight removed to allow CSS to force uniform sizing
        observer: true, 
        observeParents: true,
        pagination: {
          el: '.swiper-pagination-news',
          clickable: true,
        },
      };

      if (filteredData.length > 1) {
        swiperOptions.navigation = {
          nextEl: '.swiper-button-next-news',
          prevEl: '.swiper-button-prev-news',
        };
      } else {
        const nextBtn = swiperContainer.querySelector('.swiper-button-next-news');
        const prevBtn = swiperContainer.querySelector('.swiper-button-prev-news');
        if (nextBtn) nextBtn.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';
      }

      const swiperNews = new Swiper('.swiper-news', swiperOptions);
    })
    .catch(() => { });
}

// ==========================================
// 7. ABOUT SECTION LOADER
// ==========================================
function loadAbout() {
  fetch('/api/about')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('about-content-container');
      if (!container) return;

      const courses = (data.courses_offered || '').replace(/\n/g, '<br>');
      const fees = (data.fees_scholarships || '').replace(/\n/g, '<br>');
      
      // Use specific fields from the server API
      const freshmenReq = (data.enrollment_requirements_freshmen || '').replace(/\n/g, '<br>');
      const transfereesReq = (data.enrollment_requirements_transferees || '').replace(/\n/g, '<br>');
      
      const note = (data.application_note || '').replace(/\n/g, '<br>');

      const aboutHTML = `
        <div class="about-grid">
          <div class="about-section">
            <h3>Courses Offered</h3>
            <div class="content">${courses}</div>
          </div>
          <div class="about-section">
            <h3>Fees & Scholarships</h3>
            <div class="content">${fees}</div>
          </div>
        </div>

        <div class="requirements-section">
          <h3>Enrollment Requirements</h3>
          <div class="requirements-grid">
            <div>
              <h4>Freshmen</h4>
              <div class="content">${freshmenReq}</div>
            </div>
            <div>
              <h4>Transferees</h4>
              <div class="content">${transfereesReq}</div>
            </div>
          </div>
        </div>
        ${data.application_note ? `<div class="application-note">${note}</div>` : ''}
      `;

      container.innerHTML = aboutHTML;
    })
    .catch(() => {
      const container = document.getElementById('about-content-container');
      if (container) container.innerHTML = '<p>Error loading content.</p>';
    });
}

// ==========================================
// 8. VIDEO PLAYER LOADER
// ==========================================
function loadVideo() {
  fetch('/api/video')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('video-container');
      if (!container) return;

      // Add timestamp to prevent caching issues
      const videoSrc = data.video_path ? `${data.video_path}?t=${new Date().getTime()}` : null;

      if (videoSrc) {
        // Force styling inline to ensure video expands correctly
        container.innerHTML = `
          <video controls autoplay muted loop playsinline 
                 style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
            <source src="${videoSrc}" type="video/mp4">
            Your browser does not support the video tag.
          </video>`;
      } else {
        // Reset container style if empty so text is visible
        container.style.paddingBottom = "0"; 
        container.style.height = "auto";
        container.style.padding = "50px";
        container.innerHTML = '<div style="text-align: center;"><p>No video has been uploaded.</p></div>';
      }
    })
    .catch(() => { });
}

// ==========================================
// 9. SMOOTH SCROLLING (Universal Fix)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
  // Select ALL links that start with # (Nav, Footer, Buttons)
  const allLinks = document.querySelectorAll('a[href^="#"]');
  const navElement = document.querySelector('nav');

  allLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      
      // Ignore empty links
      if (targetId === '#' || !targetId) return;

      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        e.preventDefault();
        
        // Calculate position: Section Top + Scroll - Header Height
        const navHeight = navElement ? navElement.offsetHeight : 0;
        const elementPosition = targetSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - navHeight;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
});

// ==========================================
// 10. INITIALIZATION
// ==========================================
loadNews();
loadAbout();
loadVideo();

// Workaround for Swiper ghost slide bug: Force an update after delay
setTimeout(() => {
    const swiperNewsElement = document.querySelector('.swiper-news');
    if (swiperNewsElement && swiperNewsElement.swiper) {
        swiperNewsElement.swiper.update();
    }
}, 1000);