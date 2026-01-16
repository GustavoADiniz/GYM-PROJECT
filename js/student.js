/**
 * Lógica da Área do Aluno (Student View) - Modular SDK
 */

import { db } from './app_global.js';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

window.verificarAuthAluno();

document.getElementById('studentName').innerText = sessionStorage.getItem("studentName") || 'Aluno';
const studentId = sessionStorage.getItem("studentId");

let treinoCache = {};
let progressoCache = {}; // Cache local para evitar múltiplas leituras

// Helper para obter a data de hoje no formato YYYY-MM-DD
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

// Função para verificar se um exercício está concluído
function isExCompleted(exerciseName, day) {
    const today = getTodayDateString();
    // progressoCache[today] -> { 'segunda': { 'Exercicio A': true, 'Exercicio B': false }, 'terca': ... }
    return progressoCache[day] && progressoCache[day][exerciseName] === true;
}

window.carregarTreino = async function () {
    if (!studentId) return;
    try {
        const docSnap = await getDoc(doc(db, "workouts", studentId));
        if (docSnap.exists()) {
            treinoCache = docSnap.data().days || {};

            const diasMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            const diaHj = diasMap[new Date().getDay()];

            const tabs = document.querySelectorAll('.day-tab');
            let tabHj = tabs[0];
            tabs.forEach(t => {
                if (t.textContent.toLowerCase().includes(diaHj.substring(0, 3))) {
                    tabHj = t;
                }
            });

            window.verDia(diaHj, tabHj);
        } else {
            document.getElementById('treinoContainer').innerText = "Nenhum treino encontrado.";
        }

        // --- CARREGA PROGRESSO DO CLOUD ---
        const hoje = new Date().toISOString().split('T')[0];
        const progSnap = await getDoc(doc(db, "progress", `${studentId}_${hoje}`));
        if (progSnap.exists()) {
            progressoCache = progSnap.data() || {};
            // Atualiza a visualização se o progresso foi carregado depois do treino
            const activeTab = document.querySelector('.day-tab.active');
            if (activeTab) {
                const diaDetectado = diasMap[new Date().getDay()]; // Simplificado
                window.verDia(activeTab.textContent.toLowerCase().includes('seg') ? 'segunda' :
                    activeTab.textContent.toLowerCase().includes('ter') ? 'terca' :
                        activeTab.textContent.toLowerCase().includes('qua') ? 'quarta' :
                            activeTab.textContent.toLowerCase().includes('qui') ? 'quinta' :
                                activeTab.textContent.toLowerCase().includes('sex') ? 'sexta' :
                                    activeTab.textContent.toLowerCase().includes('sab') ? 'sabado' : 'domingo', activeTab);
            }
        }
    } catch (e) {
        console.error("Erro ao carregar treino/progresso:", e);
    }
}

window.verDia = function (dia, elBtn) {
    document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
    if (elBtn) elBtn.classList.add('active');

    const container = document.getElementById('treinoContainer');
    container.innerHTML = '';

    const exerciciosOriginal = treinoCache[dia] || [];

    const exercicios = [...exerciciosOriginal].sort((a, b) => {
        const aDone = isExCompleted(a.name, dia);
        const bDone = isExCompleted(b.name, dia);
        if (aDone && !bDone) return 1;
        if (!aDone && bDone) return -1;
        return 0;
    });

    if (exercicios.length === 0) {
        container.innerHTML = '<p>Descanso ou sem treino cadastrado.</p>';
        return;
    }

    const todosConcluidos = exercicios.every(ex => isExCompleted(ex.name, dia));
    if (todosConcluidos) {
        const congrats = document.createElement('div');
        congrats.className = 'congratulations-card';
        congrats.innerHTML = `
            <img src="../imagem/trofeu.png" alt="Troféu" style="width: 80px; margin-bottom: 1rem;">
            <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Parabéns!</h2>
            <p style="font-size: 1rem; opacity: 0.9;">Você completou todos os exercícios de hoje!</p>
        `;
        container.appendChild(congrats);
    }

    exercicios.forEach((ex, index) => {
        const div = document.createElement('div');
        div.className = 'card exercise-card';
        div.id = `exercise-card-${index}`;
        div.style.padding = '1.5rem';

        const isCompleted = isExCompleted(ex.name, dia);
        if (isCompleted) div.classList.add('completed-exercise');

        let midiaHtml = '';
        if (ex.photoLink) {
            midiaHtml += `
                <div class="media-container">
                    <img src="${ex.photoLink}" alt="Demonstração">
                </div>
            `;
        }
        if (ex.videoLink) {
            midiaHtml += `
                <div style="text-align:center; margin-bottom: 1rem;">
                    <a href="${ex.videoLink}" target="_blank" style="font-size: 0.8rem; color: var(--primary); text-decoration: none; font-weight: bold;">
                        📺 Clique aqui para ver o vídeo demonstrativo
                    </a>
                </div>
            `;
        }

        const rest = ex.restTime || 60;
        const min = Math.floor(rest / 60).toString().padStart(2, '0');
        const sec = (rest % 60).toString().padStart(2, '0');

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:1rem; align-items: start;">
                <div style="flex: 1;">
                    <h3 style="color:var(--text-dark); margin-bottom:0.4rem; font-size: 1.25rem;">${ex.name}</h3>
                    <div style="display: flex; gap: 1rem; color: var(--text-muted); font-size: 0.9rem;">
                        <span><i class="bi bi-hash text-primary me-1"></i><strong>${ex.sets}</strong> Séries</span>
                        <span><i class="bi bi-repeat text-primary me-1"></i><strong>${ex.reps}</strong> Repetições</span>
                    </div>
                </div>
                <div style="font-size: 1rem; font-weight: 800; color: var(--primary); background: rgba(99, 102, 241, 0.1); padding: 0.4rem 0.8rem; border-radius: 10px; display: flex; align-items: center; gap: 0.4rem;">
                    <i class="bi bi-alarm"></i> ${rest}s
                </div>
            </div>
            
            ${midiaHtml}

            <div class="timer-container" id="timer-${ex.name.replace(/\s+/g, '-')}">
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">
                    <i class="bi bi-stopwatch me-1"></i> Cronômetro de Descanso
                </div>
                <div class="timer-display" style="margin-bottom: 1rem;">${min}:${sec}</div>
                <div class="timer-controls">
                    <button class="btn btn-sm btn-primary" onclick="toggleTimer(this, ${rest})" style="flex: 1;">
                        <i class="bi bi-play-fill"></i> Iniciar
                    </button>
                    <button class="btn btn-sm" style="background:rgba(226, 232, 240, 0.8); color:var(--text-main); flex: 1;" onclick="resetTimer(this, ${rest})">
                        <i class="bi bi-arrow-counterclockwise"></i> Resetar
                    </button>
                </div>
            </div>

            <button class="${isCompleted ? 'btn-uncheck' : 'btn-check'} btn-lg w-100" onclick="toggleConcluido('${ex.name}', '${dia}', ${index})" style="margin-top: 1.5rem; transition: all 0.2s;">
                <i class="bi ${isCompleted ? 'bi-arrow-left-circle' : 'bi-check-circle-fill'} me-2"></i>
                ${isCompleted ? 'Desmarcar Exercício' : 'Concluir Exercício'}
            </button>
        `;
        container.appendChild(div);
    });
};

function getEmbedUrl(url) {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) return url;
    const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[1] && match[1].length === 11) {
        return `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1`;
    }
    return url;
}

let activeTimers = {};

window.toggleTimer = function (btn, restTime) {
    const container = btn.closest('.timer-container');
    const display = container.querySelector('.timer-display');
    const timerId = container.id;

    if (activeTimers[timerId] && activeTimers[timerId].running) {
        clearInterval(activeTimers[timerId].interval);
        activeTimers[timerId].running = false;
        btn.innerText = 'Retomar';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-primary');
    } else {
        let timeLeft = (activeTimers[timerId] && activeTimers[timerId].timeLeft) ? activeTimers[timerId].timeLeft : restTime;
        btn.innerText = 'Pausar';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-danger');

        const interval = setInterval(() => {
            timeLeft--;
            if (activeTimers[timerId]) activeTimers[timerId].timeLeft = timeLeft;
            updateDisplay(display, timeLeft);
            if (timeLeft <= 0) {
                clearInterval(interval);
                delete activeTimers[timerId];
                btn.innerText = 'Iniciar Descanso';
                btn.classList.remove('btn-danger');
                btn.classList.add('btn-primary');
                tocarAlarme();
            }
        }, 1000);
        activeTimers[timerId] = { interval, timeLeft, running: true };
    }
};

window.resetTimer = function (btn, restTime) {
    const container = btn.closest('.timer-container');
    const display = container.querySelector('.timer-display');
    const timerId = container.id;
    const startBtn = container.querySelector('.timer-controls button:first-child');
    if (activeTimers[timerId]) {
        clearInterval(activeTimers[timerId].interval);
        delete activeTimers[timerId];
    }
    startBtn.innerText = 'Iniciar Descanso';
    startBtn.classList.remove('btn-danger');
    startBtn.classList.add('btn-primary');
    updateDisplay(display, restTime);
};

function updateDisplay(display, seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    display.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function tocarAlarme() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.4, 0.8].forEach(delay => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + delay);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + delay + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + delay + 0.3);
        oscillator.start(audioCtx.currentTime + delay);
        oscillator.stop(audioCtx.currentTime + delay + 0.3);
    });
}

function isExCompleted(nome, dia) {
    // Tenta ler do cache (Firestore) primeiro
    if (progressoCache[dia] && progressoCache[dia].includes(nome)) return true;

    // Fallback para localStorage (legado ou offline temporário)
    const hoje = new Date().toISOString().split('T')[0];
    const logs = JSON.parse(localStorage.getItem(`progress_${studentId}_${hoje}`) || '{}');
    return logs[dia] && logs[dia].includes(nome);
}

window.toggleConcluido = async function (nome, dia, index) {
    const hoje = new Date().toISOString().split('T')[0];
    const key = `progress_${studentId}_${hoje}`;
    const docId = `${studentId}_${hoje}`;

    // 1. Atualiza LocalStorage (pelo menos mantém a funcionalidade offline imediata)
    let logs = JSON.parse(localStorage.getItem(key) || '{}');
    if (!logs[dia]) logs[dia] = [];

    const card = document.getElementById(`exercise-card-${index}`);

    if (logs[dia].includes(nome)) {
        logs[dia] = logs[dia].filter(n => n !== nome);
        card.classList.remove('completed-exercise');
    } else {
        logs[dia].push(nome);
        card.classList.add('completed-exercise');
    }
    localStorage.setItem(key, JSON.stringify(logs));

    // 2. Sincroniza com Cloud (Firestore)
    progressoCache = logs; // Sincroniza cache local

    try {
        await setDoc(doc(db, "progress", docId), {
            ...logs,
            studentId,
            date: hoje,
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Erro ao sincronizar com nuvem:", e);
        // Não alerta o usuário para não interromper o treino, mas o localStorage salvou.
    }

    window.verDia(dia, document.querySelector(`.day-tab.active`));
};

window.carregarTreino();
