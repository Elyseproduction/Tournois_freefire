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

// GESTION DU MENU
function toggleSideMenu() {
    document.getElementById('side-menu').classList.toggle('active');
}

// MODALE
function showModal(title, desc, callback) {
    const modal = document.getElementById('custom-modal');
    const input = document.getElementById('modal-input');
    const confirmBtn = document.getElementById('modal-confirm');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    modal.style.display = "flex";
    input.value = "";
    setTimeout(() => { input.focus(); }, 200);
    confirmBtn.onclick = () => { modal.style.display = "none"; callback(input.value); };
}
function closeModal() { document.getElementById('custom-modal').style.display = "none"; }

// CHARGEMENT ET FILTRE
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
            let del = isAdminMaster ? `<button onclick="deleteTourney('${id}')" style="background:red; color:white; border:none; padding:2px 5px; cursor:pointer;">X</button>` : "";
            list.innerHTML += `<div class="team-row"><div onclick="enterTourney('${id}', '${t.password}')" style="cursor:pointer; flex-grow:1;">🏆 ${t.name} <span style="font-size:0.7rem; color:gray;">(${t.mode})</span></div>${del}</div>`;
        }
    });
}

function createNewTournament() {
    const n = document.getElementById('newTourneyName').value;
    const p = document.getElementById('newTourneyPass').value;
    const m = document.getElementById('creationMode').value;
    const d = document.getElementById('tournamentDuration').value;
    if(!n || !p) return alert("Remplissez le nom et le mot de passe !");
    
    db.ref('tournaments').push({ 
        name: n, 
        password: p, 
        mode: m+"v"+m, 
        nbPlayers: parseInt(m),
        expiresAt: Date.now() + (parseInt(d) * 3600000)
    });
    alert("Tournoi créé avec succès !");
}

function enterTourney(id, correctPass) {
    showModal("SÉCURITÉ", "Entrez le mot de passe :", (pass) => {
        if(pass === correctPass) {
            currentTournamentId = id;
            document.getElementById('tournament-selector').style.display = 'none';
            document.getElementById('main-interface').style.display = 'block';
            loadTournament(id);
        } else { alert("Mot de passe incorrect."); }
    });
}

function loadTournament(id) {
    db.ref(`tournaments/${id}`).on('value', (snap) => {
        const t = snap.val();
        if(!t) return exitTournament();
        document.getElementById('activeTournamentTitle').innerText = t.name;
        setupForm(t.nbPlayers);
        renderTeams(t.teams);
        const actions = document.getElementById('bottom-actions');
        if(!t.bracket) {
            actions.innerHTML = `<button onclick="confirmGen('${t.password}')" class="btn-create" style="width:auto; padding:15px 30px;">⚡ GÉNÉRER L'ARBRE</button>`;
        } else {
            actions.innerHTML = `<p style="color:#f1c40f">L'ARBRE DE COMBAT EST DÉJÀ GÉNÉRÉ</p>`;
            displayBracket(t.bracket);
        }
    });
}

function confirmGen(p) { 
    showModal("CONFIRMATION", "Lancer la génération ?", (v) => { if(v === p) generateBracket(); }); 
}

function generateBracket() {
    db.ref(`tournaments/${currentTournamentId}/teams`).once('value', (snap) => {
        const teams = snap.val();
        if(!teams || Object.keys(teams).length < 2) return alert("Pas assez d'équipes.");
        let list = Object.values(teams).sort(() => Math.random() - 0.5);
        let m = [];
        for(let i=0; i<list.length; i+=2) {
            m.push({ t1: list[i].name, t2: list[i+1] ? list[i+1].name : "QUALIFIÉ D'OFFICE (BYE)" });
        }
        db.ref(`tournaments/${currentTournamentId}/bracket`).set(m);
    });
}

function displayBracket(m) {
    const s = document.getElementById('bracket-section');
    const c = document.getElementById('bracket-container');
    s.style.display = "block";
    c.innerHTML = m.map((match, i) => `
        <div class="match-card">
            <div style="font-size:0.7rem; color:#f1c40f;">MATCH ${i+1}</div>
            <div>${match.t1} VS ${match.t2}</div>
        </div>`).join('');
}

function renderTeams(teams) {
    const container = document.getElementById('teamsContainer');
    container.innerHTML = "";
    if(!teams) return;
    Object.values(teams).forEach(t => {
        container.innerHTML += `<div class="team-row" style="border-left:none; background:rgba(255,255,255,0.05);"><strong>${t.name}</strong></div>`;
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

function unlockGlobalAdmin() { showModal("ADMIN", "Code système :", (c) => { if(c === "120606") { isAdminMaster = true; filterTournaments(); } }); }
function exitTournament() { location.reload(); }

document.getElementById('proTournamentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const m = Array.from(document.querySelectorAll('.m-id')).map(i => i.value);
    db.ref(`tournaments/${currentTournamentId}/teams`).push({ 
        name: document.getElementById('teamName').value, 
        fb: document.getElementById('facebook').value, 
        members: m 
    });
    alert("Équipe inscrite !");
    this.reset();
});
