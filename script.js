let currentTournament = "";
let isAdminMaster = false;
const DB_KEY = "FF_MADA_ELITE_V13";

window.onload = updateTournamentsList;

function unlockGlobalAdmin() {
    if(prompt("Code Système :") === "120606") {
        isAdminMaster = true;
        updateTournamentsList();
    }
}

function createNewTournament() {
    const name = document.getElementById('newTourneyName').value.trim();
    const pass = document.getElementById('newTourneyPass').value;
    if(!name || !pass) return alert("Champs vides !");
    let db = JSON.parse(localStorage.getItem(DB_KEY)) || {};
    db[name] = { password: pass, teams: [] };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    updateTournamentsList();
}

function updateTournamentsList() {
    const container = document.getElementById('tournamentsList');
    const db = JSON.parse(localStorage.getItem(DB_KEY)) || {};
    container.innerHTML = "";
    Object.keys(db).forEach(name => {
        const div = document.createElement('div');
        div.className = "team-row";
        div.innerHTML = `<span onclick="enterTourney('${name}')" style="cursor:pointer; font-weight:bold;">🏆 ${name}</span>`;
        if(isAdminMaster) div.innerHTML += `<button onclick="deleteTourney('${name}')" style="background:red; border:none; color:white; padding:5px; border-radius:4px; cursor:pointer;">✖</button>`;
        container.appendChild(div);
    });
}

function deleteTourney(name) {
    if(confirm(`Supprimer ${name} ?`)) {
        let db = JSON.parse(localStorage.getItem(DB_KEY));
        delete db[name];
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        updateTournamentsList();
    }
}

function enterTourney(name) {
    const db = JSON.parse(localStorage.getItem(DB_KEY));
    if(prompt("Mot de passe :") === db[name].password) {
        currentTournament = name;
        document.getElementById('tournament-selector').style.display = 'none';
        document.getElementById('main-interface').style.display = 'block';
        document.getElementById('activeTournamentTitle').innerText = name;
        setupRegForm();
        renderTeams();
    }
}

function setupRegForm() {
    const container = document.getElementById('membersContainer');
    const mode = document.getElementById('gameMode').value;
    container.innerHTML = "";
    for(let i=1; i<=mode; i++) {
        container.innerHTML += `<input type="text" class="m-id" placeholder="Joueur ${i} ${i==1?'(Chef)':''}" required>`;
    }
}

document.getElementById('proTournamentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    let db = JSON.parse(localStorage.getItem(DB_KEY));
    const members = Array.from(document.querySelectorAll('.m-id')).map(i => i.value);
    db[currentTournament].teams.push({
        name: document.getElementById('teamName').value,
        mode: document.getElementById('gameMode').value + "v" + document.getElementById('gameMode').value,
        fb: document.getElementById('facebook').value,
        members: members
    });
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    this.reset();
    setupRegForm();
    renderTeams();
});

function renderTeams() {
    const container = document.getElementById('teamsContainer');
    const db = JSON.parse(localStorage.getItem(DB_KEY));
    const teams = db[currentTournament].teams;
    container.innerHTML = "";
    teams.forEach(t => {
        container.innerHTML += `
            <div class="team-row">
                <div><strong>${t.name} <small style="color:var(--gold)">(${t.mode})</small></strong><br><small>Chef: ${t.members[0]}</small></div>
                <a href="${t.fb}" target="_blank" style="background:#1877F2; color:white; padding:5px 10px; border-radius:4px; text-decoration:none; font-size:0.7rem; font-weight:bold;">FB</a>
            </div>`;
    });
}

function generateBracket() {
    let db = JSON.parse(localStorage.getItem(DB_KEY));
    let teams = [...db[currentTournament].teams];
    if(teams.length < 2) return alert("Min. 2 équipes !");
    teams.sort(() => Math.random() - 0.5);
    const display = document.getElementById('bracket-display');
    document.getElementById('bracket-section').style.display = "block";
    display.innerHTML = "";
    let html = `<div>`;
    for(let i=0; i<teams.length; i+=2) {
        html += `<div style="background:#0f172a; border:1px solid #1e293b; padding:15px; width:180px; margin-bottom:10px; border-radius:5px; text-align:center;"><b>${teams[i].name}</b><br>vs<br><b>${teams[i+1]?teams[i+1].name:'BYE'}</b></div>`;
    }
    html += `</div><div style="background:rgba(241, 196, 15, 0.2); border:2px solid var(--gold); padding:20px; align-self:center; border-radius:10px; text-align:center;">🏆 FINALE</div>`;
    display.innerHTML = html;
}

function exitTournament() {
    document.getElementById('main-interface').style.display = 'none';
    document.getElementById('tournament-selector').style.display = 'flex';
}