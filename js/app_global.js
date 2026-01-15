// ============================================================
// CONFIGURAÇÃO FIREBASE (Versão Compatibilidade Global)
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyB-EUEKc_7zzszou9qP83ic7DZV-1CBrZw",
    authDomain: "saas-treino-andre.firebaseapp.com",
    projectId: "saas-treino-andre",
    storageBucket: "saas-treino-andre.firebasestorage.app",
    messagingSenderId: "629928465846",
    appId: "1:629928465846:web:f78a04948113efed17dd17",
    measurementId: "G-CKG3HGYKL2"
};

// Inicializa Firebase Globalmente
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// ============================================================
// LÓGICA DE AUTENTICAÇÃO E UTILITÁRIOS
// ============================================================

const TRAINER_LOGIN = "rafael";
const TRAINER_PASS = "123";
const TRAINER_EMAIL_REAL = "rafael@gym.com"; // Email para autenticação interna do Firebase

/**
 * Função Global de Login
 */
window.fazerLogin = async function (usuario, senha) {
    console.log("Tentando logar com:", usuario, senha);

    // 1. Verifica Admin (Rafael)
    if (usuario === TRAINER_LOGIN && senha === TRAINER_PASS) {
        try {
            await auth.signInWithEmailAndPassword(TRAINER_EMAIL_REAL, "senha123padrao");
            window.location.href = "telas/dashboard.html";
            return;
        } catch (e) {
            console.log("Conta admin não achada, criando...", e);
            try {
                await auth.createUserWithEmailAndPassword(TRAINER_EMAIL_REAL, "senha123padrao");
                window.location.href = "telas/dashboard.html";
            } catch (err2) {
                if (err2.code === 'auth/configuration-not-found' || err2.code === 'auth/operation-not-allowed') {
                    alert("ERRO DE CONFIGURAÇÃO NO FIREBASE:\n\nVocê precisa ativar o 'Email/Senha' no painel do Firebase.\n\n1. Vá em Authentication\n2. Sign-in method\n3. Ative Email/Password");
                } else {
                    alert("Erro grave ao entrar no Admin: " + err2.message);
                }
            }
            return;
        }
    }

    // 2. Verifica Aluno (Firestore)
    try {
        const snapshot = await db.collection("students")
            .where("login", "==", usuario)
            .where("password", "==", senha)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();

            // Salva sessão manual
            sessionStorage.setItem("studentId", doc.id);
            sessionStorage.setItem("studentName", data.name);
            window.location.href = "telas/student.html";
        } else {
            alert("Usuário ou senha incorretos.");
        }
    } catch (error) {
        console.error("Erro login aluno:", error);
        alert("Erro ao conectar no banco de dados.");
    }
};

/**
 * Função Global de Logout
 */
window.fazerLogout = function () {
    auth.signOut();
    sessionStorage.clear();
    window.location.href = "../index.html";
};

/**
 * Verifica Login no Dashboard
 */
window.verificarAuthDashboard = function () {
    auth.onAuthStateChanged(user => {
        if (!user) {
            // Se não estiver logado no Firebase, expulsa
            window.location.href = "../index.html";
        }
    });
};

/**
 * Verifica Login no Student
 */
window.verificarAuthAluno = function () {
    if (!sessionStorage.getItem("studentId")) {
        window.location.href = "../index.html";
    }
};
