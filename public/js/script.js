// Function to retrieve sidebar state from localStorage
function getSidebarState() {
    return localStorage.getItem('sidebarState') || 'show'; // Default to 'show' if not set
}

const allSideMenu = document.querySelectorAll('#sidebar .side-menu.top li a');
const sidebar = document.getElementById('sidebar');

allSideMenu.forEach(item => {
    const li = item.parentElement;

    item.addEventListener('click', function () {
        allSideMenu.forEach(i => {
            i.parentElement.classList.remove('active');
        });
        li.classList.add('active');

        // Close sidebar on tab click if the window width is less than 768
        if (window.innerWidth < 768) {
            sidebar.classList.add('hide');
        }
    });
});

// TOGGLE SIDEBAR
const menuBar = document.querySelector('#content nav .bx.bx-menu');

menuBar.addEventListener('click', function () {
    const isHidden = sidebar.classList.toggle('hide');
});

const searchButton = document.querySelector('#content nav form .form-input button');
const searchButtonIcon = document.querySelector('#content nav form .form-input button .bx');
const searchForm = document.querySelector('#content nav form');

const switchMode = document.getElementById('switch-mode');

switchMode.addEventListener('change', function () {
    if (this.checked) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }
});
