document.addEventListener('DOMContentLoaded', (event) => {
    const socket = io();

    function updateWebsiteList(website) {
        if (!website || !website.domain) {
            console.error('Invalid website data:', website);
            return;
        }

        console.log('Updating website list with data:', website);
        const websiteList = document.getElementById('websiteList');
        let existingCard = document.querySelector(`[data-domain="${website.domain}"]`);

        if (existingCard) {
            existingCard.querySelector('.status').textContent = website.online ? 'Online' : 'Offline';
            existingCard.querySelector('.status').className = `status ${website.online ? 'online' : 'offline'}`;
            if (website.screenshot) {
                let img = existingCard.querySelector('img');
                if (!img) {
                    img = document.createElement('img');
                    existingCard.insertBefore(img, existingCard.firstChild);
                }
                img.src = website.screenshot;
            }
        } else {
            const div = document.createElement('div');
            div.className = 'website-card';
            div.setAttribute('data-domain', website.domain);
            div.innerHTML = `
                <img src="${website.screenshot || ''}" alt="Screenshot">
                <a href="http://${website.domain}" target="_blank">${website.domain}</a>
                <span class="status ${website.online ? 'online' : 'offline'}">
                    ${website.online ? 'Online' : 'Offline'}
                </span>
            `;
            if (!website.online) {
                div.classList.add('broken');
            }
            websiteList.appendChild(div);
        }
    }

    function updateProgressBar(progress) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }

    socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
        socket.emit('start_check');
    });

    socket.on('update', (data) => {
        if (data.data) {
            updateWebsiteList(data.data);
        } else {
            console.error('Invalid update data:', data);
        }
        updateProgressBar(data.progress || 0);
    });

    socket.on('check_complete', () => {
        document.getElementById('progress-container').style.display = 'none';
        document.getElementById('progress-text').style.display = 'none';
    });

    document.getElementById('startCheck').addEventListener('click', () => {
        document.getElementById('progress-container').style.display = 'block';
        document.getElementById('progress-text').style.display = 'block';
        socket.emit('start_check');
    });

    document.getElementById('refresh').addEventListener('click', () => {
        window.location.reload();
    });
});