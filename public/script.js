// Appointment form submission
document.getElementById('appointmentForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const form = this; // Reference to the form element
  const data = {
    fullname: document.getElementById('fullname').value,
    email: document.getElementById('email').value,
    contact: document.getElementById('contact').value,
    program: document.getElementById('program').value,
    appt_date: document.getElementById('appt_date').value,
    appt_time: document.getElementById('appt_time').value
  };

  const dateObj = new Date(data.appt_date);
  if (dateObj.getUTCDay() === 0) {
    document.getElementById('formStatus').innerText = 'Appointments are only allowed Monday to Saturday.';
    return;
  }

  fetch('/api/appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(result => {
    if (result.message.includes('successfully')) {
      // If submission is successful, show the pop-up modal
      showAppointmentModal(data);
      form.reset(); // Reset the form fields
      document.getElementById('formStatus').innerText = ''; // Clear any previous error messages
    } else {
      // If there was an error (like a double booking), show the message
      document.getElementById('formStatus').innerText = result.message;
    }
  })
  .catch(() => {
    document.getElementById('formStatus').innerText = 'Error submitting appointment.';
  });
});

// New function to create and show the modal
function showAppointmentModal(data) {
  // Create the modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  // Format the data for display
  const programName = data.program === 'AMT' ? 'Aircraft Maintenance Technology' : 'Aviation Electronics Technology';
  const formattedDate = new Date(data.appt_date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Create the modal content
  overlay.innerHTML = `
    <div class="modal-content">
      <h2>Appointment Submitted!</h2>
      <p>Thank you, <strong>${data.fullname}</strong>. Your appointment request has been received. Please review the details below.</p>
      <hr>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Program:</strong> ${programName}</p>
      <p><strong>Preferred Date:</strong> ${formattedDate} (${data.appt_time})</p>
      <button class="modal-close-btn">Close</button>
    </div>
  `;

  // Add the modal to the page
  document.body.appendChild(overlay);

  // Show the modal
  setTimeout(() => overlay.classList.add('is-visible'), 10);

  // Add event listener to the close button
  overlay.querySelector('.modal-close-btn').addEventListener('click', () => {
    overlay.classList.remove('is-visible');
    // Remove the modal from the DOM after the transition ends
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  });
}

// Admin link hotkey
document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key.toLowerCase() === 'a') {
    const adminLink = document.querySelector('.admin-link');
    if (adminLink) {
      adminLink.style.display = 'inline-block';
    }
  }
});

/// Gallery slider loader
function loadGallery() {
  fetch('/api/gallery')
    .then(res => res.json())
    .then(data => {
      const wrapper = document.getElementById('live-gallery-wrapper');
      const swiperContainer = document.querySelector('.swiper');
      if (!wrapper || !swiperContainer) return;
      
      wrapper.innerHTML = '';
      
      if (data.length <= 1) {
        if (data.length === 1) {
          const photo = data[0];
          const slide = document.createElement('div');
          slide.classList.add('swiper-slide');
          // Create an img tag for the static image
          slide.innerHTML = `<img src="${photo.path}" alt="${photo.caption || 'Gallery Photo'}">`;
          if (photo.caption) {
            slide.innerHTML += `<div class="gallery-caption-overlay is-visible"><p>${photo.caption}</p></div>`;
          }
          wrapper.appendChild(slide);
        } else {
          // Handle no photos
          const defaultSlide = document.createElement('div');
          defaultSlide.classList.add('swiper-slide');
          defaultSlide.innerHTML = `<div class="gallery-caption-overlay is-visible"><h3>No photos yet</h3></div>`;
          wrapper.appendChild(defaultSlide);
        }
        return; 
      }

      // This code runs for 2 or more photos
      data.forEach(photo => {
        const slide = document.createElement('div');
        slide.classList.add('swiper-slide');
        // Create an img tag and the caption overlay
        slide.innerHTML = `<img src="${photo.path}" alt="${photo.caption || 'Gallery Photo'}">`;
        if (photo.caption) {
          slide.innerHTML += `<div class="gallery-caption-overlay"><p>${photo.caption}</p></div>`;
        }
        wrapper.appendChild(slide);
      });

      const swiper = new Swiper('.swiper', {
        effect: 'slide',
        grabCursor: true,
        centeredSlides: true,
        slidesPerView: 'auto',
        loop: true,
        autoplay: {
          delay: 4000,
          disableOnInteraction: false,
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
        },
      });
    })
    .catch(() => {
      // Handle error
    });
}
// Background animation elements
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

  for (let i = 0; i < 10; i++) {
    createMover('plane', '✈️');
  }

  for (let i = 0; i < 10; i++) {
    createMover('gear', '⚙️');
  }
}

// News/Announcements slider loader
function loadNews() {
  fetch('/api/news')
    .then(res => res.json())
    .then(data => {
      const wrapper = document.getElementById('news-container-wrapper');
      const swiperContainer = document.querySelector('.swiper-news');
      if (!wrapper || !swiperContainer) return;

      wrapper.innerHTML = '';

      if (data.length === 0) {
        wrapper.innerHTML = '<div class="swiper-slide news-slide-item"><h3>No news at this time</h3></div>';
        return;
      }
      
      data.forEach(newsItem => {
        const slide = document.createElement('div');
        slide.classList.add('swiper-slide', 'news-slide-item');
        // Create an img tag above the title and content
        slide.innerHTML = `
          ${newsItem.image ? `<img src="${newsItem.image}" alt="${newsItem.title}" class="news-image">` : ''}
          <div class="news-text-content">
            <h3>${newsItem.title}</h3>
            <p>${newsItem.content}</p>
          </div>
        `;
        wrapper.appendChild(slide);
      });

      const swiperOptions = {
        pagination: {
          el: '.swiper-pagination-news',
          clickable: true,
        },
      };

      if (data.length > 1) {
        swiperOptions.loop = true;
        swiperOptions.autoplay = {
          delay: 5000,
          disableOnInteraction: false,
        };
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
    .catch(() => {
      // Handle error
    });
}

// Dynamic "About" content loader
function loadAbout() {
  fetch('/api/about')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('about-content-container');
      if(container) container.innerHTML = data.content;
    })
    .catch(() => {
      const container = document.getElementById('about-content-container');
      if (container) container.innerHTML = '<p>Error loading content.</p>';
    });
}

// Smooth Scrolling Navigation
document.addEventListener('DOMContentLoaded', function() {
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const navElement = document.querySelector('nav');

  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        const navHeight = navElement ? navElement.offsetHeight : 0;
        const targetPosition = targetSection.offsetTop - navHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
});

// --- INITIALIZE PAGE CONTENT ---
loadGallery();
loadNews();
loadAbout();