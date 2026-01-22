const firebaseConfig = {
    apiKey: "AIzaSyARkyQzSnDV7IUKuncJfQpWMOK0-HZA6r4",
    databaseURL: "https://ff-tournament-4e2fe-default-rtdb.firebaseio.com",
    projectId: "ff-tournament-4e2fe",
    appId: "1:6708829555:web:d0da2d3838a4a490ddf906"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let currentTournamentId = "";
let isAdminMaster = false;
let allTournaments = {};

function notify(message, type = "info") {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function toggleSideMenu() { document.getElementById('side-menu').classList.toggle('active'); }

function showModal(title, desc, callback) {
    const modal = document.getElementById('custom-modal');
    const input = document.getElementById('modal-input');
    const confirmBtn = document.getElementById('modal-confirm');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    modal.style.display = "flex";
    input.value = "";
    input.classList.remove('error-shake');
    setTimeout(() => { input.focus(); }, 200);
    confirmBtn.onclick = () => { callback(input.value); };
}
function closeModal() { document.getElementById('custom-modal').style.display = "none"; }

function enterTourney(id, correctPass) {
    showModal("SÉCURITÉ", "Entrez le mot de passe :", (pass) => {
        const input = document.getElementById('modal-input');
        if(pass === correctPass) {
            closeModal();
            currentTournamentId = id;
            document.getElementById('tournament-selector').style.display = 'none';
            document.getElementById('main-interface').style.display = 'block';
            loadTournament(id);
            syncGeneratorCooldown();
            syncRoomDetails(); // Active l'écouteur temps réel
        } else {
            input.classList.add('error-shake');
            notify("MOT DE PASSE INCORRECT", "error");
            setTimeout(() => input.classList.remove('error-shake'), 400);
            input.value = "";
            input.focus();
        }
    });
}

function unlockGlobalAdmin() {
    showModal("ADMIN", "Code système :", (c) => {
        if(c === "120606") {
            closeModal();
            isAdminMaster = true;
            notify("ADMIN ACTIVÉ");
            filterTournaments(); 
        } else {
            notify("CODE SYSTÈME ERREUR", "error");
        }
    });
}

function renderTeams(teams) {
    const container = document.getElementById('teamsContainer');
    container.innerHTML = "";
    if(!teams) return;
    Object.keys(teams).forEach(id => {
        const t = teams[id];
        const listId = `list-${id}`;
        container.innerHTML += `
            <div class="team-block" style="margin-bottom: 8px;">
                <div onclick="toggleMembers('${listId}')" class="team-row" style="cursor:pointer; display:flex; justify-content:space-between;">
                    <strong>${t.name}</strong>
                    <span>▼</span>
                </div>
                <div id="${listId}" style="display:none; padding:10px; background:rgba(0,0,0,0.2);">
                    <ul style="list-style:none; padding:0; font-size:0.8rem;">
                        ${t.members.map(m => `<li>👤 ${m}</li>`).join('')}
                    </ul>
                    <a href="${t.fb}" target="_blank" style="color:#f1c40f; font-size:0.7rem; text-decoration:none;">🔗 Facebook</a>
                </div>
            </div>`;
    });
}

function toggleMembers(id) {
    const el = document.getElementById(id);
    el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}

db.ref('tournaments').on('value', (snap) => {
    allTournaments = snap.val() || {};
    filterTournaments();
});

function filterTournaments() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const list = document.getElementById('tournamentsList');
    list.innerHTML = "";
    Object.keys(allTournaments).forEach(id => {
        const t = allTournaments[id];
        if (t.name.toLowerCase().includes(query)) {
            let del = isAdminMaster ? `<button onclick="deleteTourney('${id}')" style="background:red; border:none; color:white; padding:2px 5px; cursor:pointer;">X</button>` : "";
            list.innerHTML += `<div class="team-row"><div onclick="enterTourney('${id}', '${t.password}')" style="cursor:pointer; flex-grow:1;">🏆 ${t.name}</div>${del}</div>`;
        }
    });
}

function createNewTournament() {
    const n = document.getElementById('newTourneyName').value;
    const p = document.getElementById('newTourneyPass').value;
    const m = document.getElementById('creationMode').value;
    if(!n || !p) { notify("NOM ET PASS REQUIS", "error"); return; }
    db.ref('tournaments').push({ name: n, password: p, nbPlayers: parseInt(m) })
    .then(() => notify("TOURNOI CRÉÉ !"));
}

function loadTournament(id) {
    db.ref(`tournaments/${id}`).on('value', (snap) => {
        const t = snap.val();
        if(!t) return;
        document.getElementById('activeTournamentTitle').innerText = t.name;
        setupForm(t.nbPlayers);
        renderTeams(t.teams);
    });
}

function setupForm(nb) {
    const container = document.getElementById('membersContainer');
    if(container.innerHTML !== "") return;
    for(let i=1; i<=nb; i++) {
        const input = document.createElement('input');
        input.className = "m-id"; input.placeholder = `ID Joueur ${i}`; input.required = true;
        container.appendChild(input);
    }
}

// CORRECTION : Écouteur global pour la Room
function syncRoomDetails() {
    db.ref(`tournaments/${currentTournamentId}/room`).on('value', (snap) => {
        const data = snap.val();
        if(data) {
            document.getElementById('roomID').value = data.id || "";
            document.getElementById('roomPass').value = data.pass || "";
        } else {
            document.getElementById('roomID').value = "";
            document.getElementById('roomPass').value = "";
        }
    });
}

function updateRoomInfo() {
    const id = document.getElementById('roomID').value;
    const pass = document.getElementById('roomPass').value;
    db.ref(`tournaments/${currentTournamentId}/room`).set({ id, pass })
    .then(() => notify("ROOM MISE À JOUR"));
}

function deleteTourney(id) { if(confirm("Supprimer ce tournoi ?")) db.ref(`tournaments/${id}`).remove(); }
function exitTournament() { location.reload(); }

document.getElementById('proTournamentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const m = Array.from(document.querySelectorAll('.m-id')).map(i => i.value);
    db.ref(`tournaments/${currentTournamentId}/teams`).push({ 
        name: document.getElementById('teamName').value, fb: document.getElementById('facebook').value, members: m 
    }).then(() => { notify("ÉQUIPE INSCRITE !"); this.reset(); });
});

function syncGeneratorCooldown() {
    db.ref(`tournaments/${currentTournamentId}/lastBracketsGen`).on('value', (snap) => {
        updateButtonUI(snap.val());
    });
}

function updateButtonUI(lastClick) {
    const btn = document.getElementById('btnGenerator');
    if(!btn) return;
    const now = Date.now();
    const oneHour = 3600000;
    if (lastClick && (now - lastClick < oneHour)) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        const remaining = oneHour - (now - lastClick);
        btn.innerText = `BLOQUÉ (${Math.ceil(remaining / 60000)} min)`;
        setTimeout(() => updateButtonUI(lastClick), 30000); 
    } else {
        btn.disabled = false; btn.style.opacity = "1";
        btn.innerText = "GÉNÉRER L'ARBRE DE COMBAT";
    }
}

function generateRandomBrackets() {
    const container = document.getElementById('teamsContainer');
    const teams = Array.from(container.querySelectorAll('.team-block'));
    if (teams.length < 2) { notify("BESOIN D'AU MOINS 2 ÉQUIPES !", "error"); return; }
    db.ref(`tournaments/${currentTournamentId}/lastBracketsGen`).set(firebase.database.ServerValue.TIMESTAMP);
    for (let i = teams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teams[i], teams[j]] = [teams[j], teams[i]];
    }
    container.innerHTML = `<h3 style="color:#00d2ff; font-family:'Orbitron'; font-size:0.7rem; text-align:center; margin-bottom:20px; text-transform:uppercase;">— Tableau des Matchs —</h3>`;
    const wrapper = document.createElement('div');
    wrapper.style.cssText = "display: flex; flex-direction: column; gap: 15px; align-items: center; width: 100%;";
    for (let i = 0; i < teams.length; i += 2) {
        const duelBox = document.createElement('div');
        duelBox.style.cssText = "width: 100%; max-width: 320px; background: rgba(255,255,255,0.03); border: 1px solid rgba(0,210,255,0.2); border-radius: 10px; padding: 10px;";
        const teamA = teams[i]; const teamB = teams[i+1];
        if(teamA) teamA.style.margin = "0";
        if(teamB) teamB.style.margin = "0";
        duelBox.appendChild(teamA);
        if (teamB) {
            const vsLabel = document.createElement('div');
            vsLabel.innerHTML = `<span style="background:#0a1122; padding: 0 10px; position: relative; z-index: 1;">VS</span>`;
            vsLabel.style.cssText = "text-align:center; color:#f1c40f; font-family:'Orbitron'; font-size:0.6rem; margin: 8px 0; position: relative;";
            const line = document.createElement('div');
            line.style.cssText = "position:absolute; top:50%; left:0; width:100%; height:1px; background:rgba(241,196,15,0.2); z-index:0;";
            vsLabel.appendChild(line);
            duelBox.appendChild(vsLabel);
            duelBox.appendChild(teamB);
        } else {
            const byeLabel = document.createElement('div');
            byeLabel.innerHTML = "QUALIFIÉ D'OFFICE";
            byeLabel.style.cssText = "text-align:center; color:#2ecc71; font-size:0.6rem; margin-top:8px; font-weight:bold;";
            duelBox.appendChild(byeLabel);
        }
        wrapper.appendChild(duelBox);
    }
    container.appendChild(wrapper);
    notify("ARBRE GÉNÉRÉ");
}
