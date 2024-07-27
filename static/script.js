document.addEventListener("DOMContentLoaded", function() {
    const socket = io('http://localhost:5001', {
        transports: ['websocket']
    });

    socket.on('connect', () => {
        console.log('Socket.IO connected');
    });

    socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
    });

    const filterAll = document.getElementById('filterAll');
    const filterOnline = document.getElementById('filterOnline');
    const filterOffline = document.getElementById('filterOffline');
    const startCheck = document.getElementById('startCheck');
    const addWebsite = document.getElementById('addWebsite');
    const refresh = document.getElementById('refresh');
    const websiteList = document.getElementById('websiteList');
    const progressBar = document.getElementById('progressBar');

    let websites = [];

    filterAll.addEventListener('click', () => filterWebsites('all'));
    filterOnline.addEventListener('click', () => filterWebsites('online'));
    filterOffline.addEventListener('click', () => filterWebsites('offline'));
    startCheck.addEventListener('click', () => socket.emit('start_check'));
    addWebsite.addEventListener('click', () => {
        const newWebsite = prompt("Enter the new website URL:");
        if (newWebsite) {
            socket.emit('add_website', { url: newWebsite });
        }
    });
    refresh.addEventListener('click', () => socket.emit('refresh'));

    socket.on('website_data', data => {
        websites = data;
        displayWebsites(websites);
    });

    socket.on('progress', percentage => {
        progressBar.style.width = `${percentage}%`;
    });

    socket.on('update', message => {
        websites = websites.map(website => {
            if (website.domain === message.data[0].domain) {
                return message.data[0];
            }
            return website;
        });
        displayWebsites(websites);
    });

    function filterWebsites(status) {
        let filteredWebsites = websites;
        if (status === 'online') {
            filteredWebsites = websites.filter(website => website.online);
        } else if (status === 'offline') {
            filteredWebsites = websites.filter(website => !website.online);
        }
        displayWebsites(filteredWebsites);
    }

    function displayWebsites(websites) {
        websiteList.innerHTML = ''; // Clear the current list
        websites.forEach(website => {
            const websiteElement = document.createElement('div');
            websiteElement.classList.add('website');
            websiteElement.innerHTML = `
                <h2>${website.domain}: ${website.online ? 'Online' : 'Offline'}</h2>
                ${website.screenshot ? `<img src="${website.screenshot}" alt="${website.domain} screenshot">` : ''}
                ${website.error ? `<p>Error: ${website.error}</p>` : ''}
            `;
            websiteList.appendChild(websiteElement);
        });
    }

    // Request initial data
    fetch('/initial_data')
        .then(response => response.json())
        .then(data => {
            websites = data;
            displayWebsites(websites);
        });
});