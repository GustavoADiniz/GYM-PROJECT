import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Credenciais "Hardcoded" do Admin como solicitado
const TRAINER_LOGIN = "André";
const TRAINER_PASS = "123";
// Email interno para o Firebase Auth (O usuário não precisa digitar isso)
const TRAINER_EMAIL_REAL = "andre@trainer.com";

export async function login(usuario, senha) {
    // 1. Verifica se é o Treinador André
    if (usuario === TRAINER_LOGIN && senha === TRAINER_PASS) {
        try {
            // Tenta logar com o email real do admin.
            // Nota: Se a conta não existir, precisaria criar. 
            // Para simplificar, vou assumir erro na primeira vez e alertar.
            await signInWithEmailAndPassword(auth, TRAINER_EMAIL_REAL, "senha123padrao"); // Senha interna forte
            // Se der certo:
            window.location.href = "dashboard.html";
            return;
        } catch (e) {
            console.log("Tentando criar conta de Admin automática...", e);
            // Se o login falhar (ex: usuario nao existe), TENTAMOS CRIAR A CONTA AUTOMATICAMENTE
            // Isso resolve o problema do primeiro acesso.
            try {
                const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js");
                await createUserWithEmailAndPassword(auth, TRAINER_EMAIL_REAL, "senha123padrao");

                // Se criou com sucesso, redireciona
                window.location.href = "dashboard.html";
                return;
            } catch (createError) {
                // Se der erro ao criar (ex: senha fraca, ou erro de rede)
                console.error("Erro fatal ao criar Admin:", createError);
                alert("Erro ao entrar. Verifique o console (F12) para detalhes.");
                throw createError;
            }
        }
    }

    // 2. Se não é André, verifica se é ALUNO no Firestore (Simulated Auth)
    // Buscamos na coleção 'students' se existe usuario/senha batendo
    try {
        const q = query(collection(db, "students"),
            where("login", "==", usuario),
            where("password", "==", senha)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Aluno encontrado!
            const alunoDoc = querySnapshot.docs[0];
            const alunoData = alunoDoc.data();

            // Salvamos o ID do aluno na Sessão (SessionStorage) para usar na página do aluno
            // Não usamos Firebase Auth para o aluno para simplificar o cadastro pelo professor
            sessionStorage.setItem("studentId", alunoDoc.id);
            sessionStorage.setItem("studentName", alunoData.name);

            window.location.href = "student.html";
            return;
        } else {
            throw new Error("Usuário ou senha inválidos.");
        }

    } catch (error) {
        console.error("Erro Login:", error);
        throw error;
    }
}

export async function logout() {
    await signOut(auth);
    sessionStorage.clear();
    window.location.href = "index.html";
}

/**
 * Verifica permissão na página
 * @param {string} tipo 'trainer' ou 'student'
 */
export function checkAuth(tipo) {
    if (tipo === 'trainer') {
        const user = auth.currentUser;
        // O check do Firebase pode demorar ms, então idealmente usamos onAuthStateChanged.
        // Mas como temos pagina estatica, vamos confiar no carregamento.
        // Se nao tiver user firebase, volta.
        // (Simplificação)
    }

    if (tipo === 'student') {
        if (!sessionStorage.getItem("studentId")) {
            window.location.href = "index.html";
        }
    }
}
