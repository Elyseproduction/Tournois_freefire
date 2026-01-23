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
let unlockedIDs = JSON.parse(localStorage.getItem('unlockedTourneys')) || [];

// NOTIFICATIONS AMÉLIORÉES
function notify(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = '0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

function enterTourney(id, correctPass) {
    if (unlockedIDs.includes(id)) {
        openTournamentInterface(id);
        return;
    }

    showModal("SÉCURITÉ", "Entrez le mot de passe du tournoi :", pass => {
        if (pass === correctPass) {
            if (!unlockedIDs.includes(id)) {
                unlockedIDs.push(id);
                localStorage.setItem('unlockedTourneys', JSON.stringify(unlockedIDs));
            }
            closeModal();
            openTournamentInterface(id);
            filterTournaments();
            notify("Accès autorisé !");
        } else {
            notify("Mot de passe incorrect", "error");
        }
    });
}

function forgetTourney(id) {
    // On change le titre et la description de la modale
    document.getElementById('modal-title').innerText = "CONFIRMATION";
    document.getElementById('modal-desc').innerText = "Retirer ce tournoi de vos accès rapides ?";
    
    // On cache l'input car on n'en a pas besoin pour une confirmation
    document.getElementById('modal-input').style.display = "none";
    
    // On affiche la modale
    document.getElementById('custom-modal').style.display = "flex";
    
    // Action si on clique sur OK
    document.getElementById('modal-confirm').onclick = () => {
        unlockedIDs = unlockedIDs.filter(item => item !== id);
        localStorage.setItem('unlockedTourneys', JSON.stringify(unlockedIDs));
        closeModal();
        filterTournaments();
        notify("Tournoi retiré de la liste");
        // On réaffiche l'input pour les prochaines fois
        document.getElementById('modal-input').style.display = "block";
    };
}

// Modifie aussi closeModal pour être sûr que l'input revienne toujours
function closeModal() {
    document.getElementById('custom-modal').style.display = "none";
    document.getElementById('modal-input').value = "";
    document.getElementById('modal-input').style.display = "block"; // Reset visuel
}

function openTournamentInterface(id) {
    currentTournamentId = id;
    document.getElementById('tournament-selector').style.display = 'none';
    document.getElementById('main-interface').style.display = 'flex'; 
    loadTournament(id);
}

db.ref('tournaments').on('value', snap => {
    allTournaments = snap.val() || {};
    filterTournaments();
});

function filterTournaments() {
    const list = document.getElementById('tournamentsList');
    const unlockedList = document.getElementById('unlockedTournamentsList');
    const unlockedSection = document.getElementById('unlocked-section');
    const q = document.getElementById('searchInput').value.toLowerCase();
    
    list.innerHTML = "";
    unlockedList.innerHTML = "";
    let hasUnlocked = false;

    Object.keys(allTournaments).forEach(id => {
        const t = allTournaments[id];
        if (t.name.toLowerCase().includes(q)) {
            const row = document.createElement('div');
            row.className = "team-row";
            
            const nameSpan = document.createElement('span');
            nameSpan.style.cursor = "pointer";
            nameSpan.style.flex = "1";
            nameSpan.innerHTML = `🏆 ${t.name}`;
            nameSpan.onclick = () => enterTourney(id, t.password);
            row.appendChild(nameSpan);

            const btnContainer = document.createElement('div');

            if (unlockedIDs.includes(id)) {
                row.style.borderLeftColor = "#2ecc71";
                const btnForget = document.createElement('button');
                btnForget.innerHTML = "🚪";
                btnForget.className = "btn-action-small";
                btnForget.onclick = (e) => { e.stopPropagation(); forgetTourney(id); };
                btnContainer.appendChild(btnForget);
                unlockedList.appendChild(row);
                hasUnlocked = true;
            } else {
                list.appendChild(row);
            }

            if (isAdminMaster) {
                const btnDel = document.createElement('button');
                btnDel.innerHTML = "🗑️";
                btnDel.className = "btn-action-small";
                btnDel.style.background = "#e74c3c";
                btnDel.onclick = (e) => { 
                    e.stopPropagation(); 
                    if(confirm("Supprimer ce tournoi ?")) db.ref(`tournaments/${id}`).remove(); 
                };
                btnContainer.appendChild(btnDel);
            }
            row.appendChild(btnContainer);
        }
    });
    unlockedSection.style.display = hasUnlocked ? "block" : "none";
}

function createNewTournament() {
    const n = document.getElementById('newTourneyName').value;
    const p = document.getElementById('newTourneyPass').value;
    const ap = document.getElementById('newTourneyAdminPass').value;
    const m = document.getElementById('creationMode').value;
    if (!n || !p || !ap) return notify("Champs incomplets !", "error");
    db.ref('tournaments').push({ name: n, password: p, adminPassword: ap, nbPlayers: parseInt(m) })
    .then(() => { notify("Tournoi créé !"); document.getElementById('newTourneyName').value = ""; });
}

function loadTournament(id) {
    db.ref(`tournaments/${id}`).once('value', snap => {
        const t = snap.val();
        if (!t) return;
        document.getElementById('activeTournamentTitle').innerText = t.name;
        generateMemberInputs(t.nbPlayers);
        loadTeams(id);
    });
}

function generateMemberInputs(nb) {
    const c = document.getElementById('membersContainer');
    c.innerHTML = "";
    for (let i = 1; i <= nb; i++) {
        const input = document.createElement("input");
        input.placeholder = "Pseudo joueur " + i;
        input.className = "member-input";
        input.required = true;
        c.appendChild(input);
    }
}

document.getElementById('proTournamentForm').onsubmit = function(e) {
    e.preventDefault();
    const players = [];
    document.querySelectorAll('.member-input').forEach(i => players.push(i.value));
    db.ref(`teams/${currentTournamentId}`).push({
        teamName: document.getElementById('teamName').value,
        facebook: document.getElementById('facebook').value,
        players
    }).then(() => { notify("Inscription validée !"); this.reset(); });
};

function loadTeams(id) {
    const container = document.getElementById('teamsContainer');
    db.ref(`teams/${id}`).on('value', snap => {
        container.innerHTML = "<h3 class='gradient-text' style='font-size:0.7rem;'></h3>";
        Object.values(snap.val() || {}).forEach(t => {
            container.innerHTML += `<div class="team-row" style="flex-direction:column; align-items:flex-start;">
                <strong>${t.teamName}</strong><small style="color:#888;">${t.players.join(", ")}</small>
            </div>`;
        });
    });
}

function toggleSideMenu() { document.getElementById('side-menu').classList.toggle('active'); }
function showModal(title, desc, callback) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    document.getElementById('custom-modal').style.display = "flex";
    document.getElementById('modal-confirm').onclick = () => callback(document.getElementById('modal-input').value);
}
function closeModal() { document.getElementById('custom-modal').style.display = "none"; document.getElementById('modal-input').value = ""; }

function unlockGlobalAdmin() {
    showModal("SYSTÈME", "Code Maître :", c => {
        if (c === "120606") { isAdminMaster = true; closeModal(); filterTournaments(); notify("MODE ADMIN ACTIF"); }
        else notify("Code invalide", "error");
    });
}

function exitTournament() { location.reload(); }

// Variable pour l'utilisateur du chat
let currentUser = JSON.parse(localStorage.getItem('chatUser')) || null;

// FONCTION POUR CHANGER DE MENU (SANS RECHARGER)
function showSection(id) {
    // Cache toutes les pages
    document.getElementById('tournament-selector').style.display = 'none';
    document.getElementById('community-section').style.display = 'none';
    document.getElementById('main-interface').style.display = 'none';
    
    // Affiche la bonne
    document.getElementById(id).style.display = 'flex';
    
    // Gère l'état actif du menu
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    if(id === 'tournament-selector') document.getElementById('nav-home').classList.add('active');
    if(id === 'community-section') {
        document.getElementById('nav-commu').classList.add('active');
        if(currentUser) initChat();
    }
}

// LOGIQUE DU CHAT
function joinCommunityChat() {
    const pseudo = document.getElementById('chat-pseudo').value.trim();
    const uid = document.getElementById('chat-uid').value.trim();
    if (pseudo.length < 2 || uid.length < 5) return notify("Infos invalides", "error");

    currentUser = { pseudo, uid };
    localStorage.setItem('chatUser', JSON.stringify(currentUser));
    initChat();
}

function initChat() {
    document.getElementById('chat-auth-ui').style.display = 'none';
    document.getElementById('chat-interface').style.display = 'flex';

    // Écouter les messages (limité aux 50 derniers)
    db.ref('community_messages').limitToLast(50).on('value', snap => {
        const container = document.getElementById('chat-messages');
        container.innerHTML = "";
        
        snap.forEach(child => {
            const m = child.val();
            const isMe = m.uid === currentUser.uid;
            const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "";
            
            container.innerHTML += `
                <div class="msg-wrapper ${isMe ? 'msg-me' : 'msg-them'}">
                    <div class="chat-meta">${isMe ? 'Moi' : m.pseudo} • ${time}</div>
                    <div class="bubble">${m.text}</div>
                </div>`;
        });
        // Scroll automatique vers le bas
        container.scrollTop = container.scrollHeight;
    });
}

function sendMessage() {
    const input = document.getElementById('chat-msg-input');
    const text = input.value.trim();
    if (!text) return;

    db.ref('community_messages').push({
        pseudo: currentUser.pseudo,
        uid: currentUser.uid,
        text: text,
        timestamp: Date.now()
    });
    input.value = "";
}

function sendMessage() {
    const input = document.getElementById('chat-msg-input');
    if (!input.value.trim()) return;
    db.ref('community_messages').push({
        pseudo: currentUser.pseudo,
        uid: currentUser.uid,
        text: input.value.trim(),
        timestamp: Date.now()
    });
    input.value = "";
}

// MODIFIER TA FONCTION EXISTANTE openTournamentInterface :
function openTournamentInterface(id) {
    currentTournamentId = id;
    showSection('main-interface'); // Utilise showSection au lieu de display block direct
    loadTournament(id);
}


function generateBracket() {
    const container = document.getElementById('bracket-container');
    container.innerHTML = "";

    // On récupère les équipes inscrites du tournoi actuel
    db.ref(`teams/${currentTournamentId}`).once('value', snap => {
        const teams = Object.values(snap.val() || {});
        if (teams.length < 2) {
            container.innerHTML = "<p class='sub-logo'>Besoin d'au moins 2 équipes pour générer l'arbre.</p>";
            return;
        }

        // Création Round 1 (Huitièmes, Quarts, etc.)
        const round1 = document.createElement('div');
        round1.className = "bracket-round";
        
        for (let i = 0; i < teams.length; i += 2) {
            const team1 = teams[i].teamName;
            const team2 = teams[i+1] ? teams[i+1].teamName : "À DÉTERMINER";
            
            round1.innerHTML += `
                <div class="bracket-match">
                    <div class="bracket-team"><span>${team1}</span><span class="bracket-score">-</span></div>
                    <div class="bracket-team"><span>${team2}</span><span class="bracket-score">-</span></div>
                </div>
            `;
        }
        container.appendChild(round1);

        // Ajout d'un Round 2 (Exemple visuel)
        const round2 = document.createElement('div');
        round2.className = "bracket-round";
        for (let j = 0; j < Math.ceil(teams.length / 4); j++) {
             round2.innerHTML += `
                <div class="bracket-match">
                    <div class="bracket-team"><span>Gagnant M${j*2+1}</span></div>
                    <div class="bracket-team"><span>Gagnant M${j*2+2}</span></div>
                </div>
            `;
        }
        container.appendChild(round2);
    });
}

// GESTION DES ONGLETS
function switchTab(tab) {
    document.getElementById('registration-view').style.display = tab === 'registration' ? 'block' : 'none';
    document.getElementById('bracket-view').style.display = tab === 'bracket' ? 'block' : 'none';
    document.getElementById('podium-view').style.display = tab === 'podium' ? 'block' : 'none';
    
    if(tab === 'bracket') loadBracketRealTime();
    if(tab === 'podium') loadPodium();
}

function loadPodium() {
    const container = document.getElementById('podium-data');
    db.ref(`brackets/${currentTournamentId}`).once('value', snap => {
        const results = snap.val() || {};
        
        // 1er : Gagnant de la finale (rX_m0 le plus élevé)
        const finalMatchId = Object.keys(results).filter(k => k.startsWith('r')).sort().pop();
        const winner1 = results[finalMatchId] || "---";

        // 2ème : On demande à l'admin de le saisir ou on le déduit
        // Pour faire simple, on ajoute un champ dans l'admin ou on utilise une clé fixe
        const winner2 = results['finalist_2nd'] || "FINALISTE";

        // 3ème : Gagnant du match de consolation
        const winner3 = results['match_3rd_place'] || "TOP 3";

        container.innerHTML = `
            <div class="podium-step step-2">
                <div class="medal-icon">🥈</div>
                <div class="podium-rank">2</div>
                <div class="podium-name">${winner2}</div>
            </div>
            <div class="podium-step step-1">
                <div class="medal-icon">👑</div>
                <div class="podium-rank">1</div>
                <div class="podium-name">${winner1}</div>
            </div>
            <div class="podium-step step-3">
                <div class="medal-icon">🥉</div>
                <div class="podium-rank">3</div>
                <div class="podium-name">${winner3}</div>
            </div>
        `;
    });
}

// RÉTABLISSEMENT DE L'INSCRIPTION
document.getElementById('proTournamentForm').onsubmit = function(e) {
    e.preventDefault();
    if (!currentTournamentId) return;

    const teamName = document.getElementById('teamName').value;
    const fb = document.getElementById('facebook').value;
    const players = Array.from(document.querySelectorAll('.member-input')).map(i => i.value);

    db.ref(`teams/${currentTournamentId}`).push({
        teamName: teamName,
        facebook: fb,
        players: players,
        timestamp: Date.now()
    }).then(() => {
        notify("Inscription réussie !");
        document.getElementById('proTournamentForm').reset();
    }).catch(err => notify("Erreur: " + err.message, "error"));
};

// FONCTION POUR LES MATCHS (SÉCURISÉ PAR PASS PRIVÉ)
async function setWinner(matchId, teamName) {
    const tourneySnap = await db.ref(`tournaments/${currentTournamentId}`).once('value');
    const adminPass = tourneySnap.val().adminPassword;

    showModal("ADMIN MATCH", "Entrez le MOT DE PASSE PRIVÉ :", (input) => {
        if(input === adminPass) {
            db.ref(`brackets/${currentTournamentId}/${matchId}`).set(teamName);
            closeModal();
            notify("Gagnant validé !");
        } else {
            notify("Mot de passe incorrect", "error");
        }
    });
}

// CHARGEMENT DE L'ARBRE
// CHARGEMENT ET CALCUL DE L'ARBRE
function loadBracketRealTime() {
    const container = document.getElementById('bracket-data');
    
    db.ref(`brackets/${currentTournamentId}`).on('value', snap => {
        const results = snap.val() || {};
        db.ref(`teams/${currentTournamentId}`).once('value', tSnap => {
            const teams = Object.values(tSnap.val() || {});
            renderFullBracket(container, teams, results);
        });
    });
}

// MODIFICATION DE LA GÉNÉRATION DE L'ARBRE
function renderFullBracket(container, teams, results) {
    container.innerHTML = "";
    if (teams.length < 2) {
        container.innerHTML = "<p>En attente d'équipes...</p>";
        return;
    }

    // 1. GÉNÉRATION DES MATCHS QUALIFICATIFS JUSQU'À LA FINALE
    const nbRounds = Math.ceil(Math.log2(teams.length));
    let currentRoundTeams = teams.map(t => t.teamName);

    for (let r = 1; r <= nbRounds; r++) {
        const roundDiv = document.createElement('div');
        roundDiv.className = "bracket-round";
        const title = r === nbRounds ? "GRANDE FINALE" : `ROUND ${r}`;
        roundDiv.innerHTML = `<div class='round-title'>${title}</div>`;

        let nextRoundTeams = [];
        const nbMatches = Math.pow(2, nbRounds - r);

        for (let m = 0; m < nbMatches; m++) {
            const matchId = `r${r}_m${m}`;
            const team1 = currentRoundTeams[m * 2] || "TBD";
            const team2 = currentRoundTeams[m * 2 + 1] || "TBD";
            const winner = results[matchId];

            nextRoundTeams.push(winner || "TBD");

            roundDiv.innerHTML += `
                <div class="bracket-match">
                    <div class="bracket-team ${winner === team1 && team1 !== 'TBD' ? 'winner' : ''}" 
                         onclick="handleMatchClick('${matchId}', '${team1}', '${team2}')">${team1}</div>
                    <div class="bracket-team ${winner === team2 && team2 !== 'TBD' ? 'winner' : ''}" 
                         onclick="handleMatchClick('${matchId}', '${team2}', '${team1}')">${team2}</div>
                </div>`;
        }
        container.appendChild(roundDiv);
        currentRoundTeams = nextRoundTeams;
    }

    // 2. AJOUT DU MATCH POUR LA 3ÈME PLACE (En dessous ou à côté)
    db.ref(`brackets/${currentTournamentId}/match_3rd_slots`).once('value', slotSnap => {
    const slots = slotSnap.val() || { teamA: "Perdant Semi 1", teamB: "Perdant Semi 2" };
    const winner3rd = results['match_3rd_place'] || "TBD";

    const consolationDiv = document.createElement('div');
    consolationDiv.className = "bracket-round consolation-box";
    consolationDiv.innerHTML = `
        <div class='round-title' style="color:#e67e22">PETITE FINALE (3ème PLACE)</div>
        <div class="bracket-match" style="border-color:#e67e22">
            <div class="bracket-team ${winner3rd === slots.teamA ? 'winner' : ''}" 
                 onclick="setWinner('match_3rd_place', '${slots.teamA}')">${slots.teamA}</div>
            <div class="bracket-team ${winner3rd === slots.teamB ? 'winner' : ''}" 
                 onclick="setWinner('match_3rd_place', '${slots.teamB}')">${slots.teamB}</div>
        </div>
    `;
    container.appendChild(consolationDiv);
});
}

// Nouvelle fonction pour gérer le gagnant ET le perdant (2ème place) automatiquement
async function handleMatchClick(matchId, winnerName, loserName) {
    if (winnerName === "TBD" || winnerName === "EN ATTENTE") return;

    const tourneySnap = await db.ref(`tournaments/${currentTournamentId}`).once('value');
    const adminPass = tourneySnap.val().adminPassword;

    showModal("ADMIN SCORE", `Confirmer ${winnerName} comme vainqueur ?`, (input) => {
        if (input === adminPass) {
            // 1. Enregistrer le gagnant du match actuel
            db.ref(`brackets/${currentTournamentId}/${matchId}`).set(winnerName);
            
            // 2. Logique spéciale pour les Demi-Finales (Round avant la finale)
            // Détecter si c'est une demi-finale pour envoyer le perdant en Petite Finale
            const totalRounds = Math.ceil(Math.log2(teams.length));
            const currentRound = parseInt(matchId.split('_')[0].replace('r', ''));

            if (currentRound === totalRounds - 1) {
                // On envoie le perdant vers les slots de la 3ème place
                const slot = matchId.endsWith('m0') ? 'teamA' : 'teamB';
                db.ref(`brackets/${currentTournamentId}/match_3rd_slots/${slot}`).set(loserName);
            }

            // Si c'est la Grande Finale, on enregistre le 2ème place
            if (currentRound === totalRounds) {
                db.ref(`brackets/${currentTournamentId}/finalist_2nd`).set(loserName);
            }

            // 3. Logique pour la Grande Finale
            if (currentRound === totalRounds) {
                db.ref(`brackets/${currentTournamentId}/finalist_2nd`).set(loserName);
            }
            
            closeModal();
            notify("Résultat et perdant mis à jour !");
        } else {
            notify("Code incorrect", "error");
        }
    });
}

// MISE À JOUR SÉCURISÉE
async function setWinner(matchId, teamName) {
    if (teamName === "EN ATTENTE" || teamName === "TBD") return;

    const tourneySnap = await db.ref(`tournaments/${currentTournamentId}`).once('value');
    const adminPass = tourneySnap.val().adminPassword;

    showModal("VALIDER GAGNANT", `Confirmer ${teamName} comme vainqueur ?`, (input) => {
        if (input === adminPass) {
            db.ref(`brackets/${currentTournamentId}/${matchId}`).set(teamName);
            closeModal();
            notify("Arbre mis à jour !");
        } else {
            notify("Mot de passe privé incorrect", "error");
        }
    });
}

function renderBracketUI(container, teams, matches) {
    container.innerHTML = "";
    if(teams.length < 2) {
        container.innerHTML = "<p style='font-size:0.7rem;'>Besoin de 2 équipes minimum</p>";
        return;
    }

    const round1 = document.createElement('div');
    round1.className = "bracket-round";
    for (let i = 0; i < teams.length; i += 2) {
        const mId = `m1_${i}`;
        const t1 = teams[i].teamName;
        const t2 = teams[i+1] ? teams[i+1].teamName : "BYE";
        const win = matches[mId];

        round1.innerHTML += `
            <div class="bracket-match">
                <div class="bracket-team ${win === t1 ? 'winner' : ''}" onclick="setWinner('${mId}', '${t1}')">${t1}</div>
                <div class="bracket-team ${win === t2 ? 'winner' : ''}" onclick="setWinner('${mId}', '${t2}')">${t2}</div>
            </div>`;
    }
    container.appendChild(round1);
}

// Correction pour le défilement tactile de l'arbre
const bracketScroll = document.querySelector('.bracket-scroll');
if (bracketScroll) {
    let isDown = false;
    let startX;
    let scrollLeft;

    bracketScroll.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - bracketScroll.offsetLeft;
        scrollLeft = bracketScroll.scrollLeft;
    });
    bracketScroll.addEventListener('mouseleave', () => isDown = false);
    bracketScroll.addEventListener('mouseup', () => isDown = false);
    bracketScroll.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - bracketScroll.offsetLeft;
        const walk = (x - startX) * 2;
        bracketScroll.scrollLeft = scrollLeft - walk;
    });
}

// Fonction pour fermer le clavier Android après envoi dans le chat
function sendMessage() {
    const input = document.getElementById('chat-msg-input');
    const text = input.value.trim();
    if (!text) return;

    db.ref('community_messages').push({
        pseudo: currentUser.pseudo,
        uid: currentUser.uid,
        text: text,
        timestamp: Date.now()
    });
    
    input.value = "";
    input.blur(); // Ferme le clavier sur mobile
}

// GESTION DES ONGLETS (Switch)
function switchTab(tabName) {
    // Cacher toutes les vues
    document.querySelectorAll('.tab-content').forEach(view => view.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // Afficher la bonne vue
    if(tabName === 'registration') {
        document.getElementById('registration-view').style.display = 'flex';
        document.getElementById('tab-reg').classList.add('active');
    } else if(tabName === 'bracket') {
        document.getElementById('bracket-view').style.display = 'flex';
        document.getElementById('tab-brack').classList.add('active');
        loadBracketRealTime();
    } else if(tabName === 'chat') {
        document.getElementById('tourney-chat-view').style.display = 'flex';
        document.getElementById('tab-chat').classList.add('active');
        initTourneyChat();
    } else if(tabName === 'podium') {
        document.getElementById('podium-view').style.display = 'flex';
        document.getElementById('tab-pod').classList.add('active');
        loadPodium();
    }
}

// LOGIQUE CHAT TOURNOI
function initTourneyChat() {
    if (!currentTournamentId) return;
    const chatContainer = document.getElementById('chat-messages-tourney');
    
    db.ref(`tourney_chats/${currentTournamentId}`).limitToLast(30).on('value', snap => {
        chatContainer.innerHTML = "";
        snap.forEach(child => {
            const m = child.val();
            const isMe = m.uid === currentUser.uid;
            chatContainer.innerHTML += `
                <div class="${isMe ? 'msg-me' : 'msg-them'}">
                    <small style="font-size:0.6rem; opacity:0.7;">${m.pseudo}</small>
                    <div style="font-size:0.85rem;">${m.text}</div>
                </div>`;
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

function sendChatMessage(type) {
    const input = type === 'tourney' ? document.getElementById('chat-input-tourney') : document.getElementById('chat-input-global');
    const path = type === 'tourney' ? `tourney_chats/${currentTournamentId}` : `community_messages`;
    
    if (!input.value.trim()) return;

    db.ref(path).push({
        pseudo: currentUser.pseudo,
        uid: currentUser.uid,
        text: input.value,
        timestamp: Date.now()
    });
    input.value = "";
    input.focus();
}
