/**
 * Lógica do Painel do Treinador (Dashboard) - Modular SDK
 */

import { db } from './app_global.js';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Proteção: Verifica se o personal está realmente logado
window.verificarAuthDashboard();
document.getElementById('trainerName').innerText = sessionStorage.getItem("adminName") || 'Treinador';

const tabela = document.querySelector('#tabelaAlunos tbody');
const modal = document.getElementById('modalTreino');

let alunoEdicaoId = null;
let diaAtual = 'segunda';
let treinoCache = {};
let alunosLocal = [];
const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

function resetCache() {
    treinoCache = {};
    diasSemana.forEach(d => treinoCache[d] = []);
}

window.carregarAlunos = async function () {
    tabela.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "students"));
        alunosLocal = [];
        querySnapshot.forEach((doc) => {
            alunosLocal.push({ id: doc.id, ...doc.data() });
        });
        renderizarTabelaAlunos(alunosLocal);
    } catch (error) {
        console.error("Erro ao carregar:", error);
        if (error.code === 'permission-denied') {
            tabela.innerHTML = '<tr><td colspan="4" style="color:red; font-weight:bold;">ERRO DE PERMISSÃO: O Firebase bloqueou o acesso.</td></tr>';
            alert("O BANCO DE DADOS ESTÁ BLOQUEADO!");
        } else {
            tabela.innerHTML = '<tr><td colspan="4" style="color:red;">Erro ao carregar: ' + error.message + '</td></tr>';
        }
    }
};

window.toggleFormAluno = function () {
    const form = document.getElementById('formNovoAluno');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

function renderizarTabelaAlunos(lista) {
    tabela.innerHTML = '';
    if (lista.length === 0) {
        const buscaValor = document.getElementById('inputBusca').value;
        const mensagem = buscaValor ? 'Aluno não existente' : 'Nenhum aluno cadastrado.';
        tabela.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">${mensagem}</td></tr>`;
        return;
    }
    lista.forEach((aluno) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="align-middle fw-medium">${aluno.name}</td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-primary" onclick="abrirEditor('${aluno.id}', '${aluno.name}')">
                        <i class="bi bi-journal-text me-1"></i> Treinos
                    </button>
                    <button class="btn btn-sm btn-light border" onclick="abrirEdicaoAluno('${aluno.id}')">
                        <i class="bi bi-pencil me-1"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="excluirAluno('${aluno.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tabela.appendChild(tr);
    });
}

window.filtrarAlunos = function () {
    const termo = document.getElementById('inputBusca').value.toLowerCase().trim();
    const filtrados = alunosLocal.filter(a => a.name.toLowerCase().includes(termo));
    renderizarTabelaAlunos(filtrados);
};

window.adicionarAluno = async function () {
    const name = document.getElementById('novoNome').value;
    const login = document.getElementById('novoLogin').value;
    const password = document.getElementById('novaSenha').value;

    if (!name || !login || !password) return alert("Preencha todos os campos.");

    try {
        const senhaHash = await window.hashSenha(password);
        await addDoc(collection(db, "students"), {
            name,
            login,
            password: senhaHash,
            passwordPlain: password,
            createdAt: new Date()
        });

        document.getElementById('novoNome').value = '';
        document.getElementById('novoLogin').value = '';
        document.getElementById('novaSenha').value = '';
        toggleFormAluno();
        window.carregarAlunos();
        showToast("Aluno cadastrado com sucesso! 👤");
    } catch (e) {
        alert("Erro ao cadastrar: " + e.message);
    }
};

window.excluirAluno = async function (id) {
    if (confirm("Excluir este aluno definitivamente?")) {
        try {
            await deleteDoc(doc(db, "students", id));
            window.carregarAlunos();
            showToast("Aluno excluído. 🗑️");
        } catch (e) {
            alert("Erro ao excluir: " + e.message);
        }
    }
};

let alunoPerfilId = null;

window.abrirEdicaoAluno = function (id) {
    const aluno = alunosLocal.find(a => a.id === id);
    if (!aluno) return;

    alunoPerfilId = id;
    document.getElementById('editNome').value = aluno.name;
    document.getElementById('editLogin').value = aluno.login;
    document.getElementById('editSenha').value = aluno.passwordPlain || '';
    document.getElementById('modalEditarAluno').style.display = 'block';
};

window.fecharEdicaoAluno = function () {
    document.getElementById('modalEditarAluno').style.display = 'none';
};

window.salvarEdicaoAluno = async function () {
    const nome = document.getElementById('editNome').value.trim();
    const login = document.getElementById('editLogin').value.trim();
    const novaSenha = document.getElementById('editSenha').value.trim();

    if (!nome || !login) return alert("Preencha nome e login.");

    const updates = { name: nome, login: login };

    try {
        if (novaSenha) {
            updates.password = await window.hashSenha(novaSenha);
            updates.passwordPlain = novaSenha;
        }

        await updateDoc(doc(db, "students", alunoPerfilId), updates);

        showToast("Perfil atualizado! ✅");
        fecharEdicaoAluno();
        window.carregarAlunos();
    } catch (e) {
        alert("Erro ao editar: " + e.message);
    }
};

window.abrirEditor = async function (id, nome) {
    alunoEdicaoId = id;
    document.getElementById('alunoEmEdicao').innerText = nome;
    modal.style.display = 'block';

    try {
        const docSnap = await getDoc(doc(db, "workouts", id));
        if (docSnap.exists()) {
            treinoCache = docSnap.data().days || {};
            diasSemana.forEach(d => { if (!treinoCache[d]) treinoCache[d] = []; });
        } else {
            resetCache();
        }

        const diasMap = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        const diaHj = diasMap[new Date().getDay()];

        const tabs = document.querySelectorAll('#modalTreino .day-tab');
        let elHj = null;
        tabs.forEach(t => {
            if (t.textContent.toLowerCase().includes(diaHj.substring(0, 3))) elHj = t;
        });

        mudarDia(diaHj, elHj);
    } catch (e) {
        console.error("Erro ao carregar treinos:", e);
    }
};

window.mudarDia = function (dia, el) {
    diaAtual = dia;
    document.querySelectorAll('.day-tab').forEach(tab => tab.classList.remove('active'));
    if (el) {
        el.classList.add('active');
    } else {
        document.querySelectorAll('.day-tab').forEach(tab => {
            if (tab.textContent.toLowerCase() === 'segunda') tab.classList.add('active');
        });
    }
    renderizarDia();
};

function renderizarDia() {
    const container = document.getElementById('containerDias');
    container.innerHTML = '';

    const exercicios = treinoCache[diaAtual] || [];

    const divDia = document.createElement('div');
    divDia.className = 'day-content active';
    divDia.innerHTML = `
        <h4 style="margin-bottom:1rem; text-transform: capitalize;">${diaAtual}</h4>
        <div id="listaExercicio"></div>
        <button onclick="addExercicioNoDia()" class="btn btn-sm btn-primary" style="margin-top:1rem">+ Adicionar Exercício</button>
    `;
    container.appendChild(divDia);

    const lista = divDia.querySelector(`#listaExercicio`);
    exercicios.forEach((ex, index) => {
        const row = document.createElement('div');
        row.className = 'exercise-row';
        row.style.background = '#f8fafc';
        row.style.border = '1px solid var(--border)';
        row.style.borderRadius = '16px';
        row.style.padding = '1.25rem';
        row.style.marginBottom = '1.25rem';
        row.style.position = 'relative';

        row.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <div class="small fw-bold text-primary text-uppercase">
                    <i class="bi bi-collection me-1"></i> #${index + 1} - Exercício
                </div>
            </div>
            <div class="exercise-inputs" style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
                <div>
                    <label class="form-label small fw-bold text-muted text-uppercase mb-1">Nome do Exercício</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-white"><i class="bi bi-activity text-primary"></i></span>
                        <input type="text" class="form-control" value="${ex.name}" placeholder="Ex: Supino Reto" onchange="updateEx(${index}, 'name', this.value)">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;">
                    <div>
                        <label class="form-label small fw-bold text-muted text-uppercase mb-1">Séries</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white"><i class="bi bi-hash text-primary"></i></span>
                            <input type="text" class="form-control" value="${ex.sets}" placeholder="4" onchange="updateEx(${index}, 'sets', this.value)">
                        </div>
                    </div>
                    <div>
                        <label class="form-label small fw-bold text-muted text-uppercase mb-1">Reps</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white"><i class="bi bi-repeat text-primary"></i></span>
                            <input type="text" class="form-control" value="${ex.reps}" placeholder="12" onchange="updateEx(${index}, 'reps', this.value)">
                        </div>
                    </div>
                    <div>
                        <label class="form-label small fw-bold text-muted text-uppercase mb-1">Desc.(s)</label>
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white"><i class="bi bi-alarm text-primary"></i></span>
                            <input type="number" class="form-control" value="${ex.restTime || 60}" placeholder="60" onchange="updateEx(${index}, 'restTime', this.value)">
                        </div>
                    </div>
                </div>
            </div>
            <div class="mt-3 d-flex flex-column gap-2">
                <div>
                    <label class="form-label small fw-bold text-muted text-uppercase mb-1">Vídeo (YouTube)</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-white"><i class="bi bi-play-circle text-primary"></i></span>
                        <input type="text" class="form-control" value="${ex.videoLink || ''}" placeholder="Link do vídeo" onchange="updateEx(${index}, 'videoLink', this.value)">
                    </div>
                </div>
                <div>
                    <label class="form-label small fw-bold text-muted text-uppercase mb-1">Foto (URL)</label>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-white"><i class="bi bi-image text-primary"></i></span>
                        <input type="text" class="form-control" value="${ex.photoLink || ''}" placeholder="Link da imagem" onchange="updateEx(${index}, 'photoLink', this.value)">
                    </div>
                </div>
                <button class="btn btn-sm btn-outline-danger w-100 mt-2 py-2" onclick="removeEx(${index})">
                    <i class="bi bi-trash3-fill me-1"></i> Remover Exercício
                </button>
            </div>
        `;
        lista.appendChild(row);
    });
}

window.addExercicioNoDia = function () {
    if (!treinoCache[diaAtual]) treinoCache[diaAtual] = [];
    treinoCache[diaAtual].push({ name: '', sets: '', reps: '', restTime: 60, videoLink: '', photoLink: '' });
    renderizarDia();
};

window.updateEx = function (index, field, value) {
    treinoCache[diaAtual][index][field] = value;
};

window.removeEx = function (index) {
    treinoCache[diaAtual].splice(index, 1);
    renderizarDia();
};

window.salvarEFechar = async function () {
    if (!alunoEdicaoId) return;
    try {
        await setDoc(doc(db, "workouts", alunoEdicaoId), {
            days: treinoCache,
            updatedAt: new Date()
        });
        showToast("Treino salvo com sucesso! ✅");
        modal.style.display = 'none';
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    }
};

window.showToast = function (msg) {
    const toast = document.getElementById("toast");
    toast.innerText = msg;
    toast.className = "show";
    setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
};

window.abrirConfig = function () {
    document.getElementById('modalConfig').style.display = 'block';
};

window.fecharConfig = function () {
    document.getElementById('modalConfig').style.display = 'none';
};

window.salvarConfig = async function () {
    const novoUser = document.getElementById('configUsername').value.trim();
    const novaSenha = document.getElementById('configPassword').value.trim();

    if (!novoUser || !novaSenha) return alert("Preencha usuário e senha.");

    try {
        const senhaHash = await window.hashSenha(novaSenha);
        const adminId = sessionStorage.getItem("adminId");

        if (adminId) {
            await updateDoc(doc(db, "admins", adminId), {
                username: novoUser,
                password: senhaHash
            });
        }

        showToast("Credenciais atualizadas! ✅");
        fecharConfig();
    } catch (e) {
        alert("Erro ao salvar configurações: " + e.message);
    }
};

// Carregamento inicial da página
window.carregarAlunos();
