const emailConfig = {
    publicKey: 'oSdhU6pu7gE-RKZ1U',
    serviceId: 'service_51loowv',
    templateId: 'template_aq5zpeq'
};

let currentEmployeeName = null;
let points = 0;
const HR_USERNAME = "hradmin";
const HR_PASSWORD = "HR1234";

(function(){emailjs.init(emailConfig.publicKey);})();

window.onload = function() {
    document.getElementById('employee-main').style.display = 'none';
    document.getElementById('hr-main').style.display = 'none';
    checkLeaderboardReset();
};

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return hash.toString();
}

document.getElementById('employee-login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('emp-name').value.trim();
    const password = document.getElementById('emp-password').value.trim();

    if (!name || !password) {
        document.getElementById('emp-login-message').textContent = 'Please enter both name and password.';
        return;
    }

    const nameParts = name.split(' ');
    if (nameParts.length < 2) {
        document.getElementById('emp-login-message').textContent = 'Please enter both your first name and surname (e.g., John Smith)';
        return;
    }

    let baseName = nameParts.join('');
    let uniqueName = baseName;
    let counter = 1;

    while (localStorage.getItem(`${uniqueName}_password`) !== null && 
           localStorage.getItem(`${uniqueName}_password`) !== simpleHash(password)) {
        uniqueName = `${baseName}${counter}`;
        counter++;
    }

    const storedPassword = localStorage.getItem(`${uniqueName}_password`);
    if (storedPassword) {
        if (storedPassword === simpleHash(password)) {
            currentEmployeeName = uniqueName;
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('employee-main').style.display = 'block';
            document.getElementById('hr-main').style.display = 'none';
            loadEmployeeData();
            document.getElementById('emp-login-message').textContent = '';
        } else {
            document.getElementById('emp-login-message').textContent = 'Incorrect password.';
        }
    } else {
        localStorage.setItem(`${uniqueName}_password`, simpleHash(password));
        currentEmployeeName = uniqueName;
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('employee-main').style.display = 'block';
        document.getElementById('hr-main').style.display = 'none';
        loadEmployeeData();
        document.getElementById('emp-login-message').textContent = '';
    }
});

document.getElementById('hr-login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('hr-username').value.trim();
    const password = document.getElementById('hr-password').value.trim();

    if (username === HR_USERNAME && password === HR_PASSWORD) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('employee-main').style.display = 'none';
        document.getElementById('hr-main').style.display = 'block';
        loadHRDashboard();
        document.getElementById('hr-login-message').textContent = '';
    } else {
        document.getElementById('hr-login-message').textContent = 'Incorrect username or password.';
    }
});

function loadEmployeeData() {
    loadStressHistory();
    loadHRRequests();
    loadMoodForecast();
    loadLeaderboard();
    points = parseInt(localStorage.getItem(`${currentEmployeeName}_points`)) || 0;
    document.getElementById('points').textContent = points;
}

function loadHRDashboard() {
    const tbody = document.getElementById('hr-stress-table-body');
    tbody.innerHTML = '';

    let allLogs = [];
    for (let key in localStorage) {
        if (key.endsWith('_stressLogs')) {
            const employeeName = key.replace('_stressLogs', '');
            const logs = JSON.parse(localStorage.getItem(key)) || [];
            logs.forEach(log => {
                allLogs.push({
                    employee: employeeName,
                    timestamp: new Date(log.timestamp),
                    stressLevel: log.stressLevel,
                    notes: log.stressNotes || 'None'
                });
            });
        }
    }

    allLogs.sort((a, b) => b.timestamp - a.timestamp);

    allLogs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.employee}</td>
            <td>${formatTimestamp(log.timestamp)}</td>
            <td>${log.stressLevel}/10</td>
            <td>${log.notes}</td>
        `;
        tbody.appendChild(row);
    });

    // Load HR Mood Forecast
    loadHRMoodForecast();
}

function loadHRMoodForecast() {
    const moods = JSON.parse(localStorage.getItem('allMoods')) || [];
    if (moods.length === 0) {
        document.getElementById('hrMoodChart').style.display = 'none';
        document.getElementById('hr-forecast-text').textContent = 'No mood data yet.';
        return;
    }

    const moodCounts = { sunny: 0, cloudy: 0, stormy: 0, rainy: 0 };
    moods.forEach(entry => moodCounts[entry.mood]++);

    const total = moods.length;
    const forecast = Object.entries(moodCounts).reduce((prev, curr) => 
        curr[1] > prev[1] ? curr : prev, ['sunny', 0])[0];
    let forecastText = `Today’s Workplace Forecast: Mostly ${forecast.charAt(0).toUpperCase() + forecast.slice(1)}`;
    if (moodCounts.stormy + moodCounts.rainy > total * 0.3) {
        forecastText += ' with a chance of stress. Consider a team break!';
    } else if (moodCounts.sunny > total * 0.5) {
        forecastText += '. Great vibes all around!';
    }
    document.getElementById('hr-forecast-text').textContent = forecastText;

    document.getElementById('hrMoodChart').style.display = 'block';
    const ctx = document.getElementById('hrMoodChart').getContext('2d');
    if (window.hrMoodChartInstance) {
        window.hrMoodChartInstance.destroy();
    }
    window.hrMoodChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Sunny 😊', 'Cloudy 😐', 'Stormy 😣', 'Rainy 😢'],
            datasets: [{
                data: [moodCounts.sunny, moodCounts.cloudy, moodCounts.stormy, moodCounts.rainy],
                backgroundColor: ['#FFD700', '#B0C4DE', '#4682B4', '#778899']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Workplace Mood Distribution' }
            }
        }
    });
}

document.getElementById('graph-request-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const employeeName = document.getElementById('graph-employee-name').value.trim();
    const logs = JSON.parse(localStorage.getItem(`${employeeName}_stressLogs`)) || [];

    if (logs.length === 0) {
        document.getElementById('employeeStressChart').style.display = 'none';
        document.getElementById('graph-message').textContent = `No stress logs found for ${employeeName}.`;
        return;
    }

    document.getElementById('employeeStressChart').style.display = 'block';
    document.getElementById('graph-message').textContent = '';

    const labels = logs.map(log => formatTimestamp(new Date(log.timestamp)));
    const data = logs.map(log => log.stressLevel);

    const ctx = document.getElementById('employeeStressChart').getContext('2d');
    if (window.employeeStressChartInstance) {
        window.employeeStressChartInstance.destroy();
    }
    window.employeeStressChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `${employeeName}'s Stress Levels`,
                data: data,
                backgroundColor: '#FF6384'
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, max: 10, title: { display: true, text: 'Stress Level' } },
                x: { title: { display: true, text: 'Logged Times' } }
            }
        }
    });

    const existingHideBtn = document.querySelector('#employee-graph-request button.hide-chart');
    if (!existingHideBtn) {
        const hideBtn = document.createElement('button');
        hideBtn.textContent = 'Hide Chart';
        hideBtn.className = 'hide-chart';
        hideBtn.onclick = () => document.getElementById('employeeStressChart').style.display = 'none';
        document.getElementById('employee-graph-request').appendChild(hideBtn);
    }
});

document.getElementById('stress-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const stressLevel = document.getElementById('stress-level').value;
    const stressNotes = document.getElementById('stress-notes').value;
    const timestamp = new Date().toLocaleString();
    const log = { timestamp, stressLevel, stressNotes };

    let logs = JSON.parse(localStorage.getItem(`${currentEmployeeName}_stressLogs`)) || [];
    logs.push(log);
    localStorage.setItem(`${currentEmployeeName}_stressLogs`, JSON.stringify(logs));

    document.getElementById('stress-message').textContent = `Stress logged: ${stressLevel}/10. ${stressNotes ? 'Notes: ' + stressNotes : ''}`;

    let tip = '';
    if (stressLevel > 7) {
        tip = 'High stress detected! Try this <a href="https://www.youtube.com/watch?v=4pLUleLdwY4" target="_blank">5-minute meditation</a>.';
    } else if (stressLevel > 4) {
        tip = 'Moderate stress? Take a short walk or deep breaths.';
    } else {
        tip = 'Looking good! Keep up your wellness routine.';
    }
    document.getElementById('wellness-tip').innerHTML = tip;

    this.reset();
    document.getElementById('stress-level').value = 5;
    document.getElementById('stress-value').textContent = '5';
    loadStressHistory();
});

document.getElementById('stress-level').addEventListener('input', function() {
    document.getElementById('stress-value').textContent = this.value;
});

document.getElementById('hr-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const urgency = document.getElementById('urgency').value;
    const contactMethod = document.getElementById('contact-method').value;
    const hrNotes = document.getElementById('hr-notes').value;
    const timestamp = new Date().toLocaleString();
    const request = { timestamp, urgency, contactMethod, hrNotes };

    let requests = JSON.parse(localStorage.getItem(`${currentEmployeeName}_hrRequests`)) || [];
    requests.push(request);
    localStorage.setItem(`${currentEmployeeName}_hrRequests`, JSON.stringify(requests));

    emailjs.send(emailConfig.serviceId, emailConfig.templateId, {
        employee_name: currentEmployeeName,
        urgency: urgency,
        contact_method: contactMethod,
        notes: hrNotes,
        timestamp: timestamp
    }).then(() => {
        document.getElementById('hr-message').textContent = `Request sent to HR! Urgency: ${urgency}, Contact: ${contactMethod}. ${hrNotes ? 'Details: ' + hrNotes : ''}`;
    }, (error) => {
        document.getElementById('hr-message').textContent = 'Failed to send request. Contact IT if this persists.';
        console.error('EmailJS error:', error);
    });

    this.reset();
    loadHRRequests();
});

function loadHRRequests() {
    const requests = JSON.parse(localStorage.getItem(`${currentEmployeeName}_hrRequests`)) || [];
    const list = document.getElementById('hr-request-list');
    list.innerHTML = '';
    requests.forEach(req => {
        const li = document.createElement('li');
        li.textContent = `${req.timestamp} - Urgency: ${req.urgency}, Contact: ${req.contactMethod}, Status: Pending`;
        list.appendChild(li);
    });
}

function loadStressHistory() {
    const logs = JSON.parse(localStorage.getItem(`${currentEmployeeName}_stressLogs`)) || [];
    const tbody = document.getElementById('stress-table-body');
    tbody.innerHTML = '';

    const recentLogs = logs.slice(-5);
    recentLogs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatTimestamp(new Date(log.timestamp))}</td>
            <td>${log.stressLevel}/10</td>
            <td>${log.stressNotes || 'None'}</td>
        `;
        tbody.appendChild(row);
    });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyLogs = logs.filter(log => new Date(log.timestamp) >= weekAgo);
    const avgStress = weeklyLogs.length ? (weeklyLogs.reduce((sum, log) => sum + parseInt(log.stressLevel), 0) / weeklyLogs.length).toFixed(1) : 0;
    document.getElementById('weekly-summary').innerHTML = `Past 7 Days: ${weeklyLogs.length} logs, Avg Stress: ${avgStress}/10`;
}

function clearStressLogs() {
    if (confirm('Are you sure you want to clear your stress logs?')) {
        localStorage.removeItem(`${currentEmployeeName}_stressLogs`);
        loadStressHistory();
    }
}

function exportData() {
    const data = {
        stressLogs: JSON.parse(localStorage.getItem(`${currentEmployeeName}_stressLogs`)) || [],
        hrRequests: JSON.parse(localStorage.getItem(`${currentEmployeeName}_hrRequests`)) || [],
        points: localStorage.getItem(`${currentEmployeeName}_points`) || 0
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEmployeeName}_wellness_data.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function logout() {
    currentEmployeeName = null;
    document.getElementById('employee-main').style.display = 'none';
    document.getElementById('hr-main').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-password').value = '';
    document.getElementById('emp-login-message').textContent = '';
}

function hrLogout() {
    document.getElementById('employee-main').style.display = 'none';
    document.getElementById('hr-main').style.display = 'none';
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById('hr-username').value = '';
    document.getElementById('hr-password').value = '';
    document.getElementById('hr-login-message').textContent = '';
}

function formatTimestamp(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours() % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    return `${month}/${day} ${hours}:${minutes} ${ampm}`;
}

function completeChallenge(challenge, pointsAwarded) {
    const status = document.getElementById(`${challenge}-status`).textContent;
    if (status.includes('Completed')) return;
    points += pointsAwarded;
    localStorage.setItem(`${currentEmployeeName}_points`, points);
    document.getElementById('points').textContent = points;
    document.getElementById(`${challenge}-status`).textContent = `✔ Completed! (+${pointsAwarded})`;

    let leaderboardData = JSON.parse(localStorage.getItem('leaderboardData')) || {};
    leaderboardData[currentEmployeeName] = points;
    localStorage.setItem('leaderboardData', JSON.stringify(leaderboardData));
    loadLeaderboard();
}

document.getElementById('mood-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const mood = document.getElementById('mood-select').value;
    const moodNote = document.getElementById('mood-note').value.trim();
    const timestamp = new Date().toLocaleString();
    const moodEntry = { mood, moodNote, timestamp, employee: currentEmployeeName };

    let moods = JSON.parse(localStorage.getItem('allMoods')) || [];
    moods = moods.filter(entry => entry.employee !== currentEmployeeName);
    moods.push(moodEntry);
    localStorage.setItem('allMoods', JSON.stringify(moods));

    document.getElementById('mood-message').textContent = `Mood logged: ${mood.charAt(0).toUpperCase() + mood.slice(1)}${moodNote ? ' - ' + moodNote : ''}`;
    this.reset();
    loadMoodForecast();
});

function loadMoodForecast() {
    const moods = JSON.parse(localStorage.getItem('allMoods')) || [];
    if (moods.length === 0) {
        document.getElementById('moodChart').style.display = 'none';
        document.getElementById('forecast-text').textContent = 'No mood data yet. Be the first to contribute!';
        return;
    }

    const moodCounts = { sunny: 0, cloudy: 0, stormy: 0, rainy: 0 };
    moods.forEach(entry => moodCounts[entry.mood]++);

    const total = moods.length;
    const forecast = Object.entries(moodCounts).reduce((prev, curr) => 
        curr[1] > prev[1] ? curr : prev, ['sunny', 0])[0];
    let forecastText = `Today’s Workplace Forecast: Mostly ${forecast.charAt(0).toUpperCase() + forecast.slice(1)}`;
    if (moodCounts.stormy + moodCounts.rainy > total * 0.3) {
        forecastText += ' with a chance of stress. Consider a team break!';
    } else if (moodCounts.sunny > total * 0.5) {
        forecastText += '. Great vibes all around!';
    }
    document.getElementById('forecast-text').textContent = forecastText;

    document.getElementById('moodChart').style.display = 'block';
    const ctx = document.getElementById('moodChart').getContext('2d');
    if (window.moodChartInstance) {
        window.moodChartInstance.destroy();
    }
    window.moodChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Sunny 😊', 'Cloudy 😐', 'Stormy 😣', 'Rainy 😢'],
            datasets: [{
                data: [moodCounts.sunny, moodCounts.cloudy, moodCounts.stormy, moodCounts.rainy],
                backgroundColor: ['#FFD700', '#B0C4DE', '#4682B4', '#778899']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Workplace Mood Distribution' }
            }
        }
    });
}

function checkLeaderboardReset() {
    const now = new Date();
    const lastReset = localStorage.getItem('lastLeaderboardReset') ? new Date(localStorage.getItem('lastLeaderboardReset')) : null;
    
    if (!lastReset || (now.getDate() === 1 && now.getMonth() !== lastReset.getMonth())) {
        localStorage.removeItem('leaderboardData');
        localStorage.setItem('lastLeaderboardReset', now.toISOString());
        for (let key in localStorage) {
            if (key.endsWith('_points')) {
                localStorage.setItem(key, '0');
            }
        }
    }
}

function loadLeaderboard() {
    const leaderboardData = JSON.parse(localStorage.getItem('leaderboardData')) || {};
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';

    const sortedEntries = Object.entries(leaderboardData)
        .map(([name, points]) => ({ name, points: parseInt(points) }))
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

    if (sortedEntries.length === 0) {
        leaderboardList.innerHTML = '<li>No participants yet. Start a challenge!</li>';
        return;
    }

    sortedEntries.forEach(entry => {
        const li = document.createElement('li');
        li.textContent = `${entry.name}: ${entry.points} points`;
        leaderboardList.appendChild(li);
    });
}