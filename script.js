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

// Fermer le menu si on clique sur l'écran (Utile pour mobile)
document.addEventListener('click', (e) => {
    const menu = document.getElementById('side-menu');
    const btn = document.querySelector('.menu-toggle');
    if(menu.classList.contains('active') && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// LE RESTE DU SCRIPT EST VOTRE VERSION ORIGINALE
function showModal(title, desc, callback) {
    const modal = document.getElementById('custom-modal');
    const input = document.getElementById('modal-input');
    const confirmBtn = document.getElementById('modal-confirm');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    modal.style.display = "flex";
    input.value = "";
    confirmBtn.onclick = () => { modal.style.display = "none"; callback(input.value); };
}
function closeModal() { document.getElementById('custom-modal').style.display = "none"; }

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
            list.innerHTML += `<div class="team-row"><div onclick="enterTourney('${id}', '${t.password}')" style="cursor:pointer; flex-grow:1;">🏆 ${t.name}</div></div>`;
        }
    });
}

function createNewTournament() {
    const n = document.getElementById('newTourneyName').value;
    const p = document.getElementById('newTourneyPass').value;
    if(!n || !p) return alert("Remplissez les champs !");
    db.ref('tournaments').push({ 
        name: n, 
        password: p, 
        mode: document.getElementById('creationMode').value + "v" + document.getElementById('creationMode').value,
        nbPlayers: parseInt(document.getElementById('creationMode').value) 
    });
    alert("Tournoi créé !");
}

function enterTourney(id, correctPass) {
    showModal("SÉCURITÉ", "Mot de passe :", (pass) => {
        if(pass === correctPass) {
            currentTournamentId = id;
            document.getElementById('tournament-selector').style.display = 'none';
            document.getElementById('main-interface').style.display = 'block';
            loadTournament(id);
        } else alert("Faux !");
    });
}

function loadTournament(id) {
    db.ref(`tournaments/${id}`).on('value', (snap) => {
        const t = snap.val();
        if(!t) return exitTournament();
        document.getElementById('activeTournamentTitle').innerText = t.name;
        setupForm(t.nbPlayers);
        renderTeams(t.teams);
    });
}

function setupForm(nb) {
    const container = document.getElementById('membersContainer');
    if(container.innerHTML !== "") return;
    for(let i=1; i<=nb; i++) {
        container.innerHTML += `<input type="text" class="m-id" placeholder="ID Joueur ${i}" required>`;
    }
}

function renderTeams(teams) {
    const container = document.getElementById('teamsContainer');
    container.innerHTML = teams ? Object.values(teams).map(t => `<div class="team-row">${t.name}</div>`).join('') : "";
}

function unlockGlobalAdmin() { showModal("ADMIN", "Code :", (c) => { if(c === "120606") alert("Admin débloqué"); }); }
function exitTournament() { location.reload(); }

document.getElementById('proTournamentForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const m = Array.from(document.querySelectorAll('.m-id')).map(i => i.value);
    db.ref(`tournaments/${currentTournamentId}/teams`).push({ 
        name: document.getElementById('teamName').value, 
        members: m 
    });
    alert("Inscrit !");
});
